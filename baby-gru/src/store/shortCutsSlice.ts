import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState: {
    shortcutOnHoveredAtom: boolean;
    showShortcutToast: boolean;
    shortCuts: string;
} = {
    shortcutOnHoveredAtom: null,
    showShortcutToast: null,
    shortCuts: null,
};

const shortcutSettingsSlice = createSlice({
    name: "shortcutSettings",
    initialState: initialState,
    reducers: {
        resetShortcutSettings: () => {
            return initialState;
        },
        setShortcutOnHoveredAtom: (state, action: PayloadAction<boolean>) => {
            state.shortcutOnHoveredAtom = action.payload;
        },
        setShowShortcutToast: (state, action: PayloadAction<boolean>) => {
            state.showShortcutToast = action.payload;
        },
        setShortCuts: (state, action: PayloadAction<string>) => {
            state.shortCuts = action.payload;
        },
    },
});

export const { setShowShortcutToast, setShortcutOnHoveredAtom, setShortCuts, resetShortcutSettings } = shortcutSettingsSlice.actions;

export default shortcutSettingsSlice.reducer;
