import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  defaultExpandDisplayCards: null,
  transparentModalsOnMouseOut: null,
}

export const miscAppSettingsSlice = createSlice({
  name: 'miscAppSettings',
  initialState: initialState,
  reducers: {
    resetMiscAppSettings: (state) => {
      return initialState
    },
    setDefaultExpandDisplayCards: (state, action: {payload: boolean, type: string}) => {
      return {...state, defaultExpandDisplayCards: action.payload}
    },
    setTransparentModalsOnMouseOut: (state, action: {payload: boolean, type: string}) => {
      return {...state, transparentModalsOnMouseOut: action.payload}
    },
}})

export const { 
  setDefaultExpandDisplayCards, setTransparentModalsOnMouseOut, resetMiscAppSettings
} = miscAppSettingsSlice.actions

export default miscAppSettingsSlice.reducer