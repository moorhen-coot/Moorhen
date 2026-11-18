import localforage from "localforage";
import { ALL_PREFERENCES, PreferenceEntry, PreferencesValues } from "./PreferencesList";

/**
 * Generates default preferences values from the preferences map
 */
function generateDefaultPreferencesFromMap(): PreferencesValues {
    const defaults: unknown = {
        version: "v41",
    };

    // Iterate through every preference and extract its defaultValue
    ALL_PREFERENCES.forEach((preference: PreferenceEntry) => {
        defaults[preference.label] = preference.defaultValue;
    });

    return defaults as PreferencesValues;
}

export type LocalStorageInstance = LocalForage;

/**
 * Interface for the Moorhen preferences kept in the browser local storage
 * @property {string} name - The name of the local storage instance
 * @property {LocalForage} localStorageInstance - The local storage instance
 * @constructor
 * @param {string} name - The name of the local storage instance
 */
export class Preferences {
    name: string;
    defaultPreferencesValues: PreferencesValues;
    localStorageInstance: LocalForage;

    constructor(name: string = "babyGru-localStorage") {
        this.name = name;
        this.createLocalForageInstance();
    }

    createLocalForageInstance(empty: boolean = false): LocalForage {
        this.localStorageInstance = localforage.createInstance({
            driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE],
            name: this.name,
            storeName: this.name,
        });
        if (empty) {
            this.localStorageInstance.clear();
        }
        return this.localStorageInstance;
    }

    static get defaultPreferencesValues(): PreferencesValues {
        return generateDefaultPreferencesFromMap();
    }
}
