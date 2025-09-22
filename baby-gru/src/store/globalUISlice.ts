import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState: {
    busy: boolean;
    isTimeCapsuleBusy: boolean;
    isGlobalInstanceReady: boolean;
    sidePanelIsShown: boolean;
} = {
    busy: false,
    isTimeCapsuleBusy: false,
    isGlobalInstanceReady: false,
    sidePanelIsShown: false,
};

const globalUISlice = createSlice({
    name: "globalUI",
    initialState,
    reducers: {
        setBusy: (state, action: PayloadAction<boolean>) => {
            state.busy = action.payload;
        },
        setGlobalInstanceReady: (state, action: PayloadAction<boolean>) => {
            state.isGlobalInstanceReady = action.payload;
        },
        setTimeCapsuleBusy: (state, action: PayloadAction<boolean>) => {
            state.isTimeCapsuleBusy = action.payload;
        },
        setShowSidePanel: (state, action: PayloadAction<boolean>) => {
            state.sidePanelIsShown = action.payload;
        },
    },
});

export const { setBusy, setTimeCapsuleBusy, setGlobalInstanceReady, setShowSidePanel } = globalUISlice.actions;
export default globalUISlice.reducer;
