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
    reachFrom,
    sphereOfPoints,
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
        const headerInfo = { cell: { a: 80, b: 90, c: 100 } };
        const tight = { headerInfo, suggestedRadius: 13, mapRadius: 13 };
        const wide = { headerInfo, suggestedRadius: 300, mapRadius: 300 };
        expect(mapSpan(tight)).toBe(mapSpan(wide));
        expect(sceneSpan({ sizes: [mapSpan(tight)] })).toBe(sceneSpan({ sizes: [mapSpan(wide)] }));
    });

    it("gives an EM map and a crystallographic map of the same cell the same span", () => {
        // Both contribute their cell. For an EM P1 map the cell is the box the map occupies; for
        // a crystallographic one it stands in for an extent that is formally unbounded.
        expect(mapSpan({ headerInfo: { cell: { a: 100, b: 100, c: 100 } } }))
            .toBe(mapSpan({ headerInfo: { cell: { a: 100, b: 100, c: 100 } }, suggestedRadius: 20 }));
    });

    it("contributes nothing for a map whose header has not arrived", () => {
        // A real case, not a defensive one: MoorhenMap.initialise fills headerInfo only for the
        // "mtz" and "mapFile" origins, and one loader catches a header failure and skips
        // initialise altogether. Such a map has headerInfo null for its whole life.
        expect(mapSpan(null)).toBe(0);
        expect(mapSpan({ suggestedRadius: 50 })).toBe(0);
        expect(mapSpan({ headerInfo: null, suggestedRadius: 50 })).toBe(0);
        expect(sceneSpan({ sizes: [mapSpan(undefined)] })).toBe(EMPTY_SCENE_SPAN);
    });

    it("reads the cell from headerInfo, which is the only place a map keeps it", () => {
        // The bug this pins. mapSpan read `map.cell`, and MoorhenMap has no such property - only
        // `headerInfo.cell`, filled by initialise from the MTZ or MRC header. So every map
        // contributed zero and a map-only scene fell back to EMPTY_SCENE_SPAN: the side-on widget
        // scaled itself to fifty angstroms whatever was loaded, and "Clip off" - which sets the
        // planes to 1.5x the scene span - cut a 550 angstrom EM map down to a 150 angstrom slab.
        //
        // Shaped like the real object rather than like the parameter list, because the old tests
        // passed { cell } directly and so agreed with the function while both disagreed with
        // every map that has ever existed.
        const emMap = {
            headerInfo: { spacegroup: "P 1", cell: { a: 560, b: 560, c: 560 }, resolution: 3.2 },
            suggestedRadius: 279,
            mapRadius: 15,
        };
        expect(mapSpan(emMap)).toBeCloseTo(Math.hypot(560, 560, 560), 6);
        expect(mapSpan(emMap)).toBeGreaterThan(547);
        // And what the symptom actually depended on: a scene of nothing but this map.
        expect(sceneSpan({ positioned: [null], sizes: [mapSpan(emMap)] }))
            .toBeGreaterThan(EMPTY_SCENE_SPAN);
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

describe("sphereOfPoints", () => {
    it("is centred on the box and reaches the farthest point, not the box corner", () => {
        // Points on a sphere of radius 10: the box's half diagonal would say 17.3.
        const ball: [number, number, number][] = [[10, 0, 0], [-10, 0, 0], [0, 10, 0], [0, -10, 0], [0, 0, 10], [0, 0, -10]];
        const s = sphereOfPoints(ball, boundsOfPoints(ball));
        expect(s.centre).toEqual([0, 0, 0]);
        expect(s.radius).toBeCloseTo(10, 6);
    });

    it("is null without bounds", () => {
        expect(sphereOfPoints([], null)).toBeNull();
    });
});

describe("reachFrom", () => {
    it("is the radius for a ball about the centre", () => {
        expect(reachFrom([0, 0, 0], [{ centre: [0, 0, 0], radius: 15 }])).toBeCloseTo(15, 6);
    });

    it("adds the distance to a ball the view has moved away from", () => {
        expect(reachFrom([0, 0, 0], [{ centre: [30, 40, 0], radius: 5 }])).toBeCloseTo(55, 6);
    });

    it("takes the farthest of several, and skips nulls", () => {
        expect(reachFrom([0, 0, 0], [null, { centre: [0, 0, 0], radius: 3 }, { centre: [10, 0, 0], radius: 2 }])).toBeCloseTo(12, 6);
    });

    it("is 0 with nothing to measure", () => {
        expect(reachFrom([0, 0, 0], [])).toBe(0);
        expect(reachFrom([0, 0, 0], [{ centre: [NaN, 0, 0], radius: 1 }])).toBe(0);
    });
});
