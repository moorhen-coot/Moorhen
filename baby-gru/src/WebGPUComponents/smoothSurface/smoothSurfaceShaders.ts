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
    // x: the axis blurred (0, 1, 2); y: the kernel's radius; z: 1 to lift the cap by the weight;
    // w: the points inside (the volume the level keeps).
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
@group(1) @binding(1) var<storage, read_write> level: array<f32>;

@compute @workgroup_size(1)
fn main() {
    let range = B.values.y;
    let scale = f32(${LEVEL_BINS}) / (2.0 * range);
    let wanted = B.step.w;
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
