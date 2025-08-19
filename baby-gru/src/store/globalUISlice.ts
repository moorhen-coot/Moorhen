import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface userInterface {
    busy: boolean;
    timeCapsuleBusy: boolean;
    isGlobalInstanceReady: boolean;
}

const initialState: userInterface = {
    busy: false,
    timeCapsuleBusy: false,
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
        },
        setTimeCapsuleBusy: (state, action: PayloadAction<boolean>) => {
            state.timeCapsuleBusy = action.payload;
        }
    }
});

export const { setBusy, setTimeCapsuleBusy, setGlobalInstanceReady } = globalUISlice.actions;
export default globalUISlice.reducer;