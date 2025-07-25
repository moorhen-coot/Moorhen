import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface userInterface {
    busy: boolean;
}

const initialState: userInterface = {
    busy: false
};

const globalUISlice = createSlice({
    name: 'globalUI',
    initialState,
    reducers: {
        setBusy: (state, action: PayloadAction<boolean>) => {
            state.busy = action.payload;
        }
    }
});

export const { setBusy } = globalUISlice.actions;
export default globalUISlice.reducer;