import React, { createContext, useState, useEffect, useMemo, useReducer } from "react";
import localforage from 'localforage';

const itemReducer = (oldList, change) => {
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

const updateStoredPreferences = async (key, value) => {
    try {
        await localforage.setItem(key, value)
    } catch (err) {
        console.log(err)
    }
}

const getDefaultValues = () => {
    return {
        version: 'v22',
        defaultBackgroundColor: [1, 1, 1, 1], 
        atomLabelDepthMode: true, 
        enableTimeCapsule: true, 
        defaultExpandDisplayCards: true,
        defaultMapLitLines: false,
        refineAfterMod: true,
        drawCrosshairs: true,
        drawFPS: false,
        drawMissingLoops: true,
        drawInteractions: false,
        mouseSensitivity: 0.3,
        wheelSensitivityFactor: 1.0,
        mapLineWidth: 0.46,
        makeBackups: true,
        showShortcutToast: true,
        defaultMapSurface: false,
        defaultBondSmoothness: 1,
        showScoresToast: true,
        shortcutOnHoveredAtom: true,
        resetClippingFogging: true,
        clipCap: false,
        defaultUpdatingScores: ['Rfree', 'Rfactor', 'Moorhen Points'],
        maxBackupCount: 10,
        modificationCountBackupThreshold: 5,
        shortCuts: {
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
                viewOnly: true
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

const PreferencesContext = createContext();

const PreferencesContextProvider = ({ children }) => {
    const [isMounted, setIsMounted] = useState(false)
    const [defaultBackgroundColor, setDefaultBackgroundColor] = useState(null)
    const [enableTimeCapsule, setEnableTimeCapsule] = useState(null)
    const [atomLabelDepthMode, setAtomLabelDepthMode] = useState(null)
    const [defaultExpandDisplayCards, setDefaultExpandDisplayCards] = useState(null)
    const [shortCuts, setShortCuts] = useState(null)
    const [defaultMapLitLines, setDefaultMapLitLines] = useState(null)
    const [refineAfterMod, setRefineAfterMod] = useState(null)
    const [mouseSensitivity, setMouseSensitivity] = useState(null)
    const [wheelSensitivityFactor, setWheelSensitivityFactor] = useState(null)
    const [drawCrosshairs, setDrawCrosshairs] = useState(null)
    const [drawFPS, setDrawFPS] = useState(null)
    const [drawMissingLoops, setDrawMissingLoops] = useState(null)
    const [drawInteractions, setDrawInteractions] = useState(null)
    const [mapLineWidth, setMapLineWidth] = useState(null)
    const [makeBackups, setMakeBackups] = useState(null)
    const [showShortcutToast, setShowShortcutToast] = useState(null)
    const [defaultMapSurface, setDefaultMapSurface] = useState(null)
    const [defaultBondSmoothness, setDefaultBondSmoothness] = useState(null)
    const [showScoresToast, setShowScoresToast] = useState(null)
    const [shortcutOnHoveredAtom, setShortcutOnHoveredAtom] = useState(null)
    const [resetClippingFogging, setResetClippingFogging] = useState(null)
    const [clipCap, setClipCap] = useState(null)
    const [maxBackupCount, setMaxBackupCount] = useState(null)
    const [modificationCountBackupThreshold, setModificationCountBackupThreshold] = useState(null)
    const [defaultUpdatingScores, setDefaultUpdatingScores] = useReducer(itemReducer, null)

    const preferencesMap = {
        1: { label: "defaultBackgroundColor", value: defaultBackgroundColor, valueSetter: setDefaultBackgroundColor},
        2: { label: "atomLabelDepthMode", value: atomLabelDepthMode, valueSetter: setAtomLabelDepthMode},
        3: { label: "defaultExpandDisplayCards", value: defaultExpandDisplayCards, valueSetter: setDefaultExpandDisplayCards},
        4: { label: "shortCuts", value: shortCuts, valueSetter: setShortCuts},
        5: { label: "defaultMapLitLines", value: defaultMapLitLines, valueSetter: setDefaultMapLitLines},
        6: { label: "refineAfterMod", value: refineAfterMod, valueSetter: setRefineAfterMod},
        7: { label: "mouseSensitivity", value: mouseSensitivity, valueSetter: setMouseSensitivity},
        8: { label: "wheelSensitivityFactor", value: wheelSensitivityFactor, valueSetter: setWheelSensitivityFactor},
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
        20: { label: "defaultUpdatingScores", value: defaultUpdatingScores, valueSetter: (newValue) => {setDefaultUpdatingScores({action: 'Overwrite', items: newValue})}},
        21: { label: "maxBackupCount", value: maxBackupCount, valueSetter: setMaxBackupCount},
        22: { label: "modificationCountBackupThreshold", value: modificationCountBackupThreshold, valueSetter: setModificationCountBackupThreshold},
        23: { label: "drawInteractions", value: drawInteractions, valueSetter: setDrawInteractions},
        24: { label: "clipCap", value: clipCap, valueSetter: setClipCap},
        25: { label: "enableTimeCapsule", value: enableTimeCapsule, valueSetter: setEnableTimeCapsule},
    }

    const restoreDefaults = (defaultValues)=> {
        updateStoredPreferences('version', defaultValues.version)
        Object.keys(preferencesMap).forEach(key => {
            if (preferencesMap[key].label === 'shortCuts') {
                preferencesMap[key].valueSetter(JSON.stringify(defaultValues[preferencesMap[key].label]))
            } else {
                preferencesMap[key].valueSetter(defaultValues[preferencesMap[key].label])
            }
        })
    }

    /**
     * Hook used after component mounts to retrieve user preferences from 
     * local storage. If no previously stored data is found, default values 
     * are used.
     */
     useEffect(() => {       
        const fetchStoredPreferences = async () => {
            try {
                const storedVersion = await localforage.getItem('version')
                const defaultValues = getDefaultValues()                
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
                console.log('Unable to fetch preferences from local storage...')
            } finally {
                setIsMounted(true)
            }            
        }
        
        localforage.config({
            driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE],
            name: 'babyGru-localStorage'
        });   

        fetchStoredPreferences();
        
    }, []);

    useMemo(() => {

        if (shortcutOnHoveredAtom === null) {
            return
        }
       
        updateStoredPreferences('shortcutOnHoveredAtom', shortcutOnHoveredAtom);
    }, [shortcutOnHoveredAtom]);
    
    useMemo(() => {

        if (enableTimeCapsule === null) {
            return
        }
       
        updateStoredPreferences('enableTimeCapsule', enableTimeCapsule);
    }, [enableTimeCapsule]);
    
    useMemo(() => {

        if (maxBackupCount === null) {
            return
        }
       
        updateStoredPreferences('maxBackupCount', maxBackupCount);
    }, [maxBackupCount]);
    
    useMemo(() => {

        if (modificationCountBackupThreshold === null) {
            return
        }
       
        updateStoredPreferences('modificationCountBackupThreshold', modificationCountBackupThreshold);
    }, [modificationCountBackupThreshold]);

    useMemo(() => {

        if (clipCap === null) {
            return
        }

        updateStoredPreferences('clipCap', clipCap);
    }, [clipCap]);

    useMemo(() => {

        if (resetClippingFogging === null) {
            return
        }
       
        updateStoredPreferences('resetClippingFogging', resetClippingFogging);
    }, [resetClippingFogging]);

    useMemo(() => {

        if (wheelSensitivityFactor === null) {
            return
        }
       
        updateStoredPreferences('wheelSensitivityFactor', wheelSensitivityFactor);
    }, [wheelSensitivityFactor]);

    useMemo(() => {

        if (showShortcutToast === null) {
            return
        }
       
        updateStoredPreferences('showShortcutToast', showShortcutToast);
    }, [showShortcutToast]);
    
    useMemo(() => {

        if (showScoresToast === null) {
            return
        }
       
        updateStoredPreferences('showScoresToast', showScoresToast);
    }, [showScoresToast]);
    
    useMemo(() => {

        if (defaultUpdatingScores === null) {
            return
        }
       
        updateStoredPreferences('defaultUpdatingScores', defaultUpdatingScores);
    }, [defaultUpdatingScores]);
    
    useMemo(() => {

        if (defaultBondSmoothness === null) {
            return
        }
       
        updateStoredPreferences('defaultBondSmoothness', defaultBondSmoothness);
    }, [defaultBondSmoothness]);

    useMemo(() => {

        if (defaultMapSurface === null) {
            return
        }
       
        updateStoredPreferences('defaultMapSurface', defaultMapSurface);
    }, [defaultMapSurface]);

    useMemo(() => {

        if (makeBackups === null) {
            return
        }
       
        updateStoredPreferences('makeBackups', makeBackups);
    }, [makeBackups]);

    useMemo(() => {

        if (refineAfterMod === null) {
            return
        }
       
        updateStoredPreferences('refineAfterMod', refineAfterMod);
    }, [refineAfterMod]);

    useMemo(() => {

        if (mapLineWidth === null) {
            return
        }
       
        updateStoredPreferences('mapLineWidth', mapLineWidth);
    }, [mapLineWidth]);

    useMemo(() => {

        if (drawCrosshairs === null) {
            return
        }
       
        updateStoredPreferences('drawCrosshairs', drawCrosshairs);
    }, [drawCrosshairs]);

    useMemo(() => {

        if (drawFPS === null) {
            return
        }
       
        updateStoredPreferences('drawFPS', drawFPS);
    }, [drawFPS]);

    useMemo(() => {

        if (drawMissingLoops === null) {
            return
        }
       
        updateStoredPreferences('drawMissingLoops', drawMissingLoops);
    }, [drawMissingLoops]);

    useMemo(() => {

        if (drawInteractions === null) {
            return
        }
       
        updateStoredPreferences('drawInteractions', drawInteractions);
    }, [drawInteractions]);

    useMemo(() => {

        if (mouseSensitivity === null) {
            return
        }
       
        updateStoredPreferences('mouseSensitivity', mouseSensitivity);
    }, [mouseSensitivity]);

    useMemo(() => {

        if (atomLabelDepthMode === null) {
            return
        }
       
        updateStoredPreferences('atomLabelDepthMode', atomLabelDepthMode);
    }, [atomLabelDepthMode]);
 
    useMemo(() => {

        if (defaultBackgroundColor === null) {
            return
        }
       
        updateStoredPreferences('defaultBackgroundColor', defaultBackgroundColor);
    }, [defaultBackgroundColor]);
    
    useMemo(() => {

        if (defaultExpandDisplayCards === null) {
            return
        }
       
        updateStoredPreferences('defaultExpandDisplayCards', defaultExpandDisplayCards);
    }, [defaultExpandDisplayCards]);

    useMemo(() => {

        if (shortCuts === null) {
            return
        }
       
        updateStoredPreferences('shortCuts', shortCuts);
    }, [shortCuts]);

    useMemo(() => {

        if (defaultMapLitLines === null) {
            return
        }
       
        updateStoredPreferences('defaultMapLitLines', defaultMapLitLines);
    }, [defaultMapLitLines]);

    const collectedContextValues = {
        defaultBackgroundColor, setDefaultBackgroundColor, atomLabelDepthMode, setAtomLabelDepthMode, defaultExpandDisplayCards,
        setDefaultExpandDisplayCards, shortCuts, setShortCuts, defaultMapLitLines, setDefaultMapLitLines,
        refineAfterMod, setRefineAfterMod, mouseSensitivity, setMouseSensitivity, drawCrosshairs, 
        setDrawCrosshairs, drawMissingLoops, setDrawMissingLoops, mapLineWidth, setMapLineWidth,
        makeBackups, setMakeBackups, showShortcutToast, setShowShortcutToast, defaultMapSurface,
        setDefaultMapSurface, defaultBondSmoothness, setDefaultBondSmoothness, showScoresToast, 
        setShowScoresToast, defaultUpdatingScores, setDefaultUpdatingScores, drawFPS, setDrawFPS,
        wheelSensitivityFactor, setWheelSensitivityFactor, shortcutOnHoveredAtom, setShortcutOnHoveredAtom,
        resetClippingFogging, setResetClippingFogging, maxBackupCount, setMaxBackupCount,
        modificationCountBackupThreshold, setModificationCountBackupThreshold, isMounted,
        drawInteractions, setDrawInteractions, clipCap, setClipCap, enableTimeCapsule, setEnableTimeCapsule
    }

    return (
      <PreferencesContext.Provider value={collectedContextValues}>
        {children}
      </PreferencesContext.Provider>
    );
};
  

export { PreferencesContext, PreferencesContextProvider, getDefaultValues };
