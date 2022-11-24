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
    const [defaultExpandDisplayCards, setDefaultExpandDisplayCards] = useState(null);
    const defaultValues = {
        darkMode: false, 
        defaultExpandDisplayCards: true,
        
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
                let promises = [localforage.getItem('darkMode'), localforage.getItem('defaultExpandDisplayCards')]
                let response = await Promise.all(promises)
                
                console.log('Retrieved the following preferences from local storage: ', response)
                
                if (!response.every(item => item !== null)) {
                    console.log('Cannot find stored preferences, using defaults')
                    setDarkMode(defaultValues.darkMode)
                    setDefaultExpandDisplayCards(defaultValues.defaultExpandDisplayCards)            
                } else {
                    console.log(`Stored preferences retrieved successfully: ${response}`)
                    setDarkMode(response[0])
                    setDefaultExpandDisplayCards(response[1])            
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

    const collectedContextValues = {darkMode, setDarkMode, defaultExpandDisplayCards, setDefaultExpandDisplayCards}

    return (
      <PreferencesContext.Provider value={collectedContextValues}>
        {children}
      </PreferencesContext.Provider>
    );
};
  

export { PreferencesContext, PreferencesContextProvider };
