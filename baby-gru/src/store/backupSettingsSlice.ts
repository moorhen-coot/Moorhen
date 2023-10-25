import { createSlice } from '@reduxjs/toolkit'

export const backupSettings = createSlice({
  name: 'backupSettings',
  initialState: {
    enableTimeCapsule: null,
    makeBackups: null,
    maxBackupCount: null,
    modificationCountBackupThreshold: null
  },
  reducers: {
    setEnableTimeCapsule: (state, action: {payload: boolean, type: string}) => {
      return {...state, enableTimeCapsule: action.payload}
    },
    setMakeBackups: (state, action: {payload: boolean, type: string}) => {
      return {...state, makeBackups: action.payload}
    },
    setMaxBackupCount: (state, action: {payload: number, type: string}) => {
        return {...state, maxBackupCount: action.payload}
    },
    setModificationCountBackupThreshold: (state, action: {payload: number, type: string}) => {
        return {...state, modificationCountBackupThreshold: action.payload}
    }
}})

export const { setEnableTimeCapsule, setMakeBackups, setMaxBackupCount, setModificationCountBackupThreshold } = backupSettings.actions

export default backupSettings.reducer