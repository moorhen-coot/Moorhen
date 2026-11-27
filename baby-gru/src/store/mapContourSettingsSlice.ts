import { createSlice, PayloadAction } from "@reduxjs/toolkit";

/**
 * How a map is drawn: as a mesh, a surface or lit lines in 3D, or as a contoured 2D slice through
 * it (mapSlice.ts).
 */
export type MapStyle = "solid" | "lit-lines" | "lines" | "slice";

/**
 * Map preferences, for all maps.
 *
 * What a map shows (visible, level, radius, style, opacity, colours) is its display record in the
 * `mapRepresentations` slice, keyed by map uid: see .roadmaps/map-display.md. The lists keyed by molNo that held it
 * here (`visibleMaps`, `contourLevels`, `mapRadii`, `mapAlpha`, `mapStyles`, the colours) and their actions
 * (`showMap`, `setContourLevel`...) were removed on 2026-11-26: use `setPrimaryMapRepresentation` and friends. So were
 * the 2D slice lists (`mapSlices`, `mapSliceNodalLines`, `mapSliceContourSpacings`): a record's `slice`, changed with
 * `setMapRepresentationSlice`.
 */
const initialState: {
    defaultMapSamplingRate: number;
    defaultMapLitLines: boolean;
    mapLineWidth: number;
    defaultMapSurface: boolean;
    reContourMapOnlyOnMouseUp: boolean;
} = {
    defaultMapSamplingRate: null,
    defaultMapLitLines: null,
    mapLineWidth: null,
    defaultMapSurface: null,
    reContourMapOnlyOnMouseUp: null,
};

const mapContourSettingsSlice = createSlice({
    name: "mapContourSettings",
    initialState: initialState,
    reducers: {
        resetMapContourSettings: () => {
            return initialState;
        },
        // API
        /* If true the map will not be re-contoured when moving around, only on mouse up.
        helps performance on slower machines */
        setReContourMapOnlyOnMouseUp: (state, action: PayloadAction<boolean>) => {
            state.reContourMapOnlyOnMouseUp = action.payload;
        },
        // API
        setDefaultMapSamplingRate: (state, action: PayloadAction<number>) => {
            state.defaultMapSamplingRate = action.payload;
        },
        // API
        setDefaultMapLitLines: (state, action: PayloadAction<boolean>) => {
            state.defaultMapLitLines = action.payload;
        },
        // API
        setMapLineWidth: (state, action: PayloadAction<number>) => {
            state.mapLineWidth = action.payload;
        },
        // API
        setDefaultMapSurface: (state, action: PayloadAction<boolean>) => {
            state.defaultMapSurface = action.payload;
        },
    },
});

export const {
    setDefaultMapSamplingRate,
    setDefaultMapLitLines,
    setMapLineWidth,
    setDefaultMapSurface,
    setReContourMapOnlyOnMouseUp,
    resetMapContourSettings,
} = mapContourSettingsSlice.actions;

export default mapContourSettingsSlice.reducer;
