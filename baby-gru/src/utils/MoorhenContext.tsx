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

const getDefaultContextValues = (): moorhen.ContextValues => {
    return {
        version: 'v27',
        defaultBackgroundColor: [1, 1, 1, 1], 
        atomLabelDepthMode: true, 
        enableTimeCapsule: true, 
        defaultExpandDisplayCards: true,
        defaultMapLitLines: false,
        enableRefineAfterMod: true,
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
        setDrawCrosshairs, drawMissingLoops, setDrawMissingLoops, mapLineWidth, setMapLineWidth,
        makeBackups, setMakeBackups, showShortcutToast, setShowShortcutToast, defaultMapSurface,
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
