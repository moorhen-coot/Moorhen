/**
 * The map display driver keeping maps and records together (src/InstanceManager/MapDisplayDriver.ts): a loaded map
 * always has a representation (a new one at the defaults when it is left without any), and a representation coloured
 * by a map that is closed goes back to its own colour. Contours are faked (empty), GL buffer building mocked out.
 */
import { describe, expect, it, jest } from "@jest/globals";

jest.mock("../../src/WebGLgComponents/buildBuffers", () => ({ appendOtherData: () => [], buildBuffers: () => {} }));

import { MapDisplayDriver } from "../../src/InstanceManager/MapDisplayDriver";
import { createMoorhenStore } from "../../src/store/MoorhenReduxStore";
import { addMap, removeMap } from "../../src/store/mapsSlice";
import {
    removeMapRepresentation,
    replaceMapRepresentationsOfMaps,
    selectMapRepresentationsOfMap,
    setMapRepresentation,
} from "../../src/store/mapRepresentationsSlice";

const fakeMap = (molNo: number) => ({
    molNo,
    uniqueId: `map-${molNo}`,
    name: `map ${molNo}`,
    showOnLoad: true,
    isEM: false,
    isCube: false,
    isDifference: false,
    mapRmsd: 0.2,
    suggestedRadius: 15,
    isOriginLocked: false,
    drawOrigin: null,
    mapCentre: [0, 0, 0],
    defaultMapColour: { r: 0.3, g: 0.3, b: 0.7 },
    defaultPositiveMapColour: { r: 0.4, g: 0.8, b: 0.4 },
    defaultNegativeMapColour: { r: 0.8, g: 0.4, b: 0.4 },
    drawMapSlice: async () => {},
    hideMapSlice: () => {},
});

const setUp = () => {
    const store = createMoorhenStore();
    const maps = [fakeMap(1), fakeMap(2)];
    const instance = {
        store,
        dispatch: store.dispatch,
        getMapList: () => store.getState().maps,
        workerCommand: { get_map_contours_mesh: async () => null, get_map_contours_mesh_coloured_by_other_map: async () => null },
    };
    const driver = new MapDisplayDriver(instance as never);
    driver.start();
    maps.forEach(map => store.dispatch(addMap(map as never)));
    const records = (mapUid: string) => selectMapRepresentationsOfMap(store.getState(), mapUid);
    return { store, driver, records };
};

describe("a loaded map's representations", () => {
    it("start with one", () => {
        const { records, driver } = setUp();
        expect(records("map-1")).toHaveLength(1);
        expect(records("map-1")[0]).toMatchObject({ visible: true, contourLevel: 0.2 });
        driver.stop();
    });

    it("come back at the defaults when the last one is removed", () => {
        const { store, records, driver } = setUp();
        const first = records("map-1")[0];
        store.dispatch(setMapRepresentation({ id: first.id, changes: { contourLevel: 0.9 } }));
        store.dispatch(removeMapRepresentation(first.id));
        expect(records("map-1")).toHaveLength(1);
        expect(records("map-1")[0].id).not.toBe(first.id);
        expect(records("map-1")[0]).toMatchObject({ visible: true, contourLevel: 0.2 });
        driver.stop();
    });

    it("come back when a scene has none for the map (its records dropped as unreadable)", () => {
        const { store, records, driver } = setUp();
        store.dispatch(replaceMapRepresentationsOfMaps({ mapUids: ["map-1"], records: [] }));
        expect(records("map-1")).toHaveLength(1);
        driver.stop();
    });

    it("coloured by a map that is closed: back to their own colour", () => {
        const { store, records, driver } = setUp();
        const gradient: [number, [number, number, number]][] = [[0, [0, 0, 255]], [1, [255, 0, 0]]];
        const coloured = records("map-1")[0];
        store.dispatch(setMapRepresentation({ id: coloured.id, changes: { colourByMap: { mapUid: "map-2", min: 0, max: 1, gradient } } }));
        store.dispatch(removeMap({ molNo: 2 } as never));
        expect(records("map-2")).toHaveLength(0);
        expect(records("map-1")[0].colourByMap).toBeNull();
        driver.stop();
    });
});
