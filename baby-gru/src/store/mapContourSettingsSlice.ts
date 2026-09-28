import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { MoorhenMap } from "@/utils/MoorhenMap";
import { moorhen } from "../types/moorhen";

const initialState: {
    visibleMaps: number[];
    contourLevels: { molNo: number; contourLevel: number }[];
    mapRadii: { molNo: number; radius: number }[];
    mapFastRadii: { molNo: number; radius: number | null }[];
    mapAlpha: { molNo: number; alpha: number }[];
    mapStyles: { molNo: number; style: "solid" | "lit-lines" | "lines" }[];
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
        setMapStyle: (state, action: PayloadAction<{ molNo: number; style: "solid" | "lit-lines" | "lines" }>) => {
            state.mapStyles = [...state.mapStyles.filter(item => item.molNo !== action.payload.molNo), action.payload];
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
