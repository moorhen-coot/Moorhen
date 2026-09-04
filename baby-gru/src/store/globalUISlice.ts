import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { BottomPanelIDs, SidePanelIDs } from "@/components/panels";
import { ShownControl } from "@/components/snack-bars/PopupControls/PopupControlList";


const initialState: {
    busy: boolean;
    isTimeCapsuleBusy: boolean;
    isGlobalInstanceReady: boolean;
    isMainMenuOpen: boolean;
    isSearchBarActive: boolean;
    areShortcutsBlocked: boolean;
    shownSidePanel: SidePanelIDs | null;
    sidePanelWidth: number;
    bottomPanelHeight: number | null;
    shownControl: ShownControl | null;
    controlLocked: number | null;
    selectionToolsActive: boolean;
    clickAwayListenerPauseCount: number;
} = {
    busy: false,
    isTimeCapsuleBusy: false,
    isGlobalInstanceReady: false,
    isMainMenuOpen: true,
    isSearchBarActive: false,
    areShortcutsBlocked: false,
    shownSidePanel: null,
    sidePanelWidth: 450,
    bottomPanelHeight: 0,
    shownControl: null,
    controlLocked: null,
    selectionToolsActive: false,
    clickAwayListenerPauseCount: 0,
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
        setMainMenuOpen: (state, action: PayloadAction<boolean>) => {
            state.isMainMenuOpen = action.payload;
        },
        setSearchBarActive: (state, action: PayloadAction<boolean>) => {
            state.isSearchBarActive = action.payload;
        },
        // API
        /* Block or unblock shortcuts globally. This is used to prevent shortcut actions from being triggered when the user is typing in an input field, for example. */
        setShortCutsBlocked: (state, action: PayloadAction<boolean>) => {
            state.areShortcutsBlocked = action.payload;
        },
        // API
        /* Display the side panel corresponding to the provided ID, or hide the side panel if the payload is null. 
        @value SidePanelIDs | null */
        setShownSidePanel: (state, action: PayloadAction<SidePanelIDs | null>) => {
            state.shownSidePanel = action.payload;
        },
        // API
        setSidePanelWidth: (state, action: PayloadAction<number>) => {
            state.sidePanelWidth = action.payload;
        },
        setBottomPanelHeight: (state, action: PayloadAction<number>) => {
            state.bottomPanelHeight = action.payload;
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
        // Reference-counted pausing: independent pauses stack, and an early resume can
        // never leave the click-away listeners disabled for the remaining pauses (the
        // original "listener never re-activated" bug).
        pauseClickAwayListener: state => {
            state.clickAwayListenerPauseCount += 1;
        },
        resumeClickAwayListener: state => {
            state.clickAwayListenerPauseCount = Math.max(0, state.clickAwayListenerPauseCount - 1);
        },
    }
});

export const {
    setBusy,
    setTimeCapsuleBusy,
    setGlobalInstanceReady,
    setSearchBarActive,
    setMainMenuOpen,
    setShortCutsBlocked,
    setShownSidePanel,
    setSidePanelWidth,
    setBottomPanelHeight,
    setShownControl,
    lockControls,
    unlockControls,
    closeResidueSelectionTools,
    pauseClickAwayListener,
    resumeClickAwayListener,
} = globalUISlice.actions;
export default globalUISlice.reducer;
