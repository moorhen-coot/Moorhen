/**
 * WGSL for the smooth surface's last steps on the GPU (stage 1 of the GPU smooth surface, see
 * src/.roadmaps/webgpu.md): from the contour of the field - marching cubes, by the MetaBalls kernels -
 * split every triangle once, move every vertex onto the surface of the field's Catmull-Rom tricubic
 * with its normal from the gradient, wind the triangles counter-clockwise about their normals, and give
 * every vertex its atoms. The GPU twin of wasm_src/smooth-surface.cc (refine_contour, field_sampler_t,
 * orient_triangles, vertex_atoms), which stays the reference: the same steps in the same order, in
 * float32.
 *
 * The split's midpoints, one per edge of the contour, are found without a hash table: each edge is
 * filed under its lower vertex (a count, a scan, a fill), each vertex sorts its short row and counts
 * its distinct edges, and a scan of those counts numbers the midpoints - in the order the C++ makes
 * them per vertex, whatever order the atomics filed them in.
 *
 * One thread per item (triangle, vertex, edge row); every kernel returns past its item count. Group 0
 * holds the parameters, group 1 the buffers in binding order.
 */
import { itemIndexWgsl } from "../gpu";

/** Threads per workgroup. */
export const SMOOTH_WORKGROUP = 64;

/** How many of its nearest atoms a vertex keeps for its colour (smooth-surface.hh colour_atoms). */
export const COLOUR_ATOMS = 4;

const COMMON = /* wgsl */ `
struct Params {
    // Grid: origin (xyz) and spacing (w).
    origin: vec4f,
    // Grid points (xyz); w: the contour's vertices.
    dims: vec4u,
    // x: the contour's triangles; y: atoms; z: atom bins' search span (cells).
    counts: vec4u,
    // Atom bins: their lowest corner (xyz) and cell size (w).
    binLow: vec4f,
    // Atom bins along each axis (xyz).
    binDims: vec4u,
    // x: the ownership band; y: the Newton step's largest move; z: the field value that counts as on
    // the surface; w: the largest atom radius.
    misc: vec4f,
};
@group(0) @binding(0) var<uniform> P: Params;

${itemIndexWgsl(SMOOTH_WORKGROUP)}`;

/** Each edge of the contour counted against its lower vertex. */
export const EDGE_COUNT_WGSL = /* wgsl */ `${COMMON}
@group(1) @binding(0) var<storage, read> indices: array<u32>;
@group(1) @binding(1) var<storage, read_write> rowCount: array<atomic<u32>>;

@compute @workgroup_size(${SMOOTH_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
    let t = itemIndex(lid, wid, nwg);
    if (t >= P.counts.x) { return; }
    let a = indices[3u * t]; let b = indices[3u * t + 1u]; let c = indices[3u * t + 2u];
    atomicAdd(&rowCount[min(a, b)], 1u);
    atomicAdd(&rowCount[min(b, c)], 1u);
    atomicAdd(&rowCount[min(c, a)], 1u);
}
`;

/** Each edge's upper vertex written into its lower vertex's row. */
export const EDGE_FILL_WGSL = /* wgsl */ `${COMMON}
@group(1) @binding(0) var<storage, read> indices: array<u32>;
@group(1) @binding(1) var<storage, read> rowStart: array<u32>;
@group(1) @binding(2) var<storage, read_write> rowFill: array<atomic<u32>>;
@group(1) @binding(3) var<storage, read_write> rowHi: array<u32>;

fn file(a: u32, b: u32) {
    let lo = min(a, b);
    let slot = rowStart[lo] + atomicAdd(&rowFill[lo], 1u);
    rowHi[slot] = max(a, b);
}

@compute @workgroup_size(${SMOOTH_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
    let t = itemIndex(lid, wid, nwg);
    if (t >= P.counts.x) { return; }
    let a = indices[3u * t]; let b = indices[3u * t + 1u]; let c = indices[3u * t + 2u];
    file(a, b);
    file(b, c);
    file(c, a);
}
`;

/** Each row sorted, and its distinct edges counted. */
export const ROW_UNIQUE_WGSL = /* wgsl */ `${COMMON}
@group(1) @binding(0) var<storage, read> rowStart: array<u32>;
@group(1) @binding(1) var<storage, read> rowCount: array<u32>;
@group(1) @binding(2) var<storage, read_write> rowHi: array<u32>;
@group(1) @binding(3) var<storage, read_write> uniqueCount: array<u32>;

@compute @workgroup_size(${SMOOTH_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
    let v = itemIndex(lid, wid, nwg);
    if (v >= P.dims.w) { return; }
    let start = rowStart[v];
    let n = rowCount[v];
    // Insertion sort: a row is a handful of edges.
    for (var i = 1u; i < n; i++) {
        let value = rowHi[start + i];
        var j = i;
        while (j > 0u && rowHi[start + j - 1u] > value) {
            rowHi[start + j] = rowHi[start + j - 1u];
            j--;
        }
        rowHi[start + j] = value;
    }
    var distinct = 0u;
    for (var i = 0u; i < n; i++) {
        if (i == 0u || rowHi[start + i] != rowHi[start + i - 1u]) { distinct++; }
    }
    uniqueCount[v] = distinct;
}
`;

/** How many midpoints there are, into counts[0]. One thread. */
export const MIDPOINT_TOTAL_WGSL = /* wgsl */ `${COMMON}
@group(1) @binding(0) var<storage, read> uniqueCount: array<u32>;
@group(1) @binding(1) var<storage, read> midStart: array<u32>;
@group(1) @binding(2) var<storage, read_write> counts: array<u32>;

@compute @workgroup_size(1)
fn main() {
    let v = P.dims.w;
    counts[0] = select(0u, midStart[v - 1u] + uniqueCount[v - 1u], v > 0u);
}
`;

/** Each distinct edge's midpoint, after the contour's vertices: number V + midStart[lo] + its place in the row. */
export const MIDPOINTS_WGSL = /* wgsl */ `${COMMON}
@group(1) @binding(0) var<storage, read> rowStart: array<u32>;
@group(1) @binding(1) var<storage, read> rowCount: array<u32>;
@group(1) @binding(2) var<storage, read> rowHi: array<u32>;
@group(1) @binding(3) var<storage, read> midStart: array<u32>;
@group(1) @binding(4) var<storage, read_write> positions: array<f32>;

@compute @workgroup_size(${SMOOTH_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
    let lo = itemIndex(lid, wid, nwg);
    if (lo >= P.dims.w) { return; }
    let start = rowStart[lo];
    let n = rowCount[lo];
    let a = vec3f(positions[3u * lo], positions[3u * lo + 1u], positions[3u * lo + 2u]);
    var rank = 0u;
    for (var i = 0u; i < n; i++) {
        let hi = rowHi[start + i];
        if (i > 0u && hi == rowHi[start + i - 1u]) { continue; }
        let b = vec3f(positions[3u * hi], positions[3u * hi + 1u], positions[3u * hi + 2u]);
        let m = P.dims.w + midStart[lo] + rank;
        let p = 0.5 * (a + b);
        positions[3u * m] = p.x; positions[3u * m + 1u] = p.y; positions[3u * m + 2u] = p.z;
        rank++;
    }
}
`;

/** Each triangle into four: a ab ca, ab b bc, ca bc c, ab bc ca, as the C++. */
export const SPLIT_WGSL = /* wgsl */ `${COMMON}
@group(1) @binding(0) var<storage, read> indices: array<u32>;
@group(1) @binding(1) var<storage, read> rowStart: array<u32>;
@group(1) @binding(2) var<storage, read> rowCount: array<u32>;
@group(1) @binding(3) var<storage, read> rowHi: array<u32>;
@group(1) @binding(4) var<storage, read> midStart: array<u32>;
@group(1) @binding(5) var<storage, read_write> split: array<u32>;

fn midpoint(a: u32, b: u32) -> u32 {
    let lo = min(a, b); let hi = max(a, b);
    let start = rowStart[lo];
    var rank = 0u;
    for (var i = 0u; i < rowCount[lo]; i++) {
        let value = rowHi[start + i];
        if (i > 0u && value == rowHi[start + i - 1u]) { continue; }
        if (value == hi) { break; }
        rank++;
    }
    return P.dims.w + midStart[lo] + rank;
}

@compute @workgroup_size(${SMOOTH_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
    let t = itemIndex(lid, wid, nwg);
    if (t >= P.counts.x) { return; }
    let a = indices[3u * t]; let b = indices[3u * t + 1u]; let c = indices[3u * t + 2u];
    let ab = midpoint(a, b); let bc = midpoint(b, c); let ca = midpoint(c, a);
    let o = 12u * t;
    split[o] = a;       split[o + 1u] = ab;  split[o + 2u] = ca;
    split[o + 3u] = ab; split[o + 4u] = b;   split[o + 5u] = bc;
    split[o + 6u] = ca; split[o + 7u] = bc;  split[o + 8u] = c;
    split[o + 9u] = ab; split[o + 10u] = bc; split[o + 11u] = ca;
}
`;

/**
 * The field's Catmull-Rom tricubic, and of its fourth-order differences for the gradient, per A
 * (smooth-surface.cc field_sampler_t), with grid coordinates clamped at the edges.
 */
const SAMPLER = /* wgsl */ `
fn fieldAt(i: i32, j: i32, k: i32) -> f32 {
    let x = u32(clamp(i, 0, i32(P.dims.x) - 1));
    let y = u32(clamp(j, 0, i32(P.dims.y) - 1));
    let z = u32(clamp(k, 0, i32(P.dims.z) - 1));
    return field[(z * P.dims.y + y) * P.dims.x + x];
}
fn difference(at: vec3i, axis: vec3i) -> f32 {
    return (-fieldAt(at.x + 2 * axis.x, at.y + 2 * axis.y, at.z + 2 * axis.z) + 8.0 * fieldAt(at.x + axis.x, at.y + axis.y, at.z + axis.z)
        - 8.0 * fieldAt(at.x - axis.x, at.y - axis.y, at.z - axis.z) + fieldAt(at.x - 2 * axis.x, at.y - 2 * axis.y, at.z - 2 * axis.z)) / 12.0;
}
fn gradientAt(i: i32, j: i32, k: i32) -> vec3f {
    // The stencil's grid coordinates clamped one by one, as compute() clamps each step.
    let at = vec3i(clamp(i, 0, i32(P.dims.x) - 1), clamp(j, 0, i32(P.dims.y) - 1), clamp(k, 0, i32(P.dims.z) - 1));
    return vec3f(difference(at, vec3i(1, 0, 0)), difference(at, vec3i(0, 1, 0)), difference(at, vec3i(0, 0, 1)));
}
fn weights(t: f32) -> vec4f {
    let t2 = t * t; let t3 = t2 * t;
    return 0.5 * vec4f(-t + 2.0 * t2 - t3, 2.0 - 5.0 * t2 + 3.0 * t3, t + 4.0 * t2 - 3.0 * t3, -t2 + t3);
}
// The value (x) and gradient per A (yzw) at p.
fn sampleField(p: vec3f) -> vec4f {
    let u = (p - P.origin.xyz) / P.origin.w;
    let base = vec3i(floor(u));
    let f = u - floor(u);
    let wx = weights(f.x); let wy = weights(f.y); let wz = weights(f.z);
    var value = 0.0;
    var gradient = vec3f(0.0);
    for (var c = 0; c < 4; c++) {
        for (var b = 0; b < 4; b++) {
            let wyz = wy[b] * wz[c];
            for (var a = 0; a < 4; a++) {
                let w = wx[a] * wyz;
                let i = base.x - 1 + a; let j = base.y - 1 + b; let k = base.z - 1 + c;
                value += w * fieldAt(i, j, k);
                gradient += w * gradientAt(i, j, k);
            }
        }
    }
    return vec4f(value, gradient / P.origin.w);
}
`;

/** Every vertex onto the surface (Newton steps, each at most half a voxel) and its normal from the gradient. */
export const REFINE_WGSL = /* wgsl */ `${COMMON}
@group(1) @binding(0) var<storage, read> field: array<f32>;
@group(1) @binding(1) var<storage, read> counts: array<u32>;
@group(1) @binding(2) var<storage, read_write> positions: array<f32>;
@group(1) @binding(3) var<storage, read_write> normals: array<f32>;
${SAMPLER}
@compute @workgroup_size(${SMOOTH_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
    let v = itemIndex(lid, wid, nwg);
    if (v >= P.dims.w + counts[0]) { return; }
    var x = vec3f(positions[3u * v], positions[3u * v + 1u], positions[3u * v + 2u]);
    for (var iteration = 0; iteration < 4; iteration++) {
        let s = sampleField(x);
        let g = s.yzw;
        let g2 = dot(g, g);
        if (g2 < 1e-20) { break; }
        var step = s.x / g2;
        let moved = abs(step) * sqrt(g2);
        if (moved > P.misc.y) { step *= P.misc.y / moved; }
        x -= step * g;
        if (abs(s.x) < P.misc.z) { break; }
    }
    let g = sampleField(x).yzw;
    var len = length(g);
    if (len == 0.0) { len = 1.0; }
    positions[3u * v] = x.x; positions[3u * v + 1u] = x.y; positions[3u * v + 2u] = x.z;
    let n = g / len;
    normals[3u * v] = n.x; normals[3u * v + 1u] = n.y; normals[3u * v + 2u] = n.z;
}
`;

/** Each triangle wound counter-clockwise about its vertices' normals (orient_triangles). */
export const ORIENT_WGSL = /* wgsl */ `${COMMON}
@group(1) @binding(0) var<storage, read> positions: array<f32>;
@group(1) @binding(1) var<storage, read> normals: array<f32>;
@group(1) @binding(2) var<storage, read_write> split: array<u32>;

fn at(buffer: u32, v: u32) -> vec3f {
    if (buffer == 0u) { return vec3f(positions[3u * v], positions[3u * v + 1u], positions[3u * v + 2u]); }
    return vec3f(normals[3u * v], normals[3u * v + 1u], normals[3u * v + 2u]);
}

@compute @workgroup_size(${SMOOTH_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
    let t = itemIndex(lid, wid, nwg);
    if (t >= 4u * P.counts.x) { return; }
    let a = split[3u * t]; let b = split[3u * t + 1u]; let c = split[3u * t + 2u];
    let pa = at(0u, a);
    let face = cross(at(0u, b) - pa, at(0u, c) - pa);
    if (dot(face, at(1u, a) + at(1u, b) + at(1u, c)) < 0.0) {
        split[3u * t + 1u] = c;
        split[3u * t + 2u] = b;
    }
}
`;

/**
 * Each vertex's atoms (vertex_atoms): the one whose sphere it is nearest; its COLOUR_ATOMS nearest,
 * nearest first; and, within the ownership band, the nearest atom of another residue and the split
 * between the two. Atoms binned as atom_bins_t bins them, searched in the same order.
 * info: atom, other (i32), weight (f32 bits) per vertex; near: COLOUR_ATOMS atoms (i32) then their
 * gaps (f32 bits) per vertex.
 */
export const VERTEX_ATOMS_WGSL = /* wgsl */ `${COMMON}
@group(1) @binding(0) var<storage, read> positions: array<f32>;
@group(1) @binding(1) var<storage, read> atoms: array<vec4f>;
@group(1) @binding(2) var<storage, read> residueOf: array<i32>;
@group(1) @binding(3) var<storage, read> binStart: array<u32>;
@group(1) @binding(4) var<storage, read> binMembers: array<u32>;
@group(1) @binding(5) var<storage, read> counts: array<u32>;
@group(1) @binding(6) var<storage, read_write> info: array<u32>;
@group(1) @binding(7) var<storage, read_write> near: array<u32>;

const COLOUR_ATOMS = ${COLOUR_ATOMS}u;

fn cellOf(v: f32, low: f32) -> i32 { return i32(floor((v - low) / P.binLow.w)); }

@compute @workgroup_size(${SMOOTH_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
    let v = itemIndex(lid, wid, nwg);
    if (v >= P.dims.w + counts[0]) { return; }
    let x = vec3f(positions[3u * v], positions[3u * v + 1u], positions[3u * v + 2u]);
    let band = P.misc.x;
    let span = i32(P.counts.z);
    let c = vec3i(cellOf(x.x, P.binLow.x), cellOf(x.y, P.binLow.y), cellOf(x.z, P.binLow.z));
    let lo = max(vec3i(0), c - vec3i(span));
    let hi = min(vec3i(P.binDims.xyz) - vec3i(1), c + vec3i(span));

    var best = -1;
    var g1 = 3.4e38;
    var ids = array<i32, ${COLOUR_ATOMS}>(-1, -1, -1, -1);
    var gaps = array<f32, ${COLOUR_ATOMS}>(0.0, 0.0, 0.0, 0.0);
    var kept = 0u;
    for (var k = lo.z; k <= hi.z; k++) {
        for (var j = lo.y; j <= hi.y; j++) {
            for (var i = lo.x; i <= hi.x; i++) {
                let cell = (u32(k) * P.binDims.y + u32(j)) * P.binDims.x + u32(i);
                for (var m = binStart[cell]; m < binStart[cell + 1u]; m++) {
                    let a = binMembers[m];
                    let atom = atoms[a];
                    let d = x - atom.xyz;
                    let reach = atom.w + band;
                    if (dot(d, d) >= reach * reach) { continue; }
                    let g = length(d) - atom.w;
                    if (g < g1) { g1 = g; best = i32(a); }
                    if (kept == COLOUR_ATOMS && g >= gaps[kept - 1u]) { continue; }
                    var slot = min(kept, COLOUR_ATOMS - 1u);
                    while (slot > 0u && gaps[slot - 1u] > g) {
                        ids[slot] = ids[slot - 1u];
                        gaps[slot] = gaps[slot - 1u];
                        slot--;
                    }
                    ids[slot] = i32(a);
                    gaps[slot] = g;
                    if (kept < COLOUR_ATOMS) { kept++; }
                }
            }
        }
    }
    var other = -1;
    var weight = 1.0;
    if (best < 0) {
        // Nothing within the band: the nearest of all.
        for (var a = 0u; a < P.counts.y; a++) {
            let atom = atoms[a];
            let g = length(x - atom.xyz) - atom.w;
            if (g < g1) { g1 = g; best = i32(a); }
        }
        ids[0] = best;
        gaps[0] = g1;
    } else {
        let residue = residueOf[best];
        var g2 = 3.4e38;
        for (var k = lo.z; k <= hi.z; k++) {
            for (var j = lo.y; j <= hi.y; j++) {
                for (var i = lo.x; i <= hi.x; i++) {
                    let cell = (u32(k) * P.binDims.y + u32(j)) * P.binDims.x + u32(i);
                    for (var m = binStart[cell]; m < binStart[cell + 1u]; m++) {
                        let a = binMembers[m];
                        let atom = atoms[a];
                        let d = x - atom.xyz;
                        let reach = atom.w + band;
                        if (dot(d, d) >= reach * reach || residueOf[a] == residue) { continue; }
                        let g = length(d) - atom.w;
                        if (g < g2) { g2 = g; other = i32(a); }
                    }
                }
            }
        }
        if (other >= 0 && g2 <= band) {
            let d1 = max(0.0, g1); let d2 = max(0.0, g2);
            weight = select(0.5, d2 / (d1 + d2), d1 + d2 > 0.0);
        } else {
            other = -1;
        }
    }
    info[3u * v] = bitcast<u32>(best);
    info[3u * v + 1u] = bitcast<u32>(other);
    info[3u * v + 2u] = bitcast<u32>(weight);
    for (var k = 0u; k < COLOUR_ATOMS; k++) {
        near[2u * COLOUR_ATOMS * v + k] = bitcast<u32>(ids[k]);
        near[2u * COLOUR_ATOMS * v + COLOUR_ATOMS + k] = bitcast<u32>(gaps[k]);
    }
}
`;

// -------------------------------------------------------------------------------------------------
// Stage 2: from the C++'s opened, unblurred field (ses_field_unblurred) to the field to contour - the
// cuts' weight spread, the blur, the cap, the heal blur, and the level that keeps the enclosed volume
// (smooth-surface.cc blur_field, gaussian_blur_3d, level_enclosing).

/** Bins of the field's histogram, for the level that keeps the volume (level_enclosing's 8192). */
export const LEVEL_BINS = 8192;

const BLUR_COMMON = /* wgsl */ `
struct BlurParams {
    // Grid points (xyz); w: all of them.
    dims: vec4u,
    // x: the axis blurred (0, 1, 2); y: the kernel's radius; z: 1 to lift the cap by the weight.
    step: vec4u,
    // x: the cap (max_shift); y: the field's clamp (the histogram's range).
    values: vec4f,
};
@group(0) @binding(0) var<uniform> B: BlurParams;

${itemIndexWgsl(SMOOTH_WORKGROUP)}
// Point i's coordinate along the pass's axis, its stride, and the points along that axis.
fn alongAxis(i: u32) -> vec3u {
    let nx = B.dims.x; let ny = B.dims.y;
    if (B.step.x == 0u) { return vec3u(i % nx, 1u, nx); }
    if (B.step.x == 1u) { return vec3u((i / nx) % ny, nx, ny); }
    return vec3u(i / (nx * ny), nx * ny, B.dims.z);
}
`;

/** The opening's changed points (bytes, four to a word) as weights 0 or 255. */
export const WEIGHT_INIT_WGSL = /* wgsl */ `${BLUR_COMMON}
@group(1) @binding(0) var<storage, read> changed: array<u32>;
@group(1) @binding(1) var<storage, read_write> weight: array<u32>;

@compute @workgroup_size(${SMOOTH_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
    let i = itemIndex(lid, wid, nwg);
    if (i >= B.dims.w) { return; }
    weight[i] = (changed[i >> 2u] >> (8u * (i & 3u))) & 255u;
}
`;

/** One pass of the separable Gaussian along an axis, edges clamped (gaussian_blur_3d), float. */
export const BLUR_WGSL = /* wgsl */ `${BLUR_COMMON}
@group(1) @binding(0) var<storage, read> kernel: array<f32>;
@group(1) @binding(1) var<storage, read> source: array<f32>;
@group(1) @binding(2) var<storage, read_write> output: array<f32>;

@compute @workgroup_size(${SMOOTH_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
    let i = itemIndex(lid, wid, nwg);
    if (i >= B.dims.w) { return; }
    let a = alongAxis(i);
    let start = i - a.x * a.y;
    let radius = i32(B.step.y);
    var sum = 0.0;
    for (var k = -radius; k <= radius; k++) {
        let j = u32(clamp(i32(a.x) + k, 0, i32(a.z) - 1));
        sum += kernel[u32(k + radius)] * source[start + j * a.y];
    }
    output[i] = sum;
}
`;

/** The same on the weights, rounded to 0-255 after each pass as the C++'s uint8 blur rounds them. */
export const BLUR_WEIGHT_WGSL = /* wgsl */ `${BLUR_COMMON}
@group(1) @binding(0) var<storage, read> kernel: array<f32>;
@group(1) @binding(1) var<storage, read> source: array<u32>;
@group(1) @binding(2) var<storage, read_write> output: array<u32>;

@compute @workgroup_size(${SMOOTH_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
    let i = itemIndex(lid, wid, nwg);
    if (i >= B.dims.w) { return; }
    let a = alongAxis(i);
    let start = i - a.x * a.y;
    let radius = i32(B.step.y);
    var sum = 0.0;
    for (var k = -radius; k <= radius; k++) {
        let j = u32(clamp(i32(a.x) + k, 0, i32(a.z) - 1));
        sum += kernel[u32(k + radius)] * f32(source[start + j * a.y]);
    }
    // lround: halves away from zero (WGSL's round() would round them to even).
    output[i] = u32(clamp(floor(sum + 0.5), 0.0, 255.0));
}
`;

/** Full strength wherever the spread weight is a third or more. */
export const WEIGHT_SCALE_WGSL = /* wgsl */ `${BLUR_COMMON}
@group(1) @binding(0) var<storage, read_write> weight: array<u32>;

@compute @workgroup_size(${SMOOTH_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
    let i = itemIndex(lid, wid, nwg);
    if (i >= B.dims.w) { return; }
    weight[i] = min(255u, 3u * weight[i]);
}
`;

/** The cap on how far the blur moves the field (tanh), lifted round the cuts by the weight. */
export const CAP_WGSL = /* wgsl */ `${BLUR_COMMON}
@group(1) @binding(0) var<storage, read> exact: array<f32>;
@group(1) @binding(1) var<storage, read> weight: array<u32>;
@group(1) @binding(2) var<storage, read_write> field: array<f32>;

@compute @workgroup_size(${SMOOTH_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
    let i = itemIndex(lid, wid, nwg);
    if (i >= B.dims.w) { return; }
    let shift = B.values.x;
    let capped = exact[i] + shift * tanh((field[i] - exact[i]) / shift);
    let share = select(0.0, f32(weight[i]) / 255.0, B.step.z == 1u);
    field[i] = capped + share * (field[i] - capped);
}
`;

/** The heal blur's wider field faded in by the weight. */
export const HEAL_WGSL = /* wgsl */ `${BLUR_COMMON}
@group(1) @binding(0) var<storage, read> wider: array<f32>;
@group(1) @binding(1) var<storage, read> weight: array<u32>;
@group(1) @binding(2) var<storage, read_write> field: array<f32>;

@compute @workgroup_size(${SMOOTH_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
    let i = itemIndex(lid, wid, nwg);
    if (i >= B.dims.w) { return; }
    let share = f32(weight[i]) / 255.0;
    if (share > 0.0) { field[i] = field[i] + share * (wider[i] - field[i]); }
}
`;

/**
 * The field's histogram over [-clamp, clamp] (level_enclosing). Values at or below -clamp (the bottom
 * bin: everything well outside) are not counted - the level kernel takes them as the rest - and the
 * top bin (well inside), as busy, is counted per workgroup first.
 */
export const HISTOGRAM_WGSL = /* wgsl */ `${BLUR_COMMON}
@group(1) @binding(0) var<storage, read> field: array<f32>;
@group(1) @binding(1) var<storage, read_write> histogram: array<atomic<u32>>;

var<workgroup> top: atomic<u32>;

@compute @workgroup_size(${SMOOTH_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
    let i = itemIndex(lid, wid, nwg);
    if (i < B.dims.w) {
        let range = B.values.y;
        let scale = f32(${LEVEL_BINS}) / (2.0 * range);
        let b = i32(floor((field[i] + range) * scale));
        if (b >= ${LEVEL_BINS - 1}) {
            atomicAdd(&top, 1u);
        } else if (b > 0) {
            atomicAdd(&histogram[u32(b)], 1u);
        }
    }
    workgroupBarrier();
    if (lid.x == 0u) {
        let n = atomicLoad(&top);
        if (n > 0u) { atomicAdd(&histogram[${LEVEL_BINS - 1}u], n); }
    }
}
`;

/** The level above which the inside's share of the points lie, into level[0]. One thread. */
export const LEVEL_WGSL = /* wgsl */ `${BLUR_COMMON}
@group(1) @binding(0) var<storage, read> histogram: array<u32>;
@group(1) @binding(1) var<storage, read> interior: array<u32>;
@group(1) @binding(2) var<storage, read_write> level: array<f32>;

@compute @workgroup_size(1)
fn main() {
    let range = B.values.y;
    let scale = f32(${LEVEL_BINS}) / (2.0 * range);
    let wanted = interior[0];
    var counted = 0u;
    for (var b = 1u; b < ${LEVEL_BINS}u; b++) { counted += histogram[b]; }
    var above = 0u;
    var result = -range;
    for (var b = ${LEVEL_BINS - 1}; b >= 0; b--) {
        let n = select(histogram[u32(b)], B.dims.w - counted, b == 0);
        if (above + n >= wanted) {
            let fraction = select(0.0, f32(wanted - above) / f32(n), n > 0u);
            result = -range + (f32(b) + 1.0 - fraction) / scale;
            break;
        }
        above += n;
    }
    level[0] = result;
}
`;

/** The field ready to contour: the level less the field (negative inside, the surface at 0). */
export const CONTOUR_INPUT_WGSL = /* wgsl */ `${BLUR_COMMON}
@group(1) @binding(0) var<storage, read> field: array<f32>;
@group(1) @binding(1) var<storage, read> level: array<f32>;
@group(1) @binding(2) var<storage, read_write> input: array<f32>;

@compute @workgroup_size(${SMOOTH_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
    let i = itemIndex(lid, wid, nwg);
    if (i >= B.dims.w) { return; }
    input[i] = level[0] - field[i];
}
`;

// -------------------------------------------------------------------------------------------------
// Stages 4 and 3: from the C++'s exposed SAS (ses_exposure) to the opened, unblurred field - SAS
// occupancy, seeds, the feature transform, the distances, the opening (smooth-surface.cc
// ses_field_unblurred, nearest_sphere, nearest_exposed_point, nearest_on_arcs, buried_by,
// edt1d_feature, feature_transform_3d). The atoms' tables are packed into one integer and one float
// buffer (a shader has 8 storage buffers), at the offsets the parameters give.

/** The longest grid line the feature transform takes (its line is held per thread). */
export const MAX_LINE = 512;
/** "Infinitely far" in the feature transform: beyond any squared distance on a MAX_LINE grid, and small enough that every sum stays an exact integer in float32. */
export const EDT_INF = 4e6;
/** How many atoms and circles one point's distance tries at most, remembered so as not to try one twice. */
const TRIED = 32;

const FIELD_COMMON = /* wgsl */ `
struct FieldParams {
    // Grid origin (xyz), spacing (w).
    origin: vec4f,
    // Grid points (xyz); w: all of them.
    dims: vec4u,
    // x: probe; y: clamp; z: window (seeds outside); w: voxel diagonal (seeds inside).
    geometry: vec4f,
    // x, y: the band the exact distance is worked out in; z: how far into the outside the opening
    // reaches; w: the opening's radius (0: none).
    limits: vec4f,
    // x: the opening's allowance; y: the lowest the field goes; z: atom bins' cell; w: 1 to mark what the opening changes.
    more: vec4f,
    // Atom bins along each axis (xyz); w: the atoms.
    bins: vec4u,
    // Atom bins' lowest corner (xyz).
    binLow: vec4f,
    // x: the transform's axis; y: its lines; z: room for seed candidates.
    step: vec4u,
    // Offsets in the integer table: exposed, neighbourStart, neighbourIds, circleStart.
    o0: vec4u,
    // circleIds, atomCircleStart, atomCircleIds, other.
    o1: vec4u,
    // arcStart, binStart, binMembers; w: where the arcs start in the float table.
    o2: vec4u,
};
@group(0) @binding(0) var<uniform> F: FieldParams;

${itemIndexWgsl(SMOOTH_WORKGROUP)}
fn pointOf(i: u32) -> vec3u {
    let plane = F.dims.x * F.dims.y;
    let z = i / plane;
    let r = i - z * plane;
    let y = r / F.dims.x;
    return vec3u(r - y * F.dims.x, y, z);
}
fn positionOf(g: vec3u) -> vec3f { return F.origin.xyz + vec3f(g) * F.origin.w; }
`;

/** The atoms' tables, for the kernels that read them. */
const ATOM_TABLES = /* wgsl */ `
fn exposedAtom(a: i32) -> bool { return table[F.o0.x + u32(a)] != 0; }
fn neighbourStart(a: i32) -> i32 { return table[F.o0.y + u32(a)]; }
fn neighbourId(k: i32) -> i32 { return table[F.o0.z + u32(k)]; }
fn circleStart(a: i32) -> i32 { return table[F.o0.w + u32(a)]; }
fn circleId(k: i32) -> i32 { return table[F.o1.x + u32(k)]; }
fn atomCircleStart(a: i32) -> i32 { return table[F.o1.y + u32(a)]; }
fn atomCircleId(k: i32) -> i32 { return table[F.o1.z + u32(k)]; }
fn otherAtom(c: i32) -> i32 { return table[F.o1.w + u32(c)]; }
fn arcStart(c: i32) -> i32 { return table[F.o2.x + u32(c)]; }
fn binStart(c: u32) -> u32 { return u32(table[F.o2.y + c]); }
fn binMember(k: u32) -> i32 { return table[F.o2.z + k]; }
fn circleVec(c: i32, k: u32) -> vec3f { let b = 13u * u32(c) + 3u * k; return vec3f(floats[b], floats[b + 1u], floats[b + 2u]); }
fn circleRadius(c: i32) -> f32 { return floats[13u * u32(c) + 12u]; }
// Arc m: its start and end as unit vectors in the circle's (e1, e2) plane (worked out in double on the
// CPU: WGSL's trigonometry is only good to about 5e-4), and whether it is the whole circle.
fn arcStartVector(m: i32) -> vec2f { let b = F.o2.w + 5u * u32(m); return vec2f(floats[b], floats[b + 1u]); }
fn arcEndVector(m: i32) -> vec2f { let b = F.o2.w + 5u * u32(m); return vec2f(floats[b + 2u], floats[b + 3u]); }
fn arcLength(m: i32) -> f32 { return floats[F.o2.w + 5u * u32(m) + 4u]; }
fn cross2(a: vec2f, b: vec2f) -> f32 { return a.x * b.y - a.y * b.x; }

// The atom bins around p: the range of cells to visit.
fn binRange(p: vec3f) -> array<vec3i, 2> {
    let c = vec3i(floor((p - F.binLow.xyz) / F.more.z));
    return array<vec3i, 2>(max(vec3i(0), c - vec3i(1)), min(vec3i(F.bins.xyz) - vec3i(1), c + vec3i(1)));
}

// buried_by: the first neighbour of a (other than a, b, c) whose sphere q is inside, or -1.
fn buriedBy(q: vec3f, a: i32, b: i32, c: i32) -> i32 {
    for (var k = neighbourStart(a); k < neighbourStart(a + 1); k++) {
        let c2 = neighbourId(k);
        if (c2 == a || c2 == b || c2 == c) { continue; }
        let s = sas[c2];
        let R = s.w - 1e-4;
        let d = q - s.xyz;
        if (dot(d, d) < R * R) { return c2; }
    }
    return -1;
}

const TWO_PI = 6.283185307179586;

// nearest_on_arcs: the squared distance to circle id's nearest exposed point (into arcPoint if it
// is under bound). Without angles: in or out of an arc by cross products, the nearest end by the dot
// product, and the distance as a vector's length.
var<private> arcPoint: vec3f;
fn nearestOnArcs(p: vec3f, id: i32, bound: f32) -> f32 {
    let centre = circleVec(id, 0u);
    let w = p - centre;
    let along = dot(w, circleVec(id, 1u));
    let e1 = circleVec(id, 2u); let e2 = circleVec(id, 3u);
    let u = dot(w, e1); let v = dot(w, e2);
    let s = sqrt(u * u + v * v); let rc = circleRadius(id);
    let nearest = along * along + (s - rc) * (s - rc);
    if (nearest >= bound) { return nearest; }
    // The point's direction about the axis (atan2(0, 0) = 0 on the axis itself, as the C++).
    let d = select(vec2f(1.0, 0.0), vec2f(u, v) / s, s > 1e-12);
    var chosen = d;
    var bestDot = -2.0;
    var inside = false;
    for (var m = arcStart(id); m < arcStart(id + 1); m++) {
        let a = arcStartVector(m); let b = arcEndVector(m); let length = arcLength(m);
        var within = false;
        if (length >= ${(2 * Math.PI - 1e-6).toFixed(9)}) { within = true; }
        else if (length <= ${Math.PI.toFixed(9)}) { within = cross2(a, d) >= 0.0 && cross2(d, b) >= 0.0; }
        else { within = !(cross2(b, d) > 0.0 && cross2(d, a) > 0.0); }
        if (within) { inside = true; break; }
        let da = dot(d, a); let db = dot(d, b);
        if (db > bestDot) { bestDot = db; chosen = b; }
        if (da > bestDot) { bestDot = da; chosen = a; }
    }
    if (inside) { chosen = d; }
    let offset = s * d - rc * chosen;
    let d2 = along * along + dot(offset, offset);
    if (d2 >= bound) { return d2; }
    arcPoint = centre + rc * (chosen.x * e1 + chosen.y * e2);
    return d2;
}
`;

/** SAS occupancy: bit 0 the point is outside every SAS sphere, bit 1 deeper than a voxel diagonal inside one. */
export const OCCUPANCY_WGSL = /* wgsl */ `${FIELD_COMMON}
@group(1) @binding(0) var<storage, read> sas: array<vec4f>;
@group(1) @binding(1) var<storage, read> table: array<i32>;
@group(1) @binding(2) var<storage, read> floats: array<f32>;
@group(1) @binding(3) var<storage, read_write> flags: array<u32>;
${ATOM_TABLES}
@compute @workgroup_size(${SMOOTH_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
    let i = itemIndex(lid, wid, nwg);
    // The float table, unused here, read once so that it stays in the layout (bindings by position).
    _ = floats[0];
    if (i >= F.dims.w) { return; }
    let p = positionOf(pointOf(i));
    let range = binRange(p);
    var exterior = 1u; var deep = 0u;
    for (var k = range[0].z; k <= range[1].z; k++) {
        for (var j = range[0].y; j <= range[1].y; j++) {
            for (var i2 = range[0].x; i2 <= range[1].x; i2++) {
                let cell = (u32(k) * F.bins.y + u32(j)) * F.bins.x + u32(i2);
                for (var m = binStart(cell); m < binStart(cell + 1u); m++) {
                    let s = sas[binMember(m)];
                    let d = p - s.xyz;
                    let d2 = dot(d, d);
                    if (d2 <= s.w * s.w) {
                        exterior = 0u;
                        let inner = max(0.0, s.w - F.geometry.w);
                        if (d2 < inner * inner) { deep = 1u; }
                    }
                }
            }
        }
    }
    flags[i] = exterior | (deep << 1u);
}
`;

const FLAGS_AT = /* wgsl */ `
fn exteriorAt(i: u32) -> bool { return (flags[i] & 1u) != 0u; }
// Whether the point may be a seed (and has to be looked at): an outside point next to the SAS, or an
// inside point that is neither deep nor next to the outside. Not on the grid's edge.
fn seedCandidate(i: u32) -> bool {
    let g = pointOf(i);
    if (g.x == 0u || g.y == 0u || g.z == 0u || g.x + 1u >= F.dims.x || g.y + 1u >= F.dims.y || g.z + 1u >= F.dims.z) { return false; }
    let nx = F.dims.x; let plane = F.dims.x * F.dims.y;
    if (exteriorAt(i)) {
        return !(exteriorAt(i - 1u) && exteriorAt(i + 1u) && exteriorAt(i - nx) && exteriorAt(i + nx) && exteriorAt(i - plane) && exteriorAt(i + plane));
    }
    if ((flags[i] & 2u) != 0u) { return false; }
    for (var dz = -1; dz <= 1; dz++) {
        for (var dy = -1; dy <= 1; dy++) {
            for (var dx = -1; dx <= 1; dx++) {
                if (exteriorAt(u32(i32(i) + dz * i32(plane) + dy * i32(nx) + dx))) { return false; }
            }
        }
    }
    return true;
}
`;

/** 1 where a point is a seed candidate. */
export const SEED_CANDIDATES_WGSL = /* wgsl */ `${FIELD_COMMON}
@group(1) @binding(0) var<storage, read> flags: array<u32>;
@group(1) @binding(1) var<storage, read_write> candidate: array<u32>;
${FLAGS_AT}
@compute @workgroup_size(${SMOOTH_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
    let i = itemIndex(lid, wid, nwg);
    if (i >= F.dims.w) { return; }
    candidate[i] = select(0u, 1u, seedCandidate(i));
}
`;

/**
 * Each candidate's seed, at its place among the candidates: the exact nearest point of the SAS - on
 * the nearest sphere for an outside point (or the point itself if there is none), the nearest
 * exposed point for an inside one - with its atom and circle; valid 0 if an inside point has none.
 * seed: x, y, z, then the atom and circle (i32 bits), and valid, per candidate.
 */
export const SEED_FIND_WGSL = /* wgsl */ `${FIELD_COMMON}
@group(1) @binding(0) var<storage, read> sas: array<vec4f>;
@group(1) @binding(1) var<storage, read> table: array<i32>;
@group(1) @binding(2) var<storage, read> floats: array<f32>;
@group(1) @binding(3) var<storage, read> flags: array<u32>;
@group(1) @binding(4) var<storage, read> candidateAt: array<u32>;
@group(1) @binding(5) var<storage, read_write> seed: array<u32>;
@group(1) @binding(6) var<storage, read_write> overflow: array<atomic<u32>>;
${ATOM_TABLES}
${FLAGS_AT}
fn put(slot: u32, q: vec3f, a: i32, circle: i32, valid: bool) {
    seed[6u * slot] = bitcast<u32>(q.x); seed[6u * slot + 1u] = bitcast<u32>(q.y); seed[6u * slot + 2u] = bitcast<u32>(q.z);
    seed[6u * slot + 3u] = bitcast<u32>(a); seed[6u * slot + 4u] = bitcast<u32>(circle); seed[6u * slot + 5u] = select(0u, 1u, valid);
}

@compute @workgroup_size(${SMOOTH_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
    let i = itemIndex(lid, wid, nwg);
    if (i >= F.dims.w || !seedCandidate(i)) { return; }
    let slot = candidateAt[i];
    if (slot >= F.step.z) { atomicMax(&overflow[0], slot + 1u); return; }
    let p = positionOf(pointOf(i));
    let range = binRange(p);
    if (exteriorAt(i)) {
        // nearest_sphere among the atoms within the window.
        var best = 3.4e38; var bestDistance = 0.0; var bestAtom = -1;
        for (var k = range[0].z; k <= range[1].z; k++) {
            for (var j = range[0].y; j <= range[1].y; j++) {
                for (var i2 = range[0].x; i2 <= range[1].x; i2++) {
                    let cell = (u32(k) * F.bins.y + u32(j)) * F.bins.x + u32(i2);
                    for (var m = binStart(cell); m < binStart(cell + 1u); m++) {
                        let a = binMember(m);
                        let s = sas[a];
                        let distance = length(p - s.xyz);
                        if (distance >= s.w + F.geometry.z) { continue; }
                        let gap = distance - s.w;
                        if (gap < best) { best = gap; bestAtom = a; bestDistance = distance; }
                    }
                }
            }
        }
        if (bestAtom < 0 || bestDistance < 1e-9) { put(slot, p, -1, -1, true); return; }
        let s = sas[bestAtom];
        put(slot, s.xyz + (p - s.xyz) * (s.w / bestDistance), bestAtom, -1, true);
        return;
    }
    // nearest_exposed_point among the exposed atoms within the voxel diagonal.
    let within = F.geometry.w;
    let limit = within * within;
    var best = limit;
    var found = p; var foundAtom = -1; var foundCircle = -1;
    var any = false;
    for (var k = range[0].z; k <= range[1].z; k++) {
        for (var j = range[0].y; j <= range[1].y; j++) {
            for (var i2 = range[0].x; i2 <= range[1].x; i2++) {
                let cell = (u32(k) * F.bins.y + u32(j)) * F.bins.x + u32(i2);
                for (var m = binStart(cell); m < binStart(cell + 1u); m++) {
                    let a = binMember(m);
                    if (!exposedAtom(a)) { continue; }
                    let s = sas[a];
                    let dv = p - s.xyz;
                    let dist = length(dv);
                    if (dist >= s.w + within) { continue; }
                    any = true;
                    let gap = abs(dist - s.w);
                    if (gap * gap >= best) { continue; }
                    if (dist > 1e-9) {
                        let q = s.xyz + s.w * dv / dist;
                        if (buriedBy(q, a, -1, -1) < 0) { best = gap * gap; found = q; foundAtom = a; foundCircle = -1; }
                    }
                    for (var c = circleStart(a); c < circleStart(a + 1); c++) {
                        let id = circleId(c);
                        let d2 = nearestOnArcs(p, id, best);
                        if (d2 >= best) { continue; }
                        best = d2; found = arcPoint; foundAtom = a; foundCircle = id;
                    }
                }
            }
        }
    }
    put(slot, found, foundAtom, foundCircle, any && best < limit);
}
`;

/** Each valid seed's 1, at its candidate's place, for the scan that numbers the seeds. */
export const SEED_VALID_WGSL = /* wgsl */ `${FIELD_COMMON}
@group(1) @binding(0) var<storage, read> seed: array<u32>;
@group(1) @binding(1) var<storage, read> counts: array<u32>;
@group(1) @binding(2) var<storage, read_write> valid: array<u32>;

@compute @workgroup_size(${SMOOTH_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
    let c = itemIndex(lid, wid, nwg);
    if (c >= F.step.z) { return; }
    valid[c] = select(0u, seed[6u * c + 5u], c < counts[0]);
}
`;

/** How many candidates there are (counts[0]), from the scan's last entry. One thread. */
export const CANDIDATE_TOTAL_WGSL = /* wgsl */ `${FIELD_COMMON}
@group(1) @binding(0) var<storage, read> candidate: array<u32>;
@group(1) @binding(1) var<storage, read> candidateAt: array<u32>;
@group(1) @binding(2) var<storage, read_write> counts: array<u32>;

@compute @workgroup_size(1)
fn main() {
    let n = F.dims.w;
    counts[0] = candidateAt[n - 1u] + candidate[n - 1u];
}
`;

/**
 * Each point's feature (its seed's number, in grid order as the C++ numbers them, or -1) and its
 * squared distance to it so far (0, or EDT_INF); and each seed written at its number: x, y, z, atom,
 * circle.
 */
export const FEATURE_INIT_WGSL = /* wgsl */ `${FIELD_COMMON}
@group(1) @binding(0) var<storage, read> candidate: array<u32>;
@group(1) @binding(1) var<storage, read> candidateAt: array<u32>;
@group(1) @binding(2) var<storage, read> seed: array<u32>;
@group(1) @binding(3) var<storage, read> seedAt: array<u32>;
@group(1) @binding(4) var<storage, read_write> feature: array<i32>;
@group(1) @binding(5) var<storage, read_write> scratch: array<f32>;
@group(1) @binding(6) var<storage, read_write> seeds: array<u32>;

@compute @workgroup_size(${SMOOTH_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
    let i = itemIndex(lid, wid, nwg);
    if (i >= F.dims.w) { return; }
    var f = -1;
    if (candidate[i] != 0u) {
        let c = candidateAt[i];
        if (c < F.step.z && seed[6u * c + 5u] != 0u) {
            let n = seedAt[c];
            f = i32(n);
            for (var k = 0u; k < 5u; k++) { seeds[5u * n + k] = seed[6u * c + k]; }
        }
    }
    feature[i] = f;
    scratch[i] = select(${EDT_INF.toExponential()}, 0.0, f >= 0);
}
`;

/**
 * One pass of the feature transform along an axis, one thread per line (edt1d_feature), in exact
 * integer arithmetic: every finite squared distance on a MAX_LINE grid is an integer, and the
 * envelope's breakpoints - ratios - are compared by cross-multiplying (products under 2^31). So ties
 * break as the C++'s double breaks them, whatever the GPU's division (Firefox's is approximate, and the
 * ties are many). Infinitely far points never lie on the envelope while the line has a finite one, so
 * they are left out of it; a line with none stays infinitely far, with no seed.
 */
export const FEATURE_PASS_WGSL = /* wgsl */ `${FIELD_COMMON}
@group(1) @binding(0) var<storage, read_write> feature: array<i32>;
@group(1) @binding(1) var<storage, read_write> scratch: array<f32>;

var<private> f: array<i32, ${MAX_LINE}>;
var<private> lineFeature: array<i32, ${MAX_LINE}>;
var<private> v: array<i32, ${MAX_LINE}>;
// The envelope's breakpoints as ratios zNum / zDen (zDen > 0); z[0] is minus infinity, zDen 0 plus infinity.
var<private> zNum: array<i32, ${MAX_LINE + 1}>;
var<private> zDen: array<i32, ${MAX_LINE + 1}>;

@compute @workgroup_size(${SMOOTH_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
    let l = itemIndex(lid, wid, nwg);
    if (l >= F.step.y) { return; }
    let nx = F.dims.x; let ny = F.dims.y; let plane = nx * ny;
    var start = 0u; var stride = 1u; var n = nx;
    if (F.step.x == 0u) { start = (l / ny) * plane + (l % ny) * nx; stride = 1u; n = nx; }
    else if (F.step.x == 1u) { start = (l / nx) * plane + (l % nx); stride = nx; n = ny; }
    else { start = (l / nx) * nx + (l % nx); stride = plane; n = F.dims.z; }
    let far = i32(${EDT_INF});
    for (var q = 0u; q < n; q++) {
        let value = scratch[start + q * stride];
        f[q] = select(i32(value), far, value >= ${EDT_INF.toExponential()});
        lineFeature[q] = feature[start + q * stride];
    }
    var k = -1;
    for (var q = 0; q < i32(n); q++) {
        if (f[q] >= far) { continue; }
        if (k < 0) { k = 0; v[0] = q; zDen[1] = 0; continue; }
        let fq = f[q] + q * q;
        var num = fq - (f[v[k]] + v[k] * v[k]);
        var den = 2 * (q - v[k]);
        // s <= z[k]: never for z[0], minus infinity.
        while (k > 0 && num * zDen[k] <= zNum[k] * den) {
            k--;
            num = fq - (f[v[k]] + v[k] * v[k]);
            den = 2 * (q - v[k]);
        }
        k++;
        v[k] = q;
        zNum[k] = num;
        zDen[k] = den;
        zDen[k + 1] = 0;
    }
    if (k < 0) {
        for (var q = 0u; q < n; q++) { scratch[start + q * stride] = ${EDT_INF.toExponential()}; }
        return;
    }
    k = 0;
    for (var q = 0; q < i32(n); q++) {
        // z[k + 1] < q, unless plus infinity.
        while (zDen[k + 1] != 0 && zNum[k + 1] < q * zDen[k + 1]) { k++; }
        let dq = q - v[k];
        scratch[start + u32(q) * stride] = f32(dq * dq + f[v[k]]);
        feature[start + u32(q) * stride] = lineFeature[v[k]];
    }
}
`;

/**
 * The field before the opening (ses_field_unblurred step 3): outside, the probe's depth beyond the
 * SAS (clamped); inside, the exact distance to the nearest of the seeds' SAS points - spheres and
 * exposed arcs, tried from the point's own and its neighbours' seeds - less the probe.
 */
export const DISTANCE_WGSL = /* wgsl */ `${FIELD_COMMON}
@group(1) @binding(0) var<storage, read> sas: array<vec4f>;
@group(1) @binding(1) var<storage, read> table: array<i32>;
@group(1) @binding(2) var<storage, read> floats: array<f32>;
@group(1) @binding(3) var<storage, read> flags: array<u32>;
@group(1) @binding(4) var<storage, read> feature: array<i32>;
@group(1) @binding(5) var<storage, read> seeds: array<u32>;
@group(1) @binding(6) var<storage, read_write> field: array<f32>;
${ATOM_TABLES}
var<private> tried: array<i32, ${TRIED}>;
var<private> triedCount: u32;
var<private> best: f32;

fn seedPoint(f: i32) -> vec3f { let b = 5u * u32(f); return vec3f(bitcast<f32>(seeds[b]), bitcast<f32>(seeds[b + 1u]), bitcast<f32>(seeds[b + 2u])); }
fn seedAtom(f: i32) -> i32 { return bitcast<i32>(seeds[5u * u32(f) + 3u]); }
fn seedCircle(f: i32) -> i32 { return bitcast<i32>(seeds[5u * u32(f) + 4u]); }

// Whether this key was tried already; remembered if not (past TRIED, tried again: no harm, more work).
fn firstTry(key: i32) -> bool {
    for (var k = 0u; k < min(triedCount, ${TRIED}u); k++) { if (tried[k] == key) { return false; } }
    if (triedCount < ${TRIED}u) { tried[triedCount] = key; }
    triedCount++;
    return true;
}
fn tryCircle(p: vec3f, id: i32) {
    if (!firstTry(-id - 1)) { return; }
    let d2 = nearestOnArcs(p, id, best);
    if (d2 < best) { best = d2; }
}
fn trySphere(p: vec3f, a: i32) {
    if (!firstTry(a)) { return; }
    let s = sas[a];
    let dv = p - s.xyz;
    let distance = length(dv);
    let gap = abs(distance - s.w);
    if (gap * gap >= best) { return; }
    if (distance > 1e-9) {
        let q = s.xyz + dv * (s.w / distance);
        if (buriedBy(q, a, -1, -1) < 0) { best = gap * gap; return; }
    }
    for (var k = atomCircleStart(a); k < atomCircleStart(a + 1); k++) { tryCircle(p, atomCircleId(k)); }
}

@compute @workgroup_size(${SMOOTH_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
    let i = itemIndex(lid, wid, nwg);
    if (i >= F.dims.w) { return; }
    let g = pointOf(i);
    let p = positionOf(g);
    let probe = F.geometry.x; let clamp = F.geometry.y; let h = F.origin.w;
    let own = feature[i];
    if ((flags[i] & 1u) != 0u || own < 0) {
        var value = -(probe + clamp);
        if (own >= 0 && length(seedPoint(own) - p) <= clamp + h) {
            // How far outside the SAS: the nearest SAS sphere's surface within the clamp.
            var gap = clamp;
            let range = binRange(p);
            for (var k = range[0].z; k <= range[1].z; k++) {
                for (var j = range[0].y; j <= range[1].y; j++) {
                    for (var i2 = range[0].x; i2 <= range[1].x; i2++) {
                        let cell = (u32(k) * F.bins.y + u32(j)) * F.bins.x + u32(i2);
                        for (var m = binStart(cell); m < binStart(cell + 1u); m++) {
                            let s = sas[binMember(m)];
                            let distance = length(p - s.xyz);
                            if (distance < s.w + clamp + h) { gap = min(gap, distance - s.w); }
                        }
                    }
                }
            }
            value = -(probe + max(0.0, gap));
        }
        field[i] = value;
        return;
    }
    let nx = F.dims.x; let plane = F.dims.x * F.dims.y;
    var neighbours = array<i32, 7>(own,
        select(-1, feature[i - 1u], g.x > 0u), select(-1, feature[min(i + 1u, F.dims.w - 1u)], g.x + 1u < F.dims.x),
        select(-1, feature[i - min(i, nx)], g.y > 0u), select(-1, feature[min(i + nx, F.dims.w - 1u)], g.y + 1u < F.dims.y),
        select(-1, feature[i - min(i, plane)], g.z > 0u), select(-1, feature[min(i + plane, F.dims.w - 1u)], g.z + 1u < F.dims.z));
    var candidates: array<i32, 7>;
    var n = 0;
    for (var m = 0; m < 7; m++) {
        let f = neighbours[m];
        if (f < 0) { continue; }
        var seen = false;
        for (var k = 0; k < n; k++) { if (candidates[k] == f) { seen = true; } }
        if (!seen) { candidates[n] = f; n++; }
    }
    best = 3.4e38;
    for (var k = 0; k < n; k++) {
        let d = seedPoint(candidates[k]) - p;
        best = min(best, dot(d, d));
    }
    let approximate = sqrt(best);
    if (approximate > F.limits.x && approximate < F.limits.y) {
        triedCount = 0u;
        for (var k = 0; k < n; k++) {
            let f = candidates[k];
            if (seedCircle(f) >= 0) { tryCircle(p, seedCircle(f)); }
            else if (seedAtom(f) >= 0) { trySphere(p, seedAtom(f)); }
        }
    }
    field[i] = min(sqrt(best) - probe, clamp);
}
`;

/**
 * The opening (ses_field_unblurred step 3b): each point's distance to where the ball's centre can be,
 * by climbing the field's gradient (trilinear) to the ball's radius; the field lowered to the opened
 * one where that is lower. weight: 255 where it was (if wanted).
 */
export const OPENING_WGSL = /* wgsl */ `${FIELD_COMMON}
@group(1) @binding(0) var<storage, read> original: array<f32>;
@group(1) @binding(1) var<storage, read_write> field: array<f32>;
@group(1) @binding(2) var<storage, read_write> weight: array<u32>;

fn sampleOriginal(x: vec3f) -> f32 {
    let n = vec3f(F.dims.xyz) - vec3f(1.001);
    let fg = min(n, max(vec3f(0.0), (x - F.origin.xyz) / F.origin.w));
    let c = vec3u(floor(fg));
    let t = fg - floor(fg);
    let nx = F.dims.x; let plane = F.dims.x * F.dims.y;
    let base = c.z * plane + c.y * nx + c.x;
    let c00 = original[base] + t.x * (original[base + 1u] - original[base]);
    let c10 = original[base + nx] + t.x * (original[base + nx + 1u] - original[base + nx]);
    let c01 = original[base + plane] + t.x * (original[base + plane + 1u] - original[base + plane]);
    let c11 = original[base + plane + nx] + t.x * (original[base + plane + nx + 1u] - original[base + plane + nx]);
    let c0 = c00 + t.y * (c10 - c00); let c1 = c01 + t.y * (c11 - c01);
    return c0 + t.z * (c1 - c0);
}

@compute @workgroup_size(${SMOOTH_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
    let i = itemIndex(lid, wid, nwg);
    if (i >= F.dims.w) { return; }
    let f = original[i];
    var result = f;
    var lowered = 0u;
    let t = F.limits.w;
    if (t > 0.0 && f < t && f > F.limits.z) {
        var x = positionOf(pointOf(i));
        var value = f; var climbed = 0.0;
        let half = 0.5 * F.origin.w;
        for (var step = 0; step < 8 && value < t - 1e-3; step++) {
            let g = vec3f(sampleOriginal(x + vec3f(half, 0.0, 0.0)) - sampleOriginal(x - vec3f(half, 0.0, 0.0)),
                          sampleOriginal(x + vec3f(0.0, half, 0.0)) - sampleOriginal(x - vec3f(0.0, half, 0.0)),
                          sampleOriginal(x + vec3f(0.0, 0.0, half)) - sampleOriginal(x - vec3f(0.0, 0.0, half)));
            let gl = sqrt(dot(g, g));
            if (gl < 1e-6) { break; }
            let advance = t - value;
            x += advance * g / gl;
            climbed += advance;
            value = sampleOriginal(x);
        }
        let distance = climbed + max(0.0, t - value);
        let opened = t - distance + F.more.x;
        if (opened < f) { result = max(opened, F.more.y); lowered = 255u; }
    }
    field[i] = result;
    if (F.more.w != 0.0) { weight[i] = lowered; }
}
`;

/** The points inside (field > 0), into count[0]: per workgroup first. */
export const INTERIOR_WGSL = /* wgsl */ `${FIELD_COMMON}
@group(1) @binding(0) var<storage, read> field: array<f32>;
@group(1) @binding(1) var<storage, read_write> count: array<atomic<u32>>;

var<workgroup> inside: atomic<u32>;

@compute @workgroup_size(${SMOOTH_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
    let i = itemIndex(lid, wid, nwg);
    if (i < F.dims.w && field[i] > 0.0) { atomicAdd(&inside, 1u); }
    workgroupBarrier();
    if (lid.x == 0u) {
        let n = atomicLoad(&inside);
        if (n > 0u) { atomicAdd(&count[0], n); }
    }
}
`;

// -------------------------------------------------------------------------------------------------
// Stage 5: the exposed SAS from the atoms (smooth-surface.cc exposed_sas, circles_of_atom): each atom's
// neighbours, the circles where two SAS spheres meet, the parts of each circle no third sphere covers
// (its exposed arcs), and which atoms have any SAS exposed. One thread per atom, then one per circle
// job (pair of atoms that meet) - circles numbered as the C++ numbers them (atom by atom, each atom's in
// its neighbours' order). A circle is worked out twice: once to count its arcs, and, once circles and
// arcs are numbered (scans), again to write them in place - cheaper than holding every job's arcs.
// Arcs are kept as their ends' directions, never as angles (WGSL's trigonometry is too rough): what
// the distance kernels read. Room by estimate (`counts`, `caps`), overflow flagged for a redo.
//
// Buffers shared by several kernels:
//   nbr        each atom's neighbour start (atoms + 1), then the neighbours - the packed table's layout;
//   at         circle numbers per job (circle room... jobs), then arc numbers per job;
//   floatsOut  13 per circle (centre, axis, e1, e2, radius), then from caps.x * 13 on, 5 per arc;
//   intsOut    the other atom per circle, then from caps.x on, where its arcs start.

/** Intervals a circle can hold (two per partly covering neighbour, at most). */
export const MAX_INTERVALS = 192;
/** Exposed arcs a circle can hold. */
export const MAX_ARCS = 16;

const EXPO_COMMON = /* wgsl */ `
struct ExpoParams {
    // x: atoms; y: room for neighbours; z: room for circle jobs.
    counts: vec4u,
    // x: room for circles; y: room for arcs.
    caps: vec4u,
    // Atom bins along each axis (xyz); w: the neighbour search's reach in cells.
    bins: vec4u,
    // Atom bins' lowest corner (xyz) and cell size (w).
    binLow: vec4f,
};
@group(0) @binding(0) var<uniform> X: ExpoParams;

${itemIndexWgsl(SMOOTH_WORKGROUP)}
fn cellRange(p: vec3f) -> array<vec3i, 2> {
    let c = vec3i(floor((p - X.binLow.xyz) / X.binLow.w));
    let span = i32(X.bins.w);
    return array<vec3i, 2>(max(vec3i(0), c - vec3i(span)), min(vec3i(X.bins.xyz) - vec3i(1), c + vec3i(span)));
}
fn cellIndex(i: i32, j: i32, k: i32) -> u32 { return (u32(k) * X.bins.y + u32(j)) * X.bins.x + u32(i); }
`;

/** Each atom's neighbours (SAS spheres that meet its) counted, and whether its sphere is inside another. */
export const NEIGHBOUR_COUNT_WGSL = /* wgsl */ `${EXPO_COMMON}
@group(1) @binding(0) var<storage, read> sas: array<vec4f>;
@group(1) @binding(1) var<storage, read> binStart: array<u32>;
@group(1) @binding(2) var<storage, read> binMembers: array<u32>;
@group(1) @binding(3) var<storage, read_write> count: array<u32>;
@group(1) @binding(4) var<storage, read_write> contained: array<u32>;

@compute @workgroup_size(${SMOOTH_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
    let a = itemIndex(lid, wid, nwg);
    if (a >= X.counts.x) { return; }
    let A = sas[a];
    let range = cellRange(A.xyz);
    var n = 0u;
    var inside = 0u;
    for (var k = range[0].z; k <= range[1].z; k++) {
        for (var j = range[0].y; j <= range[1].y; j++) {
            for (var i = range[0].x; i <= range[1].x; i++) {
                let cell = cellIndex(i, j, k);
                for (var m = binStart[cell]; m < binStart[cell + 1u]; m++) {
                    let b = binMembers[m];
                    if (b == a) { continue; }
                    let Bs = sas[b];
                    let reach = Bs.w + A.w;
                    let w = Bs.xyz - A.xyz;
                    let d2 = dot(w, w);
                    if (d2 >= reach * reach) { continue; }
                    n++;
                    let d = sqrt(d2);
                    if (d + A.w <= Bs.w && (d > 1e-9 || A.w < Bs.w || a > b)) { inside = 1u; }
                }
            }
        }
    }
    count[a] = n;
    contained[a] = inside;
}
`;

/** start[n] = start[n - 1] + count[n - 1] after an exclusive scan of the atoms' counts (n = atoms). One thread. */
export const START_TOTAL_WGSL = /* wgsl */ `${EXPO_COMMON}
@group(1) @binding(0) var<storage, read> count: array<u32>;
@group(1) @binding(1) var<storage, read_write> start: array<u32>;

@compute @workgroup_size(1)
fn main() {
    let n = X.counts.x;
    start[n] = select(0u, start[n - 1u] + count[n - 1u], n > 0u);
}
`;

/** Each atom's neighbours written after the starts in nbr, in the order the bins give them (atom_bins_t). */
export const NEIGHBOUR_FILL_WGSL = /* wgsl */ `${EXPO_COMMON}
@group(1) @binding(0) var<storage, read> sas: array<vec4f>;
@group(1) @binding(1) var<storage, read> binStart: array<u32>;
@group(1) @binding(2) var<storage, read> binMembers: array<u32>;
@group(1) @binding(3) var<storage, read_write> nbr: array<u32>;

@compute @workgroup_size(${SMOOTH_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
    let a = itemIndex(lid, wid, nwg);
    if (a >= X.counts.x) { return; }
    let A = sas[a];
    let range = cellRange(A.xyz);
    let ids = X.counts.x + 1u;
    var at = nbr[a];
    let end = min(nbr[a + 1u], X.counts.y);
    for (var k = range[0].z; k <= range[1].z; k++) {
        for (var j = range[0].y; j <= range[1].y; j++) {
            for (var i = range[0].x; i <= range[1].x; i++) {
                let cell = cellIndex(i, j, k);
                for (var m = binStart[cell]; m < binStart[cell + 1u]; m++) {
                    let b = binMembers[m];
                    if (b == a) { continue; }
                    let Bs = sas[b];
                    let reach = Bs.w + A.w;
                    let w = Bs.xyz - A.xyz;
                    if (dot(w, w) >= reach * reach) { continue; }
                    if (at < end) { nbr[ids + at] = b; }
                    at++;
                }
            }
        }
    }
}
`;

/** Atom a's neighbours, from nbr. */
const NEIGHBOURS = /* wgsl */ `
fn neighbourBegin(a: u32) -> u32 { return nbr[a]; }
fn neighbourEnd(a: u32) -> u32 { return min(nbr[a + 1u], X.counts.y); }
fn neighbour(k: u32) -> u32 { return nbr[X.counts.x + 1u + k]; }
// Whether atoms lo < hi meet in a circle (circles_of_atom's tests, from the lower one's side).
fn meets(lo: u32, hi: u32) -> bool {
    let A = sas[lo]; let Bs = sas[hi];
    let u0 = Bs.xyz - A.xyz;
    let d = sqrt(dot(u0, u0));
    if (d < 1e-6 || d >= A.w + Bs.w) { return false; }
    let t = (d * d + A.w * A.w - Bs.w * Bs.w) / (2.0 * d);
    return A.w * A.w - t * t > 0.0;
}
`;

/**
 * Per atom: its circles counted (with every neighbour, either side: circle_count, which says whether it
 * can be exposed), and the circles it is the lower-numbered atom of (the jobs).
 */
export const PAIR_COUNT_WGSL = /* wgsl */ `${EXPO_COMMON}
@group(1) @binding(0) var<storage, read> sas: array<vec4f>;
@group(1) @binding(1) var<storage, read> nbr: array<u32>;
@group(1) @binding(2) var<storage, read_write> jobCount: array<u32>;
@group(1) @binding(3) var<storage, read_write> touch: array<u32>;
${NEIGHBOURS}
@compute @workgroup_size(${SMOOTH_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
    let a = itemIndex(lid, wid, nwg);
    if (a >= X.counts.x) { return; }
    var jobs = 0u; var touching = 0u;
    for (var k = neighbourBegin(a); k < neighbourEnd(a); k++) {
        let b = neighbour(k);
        if (meets(min(a, b), max(a, b))) {
            touching++;
            if (b > a) { jobs++; }
        }
    }
    jobCount[a] = jobs;
    touch[a] = touching;
}
`;

/** The jobs written: atom a and its other atom b, a's in its neighbours' order. */
export const PAIR_FILL_WGSL = /* wgsl */ `${EXPO_COMMON}
@group(1) @binding(0) var<storage, read> sas: array<vec4f>;
@group(1) @binding(1) var<storage, read> nbr: array<u32>;
@group(1) @binding(2) var<storage, read> jobStart: array<u32>;
@group(1) @binding(3) var<storage, read_write> jobs: array<vec2u>;
${NEIGHBOURS}
@compute @workgroup_size(${SMOOTH_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
    let a = itemIndex(lid, wid, nwg);
    if (a >= X.counts.x) { return; }
    var at = jobStart[a];
    for (var k = neighbourBegin(a); k < neighbourEnd(a); k++) {
        let b = neighbour(k);
        if (b > a && meets(a, b)) {
            if (at < X.counts.z) { jobs[at] = vec2u(a, b); }
            at++;
        }
    }
}
`;

/**
 * One circle (job): where atoms a < b meet; the parts of it inside each other neighbour of a; the gaps
 * between them - its exposed arcs (circles_of_atom). Intervals by their ends' directions, placed round
 * the circle by pseudo-angle; sorted (stable, by insertion), swept. countArcs: the arcs counted (0 if
 * none, or the circle is covered whole); emitArcs: the circle and its arcs written at their numbers.
 */
function circleKernel(emit: boolean): string {
    return /* wgsl */ `${EXPO_COMMON}
@group(1) @binding(0) var<storage, read> sas: array<vec4f>;
@group(1) @binding(1) var<storage, read> nbr: array<u32>;
@group(1) @binding(2) var<storage, read> jobs: array<vec2u>;
${emit ? `@group(1) @binding(3) var<storage, read> arcCount: array<u32>;
@group(1) @binding(4) var<storage, read> at: array<u32>;
@group(1) @binding(5) var<storage, read_write> floatsOut: array<f32>;
@group(1) @binding(6) var<storage, read_write> intsOut: array<u32>;` : `@group(1) @binding(3) var<storage, read> jobStart: array<u32>;
@group(1) @binding(4) var<storage, read_write> arcCount: array<u32>;
@group(1) @binding(5) var<storage, read_write> status: array<atomic<u32>>;`}
${NEIGHBOURS}
var<private> lo: array<f32, ${MAX_INTERVALS}>;
var<private> hi: array<f32, ${MAX_INTERVALS}>;
var<private> ends: array<vec4f, ${MAX_INTERVALS}>;
var<private> order: array<u32, ${MAX_INTERVALS}>;
var<private> arcs: array<vec4f, ${MAX_ARCS}>;
// Per arc: bit 0 it starts at the circle's 0, bit 1 it ends at its 2 pi.
var<private> arcFlags: array<u32, ${MAX_ARCS}>;

fn pseudoAngle(v: vec2f) -> f32 {
    if (v.y >= 0.0) { return select(1.0 + -v.x / (-v.x + v.y), v.y / (v.x + v.y), v.x >= 0.0); }
    return select(3.0 + v.x / (v.x - v.y), 2.0 + -v.y / (-v.x - v.y), v.x < 0.0);
}

@compute @workgroup_size(${SMOOTH_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
    let job = itemIndex(lid, wid, nwg);
    if (job >= X.counts.z) { return; }
${emit ? `    if (arcCount[job] == 0u) { return; }` : `    if (job >= jobStart[X.counts.x]) { arcCount[job] = 0u; return; }`}
    let pair = jobs[job];
    let a = pair.x; let b = pair.y;
    let A = sas[a]; let Bs = sas[b];
    let u0 = Bs.xyz - A.xyz;
    let d = sqrt(dot(u0, u0));
    let t = (d * d + A.w * A.w - Bs.w * Bs.w) / (2.0 * d);
    let r2 = A.w * A.w - t * t;
    let rc = sqrt(r2);
    let u = u0 / d;
    let c = A.xyz + t * u;
    var p = vec3f(0.0, 0.0, 1.0);
    if (abs(u.x) <= abs(u.y) && abs(u.x) <= abs(u.z)) { p = vec3f(1.0, 0.0, 0.0); }
    else if (abs(u.y) <= abs(u.z)) { p = vec3f(0.0, 1.0, 0.0); }
    var e1 = p - dot(p, u) * u;
    e1 = e1 / sqrt(dot(e1, e1));
    let e2 = cross(u, e1);

    var n = 0u;
    for (var k = neighbourBegin(a); k < neighbourEnd(a); k++) {
        let other = neighbour(k);
        if (other == b) { continue; }
        let C = sas[other];
        let w = c - C.xyz;
        let Aw = 2.0 * rc * dot(w, e1);
        let Bw = 2.0 * rc * dot(w, e2);
        let Rc = C.w - 1e-4;
        let K = Rc * Rc - dot(w, w) - r2;
        let M2 = Aw * Aw + Bw * Bw;
        if (K <= 0.0 && K * K >= M2) { continue; }
        if (K > 0.0 && K * K > M2) {
${emit ? `            return;` : `            arcCount[job] = 0u;
            return;`}
        }
        let M = sqrt(M2);
        let cosine = -K / M;
        let sine = sqrt(max(0.0, 1.0 - cosine * cosine));
        let m = vec2f(-Aw, -Bw) / M;
        let startEnd = vec2f(m.x * cosine + m.y * sine, m.y * cosine - m.x * sine);
        let finishEnd = vec2f(m.x * cosine - m.y * sine, m.y * cosine + m.x * sine);
        let ps = pseudoAngle(startEnd); let pe = pseudoAngle(finishEnd);
        if (n + 2u > ${MAX_INTERVALS}u) {
${emit ? `            return;` : `            atomicMax(&status[0], 1u);
            arcCount[job] = 0u;
            return;`}
        }
        if (ps <= pe) {
            lo[n] = ps; hi[n] = pe; ends[n] = vec4f(startEnd, finishEnd); n++;
        } else {
            lo[n] = ps; hi[n] = 4.0; ends[n] = vec4f(startEnd, 1.0, 0.0); n++;
            lo[n] = 0.0; hi[n] = pe; ends[n] = vec4f(1.0, 0.0, finishEnd); n++;
        }
    }
    for (var i = 0u; i < n; i++) { order[i] = i; }
    for (var i = 1u; i < n; i++) {
        let key = order[i];
        var j = i;
        while (j > 0u && lo[order[j - 1u]] > lo[key]) { order[j] = order[j - 1u]; j--; }
        order[j] = key;
    }
    var count = 0u;
    var reached = 0.0;
    var reachedEnd = vec2f(1.0, 0.0);
    var fromStart = true;
    var spilled = false;
    for (var i = 0u; i < n; i++) {
        let k = order[i];
        if (lo[k] > reached) {
            if (count < ${MAX_ARCS}u) { arcs[count] = vec4f(reachedEnd, ends[k].xy); arcFlags[count] = select(0u, 1u, fromStart); }
            else { spilled = true; }
            count++;
        }
        if (hi[k] > reached) { reached = hi[k]; reachedEnd = ends[k].zw; fromStart = false; }
    }
    if (reached < 4.0) {
        if (count < ${MAX_ARCS}u) { arcs[count] = vec4f(reachedEnd, 1.0, 0.0); arcFlags[count] = select(0u, 1u, fromStart) | 2u; }
        else { spilled = true; }
        count++;
    }
    if (spilled) {
${emit ? `        return;` : `        atomicMax(&status[0], 1u);
        arcCount[job] = 0u;
        return;`}
    }
    // An arc through the circle's 0: its two pieces as one.
    if (count >= 2u && (arcFlags[0] & 1u) != 0u && (arcFlags[count - 1u] & 2u) != 0u) {
        arcs[count - 1u] = vec4f(arcs[count - 1u].xy, arcs[0].zw);
        arcFlags[count - 1u] = arcFlags[count - 1u] & 1u;
        for (var i = 1u; i < count; i++) { arcs[i - 1u] = arcs[i]; arcFlags[i - 1u] = arcFlags[i]; }
        count--;
    }
${emit ? `    let circleNumber = at[job];
    let arcNumber = at[X.counts.z + job];
    if (circleNumber >= X.caps.x || arcNumber + count > X.caps.y) { return; }
    let o = 13u * circleNumber;
    floatsOut[o] = c.x; floatsOut[o + 1u] = c.y; floatsOut[o + 2u] = c.z;
    floatsOut[o + 3u] = u.x; floatsOut[o + 4u] = u.y; floatsOut[o + 5u] = u.z;
    floatsOut[o + 6u] = e1.x; floatsOut[o + 7u] = e1.y; floatsOut[o + 8u] = e1.z;
    floatsOut[o + 9u] = e2.x; floatsOut[o + 10u] = e2.y; floatsOut[o + 11u] = e2.z;
    floatsOut[o + 12u] = rc;
    intsOut[circleNumber] = b;
    intsOut[X.caps.x + circleNumber] = arcNumber;
    for (var i = 0u; i < count; i++) {
        let s = arcs[i].xy; let e = arcs[i].zw;
        // The length, as the distance kernels test it: 2 pi for the whole circle; else at most pi or more.
        var length = 1.0;
        if (count == 1u && n == 0u) { length = ${(2 * Math.PI).toFixed(9)}; }
        else if (!(s.x * e.y - s.y * e.x > 0.0 || (s.x * e.y - s.y * e.x == 0.0 && dot(s, e) > 0.0))) { length = 4.0; }
        let q = 13u * X.caps.x + 5u * (arcNumber + i);
        floatsOut[q] = s.x; floatsOut[q + 1u] = s.y; floatsOut[q + 2u] = e.x; floatsOut[q + 3u] = e.y; floatsOut[q + 4u] = length;
    }` : `    arcCount[job] = count;`}
}
`;
}
export const CIRCLE_COUNT_WGSL = circleKernel(false);
export const CIRCLE_EMIT_WGSL = circleKernel(true);

/** Per job: 1 if its circle is kept (has an exposed arc), for the scan that numbers them. */
export const CIRCLE_KEEP_WGSL = /* wgsl */ `${EXPO_COMMON}
@group(1) @binding(0) var<storage, read> arcCount: array<u32>;
@group(1) @binding(1) var<storage, read_write> keep: array<u32>;

@compute @workgroup_size(${SMOOTH_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
    let job = itemIndex(lid, wid, nwg);
    if (job >= X.counts.z) { return; }
    keep[job] = select(0u, 1u, arcCount[job] > 0u);
}
`;

/** For each kept circle: both its atoms exposed, and counted in each one's circles. */
export const MARK_ATOMS_WGSL = /* wgsl */ `${EXPO_COMMON}
@group(1) @binding(0) var<storage, read> jobs: array<vec2u>;
@group(1) @binding(1) var<storage, read> arcCount: array<u32>;
@group(1) @binding(2) var<storage, read_write> exposed: array<u32>;
@group(1) @binding(3) var<storage, read_write> atomCircleCount: array<atomic<u32>>;

@compute @workgroup_size(${SMOOTH_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
    let job = itemIndex(lid, wid, nwg);
    if (job >= X.counts.z || arcCount[job] == 0u) { return; }
    let pair = jobs[job];
    exposed[pair.x] = 1u;
    exposed[pair.y] = 1u;
    atomicAdd(&atomCircleCount[pair.x], 1u);
    atomicAdd(&atomCircleCount[pair.y], 1u);
}
`;

/**
 * Per atom (and one past the last): where its own circles start - circle numbers are in atom order - and
 * exposed too if it meets no other sphere and is inside none.
 */
export const ATOM_CIRCLES_WGSL = /* wgsl */ `${EXPO_COMMON}
@group(1) @binding(0) var<storage, read> touch: array<u32>;
@group(1) @binding(1) var<storage, read> contained: array<u32>;
@group(1) @binding(2) var<storage, read> jobStart: array<u32>;
@group(1) @binding(3) var<storage, read> arcCount: array<u32>;
@group(1) @binding(4) var<storage, read> at: array<u32>;
@group(1) @binding(5) var<storage, read_write> exposed: array<u32>;
@group(1) @binding(6) var<storage, read_write> circleStart: array<u32>;

@compute @workgroup_size(${SMOOTH_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
    let a = itemIndex(lid, wid, nwg);
    if (a > X.counts.x) { return; }
    let jobs = min(jobStart[X.counts.x], X.counts.z);
    let first = jobStart[a];
    var before = 0u;
    if (jobs > 0u) {
        if (first < jobs) { before = at[first]; }
        else { before = at[jobs - 1u] + select(0u, 1u, arcCount[jobs - 1u] > 0u); }
    }
    circleStart[a] = before;
    if (a < X.counts.x && touch[a] == 0u && contained[a] == 0u) { exposed[a] = 1u; }
}
`;

/** Each kept circle's number into its two atoms' lists (in any order; sorted next). */
export const ATOM_CIRCLE_FILL_WGSL = /* wgsl */ `${EXPO_COMMON}
@group(1) @binding(0) var<storage, read> jobs: array<vec2u>;
@group(1) @binding(1) var<storage, read> arcCount: array<u32>;
@group(1) @binding(2) var<storage, read> at: array<u32>;
@group(1) @binding(3) var<storage, read> atomCircleStart: array<u32>;
@group(1) @binding(4) var<storage, read_write> fill: array<atomic<u32>>;
@group(1) @binding(5) var<storage, read_write> atomCircleIds: array<u32>;

@compute @workgroup_size(${SMOOTH_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
    let job = itemIndex(lid, wid, nwg);
    if (job >= X.counts.z || arcCount[job] == 0u) { return; }
    let pair = jobs[job];
    let c = at[job];
    atomCircleIds[atomCircleStart[pair.x] + atomicAdd(&fill[pair.x], 1u)] = c;
    atomCircleIds[atomCircleStart[pair.y] + atomicAdd(&fill[pair.y], 1u)] = c;
}
`;

/** Each atom's circle list sorted by circle number, as the C++ lists them. */
export const ATOM_CIRCLE_SORT_WGSL = /* wgsl */ `${EXPO_COMMON}
@group(1) @binding(0) var<storage, read> atomCircleStart: array<u32>;
@group(1) @binding(1) var<storage, read_write> atomCircleIds: array<u32>;

@compute @workgroup_size(${SMOOTH_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
    let a = itemIndex(lid, wid, nwg);
    if (a >= X.counts.x) { return; }
    let s = atomCircleStart[a]; let e = atomCircleStart[a + 1u];
    for (var i = s + 1u; i < e; i++) {
        let key = atomCircleIds[i];
        var j = i;
        while (j > s && atomCircleIds[j - 1u] > key) { atomCircleIds[j] = atomCircleIds[j - 1u]; j--; }
        atomCircleIds[j] = key;
    }
}
`;

/**
 * The totals, for the caller to size the tables by - neighbours, circle jobs, kept circles, arcs - into
 * status[1..4]; status[0]: 1 if a circle had more intervals or arcs than room for, 2 if neighbours, jobs,
 * circles or arcs outgrew theirs.
 */
export const EXPO_TOTALS_WGSL = /* wgsl */ `${EXPO_COMMON}
@group(1) @binding(0) var<storage, read> nbr: array<u32>;
@group(1) @binding(1) var<storage, read> jobStart: array<u32>;
@group(1) @binding(2) var<storage, read> arcCount: array<u32>;
@group(1) @binding(3) var<storage, read> at: array<u32>;
@group(1) @binding(4) var<storage, read_write> status: array<atomic<u32>>;

@compute @workgroup_size(1)
fn main() {
    let n = X.counts.x;
    let neighbours = nbr[n];
    let jobs = jobStart[n];
    let last = min(jobs, X.counts.z);
    var circles = 0u; var arcs = 0u;
    if (last > 0u) {
        circles = at[last - 1u] + select(0u, 1u, arcCount[last - 1u] > 0u);
        arcs = at[X.counts.z + last - 1u] + arcCount[last - 1u];
    }
    if (neighbours > X.counts.y || jobs > X.counts.z || circles > X.caps.x || arcs > X.caps.y) { atomicMax(&status[0], 2u); }
    atomicStore(&status[1], neighbours);
    atomicStore(&status[2], jobs);
    atomicStore(&status[3], circles);
    atomicStore(&status[4], arcs);
}
`;
