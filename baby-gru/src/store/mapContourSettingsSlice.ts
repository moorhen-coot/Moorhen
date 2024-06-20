import { createSlice } from '@reduxjs/toolkit'
import { moorhen } from "../types/moorhen"

const initialState = {
  visibleMaps: [],
  contourLevels: [],
  mapRadii: [],
  mapStyles: [],
  mapAlpha: [],
  mapColours: [],
  negativeMapColours: [],
  positiveMapColours: [],
  defaultMapSamplingRate: null,
  defaultMapLitLines: null,
  mapLineWidth: null,
  defaultMapSurface: null,
  reContourMapOnlyOnMouseUp: null
}

export const mapContourSettingsSlice = createSlice({
  name: 'mapContourSettings',
  initialState: initialState,
  reducers: {
    resetMapContourSettings: (state) => {
      return initialState
    },
    setReContourMapOnlyOnMouseUp: (state, action: {payload: boolean, type: string}) => {
      state = { ...state, reContourMapOnlyOnMouseUp: action.payload }
      return state
    },
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
    changeContourLevel: (state, action: {payload: { molNo: number; factor: number }, type: string}) => {
      const map = state.contourLevels.find(item => item.molNo === action.payload.molNo)
      state = { ...state, contourLevels: [ ...state.contourLevels.filter(item => item.molNo !== action.payload.molNo), { molNo: action.payload.molNo, contourLevel: map.contourLevel + action.payload.factor } ] }
      return state
    },
    changeMapRadius: (state, action: {payload: { molNo: number; factor: number }, type: string}) => {
      const map = state.mapRadii.find(item => item.molNo === action.payload.molNo)
      state = { ...state, mapRadii: [ ...state.mapRadii.filter(item => item.molNo !== action.payload.molNo), { molNo: action.payload.molNo, radius: map.radius + action.payload.factor } ] }
      return state
    },
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
    setMapColours: (state, action: {payload: { molNo: number; rgb: {r: number, g: number, b: number} }, type: string}) => {
      state = { ...state, mapColours: [ ...state.mapColours.filter(item => item.molNo !== action.payload.molNo), action.payload ] }
      return state
    },
    setNegativeMapColours: (state, action: {payload: { molNo: number; rgb: {r: number, g: number, b: number} }, type: string}) => {
      state = { ...state, negativeMapColours: [ ...state.negativeMapColours.filter(item => item.molNo !== action.payload.molNo), action.payload ] }
      return state
    },
    setPositiveMapColours: (state, action: {payload: { molNo: number; rgb: {r: number, g: number, b: number} }, type: string}) => {
      state = { ...state, positiveMapColours: [ ...state.positiveMapColours.filter(item => item.molNo !== action.payload.molNo), action.payload ] }
      return state
    },
  },
})

export const {
  showMap, hideMap, setContourLevel, setMapRadius, setMapAlpha, setMapStyle, changeMapRadius,
  setDefaultMapSamplingRate, setDefaultMapLitLines, setMapLineWidth, setDefaultMapSurface,
  setMapColours, setNegativeMapColours, setPositiveMapColours, changeContourLevel,
  setReContourMapOnlyOnMouseUp, resetMapContourSettings
} = mapContourSettingsSlice.actions

export default mapContourSettingsSlice.reducer