import { createSlice } from '@reduxjs/toolkit'

const initialState = {
    defaultBackgroundColor: null,
    drawScaleBar: null,
    drawCrosshairs: null,
    drawFPS: null,
    drawMissingLoops: null,
    defaultBondSmoothness: null,
    drawAxes: null,
    drawEnvBOcc: null,
    doSSAO: null,
    doEdgeDetect: null,
    edgeDetectDepthThreshold: null,
    edgeDetectNormalThreshold: null,
    edgeDetectDepthScale: null,
    edgeDetectNormalScale: null,
    ssaoRadius: null,
    ssaoBias: null,
    resetClippingFogging: null,
    clipCap: null,
    doPerspectiveProjection: null,
    useOffScreenBuffers: null,
    doShadowDepthDebug: null,
    doShadow: null,
    doSpin: null,
    doThreeWayView: null,
    doSideBySideStereo: null,
    doMultiView: null,
    doCrossEyedStereo: null,
    doAnaglyphStereo: null,
    doOutline: null,
    depthBlurRadius: null,
    depthBlurDepth: null,
    height: 0,
    width: 0,
    isDark: false,
    backgroundColor: [1, 1, 1, 1],
}

export const sceneSettingsSlice = createSlice({
  name: 'sceneSettings',
  initialState: initialState,
  reducers: {
    resetSceneSettings: (state) => {
        return initialState
    },
    setDefaultBackgroundColor: (state, action: {payload: [number, number, number, number], type: string}) => {
        return {...state, defaultBackgroundColor: action.payload}
    },
    setDrawScaleBar: (state, action: {payload: boolean, type: string}) => {
      return {...state, drawScaleBar: action.payload}
    },
    setDrawEnvBOcc: (state, action: {payload: boolean, type: string}) => {
      return {...state, drawEnvBOcc: action.payload}
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
    setDoSSAO: (state, action: {payload: boolean, type: string}) => {
        return {...state, doSSAO: action.payload}
    },
    setDoEdgeDetect: (state, action: {payload: boolean, type: string}) => {
        return {...state, doEdgeDetect: action.payload}
    },
    setEdgeDetectDepthThreshold: (state, action: {payload: number, type: string}) => {
        return {...state, edgeDetectDepthThreshold: action.payload}
    },
    setEdgeDetectNormalThreshold: (state, action: {payload: number, type: string}) => {
        return {...state, edgeDetectNormalThreshold: action.payload}
    },
    setEdgeDetectDepthScale: (state, action: {payload: number, type: string}) => {
        return {...state, edgeDetectDepthScale: action.payload}
    },
    setEdgeDetectNormalScale: (state, action: {payload: number, type: string}) => {
        return {...state, edgeDetectNormalScale: action.payload}
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
    setDoSpin: (state, action: {payload: boolean, type: string}) => {
        return {...state, doSpin: action.payload}
    },
    setDoAnaglyphStereo: (state, action: {payload: boolean, type: string}) => {
        return {...state, doAnaglyphStereo: action.payload}
    },
    setDoCrossEyedStereo: (state, action: {payload: boolean, type: string}) => {
        return {...state, doCrossEyedStereo: action.payload}
    },
    setDoSideBySideStereo: (state, action: {payload: boolean, type: string}) => {
        return {...state, doSideBySideStereo: action.payload}
    },
    setDoMultiView: (state, action: {payload: boolean, type: string}) => {
        return {...state, doMultiView: action.payload}
    },
    setDoThreeWayView: (state, action: {payload: boolean, type: string}) => {
        return {...state, doThreeWayView: action.payload}
    },
    setSpecifyMultiViewRowsColumns: (state, action: {payload: boolean, type: string}) => {
        return {...state, specifyMultiViewRowsColumns: action.payload}
    },
    setMultiViewRows: (state, action: {payload: number, type: string}) => {
        return {...state, multiViewRows: action.payload}
    },
    setMultiViewColumns: (state, action: {payload: number, type: string}) => {
        return {...state, multiViewColumns: action.payload}
    },
    setThreeWayViewOrder: (state, action: {payload: string, type: string}) => {
        return {...state, threeWayViewOrder: action.payload}
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
    setBackgroundColor: (state, action: {payload: [number, number, number, number], type: string}) => {
        return {...state, backgroundColor: action.payload}
    },
    setHeight: (state, action: {payload: number, type: string}) => {
        return {...state, height: action.payload}
    },
    setWidth: (state, action: {payload: number, type: string}) => {
        return {...state, width: action.payload}
    },
    setIsDark: (state, action: {payload: boolean, type: string}) => {
        return {...state, isDark: action.payload}
    }
}})

export const {
    setDefaultBackgroundColor, setDrawCrosshairs, setDrawScaleBar, setDrawFPS, setDrawMissingLoops, setDefaultBondSmoothness,
    setDoSSAO, setSsaoRadius, setSsaoBias, setResetClippingFogging, setClipCap, resetSceneSettings, setEdgeDetectNormalScale,
    setUseOffScreenBuffers, setDoShadowDepthDebug, setDoShadow, setDoSpin, setDoOutline, setDepthBlurRadius, setBackgroundColor,
    setDepthBlurDepth, setDrawAxes, setDoPerspectiveProjection, setHeight, setWidth, setIsDark, setEdgeDetectDepthScale,
    setDoEdgeDetect, setEdgeDetectDepthThreshold, setEdgeDetectNormalThreshold, setDrawEnvBOcc, setDoAnaglyphStereo,
    setDoCrossEyedStereo, setDoSideBySideStereo, setDoThreeWayView, setDoMultiView, setMultiViewRows, setMultiViewColumns,
    setSpecifyMultiViewRowsColumns, setThreeWayViewOrder
} = sceneSettingsSlice.actions

export default sceneSettingsSlice.reducer
