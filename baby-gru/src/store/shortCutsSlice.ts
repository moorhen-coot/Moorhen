import { createSlice } from "@reduxjs/toolkit";

const initialState: {
    shortcutOnHoveredAtom: boolean;
    showShortcutToast: boolean;
    shortCuts: string;
} = {
    shortcutOnHoveredAtom: null,
    showShortcutToast: null,
    shortCuts: null,
};

export const shortcutSettingsSlice = createSlice({
    name: "shortcutSettings",
    initialState: initialState,
    reducers: {
        resetShortcutSettings: () => {
            return initialState;
        },
        setShortcutOnHoveredAtom: (state, action: { payload: boolean; type: string }) => {
            return { ...state, shortcutOnHoveredAtom: action.payload };
        },
        setShowShortcutToast: (state, action: { payload: boolean; type: string }) => {
            return { ...state, showShortcutToast: action.payload };
        },
        setShortCuts: (state, action: { payload: string; type: string }) => {
            return { ...state, shortCuts: action.payload };
        },
    },
});

export const { setShowShortcutToast, setShortcutOnHoveredAtom, setShortCuts, resetShortcutSettings } =
    shortcutSettingsSlice.actions;

export default shortcutSettingsSlice.reducer;
