import { createSlice, PayloadAction } from "@reduxjs/toolkit";

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
        addAvailableFont: (state, action: PayloadAction<string>) => {
            state.availableFonts.push(action.payload);
        },
        removeAvailableFont: (state, action: PayloadAction<string>) => {
            state.availableFonts = state.availableFonts.filter(item => item !== action.payload);
        },
        emptyAvailableFonts: state => {
            state.availableFonts = [];
        },
        addAvailableFontList: (state, action: PayloadAction<string[]>) => {
            state.availableFonts.push(...action.payload);
        },
        // API
        setAtomLabelDepthMode: (state, action: PayloadAction<boolean>) => {
            state.atomLabelDepthMode = action.payload;
        },
        // API
        setGLLabelsFontFamily: (state, action: PayloadAction<string>) => {
            state.GLLabelsFontFamily = action.payload;
        },
        // API
        setGLLabelsFontSize: (state, action: PayloadAction<number>) => {
            state.GLLabelsFontSize = action.payload;
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
