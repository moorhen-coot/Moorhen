/**
 * A map representation's contours (src/utils/Representation/MapRepresentation.ts): what it asks Coot for when its record
 * changes while a contour is still running. The worker is faked (each contour finishes when the test says), and the GL
 * buffer building is mocked out: a buffer records the level it was made at.
 */
import { describe, expect, it, jest } from "@jest/globals";

jest.mock("../../src/WebGLgComponents/buildBuffers", () => {
    // Made with `new`, as a DisplayBuffer is: the store does not freeze class instances
    function MockBuffer(this: Record<string, unknown>, level: number) {
        this.id = `buffer-${level}-${Math.random()}`;
        this.level = level;
        this.triangleColours = [[0, 0, 0, 1]];
        this.transparent = false;
        this.setCustomColour = () => {};
        this.clearBuffers = () => {};
    }
    return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        appendOtherData: (mesh: { level: number }) => [new (MockBuffer as any)(mesh.level)],
        buildBuffers: () => {},
    };
});

import { createMoorhenStore } from "../../src/store/MoorhenReduxStore";
import { addMap } from "../../src/store/mapsSlice";
import { addMapRepresentation, setMapRepresentation } from "../../src/store/mapRepresentationsSlice";
import { MapRepresentation } from "../../src/utils/Representation/MapRepresentation";
import type { MapRepresentationData } from "../../src/utils/Representation/mapRepresentationData";

const map = {
    molNo: 1,
    uniqueId: "map-1",
    isDifference: false,
    defaultMapColour: { r: 0.3, g: 0.3, b: 0.7 },
    defaultPositiveMapColour: { r: 0.4, g: 0.8, b: 0.4 },
    defaultNegativeMapColour: { r: 0.8, g: 0.4, b: 0.4 },
    drawMapSlice: async () => {},
    hideMapSlice: () => {},
};

const record: MapRepresentationData = {
    id: "rep-1",
    mapUid: "map-1",
    visible: true,
    contourLevel: 1,
    radius: { local: 18, full: 18 },
    style: "lines",
    alpha: { lines: 1, "lit-lines": 1, solid: 1, slice: 1 },
    colour: null,
    positiveColour: null,
    negativeColour: null,
    colourByMap: null,
    originLock: null,
    slice: null,
    viewDependentTransparency: false,
};

/** A representation whose contours wait: `finish(i)` lets the i-th one land */
const setUp = () => {
    const store = createMoorhenStore();
    store.dispatch(addMap(map as never));
    store.dispatch(addMapRepresentation(record));
    const requests: { level: number; finish: () => void }[] = [];
    const instance = {
        store,
        dispatch: store.dispatch,
        getMapList: () => [map],
        workerCommand: {
            get_map_contours_mesh: (_molNo: number, _centre: number[], _radius: number, level: number) =>
                new Promise(resolve => requests.push({ level, finish: () => resolve({ level }) })),
        },
    };
    const representation = new MapRepresentation("rep-1", map as never, instance as never);
    const change = (changes: Partial<MapRepresentationData>) => {
        store.dispatch(setMapRepresentation({ id: "rep-1", changes }));
        representation.update();
    };
    const settle = () => new Promise(resolve => setTimeout(resolve, 0));
    const drawnLevel = () => (representation.displayBuffers[0] as unknown as { level: number } | undefined)?.level;
    return { representation, requests, change, settle, drawnLevel };
};

describe("a map representation's contour", () => {
    it("is asked for again when a change is undone while its contour runs: the late one is not left drawn", async () => {
        const { representation, requests, change, settle, drawnLevel } = setUp();
        representation.update();
        requests[0].finish();
        await settle();
        expect(drawnLevel()).toBe(1);

        // Up, and back down before the first contour lands
        change({ contourLevel: 2 });
        change({ contourLevel: 1 });
        expect(requests.map(request => request.level)).toEqual([1, 2, 1]);
        requests[1].finish();
        await settle();
        requests[2].finish();
        await settle();
        expect(drawnLevel()).toBe(1);
    });

    it("is not asked for twice for the same change", async () => {
        const { representation, requests, change, settle } = setUp();
        representation.update();
        requests[0].finish();
        await settle();
        change({ contourLevel: 2 });
        // Something else in the record (its opacity): the level's contour is already on its way
        change({ alpha: { ...record.alpha, lines: 0.5 } });
        expect(requests.map(request => request.level)).toEqual([1, 2]);
    });

    it("is painted as the record is when it lands, not as it was when asked for", async () => {
        const { representation, requests, change, settle } = setUp();
        representation.update();
        requests[0].finish();
        await settle();
        change({ contourLevel: 2 });
        // Made transparent while the level's contour runs
        change({ alpha: { ...record.alpha, lines: 0.5 } });
        requests[1].finish();
        await settle();
        expect((representation.displayBuffers[0] as unknown as { transparent: boolean }).transparent).toBe(true);
    });
});
