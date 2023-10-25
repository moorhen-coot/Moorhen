import { createSlice } from '@reduxjs/toolkit'

export const canvasSettingsSlice = createSlice({
  name: 'canvasStates',
  initialState: {
    height: 0,
    width: 0,
    isDark: false,
    backgroundColor: [1, 1, 1, 1],
  },
  reducers: {
    setBackgroundColor: (state, action: {payload: [number, number, number, number], type: string}) => {
      return {...state, backgroundColor: action.payload}
    },
    setHeight: (state, action: {payload: number, type: string}) => {
      return {...state, height: action.payload}
    },
    setWidth: (state, action: {payload: number, type: string}) => {
      return {...state, width: action.payload}
    },
    setIsDark: (state, action: {payload: boolean, type: string}) => {
      return {...state, isDark: action.payload}
    }
  }
})

export const { setHeight, setWidth, setIsDark, setBackgroundColor } = canvasSettingsSlice.actions

export default canvasSettingsSlice.reducer