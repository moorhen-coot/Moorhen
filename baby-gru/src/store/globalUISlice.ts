import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface userInterface {
    busy: boolean;
    globalInstanceIsReady: boolean;
}

const initialState: userInterface = {
    busy: false,
    globalInstanceIsReady: false
};

const globalUISlice = createSlice({
    name: 'globalUI',
    initialState,
    reducers: {
        setBusy: (state, action: PayloadAction<boolean>) => {
            state.busy = action.payload;
        },
        setGlobalInstanceReady: (state, action: PayloadAction<boolean>) => {
            state.globalInstanceIsReady = action.payload;
        }
    }
});

export const { setBusy, setGlobalInstanceReady } = globalUISlice.actions;
export default globalUISlice.reducer;