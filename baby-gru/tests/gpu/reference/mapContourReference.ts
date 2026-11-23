/**
 * A CPU reference for GPU map contours: a synthetic periodic map, and marching cubes over Coot's
 * box with Coot's rules (CIsoSurface::GenerateTriangles_from_Xmap), written plainly in double
 * precision so it can be trusted by reading it.
 */
import { MC_TRIANGLE_TABLE } from "../../../src/WebGPUComponents/metaballs/mcTable";
import { contourBox, inverse3 } from "../../../src/WebGPUComponents/mapContour/mapContourBox";
import type { MapUnitCellGrid } from "../../../src/WebGPUComponents/mapContour/mapContourBox";

/** clipper's orthogonalising matrix for a monoclinic cell (beta in radians), by rows. */
export const monoclinicOrth = (a: number, b: number, c: number, beta: number): number[] =>
    [a, 0, c * Math.cos(beta), 0, b, 0, 0, 0, c * Math.sin(beta)];

/**
 * Gaussian "atoms" at random fractional positions in a monoclinic cell (30 x 36 x 42 A, beta 105
 * degrees) on a 60 x 72 x 84 grid: every value is the sum over each atom's nearest periodic
 * image, so the map is periodic like a real unit cell. `isEM` marks it as an EM map's box.
 */
export function syntheticMap(isEM: boolean): MapUnitCellGrid {
    const n = [60, 72, 84];
    const orth = monoclinicOrth(30, 36, 42, 105 * Math.PI / 180);
    let seed = 11;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const atoms = Array.from({ length: 120 }, () => [random(), random(), random(), 0.5 + random()]);
    const data = new Float32Array(n[0] * n[1] * n[2]);
    for (let w = 0; w < n[2]; w++) for (let v = 0; v < n[1]; v++) for (let u = 0; u < n[0]; u++) {
        let sum = 0;
        for (const [fu, fv, fw, height] of atoms) {
            let du = u / n[0] - fu, dv = v / n[1] - fv, dw = w / n[2] - fw;
            du -= Math.round(du); dv -= Math.round(dv); dw -= Math.round(dw);
            const x = orth[0] * du + orth[1] * dv + orth[2] * dw;
            const y = orth[3] * du + orth[4] * dv + orth[5] * dw;
            const z = orth[6] * du + orth[7] * dv + orth[8] * dw;
            sum += height * Math.exp(-(x * x + y * y + z * z) / 2.5);
        }
        data[(w * n[1] + v) * n[0] + u] = sum - 0.4;
    }
    return { nu: n[0], nv: n[1], nw: n[2], orth, isEM, data };
}

/** MC.h's edges: the point each starts from (x, y, z offsets in the cell) and its axis. */
const EDGES = [[0, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 1, 1, 0], [0, 0, 0, 1], [1, 0, 0, 1],
    [0, 0, 1, 1], [1, 0, 1, 1], [0, 0, 0, 2], [1, 0, 0, 2], [0, 1, 0, 2], [1, 1, 0, 2]];
const nibble = (config: number, i: number) =>
    ((i * 4 < 32 ? MC_TRIANGLE_TABLE[2 * config] : MC_TRIANGLE_TABLE[2 * config + 1]) >>> ((i * 4) & 31)) & 15;

/** The midpoints (orthogonal, A) of the triangles Coot's contour of `grid` would keep. */
export function cpuContourMidpoints(grid: MapUnitCellGrid, centre: number[], radius: number, level: number): number[][] {
    const n = [grid.nu, grid.nv, grid.nw];
    const box = contourBox(grid, centre, radius);
    if (!box) return [];
    const [bx, by, bz] = box.size;
    const wrap = (i: number, m: number) => ((i % m) + m) % m;
    // The map less the level, in float as the GPU stores it.
    const f = (x: number, y: number, z: number) => Math.fround(
        grid.data[(wrap(box.min[2] + z, n[2]) * n[1] + wrap(box.min[1] + y, n[1])) * n[0] + wrap(box.min[0] + x, n[0])] - level);
    const toOrth = (g: number[]) => {
        const q = [g[0] / n[0], g[1] / n[1], g[2] / n[2]];
        return [0, 1, 2].map(i => grid.orth[3 * i] * q[0] + grid.orth[3 * i + 1] * q[1] + grid.orth[3 * i + 2] * q[2]);
    };
    const frac = inverse3(grid.orth);
    const out: number[][] = [];
    for (let z = 0; z < bz - 1; z++) for (let y = 0; y < by - 1; y++) for (let x = 0; x < bx - 1; x++) {
        let config = 0;
        for (let c = 0; c < 8; c++) if (f(x + (c & 1), y + ((c >> 1) & 1), z + ((c >> 2) & 1)) < 0) config |= 1 << c;
        if (config === 0 || config === 255) continue;
        for (let t = 0; t < nibble(config, 0); t++) {
            const corners = [0, 1, 2].map(k => {
                const e = EDGES[nibble(config, 3 * t + k + 1)];
                const p = [x + e[0], y + e[1], z + e[2]];
                const q = [...p];
                q[e[3]]++;
                const va = f(p[0], p[1], p[2]), vb = f(q[0], q[1], q[2]);
                const local = [...p];
                local[e[3]] += va / (va - vb);
                return toOrth([box.min[0] + local[0], box.min[1] + local[1], box.min[2] + local[2]]);
            });
            const middle = [0, 1, 2].map(i => (corners[0][i] + corners[1][i] + corners[2][i]) / 3);
            const d = middle.map((m, i) => m - centre[i]);
            // Coot's rules: the midpoint within the sphere, and for an EM map inside the box.
            if (d[0] * d[0] + d[1] * d[1] + d[2] * d[2] > radius * radius) continue;
            if (grid.isEM) {
                const fr = [0, 1, 2].map(i => frac[3 * i] * middle[0] + frac[3 * i + 1] * middle[1] + frac[3 * i + 2] * middle[2]);
                if (fr.some(v => v < 0 || v > 1)) continue;
            }
            out.push(middle);
        }
    }
    return out;
}

/** How many of `gpu`'s midpoints have no CPU midpoint within `tolerance` A. */
export function unmatchedMidpoints(gpu: number[][], cpu: number[][], tolerance: number): number {
    const key = (p: number[]) => p.map(v => Math.floor(v / tolerance)).join(",");
    const buckets = new Map<string, number[][]>();
    for (const p of cpu) {
        const k = key(p);
        if (!buckets.has(k)) buckets.set(k, []);
        buckets.get(k).push(p);
    }
    let unmatched = 0;
    for (const p of gpu) {
        const base = p.map(v => Math.floor(v / tolerance));
        let found = false;
        for (let dx = -1; dx <= 1 && !found; dx++) for (let dy = -1; dy <= 1 && !found; dy++) for (let dz = -1; dz <= 1 && !found; dz++) {
            for (const q of buckets.get([base[0] + dx, base[1] + dy, base[2] + dz].join(",")) ?? []) {
                if (Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]) <= tolerance) { found = true; break; }
            }
        }
        if (!found) unmatched++;
    }
    return unmatched;
}

/**
 * The normal the GPU should give the vertex at orthogonal `position`: the map's gradient by
 * central differences at both ends of the vertex's grid edge, mixed along the edge, pointing out
 * of the density (into it for a negative level). Null where the edge cannot be told from the
 * position (a vertex on or next to a grid point).
 */
export function expectedNormal(grid: MapUnitCellGrid, position: number[], level: number): number[] | null {
    const n = [grid.nu, grid.nv, grid.nw];
    const frac = inverse3(grid.orth);
    const wrap = (i: number, m: number) => ((i % m) + m) % m;
    const at = (u: number, v: number, w: number) => grid.data[(wrap(w, n[2]) * n[1] + wrap(v, n[1])) * n[0] + wrap(u, n[0])];
    const gradient = (g: number[]) => [0, 1, 2].map(a => {
        const hi = [...g], lo = [...g];
        hi[a]++; lo[a]--;
        return 0.5 * (at(hi[0], hi[1], hi[2]) - at(lo[0], lo[1], lo[2]));
    });
    const g = [0, 1, 2].map(r => (frac[3 * r] * position[0] + frac[3 * r + 1] * position[1] + frac[3 * r + 2] * position[2]) * n[r]);
    const parts = g.map(x => x - Math.floor(x));
    const away = parts.map(x => Math.min(x, 1 - x));
    const axis = away.indexOf(Math.max(...away));
    if (away[axis] < 1e-3 || away.some((x, k) => k !== axis && x > 1e-3)) return null;
    const p = g.map((x, k) => (k === axis ? Math.floor(x) : Math.round(x)));
    const q = [...p];
    q[axis]++;
    const t = parts[axis];
    const ga = gradient(p), gb = gradient(q);
    const gf = [0, 1, 2].map(k => (ga[k] + (gb[k] - ga[k]) * t) * n[k]);
    const go = [0, 1, 2].map(j => gf[0] * frac[j] + gf[1] * frac[3 + j] + gf[2] * frac[6 + j]);
    const length = Math.hypot(...go);
    if (length === 0) return null;
    const sign = level < 0 ? -1 : 1;
    return go.map(x => -x / length * sign);
}
