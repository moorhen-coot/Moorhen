/**
 * Presets of map representations (src/utils/Representation/mapRepresentationPresets.ts): the records each makes from
 * one of a map's records.
 */
import { MAP_REPRESENTATION_PRESETS, presetRecords } from "../../src/utils/Representation/mapRepresentationPresets";
import type { MapRepresentationData } from "../../src/utils/Representation/mapRepresentationData";

const base: MapRepresentationData = {
    id: "base",
    mapUid: "map-1",
    visible: false,
    contourLevel: 0.3,
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

const preset = (id: string) => MAP_REPRESENTATION_PRESETS.find(item => item.id === id);
const summary = (records: MapRepresentationData[]) => records.map(record => [record.style, Number(record.contourLevel.toFixed(4)), record.alpha[record.style]]);

describe("map representation presets", () => {
    test("mesh + surface: a mesh at 1σ, a half-transparent surface at 2.5σ, shown, keeping radius and draw mode", () => {
        const records = presetRecords(preset("mesh-and-surface"), base, { mapRmsd: 0.2, isDifference: false });
        expect(summary(records)).toEqual([
            ["lines", 0.2, 1],
            ["solid", 0.5, 0.5],
        ]);
        records.forEach(record => {
            expect(record).toMatchObject({ mapUid: "map-1", visible: true, radius: base.radius, originLock: base.originLock, colour: base.colour });
            expect(record.hiddenWithMap).toBeUndefined();
        });
        expect(new Set(records.map(record => record.id)).size).toBe(2);
    });

    test("cascade: three half-transparent surfaces at 1, 2 and 3σ, blue, yellow and red", () => {
        const records = presetRecords(preset("cascade"), base, { mapRmsd: 0.2, isDifference: false });
        expect(summary(records)).toEqual([
            ["solid", 0.2, 0.5],
            ["solid", 0.4, 0.5],
            ["solid", 0.6, 0.5],
        ]);
        expect(records.map(record => record.colour)).toEqual([
            { r: 0.2, g: 0.4, b: 1 },
            { r: 1, g: 0.85, b: 0.1 },
            { r: 0.9, g: 0.15, b: 0.1 },
        ]);
    });

    test("a difference map keeps its own colours", () => {
        const records = presetRecords(preset("cascade"), base, { mapRmsd: 0.2, isDifference: true });
        records.forEach(record => {
            expect(record.colour).toEqual(base.colour);
            expect(record.positiveColour).toEqual(base.positiveColour);
            expect(record.negativeColour).toEqual(base.negativeColour);
        });
    });

    test("a map without an rms counts its current level as 1σ", () => {
        const records = presetRecords(preset("envelope"), base, { mapRmsd: null, isDifference: false });
        expect(summary(records)).toEqual([
            ["solid", 0.15, 0.25],
            ["lit-lines", 0.45, 1],
        ]);
    });
});
