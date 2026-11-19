/**
 * Sampling a map's unit-cell grid anywhere (src/utils/mapSlice/mapGridSampler.ts), and contouring
 * a slice of a grid shaped like an orbital: the case the slice contours are for.
 */
import { describe, expect, it } from "@jest/globals";
import { makeMapGridSampler } from "../../src/utils/mapSlice/mapGridSampler";
import { contourSlice } from "../../src/utils/mapSlice/sliceContour";
import type { MapUnitCellGrid } from "../../src/WebGPUComponents/mapContour/mapContourBox";

/** A cubic cell `side` A across, `n` points a side, with the value at each grid point from `f`. */
const cubicGrid = (side: number, n: number, f: (x: number, y: number, z: number) => number, isEM = false): MapUnitCellGrid => {
    const data = new Float32Array(n * n * n);
    const h = side / n;
    for (let w = 0; w < n; w++)
        for (let v = 0; v < n; v++)
            for (let u = 0; u < n; u++) data[(w * n + v) * n + u] = f(u * h, v * h, w * h);
    return { nu: n, nv: n, nw: n, orth: [side, 0, 0, 0, side, 0, 0, 0, side], isEM, data };
};

describe("the map grid sampler", () => {
    it("keeps the grid's values at its points, and reproduces a quadratic between them", () => {
        // Catmull-Rom reproduces quadratics exactly; stay clear of the cell edge, where the field
        // below is not periodic.
        const f = (x: number, y: number, z: number) => 0.3 * x * x - 0.2 * y * z + 0.5 * z + 1;
        const sampler = makeMapGridSampler(cubicGrid(10, 20, f));
        expect(sampler.spacing).toBeCloseTo(0.5, 10);
        // The largest value at a grid point (x = 9.5, y = 0, z = 9.5).
        expect(sampler.maxAbs).toBeCloseTo(f(9.5, 0, 9.5), 4);
        expect(sampler.value(2.5, 3, 4.5)).toBeCloseTo(f(2.5, 3, 4.5), 4);
        expect(sampler.value(3.1, 4.37, 5.03)).toBeCloseTo(f(3.1, 4.37, 5.03), 4);
    });

    it("wraps round a crystal's cell, and stops at an EM box's edge", () => {
        const f = (x: number) => Math.sin((2 * Math.PI * x) / 10);
        const periodic = makeMapGridSampler(cubicGrid(10, 40, f));
        expect(periodic.value(12.3, 1, 1)).toBeCloseTo(periodic.value(2.3, 1, 1), 6);
        expect(periodic.value(-0.7, 1, 1)).toBeCloseTo(periodic.value(9.3, 1, 1), 6);
        const box = makeMapGridSampler(cubicGrid(10, 40, x => x, true));
        // The last grid point is at 9.75; beyond the box the edge value carries on.
        expect(box.value(14, 1, 1)).toBeCloseTo(9.75, 4);
    });

    it("lets a slice of an orbital-like grid be contoured finely and quickly", () => {
        // An antibonding pair of 1s-like functions on a 0.2 A grid, contoured at levels doubling
        // towards the nuclei, where the highest are loops smaller than the grid spacing.
        const [cx, cy, cz] = [6, 6, 6];
        const lobe = (x: number, y: number, z: number, ax: number) => Math.exp(-3 * Math.hypot(x - ax, y - cy, z - cz));
        const psi = (x: number, y: number, z: number) => lobe(x, y, z, cx - 0.7) - lobe(x, y, z, cx + 0.7);
        const sampler = makeMapGridSampler(cubicGrid(12, 60, psi));
        const field = (s: number, t: number) => sampler.value(cx + s, cy + t, cz);

        const magnitudes = [0.01, 0.02, 0.04, 0.08, 0.16, 0.32, 0.64];
        const levels = [...magnitudes, ...magnitudes.map(m => -m)];
        const started = performance.now();
        const { segments, samples, cells } = contourSlice(field, { halfSize: 5, baseSpacing: sampler.spacing, levels });
        const took = performance.now() - started;
        console.log(`orbital slice: ${samples} samples, ${cells} cells, ${segments.reduce((n, s) => n + s.length / 4, 0)} segments, ${took.toFixed(1)} ms`);

        levels.forEach((level, l) => {
            expect(segments[l].length).toBeGreaterThan(20);
            for (let k = 0; k < segments[l].length; k += 2) {
                const [s, t] = [segments[l][k], segments[l][k + 1]];
                // On the interpolated field's contour to within the tolerance: the value is off
                // by no more than the gradient times 0.01 A (and a little for the test's own
                // finite difference).
                const e = 1e-4;
                const gradient = Math.hypot(field(s + e, t) - field(s - e, t), field(s, t + e) - field(s, t - e)) / (2 * e);
                expect(Math.abs(field(s, t) - level)).toBeLessThan(0.012 * gradient + 1e-6);
            }
        });
        expect(took).toBeLessThan(2000);
    });
});
