import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface userInterface {
    busy: boolean;
    isGlobalInstanceReady: boolean;
}

const initialState: userInterface = {
    busy: false,
    isGlobalInstanceReady: false
};

const globalUISlice = createSlice({
    name: 'globalUI',
    initialState,
    reducers: {
        setBusy: (state, action: PayloadAction<boolean>) => {
            state.busy = action.payload;
        },
        setGlobalInstanceReady: (state, action: PayloadAction<boolean>) => {
            state.isGlobalInstanceReady = action.payload;
        }
    }
});

export const { setBusy, setGlobalInstanceReady } = globalUISlice.actions;
export default globalUISlice.reducer;