import { createSlice } from '@reduxjs/toolkit'

export const generalStates = createSlice({
  name: 'generalStates',
  initialState: {
    devMode: null,
    userPreferencesMounted: false
  },
  reducers: {
    setUserPreferencesMounted: (state, action: {payload: boolean, type: string}) => {
      return {...state, userPreferencesMounted: action.payload}
    },
    setDevMode: (state, action: {payload: boolean, type: string}) => {
        return {...state, devMode: action.payload}
    }
}})

export const { setUserPreferencesMounted, setDevMode } = generalStates.actions

export default generalStates.reducer