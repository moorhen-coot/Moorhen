import { createSlice } from '@reduxjs/toolkit'
import { moorhen } from "../types/moorhen"

export const mapContourSettingsSlice = createSlice({
  name: 'mapContourSettings',
  initialState: {
    visibleMaps: [],
    contourLevels: [],
    mapRadii: [],
    mapStyles: [],
    mapAlpha: []
  },
  reducers: {
    showMap: (state, action: {payload: moorhen.Map, type: string}) => {
        if (!state.visibleMaps.includes(action.payload.molNo)) state = { ...state, visibleMaps: [...state.visibleMaps, action.payload.molNo] }
        return state
    },
    hideMap: (state, action: {payload: moorhen.Map, type: string}) => {
      state = { ...state, visibleMaps: state.visibleMaps.filter(item => item !== action.payload.molNo) }
      return state
    },
    setContourLevel: (state, action: {payload: { molNo: number; contourLevel: number }, type: string}) => {
      state = { ...state, contourLevels: [ ...state.contourLevels.filter(item => item.molNo !== action.payload.molNo), action.payload ] }
      return state
    },
    setMapRadius: (state, action: {payload: { molNo: number; radius: number }, type: string}) => {
      state = { ...state, mapRadii: [ ...state.mapRadii.filter(item => item.molNo !== action.payload.molNo), action.payload ] }
      return state
    },
    setMapAlpha: (state, action: {payload: { molNo: number; alpha: number }, type: string}) => {
      state = { ...state, mapAlpha: [ ...state.mapAlpha.filter(item => item.molNo !== action.payload.molNo), action.payload ] }
      return state
    },
    setMapStyle: (state, action: {payload: { molNo: number; style: "solid" | "lit-lines" | "lines" }, type: string}) => {
      state = { ...state, mapStyles: [ ...state.mapStyles.filter(item => item.molNo !== action.payload.molNo), action.payload ] }
      return state
    },
    changeMapRadius: (state, action: {payload: { molNo: number; factor: number }, type: string}) => {
      const map = state.mapRadii.find(item => item.molNo === action.payload.molNo)
      state = { ...state, mapRadii: [ ...state.mapRadii.filter(item => item.molNo !== action.payload.molNo), { molNo: action.payload.molNo, radius: map.radius + action.payload.factor } ] }
      return state
    },
  },
})

export const { showMap, hideMap, setContourLevel, setMapRadius, setMapAlpha, setMapStyle, changeMapRadius } = mapContourSettingsSlice.actions

export default mapContourSettingsSlice.reducer