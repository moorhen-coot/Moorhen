import { createSlice } from '@reduxjs/toolkit'

const initialState = {
    origin: [0,0,0],
    requestDrawScene: false,
    requestBuildBuffers: false
}

export const glRefSlice = createSlice({
  name: 'glRef',
  initialState: initialState,
  reducers: {
    setOrigin: (state, action: {payload: [number,number,number], type: string}) => {
        return { ...state, origin: action.payload }
    },
    setRequestDrawScene: (state, action: {payload: boolean, type: string}) => {
        return { ...state, requestDrawScene: action.payload }
    },
    setRequestBuildBuffers: (state, action: {payload: boolean, type: string}) => {
        return { ...state, requestBuildBuffers: action.payload }
    },
}})

export const {
    setOrigin, setRequestDrawScene, setRequestBuildBuffers
} = glRefSlice.actions

export default glRefSlice.reducer
