import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const execAutoClipFogByZoom = (state: typeof initialState) => {
    const fieldDepthFront: number = 8;
    const fieldDepthBack: number = 21;
    state.fogStart = state.fogClipOffset - (state.zoom * fieldDepthFront);
    state.fogEnd = state.fogClipOffset + (state.zoom * fieldDepthBack);
    state.clipStart = state.zoom * fieldDepthFront;
    state.clipEnd = state.zoom * fieldDepthBack;
}

export const initialState: {
    defaultBackgroundColor: [number, number, number, number];
    origin: [number, number, number];
    zoom: number;
    drawScaleBar: boolean;
    drawCrosshairs: boolean;
    drawAxes: boolean;
    drawEnvBOcc: boolean;
    drawFPS: boolean;
    drawMissingLoops: boolean;
    fogClipOffset: number;
    fogStart: number;
    fogEnd: number;
    clipStart: number;
    clipEnd: number;
    doPerspectiveProjection: boolean;
    useOffScreenBuffers: boolean;
    depthBlurRadius: number;
    depthBlurDepth: number;
    lightPosition: [number, number, number, number];
    ambient: [number, number, number, number];
    specular: [number, number, number, number];
    diffuse: [number, number, number, number];
    specularPower: number;
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
    defaultBackgroundColor: [1, 1, 1, 1],
    origin: [0, 0, 0],
    zoom: 1.0,
    lightPosition: [25.0, 25.0, 50.0, 1.0],
    ambient: [0.2, 0.2, 0.2, 1.0],
    specular: [0.6, 0.6, 0.6, 1.0],
    diffuse: [1.0, 1.0, 1.0, 1.0],
    fogClipOffset: 250,
    fogStart: 250,
    fogEnd: 1250,
    clipStart: 0,
    clipEnd: 1000,
    specularPower: 64.0,
    drawScaleBar: false,
    drawCrosshairs: true,
    drawFPS: false,
    drawMissingLoops: true,
    defaultBondSmoothness: 2,
    drawAxes: false,
    drawEnvBOcc: false,
    doSSAO: false,
    doEdgeDetect: false,
    edgeDetectDepthThreshold: 1.3,
    edgeDetectNormalThreshold: 0.5,
    edgeDetectDepthScale: 2.0,
    edgeDetectNormalScale: 0.0,
    ssaoRadius: 0.4,
    ssaoBias: 1.0,
    resetClippingFogging: true,
    clipCap: true,
    doPerspectiveProjection: false,
    useOffScreenBuffers: false,
    doShadowDepthDebug: false,
    doShadow: false,
    doSpin: false,
    doThreeWayView: false,
    doSideBySideStereo: false,
    doMultiView: false,
    doCrossEyedStereo: false,
    doAnaglyphStereo: false,
    doOutline: false,
    depthBlurRadius: 3.0,
    depthBlurDepth: 0.5,
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

export type SceneSettingsState = typeof initialState;

/**
 * Fields that describe the viewport, camera or app theme rather than the look of a scene, so they
 * are not saved in scene presets.
 */
const NON_SCENE_KEYS = ["height", "width", "GlViewportHeight", "GlViewportWidth", "origin", "zoom", "isDark"] as const;

/** Fog and clipping planes: only saved when they are set by hand (resetClippingFogging off), else they follow the zoom */
const FOG_CLIP_KEYS: readonly string[] = ["fogStart", "fogEnd", "clipStart", "clipEnd"];

/** The scene settings saved in a scene preset: only the values that differ from the defaults */
export type SceneSettingsSnapshot = Partial<Omit<SceneSettingsState, (typeof NON_SCENE_KEYS)[number]>>;

type SceneKey = keyof SceneSettingsSnapshot;

const sceneKeys = (Object.keys(initialState) as (keyof SceneSettingsState)[]).filter(
    key => !(NON_SCENE_KEYS as readonly string[]).includes(key)
) as SceneKey[];

const isSameValue = (a: unknown, b: unknown): boolean => {
    if (Array.isArray(a) && Array.isArray(b)) {
        return a.length === b.length && a.every((value, i) => value === b[i]);
    }
    return a === b;
};

/** Whether a value can be stored in `key` (same type as its default), to reject malformed injected scenes */
const isValidValue = (key: SceneKey, value: unknown): boolean => {
    const defaultValue = initialState[key];
    if (Array.isArray(defaultValue)) {
        return Array.isArray(value) && value.length === defaultValue.length && value.every(item => typeof item === typeof defaultValue[0]);
    }
    return typeof value === typeof defaultValue;
};

/**
 * Snapshot the scene settings for a scene preset. Only values that differ from the defaults are
 * kept, so a snapshot stays valid when settings are added to or removed from the store.
 * @param sceneSettings - The current `sceneSettings` state.
 */
export const getSceneSettingsSnapshot = (sceneSettings: SceneSettingsState): SceneSettingsSnapshot => {
    const snapshot: Record<string, unknown> = {};
    for (const key of sceneKeys) {
        if (sceneSettings.resetClippingFogging && FOG_CLIP_KEYS.includes(key)) continue;
        const value = sceneSettings[key];
        if (!isSameValue(value, initialState[key])) {
            snapshot[key] = Array.isArray(value) ? [...value] : value;
        }
    }
    return snapshot as SceneSettingsSnapshot;
};

const sceneSettingsSlice = createSlice({
    name: "sceneSettings",
    initialState: initialState,
    reducers: {
        // API
        resetSceneSettings: (state) => {
            // Reset all scene settings, then restore the values that should survive.
            const height = state.height;
            const width = state.width;
            const glViewportHeight = state.GlViewportHeight;
            const glViewportWidth = state.GlViewportWidth;
            const zoom = state.zoom;
            const origin = state.origin;

            Object.assign(state, initialState);

            state.height = height;
            state.width = width;
            state.GlViewportHeight = glViewportHeight;
            state.GlViewportWidth = glViewportWidth;
            state.zoom = zoom;
            state.origin = origin;

            execAutoClipFogByZoom(state);
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
            // Smoothness is an enum (1 = Coarse, 2 = Nice, 3 = Smooth). Coerce any invalid
            // value (e.g. a stale slider-space value like 50 restored from preferences)
            // to the default 'Nice' so a corrupt stored value can never break rendering.
            state.defaultBondSmoothness = [1, 2, 3].includes(action.payload) ? action.payload : 2;
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
        // API 
        setLightPosition: (state, action: PayloadAction<[number, number, number, number]>) => {
            state.lightPosition = action.payload;
        },
        // API 
        setAmbient: (state, action: PayloadAction<[number, number, number, number]>) => {
            state.ambient = action.payload;
        },
        // API 
        setSpecular: (state, action: PayloadAction<[number, number, number, number]>) => {
            state.specular = action.payload;
        },
        // API 
        setDiffuse: (state, action: PayloadAction<[number, number, number, number]>) => {
            state.diffuse = action.payload;
        },
        // API 
        setSpecularPower: (state, action: PayloadAction<number>) => {
            state.specularPower = action.payload;
        },
        // API 
        setFogClipOffset: (state, action: PayloadAction<number>) => {
            state.fogClipOffset = action.payload;
        },
        // API 
        setFogStart: (state, action: PayloadAction<number>) => {
            state.fogStart = action.payload;
        },
        // API 
        setFogEnd: (state, action: PayloadAction<number>) => {
            state.fogEnd = action.payload;
        },
        // API
        setClipStart: (state, action: PayloadAction<number>) => {
            state.clipStart = action.payload;
        },
        // API
        setClipEnd: (state, action: PayloadAction<number>) => {
            state.clipEnd = action.payload;
        },
        // API
        /* Set the origin of the scene to the provided coordinates.
        @param value [number, number, number] X, Y, Z coordinates */
        setOrigin: (state, action: PayloadAction<[number, number, number]>) => {
            state.origin = action.payload;
        },
        // API
        /*@param zoom level 1 = 22A
         or A/22 */
        setZoom: (state, action: PayloadAction<number>) => {
            state.zoom = action.payload;
        },
        autoClipFogByZoom: (state) => {
            execAutoClipFogByZoom(state);
        },
        /* Apply a scene preset snapshot (see getSceneSettingsSnapshot). Settings missing from the
        snapshot go back to their default, unknown or malformed entries are ignored, and the
        viewport, camera and theme are left untouched. Fog and clipping are recomputed from the
        zoom unless the snapshot turns resetClippingFogging off. */
        applySceneSettingsSnapshot: (state, action: PayloadAction<SceneSettingsSnapshot>) => {
            const snapshot = action.payload ?? {};
            const target = state as Record<SceneKey, unknown>;
            for (const key of sceneKeys) {
                const value = snapshot[key];
                const useSaved = Object.hasOwn(snapshot, key) && isValidValue(key, value);
                const newValue = useSaved ? value : initialState[key];
                // Leave unchanged values alone: a new array reference would re-trigger renderer effects
                if (isSameValue(target[key], newValue)) continue;
                target[key] = Array.isArray(newValue) ? [...newValue] : newValue;
            }
            if (state.resetClippingFogging) execAutoClipFogByZoom(state);
        },

    },
});

export const {
    setOrigin,
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
    setLightPosition,
    setAmbient,
    setSpecular,
    setDiffuse,
    setSpecularPower,
    setFogClipOffset,
    setFogStart,
    setFogEnd,
    setClipStart,
    setClipEnd,
    setZoom,
    autoClipFogByZoom,
    applySceneSettingsSnapshot,
} = sceneSettingsSlice.actions;

export default sceneSettingsSlice.reducer;
