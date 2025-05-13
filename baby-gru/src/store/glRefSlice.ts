import { createSlice } from '@reduxjs/toolkit'
import { moorhen } from "../types/moorhen"

const initialState = {
    origin: [0,0,0],
    requestDrawScene: false,
    requestBuildBuffers: false,
    isWebGL2: false,
    activeMolecule: null,
    // These should probably be in sceneSettings slice. 
    // We'll move them in due course.
    lightPosition: [10.0, 10.0, 60.0, 1.0],
    ambient: [0.2, 0.2, 0.2, 1.0],
    specular: [0.6, 0.6, 0.6, 1.0],
    diffuse: [1.0, 1.0, 1.0, 1.0],
    specularPower: 64.0,
    zoom: 1.0,
    quat: [0.0,0.0,0.0,-1.0],
    fogClipOffset: 250
    //TODO
    // fog
    // clip
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
    setIsWebGL2: (state, action: {payload: boolean, type: string}) => {
        return { ...state, isWebGL2: action.payload }
    },
    setActiveMolecule: (state, action: {payload: moorhen.Molecule, type: string}) => {
        return { ...state, activeMolecule: action.payload }
    },
    setLightPosition: (state, action: {payload: [number,number,number,number], type: string}) => {
        return { ...state, lightPosition: action.payload }
    },
    setAmbient: (state, action: {payload: [number,number,number,number], type: string}) => {
        return { ...state, ambient: action.payload }
    },
    setSpecular: (state, action: {payload: [number,number,number,number], type: string}) => {
        return { ...state, specular: action.payload }
    },
    setDiffuse: (state, action: {payload: [number,number,number,number], type: string}) => {
        return { ...state, diffuse: action.payload }
    },
    setSpecularPower: (state, action: {payload: number, type: string}) => {
        return { ...state, specularPower: action.payload }
    },
    setZoom: (state, action: {payload: number, type: string}) => {
        return { ...state, zoom: action.payload }
    },
    setQuat: (state, action: {payload: any[], type: string}) => {
        return { ...state, quat: action.payload }
    },
    setFogClipOffset: (state, action: {payload: number, type: string}) => {
        return { ...state, fogClipOffset: action.payload }
    },
}})

export const { 
    setOrigin, setRequestDrawScene, setRequestBuildBuffers, setIsWebGL2, setActiveMolecule,
    setLightPosition, setAmbient, setSpecular, setDiffuse, setSpecularPower, setZoom,
    setQuat, setFogClipOffset
} = glRefSlice.actions

export default glRefSlice.reducer
