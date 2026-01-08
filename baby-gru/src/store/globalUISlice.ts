import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import type { PanelIDs } from "@/components/panels";

const initialState: {
    busy: boolean;
    isTimeCapsuleBusy: boolean;
    isGlobalInstanceReady: boolean;
    bottomPanelIsShown: boolean;
    isMainMenuOpen: boolean;
    isSearchBarActive: boolean;
    areShortcutsBlocked: boolean;
    shownSidePanel: PanelIDs | null;
} = {
    busy: false,
    isTimeCapsuleBusy: false,
    isGlobalInstanceReady: false,
    bottomPanelIsShown: true,
    isMainMenuOpen: true,
    isSearchBarActive: false,
    areShortcutsBlocked: false,
    shownSidePanel: null,
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
        setShownSidePanel: (state, action: PayloadAction<PanelIDs | null>) => {
            state.shownSidePanel = action.payload;
        },
    },
});

export const {
    setBusy,
    setTimeCapsuleBusy,
    setGlobalInstanceReady,
    setShowBottomPanel,
    setSearchBarActive,
    setMainMenuOpen,
    setShortCutsBlocked,
    setShownSidePanel,
} = globalUISlice.actions;
export default globalUISlice.reducer;
