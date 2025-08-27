import { createSlice } from "@reduxjs/toolkit";

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

export const backupSettingsSlice = createSlice({
    name: "backupSettings",
    initialState: initialState,
    reducers: {
        resetBackupSettings: () => {
            return initialState;
        },
        setEnableTimeCapsule: (state, action: { payload: boolean; type: string }) => {
            return { ...state, enableTimeCapsule: action.payload };
        },
        setMakeBackups: (state, action: { payload: boolean; type: string }) => {
            return { ...state, makeBackups: action.payload };
        },
        setMaxBackupCount: (state, action: { payload: number; type: string }) => {
            return { ...state, maxBackupCount: action.payload };
        },
        setModificationCountBackupThreshold: (state, action: { payload: number; type: string }) => {
            return { ...state, modificationCountBackupThreshold: action.payload };
        },
    },
});

export const {
    setEnableTimeCapsule,
    setMakeBackups,
    setMaxBackupCount,
    setModificationCountBackupThreshold,
    resetBackupSettings,
} = backupSettingsSlice.actions;

export default backupSettingsSlice.reducer;
