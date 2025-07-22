import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { moorhen } from "../types/moorhen";

interface coreRefs {
    commandCentre: React.RefObject<moorhen.CommandCentre> | null;
    timeCapsule: React.RefObject<moorhen.TimeCapsule> | null;
}

const initialState: coreRefs = {
    commandCentre: null,
    timeCapsule: null
};

const coreRefsSlice = createSlice({
    name: 'coreRefs',
    initialState,
    reducers: {
        setCommandCentre: (state, action: PayloadAction<React.RefObject<moorhen.CommandCentre>>) => {
            state.commandCentre = action.payload;
        },
        setTimeCapsule: (state, action: PayloadAction<React.RefObject<moorhen.TimeCapsule>>) => {
            state.timeCapsule = action.payload;
        },
    }
});

export const { setCommandCentre, setTimeCapsule } = coreRefsSlice.actions;
export default coreRefsSlice.reducer;