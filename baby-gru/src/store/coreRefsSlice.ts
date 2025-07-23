import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { moorhen } from "../types/moorhen";

interface coreRefs {
    commandCentre: React.RefObject<moorhen.CommandCentre> | null;
    timeCapsule: React.RefObject<moorhen.TimeCapsule> | null;
    paths: {
        monomerLibrary: string;
        moorhenIcons: string;
    }
}

const initialState: coreRefs = {
    commandCentre: null,
    timeCapsule: null,
    paths: {
        monomerLibrary: '',
        moorhenIcons: ''
    }
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
        setPaths: (state, action: PayloadAction<{ monomerLibrary: string; moorhenIcons: string }>) => {
            state.paths = action.payload;
        },
        setMonomerLibraryPath: (state, action: PayloadAction<string>) => {
            state.paths.monomerLibrary = action.payload;
        },
        setMoorhenIconsPath: (state, action: PayloadAction<string>) => {
            state.paths.moorhenIcons = action.payload;
        }
    }
});

export const { setCommandCentre, setTimeCapsule, setPaths, setMonomerLibraryPath, setMoorhenIconsPath } = coreRefsSlice.actions;
export default coreRefsSlice.reducer;