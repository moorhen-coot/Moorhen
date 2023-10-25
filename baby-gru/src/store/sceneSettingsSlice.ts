import { createSlice } from '@reduxjs/toolkit'

export const sceneSettingsSlice = createSlice({
  name: 'sceneSettings',
  initialState: {
    defaultBackgroundColor: null,
    drawCrosshairs: null,
    drawFPS: null,
    drawMissingLoops: null,
    defaultBondSmoothness: null,
    drawAxes: null,
    drawInteractions: null,
    doSSAO: null,
    ssaoRadius: null,
    ssaoBias: null,
    resetClippingFogging: null,
    clipCap: null,
    doPerspectiveProjection: null,
    useOffScreenBuffers: null,
    doShadowDepthDebug: null,
    doShadow: null,
    doSpinTest: null,
    doOutline: null,
    depthBlurRadius: null,
    depthBlurDepth: null,
  },
  reducers: {
    setDefaultBackgroundColor: (state, action: {payload: [number, number, number, number], type: string}) => {
        return {...state, defaultBackgroundColor: action.payload}
    },
    setDrawCrosshairs: (state, action: {payload: boolean, type: string}) => {
      return {...state, drawCrosshairs: action.payload}
    },
    setDrawFPS: (state, action: {payload: boolean, type: string}) => {
        return {...state, drawFPS: action.payload}
    },
    setDrawMissingLoops: (state, action: {payload: boolean, type: string}) => {
        return {...state, drawMissingLoops: action.payload}
    },
    setDefaultBondSmoothness: (state, action: {payload: number, type: string}) => {
        return {...state, defaultBondSmoothness: action.payload}
    },
    setDrawAxes: (state, action: {payload: boolean, type: string}) => {
        return {...state, drawAxes: action.payload}
    },
    setDrawInteractions: (state, action: {payload: boolean, type: string}) => {
        return {...state, drawInteractions: action.payload}
    },
    setDoSSAO: (state, action: {payload: boolean, type: string}) => {
        return {...state, doSSAO: action.payload}
    },
    setSsaoRadius: (state, action: {payload: number, type: string}) => {
        return {...state, ssaoRadius: action.payload}
    },
    setSsaoBias: (state, action: {payload: number, type: string}) => {
        return {...state, ssaoBias: action.payload}
    },
    setResetClippingFogging: (state, action: {payload: boolean, type: string}) => {
        return {...state, resetClippingFogging: action.payload}
    },
    setClipCap: (state, action: {payload: boolean, type: string}) => {
        return {...state, clipCap: action.payload}
    },
    setDoPerspectiveProjection: (state, action: {payload: boolean, type: string}) => {
        return {...state, doPerspectiveProjection: action.payload}
    },
    setUseOffScreenBuffers: (state, action: {payload: boolean, type: string}) => {
        return {...state, useOffScreenBuffers: action.payload}
    },
    setDoShadowDepthDebug: (state, action: {payload: boolean, type: string}) => {
        return {...state, doShadowDepthDebug: action.payload}
    },
    setDoShadow: (state, action: {payload: boolean, type: string}) => {
        return {...state, doShadow: action.payload}
    },
    setDoSpinTest: (state, action: {payload: boolean, type: string}) => {
        return {...state, doSpinTest: action.payload}
    },
    setDoOutline: (state, action: {payload: boolean, type: string}) => {
        return {...state, doOutline: action.payload}
    },
    setDepthBlurRadius: (state, action: {payload: number, type: string}) => {
        return {...state, depthBlurRadius: action.payload}
    },
    setDepthBlurDepth: (state, action: {payload: number, type: string}) => {
        return {...state, depthBlurDepth: action.payload}
    },

}})

export const {
    setDefaultBackgroundColor, setDrawCrosshairs, setDrawFPS, setDrawMissingLoops, setDefaultBondSmoothness,
    setDrawInteractions, setDoSSAO, setSsaoRadius, setSsaoBias, setResetClippingFogging, setClipCap,  
    setUseOffScreenBuffers, setDoShadowDepthDebug, setDoShadow, setDoSpinTest, setDoOutline, setDepthBlurRadius,
    setDepthBlurDepth, setDrawAxes, setDoPerspectiveProjection
} = sceneSettingsSlice.actions

export default sceneSettingsSlice.reducer