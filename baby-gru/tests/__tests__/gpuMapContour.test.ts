/**
 * The CPU side of contouring maps on the GPU: the box of grid points around the centre, which has
 * to be Coot's (CIsoSurface::GenerateTriangles_from_Xmap) for the two contours to agree.
 */
import { describe, expect, it } from "@jest/globals";
import { cellLengths, contourBox, formatBytes, inverse3, largestRadiusWithin, rint, roomFor } from "../../src/WebGPUComponents/mapContour/mapContourBox";
import type { MapUnitCellGrid } from "../../src/WebGPUComponents/mapContour/mapContourBox";

/** clipper's orthogonalising matrix for a cell: a along x, b in the xy plane. */
const orthFor = (a: number, b: number, c: number, alphaDeg: number, betaDeg: number, gammaDeg: number): number[] => {
    const [al, be, ga] = [alphaDeg, betaDeg, gammaDeg].map(d => d * Math.PI / 180);
    const v = Math.sqrt(1 - Math.cos(al) ** 2 - Math.cos(be) ** 2 - Math.cos(ga) ** 2 + 2 * Math.cos(al) * Math.cos(be) * Math.cos(ga));
    return [
        a, b * Math.cos(ga), c * Math.cos(be),
        0, b * Math.sin(ga), c * (Math.cos(al) - Math.cos(be) * Math.cos(ga)) / Math.sin(ga),
        0, 0, c * v / Math.sin(ga),
    ];
};
const gridFor = (n: [number, number, number], orth: number[]): MapUnitCellGrid =>
    ({ nu: n[0], nv: n[1], nw: n[2], orth, isEM: false, data: new Float32Array(0) });

describe("contourBox", () => {
    it("rounds as clipper does, halves to even", () => {
        expect([0.5, 1.5, 2.5, -0.5, -1.5, -2.5, 2.4, 2.6].map(rint)).toEqual([0, 2, 2, -0, -2, -2, 2, 3]);
    });

    it("inverts the orthogonalising matrix", () => {
        const m = orthFor(52.1, 61.3, 70.7, 90, 103.2, 90);
        const r = inverse3(m);
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
            const e = r[3 * i] * m[j] + r[3 * i + 1] * m[3 + j] + r[3 * i + 2] * m[6 + j];
            expect(e).toBeCloseTo(i === j ? 1 : 0, 12);
        }
        expect(cellLengths(m).map(x => +x.toFixed(9))).toEqual([52.1, 61.3, 70.7]);
    });

    it("takes the centre plus and minus radius / (a, b, c) in fractional coordinates, rounded to the grid", () => {
        const grid = gridFor([100, 120, 140], orthFor(50, 60, 70, 90, 90, 90));
        const box = contourBox(grid, [10, 20, 30], 5);
        // u: 100 * (10 - 5) / 50 = 10 .. 100 * 15 / 50 = 30
        expect(box).toEqual({ min: [10, 30, 50], size: [21, 21, 21] });
        // Outside the cell: the box just runs on (the GPU wraps the indices).
        expect(contourBox(grid, [-10, 70, 0], 5).min).toEqual([-30, 130, -10]);
    });

    it("uses the fractional centre in a non-orthogonal cell", () => {
        const orth = orthFor(40, 50, 60, 90, 110, 90);
        const grid = gridFor([80, 100, 120], orth);
        const centre = [5, 10, 15];
        const box = contourBox(grid, centre, 6);
        const frac = (() => { const r = inverse3(orth); return [0, 1, 2].map(i => r[3 * i] * centre[0] + r[3 * i + 1] * centre[1] + r[3 * i + 2] * centre[2]); })();
        const n = [80, 100, 120], len = [40, 50, 60];
        expect(box.min).toEqual([0, 1, 2].map(a => rint(n[a] * (frac[a] - 6 / len[a]))));
        expect(box.size).toEqual([0, 1, 2].map(a => rint(n[a] * (frac[a] + 6 / len[a])) - rint(n[a] * (frac[a] - 6 / len[a])) + 1));
    });

    it("has nothing to contour for no radius", () => {
        expect(contourBox(gridFor([10, 10, 10], orthFor(10, 10, 10, 90, 90, 90)), [0, 0, 0], 0)).toBeNull();
    });

    it("stops an EM map's box a cell past each face of the map", () => {
        const em = { ...gridFor([100, 120, 140], orthFor(50, 60, 70, 90, 90, 90)), isEM: true };
        // A radius far larger than the map: the box would be thousands of points a side.
        expect(contourBox(em, [25, 30, 35], 1000)).toEqual({ min: [-1, -1, -1], size: [103, 123, 143] });
        // Inside the map, unchanged.
        expect(contourBox(em, [10, 20, 30], 5)).toEqual({ min: [10, 30, 50], size: [21, 21, 21] });
        // Across one face: cut there only.
        expect(contourBox(em, [1, 30, 35], 5)).toEqual({ min: [-1, 50, 60], size: [14, 21, 21] });
        // Wholly outside the map: nothing to contour.
        expect(contourBox(em, [200, 30, 35], 5)).toBeNull();
        // A crystallographic map's box is not cut: it wraps round the cell.
        expect(contourBox(gridFor([100, 120, 140], orthFor(50, 60, 70, 90, 90, 90)), [25, 30, 35], 1000).size[0]).toBe(4001);
    });
});

describe("roomFor", () => {
    it("makes room with slack, but never more than a buffer holds, and refuses what cannot fit", () => {
        expect(roomFor(100, 4, 1000, 1.25)).toBe(125);
        expect(roomFor(240, 4, 1000, 1.25)).toBe(250);
        expect(roomFor(250, 4, 1000, 1.25)).toBe(250);
        expect(roomFor(251, 4, 1000, 1.25)).toBeNull();
        // The bug's box: 1.05G points, with slack a 5.27 GB field buffer, over a 4 GB limit. Without
        // the slack it fits; a little more and it does not.
        expect(roomFor(1_054_977_832, 4, 4294967292, 1.25)).toBe(1_073_741_823);
        expect(roomFor(1_100_000_000, 4, 4294967292, 1.25)).toBeNull();
    });
});

describe("largestRadiusWithin", () => {
    const grid = gridFor([100, 120, 140], orthFor(50, 60, 70, 90, 90, 90));
    const points = (r: number) => {
        const box = contourBox(grid, [10, 20, 30], r);
        return box ? box.size[0] * box.size[1] * box.size[2] : 0;
    };

    it("keeps a radius whose box fits", () => {
        expect(largestRadiusWithin(grid, [10, 20, 30], 5, 21 ** 3)).toBe(5);
    });

    it("finds the largest radius whose box fits, and no larger", () => {
        const r = largestRadiusWithin(grid, [10, 20, 30], 100, 1e6);
        expect(r).toBeLessThan(100);
        expect(points(r)).toBeLessThanOrEqual(1e6);
        expect(points(r + 0.01)).toBeGreaterThan(1e6);
    });

    it("gives an EM map at a huge radius the whole map when the map fits", () => {
        const em = { ...grid, isEM: true };
        expect(largestRadiusWithin(em, [25, 30, 35], 1000, 103 * 123 * 143)).toBe(1000);
    });
});

describe("formatBytes", () => {
    it("keeps a decimal place for small sizes, so a limit and what passes it never read the same", () => {
        expect([1_451_520, 1_000_000, 5_000_000, 35_000_000, 5_274_889_160].map(formatBytes))
            .toEqual(["1.5 MB", "1 MB", "5 MB", "35 MB", "5.3 GB"]);
    });
});
