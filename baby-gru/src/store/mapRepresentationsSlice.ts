import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
    type MapDrawMode,
    type MapRepresentationData,
    type MapStyle,
    drawModeOf,
} from "../utils/Representation/mapRepresentationData";

/**
 * Map representations: how each map is displayed, one or more records per map, keyed by representation id.
 * Plain data only (serialisable): the GL buffers and drawing live in `MapRepresentation` instances outside the
 * store. See .roadmaps/map-display.md.
 *
 * Not used yet: maps are still displayed from `mapContourSettings` (Phase 1 of the roadmap).
 */
export type MapRepresentationsState = {
    representations: Record<string, MapRepresentationData>;
};

/** Fields that can be changed; `radius` and `alpha` can be given for some draw modes / styles only */
export type MapRepresentationChanges = Partial<Omit<MapRepresentationData, "id" | "mapUid" | "radius" | "alpha">> & {
    radius?: Partial<Record<MapDrawMode, number>>;
    alpha?: Partial<Record<MapStyle, number>>;
};

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
            if (!representation) {
                return;
            }
            const { radius, alpha, ...rest } = action.payload.changes;
            Object.assign(representation, rest);
            if (radius) {
                Object.assign(representation.radius, radius);
            }
            if (alpha) {
                Object.assign(representation.alpha, alpha);
            }
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
} = mapRepresentationsSlice.actions;

export default mapRepresentationsSlice.reducer;
