import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState: {
    isInSharedSession: boolean;
    sharedSessionToken: string;
    showSharedSessionManager: boolean;
} = {
    isInSharedSession: false,
    sharedSessionToken: null,
    showSharedSessionManager: false,
};

const sharedSessionSlice = createSlice({
    name: "sharedSession",
    initialState: initialState,
    reducers: {
        resetSharedSession: () => {
            return initialState;
        },
        setIsInSharedSession: (state, action: PayloadAction<boolean>) => {
            state.isInSharedSession = action.payload;
        },
        setSharedSessionToken: (state, action: PayloadAction<string>) => {
            state.sharedSessionToken = action.payload;
        },
        setShowSharedSessionManager: (state, action: PayloadAction<boolean>) => {
            state.showSharedSessionManager = action.payload;
        },
    },
});

export const { setIsInSharedSession, setSharedSessionToken, setShowSharedSessionManager, resetSharedSession } = sharedSessionSlice.actions;

export default sharedSessionSlice.reducer;
