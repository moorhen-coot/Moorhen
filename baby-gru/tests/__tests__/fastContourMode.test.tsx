/**
 * Fast contour mode (src/hooks/useFastContourMode.ts): while the level changes quickly, a map's representations drawn
 * by Coot are contoured with a smaller radius (mapDisplay.setFastRadius). GPU contours do not need it, but with GPU
 * contours on a representation coloured by another map is still Coot's, drawn into the GPU frame: it gets it too.
 */
import { act, renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { MoorhenInstanceContext } from "../../src/InstanceManager/MoorhenInstanceContext";
import { useFastContourMode } from "../../src/hooks/useFastContourMode";
import { createMoorhenStore } from "../../src/store/MoorhenReduxStore";
import { addMap } from "../../src/store/mapsSlice";
import { setHeight, setWidth } from "../../src/store/sceneSettingsSlice";
import { addMapRepresentation, selectPrimaryMapRepresentation } from "../../src/store/mapRepresentationsSlice";
import { gpuMapContourSetting } from "../../src/WebGPUComponents/mapContour/setting";
import type { MapRepresentationData } from "../../src/utils/Representation/mapRepresentationData";
import { moorhen } from "../../src/types/moorhen";

const map = { molNo: 1, uniqueId: "map-1" } as unknown as moorhen.Map;

const record = (changes: Partial<MapRepresentationData> = {}): MapRepresentationData => ({
    id: "rep-1",
    mapUid: "map-1",
    visible: true,
    contourLevel: 0.3,
    radius: { local: 60, full: 60 },
    style: "lines",
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

const setLevelWith = (item: MapRepresentationData) => {
    jest.useFakeTimers();
    const store = createMoorhenStore();
    // A view, for the fast radius (what it shows)
    store.dispatch(setWidth(800));
    store.dispatch(setHeight(600));
    store.dispatch(addMap(map));
    store.dispatch(addMapRepresentation(item));
    const setFastRadius = jest.fn();
    const instance = { mapDisplay: { setFastRadius } } as never;
    const { result } = renderHook(() => useFastContourMode({ map, mapRadius: 60 }), {
        wrapper: ({ children }) => (
            <Provider store={store}>
                <MoorhenInstanceContext.Provider value={{ instance }}>{children}</MoorhenInstanceContext.Provider>
            </Provider>
        ),
    });
    act(() => result.current.fastMapContourLevel(0.5));
    const fastRadii = setFastRadius.mock.calls.map(call => call[1]);
    // Back to the records' radius once the level stops changing
    act(() => {
        jest.advanceTimersByTime(1500);
    });
    jest.useRealTimers();
    return { level: selectPrimaryMapRepresentation(store.getState(), "map-1").contourLevel, fastRadii, after: setFastRadius.mock.calls.at(-1)?.[1] };
};

describe("fast contour mode", () => {
    afterEach(() => {
        gpuMapContourSetting.enabled = false;
    });

    test("Coot contours: drawn smaller while the level changes", () => {
        const { level, fastRadii, after } = setLevelWith(record());
        expect(level).toBe(0.5);
        expect(fastRadii).toHaveLength(1);
        expect(fastRadii[0]).toBeGreaterThan(0);
        expect(after).toBeNull();
    });

    test("GPU contours: not needed", () => {
        gpuMapContourSetting.enabled = true;
        const { level, fastRadii } = setLevelWith(record());
        expect(level).toBe(0.5);
        expect(fastRadii).toEqual([]);
    });

    test("GPU contours, but coloured by another map (Coot's, in the GPU frame): drawn smaller", () => {
        gpuMapContourSetting.enabled = true;
        const gradient: [number, [number, number, number]][] = [[0, [0, 0, 255]], [1, [255, 0, 0]]];
        const { level, fastRadii, after } = setLevelWith(record({ colourByMap: { mapUid: "map-2", min: 0, max: 1, gradient } }));
        expect(level).toBe(0.5);
        expect(fastRadii).toHaveLength(1);
        expect(fastRadii[0]).toBeGreaterThan(0);
        expect(after).toBeNull();
    });
});
