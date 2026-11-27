/**
 * "Draw full map" (a map's origin lock, MoorhenMap.isOriginLocked / drawOrigin): locking again after unlocking draws
 * the map around the centre its record last had, wherever that came from (a scene, a session), not around an older
 * centre the map kept from before.
 */
import { describe, expect, it } from "@jest/globals";
import { createMoorhenStore } from "../../src/store/MoorhenReduxStore";
import { addMap } from "../../src/store/mapsSlice";
import { addMapRepresentation, selectPrimaryMapRepresentation } from "../../src/store/mapRepresentationsSlice";
import { MoorhenMap } from "../../src/utils/MoorhenMap";
import type { MapRepresentationData } from "../../src/utils/Representation/mapRepresentationData";

const record: MapRepresentationData = {
    id: "r",
    mapUid: "map-1",
    visible: true,
    contourLevel: 0.3,
    radius: { local: 30, full: 120 },
    style: "solid",
    alpha: { lines: 1, "lit-lines": 1, solid: 1, slice: 1 },
    colour: null,
    positiveColour: null,
    negativeColour: null,
    colourByMap: null,
    // Locked at C1 by a scene
    originLock: { centre: [10, 20, 30] },
    slice: null,
    viewDependentTransparency: false,
};

describe("a map's origin lock", () => {
    it("locks again around the centre its record last had", () => {
        const store = createMoorhenStore();
        const map = Object.assign(Object.create(MoorhenMap.prototype), { molNo: 1, uniqueId: "map-1", store });
        // An older centre the map kept (C0, as a scene origin: negated)
        (map as unknown as { ownDrawOrigin: number[] }).ownDrawOrigin = [-1, -2, -3];
        store.dispatch(addMap(map));
        store.dispatch(addMapRepresentation(record));

        map.isOriginLocked = false;
        expect(selectPrimaryMapRepresentation(store.getState(), "map-1").originLock).toBeNull();
        map.isOriginLocked = true;
        expect(selectPrimaryMapRepresentation(store.getState(), "map-1").originLock).toEqual({ centre: [10, 20, 30] });
    });
});
