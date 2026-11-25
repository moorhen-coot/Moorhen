/**
 * The state of a map's 2D slice: where it is (mapContourSettings.mapSlices), whether it has the
 * handles (generalStates.movingMapSlice, which takes turns with a 3D object's), and what the
 * handles are on (handleTargetOf).
 */
import { describe, expect, it } from "@jest/globals";
import { createMoorhenStore } from "../../src/store/MoorhenReduxStore";
import { setMapRadius, setMapSlice, setMapSliceContourSpacing, setMapSliceNodalLines } from "../../src/store/mapContourSettingsSlice";
import { addMap } from "../../src/store/mapsSlice";
import { addMapRepresentation, setMapRepresentation } from "../../src/store/mapRepresentationsSlice";
import { setMovingMapSlice, setSelectedThreeDObject } from "../../src/store/generalStatesSlice";
import { handleTargetOf } from "../../src/WebGLgComponents/gizmoDraw";
import { IDENTITY_ORIENTATION } from "../../src/utils/mapSlice/mapSlice";
import type { MoorhenMap } from "../../src/utils/MoorhenMap";

const map = { molNo: 3, uniqueId: "map-3" } as unknown as MoorhenMap;

describe("a map slice's state", () => {
    it("keeps each map's slice, replacing it when moved", () => {
        const store = createMoorhenStore();
        store.dispatch(setMapSlice({ molNo: 3, origin: [1, 2, 3], orientation: IDENTITY_ORIENTATION }));
        store.dispatch(setMapSlice({ molNo: 4, origin: [0, 0, 0], orientation: IDENTITY_ORIENTATION }));
        store.dispatch(setMapSlice({ molNo: 3, origin: [5, 5, 5], orientation: IDENTITY_ORIENTATION }));
        const slices = store.getState().mapContourSettings.mapSlices;
        expect(slices).toHaveLength(2);
        expect(slices.find(item => item.molNo === 3)?.origin).toEqual([5, 5, 5]);
    });

    it("shows nodal lines map by map, until told not to", () => {
        const store = createMoorhenStore();
        store.dispatch(setMapSliceNodalLines({ molNo: 3, show: true }));
        store.dispatch(setMapSliceNodalLines({ molNo: 4, show: true }));
        store.dispatch(setMapSliceNodalLines({ molNo: 3, show: true }));
        expect(store.getState().mapContourSettings.mapSliceNodalLines).toEqual([4, 3]);
        store.dispatch(setMapSliceNodalLines({ molNo: 3, show: false }));
        expect(store.getState().mapContourSettings.mapSliceNodalLines).toEqual([4]);
    });

    it("keeps each map's contour spacing", () => {
        const store = createMoorhenStore();
        store.dispatch(setMapSliceContourSpacing({ molNo: 3, spacing: "geometric" }));
        store.dispatch(setMapSliceContourSpacing({ molNo: 4, spacing: "geometric" }));
        store.dispatch(setMapSliceContourSpacing({ molNo: 3, spacing: "linear" }));
        expect(store.getState().mapContourSettings.mapSliceContourSpacings).toEqual([
            { molNo: 4, spacing: "geometric" }, { molNo: 3, spacing: "linear" },
        ]);
    });

    it("gives the handles to a slice or a 3D object, not both", () => {
        const store = createMoorhenStore();
        store.dispatch(setSelectedThreeDObject("object-1"));
        store.dispatch(setMovingMapSlice(3));
        expect(store.getState().generalStates.selectedThreeDObjectId).toBeNull();
        store.dispatch(setSelectedThreeDObject("object-2"));
        expect(store.getState().generalStates.movingMapSlice).toBeNull();
        // Putting one's handles away leaves the other's alone.
        store.dispatch(setMovingMapSlice(3));
        store.dispatch(setSelectedThreeDObject(null));
        expect(store.getState().generalStates.movingMapSlice).toBe(3);
    });

    it("has handles at its centre, as wide as the slice, only while shown as a slice", () => {
        const store = createMoorhenStore();
        store.dispatch(setMapSlice({ molNo: 3, origin: [1, 2, 3], orientation: IDENTITY_ORIENTATION }));
        store.dispatch(setMapRadius({ molNo: 3, radius: 6 }));
        store.dispatch(setMovingMapSlice(3));
        // Shown or not, and how, is the map's display record (map-display.md)
        store.dispatch(addMap(map));
        store.dispatch(addMapRepresentation({
            id: "rep-3", mapUid: "map-3", visible: false, contourLevel: 1, radius: { local: 6, full: 6 }, style: "lines",
            alpha: { lines: 1, "lit-lines": 1, solid: 1, slice: 1 }, colour: null, positiveColour: null, negativeColour: null,
            colourByMap: null, originLock: null,
        }));
        // Not shown, then not as a slice: no handles.
        expect(handleTargetOf(store.getState())).toBeNull();
        store.dispatch(setMapRepresentation({ id: "rep-3", changes: { visible: true } }));
        expect(handleTargetOf(store.getState())).toBeNull();
        store.dispatch(setMapRepresentation({ id: "rep-3", changes: { style: "slice" } }));
        expect(handleTargetOf(store.getState())).toMatchObject({ kind: "mapSlice", molNo: 3, centre: [1, 2, 3], extent: 6, turnable: true });
    });
});
