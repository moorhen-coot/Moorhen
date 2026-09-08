import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState: {
    enableTimeCapsule: boolean;
    makeBackups: boolean;
    maxBackupCount: number;
    modificationCountBackupThreshold: number;
} = {
    enableTimeCapsule: null,
    makeBackups: null,
    maxBackupCount: null,
    modificationCountBackupThreshold: null,
};

const backupSettingsSlice = createSlice({
    name: "backupSettings",
    initialState: initialState,
    reducers: {
        // API
        resetBackupSettings: () => {
            return initialState;
        },
        // API
        setEnableTimeCapsule: (state, action: PayloadAction<boolean>) => {
            state.enableTimeCapsule = action.payload;
        },
        // API
        setMakeBackups: (state, action: PayloadAction<boolean>) => {
            state.makeBackups = action.payload;
        },
        // API
        setMaxBackupCount: (state, action: PayloadAction<number>) => {
            state.maxBackupCount = action.payload;
        },
        // API
        setModificationCountBackupThreshold: (state, action: PayloadAction<number>) => {
            state.modificationCountBackupThreshold = action.payload;
        },
    },
});

export const { setEnableTimeCapsule, setMakeBackups, setMaxBackupCount, setModificationCountBackupThreshold, resetBackupSettings } =
    backupSettingsSlice.actions;

export default backupSettingsSlice.reducer;
