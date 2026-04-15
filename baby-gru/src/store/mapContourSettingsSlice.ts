import { createSlice } from "@reduxjs/toolkit";
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

export const mapContourSettingsSlice = createSlice({
    name: "mapContourSettings",
    initialState: initialState,
    reducers: {
        resetMapContourSettings: () => {
            return initialState;
        },
        // API
        /* If true the map will not be re-contoured when moving around, only on mouse up. 
        helps performance on slower machines */
        setReContourMapOnlyOnMouseUp: (state, action: { payload: boolean; type: string }) => {
            state = { ...state, reContourMapOnlyOnMouseUp: action.payload };
            return state;
        },
        // API
        showMap: (state, action: { payload: MoorhenMap; type: string }) => {
            if (!state.visibleMaps.includes(action.payload.molNo))
                state = { ...state, visibleMaps: [...state.visibleMaps, action.payload.molNo] };
            return state;
        },
        // API
        hideMap: (state, action: { payload: MoorhenMap; type: string }) => {
            state = { ...state, visibleMaps: state.visibleMaps.filter(item => item !== action.payload.molNo) };
            return state;
        },
        // API
        setContourLevel: (state, action: { payload: { molNo: number; contourLevel: number }; type: string }) => {
            state = {
                ...state,
                contourLevels: [...state.contourLevels.filter(item => item.molNo !== action.payload.molNo), action.payload],
            };
            return state;
        },
        // API
        setMapRadius: (state, action: { payload: { molNo: number; radius: number }; type: string }) => {
            state = {
                ...state,
                mapRadii: [...state.mapRadii.filter(item => item.molNo !== action.payload.molNo), action.payload],
            };
            return state;
        },
        setMapFastRadius: (state, action: { payload: { molNo: number; radius: number | null }; type: string }) => {
            state = {
                ...state,
                mapFastRadii: [...state.mapFastRadii.filter(item => item.molNo !== action.payload.molNo), action.payload],
            };
            return state;
        },
        // API
        setMapAlpha: (state, action: { payload: { molNo: number; alpha: number }; type: string }) => {
            state = {
                ...state,
                mapAlpha: [...state.mapAlpha.filter(item => item.molNo !== action.payload.molNo), action.payload],
            };
            return state;
        },
        // API
        setMapStyle: (state, action: { payload: { molNo: number; style: "solid" | "lit-lines" | "lines" }; type: string }) => {
            state = {
                ...state,
                mapStyles: [...state.mapStyles.filter(item => item.molNo !== action.payload.molNo), action.payload],
            };
            return state;
        },

        changeContourLevel: (state, action: { payload: { molNo: number; factor: number }; type: string }) => {
            const map = state.contourLevels.find(item => item.molNo === action.payload.molNo);
            state = {
                ...state,
                contourLevels: [
                    ...state.contourLevels.filter(item => item.molNo !== action.payload.molNo),
                    { molNo: action.payload.molNo, contourLevel: map.contourLevel + action.payload.factor },
                ],
            };
            return state;
        },
        changeMapRadius: (state, action: { payload: { molNo: number; factor: number }; type: string }) => {
            const map = state.mapRadii.find(item => item.molNo === action.payload.molNo);
            state = {
                ...state,
                mapRadii: [
                    ...state.mapRadii.filter(item => item.molNo !== action.payload.molNo),
                    { molNo: action.payload.molNo, radius: map.radius + action.payload.factor },
                ],
            };
            return state;
        },
        // API
        setDefaultMapSamplingRate: (state, action: { payload: number; type: string }) => {
            return { ...state, defaultMapSamplingRate: action.payload };
        },
        // API
        setDefaultMapLitLines: (state, action: { payload: boolean; type: string }) => {
            return { ...state, defaultMapLitLines: action.payload };
        },
        // API
        setMapLineWidth: (state, action: { payload: number; type: string }) => {
            return { ...state, mapLineWidth: action.payload };
        },
        // API
        setDefaultMapSurface: (state, action: { payload: boolean; type: string }) => {
            return { ...state, defaultMapSurface: action.payload };
        },
        // API
        setMapColours: (state, action: { payload: { molNo: number; rgb: { r: number; g: number; b: number } }; type: string }) => {
            state = {
                ...state,
                mapColours: [...state.mapColours.filter(item => item.molNo !== action.payload.molNo), action.payload],
            };
            return state;
        },
        // API
        setNegativeMapColours: (state, action: { payload: { molNo: number; rgb: { r: number; g: number; b: number } }; type: string }) => {
            state = {
                ...state,
                negativeMapColours: [...state.negativeMapColours.filter(item => item.molNo !== action.payload.molNo), action.payload],
            };
            return state;
        },
        // API
        setPositiveMapColours: (state, action: { payload: { molNo: number; rgb: { r: number; g: number; b: number } }; type: string }) => {
            state = {
                ...state,
                positiveMapColours: [...state.positiveMapColours.filter(item => item.molNo !== action.payload.molNo), action.payload],
            };
            return state;
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
