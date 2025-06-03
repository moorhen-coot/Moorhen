import { createSlice } from '@reduxjs/toolkit'

interface FracPath {
    path:[number,number][]
    fillStyle?: string
    strokeStyle?: string
    drawStyle?: string
    gradientBoundary?: [number,number,number,number]
    gradientStops?: [number,string][]
}

interface SvgPath {
    path: string
    fillStyle?: string
    strokeStyle?: string
    drawStyle?: string
    gradientBoundary?: [number,number,number,number]
    gradientStops?: [number,string][]
}

interface TextFrac {
    x: number
    y: number
    text: string
    fontFamily: string
    fontPixelSize: number
    fillStyle?: string
    strokeStyle?: string
    drawStyle?: string
    lineWidth?: number
}

interface ImageSrcFrac {
    x: number
    y: number
    width: number
    height: number
    src: string
}

const initialState = {
    imageOverlayList: [],
    textOverlayList: [],
    svgPathOverlayList: [],
    fracPathOverlayList: [],
    callBacks: [],
}

export const overlaysSlice = createSlice({
  name: 'overlays',
  initialState: initialState,
  reducers: {
    addImageOverlay: (state, action: {payload: ImageSrcFrac, type: string}) => {
      state = { ...state, imageOverlayList: [...state.imageOverlayList, action.payload] }
      return state
    },
    addTextOverlay: (state, action: {payload: TextFrac, type: string}) => {
      state = { ...state, textOverlayList: [...state.textOverlayList, action.payload] }
      return state
    },
    addSvgPathOverlay: (state, action: {payload: SvgPath, type: string}) => {
      state = { ...state, svgPathOverlayList: [...state.svgPathOverlayList, action.payload] }
      return state
    },
    addFracPathOverlay: (state, action: {payload: FracPath, type: string}) => {
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
    addImageOverlay, addTextOverlay, addSvgPathOverlay, addFracPathOverlay, emptyOverlays, addCallback
} = overlaysSlice.actions

export default overlaysSlice.reducer
