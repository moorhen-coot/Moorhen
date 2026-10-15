/**
 * The span the clip/fog/blur widget draws its scale across.
 *
 * The behaviour worth protecting here is not the arithmetic, which is a bounding box, but the
 * two judgements built into it: that a map contributes its unit cell and never its contour
 * radius, so the widget does not move underfoot when the radius is changed; and that a scene
 * with nothing measurable in it gets a usable default rather than the 9999 that made the
 * sliders useless and the initial clip distances absurd.
 */
import { describe, expect, it } from "@jest/globals";
import {
    Bounds,
    EMPTY_SCENE_SPAN,
    boundsAround,
    boundsOfPoints,
    mapSpan,
    sceneSpan,
    spanOfBounds,
    spanOfCell,
    unionBounds,
} from "../../src/utils/sceneExtent";

/** A small protein's worth of atoms, give or take. */
const smallMolecule: [number, number, number][] = [
    [0, 0, 0], [30, 0, 0], [0, 30, 0], [0, 0, 30], [30, 30, 30],
];

describe("boundsOfPoints", () => {
    it("is the bounding box", () => {
        expect(boundsOfPoints(smallMolecule)).toEqual({ min: [0, 0, 0], max: [30, 30, 30] });
    });

    it("is null for no points, so an absent molecule contributes nothing", () => {
        expect(boundsOfPoints([])).toBeNull();
    });

    it("ignores non-finite coordinates rather than poisoning the box", () => {
        // Moorhen's own glTF export has produced NaN vertices; one of those reaching here would
        // otherwise make the whole span NaN and every control that reads it useless.
        const withNaN: [number, number, number][] = [...smallMolecule, [NaN, 0, 0], [0, Infinity, 0]];
        expect(boundsOfPoints(withNaN)).toEqual({ min: [0, 0, 0], max: [30, 30, 30] });
    });

    it("gives a single point a box of no size", () => {
        expect(spanOfBounds(boundsOfPoints([[5, 5, 5]]))).toBe(0);
    });
});

describe("unionBounds and spanOfBounds", () => {
    it("covers things that are far apart, not just each of them", () => {
        // Two small molecules at opposite ends of the scene need a span reaching both, which is
        // why positions are combined rather than sizes being compared.
        const near = boundsOfPoints([[0, 0, 0], [10, 10, 10]]);
        const far = boundsOfPoints([[200, 0, 0], [210, 10, 10]]);
        expect(spanOfBounds(unionBounds([near, far]))).toBeCloseTo(Math.hypot(210, 10, 10), 6);
    });

    it("skips nulls", () => {
        const b = boundsOfPoints(smallMolecule);
        expect(unionBounds([null, b, null])).toEqual(b);
    });

    it("is null when everything is null", () => {
        expect(unionBounds([null, null])).toBeNull();
        expect(spanOfBounds(null)).toBe(0);
    });

    it("does not mutate its inputs", () => {
        const a = boundsOfPoints([[0, 0, 0]]);
        const b = boundsOfPoints([[100, 0, 0]]);
        unionBounds([a, b]);
        expect(a).toEqual({ min: [0, 0, 0], max: [0, 0, 0] });
    });
});

describe("boundsAround", () => {
    it("is a box of the given radius, as a 3D object contributes", () => {
        expect(boundsAround([10, 0, 0], 5)).toEqual({ min: [5, -5, -5], max: [15, 5, 5] });
    });

    it("treats a negative radius as nothing rather than inverting the box", () => {
        expect(boundsAround([1, 2, 3], -7)).toEqual({ min: [1, 2, 3], max: [1, 2, 3] });
    });
});

describe("spanOfCell", () => {
    it("is the cell diagonal", () => {
        expect(spanOfCell({ a: 30, b: 40, c: 120 })).toBeCloseTo(130, 6);
    });

    it("is nothing for a map with no cell yet", () => {
        expect(spanOfCell(null)).toBe(0);
        expect(spanOfCell(undefined)).toBe(0);
        expect(spanOfCell({})).toBe(0);
    });
});

describe("sceneSpan", () => {
    it("is the molecule's span when that is all there is", () => {
        const span = sceneSpan({ positioned: [boundsOfPoints(smallMolecule)] });
        expect(span).toBeCloseTo(Math.hypot(30, 30, 30), 6);
    });

    it("uses the default for an empty scene instead of something unusable", () => {
        // The bug: this used to be 9999, so the widget spanned ten thousand angstroms and
        // setClipStart(1.5 * span) produced an initial clip of fifteen thousand.
        expect(sceneSpan({})).toBe(EMPTY_SCENE_SPAN);
        expect(sceneSpan({ positioned: [null], sizes: [] })).toBe(EMPTY_SCENE_SPAN);
    });

    it("takes account of a mesh when no molecule is loaded", () => {
        // The case that prompted this: primitives and imported meshes contributed nothing at all
        // because they have no atoms.
        const mesh = boundsAround([0, 0, 0], 120);
        expect(sceneSpan({ positioned: [mesh] })).toBeCloseTo(Math.hypot(240, 240, 240), 6);
    });

    it("takes account of a map when no molecule is loaded", () => {
        expect(sceneSpan({ sizes: [spanOfCell({ a: 100, b: 100, c: 100 })] }))
            .toBeCloseTo(Math.hypot(100, 100, 100), 6);
    });

    it("does not change when a map's contour radius changes", () => {
        // The requirement that shaped the whole design. Asserted through mapSpan, which is given
        // the radius and must ignore it - comparing two identical calls would prove nothing.
        const cell = { a: 80, b: 90, c: 100 };
        const tight = { cell, suggestedRadius: 13, mapRadius: 13 };
        const wide = { cell, suggestedRadius: 300, mapRadius: 300 };
        expect(mapSpan(tight)).toBe(mapSpan(wide));
        expect(sceneSpan({ sizes: [mapSpan(tight)] })).toBe(sceneSpan({ sizes: [mapSpan(wide)] }));
    });

    it("gives an EM map and a crystallographic map of the same cell the same span", () => {
        // Both contribute their cell. For an EM P1 map the cell is the box the map occupies; for
        // a crystallographic one it stands in for an extent that is formally unbounded.
        expect(mapSpan({ cell: { a: 100, b: 100, c: 100 } }))
            .toBe(mapSpan({ cell: { a: 100, b: 100, c: 100 }, suggestedRadius: 20 }));
    });

    it("contributes nothing for a map whose header has not arrived", () => {
        expect(mapSpan(null)).toBe(0);
        expect(mapSpan({ suggestedRadius: 50 })).toBe(0);
        expect(sceneSpan({ sizes: [mapSpan(undefined)] })).toBe(EMPTY_SCENE_SPAN);
    });

    it("takes the larger of a positioned box and a standalone size", () => {
        const molecule = boundsOfPoints(smallMolecule);          // ~52
        const bigCell = spanOfCell({ a: 200, b: 200, c: 200 });  // ~346
        expect(sceneSpan({ positioned: [molecule], sizes: [bigCell] })).toBeCloseTo(bigCell, 6);
    });

    it("keeps the molecule's span when the map is smaller", () => {
        const molecule = boundsOfPoints([[0, 0, 0], [300, 300, 300]]);
        const smallCell = spanOfCell({ a: 20, b: 20, c: 20 });
        expect(sceneSpan({ positioned: [molecule], sizes: [smallCell] }))
            .toBeCloseTo(spanOfBounds(molecule), 6);
    });

    it("takes the largest of several maps", () => {
        const span = sceneSpan({ sizes: [10, 500, 3] });
        expect(span).toBe(500);
    });

    it("falls back rather than returning zero for degenerate geometry", () => {
        // A single atom, or a mesh with every vertex at the same point. A span of zero would
        // give a widget with no range and initial clip distances of nothing - unusable in the
        // same way, just at the other end.
        expect(sceneSpan({ positioned: [boundsOfPoints([[7, 7, 7]])] })).toBe(EMPTY_SCENE_SPAN);
        expect(sceneSpan({ sizes: [0] })).toBe(EMPTY_SCENE_SPAN);
    });

    it("ignores a non-finite size rather than returning one", () => {
        expect(sceneSpan({ sizes: [NaN, Infinity, 42] })).toBe(42);
        expect(sceneSpan({ sizes: [NaN] })).toBe(EMPTY_SCENE_SPAN);
    });

    it("never returns something a control cannot use", () => {
        const awkward: { positioned?: (Bounds | null)[], sizes?: number[] }[] = [
            {}, { positioned: [] }, { sizes: [] }, { positioned: [null], sizes: [NaN] },
            { positioned: [boundsOfPoints([])] },
        ];
        for (const input of awkward) {
            const span = sceneSpan(input);
            expect(Number.isFinite(span)).toBe(true);
            expect(span).toBeGreaterThan(0);
        }
    });
});
