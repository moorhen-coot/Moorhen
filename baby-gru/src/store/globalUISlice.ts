import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import type { PanelIDs } from "@/components/panels";
import { ShownControl } from "@/components/snack-bar/PopupControls/PopupControlList";

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
    shownControl: ShownControl | null;
    controlLocked: number | null;
    selectionToolsActive: boolean;
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
    shownControl: null,
    controlLocked: null,
    selectionToolsActive: false,
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
        setShownControl: (state, action: PayloadAction<ShownControl | null>) => {
            if (state.controlLocked) return;

            if (action.payload) {
                state.shownControl = action.payload;
                if (action.payload.name === "selectionTools") {
                    state.selectionToolsActive = true;
                }
            } else {
                if (state.selectionToolsActive) {
                    state.shownControl = { name: "selectionTools" };
                } else {
                    state.shownControl = null;
                }
            }
        },
        lockControls: (state, action: PayloadAction<number>) => {
            state.controlLocked = action.payload;
        },
        unlockControls: (state, action: PayloadAction<number>) => {
            if (state.controlLocked === action.payload) {
                state.controlLocked = null;
            }
        },
        closeResidueSelectionTools: state => {
            state.selectionToolsActive = false;
            state.shownControl = null;
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
    setShownControl,
    lockControls,
    unlockControls,
    closeResidueSelectionTools,
} = globalUISlice.actions;
export default globalUISlice.reducer;
