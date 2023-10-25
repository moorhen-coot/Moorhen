import { createSlice } from '@reduxjs/toolkit'

export const canvasSettingsSlice = createSlice({
  name: 'canvasStates',
  initialState: {
    height: 0,
    width: 0,
    isDark: false
  },
  reducers: {
    setHeight: (state: { height: number; width: number; isDark: boolean }, action: {payload: number, type: string}) => {
      return {...state, height: action.payload}
    },
    setWidth: (state: { height: number; width: number; isDark: boolean }, action: {payload: number, type: string}) => {
      return {...state, width: action.payload}
    },
    setIsDark: (state: { height: number; width: number; isDark: boolean }, action: {payload: boolean, type: string}) => {
      return {...state, isDark: action.payload}
    }
  }
})

export const { setHeight, setWidth, setIsDark } = canvasSettingsSlice.actions

export default canvasSettingsSlice.reducer