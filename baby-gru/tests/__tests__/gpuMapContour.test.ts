/**
 * The CPU side of contouring maps on the GPU: the box of grid points around the centre, which has
 * to be Coot's (CIsoSurface::GenerateTriangles_from_Xmap) for the two contours to agree.
 */
import { describe, expect, it } from "@jest/globals";
import { cellLengths, contourBox, inverse3, rint } from "../../src/WebGPUComponents/mapContour/mapContourBox";
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
});
