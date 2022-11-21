import React, { createContext, useState, useEffect } from "react";
import localforage from 'localforage';

const PreferencesContext = createContext();

const PreferencesContextProvider = ({ children }) => {
    const [darkMode, setDarkMode] = useState(null);
    const [expandDisplayCards, setExpandDisplayCards] = useState(null);

    /**
     * Hook used after component mounts to retrieve user preferences from local storage
     */
     useEffect(() => {       
        const fetchStoredPreferences = async () => {
            try {
                let promises = [localforage.getItem('darkMode'), localforage.getItem('expandDisplayCards')]
                let reponse = await Promise.all(promises)
                setDarkMode(response[0])
                setExpandDisplayCards(response[1])            
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

    /**
     * Hook to update user preferences in local storage
     */
     useEffect(() => {
        const updateStoredPreferences = async () => {
            try {
                let promises = [localforage.setItem('darkMode', darkMode), localforage.setItem('expandDisplayCards', expandDisplayCards)]
                await Promise.all(promises)      
            } catch (err) {
                console.log(err)
                console.log('Unable to store preferences in local storage...')
            }
        }
        
        updateStoredPreferences();
    }, [darkMode, expandDisplayCards]);

    const collectedContextValues = {darkMode, setDarkMode, expandDisplayCards, setExpandDisplayCards}

    return (
      <PreferencesContext.Provider value={collectedContextValues}>
        {children}
      </PreferencesContext.Provider>
    );
};
  

export { PreferencesContext, PreferencesContextProvider };
