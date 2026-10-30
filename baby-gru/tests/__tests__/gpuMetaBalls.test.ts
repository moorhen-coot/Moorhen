/**
 * The CPU-side parts of GPU MetaBalls: the grid, the binning, and both ends of the conversion
 * between Coot's data and Moorhen's.
 *
 * The GPU kernels themselves were checked against metaballs.cc on 1df7 and 4dfr in headless
 * Chrome (SwiftShader WebGPU): same vertices, same triangles in the same order, same influence
 * sets; positions within 3e-4 A, normals within 0.05 degrees. Those comparisons need a WebGPU
 * device, so they are in tests/gpu (metaballs.gpu.spec.ts, against the C++'s output saved in
 * tests/gpu/data). What is here would
 * break them first: a grid one plane different, or a mesh handed over the wrong way round,
 * gives a different surface or an inside-out one.
 */
import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import { MC_TRIANGLE_TABLE } from "../../src/WebGPUComponents/metaballs/mcTable";
import {
    METABALLS_FIELD_CUTOFF, binPoints, boxZSpan, fieldFixedPointBits, metaballRadius, metaballsGrid, pointIndexBoxes, slabDepth,
    slabPointRange,
} from "../../src/WebGPUComponents/metaballs/metaballsGrid";
import { metaballsInputFromSpheres, metaballsMeshData } from "../../src/WebGPUComponents/metaballs/metaballsMeshData";
import type { MetaBallsMesh } from "../../src/WebGPUComponents/metaballs/gpuMetaBalls";

/** 1df7 without waters, radii as DrawMoorhenMetaBalls would give VDW balls of these sizes. */
const points1df7 = (): Float32Array => {
    const sizes: Record<string, number> = { C: 1.7, N: 1.55, O: 1.52, S: 1.8, P: 1.8, H: 1.1 };
    const values: number[] = [];
    for (const line of readFileSync(join(__dirname, "../test_data/1df7.pdb"), "utf8").split("\n")) {
        if (!/^(ATOM|HETATM)/.test(line) || line.slice(17, 20) === "HOH") continue;
        const element = (line.slice(76, 78).trim() || line.slice(12, 14).trim()[0]).toUpperCase();
        values.push(+line.slice(30, 38), +line.slice(38, 46), +line.slice(46, 54), metaballRadius(0.67, sizes[element] ?? 1.7));
    }
    return new Float32Array(values);
};

describe("metaballsGrid", () => {
    it("lays out the grid metaballs.cc does, to the last bit", () => {
        // From GenerateMeshFromPoints on the same points: "orig x range:-10.9552221 ...",
        // ncell 205 243 248.
        const grid = metaballsGrid(points1df7(), 0.2, 1.8);
        expect(grid.n).toEqual([205, 243, 248]);
        expect(grid.min[0]).toBe(Math.fround(-10.9552221));
        expect(grid.min[1]).toBe(Math.fround(-3.11122227));
        expect(grid.min[2]).toBe(Math.fround(-14.8102217));
        expect(grid.cell).toBe(Math.fround(0.2));
    });

    it("has nothing to march with no points", () => {
        expect(metaballsGrid(new Float32Array(0), 0.2, 1.8)).toBeNull();
        // The padding is at least a grid step either side, so even one point has cells.
        expect(metaballsGrid(new Float32Array([0, 0, 0, 0.67]), 100, 1.8).n).toEqual([2, 2, 2]);
    });

    it("works through the grid in slabs that fit the budget", () => {
        const grid = metaballsGrid(points1df7(), 0.2, 1.8);
        const plane = grid.n[0] * grid.n[1];
        const depth = slabDepth(grid, 1_000_000);
        expect((depth + 2) * plane).toBeLessThanOrEqual(1_000_000);
        expect(slabDepth(grid, 1e12)).toBe(grid.n[2]);
        expect(slabDepth(grid, 1)).toBe(8);
    });
});

describe("binPoints", () => {
    it("puts every point in exactly one bin, in original order within it", () => {
        const points = points1df7();
        const grid = metaballsGrid(points, 0.2, 1.8);
        const bins = binPoints(points, grid, 2.6);
        const count = points.length / 4;
        expect(bins.start[bins.start.length - 1]).toBe(count);
        expect(new Set(bins.order).size).toBe(count);
        for (let b = 0; b + 1 < bins.start.length; b++) {
            for (let k = bins.start[b]; k < bins.start[b + 1]; k++) {
                const i = bins.order[k];
                if (k > bins.start[b]) expect(i).toBeGreaterThan(bins.order[k - 1]);
                const coord = [0, 1, 2].map(a => Math.floor((points[4 * i + a] - bins.origin[a]) / bins.size));
                expect((coord[2] * bins.dims[1] + coord[1]) * bins.dims[0] + coord[0]).toBe(b);
            }
        }
    });
});

describe("the marching-cubes table", () => {
    const decode = (config: number) => {
        const lo = MC_TRIANGLE_TABLE[2 * config], hi = MC_TRIANGLE_TABLE[2 * config + 1];
        const nibble = (i: number) => ((i * 4 < 32 ? lo : hi) >>> ((i * 4) & 31)) & 15;
        const triangles = nibble(0);
        return { triangles, edges: Array.from({ length: triangles * 3 }, (_, i) => nibble(i + 1)) };
    };

    it("is MC.h's, split into halves", () => {
        expect(MC_TRIANGLE_TABLE).toHaveLength(512);
        expect(decode(0).triangles).toBe(0);
        expect(decode(255).triangles).toBe(0);
        // One corner inside: the three edges that meet at corner 0.
        expect(decode(1)).toEqual({ triangles: 1, edges: [0, 4, 8] });
        for (let c = 1; c < 255; c++) {
            const { triangles, edges } = decode(c);
            expect(triangles).toBeGreaterThan(0);
            expect(triangles).toBeLessThanOrEqual(5);
            edges.forEach(e => expect(e).toBeLessThan(12));
        }
    });
});

describe("to and from Coot's shapes", () => {
    it("reads the spheres geometry by geometry, with DrawMoorhenMetaBalls' radii", () => {
        const { input, pickPoints } = metaballsInputFromSpheres({
            instance_origins: [[[1, 2, 3, 4, 5, 6], [7, 8, 9]]],
            instance_sizes: [[[1.7, 1.7, 1.7, 1.52, 1.52, 1.52], [1.8, 1.8, 1.8]]],
            col_tri: [[[1, 0, 0, 1, 0, 1, 0, 1], [0, 0, 1, 1]]],
        }, 0.67);
        expect(pickPoints).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9]]);
        expect(input.points[3]).toBe(metaballRadius(0.67, 1.7));
        expect(input.points[11]).toBe(metaballRadius(0.67, 1.8));
        expect(input.points[3]).toBeCloseTo(0.67, 6);
        expect(Array.from(input.colours.slice(8, 12))).toEqual([0, 0, 1, 1]);
    });

    it("hands the mesh over as the worker's PickableMeshPerm does: normals reversed, triangles flipped", () => {
        const mesh = {
            positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
            normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
            colours: new Float32Array(12).fill(0.5),
            indices: new Uint32Array([0, 1, 2]),
            influenceEnds: new Uint32Array([1, 2, 2]),
            influencePoints: new Uint32Array([4, 7]),
            influenceWeights: new Float32Array([0.9, 0.1]),
            grid: null,
            timings: { totalMs: 0, slabs: 1, setupMs: 0 },
        } as MetaBallsMesh;
        const data = metaballsMeshData(mesh, [[1, 2, 3]]);
        expect(data.prim_types).toEqual([["TRIANGLES"]]);
        expect(Array.from(data.idx_tri[0][0])).toEqual([0, 2, 1]);
        expect(Array.from(data.norm_tri[0][0]).slice(0, 3)).toEqual([-0, -0, -1]);
        expect(data.vert_tri[0][0]).toBe(mesh.positions);
        expect(data.pick_info.influence_index_offsets).toBe(mesh.influenceEnds);
        expect(data.pick_info.pick_points).toEqual([[1, 2, 3]]);
    });

    it("passes a mesh the kernels already made pickable through as it is", () => {
        const mesh = {
            positions: new Float32Array(9), normals: new Float32Array([0, 0, -1, 0, 0, -1, 0, 0, -1]),
            colours: new Float32Array(12), indices: new Uint32Array([0, 2, 1]),
            influenceEnds: new Uint32Array(3), influencePoints: new Uint32Array(0), influenceWeights: new Float32Array(0),
            pickable: true, grid: null, timings: { totalMs: 0, slabs: 1, setupMs: 0 },
        } as MetaBallsMesh;
        const data = metaballsMeshData(mesh, []);
        expect(data.idx_tri[0][0]).toBe(mesh.indices);
        expect(data.norm_tri[0][0]).toBe(mesh.normals);
        expect(data.pick_info.influence_index_offsets).toBe(mesh.influenceEnds);
    });
});

describe("the split field", () => {
    const f = Math.fround;
    const points = points1df7();
    const grid = metaballsGrid(points, 0.2, 1.8);
    const bins = binPoints(points, grid, (METABALLS_FIELD_CUTOFF + grid.cell) / 2);
    const boxes = pointIndexBoxes(points, grid, bins.order);
    const count = points.length / 4;
    const box = (k: number, a: number) => [boxes[3 * k + a] & 0xffff, boxes[3 * k + a] >>> 16];
    const coord = (i: number, a: number) => f(grid.min[a] + f(i * grid.cell));
    const smoothstep = (v: number) => { const t = Math.min(1, Math.max(0, f(v / 12))); return f(f(t * t) * f(3 - f(2 * t))); };
    // What fill_field adds for the k-th binned point at a voxel, or null outside its box.
    const term = (k: number, v: number[]) => {
        const i = bins.order[k];
        const d = [0, 1, 2].map(a => f(coord(v[a], a) - points[4 * i + a]));
        const d2 = f(f(f(d[0] * d[0]) + f(d[1] * d[1])) + f(d[2] * d[2]));
        return { d2, value: d2 < 1e-6 ? 0 : f(f(points[4 * i + 3] * points[4 * i + 3]) * f(1 / f(smoothstep(d2) * 30))) };
    };
    const inBox = (k: number, v: number[]) => [0, 1, 2].every(a => v[a] >= box(k, a)[0] && v[a] <= box(k, a)[1]);

    it("finds every point whose box reaches a run of planes", () => {
        expect(boxZSpan(boxes)).toBe(51);
        for (const [z0, z1] of [[0, 10], [100, 120], [grid.n[2] - 5, grid.n[2]]]) {
            const [start, end] = slabPointRange(bins, grid, z0, z1);
            for (let k = 0; k < count; k++) {
                const [lo, hi] = box(k, 2);
                if (lo < z1 && hi >= z0) {
                    expect(k).toBeGreaterThanOrEqual(start);
                    expect(k).toBeLessThan(end);
                }
            }
        }
    });

    it("chooses a fixed-point scale that no voxel's box sum can overflow", () => {
        const bits = fieldFixedPointBits(points, bins, grid.cell);
        expect(bits).toBeGreaterThanOrEqual(20);
        expect(bits).toBeLessThanOrEqual(28);
        // The fullest voxels are inside the protein; sample a line through the middle.
        let most = 0;
        const mid = grid.n.map(n => Math.floor(n / 2));
        for (let x = 0; x < grid.n[0]; x += 2) {
            let sum = 0;
            for (let k = 0; k < count; k++) {
                const r = points[4 * bins.order[k] + 3];
                if (inBox(k, [x, mid[1], mid[2]])) sum += (r * r) / 30;
            }
            most = Math.max(most, sum);
        }
        expect(most).toBeGreaterThan(0);
        expect(most * 2 ** bits).toBeLessThan(2 ** 31);
        // A heap of points in one place is too much for it, and the caller falls back.
        const heap = new Float32Array(4 * 200_000);
        for (let i = 0; i < 200_000; i++) heap[4 * i + 3] = 0.67;
        const heapGrid = metaballsGrid(heap, 0.2, 1.8);
        expect(fieldFixedPointBits(heap, binPoints(heap, heapGrid, 2.6), 0.2)).toBeLessThan(20);
    });

    it("adds up to fill_field's sum: boxes in fixed point, plus the near points' corrections", () => {
        const bits = fieldFixedPointBits(points, bins, grid.cell);
        const q = (k: number) => {
            const r = points[4 * bins.order[k] + 3];
            return Math.round(f(f(f(r * r) * f(1 / 30)) * 2 ** bits));
        };
        let worst = 0, near = 0, far = 0;
        const centre = grid.n.map(n => Math.floor(n / 2));
        for (let dz = -6; dz <= 6; dz += 6) for (let dy = -10; dy <= 10; dy++) for (let dx = -10; dx <= 10; dx++) {
            const v = [centre[0] + dx, centre[1] + dy, centre[2] + dz];
            let plain = f(-1.8);
            let boxSum = 0;
            let correction = 0;
            for (let k = 0; k < count; k++) {
                const { d2, value } = term(k, v);
                if (d2 < 12) {
                    // Near points are always inside their box: the kernel does not check.
                    expect(inBox(k, v)).toBe(true);
                }
                if (!inBox(k, v)) continue;
                plain = f(plain + value);
                boxSum += q(k);
                if (d2 < 12) {
                    near++;
                    correction = f(correction + f(value - f(q(k) / 2 ** bits)));
                } else {
                    far++;
                    expect(value).toBe(f(f(points[4 * bins.order[k] + 3] ** 2) * f(1 / 30)));
                }
            }
            const split = f(f(-1.8 + f(boxSum / 2 ** bits)) + correction);
            worst = Math.max(worst, Math.abs(split - plain) / Math.max(1, Math.abs(plain)));
        }
        expect(near).toBeGreaterThan(0);
        expect(far).toBeGreaterThan(near);
        // float32 rounding of the two sums, not a difference in what is summed.
        expect(worst).toBeLessThan(2e-6);
    });
});
