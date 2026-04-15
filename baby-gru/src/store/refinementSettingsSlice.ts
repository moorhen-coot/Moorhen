import { createSlice } from "@reduxjs/toolkit";

const initialState: {
    useRamaRefinementRestraints: boolean;
    useTorsionRefinementRestraints: boolean;
    enableRefineAfterMod: boolean;
    animateRefine: boolean;
    refinementSelection: "SINGLE" | "TRIPLE" | "SPHERE";
} = {
    enableRefineAfterMod: null,
    animateRefine: null,
    useRamaRefinementRestraints: false,
    useTorsionRefinementRestraints: false,
    refinementSelection: "TRIPLE",
};

const refinementSettings = createSlice({
    name: "refinementSettings",
    initialState: initialState,
    reducers: {
        // API
        resetRefinementSettings: () => {
            return initialState;
        },
        // API
        setRefinementSelection: (state, action: { payload: "SINGLE" | "TRIPLE" | "SPHERE"; type: string }) => {
            return { ...state, refinementSelection: action.payload };
        },
        // API
        setAnimateRefine: (state, action: { payload: boolean; type: string }) => {
            return { ...state, animateRefine: action.payload };
        },
        // API
        setEnableRefineAfterMod: (state, action: { payload: boolean; type: string }) => {
            return { ...state, enableRefineAfterMod: action.payload };
        },
        // API
        setUseRamaRefinementRestraints: (state, action: { payload: boolean; type: string }) => {
            return { ...state, useRamaRefinementRestraints: action.payload };
        },
        // API
        setuseTorsionRefinementRestraints: (state, action: { payload: boolean; type: string }) => {
            return { ...state, useTorsionRefinementRestraints: action.payload };
        },
    },
});

export const {
    setAnimateRefine,
    setEnableRefineAfterMod,
    setUseRamaRefinementRestraints,
    setuseTorsionRefinementRestraints,
    setRefinementSelection,
    resetRefinementSettings,
} = refinementSettings.actions;

export default refinementSettings.reducer;
