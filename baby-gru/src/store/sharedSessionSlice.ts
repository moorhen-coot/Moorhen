import { createSlice } from "@reduxjs/toolkit";

const initialState: {
    isInSharedSession: boolean;
    sharedSessionToken: string;
    showSharedSessionManager: boolean;
} = {
    isInSharedSession: false,
    sharedSessionToken: null,
    showSharedSessionManager: false,
};

export const sharedSessionSlice = createSlice({
    name: "sharedSession",
    initialState: initialState,
    reducers: {
        resetSharedSession: () => {
            return initialState;
        },
        setIsInSharedSession: (state, action: { payload: boolean; type: string }) => {
            return { ...state, isInSharedSession: action.payload };
        },
        setSharedSessionToken: (state, action: { payload: string; type: string }) => {
            return { ...state, sharedSessionToken: action.payload };
        },
        setShowSharedSessionManager: (state, action: { payload: boolean; type: string }) => {
            return { ...state, showSharedSessionManager: action.payload };
        },
    },
});

export const { setIsInSharedSession, setSharedSessionToken, setShowSharedSessionManager, resetSharedSession } =
    sharedSessionSlice.actions;

export default sharedSessionSlice.reducer;
