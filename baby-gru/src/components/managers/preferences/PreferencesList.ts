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
 * @example
 * ```typescript
 * 52: {
 *   label: "myNewPreference",
 *   valueSetter: setMyNewPreference,
 *   selector: (state: moorhen.State) => state.mySettings.myNewPreference,
 *   defaultValue: false,
 * }
 * ```
 *
 * @see PreferenceEntry
 * @see moorhen.State
 */

import { UnknownAction } from "@reduxjs/toolkit";
import { moorhen } from "../../../types/moorhen";
import {
    setDefaultMapLitLines,
    setDefaultMapSamplingRate,
    setDefaultMapSurface,
    setMapLineWidth,
    setReContourMapOnlyOnMouseUp,
} from "../../../store/mapContourSettingsSlice";
import {
    setContourWheelSensitivityFactor,
    setMouseSensitivity,
    setZoomWheelSensitivityFactor,
} from "../../../store/mouseSettings";
import {
    setEnableTimeCapsule,
    setMakeBackups,
    setMaxBackupCount,
    setModificationCountBackupThreshold,
} from "../../../store/backupSettingsSlice";
import { overwriteMapUpdatingScores, setShowScoresToast } from "../../../store/moleculeMapUpdateSlice";
import { setShortCuts, setShortcutOnHoveredAtom, setShowShortcutToast } from "../../../store/shortCutsSlice";
import { setAtomLabelDepthMode, setGLLabelsFontFamily, setGLLabelsFontSize } from "../../../store/labelSettingsSlice";
import {
    setClipCap,
    setDefaultBackgroundColor,
    setDefaultBondSmoothness,
    setDepthBlurDepth,
    setDepthBlurRadius,
    setDoOutline,
    setDoPerspectiveProjection,
    setDoSSAO,
    setDoShadow,
    setDoShadowDepthDebug,
    setDrawAxes,
    setDrawCrosshairs,
    setUseOffScreenBuffers,
    setDrawFPS,
    setDrawMissingLoops,
    setResetClippingFogging,
    setSsaoBias,
    setSsaoRadius,
    setEdgeDetectNormalScale,
    setDrawScaleBar,
    setDoEdgeDetect,
    setEdgeDetectDepthThreshold,
    setEdgeDetectNormalThreshold,
    setEdgeDetectDepthScale,
} from "../../../store/sceneSettingsSlice";
import {
    setDefaultExpandDisplayCards,
    setTransparentModalsOnMouseOut,
    setDevMode,
    setUseGemmi,
} from "../../../store/generalStatesSlice";
import { setAnimateRefine, setEnableRefineAfterMod } from "../../../store/refinementSettingsSlice";
import { setElementsIndicesRestrict } from "../../../store/glRefSlice";
import { DEFAULT_SHORTCUTS } from "./DefaultShortcuts";

export type PreferenceEntry<T = unknown> = {
    label: string;
    valueSetter: (value: T) => UnknownAction;
    selector: (state: moorhen.State) => T;
    defaultValue: T;
};

export const PREFERENCES_MAP: { [key: number]: PreferenceEntry } = {
    1: {
        label: "defaultBackgroundColor",
        valueSetter: setDefaultBackgroundColor,
        selector: (state: moorhen.State) => state.sceneSettings.defaultBackgroundColor,
        defaultValue: [1, 1, 1, 1],
    },
    2: {
        label: "atomLabelDepthMode",
        valueSetter: setAtomLabelDepthMode,
        selector: (state: moorhen.State) => state.labelSettings.atomLabelDepthMode,
        defaultValue: false,
    },
    3: {
        label: "defaultExpandDisplayCards",
        valueSetter: setDefaultExpandDisplayCards,
        selector: (state: moorhen.State) => state.generalStates.defaultExpandDisplayCards,
        defaultValue: true,
    },
    4: {
        label: "shortCuts",
        valueSetter: setShortCuts,
        selector: (state: moorhen.State) => state.shortcutSettings.shortCuts,
        defaultValue: DEFAULT_SHORTCUTS,
    },
    5: {
        label: "defaultMapLitLines",
        valueSetter: setDefaultMapLitLines,
        selector: (state: moorhen.State) => state.mapContourSettings.defaultMapLitLines,
        defaultValue: false,
    },
    6: {
        label: "enableRefineAfterMod",
        valueSetter: setEnableRefineAfterMod,
        selector: (state: moorhen.State) => state.refinementSettings.enableRefineAfterMod,
        defaultValue: true,
    },
    7: {
        label: "mouseSensitivity",
        valueSetter: setMouseSensitivity,
        selector: (state: moorhen.State) => state.mouseSettings.mouseSensitivity,
        defaultValue: 0.3,
    },
    8: {
        label: "zoomWheelSensitivityFactor",
        valueSetter: setZoomWheelSensitivityFactor,
        selector: (state: moorhen.State) => state.mouseSettings.zoomWheelSensitivityFactor,
        defaultValue: 1.0,
    },
    9: {
        label: "drawCrosshairs",
        valueSetter: setDrawCrosshairs,
        selector: (state: moorhen.State) => state.sceneSettings.drawCrosshairs,
        defaultValue: true,
    },
    10: {
        label: "drawFPS",
        valueSetter: setDrawFPS,
        selector: (state: moorhen.State) => state.sceneSettings.drawFPS,
        defaultValue: false,
    },
    11: {
        label: "drawMissingLoops",
        valueSetter: setDrawMissingLoops,
        selector: (state: moorhen.State) => state.sceneSettings.drawMissingLoops,
        defaultValue: true,
    },
    12: {
        label: "mapLineWidth",
        valueSetter: setMapLineWidth,
        selector: (state: moorhen.State) => state.mapContourSettings.mapLineWidth,
        defaultValue: 0.75,
    },
    13: {
        label: "makeBackups",
        valueSetter: setMakeBackups,
        selector: (state: moorhen.State) => state.backupSettings.makeBackups,
        defaultValue: true,
    },
    14: {
        label: "showShortcutToast",
        valueSetter: setShowShortcutToast,
        selector: (state: moorhen.State) => state.shortcutSettings.showShortcutToast,
        defaultValue: true,
    },
    15: {
        label: "defaultMapSurface",
        valueSetter: setDefaultMapSurface,
        selector: (state: moorhen.State) => state.mapContourSettings.defaultMapSurface,
        defaultValue: false,
    },
    16: {
        label: "defaultBondSmoothness",
        valueSetter: setDefaultBondSmoothness,
        selector: (state: moorhen.State) => state.sceneSettings.defaultBondSmoothness,
        defaultValue: 1,
    },
    17: {
        label: "showScoresToast",
        valueSetter: setShowScoresToast,
        selector: (state: moorhen.State) => state.moleculeMapUpdate.showScoresToast,
        defaultValue: true,
    },
    18: {
        label: "shortcutOnHoveredAtom",
        valueSetter: setShortcutOnHoveredAtom,
        selector: (state: moorhen.State) => state.shortcutSettings.shortcutOnHoveredAtom,
        defaultValue: false,
    },
    19: {
        label: "resetClippingFogging",
        valueSetter: setResetClippingFogging,
        selector: (state: moorhen.State) => state.sceneSettings.resetClippingFogging,
        defaultValue: true,
    },
    20: {
        label: "defaultUpdatingScores",
        valueSetter: overwriteMapUpdatingScores,
        selector: (state: moorhen.State) => state.moleculeMapUpdate.defaultUpdatingScores,
        defaultValue: ["Rfree", "Rfactor", "Moorhen Points"],
    },
    21: {
        label: "maxBackupCount",
        valueSetter: setMaxBackupCount,
        selector: (state: moorhen.State) => state.backupSettings.maxBackupCount,
        defaultValue: 10,
    },
    22: {
        label: "modificationCountBackupThreshold",
        valueSetter: setModificationCountBackupThreshold,
        selector: (state: moorhen.State) => state.backupSettings.modificationCountBackupThreshold,
        defaultValue: 5,
    },
    23: {
        label: "clipCap",
        valueSetter: setClipCap,
        selector: (state: moorhen.State) => state.sceneSettings.clipCap,
        defaultValue: true,
    },
    24: {
        label: "enableTimeCapsule",
        valueSetter: setEnableTimeCapsule,
        selector: (state: moorhen.State) => state.backupSettings.enableTimeCapsule,
        defaultValue: true,
    },
    25: {
        label: "doPerspectiveProjection",
        valueSetter: setDoPerspectiveProjection,
        selector: (state: moorhen.State) => state.sceneSettings.doPerspectiveProjection,
        defaultValue: false,
    },
    26: {
        label: "useOffScreenBuffers",
        valueSetter: setUseOffScreenBuffers,
        selector: (state: moorhen.State) => state.sceneSettings.useOffScreenBuffers,
        defaultValue: false,
    },
    27: {
        label: "contourWheelSensitivityFactor",
        valueSetter: setContourWheelSensitivityFactor,
        selector: (state: moorhen.State) => state.mouseSettings.contourWheelSensitivityFactor,
        defaultValue: 1.0,
    },
    28: {
        label: "drawAxes",
        valueSetter: setDrawAxes,
        selector: (state: moorhen.State) => state.sceneSettings.drawAxes,
        defaultValue: false,
    },
    29: {
        label: "devMode",
        valueSetter: setDevMode,
        selector: (state: moorhen.State) => state.generalStates.devMode,
        defaultValue: false,
    },
    30: {
        label: "doShadowDepthDebug",
        valueSetter: setDoShadowDepthDebug,
        selector: (state: moorhen.State) => state.sceneSettings.doShadowDepthDebug,
        defaultValue: false,
    },
    31: {
        label: "doShadow",
        valueSetter: setDoShadow,
        selector: (state: moorhen.State) => state.sceneSettings.doShadow,
        defaultValue: false,
    },
    32: {
        label: "GLLabelsFontFamily",
        valueSetter: setGLLabelsFontFamily,
        selector: (state: moorhen.State) => state.labelSettings.GLLabelsFontFamily,
        defaultValue: "Arial",
    },
    33: {
        label: "GLLabelsFontSize",
        valueSetter: setGLLabelsFontSize,
        selector: (state: moorhen.State) => state.labelSettings.GLLabelsFontSize,
        defaultValue: 18,
    },
    34: {
        label: "doOutline",
        valueSetter: setDoOutline,
        selector: (state: moorhen.State) => state.sceneSettings.doOutline,
        defaultValue: false,
    },
    35: {
        label: "depthBlurRadius",
        valueSetter: setDepthBlurRadius,
        selector: (state: moorhen.State) => state.sceneSettings.depthBlurRadius,
        defaultValue: 3.0,
    },
    36: {
        label: "depthBlurDepth",
        valueSetter: setDepthBlurDepth,
        selector: (state: moorhen.State) => state.sceneSettings.depthBlurDepth,
        defaultValue: 0.2,
    },
    37: {
        label: "transparentModalsOnMouseOut",
        valueSetter: setTransparentModalsOnMouseOut,
        selector: (state: moorhen.State) => state.generalStates.transparentModalsOnMouseOut,
        defaultValue: false,
    },
    38: {
        label: "defaultMapSamplingRate",
        valueSetter: setDefaultMapSamplingRate,
        selector: (state: moorhen.State) => state.mapContourSettings.defaultMapSamplingRate,
        defaultValue: 1.8,
    },
    39: {
        label: "doSSAO",
        valueSetter: setDoSSAO,
        selector: (state: moorhen.State) => state.sceneSettings.doSSAO,
        defaultValue: false,
    },
    40: {
        label: "ssaoRadius",
        valueSetter: setSsaoRadius,
        selector: (state: moorhen.State) => state.sceneSettings.ssaoRadius,
        defaultValue: 0.4,
    },
    41: {
        label: "ssaoBias",
        valueSetter: setSsaoBias,
        selector: (state: moorhen.State) => state.sceneSettings.ssaoBias,
        defaultValue: 1.0,
    },
    42: {
        label: "drawScaleBar",
        valueSetter: setDrawScaleBar,
        selector: (state: moorhen.State) => state.sceneSettings.drawScaleBar,
        defaultValue: false,
    },
    43: {
        label: "animateRefine",
        valueSetter: setAnimateRefine,
        selector: (state: moorhen.State) => state.refinementSettings.animateRefine,
        defaultValue: true,
    },
    44: {
        label: "doEdgeDetect",
        valueSetter: setDoEdgeDetect,
        selector: (state: moorhen.State) => state.sceneSettings.doEdgeDetect,
        defaultValue: false,
    },
    45: {
        label: "edgeDetectDepthThreshold",
        valueSetter: setEdgeDetectDepthThreshold,
        selector: (state: moorhen.State) => state.sceneSettings.edgeDetectDepthThreshold,
        defaultValue: 1.3,
    },
    46: {
        label: "edgeDetectNormalThreshold",
        valueSetter: setEdgeDetectNormalThreshold,
        selector: (state: moorhen.State) => state.sceneSettings.edgeDetectNormalThreshold,
        defaultValue: 0.5,
    },
    47: {
        label: "edgeDetectDepthScale",
        valueSetter: setEdgeDetectDepthScale,
        selector: (state: moorhen.State) => state.sceneSettings.edgeDetectDepthScale,
        defaultValue: 2.0,
    },
    48: {
        label: "edgeDetectNormalScale",
        valueSetter: setEdgeDetectNormalScale,
        selector: (state: moorhen.State) => state.sceneSettings.edgeDetectNormalScale,
        defaultValue: 0.0,
    },
    49: {
        label: "reContourMapOnlyOnMouseUp",
        valueSetter: setReContourMapOnlyOnMouseUp,
        selector: (state: moorhen.State) => state.mapContourSettings.reContourMapOnlyOnMouseUp,
        defaultValue: false,
    },
    50: {
        label: "useGemmi",
        valueSetter: setUseGemmi,
        selector: (state: moorhen.State) => state.generalStates.useGemmi,
        defaultValue: false,
    },
    51: {
        label: "elementsIndicesRestrict",
        valueSetter: setElementsIndicesRestrict,
        selector: (state: moorhen.State) => state.glRef.elementsIndicesRestrict,
        defaultValue: false,
    },
};

type PreferenceLabel = (typeof PREFERENCES_MAP)[keyof typeof PREFERENCES_MAP]["label"];
type PreferenceDefaultValue<L extends PreferenceLabel> = Extract<
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
    doPerspectiveProjection: true,
    // Add other preference values here
};
