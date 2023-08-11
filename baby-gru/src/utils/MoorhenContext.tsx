import { createContext, useState, useEffect, useMemo, useReducer } from "react";
import localforage from 'localforage';
import { moorhen } from "../types/moorhen"

const itemReducer = (oldList: string[], change: {action: 'Add' | 'Remove' | 'Overwrite'; item?: string; items?: string[] }) => {
    if (change.action === 'Add') {
        return [...oldList, change.item]
    }
    else if (change.action === 'Remove') {
        return oldList.filter(item => item !== change.item)
    }
    else if (change.action === 'Overwrite') {
        return [...change.items]
    }
}

const updateStoredContext = async (key: string, value: any): Promise<void> => {
    try {
        await localforage.setItem(key, value)
    } catch (err) {
        console.log(err)
    }
}

/**
 * A function use to get the default user-defined preferences and other context
 * values.
 * @returns {moorhen.ContextValues} An object containing the default context values 
 * for the current version.
 * @example
 * import { getDefaultContextValues } from "moorhen";
 * 
 * const storedVersion = await localforage.getItem('version');
 * const defaultValues = getDefaultContextValues();    
 * 
 * if (storedVersion !== defaultValues.version) {
 *  localforage.setItem('version', defaultValues.version);
 * }
 */
const getDefaultContextValues = (): moorhen.ContextValues => {
    return {
        version: 'v28',
        transparentModalsOnMouseOut: true,
        defaultBackgroundColor: [1, 1, 1, 1], 
        atomLabelDepthMode: true, 
        enableTimeCapsule: true, 
        defaultExpandDisplayCards: true,
        defaultMapLitLines: false,
        enableRefineAfterMod: false,
        drawCrosshairs: true,
        drawAxes: false,
        drawFPS: false,
        drawMissingLoops: true,
        drawInteractions: false,
        doPerspectiveProjection: false,
        useOffScreenBuffers: false,
        depthBlurRadius: 3.0,
        depthBlurDepth: 0.2,
        doShadowDepthDebug: false,
        doShadow: false,
        doOutline: false,
        GLLabelsFontFamily: "Arial",
        GLLabelsFontSize: 18,
        doSpinTest: false,
        mouseSensitivity: 0.3,
        zoomWheelSensitivityFactor: 1.0,
        contourWheelSensitivityFactor: 0.05,
        mapLineWidth: 0.75,
        makeBackups: true,
        showShortcutToast: false,
        defaultMapSurface: false,
        defaultBondSmoothness: 1,
        showScoresToast: true,
        shortcutOnHoveredAtom: false,
        resetClippingFogging: true,
        clipCap: true,
        defaultUpdatingScores: ['Rfree', 'Rfactor', 'Moorhen Points'],
        maxBackupCount: 10,
        modificationCountBackupThreshold: 5,
        devMode: false,
        shortCuts: {
            "decrease_front_clip": {
                modifiers: [],
                keyPress: "1",
                label: "Decrease front clip",
                viewOnly: true
            },
            "increase_front_clip": {
                modifiers: [],
                keyPress: "2",
                label: "Increase front clip",
                viewOnly: true
            },
            "decrease_back_clip": {
                modifiers: [],
                keyPress: "3",
                label: "Decrease back clip",
                viewOnly: true
            },
            "increase_back_clip": {
                modifiers: [],
                keyPress: "4",
                label: "Increase back clip",
                viewOnly: true
            },
            "sphere_refine": {
                modifiers: ["shiftKey"],
                keyPress: "r",
                label: "Refine sphere",
                viewOnly: false
            },
            "flip_peptide": {
                modifiers: ["shiftKey"],
                keyPress: "q",
                label: "Flip peptide",
                viewOnly: false
            },
            "triple_refine": {
                modifiers: ["shiftKey"],
                keyPress: "h",
                label: "Refine triplet",
                viewOnly: false
            },
            "auto_fit_rotamer": {
                modifiers: ["shiftKey"],
                keyPress: "j",
                label: "Autofit rotamer",
                viewOnly: false
            },
            "add_terminal_residue": {
                modifiers: ["shiftKey"],
                keyPress: "y",
                label: "Add terminal residue",
                viewOnly: false
            },
            "delete_residue": {
                modifiers: ["shiftKey"],
                keyPress: "d",
                label: "Delete residue",
                viewOnly: false
            },
            "eigen_flip": {
                modifiers: ["shiftKey"],
                keyPress: "e",
                label: "Eigen flip ligand",
                viewOnly: false
            },
            "show_shortcuts": {
                modifiers: [],
                keyPress: "h",
                label: "Show shortcuts",
                viewOnly: true
            },
            "restore_scene": {
                modifiers: [],
                keyPress: "r",
                label: "Restore scene",
                viewOnly: true
            },
            "clear_labels": {
                modifiers: [],
                keyPress: "c",
                label: "Clear labels",
                viewOnly: true
            },
            "move_up": {
                modifiers: [],
                keyPress: "arrowup",
                label: "Move model up",
                viewOnly: true
            },
            "move_down": {
                modifiers: [],
                keyPress: "arrowdown",
                label: "Move model down",
                viewOnly: true
            },
            "move_left": {
                modifiers: [],
                keyPress: "arrowleft",
                label: "Move model left",
                viewOnly: true
            },
            "move_right": {
                modifiers: [],
                keyPress: "arrowright",
                label: "Move model right",
                viewOnly: true
            },
            "go_to_blob": {
                modifiers: [],
                keyPress: "g",
                label: "Go to blob",
                viewOnly: true
            },
            "take_screenshot": {
                modifiers: [],
                keyPress: "s",
                label: "Take a screenshot",
                viewOnly: true
            },
            "residue_camera_wiggle": {
                modifiers: [],
                keyPress: "z",
                label: "Wiggle camera while rotating a residue",
                viewOnly: true
            },
            "measure_distances": {
                modifiers: [],
                keyPress: "m",
                label: "Measure distances between atoms on click",
                viewOnly: true
            },
            "measure_angles": {
                modifiers: ["shiftKey"],
                keyPress: "m",
                label: "Measure angles between atoms on click",
                viewOnly: true
            },
            "label_atom": {
                modifiers: [],
                keyPress: "l",
                label: "Label an atom on click",
                viewOnly: true
            },
            "center_atom": {
                modifiers: ["altKey"],
                keyPress: "alt",
                label: "Center on clicked atom",
                viewOnly: true
            },
            "set_map_contour": {
                modifiers: ["ctrlKey"],
                keyPress: "control",
                label: "Set map contour on scroll",
                viewOnly: true
            },
            "jump_next_residue": {
                modifiers: [],
                keyPress: " ",
                label: "Jump to the next residue",
                viewOnly: true
            },
            "jump_previous_residue": {
                modifiers: ["shiftKey"],
                keyPress: " ",
                label: "Jump to the previous residue",
                viewOnly: true,
            },
            "increase_map_radius": {
                modifiers: [],
                keyPress: "]",
                label: "Increase map radius",
                viewOnly: true
            },
            "decrease_map_radius": {
                modifiers: [],
                keyPress: "[",
                label: "Decrease map radius",
                viewOnly: true
            },
        }
    }
}

const MoorhenContext = createContext(undefined);

/**
 * A context provider storing state variables used throughout Moorhen. It will store these states
 * in the local storage so that they persist across different sessions.
 * @param children - The Moorhen App
 * @property {boolean} isMounted - Indicates if the states have been already loaded from local storage.
 * @property {number[]} [defaultBackgroundColor=[1, 1, 1, 1]] - The default background colour used when starting the app.
 * @property {boolean} [enableTimeCapsule=true] - Indicates if session backups are enabled by default
 * @property {boolean} [atomLabelDepthMode=true] - Indicates if the atom label depth mode is active
 * @property {boolean} [defaultExpandDisplayCards=false] - Indicates whether molecule and map cards should be expanded on load
 * @property {string} shortCuts - A string with a JSON structure containing the user defined keyboard shortcuts
 * @property {boolean} [defaultMapLitLines=false] - Indicates if maps should be rendered using lit lines by default
 * @property {boolean} [enableRefineAfterMod=false] - Indicates if triple refinement should be automatically done after every modification 
 * @property {number} [mouseSensitivity=0.3] - The current mouse sensitivity used to pan/rotate the view
 * @property {number} [zoomWheelSensitivityFactor=1.0] - The current sensitivity used when using the mouse wheel to zoom the view
 * @property {number} [contourWheelSensitivityFactor=0.05] - The current sensitivity used when using the mouse wheel to change map contour level
 * @property {boolean} [drawCrosshairs=true] - Indicates if the crosshairs should be drawn
 * @property {boolean} [drawAxes=true] - Indicates if the x/y/z axes should be drawn
 * @property {boolean} [drawFPS=true] - Indicates if the current FPS should be calculated and shown
 * @property {boolean} [drawMissingLoops=true] - Indicates if missing residues should be drawn using dashed lines
 * @property {boolean} [drawInteractions=true] - Indicates if residue interactions should be drawn
 * @property {boolean} [doPerspectiveProjection=false] - Indicates if perspective projection should be used
 * @property {boolean} [useOffScreenBuffers=false] - Indicates if off screen buffers should be used
 * @property {boolean} [depthBlurDepth=false] - Indicates if depth blur should be used
 * @property {boolean} [doShadowDepthDebug=false] - Indicates if shadow depth blur should be used
 * @property {boolean} [doShadow=false] - Indicates if shadows should be drawn
 * @property {boolean} [doOutline=false] - Indicates if molecule should be drawn
 * @property {string} [GLLabelsFontFamily='Arial'] - The font family used in labels
 * @property {number} [GLLabelsFontSize=18] - The font size used in labels
 * @property {boolean} [doSpinTest=false] - Indicates if a spin test is to be carried out
 * @property {number} [mapLineWidth=0.75] - The default map line width
 * @property {boolean} [makeBackups=true] - Indicates if automatic session backups are active
 * @property {boolean} [showShortcutToast=false] - Indicates if a toastshould be shown on key press when a shortcut is activated
 * @property {boolean} [defaultMapSurface=false] - Indicates if maps should be shown as surfaces by default
 * @property {number} [defaultBondSmoothness=1] - The default smoothness level used when rendering molecules
 * @property {boolean} [showScoresToast=false] - Indicates if a toast with scores should be shown after connecting molecules and maps for map updates
 * @property {boolean} [shortcutOnHoveredAtom=false] - Indicates if shortcuts should be performed on the atom being hovered instead of the one in the centre of view
 * @property {boolean} [resetClippingFogging=false] - Indicates if clipping and fogging is to be reset when the zoom level changes
 * @property {boolean} [clipCap=false] - Activates clip clap spheres
 * @property {boolean} [transparentModalsOnMouseOut=true] - Make modals transparent on mouse out
 * @property {number} [maxBackupCount=10] - The maximum number of session backups stored in the local storage
 * @property {number} [modificationCountBackupThreshold=5] - The number of modifications that will trigger an automatic session backup
 * @property {string[]} [defaultUpdatingScores=['Rfree', 'Rfactor', 'Moorhen Points']] - A list of the scores shown after connecting molecules and maps for map updates
 * @property {boolean} [devMode=false] - Indicates if developer mode is active
 */
const MoorhenContextProvider = ({ children }) => {
    const [isMounted, setIsMounted] = useState<boolean>(false)
    const [defaultBackgroundColor, setDefaultBackgroundColor] = useState<null | [number, number, number, number]>(null)
    const [enableTimeCapsule, setEnableTimeCapsule] = useState<null | boolean>(null)
    const [atomLabelDepthMode, setAtomLabelDepthMode] = useState<null | boolean>(null)
    const [defaultExpandDisplayCards, setDefaultExpandDisplayCards] = useState<null | boolean>(null)
    const [shortCuts, setShortCuts] = useState<null | string>(null)
    const [defaultMapLitLines, setDefaultMapLitLines] = useState<null | boolean>(null)
    const [enableRefineAfterMod, setEnableRefineAfterMod] = useState<null | boolean>(null)
    const [mouseSensitivity, setMouseSensitivity] = useState<null | number>(null)
    const [zoomWheelSensitivityFactor, setZoomWheelSensitivityFactor] = useState<null | number>(null)
    const [contourWheelSensitivityFactor, setContourWheelSensitivityFactor] = useState<null | number>(null)
    const [drawCrosshairs, setDrawCrosshairs] = useState<null | boolean>(null)
    const [drawAxes, setDrawAxes] = useState<null | boolean>(null)
    const [drawFPS, setDrawFPS] = useState<null | boolean>(null)
    const [drawMissingLoops, setDrawMissingLoops] = useState<null | boolean>(null)
    const [drawInteractions, setDrawInteractions] = useState<null | boolean>(null)
    const [doPerspectiveProjection, setDoPerspectiveProjection] = useState<null | boolean>(null)
    const [useOffScreenBuffers, setUseOffScreenBuffers] = useState<null | boolean>(null)
    const [depthBlurRadius, setDepthBlurRadius] = useState<null | number>(null)
    const [depthBlurDepth, setDepthBlurDepth] = useState<null | number>(null)
    const [doShadowDepthDebug, setDoShadowDepthDebug] = useState<null | boolean>(null)
    const [doShadow, setDoShadow] = useState<null | boolean>(null)
    const [doOutline, setDoOutline] = useState<null | boolean>(null)
    const [GLLabelsFontFamily, setGLLabelsFontFamily] = useState<null | string>(null)
    const [GLLabelsFontSize, setGLLabelsFontSize] = useState<null | number>(null)
    const [doSpinTest, setDoSpinTest] = useState<null | boolean>(null)
    const [mapLineWidth, setMapLineWidth] = useState<null | number>(null)
    const [makeBackups, setMakeBackups] = useState<null | boolean>(null)
    const [showShortcutToast, setShowShortcutToast] = useState<null | boolean>(null)
    const [defaultMapSurface, setDefaultMapSurface] = useState<null | boolean>(null)
    const [defaultBondSmoothness, setDefaultBondSmoothness] = useState<null | number>(null)
    const [showScoresToast, setShowScoresToast] = useState<null | boolean>(null)
    const [shortcutOnHoveredAtom, setShortcutOnHoveredAtom] = useState<null | boolean>(null)
    const [resetClippingFogging, setResetClippingFogging] = useState<null | boolean>(null)
    const [clipCap, setClipCap] = useState<null | boolean>(null)
    const [transparentModalsOnMouseOut, setTransparentModalsOnMouseOut] = useState<null | boolean>(null)
    const [maxBackupCount, setMaxBackupCount] = useState<null | number>(null)
    const [modificationCountBackupThreshold, setModificationCountBackupThreshold] = useState<null | number>(null)
    const [defaultUpdatingScores, setDefaultUpdatingScores] = useReducer(itemReducer, null)
    const [devMode, setDevMode] = useState<null | boolean>(null)

    const preferencesMap = {
        1: { label: "defaultBackgroundColor", value: defaultBackgroundColor, valueSetter: setDefaultBackgroundColor},
        2: { label: "atomLabelDepthMode", value: atomLabelDepthMode, valueSetter: setAtomLabelDepthMode},
        3: { label: "defaultExpandDisplayCards", value: defaultExpandDisplayCards, valueSetter: setDefaultExpandDisplayCards},
        4: { label: "shortCuts", value: shortCuts, valueSetter: setShortCuts},
        5: { label: "defaultMapLitLines", value: defaultMapLitLines, valueSetter: setDefaultMapLitLines},
        6: { label: "enableRefineAfterMod", value: enableRefineAfterMod, valueSetter: setEnableRefineAfterMod},
        7: { label: "mouseSensitivity", value: mouseSensitivity, valueSetter: setMouseSensitivity},
        8: { label: "zoomWheelSensitivityFactor", value: zoomWheelSensitivityFactor, valueSetter: setZoomWheelSensitivityFactor},
        9: { label: "drawCrosshairs", value: drawCrosshairs, valueSetter: setDrawCrosshairs},
        10: { label: "drawFPS", value: drawFPS, valueSetter: setDrawFPS},
        11: { label: "drawMissingLoops", value: drawMissingLoops, valueSetter: setDrawMissingLoops},
        12: { label: "mapLineWidth", value: mapLineWidth, valueSetter: setMapLineWidth},
        13: { label: "makeBackups", value: makeBackups, valueSetter: setMakeBackups},
        14: { label: "showShortcutToast", value: showShortcutToast, valueSetter: setShowShortcutToast},
        15: { label: "defaultMapSurface", value: defaultMapSurface, valueSetter: setDefaultMapSurface},
        16: { label: "defaultBondSmoothness", value: defaultBondSmoothness, valueSetter: setDefaultBondSmoothness},
        17: { label: "showScoresToast", value: showScoresToast, valueSetter: setShowScoresToast},
        18: { label: "shortcutOnHoveredAtom", value: shortcutOnHoveredAtom, valueSetter: setShortcutOnHoveredAtom},
        19: { label: "resetClippingFogging", value: resetClippingFogging, valueSetter: setResetClippingFogging},
        20: { label: "defaultUpdatingScores", value: defaultUpdatingScores, valueSetter: (newValue: string[]) => {setDefaultUpdatingScores({action: 'Overwrite', items: newValue})}},
        21: { label: "maxBackupCount", value: maxBackupCount, valueSetter: setMaxBackupCount},
        22: { label: "modificationCountBackupThreshold", value: modificationCountBackupThreshold, valueSetter: setModificationCountBackupThreshold},
        23: { label: "drawInteractions", value: drawInteractions, valueSetter: setDrawInteractions},
        24: { label: "clipCap", value: clipCap, valueSetter: setClipCap},
        25: { label: "enableTimeCapsule", value: enableTimeCapsule, valueSetter: setEnableTimeCapsule},
        26: { label: "doPerspectiveProjection", value: doPerspectiveProjection, valueSetter: setDoPerspectiveProjection},
        27: { label: "useOffScreenBuffers", value: useOffScreenBuffers, valueSetter: setUseOffScreenBuffers},
        28: { label: "contourWheelSensitivityFactor", value: contourWheelSensitivityFactor, valueSetter: setContourWheelSensitivityFactor},
        29: { label: "drawAxes", value: drawAxes, valueSetter: setDrawAxes},
        30: { label: "devMode", value: devMode, valueSetter: setDevMode},
        31: { label: "doShadowDepthDebug", value: doShadowDepthDebug, valueSetter: setDoShadowDepthDebug},
        32: { label: "doShadow", value: doShadow, valueSetter: setDoShadow},
        33: { label: "GLLabelsFontFamily", value: GLLabelsFontFamily, valueSetter: setGLLabelsFontFamily},
        34: { label: "GLLabelsFontSize", value: GLLabelsFontSize, valueSetter: setGLLabelsFontSize},
        35: { label: "doSpinTest", value: doSpinTest, valueSetter: setDoSpinTest},
        36: { label: "doOutline", value: doOutline, valueSetter: setDoOutline},
        37: { label: "depthBlurRadius", value: depthBlurRadius, valueSetter: setDepthBlurRadius},
        38: { label: "depthBlurDepth", value: depthBlurDepth, valueSetter: setDepthBlurDepth},
        39: { label: "transparentModalsOnMouseOut", value: transparentModalsOnMouseOut, valueSetter: setTransparentModalsOnMouseOut},
    }

    const restoreDefaults = (defaultValues: moorhen.ContextValues)=> {
        updateStoredContext('version', defaultValues.version)
        Object.keys(preferencesMap).forEach(key => {
            if (preferencesMap[key].label === 'shortCuts') {
                preferencesMap[key].valueSetter(JSON.stringify(defaultValues[preferencesMap[key].label]))
            } else {
                preferencesMap[key].valueSetter(defaultValues[preferencesMap[key].label])
            }
        })
    }

    /**
     * Hook used after component mounts to retrieve user context from 
     * local storage. If no previously stored data is found, default values 
     * are used.
     */
     useEffect(() => {       
        const fetchStoredContext = async () => {
            try {
                const storedVersion = await localforage.getItem('version')
                const defaultValues = getDefaultContextValues()                
                if (storedVersion !== defaultValues.version) {
                    restoreDefaults(defaultValues)
                    return
                }
                
                const fetchPromises = Object.keys(preferencesMap).map(key => localforage.getItem(preferencesMap[key].label))
                let responses = await Promise.all(fetchPromises)
                               
                if(!responses.every(item => item !== null) || responses.length < Object.keys(preferencesMap).length) {
                    restoreDefaults(defaultValues)
                } else {
                    Object.keys(preferencesMap).forEach((key, index) => preferencesMap[key].valueSetter(responses[index]))
                }                
                
            } catch (err) {
                console.log(err)
                console.log('Unable to fetch context from local storage...')
            } finally {
                setIsMounted(true)
            }            
        }
        
        localforage.config({
            driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE],
            name: 'babyGru-localStorage'
        });   

        fetchStoredContext();
        
    }, []);

    useMemo(() => {

        if (transparentModalsOnMouseOut === null) {
            return
        }
       
        updateStoredContext('transparentModalsOnMouseOut', transparentModalsOnMouseOut);
    }, [transparentModalsOnMouseOut]);

    useMemo(() => {

        if (shortcutOnHoveredAtom === null) {
            return
        }
       
        updateStoredContext('shortcutOnHoveredAtom', shortcutOnHoveredAtom);
    }, [shortcutOnHoveredAtom]);

    useMemo(() => {

        if (devMode === null) {
            return
        }
       
        updateStoredContext('devMode', devMode);
    }, [devMode]);
    
    useMemo(() => {

        if (contourWheelSensitivityFactor === null) {
            return
        }
       
        updateStoredContext('contourWheelSensitivityFactor', contourWheelSensitivityFactor);
    }, [contourWheelSensitivityFactor]);
    
    useMemo(() => {

        if (enableTimeCapsule === null) {
            return
        }
       
        updateStoredContext('enableTimeCapsule', enableTimeCapsule);
    }, [enableTimeCapsule]);
    
    useMemo(() => {

        if (maxBackupCount === null) {
            return
        }
       
        updateStoredContext('maxBackupCount', maxBackupCount);
    }, [maxBackupCount]);
    
    useMemo(() => {

        if (modificationCountBackupThreshold === null) {
            return
        }
       
        updateStoredContext('modificationCountBackupThreshold', modificationCountBackupThreshold);
    }, [modificationCountBackupThreshold]);

    useMemo(() => {

        if (clipCap === null) {
            return
        }

        updateStoredContext('clipCap', clipCap);
    }, [clipCap]);

    useMemo(() => {

        if (resetClippingFogging === null) {
            return
        }
       
        updateStoredContext('resetClippingFogging', resetClippingFogging);
    }, [resetClippingFogging]);

    useMemo(() => {

        if (zoomWheelSensitivityFactor === null) {
            return
        }
       
        updateStoredContext('zoomWheelSensitivityFactor', zoomWheelSensitivityFactor);
    }, [zoomWheelSensitivityFactor]);

    useMemo(() => {

        if (showShortcutToast === null) {
            return
        }
       
        updateStoredContext('showShortcutToast', showShortcutToast);
    }, [showShortcutToast]);
    
    useMemo(() => {

        if (showScoresToast === null) {
            return
        }
       
        updateStoredContext('showScoresToast', showScoresToast);
    }, [showScoresToast]);
    
    useMemo(() => {

        if (defaultUpdatingScores === null) {
            return
        }
       
        updateStoredContext('defaultUpdatingScores', defaultUpdatingScores);
    }, [defaultUpdatingScores]);
    
    useMemo(() => {

        if (defaultBondSmoothness === null) {
            return
        }
       
        updateStoredContext('defaultBondSmoothness', defaultBondSmoothness);
    }, [defaultBondSmoothness]);

    useMemo(() => {

        if (defaultMapSurface === null) {
            return
        }
       
        updateStoredContext('defaultMapSurface', defaultMapSurface);
    }, [defaultMapSurface]);

    useMemo(() => {

        if (makeBackups === null) {
            return
        }
       
        updateStoredContext('makeBackups', makeBackups);
    }, [makeBackups]);

    useMemo(() => {

        if (enableRefineAfterMod === null) {
            return
        }
       
        updateStoredContext('enableRefineAfterMod', enableRefineAfterMod);
    }, [enableRefineAfterMod]);

    useMemo(() => {

        if (mapLineWidth === null) {
            return
        }
       
        updateStoredContext('mapLineWidth', mapLineWidth);
    }, [mapLineWidth]);

    useMemo(() => {

        if (drawAxes === null) {
            return
        }

        updateStoredContext('drawAxes', drawAxes);
    }, [drawAxes]);

    useMemo(() => {

        if (drawCrosshairs === null) {
            return
        }
       
        updateStoredContext('drawCrosshairs', drawCrosshairs);
    }, [drawCrosshairs]);

    useMemo(() => {

        if (drawFPS === null) {
            return
        }
       
        updateStoredContext('drawFPS', drawFPS);
    }, [drawFPS]);

    useMemo(() => {

        if (drawMissingLoops === null) {
            return
        }
       
        updateStoredContext('drawMissingLoops', drawMissingLoops);
    }, [drawMissingLoops]);

    useMemo(() => {

        if (doPerspectiveProjection === null) {
            return
        }

        updateStoredContext('doPerspectiveProjection', doPerspectiveProjection);
    }, [doPerspectiveProjection]);

    useMemo(() => {

        if (depthBlurDepth === null) {
            return
        }

        updateStoredContext('depthBlurDepth', depthBlurDepth);
    }, [depthBlurDepth]);

    useMemo(() => {

        if (depthBlurRadius === null) {
            return
        }

        updateStoredContext('depthBlurRadius', depthBlurRadius);
    }, [depthBlurRadius]);

    useMemo(() => {

        if (useOffScreenBuffers === null) {
            return
        }

        updateStoredContext('useOffScreenBuffers', useOffScreenBuffers);
    }, [useOffScreenBuffers]);

    useMemo(() => {

        if (doShadowDepthDebug === null) {
            return
        }

        updateStoredContext('doShadowDepthDebug', doShadowDepthDebug);
    }, [doShadowDepthDebug]);

    useMemo(() => {

        if (doOutline === null) {
            return
        }

        updateStoredContext('doOutline', doOutline);
    }, [doOutline]);

    useMemo(() => {

        if (doShadow === null) {
            return
        }

        updateStoredContext('doShadow', doShadow);
    }, [doShadow]);

    useMemo(() => {

        if (GLLabelsFontFamily === null) {
            return
        }

        updateStoredContext('GLLabelsFontFamily', GLLabelsFontFamily);
    }, [GLLabelsFontFamily]);

    useMemo(() => {

        if (GLLabelsFontSize === null) {
            return
        }

        updateStoredContext('GLLabelsFontSize', GLLabelsFontSize);
    }, [GLLabelsFontSize]);

    useMemo(() => {

        if (doSpinTest === null) {
            return
        }

        updateStoredContext('doSpinTest', doSpinTest);
    }, [doSpinTest]);

    useMemo(() => {

        if (drawInteractions === null) {
            return
        }
       
        updateStoredContext('drawInteractions', drawInteractions);
    }, [drawInteractions]);

    useMemo(() => {

        if (mouseSensitivity === null) {
            return
        }
       
        updateStoredContext('mouseSensitivity', mouseSensitivity);
    }, [mouseSensitivity]);

    useMemo(() => {

        if (atomLabelDepthMode === null) {
            return
        }
       
        updateStoredContext('atomLabelDepthMode', atomLabelDepthMode);
    }, [atomLabelDepthMode]);
 
    useMemo(() => {

        if (defaultBackgroundColor === null) {
            return
        }
       
        updateStoredContext('defaultBackgroundColor', defaultBackgroundColor);
    }, [defaultBackgroundColor]);
    
    useMemo(() => {

        if (defaultExpandDisplayCards === null) {
            return
        }
       
        updateStoredContext('defaultExpandDisplayCards', defaultExpandDisplayCards);
    }, [defaultExpandDisplayCards]);

    useMemo(() => {

        if (shortCuts === null) {
            return
        }
       
        updateStoredContext('shortCuts', shortCuts);
    }, [shortCuts]);

    useMemo(() => {

        if (defaultMapLitLines === null) {
            return
        }
       
        updateStoredContext('defaultMapLitLines', defaultMapLitLines);
    }, [defaultMapLitLines]);

    const collectedContextValues: moorhen.Context = {
        defaultBackgroundColor, setDefaultBackgroundColor, atomLabelDepthMode, setAtomLabelDepthMode, defaultExpandDisplayCards,
        setDefaultExpandDisplayCards, shortCuts, setShortCuts, defaultMapLitLines, setDefaultMapLitLines,
        enableRefineAfterMod, setEnableRefineAfterMod, mouseSensitivity, setMouseSensitivity, drawCrosshairs, 
        setDrawCrosshairs, drawMissingLoops, setDrawMissingLoops, mapLineWidth, setMapLineWidth, transparentModalsOnMouseOut,
        makeBackups, setMakeBackups, showShortcutToast, setShowShortcutToast, defaultMapSurface, setTransparentModalsOnMouseOut,
        setDefaultMapSurface, defaultBondSmoothness, setDefaultBondSmoothness, showScoresToast, 
        setShowScoresToast, defaultUpdatingScores, setDefaultUpdatingScores, drawFPS, setDrawFPS,
        zoomWheelSensitivityFactor, setZoomWheelSensitivityFactor, shortcutOnHoveredAtom, setShortcutOnHoveredAtom,
        resetClippingFogging, setResetClippingFogging, maxBackupCount, setMaxBackupCount, setContourWheelSensitivityFactor,
        modificationCountBackupThreshold, setModificationCountBackupThreshold, isMounted, contourWheelSensitivityFactor,
        drawInteractions, setDrawInteractions, clipCap, setClipCap, enableTimeCapsule, setEnableTimeCapsule, 
        doPerspectiveProjection, setDoPerspectiveProjection, useOffScreenBuffers, setUseOffScreenBuffers, drawAxes,
        setDrawAxes, devMode, setDevMode, doShadowDepthDebug, setDoShadowDepthDebug, doShadow, setDoShadow,
        GLLabelsFontFamily, setGLLabelsFontFamily, GLLabelsFontSize, setGLLabelsFontSize, doSpinTest,
        setDoSpinTest, doOutline, setDoOutline, depthBlurRadius, setDepthBlurRadius, depthBlurDepth, setDepthBlurDepth
    }

    return (
      <MoorhenContext.Provider value={collectedContextValues}>
        {children}
      </MoorhenContext.Provider>
    );
};
  

export { MoorhenContext, MoorhenContextProvider, getDefaultContextValues };
