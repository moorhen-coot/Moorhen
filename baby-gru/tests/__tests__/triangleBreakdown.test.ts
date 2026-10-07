/**
 * The attribution is a model of the draw loop rather than an observation of it, so these tests
 * are mostly about the model matching drawCore: which index buffer an instanced sub-buffer
 * actually draws, which primitive types yield triangles, and which cannot be counted from the
 * buffer at all. A model that quietly disagrees with the renderer would send the optimisation
 * work at the wrong representation, which is the one outcome worth paying tests to avoid.
 */
import { describe, expect, it } from "@jest/globals";
import {
    CountableBuffer,
    triangleBreakdown,
    triangleBreakdownText,
} from "../../src/WebGLgComponents/mgWebGLParts/renderStats";

/** A buffer with one sub-buffer per entry in types/indices. */
const buffer = (
    statsLabel: string | undefined,
    types: string[],
    indices: number[],
    instances?: (number | undefined)[],
    visible = true,
): CountableBuffer => ({
    visible,
    statsLabel,
    bufferTypes: types,
    triangleVertexIndexBuffer: indices.map(numItems => ({ numItems })),
    triangleInstanceOriginBuffer: (instances ?? []).map(numItems =>
        numItems === undefined ? ({} as { numItems?: number }) : { numItems }),
});

describe("triangleBreakdown", () => {
    it("counts indexed triangles as a third of the indices", () => {
        const rows = triangleBreakdown([buffer("ribbons", ["TRIANGLES"], [3000])]);
        expect(rows).toEqual([{ label: "ribbons", triangles: 1000, buffers: 1, unknown: 0 }]);
    });

    it("counts a strip as two fewer triangles than indices", () => {
        const rows = triangleBreakdown([buffer("map", ["TRIANGLE_STRIP"], [1002])]);
        expect(rows[0].triangles).toBe(1000);
    });

    it("gives a degenerate strip no triangles rather than a negative count", () => {
        const rows = triangleBreakdown([buffer("map", ["TRIANGLE_STRIP"], [1])]);
        expect(rows[0].triangles).toBe(0);
    });

    it("multiplies an instanced sub-buffer by its instance count", () => {
        const rows = triangleBreakdown([buffer("CBs", ["TRIANGLES"], [30], [500])]);
        expect(rows[0].triangles).toBe(10 * 500);
    });

    it("draws index buffer zero for every instanced sub-buffer, as drawCore does", () => {
        // The shared primitive lives at index 0; the jth entry is the instance data, not geometry.
        // Counting indices[j] here would be the easy mistake, and would read 30 for sub-buffer 1.
        const rows = triangleBreakdown([
            buffer("CBs", ["TRIANGLES", "TRIANGLES"], [30, 99999], [100, 200]),
        ]);
        expect(rows[0].triangles).toBe(10 * 100 + 10 * 200);
    });

    it("counts a perfect sphere as the impostor quad it really is", () => {
        // Not 1000 spheres' worth of sphere geometry: the whole point of the impostor is that
        // the geometry is a quad and the sphere is shaded into it.
        const rows = triangleBreakdown([buffer("CBs", ["PERFECT_SPHERES"], [4], [1000])]);
        expect(rows[0].triangles).toBe(2 * 1000);
    });

    it("declines to count real sphere geometry rather than guessing", () => {
        const rows = triangleBreakdown([buffer("CBs", ["POINTS_SPHERES"], [60], [300])]);
        expect(rows[0]).toEqual({ label: "CBs", triangles: 0, buffers: 1, unknown: 1 });
    });

    it("gives lines and points no triangles", () => {
        const rows = triangleBreakdown([buffer("x", ["LINES", "LINE_STRIP", "POINTS"], [90, 90, 90])]);
        expect(rows[0].triangles).toBe(0);
        expect(rows[0].unknown).toBe(0);
    });

    it("sums sub-buffers of mixed type within one buffer", () => {
        const rows = triangleBreakdown([
            buffer("mixed", ["TRIANGLES", "LINES", "TRIANGLE_STRIP"], [300, 90, 102]),
        ]);
        expect(rows[0].triangles).toBe(100 + 0 + 100);
    });

    it("groups buffers by label and counts how many there were", () => {
        const rows = triangleBreakdown([
            buffer("ribbons", ["TRIANGLES"], [300]),
            buffer("ribbons", ["TRIANGLES"], [600]),
            buffer("map", ["TRIANGLES"], [30]),
        ]);
        expect(rows).toEqual([
            { label: "ribbons", triangles: 300, buffers: 2, unknown: 0 },
            { label: "map", triangles: 10, buffers: 1, unknown: 0 },
        ]);
    });

    it("sorts heaviest first, which is the only ordering the report is read for", () => {
        const rows = triangleBreakdown([
            buffer("small", ["TRIANGLES"], [30]),
            buffer("huge", ["TRIANGLES"], [3000000]),
            buffer("medium", ["TRIANGLES"], [3000]),
        ]);
        expect(rows.map(row => row.label)).toEqual(["huge", "medium", "small"]);
    });

    it("skips invisible buffers, because they cost nothing", () => {
        const rows = triangleBreakdown([
            buffer("shown", ["TRIANGLES"], [300]),
            buffer("hidden", ["TRIANGLES"], [3000000], undefined, false),
        ]);
        expect(rows).toEqual([{ label: "shown", triangles: 100, buffers: 1, unknown: 0 }]);
    });

    it("gathers unlabelled buffers under one name rather than dropping them", () => {
        // An unattributed row is a prompt to go and label its producer. Dropping it would
        // silently shrink the total and make the cross-check look like over-drawing.
        const rows = triangleBreakdown([buffer(undefined, ["TRIANGLES"], [300])]);
        expect(rows[0].label).toBe("unlabelled");
        expect(rows[0].triangles).toBe(100);
    });

    it("survives a buffer with nothing on it", () => {
        expect(triangleBreakdown([{}])).toEqual([
            { label: "unlabelled", triangles: 0, buffers: 1, unknown: 0 },
        ]);
    });

    it("has nothing to say about no buffers", () => {
        expect(triangleBreakdown([])).toEqual([]);
    });
});

describe("triangleBreakdownText", () => {
    const scene = [
        buffer("ribbons", ["TRIANGLES"], [2400000]),
        buffer("map", ["TRIANGLE_STRIP"], [300002]),
    ];

    it("reports each representation with its share", () => {
        const text = triangleBreakdownText(scene, 1100000);
        expect(text).toMatch(/ribbons .*800,000 .*72\.7%/);
        expect(text).toMatch(/map .*300,000 .*27\.3%/);
        expect(text).toMatch(/TOTAL .*1,100,000/);
    });

    it("says the attribution can be trusted when it matches the measurement", () => {
        expect(triangleBreakdownText(scene, 1100000)).toContain("can be trusted");
    });

    it("tolerates small disagreement rather than crying wolf", () => {
        expect(triangleBreakdownText(scene, 1120000)).toContain("can be trusted");
    });

    it("names over-drawing when more is drawn than exists", () => {
        // Two passes over the same geometry looks exactly like this, and it is a finding in its
        // own right - it would mean halving the geometry saves twice what the rows suggest.
        const text = triangleBreakdownText(scene, 2200000);
        expect(text).toContain("more drawn than exist");
        expect(text).toContain("1,100,000");
    });

    it("names under-drawing when geometry is not reaching the screen", () => {
        const text = triangleBreakdownText(scene, 400000);
        expect(text).toContain("fewer drawn than exist");
    });

    it("admits when there is no measurement to check against", () => {
        const text = triangleBreakdownText(scene, undefined);
        expect(text).toContain("No measured figure");
        expect(text).not.toContain("can be trusted");
    });

    it("flags the sub-buffers it could not count where they are", () => {
        const text = triangleBreakdownText([buffer("CBs", ["POINTS_SPHERES"], [60], [300])], 50000);
        expect(text).toContain("not counted: spheres");
    });

    it("does not divide by zero on an empty scene", () => {
        expect(() => triangleBreakdownText([], 0)).not.toThrow();
        expect(triangleBreakdownText([], undefined)).toContain("TOTAL");
    });
});
