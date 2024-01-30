import { createSlice } from '@reduxjs/toolkit'

export const miscAppSettings = createSlice({
  name: 'miscAppSettings',
  initialState: {
    defaultExpandDisplayCards: null,
    transparentModalsOnMouseOut: null,
    enableRefineAfterMod: null,
    animateRefine: null,
  },
  reducers: {
    setAnimateRefine: (state, action: {payload: boolean, type: string}) => {
      return {...state, animateRefine: action.payload}
    },
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

export const { 
  setDefaultExpandDisplayCards, setTransparentModalsOnMouseOut, 
  setEnableRefineAfterMod, setAnimateRefine
} = miscAppSettings.actions

export default miscAppSettings.reducer