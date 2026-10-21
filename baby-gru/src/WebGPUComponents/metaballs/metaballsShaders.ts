/**
 * WGSL for GPU MetaBalls: a transcription of metaballs/metaballs.cc and the marching cubes in
 * metaballs/MC.h, reorganised so that every step is one thread per grid point, cell or vertex.
 *
 * The arithmetic follows the C++ operation for operation, so that the field, the vertex
 * positions and the per-vertex normals and colours come out the same. They match to within
 * float rounding rather than exactly, for two reasons: each voxel sums its points in bin order
 * here and in point order there, and WGSL's division is allowed to be a couple of ulps out.
 *
 * The grid is processed a slab of z planes at a time. Plane indices are global; buffers hold a
 * slab, indexed from the slab's first plane, `z0`.
 *
 * Vertices are owned by grid edges, as in MC.h: point (x, y, z) owns the edge to (x+1, y, z),
 * (x, y+1, z) and (x, y, z+1), and an edge that the surface crosses has exactly one vertex. A
 * point's vertices are numbered in axis order x, y, z, after all the vertices of the points
 * before it. That is a different order from MC.h's, which numbers vertices as it first meets
 * them, but it is the same set of vertices and - because cells are visited in the same order -
 * the same triangles in the same order.
 */

/** Threads per workgroup for the one-thread-per-item kernels. */
export const ITEM_WORKGROUP = 64;

const COMMON = /* wgsl */ `
struct Params {
    minX: f32, minY: f32, minZ: f32, cell: f32,
    nx: u32, ny: u32, nz: u32, isoLevel: f32,
    binX: f32, binY: f32, binZ: f32, binSize: f32,
    binNx: u32, binNy: u32, binNz: u32, cutoff: f32,
    // First plane of this slab, and how many planes each kind of array covers.
    z0: u32, fieldPlanes: u32, countPlanes: u32, cellPlanes: u32,
    // Point planes whose vertices this slab owns; global index of its first vertex.
    ownedPlanes: u32, vertexBase: u32, vertexCount: u32, pointCount: u32,
};

@group(0) @binding(0) var<uniform> P: Params;

fn itemIndex(lid: vec3u, wid: vec3u, nwg: vec3u) -> u32 {
    return (wid.y * nwg.x + wid.x) * ${ITEM_WORKGROUP}u + lid.x;
}

fn planeSize() -> u32 { return P.nx * P.ny; }

// GLSL-style smoothstep, as metaballs.cc writes it.
fn smoothstep_mb(e0: f32, e1: f32, v: f32) -> f32 {
    let t = clamp((v - e0) / (e1 - e0), 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
}

fn binCoord(v: f32, origin: f32, n: u32) -> u32 {
    return u32(clamp(floor((v - origin) / P.binSize), 0.0, f32(n - 1u)));
}

fn binIndex(bx: u32, by: u32, bz: u32) -> u32 {
    return (bz * P.binNy + by) * P.binNx + bx;
}
`;

/** Edge of the cube of grid points one field workgroup computes. */
export const FIELD_BRICK = 4;
/** Atoms a field workgroup holds in workgroup memory at once; more are taken in rounds. */
const FIELD_CANDIDATES = 448;

/**
 * The scalar field, one workgroup per 4x4x4 brick of grid points of the slab.
 *
 * The obvious form - one thread per grid point, each looking up its own nearby atoms - spent its
 * time fetching the same atoms from memory again and again: neighbouring points need almost the
 * same ones, about 180 each. Here the workgroup first collects the atoms whose fill_field box
 * reaches any point of its brick into workgroup memory, once, and every thread then works from
 * that list.
 *
 * The list is built deterministically: each thread counts what it finds in its share of the bins,
 * the counts are scanned, and each thread writes its atoms at its offset. So every run sums the
 * same atoms in the same order. A brick with more atoms than fit is done in rounds.
 *
 * Items for the dispatch are bricks * 64, so that dispatch() makes one workgroup per brick.
 */
export const FIELD_WGSL = COMMON + /* wgsl */ `
@group(1) @binding(0) var<storage, read> points: array<vec4f>;
@group(1) @binding(1) var<storage, read> binStart: array<u32>;
@group(1) @binding(2) var<storage, read_write> field: array<f32>;
// fill_field's index box for each point, worked out once on the CPU: see pointIndexBoxes.
@group(1) @binding(3) var<storage, read> boxes: array<u32>;

const BRICK = ${FIELD_BRICK}u;
const CAP = ${FIELD_CANDIDATES}u;
var<workgroup> candPoint: array<vec4f, CAP>;
var<workgroup> candBox: array<vec4u, CAP>;
var<workgroup> threadOffset: array<u32, 64>;
var<workgroup> candTotal: u32;

fn boxLo(v: u32) -> u32 { return v & 0xffffu; }
fn boxHi(v: u32) -> u32 { return v >> 16u; }

@compute @workgroup_size(64)
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u,
        @builtin(num_workgroups) nwg: vec3u) {
    // Everything up to the barriers depends on the workgroup only, so it is uniform.
    let brick = wid.y * nwg.x + wid.x;
    let bricksX = (P.nx + BRICK - 1u) / BRICK;
    let bricksY = (P.ny + BRICK - 1u) / BRICK;
    let bricksZ = (P.fieldPlanes + BRICK - 1u) / BRICK;
    if (brick >= bricksX * bricksY * bricksZ) { return; }
    let bz = brick / (bricksX * bricksY);
    let brem = brick - bz * bricksX * bricksY;
    let by = brem / bricksX;
    let bx = brem - by * bricksX;

    // This brick's grid points, as global indices (z as a plane index).
    let ix0 = bx * BRICK; let ix1 = min(ix0 + BRICK - 1u, P.nx - 1u);
    let iy0 = by * BRICK; let iy1 = min(iy0 + BRICK - 1u, P.ny - 1u);
    let lz0 = bz * BRICK; let lz1 = min(lz0 + BRICK - 1u, P.fieldPlanes - 1u);
    let iz0 = P.z0 + lz0; let iz1 = P.z0 + lz1;

    // The bins any of its points can draw on: [v - cutoff, v + cutoff + cell] about each.
    let lo = P.cutoff + 0.01;
    let hi = P.cutoff + P.cell + 0.01;
    let bx0 = binCoord(P.minX + f32(ix0) * P.cell - lo, P.binX, P.binNx);
    let bx1 = binCoord(P.minX + f32(ix1) * P.cell + hi, P.binX, P.binNx);
    let by0 = binCoord(P.minY + f32(iy0) * P.cell - lo, P.binY, P.binNy);
    let by1 = binCoord(P.minY + f32(iy1) * P.cell + hi, P.binY, P.binNy);
    let bz0 = binCoord(P.minZ + f32(iz0) * P.cell - lo, P.binZ, P.binNz);
    let bz1 = binCoord(P.minZ + f32(iz1) * P.cell + hi, P.binZ, P.binNz);
    let nbx = bx1 - bx0 + 1u;
    let nby = by1 - by0 + 1u;
    let nbins = nbx * nby * (bz1 - bz0 + 1u);

    // 1. Count the atoms whose box meets the brick, in this thread's share of the bins.
    var mine = 0u;
    for (var t = lid.x; t < nbins; t += 64u) {
        let tz = t / (nbx * nby);
        let tr = t - tz * nbx * nby;
        let ty = tr / nbx;
        let b = binIndex(bx0 + tr - ty * nbx, by0 + ty, bz0 + tz);
        for (var k = binStart[b]; k < binStart[b + 1u]; k++) {
            let bxr = boxes[3u * k]; let byr = boxes[3u * k + 1u]; let bzr = boxes[3u * k + 2u];
            if (boxLo(bxr) <= ix1 && boxHi(bxr) >= ix0 && boxLo(byr) <= iy1 && boxHi(byr) >= iy0
                && boxLo(bzr) <= iz1 && boxHi(bzr) >= iz0) { mine++; }
        }
    }
    threadOffset[lid.x] = mine;
    workgroupBarrier();
    if (lid.x == 0u) {
        var running = 0u;
        for (var i = 0u; i < 64u; i++) {
            let c = threadOffset[i];
            threadOffset[i] = running;
            running += c;
        }
        candTotal = running;
    }
    let total = workgroupUniformLoad(&candTotal);
    let first = threadOffset[lid.x];

    // This thread's grid point.
    let ix = ix0 + (lid.x % BRICK);
    let iy = iy0 + ((lid.x / BRICK) % BRICK);
    let lz = lz0 + lid.x / (BRICK * BRICK);
    let valid = ix < P.nx && iy < P.ny && lz < P.fieldPlanes;
    let iz = P.z0 + lz;
    // float x = min_x + ix * cell_x;
    let x = P.minX + f32(ix) * P.cell;
    let y = P.minY + f32(iy) * P.cell;
    let z = P.minZ + f32(iz) * P.cell;
    var value = -P.isoLevel;

    // 2. In rounds of CAP: gather the atoms into workgroup memory, then each point sums them.
    for (var r0 = 0u; r0 < total; r0 += CAP) {
        var pos = first;
        for (var t = lid.x; t < nbins; t += 64u) {
            let tz = t / (nbx * nby);
            let tr = t - tz * nbx * nby;
            let ty = tr / nbx;
            let b = binIndex(bx0 + tr - ty * nbx, by0 + ty, bz0 + tz);
            for (var k = binStart[b]; k < binStart[b + 1u]; k++) {
                let bxr = boxes[3u * k]; let byr = boxes[3u * k + 1u]; let bzr = boxes[3u * k + 2u];
                if (boxLo(bxr) <= ix1 && boxHi(bxr) >= ix0 && boxLo(byr) <= iy1 && boxHi(byr) >= iy0
                    && boxLo(bzr) <= iz1 && boxHi(bzr) >= iz0) {
                    if (pos >= r0 && pos < r0 + CAP) {
                        candPoint[pos - r0] = points[k];
                        candBox[pos - r0] = vec4u(bxr, byr, bzr, 0u);
                    }
                    pos++;
                }
            }
        }
        workgroupBarrier();
        let n = min(CAP, total - r0);
        if (valid) {
            for (var j = 0u; j < n; j++) {
                // Only points whose fill_field box holds this voxel.
                let box = candBox[j];
                if (ix < boxLo(box.x) || ix > boxHi(box.x) || iy < boxLo(box.y) || iy > boxHi(box.y)
                    || iz < boxLo(box.z) || iz > boxHi(box.z)) { continue; }
                let p = candPoint[j];
                let dx = x - p.x;
                let dy = y - p.y;
                let dz = z - p.z;
                let d2 = dx * dx + dy * dy + dz * dz;
                if (d2 < 1e-6) { continue; }
                let s = smoothstep_mb(0.0, 12.0, d2);
                let inv = 1.0 / (s * 30.0);
                value += (p.w * p.w) * inv;
            }
        }
        workgroupBarrier();
    }
    if (valid) {
        field[(lz * P.ny + iy) * P.nx + ix] = value;
    }
}
`;

/**
 * The scalar field, one thread per grid point, each finding its own atoms in the bins. The
 * simpler of the two field kernels; FIELD_WGSL is the tiled one. Kept so the two can be timed
 * against each other on real hardware (gpuMetaBallsSetting.tiledField): which wins depends on
 * the GPU's memory system, and a software rasteriser gets it backwards.
 */
export const FIELD_DIRECT_WGSL = COMMON + /* wgsl */ `
@group(1) @binding(0) var<storage, read> points: array<vec4f>;
@group(1) @binding(1) var<storage, read> binStart: array<u32>;
@group(1) @binding(2) var<storage, read_write> field: array<f32>;
@group(1) @binding(3) var<storage, read> boxes: array<u32>;

@compute @workgroup_size(${ITEM_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u,
        @builtin(num_workgroups) nwg: vec3u) {
    let idx = itemIndex(lid, wid, nwg);
    let plane = planeSize();
    if (idx >= P.fieldPlanes * plane) { return; }
    let lz = idx / plane;
    let rem = idx - lz * plane;
    let iy = rem / P.nx;
    let ix = rem - iy * P.nx;
    let iz = P.z0 + lz;
    let x = P.minX + f32(ix) * P.cell;
    let y = P.minY + f32(iy) * P.cell;
    let z = P.minZ + f32(iz) * P.cell;
    let lo = P.cutoff + 0.01;
    let hi = P.cutoff + P.cell + 0.01;
    let bx0 = binCoord(x - lo, P.binX, P.binNx); let bx1 = binCoord(x + hi, P.binX, P.binNx);
    let by0 = binCoord(y - lo, P.binY, P.binNy); let by1 = binCoord(y + hi, P.binY, P.binNy);
    let bz0 = binCoord(z - lo, P.binZ, P.binNz); let bz1 = binCoord(z + hi, P.binZ, P.binNz);
    var value = -P.isoLevel;
    for (var bz = bz0; bz <= bz1; bz++) {
        for (var by = by0; by <= by1; by++) {
            for (var bx = bx0; bx <= bx1; bx++) {
                let b = binIndex(bx, by, bz);
                for (var k = binStart[b]; k < binStart[b + 1u]; k++) {
                    let bxr = boxes[3u * k];
                    if (ix < (bxr & 0xffffu) || ix > (bxr >> 16u)) { continue; }
                    let byr = boxes[3u * k + 1u];
                    if (iy < (byr & 0xffffu) || iy > (byr >> 16u)) { continue; }
                    let bzr = boxes[3u * k + 2u];
                    if (iz < (bzr & 0xffffu) || iz > (bzr >> 16u)) { continue; }
                    let p = points[k];
                    let dx = x - p.x;
                    let dy = y - p.y;
                    let dz = z - p.z;
                    let d2 = dx * dx + dy * dy + dz * dz;
                    if (d2 < 1e-6) { continue; }
                    let s = smoothstep_mb(0.0, 12.0, d2);
                    let inv = 1.0 / (s * 30.0);
                    value += (p.w * p.w) * inv;
                }
            }
        }
    }
    field[idx] = value;
}
`;

/** Field value at a point given in slab-local plane coordinates. */
const FIELD_AT = /* wgsl */ `
fn fieldAt(ix: u32, iy: u32, lz: u32) -> f32 {
    return field[(lz * P.ny + iy) * P.nx + ix];
}
fn inside(v: f32) -> bool { return v < 0.0; }
`;

/**
 * One thread per grid point of the counting planes: which of its three edges the surface
 * crosses (bit 0 x, 1 y, 2 z), and how many that is.
 */
export const COUNT_VERTICES_WGSL = COMMON + /* wgsl */ `
@group(1) @binding(0) var<storage, read> field: array<f32>;
@group(1) @binding(1) var<storage, read_write> edgeMask: array<u32>;
@group(1) @binding(2) var<storage, read_write> vertexCount: array<u32>;
${FIELD_AT}
@compute @workgroup_size(${ITEM_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u,
        @builtin(num_workgroups) nwg: vec3u) {
    let idx = itemIndex(lid, wid, nwg);
    let plane = planeSize();
    if (idx >= P.countPlanes * plane) { return; }
    let lz = idx / plane;
    let rem = idx - lz * plane;
    let iy = rem / P.nx;
    let ix = rem - iy * P.nx;
    let iz = P.z0 + lz;
    let v = inside(fieldAt(ix, iy, lz));
    var mask = 0u;
    if (ix + 1u < P.nx && inside(fieldAt(ix + 1u, iy, lz)) != v) { mask |= 1u; }
    if (iy + 1u < P.ny && inside(fieldAt(ix, iy + 1u, lz)) != v) { mask |= 2u; }
    if (iz + 1u < P.nz && inside(fieldAt(ix, iy, lz + 1u)) != v) { mask |= 4u; }
    edgeMask[idx] = mask;
    vertexCount[idx] = countOneBits(mask);
}
`;

/** MC.h's edge numbering: the point offset and axis of each of a cell's 12 edges. */
const EDGES = /* wgsl */ `
const EDGE_POINTS = array<vec4u, 12>(
    vec4u(0u, 0u, 0u, 0u), vec4u(0u, 1u, 0u, 0u), vec4u(0u, 0u, 1u, 0u), vec4u(0u, 1u, 1u, 0u),
    vec4u(0u, 0u, 0u, 1u), vec4u(1u, 0u, 0u, 1u), vec4u(0u, 0u, 1u, 1u), vec4u(1u, 0u, 1u, 1u),
    vec4u(0u, 0u, 0u, 2u), vec4u(1u, 0u, 0u, 2u), vec4u(0u, 1u, 0u, 2u), vec4u(1u, 1u, 0u, 2u),
);

// MC.h's corner order: bit c of the configuration is corner c, x fastest, then y, then z.
fn cellConfig(cx: u32, cy: u32, lz: u32) -> u32 {
    var config = 0u;
    for (var c = 0u; c < 8u; c++) {
        let ox = c & 1u;
        let oy = (c >> 1u) & 1u;
        let oz = (c >> 2u) & 1u;
        if (inside(fieldAt(cx + ox, cy + oy, lz + oz))) { config |= 1u << c; }
    }
    return config;
}

fn tableNibble(config: u32, nibble: u32) -> u32 {
    let bit = nibble * 4u;
    let word = select(table[config].x, table[config].y, bit >= 32u);
    return (word >> (bit & 31u)) & 15u;
}
`;

/** One thread per cell of the slab: how many triangles it contributes. */
export const COUNT_TRIANGLES_WGSL = COMMON + /* wgsl */ `
@group(1) @binding(0) var<storage, read> field: array<f32>;
@group(1) @binding(1) var<storage, read> table: array<vec2u>;
@group(1) @binding(2) var<storage, read_write> triangleCount: array<u32>;
${FIELD_AT}
${EDGES}
@compute @workgroup_size(${ITEM_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u,
        @builtin(num_workgroups) nwg: vec3u) {
    let idx = itemIndex(lid, wid, nwg);
    let cellsX = P.nx - 1u;
    let cellPlane = cellsX * (P.ny - 1u);
    if (idx >= P.cellPlanes * cellPlane) { return; }
    let lz = idx / cellPlane;
    let rem = idx - lz * cellPlane;
    let cy = rem / cellsX;
    let cx = rem - cy * cellsX;
    let config = cellConfig(cx, cy, lz);
    triangleCount[idx] = select(tableNibble(config, 0u), 0u, config == 0u || config == 255u);
}
`;

/**
 * One thread per grid point of the owned planes: write its vertices.
 *
 * MC.h: v = (x, y, z); v[axis] += va / (va - vb); then each coordinate * cell + min.
 */
export const EMIT_VERTICES_WGSL = COMMON + /* wgsl */ `
@group(1) @binding(0) var<storage, read> field: array<f32>;
@group(1) @binding(1) var<storage, read> edgeMask: array<u32>;
@group(1) @binding(2) var<storage, read> vertexOffset: array<u32>;
@group(1) @binding(3) var<storage, read_write> positions: array<f32>;
@group(1) @binding(4) var<storage, read_write> keys: array<u32>;
${FIELD_AT}
@compute @workgroup_size(${ITEM_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u,
        @builtin(num_workgroups) nwg: vec3u) {
    let idx = itemIndex(lid, wid, nwg);
    let plane = planeSize();
    if (idx >= P.ownedPlanes * plane) { return; }
    let mask = edgeMask[idx];
    if (mask == 0u) { return; }
    let lz = idx / plane;
    let rem = idx - lz * plane;
    let iy = rem / P.nx;
    let ix = rem - iy * P.nx;
    let iz = P.z0 + lz;
    let va = fieldAt(ix, iy, lz);
    var slot = vertexOffset[idx];
    for (var axis = 0u; axis < 3u; axis++) {
        if ((mask & (1u << axis)) == 0u) { continue; }
        var vb: f32;
        if (axis == 0u) { vb = fieldAt(ix + 1u, iy, lz); }
        else if (axis == 1u) { vb = fieldAt(ix, iy + 1u, lz); }
        else { vb = fieldAt(ix, iy, lz + 1u); }
        var v = vec3f(f32(ix), f32(iy), f32(iz));
        v[axis] = v[axis] + va / (va - vb);
        positions[3u * slot] = v.x * P.cell + P.minX;
        positions[3u * slot + 1u] = v.y * P.cell + P.minY;
        positions[3u * slot + 2u] = v.z * P.cell + P.minZ;
        // Which edge this vertex sits on: for matching against the C++ mesh in tests.
        keys[slot] = (((iz * P.ny + iy) * P.nx + ix) * 3u) + axis;
        slot++;
    }
}
`;

/** One thread per cell of the slab: write its triangles, as global vertex indices. */
export const EMIT_TRIANGLES_WGSL = COMMON + /* wgsl */ `
@group(1) @binding(0) var<storage, read> field: array<f32>;
@group(1) @binding(1) var<storage, read> table: array<vec2u>;
@group(1) @binding(2) var<storage, read> edgeMask: array<u32>;
@group(1) @binding(3) var<storage, read> vertexOffset: array<u32>;
@group(1) @binding(4) var<storage, read> triangleOffset: array<u32>;
@group(1) @binding(5) var<storage, read_write> indices: array<u32>;
${FIELD_AT}
${EDGES}
@compute @workgroup_size(${ITEM_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u,
        @builtin(num_workgroups) nwg: vec3u) {
    let idx = itemIndex(lid, wid, nwg);
    let cellsX = P.nx - 1u;
    let cellPlane = cellsX * (P.ny - 1u);
    if (idx >= P.cellPlanes * cellPlane) { return; }
    let lz = idx / cellPlane;
    let rem = idx - lz * cellPlane;
    let cy = rem / cellsX;
    let cx = rem - cy * cellsX;
    let config = cellConfig(cx, cy, lz);
    if (config == 0u || config == 255u) { return; }
    let count = tableNibble(config, 0u) * 3u;
    let base = triangleOffset[idx] * 3u;
    for (var i = 0u; i < count; i++) {
        let e = EDGE_POINTS[tableNibble(config, i + 1u)];
        let point = ((lz + e.z) * P.ny + (cy + e.y)) * P.nx + (cx + e.x);
        let mask = edgeMask[point];
        let rank = countOneBits(mask & ((1u << e.w) - 1u));
        indices[base + i] = P.vertexBase + vertexOffset[point] + rank;
    }
}
`;

/** The atoms a vertex can see, and what smooth_mesh does with them. */
const SMOOTH_COMMON = /* wgsl */ `
fn vertexAt(i: u32) -> vec3f {
    return vec3f(positions[3u * i], positions[3u * i + 1u], positions[3u * i + 2u]);
}
`;

/**
 * One thread per vertex owned by the slab: normal and colour, and how many influences it has.
 * smooth_mesh in metaballs.cc, line for line.
 */
export const SMOOTH_WGSL = COMMON + /* wgsl */ `
@group(1) @binding(0) var<storage, read> points: array<vec4f>;
@group(1) @binding(1) var<storage, read> colours: array<vec4f>;
@group(1) @binding(2) var<storage, read> binStart: array<u32>;
@group(1) @binding(3) var<storage, read> positions: array<f32>;
@group(1) @binding(4) var<storage, read_write> normals: array<f32>;
@group(1) @binding(5) var<storage, read_write> vertexColours: array<vec4f>;
@group(1) @binding(6) var<storage, read_write> influenceCount: array<u32>;
${SMOOTH_COMMON}
@compute @workgroup_size(${ITEM_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u,
        @builtin(num_workgroups) nwg: vec3u) {
    let i = itemIndex(lid, wid, nwg);
    if (i >= P.vertexCount) { return; }
    let v = vertexAt(i);
    let ex = v.x + 0.02;
    let ey = v.y + 0.02;
    let ez = v.z + 0.02;
    var f = 0.0;
    var fdx = 0.0;
    var fdy = 0.0;
    var fdz = 0.0;
    var colour = vec4f(0.0);
    var totFrac = 0.0;
    var influences = 0u;
    let c = P.cutoff;
    let bx0 = binCoord(v.x - c - 0.01, P.binX, P.binNx); let bx1 = binCoord(v.x + c + 0.01, P.binX, P.binNx);
    let by0 = binCoord(v.y - c - 0.01, P.binY, P.binNy); let by1 = binCoord(v.y + c + 0.01, P.binY, P.binNy);
    let bz0 = binCoord(v.z - c - 0.01, P.binZ, P.binNz); let bz1 = binCoord(v.z + c + 0.01, P.binZ, P.binNz);
    for (var bz = bz0; bz <= bz1; bz++) {
        for (var by = by0; by <= by1; by++) {
            for (var bx = bx0; bx <= bx1; bx++) {
                let b = binIndex(bx, by, bz);
                for (var k = binStart[b]; k < binStart[b + 1u]; k++) {
                    let p = points[k];
                    let dx0 = v.x - p.x;
                    if (dx0 > c || dx0 < -c) { continue; }
                    let dy0 = v.y - p.y;
                    if (dy0 > c || dy0 < -c) { continue; }
                    let dz0 = v.z - p.z;
                    if (dz0 > c || dz0 < -c) { continue; }
                    let xx = dx0 * dx0;
                    let yy = dy0 * dy0;
                    let zz = dz0 * dz0;
                    let sumsq = xx + yy + zz;
                    if (sumsq >= 22.0) { continue; }
                    let rr = p.w * p.w;
                    f += rr * (1.0 / sumsq);
                    let dxx = (ex - p.x) * (ex - p.x);
                    let dyy = (ey - p.y) * (ey - p.y);
                    let dzz = (ez - p.z) * (ez - p.z);
                    fdx += rr / (dxx + (yy + zz));
                    fdy += rr / (xx + dyy + zz);
                    fdz += rr / (xx + yy + dzz);
                    let frac = 1.0 - smoothstep_mb(0.3, 2.8, sumsq);
                    totFrac += frac;
                    colour += frac * colours[k];
                    if (frac > 0.005) { influences++; }
                }
            }
        }
    }
    if (totFrac > 1e-4) { colour = colour * (1.0 / totFrac); }
    let n = vec3f(fdx - f, fdy - f, fdz - f);
    let normal = n / length(n);
    normals[3u * i] = normal.x;
    normals[3u * i + 1u] = normal.y;
    normals[3u * i + 2u] = normal.z;
    vertexColours[i] = colour;
    influenceCount[i] = influences;
}
`;

/** One thread per vertex owned by the slab: write its influences (point index, weight). */
export const INFLUENCES_WGSL = COMMON + /* wgsl */ `
@group(1) @binding(0) var<storage, read> points: array<vec4f>;
@group(1) @binding(1) var<storage, read> pointIds: array<u32>;
@group(1) @binding(2) var<storage, read> binStart: array<u32>;
@group(1) @binding(3) var<storage, read> positions: array<f32>;
@group(1) @binding(4) var<storage, read> influenceOffset: array<u32>;
@group(1) @binding(5) var<storage, read> influenceCount: array<u32>;
@group(1) @binding(6) var<storage, read_write> influencePoints: array<u32>;
@group(1) @binding(7) var<storage, read_write> influenceWeights: array<f32>;
${SMOOTH_COMMON}
@compute @workgroup_size(${ITEM_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u,
        @builtin(num_workgroups) nwg: vec3u) {
    let i = itemIndex(lid, wid, nwg);
    if (i >= P.vertexCount) { return; }
    let v = vertexAt(i);
    var slot = influenceOffset[i];
    // The count pass decided how many slots this vertex has. Recomputing the same test should
    // agree with it, but the two are separate shaders, so never write past what it allotted.
    let end = slot + influenceCount[i];
    let c = P.cutoff;
    let bx0 = binCoord(v.x - c - 0.01, P.binX, P.binNx); let bx1 = binCoord(v.x + c + 0.01, P.binX, P.binNx);
    let by0 = binCoord(v.y - c - 0.01, P.binY, P.binNy); let by1 = binCoord(v.y + c + 0.01, P.binY, P.binNy);
    let bz0 = binCoord(v.z - c - 0.01, P.binZ, P.binNz); let bz1 = binCoord(v.z + c + 0.01, P.binZ, P.binNz);
    for (var bz = bz0; bz <= bz1; bz++) {
        for (var by = by0; by <= by1; by++) {
            for (var bx = bx0; bx <= bx1; bx++) {
                let b = binIndex(bx, by, bz);
                for (var k = binStart[b]; k < binStart[b + 1u]; k++) {
                    let p = points[k];
                    let dx0 = v.x - p.x;
                    if (dx0 > c || dx0 < -c) { continue; }
                    let dy0 = v.y - p.y;
                    if (dy0 > c || dy0 < -c) { continue; }
                    let dz0 = v.z - p.z;
                    if (dz0 > c || dz0 < -c) { continue; }
                    // Spelt exactly as in SMOOTH_WGSL, so that both compile to the same arithmetic.
                    let xx = dx0 * dx0;
                    let yy = dy0 * dy0;
                    let zz = dz0 * dz0;
                    let sumsq = xx + yy + zz;
                    if (sumsq >= 22.0) { continue; }
                    let frac = 1.0 - smoothstep_mb(0.3, 2.8, sumsq);
                    if (frac > 0.005 && slot < end) {
                        influencePoints[slot] = pointIds[k];
                        influenceWeights[slot] = frac;
                        slot++;
                    }
                }
            }
        }
    }
}
`;

/**
 * Totals the CPU needs to size the next buffers: the vertices this slab owns, its triangles, or
 * its influences. One thread.
 *
 * totals[0] = vertices owned by the slab: the offset of the first point of the first plane it
 *             does not own, or the grand total when it owns every counted plane.
 * totals[1] = triangles.  totals[2] = influences.
 */
export const TOTALS_WGSL = COMMON + /* wgsl */ `
@group(1) @binding(0) var<storage, read> vertexCount: array<u32>;
@group(1) @binding(1) var<storage, read> vertexOffset: array<u32>;
@group(1) @binding(2) var<storage, read> triangleCount: array<u32>;
@group(1) @binding(3) var<storage, read> triangleOffset: array<u32>;
@group(1) @binding(4) var<storage, read> influenceCount: array<u32>;
@group(1) @binding(5) var<storage, read> influenceOffset: array<u32>;
@group(1) @binding(6) var<storage, read_write> totals: array<u32>;
@compute @workgroup_size(1)
fn vertices_and_triangles() {
    let plane = planeSize();
    let counted = P.countPlanes * plane;
    let owned = P.ownedPlanes * plane;
    if (owned < counted) {
        totals[0] = vertexOffset[owned];
    } else {
        totals[0] = vertexOffset[counted - 1u] + vertexCount[counted - 1u];
    }
    let cells = P.cellPlanes * (P.nx - 1u) * (P.ny - 1u);
    if (cells > 0u) {
        totals[1] = triangleOffset[cells - 1u] + triangleCount[cells - 1u];
    } else {
        totals[1] = 0u;
    }
}
@compute @workgroup_size(1)
fn influences() {
    if (P.vertexCount > 0u) {
        totals[2] = influenceOffset[P.vertexCount - 1u] + influenceCount[P.vertexCount - 1u];
    } else {
        totals[2] = 0u;
    }
}
`;
