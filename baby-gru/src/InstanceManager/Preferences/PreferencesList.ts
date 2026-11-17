/**
 * A mapping of user preferences for the application, where each entry defines a configurable setting.
 * Each preference is represented by a {@link PreferenceEntry} object, which includes:
 * - `label`: The unique string identifier for the preference.
 * - `valueSetter`: The Redux action creator used to update the preference value.
 * - `selector`: A function to select the current value from the Redux state.
 * - `defaultValue`: The default value for the preference.
 *
 * ## How to add a new preference
 * 1. Create a new Redux action and selector for your setting if they do not already exist.
 * 2. Add a new entry to the `PREFERENCES_MAP` object with a unique numeric key.
 * 3. Set the `label` to a unique string identifier for your preference.
 * 4. Set the `valueSetter` to your Redux action creator.
 * 5. Set the `selector` to a function that retrieves the value from the Redux state.
 * 6. Set the `defaultValue` to the desired default.
 *
 * A scene setting that should be a preference of each built-in scene goes in
 * `PER_SCENE_PREFERENCE_KEYS` (sceneSettingsSlice.ts) instead: its entries are generated.
 *
 * @example
 * ```typescript
 * 52: {
 *   label: "myNewPreference",
 *   valueSetter: setMyNewPreference,
 *   selector: (state: RootState) => state.mySettings.myNewPreference,
 *   defaultValue: false,
 * }
 * ```
 *
 * @see PreferenceEntry
 * @see RootState
 */
import { UnknownAction } from "@reduxjs/toolkit";
import {
    setEnableTimeCapsule,
    setMakeBackups,
    setMaxBackupCount,
    setModificationCountBackupThreshold,
} from "../../store/backupSettingsSlice";
import { setDefaultExpandDisplayCards, setDevMode, setTransparentModalsOnMouseOut, setUseGemmi } from "../../store/generalStatesSlice";
import { setElementsIndicesRestrict } from "../../store/glRefSlice";
import { setAtomLabelDepthMode, setGLLabelsFontFamily, setGLLabelsFontSize } from "../../store/labelSettingsSlice";
import {
    setDefaultMapLitLines,
    setDefaultMapSamplingRate,
    setDefaultMapSurface,
    setMapLineWidth,
    setReContourMapOnlyOnMouseUp,
} from "../../store/mapContourSettingsSlice";
import { overwriteMapUpdatingScores, setShowScoresToast } from "../../store/moleculeMapUpdateSlice";
import { setContourWheelSensitivityFactor, setMouseSensitivity, setZoomWheelSensitivityFactor } from "../../store/mouseSettings";
import { setAnimateRefine, setEnableRefineAfterMod } from "../../store/refinementSettingsSlice";
import {
    setDefaultBondSmoothness,
    setDepthPeelLayers,
    setShadowMapQuality,
    setDoShadowDepthDebug,
    setDrawFPS,
    setShortCuts, setShortcutOnHoveredAtom, setShowShortcutToast, 
    setUseWebGPU,
    setAnaglyphColours,
    RootState
} from "@/store";
import { initialState as sceneSettingsInitialState } from "@/store/sceneSettingsSlice";
import { DEFAULT_SHORTCUTS } from "./DefaultShortcuts";
import { SCENE_PREFERENCES } from "./ScenePreferences";

export type PreferenceEntry<T = unknown> = {
    label: string;
    valueSetter: (value: T) => UnknownAction;
    selector: (state: RootState) => T;
    defaultValue: T;
    /**
     * The version of this preference's current default. Bump it (increment) whenever you
     * change `defaultValue`: stored values saved under an older version are considered stale
     * and are reset to the new default. If omitted, defaults to 1.
     */
    version?: number;
};

export const PREFERENCES_MAP: { [key: number]: PreferenceEntry } = {
    2: {
        label: "atomLabelDepthMode",
        valueSetter: setAtomLabelDepthMode,
        selector: (state: RootState) => state.labelSettings.atomLabelDepthMode,
        defaultValue: false,
    },
    3: {
        label: "defaultExpandDisplayCards",
        valueSetter: setDefaultExpandDisplayCards,
        selector: (state: RootState) => state.generalStates.defaultExpandDisplayCards,
        defaultValue: true,
    },
    4: {
        label: "shortCuts",
        valueSetter: setShortCuts,
        selector: (state: RootState) => state.shortcutSettings.shortCuts,
        defaultValue: DEFAULT_SHORTCUTS,
    },
    5: {
        label: "defaultMapLitLines",
        valueSetter: setDefaultMapLitLines,
        selector: (state: RootState) => state.mapContourSettings.defaultMapLitLines,
        defaultValue: false,
    },
    6: {
        label: "enableRefineAfterMod",
        valueSetter: setEnableRefineAfterMod,
        selector: (state: RootState) => state.refinementSettings.enableRefineAfterMod,
        defaultValue: true,
    },
    7: {
        label: "mouseSensitivity",
        valueSetter: setMouseSensitivity,
        selector: (state: RootState) => state.mouseSettings.mouseSensitivity,
        defaultValue: 0.3,
    },
    8: {
        label: "zoomWheelSensitivityFactor",
        valueSetter: setZoomWheelSensitivityFactor,
        selector: (state: RootState) => state.mouseSettings.zoomWheelSensitivityFactor,
        defaultValue: 1.0,
    },
    10: {
        label: "drawFPS",
        valueSetter: setDrawFPS,
        selector: (state: RootState) => state.sceneSettings.drawFPS,
        defaultValue: sceneSettingsInitialState.drawFPS,
    },
    12: {
        label: "mapLineWidth",
        valueSetter: setMapLineWidth,
        selector: (state: RootState) => state.mapContourSettings.mapLineWidth,
        defaultValue: 0.75,
    },
    13: {
        label: "makeBackups",
        valueSetter: setMakeBackups,
        selector: (state: RootState) => state.backupSettings.makeBackups,
        defaultValue: true,
    },
    14: {
        label: "showShortcutToast",
        valueSetter: setShowShortcutToast,
        selector: (state: RootState) => state.shortcutSettings.showShortcutToast,
        defaultValue: true,
    },
    15: {
        label: "defaultMapSurface",
        valueSetter: setDefaultMapSurface,
        selector: (state: RootState) => state.mapContourSettings.defaultMapSurface,
        defaultValue: false,
    },
    16: {
        label: "defaultBondSmoothness",
        valueSetter: setDefaultBondSmoothness,
        selector: (state: RootState) => state.sceneSettings.defaultBondSmoothness,
        // Enum value: 1 = Coarse, 2 = Nice, 3 = Smooth
        defaultValue: sceneSettingsInitialState.defaultBondSmoothness,
        // Bumped for 1.0: the default changed from 1 (Coarse) to 2 (Nice), so any previously
        // stored value must be reset to the new default.
        version: 2,
    },
    17: {
        label: "showScoresToast",
        valueSetter: setShowScoresToast,
        selector: (state: RootState) => state.moleculeMapUpdate.showScoresToast,
        defaultValue: true,
    },
    18: {
        label: "shortcutOnHoveredAtom",
        valueSetter: setShortcutOnHoveredAtom,
        selector: (state: RootState) => state.shortcutSettings.shortcutOnHoveredAtom,
        defaultValue: false,
    },
    20: {
        label: "defaultUpdatingScores",
        valueSetter: overwriteMapUpdatingScores,
        selector: (state: RootState) => state.moleculeMapUpdate.defaultUpdatingScores,
        defaultValue: ["Rfree", "Rfactor", "Moorhen Points"],
    },
    21: {
        label: "maxBackupCount",
        valueSetter: setMaxBackupCount,
        selector: (state: RootState) => state.backupSettings.maxBackupCount,
        defaultValue: 10,
    },
    22: {
        label: "modificationCountBackupThreshold",
        valueSetter: setModificationCountBackupThreshold,
        selector: (state: RootState) => state.backupSettings.modificationCountBackupThreshold,
        defaultValue: 5,
    },
    24: {
        label: "enableTimeCapsule",
        valueSetter: setEnableTimeCapsule,
        selector: (state: RootState) => state.backupSettings.enableTimeCapsule,
        defaultValue: true,
    },
    27: {
        label: "contourWheelSensitivityFactor",
        valueSetter: setContourWheelSensitivityFactor,
        selector: (state: RootState) => state.mouseSettings.contourWheelSensitivityFactor,
        defaultValue: 1.0,
    },
    29: {
        label: "devMode",
        valueSetter: setDevMode,
        selector: (state: RootState) => state.generalStates.devMode,
        defaultValue: false,
    },
    30: {
        label: "doShadowDepthDebug",
        valueSetter: setDoShadowDepthDebug,
        selector: (state: RootState) => state.sceneSettings.doShadowDepthDebug,
        defaultValue: sceneSettingsInitialState.doShadowDepthDebug,
    },
    54: {
        label: "shadowMapQuality",
        valueSetter: setShadowMapQuality,
        selector: (state: RootState) => state.sceneSettings.shadowMapQuality,
        defaultValue: sceneSettingsInitialState.shadowMapQuality,
    },
    32: {
        label: "GLLabelsFontFamily",
        valueSetter: setGLLabelsFontFamily,
        selector: (state: RootState) => state.labelSettings.GLLabelsFontFamily,
        defaultValue: "Arial",
    },
    33: {
        label: "GLLabelsFontSize",
        valueSetter: setGLLabelsFontSize,
        selector: (state: RootState) => state.labelSettings.GLLabelsFontSize,
        defaultValue: 18,
    },
    37: {
        label: "transparentModalsOnMouseOut",
        valueSetter: setTransparentModalsOnMouseOut,
        selector: (state: RootState) => state.generalStates.transparentModalsOnMouseOut,
        defaultValue: false,
    },
    38: {
        label: "defaultMapSamplingRate",
        valueSetter: setDefaultMapSamplingRate,
        selector: (state: RootState) => state.mapContourSettings.defaultMapSamplingRate,
        defaultValue: 1.8,
    },
    43: {
        label: "animateRefine",
        valueSetter: setAnimateRefine,
        selector: (state: RootState) => state.refinementSettings.animateRefine,
        defaultValue: true,
    },
    49: {
        label: "reContourMapOnlyOnMouseUp",
        valueSetter: setReContourMapOnlyOnMouseUp,
        selector: (state: RootState) => state.mapContourSettings.reContourMapOnlyOnMouseUp,
        defaultValue: false,
    },
    // 50: {
    //     label: "useGemmi",
    //     valueSetter: setUseGemmi,
    //     selector: (state: RootState) => state.generalStates.useGemmi,
    //     defaultValue: true,
    // },
    51: {
        label: "elementsIndicesRestrict",
        valueSetter: setElementsIndicesRestrict,
        selector: (state: RootState) => state.glRef.elementsIndicesRestrict,
        defaultValue: false,
    },
    52: {
        label: "depthPeelLayers",
        valueSetter: setDepthPeelLayers,
        selector: (state: RootState) => state.sceneSettings.depthPeelLayers,
        defaultValue: sceneSettingsInitialState.depthPeelLayers,
    },
    55: {
        label: "useWebGPU",
        valueSetter: setUseWebGPU,
        selector: (state: RootState) => state.sceneSettings.useWebGPU,
        defaultValue: sceneSettingsInitialState.useWebGPU,
        // 2: on by default (where the browser offers WebGPU) from now on, whatever was chosen
        // while it was a test.
        version: 2,
    },
    56: {
        label: "anaglyphColours",
        valueSetter: setAnaglyphColours,
        selector: (state: RootState) => state.sceneSettings.anaglyphColours,
        defaultValue: sceneSettingsInitialState.anaglyphColours,
    },
};

/**
 * Every user preference: the global ones of PREFERENCES_MAP and the generated per-scene ones of the
 * built-in scenes (see ScenePreferences.ts).
 */
export const ALL_PREFERENCES: PreferenceEntry[] = [...Object.values(PREFERENCES_MAP), ...SCENE_PREFERENCES];

export type PreferenceLabel = (typeof PREFERENCES_MAP)[keyof typeof PREFERENCES_MAP]["label"];
export type PreferenceDefaultValue<L extends PreferenceLabel> = Extract<
    (typeof PREFERENCES_MAP)[keyof typeof PREFERENCES_MAP],
    { label: L }
>["defaultValue"];

export type PreferencesValues = {
    version: string;
} & {
    [K in PreferenceLabel]: PreferenceDefaultValue<K>;
};

/* this is just to test the type expansion, works in vsCode */
// eslint-disable-next-line
const test: PreferencesValues = {
    version: "1.0.0",
    drawFPS: true,
    depthPeelLayers: 4,
    // Add other preference values here
};
