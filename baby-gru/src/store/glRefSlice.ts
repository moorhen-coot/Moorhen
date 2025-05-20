import { createSlice } from '@reduxjs/toolkit'
import { moorhen } from "../types/moorhen"
import { DisplayBuffer } from '../WebGLgComponents/displayBuffer'

const initialState = {
    origin: [0,0,0],
    requestDrawScene: false,
    requestBuildBuffers: false,
    isWebGL2: false,
    glCtx: null,
    activeMolecule: null,
    draggableMolecule: null,
    envUpdate: { switch: false },
    clearLabels: { switch: false },
    displayBuffers: [],
    hoverSize: 0.27,
    // These should probably be in sceneSettings slice. 
    // We'll move them in due course.
    lightPosition: [10.0, 10.0, 60.0, 1.0],
    ambient: [0.2, 0.2, 0.2, 1.0],
    specular: [0.6, 0.6, 0.6, 1.0],
    diffuse: [1.0, 1.0, 1.0, 1.0],
    specularPower: 64.0,
    zoom: 1.0,
    quat: [0.0,0.0,0.0,-1.0],
    fogClipOffset: 250,
    fogStart: 250,
    fogEnd: 1250,
    clipStart: 0,
    clipEnd: 1000,
    cursorPosition: [0,0],
    shortCutHelp: [],
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
    setGLCtx: (state, action: {payload: any, type: string}) => {
        return { ...state, glCtx: action.payload }
    },
    setActiveMolecule: (state, action: {payload: moorhen.Molecule, type: string}) => {
        return { ...state, activeMolecule: action.payload }
    },
    setDraggableMolecule: (state, action: {payload: moorhen.Molecule, type: string}) => {
        return { ...state, draggableMolecule: action.payload }
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
    setFogStart: (state, action: {payload: number, type: string}) => {
        return { ...state, fogStart: action.payload }
    },
    setFogEnd: (state, action: {payload: number, type: string}) => {
        return { ...state, fogEnd: action.payload }
    },
    setClipStart: (state, action: {payload: number, type: string}) => {
        return { ...state, clipStart: action.payload }
    },
    setClipEnd: (state, action: {payload: number, type: string}) => {
        return { ...state, clipEnd: action.payload }
    },
    setHoverSize: (state, action: {payload: number, type: string}) => {
        return { ...state, hoverSize: action.payload }
    },
    setCursorPosition: (state, action: {payload: [number,number], type: string}) => {
        return { ...state, cursorPosition: action.payload }
    },
    setShortCutHelp: (state, action: {payload: string[], type: string}) => {
        return { ...state, shortCutHelp: action.payload }
    },
    setDisplayBuffers: (state, action: {payload: DisplayBuffer[], type: string}) => {
        return { ...state, displayBuffers: action.payload }
    },
    triggerRedrawEnv: (state, action: {payload: boolean, type: string}) => {
        return { ...state,
            envUpdate: {
                switch: !state.envUpdate.switch
            }
        }
    },
    triggerClearLabels: (state, action: {payload: boolean, type: string}) => {
        return { ...state,
            clearLabels: {
                switch: !state.clearLabels.switch
            }
        }
    },
}})

export const { 
    setOrigin, setRequestDrawScene, setRequestBuildBuffers, setIsWebGL2, setActiveMolecule,
    setLightPosition, setAmbient, setSpecular, setDiffuse, setSpecularPower, setZoom,
    setQuat, setFogClipOffset, setFogStart, setFogEnd, setClipStart, setClipEnd, setCursorPosition,
    setShortCutHelp, setDraggableMolecule, triggerRedrawEnv, triggerClearLabels, setGLCtx,
    setDisplayBuffers, setHoverSize
} = glRefSlice.actions

export default glRefSlice.reducer
