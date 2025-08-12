import localforage from "localforage"
import { UnknownAction } from "@reduxjs/toolkit"
import { moorhen } from "../types/moorhen"
import {
    setDefaultMapLitLines,
    setDefaultMapSamplingRate,
    setDefaultMapSurface,
    setMapLineWidth,
    setReContourMapOnlyOnMouseUp,
} from "../store/mapContourSettingsSlice"
import {
    setContourWheelSensitivityFactor,
    setMouseSensitivity,
    setZoomWheelSensitivityFactor,
} from "../store/mouseSettings"
import {
    setEnableTimeCapsule,
    setMakeBackups,
    setMaxBackupCount,
    setModificationCountBackupThreshold,
} from "../store/backupSettingsSlice"
import { overwriteMapUpdatingScores, setShowScoresToast } from "../store/moleculeMapUpdateSlice"
import { setShortCuts, setShortcutOnHoveredAtom, setShowShortcutToast } from "../store/shortCutsSlice"
import { setAtomLabelDepthMode, setGLLabelsFontFamily, setGLLabelsFontSize } from "../store/labelSettingsSlice"
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
} from "../store/sceneSettingsSlice"
import {
    setDefaultExpandDisplayCards,
    setTransparentModalsOnMouseOut,
    setDevMode,
    setUseGemmi,
} from "../store/generalStatesSlice"
import { setAnimateRefine, setEnableRefineAfterMod } from "../store/refinementSettingsSlice"
import { setElementsIndicesRestrict } from "../store/glRefSlice"


/**
 * Generates default preferences values from the preferences map
 */
function generateDefaultPreferencesFromMap(): moorhen.PreferencesValues {
    const defaults: unknown = {
        version: "v41",
        drawEnvBOcc: false, // This property is not in the preferences map
    }

    // Iterate through PREFERENCES_MAP and extract defaultValue for each preference
    Object.values(PREFERENCES_MAP).forEach((preference: PreferenceEntry) => {
        defaults[preference.label] = preference.defaultValue
    })
    
    return defaults as moorhen.PreferencesValues
}

/**
 * Interface for the Moorhen preferences kept in the browser local storage
 * @property {string} name - The name of the local storage instance
 * @property {LocalForage} localStorageInstance - The local storage instance
 * @constructor
 * @param {string} name - The name of the local storage instance
 */
export class MoorhenPreferences implements moorhen.Preferences {
    localStorageInstance: LocalForage
    name: string
    defaultPreferencesValues: moorhen.PreferencesValues

    constructor(name: string = "babyGru-localStorage") {
        this.name = name
        this.createLocalForageInstance()
    }

    createLocalForageInstance(empty: boolean = false): LocalForage {
        this.localStorageInstance = localforage.createInstance({
            driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE],
            name: this.name,
            storeName: this.name,
        })
        if (empty) {
            this.localStorageInstance.clear()
        }
        return this.localStorageInstance
    }

    static get defaultPreferencesValues(): moorhen.PreferencesValues {
        return generateDefaultPreferencesFromMap()
    }
}

const DEFAULT_SHORTCUTS = {
            decrease_front_clip: {
                modifiers: [],
                keyPress: "2",
                label: "Decrease front clip",
                viewOnly: true,
            },
            increase_front_clip: {
                modifiers: [],
                keyPress: "1",
                label: "Increase front clip",
                viewOnly: true,
            },
            decrease_back_clip: {
                modifiers: [],
                keyPress: "3",
                label: "Decrease back clip",
                viewOnly: true,
            },
            increase_back_clip: {
                modifiers: [],
                keyPress: "4",
                label: "Increase back clip",
                viewOnly: true,
            },
            go_to_residue: {
                modifiers: ["shiftKey"],
                keyPress: "g",
                label: "Go to residue",
                viewOnly: false,
            },
            sphere_refine: {
                modifiers: ["shiftKey"],
                keyPress: "r",
                label: "Refine sphere",
                viewOnly: false,
            },
            flip_peptide: {
                modifiers: ["shiftKey"],
                keyPress: "q",
                label: "Flip peptide",
                viewOnly: false,
            },
            triple_refine: {
                modifiers: ["shiftKey"],
                keyPress: "h",
                label: "Refine triplet",
                viewOnly: false,
            },
            auto_fit_rotamer: {
                modifiers: ["shiftKey"],
                keyPress: "j",
                label: "Autofit rotamer",
                viewOnly: false,
            },
            add_terminal_residue: {
                modifiers: ["shiftKey"],
                keyPress: "y",
                label: "Add terminal residue",
                viewOnly: false,
            },
            delete_residue: {
                modifiers: ["shiftKey"],
                keyPress: "d",
                label: "Delete residue",
                viewOnly: false,
            },
            eigen_flip: {
                modifiers: ["shiftKey"],
                keyPress: "e",
                label: "Eigen flip ligand",
                viewOnly: false,
            },
            undo: {
                modifiers: ["ctrlKey"],
                keyPress: "z",
                label: "Undo last action",
                viewOnly: false,
            },
            redo: {
                modifiers: ["ctrlKey", "shiftKey"],
                keyPress: "z",
                label: "Redo previous action",
                viewOnly: false,
            },
            show_shortcuts: {
                modifiers: [],
                keyPress: "h",
                label: "Show shortcuts",
                viewOnly: true,
            },
            restore_scene: {
                modifiers: [],
                keyPress: "r",
                label: "Restore scene",
                viewOnly: true,
            },
            clear_labels: {
                modifiers: [],
                keyPress: "c",
                label: "Clear labels",
                viewOnly: true,
            },
            move_up: {
                modifiers: [],
                keyPress: "arrowup",
                label: "Move model up",
                viewOnly: true,
            },
            move_down: {
                modifiers: [],
                keyPress: "arrowdown",
                label: "Move model down",
                viewOnly: true,
            },
            move_left: {
                modifiers: [],
                keyPress: "arrowleft",
                label: "Move model left",
                viewOnly: true,
            },
            move_right: {
                modifiers: [],
                keyPress: "arrowright",
                label: "Move model right",
                viewOnly: true,
            },
            go_to_blob: {
                modifiers: [],
                keyPress: "g",
                label: "Go to blob",
                viewOnly: true,
            },
            take_screenshot: {
                modifiers: [],
                keyPress: "s",
                label: "Take a screenshot",
                viewOnly: true,
            },
            residue_camera_wiggle: {
                modifiers: [],
                keyPress: "z",
                label: "Wiggle camera while rotating a residue",
                viewOnly: true,
            },
            measure_distances: {
                modifiers: [],
                keyPress: "m",
                label: "Measure distances and angles between atoms on click",
                viewOnly: true,
            },
            measure_angles: {
                modifiers: ["shiftKey"],
                keyPress: "m",
                label: "(Not enabled currently - use above)",
                viewOnly: true,
            },
            dist_ang_2d: {
                modifiers: [],
                keyPress: "a",
                label: "Measure arbitrary distances and angles",
                viewOnly: true,
            },
            label_atom: {
                modifiers: [],
                keyPress: "l",
                label: "Label an atom on click",
                viewOnly: true,
            },
            residue_selection: {
                modifiers: ["shiftKey"],
                keyPress: "shift",
                label: "Create a residue selection",
                viewOnly: false,
            },
            center_atom: {
                modifiers: ["altKey"],
                keyPress: "alt",
                label: "Center on clicked atom",
                viewOnly: true,
            },
            set_map_contour: {
                modifiers: ["ctrlKey"],
                keyPress: "control",
                label: "Set map contour on scroll",
                viewOnly: true,
            },
            jump_next_residue: {
                modifiers: [],
                keyPress: " ",
                label: "Jump to the next residue",
                viewOnly: true,
            },
            jump_previous_residue: {
                modifiers: ["shiftKey"],
                keyPress: " ",
                label: "Jump to the previous residue",
                viewOnly: true,
            },
            increase_map_radius: {
                modifiers: [],
                keyPress: "]",
                label: "Increase map radius",
                viewOnly: true,
            },
            decrease_map_radius: {
                modifiers: [],
                keyPress: "[",
                label: "Decrease map radius",
                viewOnly: true,
            },
            show_atom_info: {
                modifiers: [],
                keyPress: "i",
                label: "Show atom info",
                viewOnly: true,
            },
        }


export type PreferenceEntry<T = unknown> = {
    label: string;
    valueSetter: ( value: T ) => UnknownAction;
    selector: (state: moorhen.State) => T;
    defaultValue: T;
};

export type PreferenceMap = {
    [key: number]: PreferenceEntry;
};

export const PREFERENCES_MAP: PreferenceMap = {
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
        defaultValue: DEFAULT_SHORTCUTS
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
        defaultValue: 1.4,
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
        defaultValue: 1.0,
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
}
