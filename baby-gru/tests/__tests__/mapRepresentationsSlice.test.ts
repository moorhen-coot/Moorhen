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
    setPrimaryMapRepresentation,
    setPrimaryMapRepresentationAlpha,
    setPrimaryMapRepresentationRadius,
} from "../../src/store/mapRepresentationsSlice";
import {
    type MapRepresentationData,
    EM_LOCAL_RADIUS,
    createDefaultMapRepresentationData,
    currentAlpha,
    currentRadius,
    displayToCopy,
    withChanges,
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
    alpha: { lines: 1, "lit-lines": 1, solid: 1, slice: 1 },
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
        expect(mesh.alpha).toEqual({ lines: 1, "lit-lines": 1, solid: 0.4, slice: 1 });
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

    test("a map's display is changed through its primary (first) representation, by map uid", () => {
        const store = makeStore();
        store.dispatch(addMapRepresentation(record("first", "map-a")));
        store.dispatch(addMapRepresentation(record("second", "map-a")));
        store.dispatch(setPrimaryMapRepresentation({ mapUid: "map-a", changes: { contourLevel: 0.7, style: "solid" } }));
        store.dispatch(setPrimaryMapRepresentationAlpha({ mapUid: "map-a", alpha: 0.4 }));
        store.dispatch(setPrimaryMapRepresentation({ mapUid: "unknown", changes: { visible: false } }));

        const first = selectMapRepresentation(store.getState(), "first");
        expect(first.contourLevel).toBe(0.7);
        // The opacity of the style in use only
        expect(first.alpha).toEqual({ lines: 1, "lit-lines": 1, solid: 0.4, slice: 1 });
        expect(selectMapRepresentation(store.getState(), "second")).toEqual(record("second", "map-a"));
    });

    test("the keyboard changes the radius of the draw mode in use, never below 1 Å", () => {
        const store = makeStore();
        store.dispatch(addMapRepresentation(record("em", "map-em", { originLock: { centre: [0, 0, 0] } })));
        store.dispatch(setPrimaryMapRepresentationRadius({ mapUid: "map-em", by: 2 }));
        expect(selectMapRepresentation(store.getState(), "em").radius).toEqual({ local: 15, full: 122 });
        store.dispatch(setPrimaryMapRepresentationRadius({ mapUid: "map-em", radius: 3 }));
        store.dispatch(setPrimaryMapRepresentationRadius({ mapUid: "map-em", by: -10 }));
        expect(selectMapRepresentation(store.getState(), "em").radius.full).toBe(1);
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
                    colourByMap: { mapUid: "map-a", min: -0.9, max: 0.9, gradient: [[0, [52, 77, 144]], [1, [231, 85, 44]]] },
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
            isCube: false,
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
        expect(map.alpha).toEqual({ lines: 1, "lit-lines": 1, solid: 1, slice: 1 });

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
        // The whole map (suggested radius, with headroom) around its centre; small around the view
        expect(map.radius.full).toBe(12);
        expect(map.radius.local).toBe(EM_LOCAL_RADIUS);
        // Without a suggested radius, the whole cell
        const noSuggestion = createDefaultMapRepresentationData(
            fakeMap({ isEM: true, suggestedRadius: null, headerInfo: { spacegroup: "P 1", cell: { a: 200 } as MoorhenMap["headerInfo"]["cell"], resolution: 3 } }),
            preferences
        );
        expect(noSuggestion.radius.full).toBe(Math.ceil((200 * 1.732) / 2));
        // mapCentre is a scene origin (negated world coordinates)
        expect(map.originLock).toEqual({ centre: [100, 50, 25] });
    });

    test("Gaussian cube: the file's suggested level and radius as given, even when signed", () => {
        const map = createDefaultMapRepresentationData(fakeMap({ isCube: true, isDifference: true, suggestedContourLevel: 0.05, suggestedRadius: 8 }), preferences);
        expect(map.contourLevel).toBe(0.05);
        expect(map.radius.local).toBe(8);
    });
});

describe("a new map's display (initialDisplay, withChanges) and a map made from another (displayToCopy)", () => {
    test("the radius of the draw mode and the opacity of the style the map ends up in", () => {
        const em = withChanges(record("r", "map-4", { originLock: { centre: [0, 0, 0] } }), {
            style: "solid",
            currentRadius: 90,
            currentAlpha: 0.5,
            colour: { r: 1, g: 0, b: 0 },
        });
        expect(em.radius).toEqual({ local: 15, full: 90 });
        expect(em.alpha).toEqual({ lines: 1, "lit-lines": 1, solid: 0.5, slice: 1 });
        expect(em.colour).toEqual({ r: 1, g: 0, b: 0 });
    });

    test("a map made from another takes its level, radii, style and opacities, not its colours", () => {
        const source = record("s", "map-a", { contourLevel: 0.6, style: "lit-lines", colour: { r: 1, g: 0, b: 0 }, radius: { local: 20, full: 80 } });
        const made = withChanges(record("m", "map-b"), displayToCopy(source));
        expect(made).toEqual({ ...record("m", "map-b"), contourLevel: 0.6, style: "lit-lines", radius: { local: 20, full: 80 } });
        expect(displayToCopy(undefined)).toEqual({});
    });
});
