import { createSlice } from '@reduxjs/toolkit'

export const defaultMapSettingsSlice = createSlice({
  name: 'mapSettings',
  initialState: {
    defaultMapSamplingRate: null,
    defaultMapLitLines: null,
    mapLineWidth: null,
    defaultMapSurface: null,
  },
  reducers: {
    setDefaultMapSamplingRate: (state, action: {payload: number, type: string}) => {
      return {...state, defaultMapSamplingRate: action.payload}
    },
    setDefaultMapLitLines: (state, action: {payload: boolean, type: string}) => {
      return {...state, defaultMapLitLines: action.payload}
    },
    setMapLineWidth: (state, action: {payload: number, type: string}) => {
        return {...state, mapLineWidth: action.payload}
    },
    setDefaultMapSurface: (state, action: {payload: boolean, type: string}) => {
      return {...state, defaultMapSurface: action.payload}
    },
}})

export const { setDefaultMapSamplingRate, setDefaultMapLitLines, setMapLineWidth, setDefaultMapSurface } = defaultMapSettingsSlice.actions

export default defaultMapSettingsSlice.reducer