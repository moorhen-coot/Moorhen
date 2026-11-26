import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { type MapRepresentationChanges, type MapRepresentationData, drawModeOf } from "../utils/Representation/mapRepresentationData";

/**
 * Map representations: how each map is displayed, one or more records per map, keyed by representation id.
 * Plain data only (serialisable): the GL buffers and drawing live in `MapRepresentation` instances outside the
 * store. See .roadmaps/map-display.md.
 *
 * The records are what is drawn. A map's first record is made when the map reaches the store, from the defaults and
 * the map's `initialDisplay` (InstanceManager/mapDisplayRecords.ts).
 */
export type MapRepresentationsState = {
    representations: Record<string, MapRepresentationData>;
};

export type { MapRepresentationChanges };

/** Apply changes to a record (draft); `radius` and `alpha` only for the draw modes / styles given */
const applyChanges = (representation: MapRepresentationData, changes: MapRepresentationChanges): void => {
    const { radius, alpha, ...rest } = changes;
    Object.assign(representation, rest);
    if (radius) {
        Object.assign(representation.radius, radius);
    }
    if (alpha) {
        Object.assign(representation.alpha, alpha);
    }
};

/** A map's primary representation: its first record (draft or state) */
const primaryOf = (state: MapRepresentationsState, mapUid: string): MapRepresentationData | undefined =>
    Object.values(state.representations).find(representation => representation.mapUid === mapUid);

const initialState: MapRepresentationsState = {
    representations: {},
};

const mapRepresentationsSlice = createSlice({
    name: "mapRepresentations",
    initialState,
    reducers: {
        addMapRepresentation: (state, action: PayloadAction<MapRepresentationData>) => {
            state.representations[action.payload.id] = action.payload;
        },
        removeMapRepresentation: (state, action: PayloadAction<string>) => {
            delete state.representations[action.payload];
        },
        /** When a map is closed. Takes the map uid */
        removeMapRepresentationsOfMap: (state, action: PayloadAction<string>) => {
            Object.values(state.representations)
                .filter(representation => representation.mapUid === action.payload)
                .forEach(representation => delete state.representations[representation.id]);
        },
        emptyMapRepresentations: () => initialState,
        /** Change some fields of a representation; unknown ids are ignored */
        setMapRepresentation: (state, action: PayloadAction<{ id: string; changes: MapRepresentationChanges }>) => {
            const representation = state.representations[action.payload.id];
            if (representation) {
                applyChanges(representation, action.payload.changes);
            }
        },
        // API
        /**
         * Change a map's display: some fields of its primary representation (its first record). What the map card,
         * the keyboard and the old `molNo` API act on. Unknown maps are ignored.
         */
        setPrimaryMapRepresentation: (state, action: PayloadAction<{ mapUid: string; changes: MapRepresentationChanges }>) => {
            const representation = primaryOf(state, action.payload.mapUid);
            if (representation) {
                applyChanges(representation, action.payload.changes);
            }
        },
        // API
        /** The opacity of the style a map is drawn in (each style keeps its own), on its primary representation */
        setPrimaryMapRepresentationAlpha: (state, action: PayloadAction<{ mapUid: string; alpha: number }>) => {
            const representation = primaryOf(state, action.payload.mapUid);
            if (representation) {
                representation.alpha[representation.style] = action.payload.alpha;
            }
        },
        // API
        /**
         * The radius of the draw mode a map is in (local / full map, each keeps its own), on its primary
         * representation: `radius` to set it, or `by` to change it (never below 1 Å)
         */
        setPrimaryMapRepresentationRadius: (state, action: PayloadAction<{ mapUid: string } & ({ radius: number } | { by: number })>) => {
            const representation = primaryOf(state, action.payload.mapUid);
            if (!representation) {
                return;
            }
            const mode = drawModeOf(representation);
            const radius = "radius" in action.payload ? action.payload.radius : representation.radius[mode] + action.payload.by;
            representation.radius[mode] = Math.max(1, radius);
        },
        /** The opacity of the style in use (each style keeps its own) */
        setMapRepresentationAlpha: (state, action: PayloadAction<{ id: string; alpha: number }>) => {
            const representation = state.representations[action.payload.id];
            if (representation) {
                representation.alpha[representation.style] = action.payload.alpha;
            }
        },
        /** The radius of the draw mode in use (local / full map, each keeps its own) */
        setMapRepresentationRadius: (state, action: PayloadAction<{ id: string; radius: number }>) => {
            const representation = state.representations[action.payload.id];
            if (representation) {
                representation.radius[drawModeOf(representation)] = action.payload.radius;
            }
        },
    },
});

type StateWithMapRepresentations = { mapRepresentations: MapRepresentationsState };

export const selectMapRepresentation = (state: StateWithMapRepresentations, id: string): MapRepresentationData | undefined =>
    state.mapRepresentations.representations[id];

/**
 * A map's primary representation: its first record. What the old `molNo` API, the map fields (`isOriginLocked`...)
 * and `MoorhenMap.getMapContourParams` act on.
 */
export const selectPrimaryMapRepresentation = (state: StateWithMapRepresentations, mapUid: string): MapRepresentationData | undefined =>
    primaryOf(state.mapRepresentations, mapUid);

/** A map's representations, in the order they were added */
export const selectMapRepresentationsOfMap = createSelector(
    [(state: StateWithMapRepresentations) => state.mapRepresentations.representations, (_state: StateWithMapRepresentations, mapUid: string) => mapUid],
    (representations, mapUid) => Object.values(representations).filter(representation => representation.mapUid === mapUid)
);

export const {
    addMapRepresentation,
    removeMapRepresentation,
    removeMapRepresentationsOfMap,
    emptyMapRepresentations,
    setMapRepresentation,
    setMapRepresentationAlpha,
    setMapRepresentationRadius,
    setPrimaryMapRepresentation,
    setPrimaryMapRepresentationAlpha,
    setPrimaryMapRepresentationRadius,
} = mapRepresentationsSlice.actions;

export default mapRepresentationsSlice.reducer;
