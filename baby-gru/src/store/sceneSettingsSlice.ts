import { createSlice, PayloadAction } from "@reduxjs/toolkit";

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
    useHBAO: boolean;      // HBAO prototype: horizon-based AO instead of sampled SSAO
    ssaoStrength: number;  // HBAO darkening 0..1
    ssaoQuality: number;   // HBAO quality tier: 0=Low, 1=Med, 2=High
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
    useHBAO: false,
    ssaoStrength: 1.0,
    ssaoQuality: 1,
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

const sceneSettingsSlice = createSlice({
    name: "sceneSettings",
    initialState: initialState,
    reducers: {
        // API
        resetSceneSettings: () => {
            return initialState;
        },
        // API
        setDefaultBackgroundColor: (state, action: PayloadAction<[number, number, number, number]>) => {
            state.defaultBackgroundColor = action.payload;
        },
        // API
        setDrawScaleBar: (state, action: PayloadAction<boolean>) => {
            state.drawScaleBar = action.payload;
        },
        // API
        setDrawEnvBOcc: (state, action: PayloadAction<boolean>) => {
            state.drawEnvBOcc = action.payload;
        },
        // API
        setDrawCrosshairs: (state, action: PayloadAction<boolean>) => {
            state.drawCrosshairs = action.payload;
        },
        // API
        setDrawFPS: (state, action: PayloadAction<boolean>) => {
            state.drawFPS = action.payload;
        },
        // API
        setDrawMissingLoops: (state, action: PayloadAction<boolean>) => {
            state.drawMissingLoops = action.payload;
        },
        // API
        setDefaultBondSmoothness: (state, action: PayloadAction<number>) => {
            state.defaultBondSmoothness = action.payload;
        },
        // API
        setDrawAxes: (state, action: PayloadAction<boolean>) => {
            state.drawAxes = action.payload;
        },
        // API
        setDoSSAO: (state, action: PayloadAction<boolean>) => {
            state.doSSAO = action.payload;
        },
        // API
        setDoEdgeDetect: (state, action: PayloadAction<boolean>) => {
            state.doEdgeDetect = action.payload;
        },
        // API
        setEdgeDetectDepthThreshold: (state, action: PayloadAction<number>) => {
            state.edgeDetectDepthThreshold = action.payload;
        },
        // API
        setEdgeDetectNormalThreshold: (state, action: PayloadAction<number>) => {
            state.edgeDetectNormalThreshold = action.payload;
        },
        // API
        setEdgeDetectDepthScale: (state, action: PayloadAction<number>) => {
            state.edgeDetectDepthScale = action.payload;
        },
        // API
        setEdgeDetectNormalScale: (state, action: PayloadAction<number>) => {
            state.edgeDetectNormalScale = action.payload;
        },
        // API
        setSsaoRadius: (state, action: PayloadAction<number>) => {
            state.ssaoRadius = action.payload;
        },
        // API
        setUseHBAO: (state, action: PayloadAction<boolean>) => {
            state.useHBAO = action.payload;
        },
        // API
        setSsaoStrength: (state, action: PayloadAction<number>) => {
            state.ssaoStrength = action.payload;
        },
        // API
        setSsaoQuality: (state, action: PayloadAction<number>) => {
            state.ssaoQuality = action.payload;
        },
        // API
        setSsaoBias: (state, action: PayloadAction<number>) => {
            state.ssaoBias = action.payload;
        },
        // API
        setResetClippingFogging: (state, action: PayloadAction<boolean>) => {
            state.resetClippingFogging = action.payload;
        },
        // API
        setClipCap: (state, action: PayloadAction<boolean>) => {
            state.clipCap = action.payload;
        },
        // API
        setDoPerspectiveProjection: (state, action: PayloadAction<boolean>) => {
            state.doPerspectiveProjection = action.payload;
        },
        // API
        setUseOffScreenBuffers: (state, action: PayloadAction<boolean>) => {
            state.useOffScreenBuffers = action.payload;
        },
        // API
        setDoShadowDepthDebug: (state, action: PayloadAction<boolean>) => {
            state.doShadowDepthDebug = action.payload;
        },
        // API
        setDoShadow: (state, action: PayloadAction<boolean>) => {
            state.doShadow = action.payload;
        },
        // API
        setDoSpin: (state, action: PayloadAction<boolean>) => {
            state.doSpin = action.payload;
        },
        // API
        setDoAnaglyphStereo: (state, action: PayloadAction<boolean>) => {
            state.doAnaglyphStereo = action.payload;
        },
        // API
        setDoCrossEyedStereo: (state, action: PayloadAction<boolean>) => {
            state.doCrossEyedStereo = action.payload;
        },
        // API
        setDoSideBySideStereo: (state, action: PayloadAction<boolean>) => {
            state.doSideBySideStereo = action.payload;
        },
        // API
        setDoMultiView: (state, action: PayloadAction<boolean>) => {
            state.doMultiView = action.payload;
        },
        // API
        setDoThreeWayView: (state, action: PayloadAction<boolean>) => {
            state.doThreeWayView = action.payload;
        },
        // API
        setSpecifyMultiViewRowsColumns: (state, action: PayloadAction<boolean>) => {
            state.specifyMultiViewRowsColumns = action.payload;
        },
        // API
        setMultiViewRows: (state, action: PayloadAction<number>) => {
            state.multiViewRows = action.payload;
        },
        // API
        setMultiViewColumns: (state, action: PayloadAction<number>) => {
            state.multiViewColumns = action.payload;
        },
        // API
        setThreeWayViewOrder: (state, action: PayloadAction<string>) => {
            state.threeWayViewOrder = action.payload;
        },
        // API
        setDoOutline: (state, action: PayloadAction<boolean>) => {
            state.doOutline = action.payload;
        },
        // API
        setDepthBlurRadius: (state, action: PayloadAction<number>) => {
            state.depthBlurRadius = action.payload;
        },
        // API
        setDepthBlurDepth: (state, action: PayloadAction<number>) => {
            state.depthBlurDepth = action.payload;
        },
        // API
        setBackgroundColor: (state, action: PayloadAction<[number, number, number, number]>) => {
            state.backgroundColor = action.payload;
        },
        // API
        setHeight: (state, action: PayloadAction<number>) => {
            state.height = action.payload;
        },
        // API
        setWidth: (state, action: PayloadAction<number>) => {
            state.width = action.payload;
        },
        // API
        setGlViewportHeight: (state, action: PayloadAction<number>) => {
            state.GlViewportHeight = action.payload;
        },
        // API
        setGlViewportWidth: (state, action: PayloadAction<number>) => {
            state.GlViewportWidth = action.payload;
        },
        // API
        setIsDark: (state, action: PayloadAction<boolean>) => {
            state.isDark = action.payload;
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
    setUseHBAO,
    setSsaoStrength,
    setSsaoQuality,
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
