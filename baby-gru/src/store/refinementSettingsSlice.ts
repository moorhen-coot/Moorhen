import { createSlice, PayloadAction } from "@reduxjs/toolkit";

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
        setRefinementSelection: (state, action: PayloadAction<"SINGLE" | "TRIPLE" | "SPHERE">) => {
            state.refinementSelection = action.payload;
        },
        // API
        setAnimateRefine: (state, action: PayloadAction<boolean>) => {
            state.animateRefine = action.payload;
        },
        // API
        setEnableRefineAfterMod: (state, action: PayloadAction<boolean>) => {
            state.enableRefineAfterMod = action.payload;
        },
        // API
        setUseRamaRefinementRestraints: (state, action: PayloadAction<boolean>) => {
            state.useRamaRefinementRestraints = action.payload;
        },
        // API
        setuseTorsionRefinementRestraints: (state, action: PayloadAction<boolean>) => {
            state.useTorsionRefinementRestraints = action.payload;
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
