/**
 * Which representation a map's 2D slice is drawn for (MoorhenMap.drawMapSlice, map-display.md): the one drawn as a
 * slice, whichever it is (one per map for now), not the map's first. A slice chosen on another chip used to read the
 * first representation, find it was not a slice, and draw nothing.
 */
import { describe, expect, it } from "@jest/globals";
import { createMoorhenStore } from "../../src/store/MoorhenReduxStore";
import { addMap } from "../../src/store/mapsSlice";
import { addMapRepresentation, selectMapRepresentation } from "../../src/store/mapRepresentationsSlice";
import { MoorhenMap } from "../../src/utils/MoorhenMap";
import type { MapRepresentationData } from "../../src/utils/Representation/mapRepresentationData";

const record = (id: string, changes: Partial<MapRepresentationData> = {}): MapRepresentationData => ({
    id,
    mapUid: "map-1",
    visible: true,
    contourLevel: 0.3,
    radius: { local: 12, full: 12 },
    style: "solid",
    alpha: { lines: 1, "lit-lines": 1, solid: 1, slice: 1 },
    colour: null,
    positiveColour: null,
    negativeColour: null,
    colourByMap: null,
    originLock: null,
    slice: null,
    viewDependentTransparency: false,
    ...changes,
});

const mapWith = (...records: MapRepresentationData[]) => {
    const store = createMoorhenStore();
    const map = Object.assign(Object.create(MoorhenMap.prototype), {
        molNo: 1,
        uniqueId: "map-1",
        store,
        isDifference: false,
        suggestedRadius: 12,
        dataRevision: 0,
        sliceDrawCount: 0,
        sliceDrawnKey: null,
        displayObjects: { Slice: [] },
        defaultMapColour: { r: 0.3, g: 0.3, b: 0.7 },
        defaultPositiveMapColour: { r: 0.4, g: 0.8, b: 0.4 },
        defaultNegativeMapColour: { r: 0.8, g: 0.4, b: 0.4 },
        // The grid never comes: what is checked is where the slice goes before it is asked for
        getSliceSampler: async () => null,
    });
    store.dispatch(addMap(map));
    records.forEach(item => store.dispatch(addMapRepresentation(item)));
    return { map, store };
};

describe("a map's 2D slice", () => {
    it("belongs to the representation drawn as a slice, not to the map's first", async () => {
        const { map, store } = mapWith(record("surface"), record("slice", { style: "slice" }));
        expect(map.sliceRepresentation?.id).toBe("slice");
        await map.drawMapSlice();
        // Placed at the view, on the slice representation
        expect(selectMapRepresentation(store.getState(), "slice").slice).not.toBeNull();
        expect(selectMapRepresentation(store.getState(), "surface").slice).toBeNull();
    });

    it("is nobody's when no representation is a slice", async () => {
        const { map, store } = mapWith(record("surface"));
        expect(map.sliceRepresentation).toBeUndefined();
        await map.drawMapSlice();
        expect(selectMapRepresentation(store.getState(), "surface").slice).toBeNull();
    });
});
