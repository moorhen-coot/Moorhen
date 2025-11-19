import { PayloadAction, createSlice } from "@reduxjs/toolkit";

const initialState: {
    busy: boolean;
    isTimeCapsuleBusy: boolean;
    isGlobalInstanceReady: boolean;
    sidePanelIsShown: boolean;
    bottomPanelIsShown: boolean;
    isMainMenuOpen: boolean;
    isSearchBarActive: boolean;
    areShortcutsBlocked: boolean;
} = {
    busy: false,
    isTimeCapsuleBusy: false,
    isGlobalInstanceReady: false,
    sidePanelIsShown: false,
    bottomPanelIsShown: true,
    isMainMenuOpen: false,
    isSearchBarActive: false,
    areShortcutsBlocked: false,
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
        setShowBottomPanel: (state, action: PayloadAction<boolean>) => {
            state.bottomPanelIsShown = action.payload;
        },
        setMainMenuOpen: (state, action: PayloadAction<boolean>) => {
            state.isMainMenuOpen = action.payload;
        },
        setSearchBarActive: (state, action: PayloadAction<boolean>) => {
            state.isSearchBarActive = action.payload;
        },
        setShortCutsBlocked: (state, action: PayloadAction<boolean>) => {
            state.areShortcutsBlocked = action.payload;
        },
    },
});

export const {
    setBusy,
    setTimeCapsuleBusy,
    setGlobalInstanceReady,
    setShowSidePanel,
    setShowBottomPanel,
    setSearchBarActive,
    setMainMenuOpen,
    setShortCutsBlocked,
} = globalUISlice.actions;
export default globalUISlice.reducer;
