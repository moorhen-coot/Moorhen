import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { ShadowMapQuality } from "../WebGLgComponents/mgWebGLParts/framebuffers";

const execAutoClipFogByZoom = (state: typeof initialState) => {
    const fieldDepthFront: number = 8;
    const fieldDepthBack: number = 21;
    state.fogStart = state.fogClipOffset - (state.zoom * fieldDepthFront);
    state.fogEnd = state.fogClipOffset + (state.zoom * fieldDepthBack);
    state.clipStart = state.zoom * fieldDepthFront;
    state.clipEnd = state.zoom * fieldDepthBack;
}

export const initialState: {
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
    /**
     * How many depth-peel layers to resolve transparency with.
     *
     * One per depth of transparent surface that needs separating. A single closed surface wants
     * two - its front and its back - while several contour levels of the same field drawn at
     * once want one per level. Each layer is a further pass over the transparent geometry, so
     * this is a direct trade of cost against how deep the transparency stays correct.
     */
    depthPeelLayers: number;
    /**
     * Whether the opaque scene is drawn once while depth peeling, rather than into every layer.
     *
     * Deliberately not in the persisted preferences: it exists so the two paths can be compared
     * on screen, and it should come back on after a reload rather than leaving someone stuck on
     * the slow path because they once turned it off.
     */
    peelOpaqueSeparately: boolean;
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
    /**
     * How finely shadows are resolved: "coarse", "nice" or "smooth".
     *
     * Named to match the mesh quality settings rather than quoting a texture size, which is a
     * number nobody outside the renderer should have to reason about. See SHADOW_MAP_TEXELS for
     * what each one costs.
     */
    shadowMapQuality: ShadowMapQuality;
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
    // Judged by eye on a molecular surface, then checked against a ribosome gaussian surface.
    // The radius is in angstroms now that the occlusion test works in eye space, so it means
    // something physical: how far away a neighbouring surface still shades this one. At 2.0 it
    // only caught the gaps between adjacent atoms, which reads as texture rather than depth.
    //
    // Large structures want more than this - the ribosome looks best nearer 10 angstroms and
    // strength 3, because its cavities are correspondingly bigger. A single default cannot suit
    // both, and these are the values that look right on the common case.
    ssaoRadius: 5.0,
    ssaoBias: 1.3,
    resetClippingFogging: true,
    clipCap: true,
    doPerspectiveProjection: false,
    useOffScreenBuffers: false,
    doShadowDepthDebug: false,
    doShadow: false,
    shadowMapQuality: "coarse",
    doSpin: false,
    doThreeWayView: false,
    doSideBySideStereo: false,
    doMultiView: false,
    doCrossEyedStereo: false,
    doAnaglyphStereo: false,
    doOutline: false,
    depthBlurRadius: 3.0,
    depthPeelLayers: 4,
    peelOpaqueSeparately: true,
    // Where the depth blur starts, in angstroms from the view centre; negative is towards the
    // viewer. Zero puts it on the rotation centre, which is what you are usually looking at.
    // This was a 0 to 1 fraction, so a saved value lands a fraction of an angstrom from centre -
    // near enough to the old "middle" that nothing jumps.
    depthBlurDepth: 0.0,
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
 * Fields that are not part of the look of a scene, so they are not saved in scene presets: the
 * viewport, camera and app theme, and the machine or debug settings kept as global user preferences
 * (switching scene must not change them).
 */
const NON_SCENE_KEYS = [
    "height",
    "width",
    "GlViewportHeight",
    "GlViewportWidth",
    "origin",
    "zoom",
    "isDark",
    "depthPeelLayers",
    "shadowMapQuality",
    "doShadowDepthDebug",
    "drawFPS",
    "defaultBondSmoothness",
] as const;

/** Fog and clipping planes: only saved when they are set by hand (resetClippingFogging off), else they follow the zoom */
const FOG_CLIP_KEYS: readonly string[] = ["fogStart", "fogEnd", "clipStart", "clipEnd"];

/** The scene settings saved in a scene preset: only the values that differ from the defaults */
export type SceneSettingsSnapshot = Partial<Omit<SceneSettingsState, (typeof NON_SCENE_KEYS)[number]>>;

type SceneKey = keyof SceneSettingsSnapshot;

const sceneKeys = (Object.keys(initialState) as (keyof SceneSettingsState)[]).filter(
    key => !(NON_SCENE_KEYS as readonly string[]).includes(key)
) as SceneKey[];

/**
 * Scene settings that are user preferences of each built-in scene ("Default.doSSAO",
 * "Model Building.doSSAO"), saved explicitly with the scene's save button. Add or remove a setting
 * here to make it a per-scene preference or not. See src/.roadmaps/scene-preferences.md.
 */
export const PER_SCENE_PREFERENCE_KEYS = [
    "drawCrosshairs",
    "drawMissingLoops",
    "resetClippingFogging",
    "clipCap",
    "doPerspectiveProjection",
    "drawAxes",
    "doShadow",
    "doOutline",
    "useOffScreenBuffers",
    "depthBlurRadius",
    "depthBlurDepth",
    "doSSAO",
    "ssaoRadius",
    "ssaoBias",
    "drawScaleBar",
    "doEdgeDetect",
    "edgeDetectDepthThreshold",
    "edgeDetectNormalThreshold",
    "edgeDetectDepthScale",
    "edgeDetectNormalScale",
    "fogClipOffset",
    "lightPosition",
    "ambient",
    "specular",
    "diffuse",
    "specularPower",
    "backgroundColor",
    "fogStart",
    "fogEnd",
    "clipStart",
    "clipEnd",
] as const satisfies readonly SceneKey[];

export type PerSceneKey = (typeof PER_SCENE_PREFERENCE_KEYS)[number];

/** The value of every per-scene preference of one scene */
export type PerSceneSettings = Pick<SceneSettingsState, PerSceneKey>;

/** Whether two values of a scene setting are the same (arrays compared item by item) */
export const isSameSceneSettingValue = (a: unknown, b: unknown): boolean => {
    if (Array.isArray(a) && Array.isArray(b)) {
        return a.length === b.length && a.every((value, i) => value === b[i]);
    }
    return a === b;
};

const copyValue = <T>(value: T): T => (Array.isArray(value) ? ([...value] as T) : value);

/**
 * The per-scene preference values of some scene settings (settings missing from a snapshot take
 * their default). While fog and clipping follow the zoom their planes are not part of the scene, so
 * they take `sceneDefaults`' values: zooming does not make a scene differ from its saved version.
 * @param sceneSettings - The `sceneSettings` state, or a scene snapshot.
 * @param sceneDefaults - The scene's default per-scene values.
 */
export const getPerSceneSettings = (sceneSettings: SceneSettingsSnapshot, sceneDefaults: PerSceneSettings): PerSceneSettings => {
    const autoFogClip = sceneSettings.resetClippingFogging ?? initialState.resetClippingFogging;
    const settings: Record<string, unknown> = {};
    for (const key of PER_SCENE_PREFERENCE_KEYS) {
        if (autoFogClip && FOG_CLIP_KEYS.includes(key)) {
            settings[key] = copyValue(sceneDefaults[key]);
        } else {
            settings[key] = copyValue(Object.hasOwn(sceneSettings, key) ? sceneSettings[key] : initialState[key]);
        }
    }
    return settings as PerSceneSettings;
};

/** Whether two sets of per-scene preference values are the same */
export const isSamePerSceneSettings = (a: PerSceneSettings, b: PerSceneSettings): boolean =>
    PER_SCENE_PREFERENCE_KEYS.every(key => isSameSceneSettingValue(a[key], b[key]));

/** Whether a value can be stored in `key` (same type as its default), to reject malformed injected scenes or stored preferences */
export const isValidSceneSettingValue = (key: keyof SceneSettingsSnapshot, value: unknown): boolean => {
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
        if (!isSameSceneSettingValue(value, initialState[key])) {
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
        /* Move the eye towards or away from the view centre, in angstroms. This is what sets how
           strongly a perspective view converges: close in, the far side of a molecule shrinks
           markedly; far off, the view approaches orthographic. The framing stays put, because the
           projection's scale is derived from the same distance, so this is a dolly zoom rather
           than a zoom. Fog moves with the eye so that it stays where it was on the molecule.
           Clip needs no adjustment, being measured from the centre already. No effect under
           orthographic projection. */
        setPerspectiveEyeDistance: (state, action: PayloadAction<number>) => {
            const delta = action.payload - state.fogClipOffset;
            state.fogClipOffset = action.payload;
            state.fogStart += delta;
            state.fogEnd += delta;
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
        setShadowMapQuality: (state, action: PayloadAction<ShadowMapQuality>) => {
            state.shadowMapQuality = action.payload;
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
        setDepthPeelLayers: (state, action: PayloadAction<number>) => {
            state.depthPeelLayers = action.payload;
        },
        // API
        setPeelOpaqueSeparately: (state, action: PayloadAction<boolean>) => {
            state.peelOpaqueSeparately = action.payload;
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
                const useSaved = Object.hasOwn(snapshot, key) && isValidSceneSettingValue(key, value);
                const newValue = useSaved ? value : initialState[key];
                // Leave unchanged values alone: a new array reference would re-trigger renderer effects
                if (isSameSceneSettingValue(target[key], newValue)) continue;
                target[key] = Array.isArray(newValue) ? [...newValue] : newValue;
            }
            if (state.resetClippingFogging) execAutoClipFogByZoom(state);
        },

    },
});

export const {
    setOrigin,
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
    setShadowMapQuality,
    setDoSpin,
    setDoOutline,
    setDepthBlurRadius,
    setDepthPeelLayers,
    setPeelOpaqueSeparately,
    setBackgroundColor,
    setDepthBlurDepth,
    setDrawAxes,
    setDoPerspectiveProjection,
    setPerspectiveEyeDistance,
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
