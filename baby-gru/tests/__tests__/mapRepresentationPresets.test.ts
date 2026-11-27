/**
 * Presets of map representations (src/utils/Representation/mapRepresentationPresets.ts), the map wizard: the records
 * each makes from one of a map's records, at multiples of the map's load level (defaultContourLevel), whatever level
 * that record was moved to since.
 */
import { MAP_REPRESENTATION_PRESETS, presetRecords } from "../../src/utils/Representation/mapRepresentationPresets";
import { type MapRepresentationData, defaultContourLevel } from "../../src/utils/Representation/mapRepresentationData";

const base: MapRepresentationData = {
    id: "base",
    mapUid: "map-1",
    visible: false,
    // Moved since the map was loaded: the presets go by the load level (UNIT), not this
    contourLevel: 0.9,
    radius: { local: 18, full: 90 },
    style: "lit-lines",
    alpha: { lines: 1, "lit-lines": 0.8, solid: 1, slice: 1 },
    colour: { r: 0.3, g: 0.3, b: 0.7 },
    positiveColour: { r: 0.2, g: 0.6, b: 0.2 },
    negativeColour: { r: 0.6, g: 0.2, b: 0.2 },
    colourByMap: null,
    originLock: { centre: [1, 2, 3] },
    slice: null,
    viewDependentTransparency: false,
    hiddenWithMap: true,
};

/** The map's load level */
const UNIT = 0.3;

const preset = (id: string) => MAP_REPRESENTATION_PRESETS.find(item => item.id === id);
const summary = (records: MapRepresentationData[]) => records.map(record => [record.style, Number(record.contourLevel.toFixed(4)), record.alpha[record.style]]);

describe("map representation presets", () => {
    test("mesh + surface: a mesh at the load level, a transparent surface at 3 times it, shown, keeping radius and draw mode", () => {
        const records = presetRecords(preset("mesh-and-surface"), base, { isDifference: false }, UNIT);
        expect(summary(records)).toEqual([
            ["lines", 0.3, 1],
            ["solid", 0.9, 0.75],
        ]);
        // The surface denser at its edges, the mesh not
        expect(records.map(record => record.viewDependentTransparency)).toEqual([false, true]);
        records.forEach(record => {
            expect(record).toMatchObject({ mapUid: "map-1", visible: true, radius: base.radius, originLock: base.originLock, colour: base.colour });
            expect(record.hiddenWithMap).toBeUndefined();
        });
        expect(new Set(records.map(record => record.id)).size).toBe(2);
    });

    test("cascade: three transparent surfaces at 1, 2 and 4 times the load level, blue, yellow and red, denser at their edges", () => {
        const records = presetRecords(preset("cascade"), base, { isDifference: false }, UNIT);
        expect(summary(records)).toEqual([
            ["solid", 0.3, 0.75],
            ["solid", 0.6, 0.75],
            ["solid", 1.2, 0.75],
        ]);
        expect(records.every(record => record.viewDependentTransparency)).toBe(true);
        expect(records.map(record => record.colour)).toEqual([
            { r: 0.2, g: 0.4, b: 1 },
            { r: 1, g: 0.85, b: 0.1 },
            { r: 0.9, g: 0.15, b: 0.1 },
        ]);
    });

    test("a difference map keeps its own colours", () => {
        const records = presetRecords(preset("cascade"), base, { isDifference: true }, UNIT);
        records.forEach(record => {
            expect(record.colour).toEqual(base.colour);
            expect(record.positiveColour).toEqual(base.positiveColour);
            expect(record.negativeColour).toEqual(base.negativeColour);
        });
    });

    test("envelope: half and 1.5 times the load level (an EM map's level, rms or not)", () => {
        const records = presetRecords(preset("envelope"), base, { isDifference: false }, UNIT);
        expect(summary(records)).toEqual([
            ["solid", 0.15, 0.75],
            ["lit-lines", 0.45, 1],
        ]);
    });
});

describe("a map's load level, the wizard's unit", () => {
    const map = (changes: object) => ({ isCube: false, isEM: false, isDifference: false, mapRmsd: 0.2, suggestedContourLevel: 0.05, ...changes });
    test("X-ray: 1 rms, 3 for a difference map", () => {
        expect(defaultContourLevel(map({}))).toBeCloseTo(0.2, 10);
        expect(defaultContourLevel(map({ isDifference: true }))).toBeCloseTo(0.6, 10);
    });
    test("EM: the suggested level (its histogram's), 5 rms for a difference map", () => {
        expect(defaultContourLevel(map({ isEM: true }))).toBe(0.05);
        expect(defaultContourLevel(map({ isEM: true, isDifference: true }))).toBeCloseTo(1, 10);
    });
    test("a cube: the level the file gives, signed or not", () => {
        expect(defaultContourLevel(map({ isCube: true, isDifference: true }))).toBe(0.05);
    });
});
