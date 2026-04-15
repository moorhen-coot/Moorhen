import { createSlice } from "@reduxjs/toolkit";

const initialState: {
    defaultBackgroundColor: [number, number, number, number];
    drawScaleBar: boolean;
    drawCrosshairs: boolean;
    drawAxes: boolean;
    drawEnvBOcc: boolean;
    drawFPS: boolean;
    drawMissingLoops: boolean;
    doPerspectiveProjection: boolean;
    useOffScreenBuffers: boolean;
    depthBlurRadius: number;
    depthBlurDepth: number;
    ssaoBias: number;
    ssaoRadius: number;
    doShadowDepthDebug: boolean;
    doShadow: boolean;
    doSSAO: boolean;
    doEdgeDetect: boolean;
    edgeDetectDepthThreshold: number;
    edgeDetectNormalThreshold: number;
    edgeDetectDepthScale: number;
    edgeDetectNormalScale: number;
    doOutline: boolean;
    doSpin: boolean;
    doThreeWayView: boolean;
    multiViewRows: number;
    multiViewColumns: number;
    threeWayViewOrder: string;
    specifyMultiViewRowsColumns: boolean;
    doSideBySideStereo: boolean;
    doMultiView: boolean;
    doCrossEyedStereo: boolean;
    doAnaglyphStereo: boolean;
    defaultBondSmoothness: number;
    resetClippingFogging: boolean;
    clipCap: boolean;
    backgroundColor: [number, number, number, number];
    height: number;
    width: number;
    GlViewportHeight: number;
    GlViewportWidth: number;
    isDark: boolean;
} = {
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
    GlViewportHeight: 0,
    GlViewportWidth: 0,
    isDark: false,
    backgroundColor: [1, 1, 1, 1],
    multiViewRows: 1,
    multiViewColumns: 1,
    threeWayViewOrder: "",
    specifyMultiViewRowsColumns: false,
};

export const sceneSettingsSlice = createSlice({
    name: "sceneSettings",
    initialState: initialState,
    reducers: {
        // API
        resetSceneSettings: () => {
            return initialState;
        },
        // API
        setDefaultBackgroundColor: (state, action: { payload: [number, number, number, number]; type: string }) => {
            return { ...state, defaultBackgroundColor: action.payload };
        },
        // API
        setDrawScaleBar: (state, action: { payload: boolean; type: string }) => {
            return { ...state, drawScaleBar: action.payload };
        },
        // API
        setDrawEnvBOcc: (state, action: { payload: boolean; type: string }) => {
            return { ...state, drawEnvBOcc: action.payload };
        },
        // API
        setDrawCrosshairs: (state, action: { payload: boolean; type: string }) => {
            return { ...state, drawCrosshairs: action.payload };
        },
        // API
        setDrawFPS: (state, action: { payload: boolean; type: string }) => {
            return { ...state, drawFPS: action.payload };
        },
        // API
        setDrawMissingLoops: (state, action: { payload: boolean; type: string }) => {
            return { ...state, drawMissingLoops: action.payload };
        },
        // API
        setDefaultBondSmoothness: (state, action: { payload: number; type: string }) => {
            return { ...state, defaultBondSmoothness: action.payload };
        },
        // API
        setDrawAxes: (state, action: { payload: boolean; type: string }) => {
            return { ...state, drawAxes: action.payload };
        },
        // API
        setDoSSAO: (state, action: { payload: boolean; type: string }) => {
            return { ...state, doSSAO: action.payload };
        },
        // API
        setDoEdgeDetect: (state, action: { payload: boolean; type: string }) => {
            return { ...state, doEdgeDetect: action.payload };
        },
        // API
        setEdgeDetectDepthThreshold: (state, action: { payload: number; type: string }) => {
            return { ...state, edgeDetectDepthThreshold: action.payload };
        },
        // API
        setEdgeDetectNormalThreshold: (state, action: { payload: number; type: string }) => {
            return { ...state, edgeDetectNormalThreshold: action.payload };
        },
        // API
        setEdgeDetectDepthScale: (state, action: { payload: number; type: string }) => {
            return { ...state, edgeDetectDepthScale: action.payload };
        },
        // API
        setEdgeDetectNormalScale: (state, action: { payload: number; type: string }) => {
            return { ...state, edgeDetectNormalScale: action.payload };
        },
        // API
        setSsaoRadius: (state, action: { payload: number; type: string }) => {
            return { ...state, ssaoRadius: action.payload };
        },
        // API
        setSsaoBias: (state, action: { payload: number; type: string }) => {
            return { ...state, ssaoBias: action.payload };
        },
        // API
        setResetClippingFogging: (state, action: { payload: boolean; type: string }) => {
            return { ...state, resetClippingFogging: action.payload };
        },
        // API
        setClipCap: (state, action: { payload: boolean; type: string }) => {
            return { ...state, clipCap: action.payload };
        },
        // API
        setDoPerspectiveProjection: (state, action: { payload: boolean; type: string }) => {
            return { ...state, doPerspectiveProjection: action.payload };
        },
        // API
        setUseOffScreenBuffers: (state, action: { payload: boolean; type: string }) => {
            return { ...state, useOffScreenBuffers: action.payload };
        },
        // API
        setDoShadowDepthDebug: (state, action: { payload: boolean; type: string }) => {
            return { ...state, doShadowDepthDebug: action.payload };
        },
        // API
        setDoShadow: (state, action: { payload: boolean; type: string }) => {
            return { ...state, doShadow: action.payload };
        },
        // API
        setDoSpin: (state, action: { payload: boolean; type: string }) => {
            return { ...state, doSpin: action.payload };
        },
        // API
        setDoAnaglyphStereo: (state, action: { payload: boolean; type: string }) => {
            return { ...state, doAnaglyphStereo: action.payload };
        },
        // API
        setDoCrossEyedStereo: (state, action: { payload: boolean; type: string }) => {
            return { ...state, doCrossEyedStereo: action.payload };
        },
        // API
        setDoSideBySideStereo: (state, action: { payload: boolean; type: string }) => {
            return { ...state, doSideBySideStereo: action.payload };
        },
        // API
        setDoMultiView: (state, action: { payload: boolean; type: string }) => {
            return { ...state, doMultiView: action.payload };
        },
        // API
        setDoThreeWayView: (state, action: { payload: boolean; type: string }) => {
            return { ...state, doThreeWayView: action.payload };
        },
        // API
        setSpecifyMultiViewRowsColumns: (state, action: { payload: boolean; type: string }) => {
            return { ...state, specifyMultiViewRowsColumns: action.payload };
        },
        // API
        setMultiViewRows: (state, action: { payload: number; type: string }) => {
            return { ...state, multiViewRows: action.payload };
        },
        // API
        setMultiViewColumns: (state, action: { payload: number; type: string }) => {
            return { ...state, multiViewColumns: action.payload };
        },
        // API
        setThreeWayViewOrder: (state, action: { payload: string; type: string }) => {
            return { ...state, threeWayViewOrder: action.payload };
        },
        // API
        setDoOutline: (state, action: { payload: boolean; type: string }) => {
            return { ...state, doOutline: action.payload };
        },
        // API
        setDepthBlurRadius: (state, action: { payload: number; type: string }) => {
            return { ...state, depthBlurRadius: action.payload };
        },
        // API
        setDepthBlurDepth: (state, action: { payload: number; type: string }) => {
            return { ...state, depthBlurDepth: action.payload };
        },
        // API
        setBackgroundColor: (state, action: { payload: [number, number, number, number]; type: string }) => {
            return { ...state, backgroundColor: action.payload };
        },
        // API
        setHeight: (state, action: { payload: number; type: string }) => {
            return { ...state, height: action.payload };
        },
        // API
        setWidth: (state, action: { payload: number; type: string }) => {
            return { ...state, width: action.payload };
        },
        // API
        setGlViewportHeight: (state, action: { payload: number; type: string }) => {
            return { ...state, GlViewportHeight: action.payload };
        },
        // API
        setGlViewportWidth: (state, action: { payload: number; type: string }) => {
            return { ...state, GlViewportWidth: action.payload };
        },
        // API
        setIsDark: (state, action: { payload: boolean; type: string }) => {
            return { ...state, isDark: action.payload };
        },
    },
});

export const {
    setDefaultBackgroundColor,
    setDrawCrosshairs,
    setDrawScaleBar,
    setDrawFPS,
    setDrawMissingLoops,
    setDefaultBondSmoothness,
    setDoSSAO,
    setSsaoRadius,
    setSsaoBias,
    setResetClippingFogging,
    setClipCap,
    resetSceneSettings,
    setEdgeDetectNormalScale,
    setUseOffScreenBuffers,
    setDoShadowDepthDebug,
    setDoShadow,
    setDoSpin,
    setDoOutline,
    setDepthBlurRadius,
    setBackgroundColor,
    setDepthBlurDepth,
    setDrawAxes,
    setDoPerspectiveProjection,
    setHeight,
    setWidth,
    setGlViewportHeight,
    setGlViewportWidth,
    setIsDark,
    setEdgeDetectDepthScale,
    setDoEdgeDetect,
    setEdgeDetectDepthThreshold,
    setEdgeDetectNormalThreshold,
    setDrawEnvBOcc,
    setDoAnaglyphStereo,
    setDoCrossEyedStereo,
    setDoSideBySideStereo,
    setDoThreeWayView,
    setDoMultiView,
    setMultiViewRows,
    setMultiViewColumns,
    setSpecifyMultiViewRowsColumns,
    setThreeWayViewOrder,
} = sceneSettingsSlice.actions;

export default sceneSettingsSlice.reducer;
