/**
 * A contour slice through a map (src/utils/mapSlice/mapSlice.ts): its levels, where its plane is,
 * and the lines it hands the renderer.
 */
import { describe, expect, it } from "@jest/globals";
import {
    IDENTITY_ORIENTATION,
    SLICE_FRAME_COLOUR,
    SLICE_NODAL_COLOUR,
    contourMapSlice,
    newMapSlice,
    sliceAxes,
    sliceBaseSpacing,
    sliceLevels,
    sliceLinearLevels,
    sliceRange,
    sliceLinesObject,
} from "../../src/utils/mapSlice/mapSlice";
import type { MapGridSampler } from "../../src/utils/mapSlice/mapGridSampler";

describe("a map slice", () => {
    it("starts at the given point, facing down z", () => {
        const slice = newMapSlice([1, 2, 3]);
        expect(slice.origin).toEqual([1, 2, 3]);
        expect(slice.orientation).toEqual(IDENTITY_ORIENTATION);
        expect(sliceAxes(slice.orientation)).toEqual({ u: [1, 0, 0], v: [0, 1, 0], normal: [0, 0, 1] });
    });

    it("has contour levels doubling from the map's up to its largest value, both signs for a difference map", () => {
        // The map's level is the outermost contour; the innermost the last doubling the map reaches.
        expect(sliceLevels(0.05, false, 0.25)).toEqual([0.05, 0.1, 0.2]);
        expect(sliceLevels(-0.05, true, 0.1)).toEqual([0.05, 0.1, -0.05, -0.1]);
        // A low level gives the whole range, to at most twelve each side.
        const many = sliceLevels(0.001, false, 1000);
        expect(many).toHaveLength(12);
        expect(many[11]).toBeCloseTo(0.001 * 2 ** 11, 10);
        // A level above anything in the map still gives its own contour (which draws nothing).
        expect(sliceLevels(0.5, false, 0.1)).toEqual([0.5]);
        expect(sliceLevels(0, true, 1)).toEqual([]);
    });

    it("can have contour levels in equal steps from the map's up to the slice's largest value, one step for both signs", () => {
        // Twelve steps of 0.1 from the level, the innermost a step short of the larger peak...
        const levels = sliceLinearLevels(0.1, true, { maxPositive: 1.3, maxNegative: 0.5 });
        const positive = levels.filter(x => x > 0), negative = levels.filter(x => x < 0);
        expect(positive).toHaveLength(12);
        expect(positive[1]).toBeCloseTo(0.2, 10);
        expect(positive[11]).toBeCloseTo(1.2, 10);
        // ...and the same steps on the weaker side, as far as its peak goes.
        expect(negative.map(x => Math.round(x * 1e6) / 1e6)).toEqual([-0.1, -0.2, -0.3, -0.4]);
        // A sign the slice never reaches beyond the level: only the level, which draws nothing.
        expect(sliceLinearLevels(0.1, true, { maxPositive: 0.05, maxNegative: 1.3 }).filter(x => x > 0)).toEqual([0.1]);
        expect(sliceLinearLevels(0.1, false, { maxPositive: 1.3, maxNegative: 1.3 }).every(x => x > 0)).toBe(true);
        expect(sliceLinearLevels(0, true, { maxPositive: 1, maxNegative: 1 })).toEqual([]);
    });

    it("finds the largest values either side of zero in its own plane", () => {
        // +2 at (1, 0, 0) and -3 at (-1, 0, 0), in a plane through both; +5 off it, at z = 4.
        const blob = (x: number, y: number, z: number, cx: number, cz: number) => Math.exp(-4 * ((x - cx) ** 2 + y * y + (z - cz) ** 2));
        const sampler: MapGridSampler = {
            spacing: 0.05, maxAbs: 5,
            value: (x, y, z) => 2 * blob(x, y, z, 1, 0) - 3 * blob(x, y, z, -1, 0) + 5 * blob(x, y, z, 0, 4),
        };
        const range = sliceRange(sampler, { origin: [0, 0, 0], orientation: [...IDENTITY_ORIENTATION] }, 2);
        expect(range.maxPositive).toBeCloseTo(2, 2);
        expect(range.maxNegative).toBeCloseTo(3, 2);
    });

    it("starts from cells twice the grid spacing, coarser only for a very large slice", () => {
        expect(sliceBaseSpacing(0.2, 6)).toBeCloseTo(0.4, 10);
        expect(sliceBaseSpacing(0.5, 100)).toBeCloseTo(1, 10);
    });

    it("is contoured in its own plane, wherever that has been turned", () => {
        // A quarter turn about x: the square's sides are x and z, its normal -y. The field is
        // distance squared from (5, 0, 5), so the contours are circles about the slice's centre.
        const sampler: MapGridSampler = { spacing: 0.25, maxAbs: 100, value: (x, y, z) => (x - 5) ** 2 + y * y + (z - 5) ** 2 };
        const slice = { origin: [5, 0, 5] as [number, number, number], orientation: [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1] };
        const { segments } = contourMapSlice(sampler, slice, 3, [1.0201]);
        expect(segments[0].length).toBeGreaterThan(20);
        for (let k = 0; k < segments[0].length; k += 2) {
            expect(Math.hypot(segments[0][k], segments[0][k + 1])).toBeCloseTo(1.01, 2);
        }
    });

    it("draws its lines in the scene, in the signs' colours, with a grey frame", () => {
        const slice = { origin: [10, 0, 0] as [number, number, number], orientation: [...IDENTITY_ORIENTATION] };
        const contours = { segments: [new Float32Array([0, 0, 1, 0]), new Float32Array([0, 1, 0, 2])], samples: 0, cells: 0 };
        const red = { r: 1, g: 0, b: 0 }, blue = { r: 0, g: 0, b: 1 };
        const lines = sliceLinesObject(slice, 2, [0.1, -0.1], contours, { positive: blue, negative: red }, 0.8);
        expect(lines.prim_types).toEqual([["LINES"]]);
        const positions = lines.vert_tri[0][0], colours = lines.col_tri[0][0];
        // The frame first: 4 sides, 8 points, the first at the bottom left corner.
        expect(Array.from(positions.slice(0, 3))).toEqual([8, -2, 0]);
        expect(Array.from(colours.slice(0, 4))).toEqual([SLICE_FRAME_COLOUR.r, SLICE_FRAME_COLOUR.g, SLICE_FRAME_COLOUR.b, 0.8].map(x => Math.fround(x)));
        // Then the positive level's segment, (0,0)-(1,0) placed at x 10, in blue...
        expect(Array.from(positions.slice(8 * 3, 10 * 3))).toEqual([10, 0, 0, 11, 0, 0]);
        expect(Array.from(colours.slice(8 * 4, 8 * 4 + 3))).toEqual([0, 0, 1]);
        // ...and the negative one's in red.
        expect(Array.from(colours.slice(10 * 4, 10 * 4 + 3))).toEqual([1, 0, 0]);
        expect(lines.idx_tri[0][0].length).toBe(12);
        expect(Array.from(lines.norm_tri[0][0].slice(0, 3))).toEqual([0, 0, 1]);
    });

    it("draws its nodal line in grey", () => {
        const slice = { origin: [0, 0, 0] as [number, number, number], orientation: [...IDENTITY_ORIENTATION] };
        const contours = { segments: [new Float32Array([0, 0, 1, 0]), new Float32Array([0, 1, 0, 2])], samples: 0, cells: 0 };
        const red = { r: 1, g: 0, b: 0 }, blue = { r: 0, g: 0, b: 1 };
        const lines = sliceLinesObject(slice, 2, [0.1, 0], contours, { positive: blue, negative: red }, 1);
        const colours = lines.col_tri[0][0];
        // After the frame (8 points) and the positive segment (2), the zero level's.
        expect(Array.from(colours.slice(10 * 4, 10 * 4 + 3))).toEqual([SLICE_NODAL_COLOUR.r, SLICE_NODAL_COLOUR.g, SLICE_NODAL_COLOUR.b].map(x => Math.fround(x)));
    });

    it("contours a nodal line between an orbital's lobes, and not through the empty space round them", () => {
        // A p orbital along x: positive one side of the plane x = 0, negative the other, and noise
        // a million times smaller (as rounding leaves in a cube file) changing sign all over.
        const p = (x: number, y: number, z: number) => x * Math.exp(-(x * x + y * y + z * z));
        const noise = (x: number, y: number) => 1e-7 * Math.sin(37 * x + 11) * Math.cos(29 * y - 5);
        const sampler: MapGridSampler = { spacing: 0.1, maxAbs: 0.43, value: (x, y, z) => p(x, y, z) + noise(x, y) };
        const slice = { origin: [0, 0, 0] as [number, number, number], orientation: [...IDENTITY_ORIENTATION] };
        const level = 0.05;
        const { segments, samples } = contourMapSlice(sampler, slice, 6, [level, -level, 0], 0.25 * level);
        const nodal = segments[2];
        expect(nodal.length).toBeGreaterThan(8);
        let reach = 0;
        for (let k = 0; k < nodal.length; k += 2) {
            // On the node, x = 0...
            expect(Math.abs(nodal[k])).toBeLessThan(0.01);
            reach = Math.max(reach, Math.abs(nodal[k + 1]));
        }
        // ...and only where the lobes are: they reach 0.05 out to about y = 1.6, the line a little
        // beyond, nowhere near the square's edge at 6.
        expect(reach).toBeGreaterThan(1.4);
        expect(reach).toBeLessThan(3);
        // Without the limit the noise is contoured everywhere, and costs far more to follow.
        const unlimited = contourMapSlice(sampler, slice, 6, [level, -level, 0]);
        expect(unlimited.segments[2].length).toBeGreaterThan(10 * nodal.length);
        expect(unlimited.samples).toBeGreaterThan(3 * samples);
    });
});
