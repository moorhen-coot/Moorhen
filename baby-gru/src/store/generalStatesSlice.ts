import { createSlice } from '@reduxjs/toolkit'
import { moorhen } from '../types/moorhen'

export const generalStatesSlice = createSlice({
  name: 'generalStates',
  initialState: {
    devMode: null,
    userPreferencesMounted: false,
    busy: false,
    appTitle: 'Moorhen',
    cootInitialized: false,
    notificationContent: null,
    showToast: false,
    activeMap: null,
    activeMolecule: null,
    theme: 'flatly',
  },
  reducers: {
    setTheme: (state, action: {payload: string, type: string}) => {
      return {...state, theme: action.payload}
    },
    setNotificationContent: (state, action: {payload: JSX.Element, type: string}) => {
      return {...state, notificationContent: action.payload}
    },
    setShowToast: (state, action: {payload: boolean, type: string}) => {
      return {...state, showToast: action.payload}
    },
    setActiveMolecule: (state, action: {payload: moorhen.Molecule, type: string}) => {
      return {...state, activeMolecule: action.payload}
    },
    setActiveMap: (state, action: {payload: moorhen.Map, type: string}) => {
      return {...state, activeMap: action.payload}
    },
    setCootInitialized: (state, action: {payload: boolean, type: string}) => {
      return {...state, cootInitialized: action.payload}
    },
    setAppTittle: (state, action: {payload: string, type: string}) => {
      return {...state, appTitle: action.payload}
    },
    setBusy: (state, action: {payload: boolean, type: string}) => {
      return {...state, busy: action.payload}
    },
    setUserPreferencesMounted: (state, action: {payload: boolean, type: string}) => {
      return {...state, userPreferencesMounted: action.payload}
    },
    setDevMode: (state, action: {payload: boolean, type: string}) => {
        return {...state, devMode: action.payload}
    }
}})

export const {
  setNotificationContent, setShowToast, setActiveMap, setActiveMolecule, setCootInitialized,
  setAppTittle, setBusy, setUserPreferencesMounted, setDevMode, setTheme
} = generalStatesSlice.actions

export default generalStatesSlice.reducer