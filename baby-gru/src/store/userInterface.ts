import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface userInterface {
    busy: boolean;
}

const initialState: userInterface = {
    busy: false
};

const userInterfaceSlice = createSlice({
    name: 'userInterface',
    initialState,
    reducers: {
        setBusy: (state, action: PayloadAction<boolean>) => {
            state.busy = action.payload;
        }
    }
});

export const { setBusy } = userInterfaceSlice.actions;
export default userInterfaceSlice.reducer;