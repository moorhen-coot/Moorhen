import { createSlice } from '@reduxjs/toolkit'

interface SvgPath {
    path: string
    fillStyle?: string
    strokeStyle?: string
    fillOrStroke?: string
}

interface TextFrac {
    x: number
    y: number
    text: string
    font: string
    fillStyle?: string
    strokeStyle?: string
    fillOrStroke?: string
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
    pathOverlayList: [],
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
    addPathOverlay: (state, action: {payload: SvgPath, type: string}) => {
      state = { ...state, pathOverlayList: [...state.pathOverlayList, action.payload] }
      return state
    },
    emptyOverlays: (state) => {
      return initialState
    },
}})

export const {
    addImageOverlay, addTextOverlay, addPathOverlay, emptyOverlays
} = overlaysSlice.actions

export default overlaysSlice.reducer
