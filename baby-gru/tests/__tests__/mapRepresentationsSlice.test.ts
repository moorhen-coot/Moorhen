/**
 * Map representation records (store slice `mapRepresentations`) and the default display a map gets at load.
 * Plain data: what the e2e known failures in session-map-display.spec.ts expect once maps are drawn from these
 * records (opacity per style, radius per draw mode, saved as is).
 */
import { configureStore } from "@reduxjs/toolkit";
import mapRepresentationsReducer, {
    addMapRepresentation,
    removeMapRepresentation,
    removeMapRepresentationsOfMap,
    selectMapRepresentation,
    selectMapRepresentationsOfMap,
    setMapRepresentation,
    setMapRepresentationAlpha,
    setMapRepresentationRadius,
} from "../../src/store/mapRepresentationsSlice";
import {
    type MapRepresentationData,
    createDefaultMapRepresentationData,
    currentAlpha,
    currentRadius,
} from "../../src/utils/Representation/mapRepresentationData";
import type { MoorhenMap } from "../../src/utils/MoorhenMap";

const makeStore = () => configureStore({ reducer: { mapRepresentations: mapRepresentationsReducer } });

const record = (id: string, mapUid: string, changes: Partial<MapRepresentationData> = {}): MapRepresentationData => ({
    id,
    mapUid,
    visible: true,
    contourLevel: 0.3,
    radius: { local: 15, full: 120 },
    style: "lines",
    alpha: { lines: 1, "lit-lines": 1, solid: 1 },
    colour: null,
    positiveColour: null,
    negativeColour: null,
    colourByMap: null,
    originLock: null,
    ...changes,
});

describe("mapRepresentations slice", () => {
    test("representations are listed per map, in the order they were added", () => {
        const store = makeStore();
        store.dispatch(addMapRepresentation(record("mesh", "map-a")));
        store.dispatch(addMapRepresentation(record("other", "map-b")));
        store.dispatch(addMapRepresentation(record("surface", "map-a", { style: "solid", contourLevel: 0.9 })));

        const ofA = selectMapRepresentationsOfMap(store.getState(), "map-a");
        expect(ofA.map(representation => representation.id)).toEqual(["mesh", "surface"]);
        // Memoised: same state, same array
        expect(selectMapRepresentationsOfMap(store.getState(), "map-a")).toBe(ofA);
        expect(selectMapRepresentation(store.getState(), "other").mapUid).toBe("map-b");
    });

    test("setMapRepresentation changes some fields, and only some draw modes / styles of radius and alpha", () => {
        const store = makeStore();
        store.dispatch(addMapRepresentation(record("mesh", "map-a")));
        store.dispatch(setMapRepresentation({ id: "mesh", changes: { contourLevel: 0.6, alpha: { solid: 0.4 }, radius: { full: 150 } } }));
        store.dispatch(setMapRepresentation({ id: "unknown", changes: { visible: false } }));

        const mesh = selectMapRepresentation(store.getState(), "mesh");
        expect(mesh.contourLevel).toBe(0.6);
        expect(mesh.alpha).toEqual({ lines: 1, "lit-lines": 1, solid: 0.4 });
        expect(mesh.radius).toEqual({ local: 15, full: 150 });
        expect(Object.keys(store.getState().mapRepresentations.representations)).toEqual(["mesh"]);
    });

    test("each style keeps its own opacity when switching style", () => {
        const store = makeStore();
        store.dispatch(addMapRepresentation(record("mesh", "map-a")));
        const styleAlphas = { lines: 0.3, solid: 0.6, "lit-lines": 0.9 } as const;
        for (const [style, alpha] of Object.entries(styleAlphas)) {
            store.dispatch(setMapRepresentation({ id: "mesh", changes: { style: style as keyof typeof styleAlphas } }));
            store.dispatch(setMapRepresentationAlpha({ id: "mesh", alpha }));
        }
        for (const [style, alpha] of Object.entries(styleAlphas)) {
            store.dispatch(setMapRepresentation({ id: "mesh", changes: { style: style as keyof typeof styleAlphas } }));
            expect(currentAlpha(selectMapRepresentation(store.getState(), "mesh"))).toBe(alpha);
        }
    });

    test("an EM map keeps a radius per draw mode when switching local / full map", () => {
        const store = makeStore();
        store.dispatch(addMapRepresentation(record("em", "map-em", { style: "solid" })));
        const lock = { centre: [10, 20, 30] as [number, number, number] };

        store.dispatch(setMapRepresentationRadius({ id: "em", radius: 30 }));
        store.dispatch(setMapRepresentation({ id: "em", changes: { originLock: lock } }));
        store.dispatch(setMapRepresentationRadius({ id: "em", radius: 150 }));

        expect(currentRadius(selectMapRepresentation(store.getState(), "em"))).toBe(150);
        store.dispatch(setMapRepresentation({ id: "em", changes: { originLock: null } }));
        expect(currentRadius(selectMapRepresentation(store.getState(), "em"))).toBe(30);
        store.dispatch(setMapRepresentation({ id: "em", changes: { originLock: lock } }));
        expect(currentRadius(selectMapRepresentation(store.getState(), "em"))).toBe(150);
    });

    test("closing a map removes its representations only", () => {
        const store = makeStore();
        store.dispatch(addMapRepresentation(record("mesh", "map-a")));
        store.dispatch(addMapRepresentation(record("surface", "map-a")));
        store.dispatch(addMapRepresentation(record("other", "map-b")));
        store.dispatch(removeMapRepresentationsOfMap("map-a"));
        expect(Object.keys(store.getState().mapRepresentations.representations)).toEqual(["other"]);
        store.dispatch(removeMapRepresentation("other"));
        expect(store.getState().mapRepresentations.representations).toEqual({});
    });

    test("the state is plain data: a JSON round trip gives it back unchanged", () => {
        const store = makeStore();
        store.dispatch(
            addMapRepresentation(
                record("diff", "map-d", {
                    positiveColour: { r: 0.4, g: 0.8, b: 0.7 },
                    negativeColour: { r: 0.6, g: 0.1, b: 0.5 },
                    colourByMap: { mapUid: "map-a", min: -0.9, max: 0.9 },
                    originLock: { centre: [1, 2, 3] },
                })
            )
        );
        const state = store.getState().mapRepresentations;
        expect(JSON.parse(JSON.stringify(state))).toEqual(state);
    });
});

describe("createDefaultMapRepresentationData", () => {
    const preferences = { defaultMapLitLines: false, defaultMapSurface: false };
    const fakeMap = (fields: Partial<MoorhenMap>) =>
        ({
            uniqueId: "map-uid",
            showOnLoad: true,
            isEM: false,
            isDifference: false,
            mapRmsd: 0.25,
            suggestedContourLevel: 0.4,
            suggestedRadius: 10,
            headerInfo: null,
            mapCentre: null,
            cellCentre: null,
            ...fields,
        }) as MoorhenMap;

    test("crystallographic map: 1 rmsd, difference map 3 rmsd, local radius, preferred style, follows the view", () => {
        const map = createDefaultMapRepresentationData(fakeMap({}), { ...preferences, defaultMapLitLines: true });
        expect(map.mapUid).toBe("map-uid");
        expect(map.contourLevel).toBe(0.25);
        expect(map.radius.local).toBe(12);
        expect(map.style).toBe("lit-lines");
        expect(map.originLock).toBeNull();
        expect(map.alpha).toEqual({ lines: 1, "lit-lines": 1, solid: 1 });

        expect(createDefaultMapRepresentationData(fakeMap({ isDifference: true }), preferences).contourLevel).toBe(0.75);
    });

    test("EM map: suggested level, solid, whole map around its centre (world coordinates)", () => {
        const map = createDefaultMapRepresentationData(
            fakeMap({
                isEM: true,
                headerInfo: { spacegroup: "P 1", cell: { a: 200 } as MoorhenMap["headerInfo"]["cell"], resolution: 3 },
                mapCentre: [-100, -50, -25],
            }),
            preferences
        );
        expect(map.contourLevel).toBe(0.4);
        expect(map.style).toBe("solid");
        expect(map.radius.full).toBe(Math.ceil((200 * 1.732) / 2));
        // mapCentre is a scene origin (negated world coordinates)
        expect(map.originLock).toEqual({ centre: [100, 50, 25] });
    });
});
