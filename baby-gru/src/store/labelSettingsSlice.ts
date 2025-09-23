import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  atomLabelDepthMode: null,
  GLLabelsFontFamily: null,
  GLLabelsFontSize: null,
  availableFonts: []
}

export const labelSettingsSlice = createSlice({
  name: 'labelSettings',
  initialState: initialState,
  reducers: {
    resetLabelSettings: (state) => {
      return initialState
    },
    addAvailableFont: (state, action: {payload: string, type: string}) => {
      return {...state, availableFonts: [...state.availableFonts, action.payload]}
    },
    removeAvailableFont: (state, action: {payload: string, type: string}) => {
      return {...state, availableFonts: state.availableFonts.filter(item => item !== action.payload)}
    },
    emptyAvailableFonts: (state) => {
      return {...state, availableFonts: [ ]}
    },
    addAvailableFontList: (state, action: {payload: string[], type: string}) => {
      return {...state, availableFonts: [...state.availableFonts, ...action.payload]}
    },
    setAtomLabelDepthMode: (state, action: {payload: boolean, type: string}) => {
      return {...state, atomLabelDepthMode: action.payload}
    },
    setGLLabelsFontFamily: (state, action: {payload: string, type: string}) => {
      return {...state, GLLabelsFontFamily: action.payload}
    },
    setGLLabelsFontSize: (state, action: {payload: number, type: string}) => {
      return {...state, GLLabelsFontSize: action.payload}
    }
  }
})

export const { emptyAvailableFonts, addAvailableFontList, setAtomLabelDepthMode, setGLLabelsFontFamily, setGLLabelsFontSize, resetLabelSettings } = labelSettingsSlice.actions

export default labelSettingsSlice.reducer
