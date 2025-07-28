import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface userInterface {
    disableFileUpload: boolean;
}

const initialState: userInterface = {
    disableFileUpload: false
};

const setupSlice = createSlice({
    name: 'setup',
    initialState,
    reducers: {
        setDisableFileUpload: (state, action: PayloadAction<boolean>) => {
            state.disableFileUpload = action.payload;
        }
    }
});

export const { setDisableFileUpload } = setupSlice.actions;
export default setupSlice.reducer;