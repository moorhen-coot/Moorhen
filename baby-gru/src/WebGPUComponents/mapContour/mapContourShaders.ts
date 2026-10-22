/**
 * WGSL for contouring a map on the GPU, the way Coot's CIsoSurface::GenerateTriangles_from_Xmap
 * does it: marching cubes over a box of the map's grid around the centre, keeping the triangles
 * whose midpoint lies within the sphere - and, for an EM map, inside the map's box.
 *
 * The map is held for one whole unit cell, so a box anywhere wraps around it and symmetry is
 * taken care of. Each step is one thread per grid point, cell or vertex; vertices belong to grid
 * edges, as in the MetaBalls kernels (../metaballs), which these follow and share the table with.
 * The last step writes the draw arguments itself, so nothing ever has to come back to the CPU.
 */

/** Threads per workgroup. */
export const MAP_WORKGROUP = 64;

const COMMON = /* wgsl */ `
struct Params {
    // Grid coordinates of the box's first point (xyz).
    boxMin: vec4i,
    // Points along each axis of the box (xyz); w is 1 for an EM map.
    box: vec4u,
    // Grid points along a, b and c of the cell.
    cellGrid: vec4u,
    // Fractional to orthogonal, and back, by rows.
    orth0: vec4f, orth1: vec4f, orth2: vec4f,
    frac0: vec4f, frac1: vec4f, frac2: vec4f,
    // Centre of the sphere (xyz) and its radius squared (w).
    centre: vec4f,
    // x: the contour level; y: 1, or -1 for a negative level, whose surfaces face the other way.
    level: vec4f,
    // x: room for vertices; y: room for triangles.
    caps: vec4u,
};
@group(0) @binding(0) var<uniform> P: Params;

fn itemIndex(lid: vec3u, wid: vec3u, nwg: vec3u) -> u32 {
    return (wid.y * nwg.x + wid.x) * ${MAP_WORKGROUP}u + lid.x;
}
fn boxPoints() -> u32 { return P.box.x * P.box.y * P.box.z; }
fn boxCells() -> u32 { return (P.box.x - 1u) * (P.box.y - 1u) * (P.box.z - 1u); }
fn toOrth(f: vec3f) -> vec3f { return vec3f(dot(P.orth0.xyz, f), dot(P.orth1.xyz, f), dot(P.orth2.xyz, f)); }
fn toFrac(o: vec3f) -> vec3f { return vec3f(dot(P.frac0.xyz, o), dot(P.frac1.xyz, o), dot(P.frac2.xyz, o)); }
`;

const GRID_AT = /* wgsl */ `
fn wrapped(i: i32, n: u32) -> u32 {
    let m = i32(n);
    return u32(((i % m) + m) % m);
}
fn mapAt(g: vec3i) -> f32 {
    let u = wrapped(g.x, P.cellGrid.x);
    let v = wrapped(g.y, P.cellGrid.y);
    let w = wrapped(g.z, P.cellGrid.z);
    return grid[(w * P.cellGrid.y + v) * P.cellGrid.x + u];
}
`;

const FIELD_AT = /* wgsl */ `
fn fieldAt(ix: u32, iy: u32, iz: u32) -> f32 {
    return field[(iz * P.box.y + iy) * P.box.x + ix];
}
fn inside(v: f32) -> bool { return v < 0.0; }
`;

const BOX_POINT = /* wgsl */ `
fn boxPoint(idx: u32) -> vec3u {
    let plane = P.box.x * P.box.y;
    let iz = idx / plane;
    let rem = idx - iz * plane;
    let iy = rem / P.box.x;
    return vec3u(rem - iy * P.box.x, iy, iz);
}
`;

/** MC.h's edges and corner order, as in the MetaBalls kernels. */
const EDGES = /* wgsl */ `
const EDGE_POINTS = array<vec4u, 12>(
    vec4u(0u, 0u, 0u, 0u), vec4u(0u, 1u, 0u, 0u), vec4u(0u, 0u, 1u, 0u), vec4u(0u, 1u, 1u, 0u),
    vec4u(0u, 0u, 0u, 1u), vec4u(1u, 0u, 0u, 1u), vec4u(0u, 0u, 1u, 1u), vec4u(1u, 0u, 1u, 1u),
    vec4u(0u, 0u, 0u, 2u), vec4u(1u, 0u, 0u, 2u), vec4u(0u, 1u, 0u, 2u), vec4u(1u, 1u, 0u, 2u),
);
fn cellConfig(cx: u32, cy: u32, cz: u32) -> u32 {
    var config = 0u;
    for (var c = 0u; c < 8u; c++) {
        if (inside(fieldAt(cx + (c & 1u), cy + ((c >> 1u) & 1u), cz + ((c >> 2u) & 1u)))) { config |= 1u << c; }
    }
    return config;
}
fn tableNibble(config: u32, nibble: u32) -> u32 {
    let bit = nibble * 4u;
    let word = select(table[config].x, table[config].y, bit >= 32u);
    return (word >> (bit & 31u)) & 15u;
}
`;

/** One thread per box point: the map value there, less the contour level. */
export const SAMPLE_WGSL = COMMON + GRID_AT + BOX_POINT + /* wgsl */ `
@group(1) @binding(0) var<storage, read> grid: array<f32>;
@group(1) @binding(1) var<storage, read_write> field: array<f32>;
@compute @workgroup_size(${MAP_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
    let idx = itemIndex(lid, wid, nwg);
    if (idx >= boxPoints()) { return; }
    field[idx] = mapAt(P.boxMin.xyz + vec3i(boxPoint(idx))) - P.level.x;
}
`;

/** One thread per box point: which of its three edges the surface crosses, and how many. */
export const COUNT_VERTICES_WGSL = COMMON + FIELD_AT + BOX_POINT + /* wgsl */ `
@group(1) @binding(0) var<storage, read> field: array<f32>;
@group(1) @binding(1) var<storage, read_write> edgeMask: array<u32>;
@group(1) @binding(2) var<storage, read_write> vertexCount: array<u32>;
@compute @workgroup_size(${MAP_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
    let idx = itemIndex(lid, wid, nwg);
    if (idx >= boxPoints()) { return; }
    let p = boxPoint(idx);
    let v = inside(fieldAt(p.x, p.y, p.z));
    var mask = 0u;
    if (p.x + 1u < P.box.x && inside(fieldAt(p.x + 1u, p.y, p.z)) != v) { mask |= 1u; }
    if (p.y + 1u < P.box.y && inside(fieldAt(p.x, p.y + 1u, p.z)) != v) { mask |= 2u; }
    if (p.z + 1u < P.box.z && inside(fieldAt(p.x, p.y, p.z + 1u)) != v) { mask |= 4u; }
    edgeMask[idx] = mask;
    vertexCount[idx] = countOneBits(mask);
}
`;

/** One thread per cell of the box: how many triangles it makes. */
export const COUNT_TRIANGLES_WGSL = COMMON + FIELD_AT + /* wgsl */ `
@group(1) @binding(0) var<storage, read> field: array<f32>;
@group(1) @binding(1) var<storage, read> table: array<vec2u>;
@group(1) @binding(2) var<storage, read_write> triangleCount: array<u32>;
${EDGES}
@compute @workgroup_size(${MAP_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
    let idx = itemIndex(lid, wid, nwg);
    if (idx >= boxCells()) { return; }
    let cellsX = P.box.x - 1u;
    let cellPlane = cellsX * (P.box.y - 1u);
    let cz = idx / cellPlane;
    let rem = idx - cz * cellPlane;
    let cy = rem / cellsX;
    let config = cellConfig(rem - cy * cellsX, cy, cz);
    triangleCount[idx] = select(tableNibble(config, 0u), 0u, config == 0u || config == 255u);
}
`;

/**
 * One thread per box point: its vertices, in orthogonal coordinates, with normals from the map's
 * gradient (central differences, interpolated along the edge), pointing away from the density.
 */
export const EMIT_VERTICES_WGSL = COMMON + GRID_AT + FIELD_AT + BOX_POINT + /* wgsl */ `
@group(1) @binding(0) var<storage, read> grid: array<f32>;
@group(1) @binding(1) var<storage, read> field: array<f32>;
@group(1) @binding(2) var<storage, read> edgeMask: array<u32>;
@group(1) @binding(3) var<storage, read> vertexOffset: array<u32>;
@group(1) @binding(4) var<storage, read_write> positions: array<f32>;
@group(1) @binding(5) var<storage, read_write> normals: array<f32>;

fn gradientAt(g: vec3i) -> vec3f {
    return 0.5 * vec3f(
        mapAt(g + vec3i(1, 0, 0)) - mapAt(g - vec3i(1, 0, 0)),
        mapAt(g + vec3i(0, 1, 0)) - mapAt(g - vec3i(0, 1, 0)),
        mapAt(g + vec3i(0, 0, 1)) - mapAt(g - vec3i(0, 0, 1)));
}

@compute @workgroup_size(${MAP_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
    let idx = itemIndex(lid, wid, nwg);
    if (idx >= boxPoints()) { return; }
    let mask = edgeMask[idx];
    if (mask == 0u) { return; }
    let p = boxPoint(idx);
    let g = P.boxMin.xyz + vec3i(p);
    let va = fieldAt(p.x, p.y, p.z);
    let gradA = gradientAt(g);
    let n = vec3f(P.cellGrid.xyz);
    var slot = vertexOffset[idx];
    for (var axis = 0u; axis < 3u; axis++) {
        if ((mask & (1u << axis)) == 0u) { continue; }
        var step = vec3u(0u);
        step[axis] = 1u;
        let q = p + step;
        let vb = fieldAt(q.x, q.y, q.z);
        let t = va / (va - vb);
        if (slot < P.caps.x) {
            var local = vec3f(p);
            local[axis] = local[axis] + t;
            let position = toOrth((vec3f(P.boxMin.xyz) + local) / n);
            // d/d(fractional) = n * d/d(grid); the orthogonal gradient is frac^T times that.
            let gf = mix(gradA, gradientAt(g + vec3i(step)), t) * n;
            let go = gf.x * P.frac0.xyz + gf.y * P.frac1.xyz + gf.z * P.frac2.xyz;
            let length2 = dot(go, go);
            let normal = select(vec3f(0.0, 0.0, 1.0), -go * inverseSqrt(length2), length2 > 0.0) * P.level.y;
            positions[3u * slot] = position.x;
            positions[3u * slot + 1u] = position.y;
            positions[3u * slot + 2u] = position.z;
            normals[3u * slot] = normal.x;
            normals[3u * slot + 1u] = normal.y;
            normals[3u * slot + 2u] = normal.z;
        }
        slot++;
    }
}
`;

/**
 * One thread per cell: its triangles. A triangle whose midpoint is outside the sphere - or, for an
 * EM map, outside the map's box - is written as a degenerate one (all corners vertex 0), which
 * draws nothing. The line styles draw the edges of these same triangles (the preview's thick-line
 * shader reads them from this buffer), so there is no separate list of lines.
 */
export const EMIT_TRIANGLES_WGSL = COMMON + FIELD_AT + /* wgsl */ `
@group(1) @binding(0) var<storage, read> field: array<f32>;
@group(1) @binding(1) var<storage, read> table: array<vec2u>;
@group(1) @binding(2) var<storage, read> edgeMask: array<u32>;
@group(1) @binding(3) var<storage, read> vertexOffset: array<u32>;
@group(1) @binding(4) var<storage, read> triangleOffset: array<u32>;
@group(1) @binding(5) var<storage, read> positions: array<f32>;
@group(1) @binding(6) var<storage, read_write> triangles: array<u32>;
${EDGES}
fn positionOf(i: u32) -> vec3f { return vec3f(positions[3u * i], positions[3u * i + 1u], positions[3u * i + 2u]); }

@compute @workgroup_size(${MAP_WORKGROUP})
fn main(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u, @builtin(num_workgroups) nwg: vec3u) {
    let idx = itemIndex(lid, wid, nwg);
    if (idx >= boxCells()) { return; }
    let cellsX = P.box.x - 1u;
    let cellPlane = cellsX * (P.box.y - 1u);
    let cz = idx / cellPlane;
    let rem = idx - cz * cellPlane;
    let cy = rem / cellsX;
    let cx = rem - cy * cellsX;
    let config = cellConfig(cx, cy, cz);
    if (config == 0u || config == 255u) { return; }
    let count = tableNibble(config, 0u);
    let first = triangleOffset[idx];
    for (var t = 0u; t < count; t++) {
        let triangle = first + t;
        if (triangle >= P.caps.y) { return; }
        var corner: array<u32, 3>;
        for (var k = 0u; k < 3u; k++) {
            let e = EDGE_POINTS[tableNibble(config, 3u * t + k + 1u)];
            let point = ((cz + e.z) * P.box.y + (cy + e.y)) * P.box.x + (cx + e.x);
            corner[k] = vertexOffset[point] + countOneBits(edgeMask[point] & ((1u << e.w) - 1u));
        }
        var keep = corner[0] < P.caps.x && corner[1] < P.caps.x && corner[2] < P.caps.x;
        if (keep) {
            let middle = (positionOf(corner[0]) + positionOf(corner[1]) + positionOf(corner[2])) / 3.0;
            let d = middle - P.centre.xyz;
            keep = dot(d, d) <= P.centre.w;
            if (keep && P.box.w != 0u) {
                let f = toFrac(middle);
                keep = all(f >= vec3f(0.0)) && all(f <= vec3f(1.0));
            }
        }
        if (!keep) { corner = array<u32, 3>(0u, 0u, 0u); }
        // The table winds triangles to face the side below the level; Moorhen draws front faces
        // lit and back faces flat, so a positive level's surface is wound the other way round, to
        // face out of the density (as the MetaBalls mesh is). A negative level's faces the other way.
        if (P.level.y > 0.0) {
            let swap = corner[1];
            corner[1] = corner[2];
            corner[2] = swap;
        }
        triangles[3u * triangle] = corner[0];
        triangles[3u * triangle + 1u] = corner[1];
        triangles[3u * triangle + 2u] = corner[2];
    }
}
`;

/**
 * One thread: the totals (for the CPU to check the room was enough, when it gets round to it),
 * and the draw arguments, so the draws need nothing from the CPU. At word 0, drawIndexedIndirect's
 * for the triangles: (index count, instance count, first index, base vertex, first instance). At
 * word 8, drawIndirect's for thick lines: (vertex count, instance count, first vertex, first
 * instance), six vertices - two triangles - for each of each triangle's three edges.
 */
export const TOTALS_WGSL = COMMON + /* wgsl */ `
@group(1) @binding(0) var<storage, read> vertexCount: array<u32>;
@group(1) @binding(1) var<storage, read> vertexOffset: array<u32>;
@group(1) @binding(2) var<storage, read> triangleCount: array<u32>;
@group(1) @binding(3) var<storage, read> triangleOffset: array<u32>;
@group(1) @binding(4) var<storage, read_write> counts: array<u32>;
@group(1) @binding(5) var<storage, read_write> drawArgs: array<u32>;
@compute @workgroup_size(1)
fn main() {
    let points = boxPoints();
    let cells = boxCells();
    let vertices = vertexOffset[points - 1u] + vertexCount[points - 1u];
    let triangles = triangleOffset[cells - 1u] + triangleCount[cells - 1u];
    counts[0] = vertices;
    counts[1] = triangles;
    let drawn = min(triangles, P.caps.y);
    drawArgs[0] = 3u * drawn; drawArgs[1] = 1u; drawArgs[2] = 0u; drawArgs[3] = 0u; drawArgs[4] = 0u;
    drawArgs[8] = 18u * drawn; drawArgs[9] = 1u; drawArgs[10] = 0u; drawArgs[11] = 0u;
}
`;
