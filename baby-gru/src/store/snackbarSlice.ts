import { PayloadAction, createSlice } from "@reduxjs/toolkit";

export type Snackbar = {
    message: string;
    variant: "success" | "error" | "warning" | "info";
    autoHideDuration: number | null;
    createdAt: number;
    uid: string;
};

const initialState: Snackbar[] = [];

const snackbarSlice = createSlice({
    name: "snackbar",
    initialState,
    reducers: {
        enqueueSnackbar: (
            state,
            action: PayloadAction<{
                message: string;
                variant?: "success" | "error" | "warning" | "info";
                autoHideDuration?: number | null;
            }>
        ) => {
            state.push({
                message: action.payload.message,
                variant: action.payload.variant || "info",
                autoHideDuration: action.payload.autoHideDuration ?? 6000,
                createdAt: Date.now(),
                uid: `${Date.now()}-${Math.random()}`,
            });
        },
        closeSnackbar: (state, action: PayloadAction<{ uid: string }>) => {
            const index = state.findIndex(snackbar => snackbar.uid === action.payload.uid);
            if (index !== -1) {
                state.splice(index, 1);
            }
        },
        clearSnackbar: state => {
            state.length = 0;
        },
    },
});

export const { enqueueSnackbar, closeSnackbar, clearSnackbar } = snackbarSlice.actions;
export default snackbarSlice.reducer;
