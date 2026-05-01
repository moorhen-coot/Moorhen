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
        // API
        /* Display a message on the interface with the provided content and styling options.
        @message The content of the message to be displayed.
        @variant The styling variant for the message, which can be "success", "error", "warning", or "info". Defaults to "info" if not provided.
        @autoHideDuration The duration in milliseconds for which the message should be displayed before automatically hiding. If null, the message will not auto-hide. Defaults to 6000 milliseconds if not provided.
        @uid An optional unique identifier for the message. If not provided, a unique ID will be generated using the current timestamp and a random number. */
        enqueueSnackbar: (
            state,
            action: PayloadAction<{
                message: string;
                variant?: "success" | "error" | "warning" | "info";
                autoHideDuration?: number | null;
                uid?: string;
            }>
        ) => {
            state.push({
                message: action.payload.message,
                variant: action.payload.variant || "info",
                autoHideDuration: action.payload.autoHideDuration ?? 6000,
                createdAt: Date.now(),
                uid: action.payload.uid || `${Date.now()}-${Math.random()}`,
            });
        },
        // API
        // Remove the message with the specified unique identifier from the display.
        closeSnackbar: (state, action: PayloadAction<{ uid: string }>) => {
            const index = state.findIndex(snackbar => snackbar.uid === action.payload.uid);
            if (index !== -1) {
                state.splice(index, 1);
            }
        },
        // API
        // Clear all messages from the display.
        clearSnackbar: state => {
            state.length = 0;
        },
    },
});

export const { enqueueSnackbar, closeSnackbar, clearSnackbar } = snackbarSlice.actions;
export default snackbarSlice.reducer;
