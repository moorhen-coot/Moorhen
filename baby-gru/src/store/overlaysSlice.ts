import { createSlice } from '@reduxjs/toolkit'
import { moorhen } from '../types/moorhen'

const initialState = {
    imageOverlayList: [],
    latexOverlayList: [],
    textOverlayList: [],
    svgPathOverlayList: [],
    fracPathOverlayList: [],
    callBacks: [],
}

export const overlaysSlice = createSlice({
  name: 'overlays',
  initialState: initialState,
  reducers: {
    addImageOverlay: (state, action: {payload: moorhen.MoorhenOverlay2DImageSrcFrac, type: string}) => {
      state = { ...state, imageOverlayList: [...state.imageOverlayList, action.payload] }
      return state
    },
    addLatexOverlay: (state, action: {payload: moorhen.MoorhenOverlay2DLatexSrcFrac, type: string}) => {
      state = { ...state, latexOverlayList: [...state.latexOverlayList, action.payload] }
      return state
    },
    addTextOverlay: (state, action: {payload: moorhen.MoorhenOverlay2DTextFrac, type: string}) => {
      state = { ...state, textOverlayList: [...state.textOverlayList, action.payload] }
      return state
    },
    addSvgPathOverlay: (state, action: {payload: moorhen.MoorhenOverlay2DSvgPath, type: string}) => {
      state = { ...state, svgPathOverlayList: [...state.svgPathOverlayList, action.payload] }
      return state
    },
    addFracPathOverlay: (state, action: {payload: moorhen.MoorhenOverlay2DFracPath, type: string}) => {
      state = { ...state, fracPathOverlayList: [...state.fracPathOverlayList, action.payload] }
      return state
    },
    addCallback: (state, action: {payload: Function, type: string}) => {
      state = { ...state, callBacks: [...state.callBacks, action.payload] }
      return state
    },
    emptyOverlays: (state) => {
      return initialState
    },
}})

export const {
    addImageOverlay, addTextOverlay, addSvgPathOverlay, addFracPathOverlay, emptyOverlays, addCallback, addLatexOverlay
} = overlaysSlice.actions

export default overlaysSlice.reducer
