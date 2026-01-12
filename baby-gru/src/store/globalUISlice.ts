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
    sidePanelWidth: number;
} = {
    busy: false,
    isTimeCapsuleBusy: false,
    isGlobalInstanceReady: false,
    bottomPanelIsShown: true,
    isMainMenuOpen: true,
    isSearchBarActive: false,
    areShortcutsBlocked: false,
    shownSidePanel: null,
    sidePanelWidth: 450,
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
        setSidePanelWidth: (state, action: PayloadAction<number>) => {
            state.sidePanelWidth = action.payload;
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
    setSidePanelWidth,
} = globalUISlice.actions;
export default globalUISlice.reducer;
