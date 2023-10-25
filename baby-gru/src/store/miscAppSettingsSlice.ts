import { createSlice } from '@reduxjs/toolkit'

export const miscAppSettings = createSlice({
  name: 'miscAppSettings',
  initialState: {
    defaultExpandDisplayCards: null,
    transparentModalsOnMouseOut: null,
    enableRefineAfterMod: null
  },
  reducers: {
    setDefaultExpandDisplayCards: (state, action: {payload: boolean, type: string}) => {
      return {...state, defaultExpandDisplayCards: action.payload}
    },
    setTransparentModalsOnMouseOut: (state, action: {payload: boolean, type: string}) => {
      return {...state, transparentModalsOnMouseOut: action.payload}
    },
    setEnableRefineAfterMod: (state, action: {payload: boolean, type: string}) => {
        return {...state, enableRefineAfterMod: action.payload}
    }
}})

export const { setDefaultExpandDisplayCards, setTransparentModalsOnMouseOut, setEnableRefineAfterMod } = miscAppSettings.actions

export default miscAppSettings.reducer