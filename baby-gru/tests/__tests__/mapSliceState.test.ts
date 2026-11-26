/**
 * The state of a map's 2D slice: where it is and how it is contoured (its display record's `slice`,
 * map-display.md), whether it has the handles (generalStates.movingMapSlice, a representation id, which takes
 * turns with a 3D object's), and what the handles are on (handleTargetOf).
 */
import { describe, expect, it } from "@jest/globals";
import { createMoorhenStore } from "../../src/store/MoorhenReduxStore";
import { addMap } from "../../src/store/mapsSlice";
import {
    addMapRepresentation,
    selectMapRepresentation,
    setMapRepresentation,
    setMapRepresentationSlice,
} from "../../src/store/mapRepresentationsSlice";
import { setMovingMapSlice, setSelectedThreeDObject } from "../../src/store/generalStatesSlice";
import { handleTargetOf } from "../../src/WebGLgComponents/gizmoDraw";
import { IDENTITY_ORIENTATION } from "../../src/utils/mapSlice/mapSlice";
import type { MapRepresentationData } from "../../src/utils/Representation/mapRepresentationData";
import type { MoorhenMap } from "../../src/utils/MoorhenMap";

const map = { molNo: 3, uniqueId: "map-3" } as unknown as MoorhenMap;

const record = (id: string, changes: Partial<MapRepresentationData> = {}): MapRepresentationData => ({
    id,
    mapUid: "map-3",
    visible: true,
    contourLevel: 1,
    radius: { local: 6, full: 6 },
    style: "lines",
    alpha: { lines: 1, "lit-lines": 1, solid: 1, slice: 1 },
    colour: null,
    positiveColour: null,
    negativeColour: null,
    colourByMap: null,
    originLock: null,
    slice: null,
    ...changes,
});

const storeWith = (...records: MapRepresentationData[]) => {
    const store = createMoorhenStore();
    store.dispatch(addMap(map));
    records.forEach(item => store.dispatch(addMapRepresentation(item)));
    return store;
};

describe("a map slice's state", () => {
    it("is kept by each representation, replaced piece by piece when moved or turned", () => {
        const store = storeWith(record("a"), record("b"));
        store.dispatch(setMapRepresentationSlice({ id: "a", changes: { origin: [1, 2, 3], orientation: IDENTITY_ORIENTATION } }));
        store.dispatch(setMapRepresentationSlice({ id: "b", changes: { origin: [0, 0, 0] } }));
        store.dispatch(setMapRepresentationSlice({ id: "a", changes: { origin: [5, 5, 5] } }));
        expect(selectMapRepresentation(store.getState(), "a").slice).toEqual({
            origin: [5, 5, 5],
            orientation: IDENTITY_ORIENTATION,
            nodalLines: false,
            contourSpacing: "linear",
        });
        expect(selectMapRepresentation(store.getState(), "b").slice.origin).toEqual([0, 0, 0]);
    });

    it("shows nodal lines and spaces its contours as told, keeping where it is", () => {
        const store = storeWith(record("a"));
        store.dispatch(setMapRepresentationSlice({ id: "a", changes: { origin: [1, 2, 3] } }));
        store.dispatch(setMapRepresentationSlice({ id: "a", changes: { nodalLines: true, contourSpacing: "geometric" } }));
        expect(selectMapRepresentation(store.getState(), "a").slice).toMatchObject({ origin: [1, 2, 3], nodalLines: true, contourSpacing: "geometric" });
        store.dispatch(setMapRepresentationSlice({ id: "a", changes: { nodalLines: false } }));
        expect(selectMapRepresentation(store.getState(), "a").slice.nodalLines).toBe(false);
    });

    it("gives the handles to a slice or a 3D object, not both", () => {
        const store = createMoorhenStore();
        store.dispatch(setSelectedThreeDObject("object-1"));
        store.dispatch(setMovingMapSlice("a"));
        expect(store.getState().generalStates.selectedThreeDObjectId).toBeNull();
        store.dispatch(setSelectedThreeDObject("object-2"));
        expect(store.getState().generalStates.movingMapSlice).toBeNull();
        // Putting one's handles away leaves the other's alone.
        store.dispatch(setMovingMapSlice("a"));
        store.dispatch(setSelectedThreeDObject(null));
        expect(store.getState().generalStates.movingMapSlice).toBe("a");
    });

    it("has handles at its centre, as wide as the slice, only while shown as a slice", () => {
        const slice = { origin: [1, 2, 3] as [number, number, number], orientation: IDENTITY_ORIENTATION, nodalLines: false, contourSpacing: "linear" as const };
        const store = storeWith(record("a", { visible: false, slice }));
        store.dispatch(setMovingMapSlice("a"));
        // Not shown, then not as a slice: no handles.
        expect(handleTargetOf(store.getState())).toBeNull();
        store.dispatch(setMapRepresentation({ id: "a", changes: { visible: true } }));
        expect(handleTargetOf(store.getState())).toBeNull();
        store.dispatch(setMapRepresentation({ id: "a", changes: { style: "slice" } }));
        expect(handleTargetOf(store.getState())).toMatchObject({ kind: "mapSlice", representationId: "a", centre: [1, 2, 3], extent: 6, turnable: true });
    });
});
