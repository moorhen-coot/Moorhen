import { createSlice } from "@reduxjs/toolkit";

const initialState: {
    atomLabelDepthMode: boolean;
    GLLabelsFontFamily: string;
    GLLabelsFontSize: number;
    availableFonts: string[];
} = {
    atomLabelDepthMode: null,
    GLLabelsFontFamily: null,
    GLLabelsFontSize: null,
    availableFonts: [],
};

const labelSettingsSlice = createSlice({
    name: "labelSettings",
    initialState: initialState,
    reducers: {
        resetLabelSettings: () => {
            return initialState;
        },
        addAvailableFont: (state, action: { payload: string; type: string }) => {
            return { ...state, availableFonts: [...state.availableFonts, action.payload] };
        },
        removeAvailableFont: (state, action: { payload: string; type: string }) => {
            return { ...state, availableFonts: state.availableFonts.filter(item => item !== action.payload) };
        },
        emptyAvailableFonts: state => {
            return { ...state, availableFonts: [] };
        },
        addAvailableFontList: (state, action: { payload: string[]; type: string }) => {
            return { ...state, availableFonts: [...state.availableFonts, ...action.payload] };
        },
        // API
        setAtomLabelDepthMode: (state, action: { payload: boolean; type: string }) => {
            return { ...state, atomLabelDepthMode: action.payload };
        },
        // API
        setGLLabelsFontFamily: (state, action: { payload: string; type: string }) => {
            return { ...state, GLLabelsFontFamily: action.payload };
        },
        // API
        setGLLabelsFontSize: (state, action: { payload: number; type: string }) => {
            return { ...state, GLLabelsFontSize: action.payload };
        },
    },
});

export const {
    emptyAvailableFonts,
    addAvailableFontList,
    setAtomLabelDepthMode,
    setGLLabelsFontFamily,
    setGLLabelsFontSize,
    resetLabelSettings,
} = labelSettingsSlice.actions;

export default labelSettingsSlice.reducer;
