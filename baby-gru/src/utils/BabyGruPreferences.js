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

const PreferencesContext = createContext();

const PreferencesContextProvider = ({ children }) => {
    const [darkMode, setDarkMode] = useState(null);
    const [atomLabelDepthMode, setAtomLabelDepthMode] = useState(null);
    const [defaultExpandDisplayCards, setDefaultExpandDisplayCards] = useState(null);
    const [shortCuts, setShortCuts] = useState(null);
    const defaultValues = {
        darkMode: false, 
        atomLabelDepthMode: true, 
        defaultExpandDisplayCards: true,
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
                modifiers: ["metaKey"],
                keyPress: "Meta",
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
            "label_atom": {
                modifiers: [],
                keyPress: "m",
                label: "Label an atom on click"
            }
        }
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
                let promises = [localforage.getItem('darkMode'), localforage.getItem('defaultExpandDisplayCards'), localforage.getItem('shortCuts'), localforage.getItem('atomLabelDepthMode')]
                let response = await Promise.all(promises)
                
                console.log('Retrieved the following preferences from local storage: ', response)
                
                if (!response.every(item => item !== null) || response.length < Object.keys(defaultValues).length) {
                    console.log('Cannot find stored preferences, using defaults')
                    setDarkMode(defaultValues.darkMode)
                    setDefaultExpandDisplayCards(defaultValues.defaultExpandDisplayCards)            
                    setShortCuts(JSON.stringify(defaultValues.shortCuts))            
                    setAtomLabelDepthMode(defaultValues.atomLabelDepthMode)
                } else {
                    console.log(`Stored preferences retrieved successfully: ${response}`)
                    setDarkMode(response[0])
                    setDefaultExpandDisplayCards(response[1])
                    setShortCuts(response[2])
                    setAtomLabelDepthMode(response[3])
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

    const collectedContextValues = {darkMode, setDarkMode, atomLabelDepthMode, setAtomLabelDepthMode, defaultExpandDisplayCards, setDefaultExpandDisplayCards, shortCuts, setShortCuts}

    return (
      <PreferencesContext.Provider value={collectedContextValues}>
        {children}
      </PreferencesContext.Provider>
    );
};
  

export { PreferencesContext, PreferencesContextProvider };
