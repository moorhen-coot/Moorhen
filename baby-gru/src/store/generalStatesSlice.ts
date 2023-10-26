import { createSlice } from '@reduxjs/toolkit'
import { moorhen } from '../types/moorhen'

export const generalStatesSlice = createSlice({
  name: 'generalStates',
  initialState: {
    devMode: null,
    userPreferencesMounted: false,
    appTitle: 'Moorhen',
    cootInitialized: false,
    notificationContent: null,
    activeMap: null,
    theme: 'flatly',
    viewOnly: false,
  },
  reducers: {
    setTheme: (state, action: {payload: string, type: string}) => {
      return {...state, theme: action.payload}
    },
    setNotificationContent: (state, action: {payload: JSX.Element, type: string}) => {
      return {...state, notificationContent: action.payload}
    },
    setViewOnly: (state, action: {payload: boolean, type: string}) => {
      return {...state, viewOnly: action.payload}
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
    setUserPreferencesMounted: (state, action: {payload: boolean, type: string}) => {
      return {...state, userPreferencesMounted: action.payload}
    },
    setDevMode: (state, action: {payload: boolean, type: string}) => {
        return {...state, devMode: action.payload}
    }
}})

export const {
  setNotificationContent, setActiveMap, setCootInitialized,
  setAppTittle, setUserPreferencesMounted, setDevMode, setTheme, setViewOnly
} = generalStatesSlice.actions

export default generalStatesSlice.reducer