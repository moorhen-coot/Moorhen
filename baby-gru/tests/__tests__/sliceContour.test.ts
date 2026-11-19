/**
 * Contouring a slice adaptively (src/utils/mapSlice/sliceContour.ts): lines where the field puts
 * them, closed, without cracks where fine cells meet coarse ones, and fine where the contours
 * curl more tightly than the starting cells.
 */
import { describe, expect, it } from "@jest/globals";
import { contourSlice } from "../../src/utils/mapSlice/sliceContour";

/** Each segment end, as a key: in a crack-free set of closed contours each turns up exactly twice. */
const endCounts = (segments: Float32Array) => {
    const counts = new Map<string, number>();
    for (let k = 0; k < segments.length; k += 2) {
        const key = `${segments[k].toFixed(5)},${segments[k + 1].toFixed(5)}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
};

const radii = (segments: Float32Array, cs = 0, ct = 0) => {
    const out: number[] = [];
    for (let k = 0; k < segments.length; k += 2) out.push(Math.hypot(segments[k] - cs, segments[k + 1] - ct));
    return out;
};

describe("slice contours", () => {
    it("are circles of a radial field, closed and without cracks", () => {
        // Off the lattice, so that no contour runs exactly through a sample (where several
        // triangles meet it at one point and the count of ends is no test).
        const [cs, ct] = [0.0123, -0.0371];
        const levels = [1, 4];
        const { segments } = contourSlice((s, t) => (s - cs) ** 2 + (t - ct) ** 2, { halfSize: 3, baseSpacing: 0.5, levels });
        levels.forEach((level, l) => {
            expect(segments[l].length).toBeGreaterThan(40);
            for (const r of radii(segments[l], cs, ct)) expect(Math.abs(r - Math.sqrt(level))).toBeLessThan(0.01);
            for (const count of endCounts(segments[l]).values()) expect(count).toBe(2);
        });
    });

    it("find a loop far smaller than the cells they start from", () => {
        // A sharp peak: at 0.6 of its height its contour is a circle of radius 0.077 A, in cells
        // of 0.5 A.
        const [cs, ct] = [0.123, 0.077];
        const field = (s: number, t: number) => Math.exp(-Math.hypot(s - cs, t - ct) / 0.15);
        const { segments } = contourSlice(field, { halfSize: 2, baseSpacing: 0.5, levels: [0.6] });
        const r = radii(segments[0], cs, ct);
        expect(r.length).toBeGreaterThan(20);
        const expected = -0.15 * Math.log(0.6);
        for (const value of r) expect(Math.abs(value - expected)).toBeLessThan(0.005);
        for (const count of endCounts(segments[0]).values()) expect(count).toBe(2);
    });

    it("follow a cusp's tightly spaced contours, sampling far less than a uniformly fine grid", () => {
        // A 1s orbital's shape, exp(-2r), at levels doubling towards the nucleus.
        const field = (s: number, t: number) => Math.exp(-2 * Math.hypot(s, t));
        const levels = [0.01, 0.02, 0.04, 0.08, 0.16, 0.32, 0.64];
        const { segments, samples } = contourSlice(field, { halfSize: 4, baseSpacing: 0.2, levels });
        levels.forEach((level, l) => {
            const expected = -Math.log(level) / 2;
            const r = radii(segments[l]);
            expect(r.length).toBeGreaterThan(20);
            for (const value of r) expect(Math.abs(value - expected)).toBeLessThan(0.01);
            for (const count of endCounts(segments[l]).values()) expect(count).toBe(2);
        });
        // The finest cells are 0.2 / 32 A across; a grid that fine everywhere would be 1280 x 1280.
        expect(samples).toBeLessThan(0.05 * 1281 * 1281);
    });

    it("cost little where there is nothing to draw", () => {
        const { segments, samples } = contourSlice((s, t) => 0.1 * s + 0.05 * t, { halfSize: 2, baseSpacing: 0.5, levels: [5] });
        expect(segments[0].length).toBe(0);
        // The base cells' corners, centres and midpoints only: 8 x 8 cells.
        expect(samples).toBeLessThanOrEqual(17 * 17);
    });

    it("leave open lines open only at the square's edge", () => {
        // A straight contour across the square: its two ends on the boundary, every other point twice.
        const { segments } = contourSlice((s, t) => s + 0.3 * t, { halfSize: 1, baseSpacing: 0.25, levels: [0.2037] });
        const ends = [...endCounts(segments[0]).entries()].filter(([, count]) => count !== 2);
        expect(ends).toHaveLength(2);
        for (const [key] of ends) {
            const [s, t] = key.split(",").map(Number);
            expect(Math.max(Math.abs(s), Math.abs(t))).toBeCloseTo(1, 4);
        }
    });
});
