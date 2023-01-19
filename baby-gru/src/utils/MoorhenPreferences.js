import React, { createContext, useState, useEffect, useMemo } from "react";
import localforage from 'localforage';

const updateStoredPreferences = async (key, value) => {
    console.log(`Storing ${key}: ${value} preferences in local storage...`)
    try {
        await localforage.setItem(key, value)
    } catch (err) {
        console.log(err)
    }
}

const getDefaultValues = () => {
    return {
        version: '0.0.5',
        darkMode: false, 
        atomLabelDepthMode: true, 
        defaultExpandDisplayCards: true,
        defaultLitLines: false,
        refineAfterMod: true,
        drawCrosshairs: true,
        drawMissingLoops: true,
        mouseSensitivity: 2.0,
        mapLineWidth: 1.0,
        makeBackups: true,
        showShortcutToast: true,
        shortCuts: {
            "sphere_refine": {
                modifiers: ["shiftKey"],
                keyPress: "r",
                label: "Refine sphere"
            },
            "flip_peptide": {
                modifiers: ["shiftKey"],
                keyPress: "q",
                label: "Flip peptide"
            },
            "triple_refine": {
                modifiers: ["shiftKey"],
                keyPress: "h",
                label: "Refine triplet"
            },
            "auto_fit_rotamer": {
                modifiers: ["shiftKey"],
                keyPress: "j",
                label: "Autofit rotamer"
            },
            "add_terminal_residue": {
                modifiers: ["shiftKey"],
                keyPress: "y",
                label: "Add terminal residue"
            },
            "delete_residue": {
                modifiers: ["shiftKey"],
                keyPress: "d",
                label: "Delete residue"
            },
            "eigen_flip": {
                modifiers: ["shiftKey"],
                keyPress: "e",
                label: "Eigen flip ligand"
            },
            "show_shortcuts": {
                modifiers: [],
                keyPress: "escape",
                label: "Show shortcuts"
            },
            "restore_scene": {
                modifiers: [],
                keyPress: "r",
                label: "Restore scene"
            },
            "clear_labels": {
                modifiers: [],
                keyPress: "c",
                label: "Clear labels"
            },
            "move_up": {
                modifiers: [],
                keyPress: "arrowup",
                label: "Move model up"
            },
            "move_down": {
                modifiers: [],
                keyPress: "arrowdown",
                label: "Move model down"
            },
            "move_left": {
                modifiers: [],
                keyPress: "arrowleft",
                label: "Move model left"
            },
            "move_right": {
                modifiers: [],
                keyPress: "arrowright",
                label: "Move model right"
            },
            "go_to_blob": {
                modifiers: [],
                keyPress: "g",
                label: "Go to blob"
            },
            "take_screenshot": {
                modifiers: [],
                keyPress: "s",
                label: "Take a screenshot"
            },
            "ligand_camera_wiggle": {
                modifiers: [],
                keyPress: "z",
                label: "Wiggle camera while fitting a ligand"
            },
            "label_atom": {
                modifiers: [],
                keyPress: "m",
                label: "Label an atom on click"
            },
            "set_map_contour": {
                modifiers: ["ctrlKey"],
                keyPress: "control",
                label: "Set map contour on scroll"
            },

        }
    }
}

const PreferencesContext = createContext();

const PreferencesContextProvider = ({ children }) => {
    const [darkMode, setDarkMode] = useState(null)
    const [atomLabelDepthMode, setAtomLabelDepthMode] = useState(null)
    const [defaultExpandDisplayCards, setDefaultExpandDisplayCards] = useState(null)
    const [shortCuts, setShortCuts] = useState(null)
    const [defaultLitLines, setDefaultLitLines] = useState(null)
    const [refineAfterMod, setRefineAfterMod] = useState(null)
    const [mouseSensitivity, setMouseSensitivity] = useState(null)
    const [drawCrosshairs, setDrawCrosshairs] = useState(null)
    const [drawMissingLoops, setDrawMissingLoops] = useState(null)
    const [mapLineWidth, setMapLineWidth] = useState(null)
    const [makeBackups, setMakeBackups] = useState(null)
    const [showShortcutToast, setShowShortcutToast] = useState(null)

    const restoreDefaults = (defaultValues)=> {
        updateStoredPreferences('version', defaultValues.version)
        setDarkMode(defaultValues.darkMode)
        setDefaultExpandDisplayCards(defaultValues.defaultExpandDisplayCards)            
        setShortCuts(JSON.stringify(defaultValues.shortCuts))            
        setAtomLabelDepthMode(defaultValues.atomLabelDepthMode)
        setDefaultLitLines(defaultValues.defaultLitLines)
        setRefineAfterMod(defaultValues.refineAfterMod)
        setMouseSensitivity(defaultValues.mouseSensitivity)
        setDrawCrosshairs(defaultValues.drawCrosshairs)
        setDrawMissingLoops(defaultValues.drawMissingLoops)
        setMapLineWidth(defaultValues.mapLineWidth)
        setMakeBackups(defaultValues.makeBackups)
        setShowShortcutToast(defaultValues.showShortcutToast)
    }

    /**
     * Hook used after component mounts to retrieve user preferences from 
     * local storage. If no previously stored data is found, default values 
     * are used.
     */
     useEffect(() => {       
        const fetchStoredPreferences = async () => {
            console.log('Retrieving stored preferences...')
            try {
                let response = await Promise.all([
                    localforage.getItem('version'), 
                    localforage.getItem('darkMode'), 
                    localforage.getItem('defaultExpandDisplayCards'),
                    localforage.getItem('shortCuts'),
                    localforage.getItem('atomLabelDepthMode'),
                    localforage.getItem('defaultLitLines'),
                    localforage.getItem('refineAfterMod'),
                    localforage.getItem('mouseSensitivity'),
                    localforage.getItem('drawCrosshairs'),
                    localforage.getItem('drawMissingLoops'),
                    localforage.getItem('mapLineWidth'),
                    localforage.getItem('makeBackups'),
                    localforage.getItem('showShortcutToast')
                    ])
                
                console.log('Retrieved the following preferences from local storage: ', response)

                const defaultValues = getDefaultValues()                
                if (response[0] !== defaultValues.version) {
                    console.log('Different storage version detected, using defaults')
                    restoreDefaults(defaultValues)
                } else if(!response.every(item => item !== null) || response.length < Object.keys(defaultValues).length) {
                    console.log('Cannot find stored preferences, using defaults')
                    restoreDefaults(defaultValues)
                } else {
                    console.log(`Stored preferences retrieved successfully: ${response}`)
                    setDarkMode(response[1])
                    setDefaultExpandDisplayCards(response[2])
                    setShortCuts(response[3])
                    setAtomLabelDepthMode(response[4])
                    setDefaultLitLines(response[5])
                    setRefineAfterMod(response[6])
                    setMouseSensitivity(response[7])
                    setDrawCrosshairs(response[8])
                    setDrawMissingLoops(response[9])
                    setMapLineWidth(response[10])
                    setMakeBackups(response[11])
                    setShowShortcutToast(response[12])
                }                
                
            } catch (err) {
                console.log(err)
                console.log('Unable to fetch preferences from local storage...')
            }
        }
        
        localforage.config({
            driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE],
            name: 'babyGru-localStorage'
        });   

        fetchStoredPreferences();
        
    }, []);

    useMemo(() => {

        if (showShortcutToast === null) {
            return
        }
       
        updateStoredPreferences('showShortcutToast', showShortcutToast);
    }, [showShortcutToast]);

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

        if (drawMissingLoops === null) {
            return
        }
       
        updateStoredPreferences('drawMissingLoops', drawMissingLoops);
    }, [drawMissingLoops]);

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

        if (darkMode === null) {
            return
        }
       
        updateStoredPreferences('darkMode', darkMode);
    }, [darkMode]);
    
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

        if (defaultLitLines === null) {
            return
        }
       
        updateStoredPreferences('defaultLitLines', defaultLitLines);
    }, [defaultLitLines]);

    const collectedContextValues = {
        darkMode, setDarkMode, atomLabelDepthMode, setAtomLabelDepthMode, defaultExpandDisplayCards,
        setDefaultExpandDisplayCards, shortCuts, setShortCuts, defaultLitLines, setDefaultLitLines,
        refineAfterMod, setRefineAfterMod, mouseSensitivity, setMouseSensitivity, drawCrosshairs, 
        setDrawCrosshairs, drawMissingLoops, setDrawMissingLoops, mapLineWidth, setMapLineWidth,
        makeBackups, setMakeBackups, showShortcutToast, setShowShortcutToast
    }

    return (
      <PreferencesContext.Provider value={collectedContextValues}>
        {children}
      </PreferencesContext.Provider>
    );
};
  

export { PreferencesContext, PreferencesContextProvider, getDefaultValues };
