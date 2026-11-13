import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { MoorhenMap } from "@/utils/MoorhenMap";
import { moorhen } from "../types/moorhen";
import type { MapSlicePlacement, SliceContourSpacing } from "../utils/mapSlice/mapSlice";

/**
 * How a map is drawn: as a mesh, a surface or lit lines in 3D, or as a contoured 2D slice through
 * it (mapSlice.ts).
 */
export type MapStyle = "solid" | "lit-lines" | "lines" | "slice";

const initialState: {
    visibleMaps: number[];
    contourLevels: { molNo: number; contourLevel: number }[];
    mapRadii: { molNo: number; radius: number }[];
    mapFastRadii: { molNo: number; radius: number | null }[];
    mapAlpha: { molNo: number; alpha: number }[];
    mapStyles: { molNo: number; style: MapStyle }[];
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
    mapColours: { molNo: number; rgb: { r: number; g: number; b: number } }[];
    negativeMapColours: { molNo: number; rgb: { r: number; g: number; b: number } }[];
    positiveMapColours: { molNo: number; rgb: { r: number; g: number; b: number } }[];
    reContourMapOnlyOnMouseUp: boolean;
} = {
    visibleMaps: [],
    contourLevels: [],
    mapRadii: [],
    mapFastRadii: [],
    mapStyles: [],
    mapSlices: [],
    mapSliceNodalLines: [],
    mapSliceContourSpacings: [],
    mapAlpha: [],
    mapColours: [],
    negativeMapColours: [],
    positiveMapColours: [],
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
        showMap: (state, action: PayloadAction<MoorhenMap>) => {
            if (!state.visibleMaps.includes(action.payload.molNo))
                state.visibleMaps.push(action.payload.molNo);
        },
        // API
        hideMap: (state, action: PayloadAction<MoorhenMap>) => {
            state.visibleMaps = state.visibleMaps.filter(item => item !== action.payload.molNo);
        },
        // API
        setContourLevel: (state, action: PayloadAction<{ molNo: number; contourLevel: number }>) => {
            state.contourLevels = [...state.contourLevels.filter(item => item.molNo !== action.payload.molNo), action.payload];
        },
        // API
        setMapRadius: (state, action: PayloadAction<{ molNo: number; radius: number }>) => {
            state.mapRadii = [...state.mapRadii.filter(item => item.molNo !== action.payload.molNo), action.payload];
        },
        setMapFastRadius: (state, action: PayloadAction<{ molNo: number; radius: number | null }>) => {
            state.mapFastRadii = [...state.mapFastRadii.filter(item => item.molNo !== action.payload.molNo), action.payload];
        },
        // API
        setMapAlpha: (state, action: PayloadAction<{ molNo: number; alpha: number }>) => {
            state.mapAlpha = [...state.mapAlpha.filter(item => item.molNo !== action.payload.molNo), action.payload];
        },
        // API
        setMapStyle: (state, action: PayloadAction<{ molNo: number; style: MapStyle }>) => {
            state.mapStyles = [...state.mapStyles.filter(item => item.molNo !== action.payload.molNo), action.payload];
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

        changeContourLevel: (state, action: PayloadAction<{ molNo: number; factor: number }>) => {
            const map = state.contourLevels.find(item => item.molNo === action.payload.molNo);
            state.contourLevels = [
                ...state.contourLevels.filter(item => item.molNo !== action.payload.molNo),
                { molNo: action.payload.molNo, contourLevel: map.contourLevel + action.payload.factor },
            ];
        },
        changeMapRadius: (state, action: PayloadAction<{ molNo: number; factor: number }>) => {
            const map = state.mapRadii.find(item => item.molNo === action.payload.molNo);
            state.mapRadii = [
                ...state.mapRadii.filter(item => item.molNo !== action.payload.molNo),
                { molNo: action.payload.molNo, radius: map.radius + action.payload.factor },
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
        // API
        setMapColours: (state, action: PayloadAction<{ molNo: number; rgb: { r: number; g: number; b: number } }>) => {
            state.mapColours = [...state.mapColours.filter(item => item.molNo !== action.payload.molNo), action.payload];
        },
        // API
        setNegativeMapColours: (state, action: PayloadAction<{ molNo: number; rgb: { r: number; g: number; b: number } }>) => {
            state.negativeMapColours = [...state.negativeMapColours.filter(item => item.molNo !== action.payload.molNo), action.payload];
        },
        // API
        setPositiveMapColours: (state, action: PayloadAction<{ molNo: number; rgb: { r: number; g: number; b: number } }>) => {
            state.positiveMapColours = [...state.positiveMapColours.filter(item => item.molNo !== action.payload.molNo), action.payload];
        },
    },
});

export const {
    showMap,
    hideMap,
    setContourLevel,
    setMapRadius,
    setMapFastRadius,
    setMapAlpha,
    setMapStyle,
    setMapSlice,
    setMapSliceNodalLines,
    setMapSliceContourSpacing,
    changeMapRadius,
    setDefaultMapSamplingRate,
    setDefaultMapLitLines,
    setMapLineWidth,
    setDefaultMapSurface,
    setMapColours,
    setNegativeMapColours,
    setPositiveMapColours,
    changeContourLevel,
    setReContourMapOnlyOnMouseUp,
    resetMapContourSettings,
} = mapContourSettingsSlice.actions;

export default mapContourSettingsSlice.reducer;
