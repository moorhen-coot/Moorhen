import { createSlice } from '@reduxjs/toolkit'

export const miscAppSettings = createSlice({
  name: 'miscAppSettings',
  initialState: {
    defaultExpandDisplayCards: null,
    transparentModalsOnMouseOut: null,
  },
  reducers: {
    setDefaultExpandDisplayCards: (state, action: {payload: boolean, type: string}) => {
      return {...state, defaultExpandDisplayCards: action.payload}
    },
    setTransparentModalsOnMouseOut: (state, action: {payload: boolean, type: string}) => {
      return {...state, transparentModalsOnMouseOut: action.payload}
    },
}})

export const { 
  setDefaultExpandDisplayCards, setTransparentModalsOnMouseOut, 
} = miscAppSettings.actions

export default miscAppSettings.reducer