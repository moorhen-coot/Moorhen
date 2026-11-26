import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { MapSlicePlacement, SliceContourSpacing } from "../utils/mapSlice/mapSlice";

/**
 * How a map is drawn: as a mesh, a surface or lit lines in 3D, or as a contoured 2D slice through
 * it (mapSlice.ts).
 */
export type MapStyle = "solid" | "lit-lines" | "lines" | "slice";

/**
 * Map preferences, for all maps, and each map's 2D slice.
 *
 * What a map shows (visible, level, radius, style, opacity, colours) is its display record in the
 * `mapRepresentations` slice, keyed by map uid: see .roadmaps/map-display.md. The lists keyed by molNo that held it
 * here (`visibleMaps`, `contourLevels`, `mapRadii`, `mapAlpha`, `mapStyles`, the colours) and their actions
 * (`showMap`, `setContourLevel`...) were removed on 2026-11-26: use `setPrimaryMapRepresentation` and friends.
 */
const initialState: {
    /**
     * Each map's 2D slice, where it was last put: kept when the map is drawn another way, so that
     * going back to the slice finds it where it was.
     */
    mapSlices: ({ molNo: number } & MapSlicePlacement)[];
    /** The maps whose 2D slice shows its nodal lines (the zero contour), by molNo. */
    mapSliceNodalLines: number[];
    /** How each map's 2D slice spaces its contours, where not the default (mapSlice.ts). */
    mapSliceContourSpacings: { molNo: number; spacing: SliceContourSpacing }[];
    defaultMapSamplingRate: number;
    defaultMapLitLines: boolean;
    mapLineWidth: number;
    defaultMapSurface: boolean;
    reContourMapOnlyOnMouseUp: boolean;
} = {
    mapSlices: [],
    mapSliceNodalLines: [],
    mapSliceContourSpacings: [],
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
        /** Where a map's 2D slice is: its centre and orientation (see MapSlicePlacement). */
        setMapSlice: (state, action: PayloadAction<{ molNo: number } & MapSlicePlacement>) => {
            const { molNo, origin, orientation } = action.payload;
            state.mapSlices = [
                ...state.mapSlices.filter(item => item.molNo !== molNo),
                { molNo, origin: [...origin] as [number, number, number], orientation: [...orientation] },
            ];
        },
        // API
        /** Whether a map's 2D slice shows its nodal lines: the zero contour, between its positive and negative contours. */
        setMapSliceNodalLines: (state, action: PayloadAction<{ molNo: number; show: boolean }>) => {
            const { molNo, show } = action.payload;
            const others = state.mapSliceNodalLines.filter(item => item !== molNo);
            state.mapSliceNodalLines = show ? [...others, molNo] : others;
        },
        // API
        /** How a map's 2D slice spaces its contours: in equal steps ("linear") or each double the last ("geometric"). */
        setMapSliceContourSpacing: (state, action: PayloadAction<{ molNo: number; spacing: SliceContourSpacing }>) => {
            state.mapSliceContourSpacings = [
                ...state.mapSliceContourSpacings.filter(item => item.molNo !== action.payload.molNo),
                { ...action.payload },
            ];
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
    setMapSlice,
    setMapSliceNodalLines,
    setMapSliceContourSpacing,
    setDefaultMapSamplingRate,
    setDefaultMapLitLines,
    setMapLineWidth,
    setDefaultMapSurface,
    setReContourMapOnlyOnMouseUp,
    resetMapContourSettings,
} = mapContourSettingsSlice.actions;

export default mapContourSettingsSlice.reducer;
