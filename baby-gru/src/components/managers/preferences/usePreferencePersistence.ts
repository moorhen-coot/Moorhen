import { useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Preferences } from "./MoorhenPreferences";
import { PreferenceEntry } from "./PreferencesList";

/**
 * Custom React hook for persisting and restoring user preferences using a local storage mechanism.
 *
 * This hook synchronizes a preference value from the Redux store with a persistent storage (such as localForage),
 * and restores the value from storage on component mount. It also notifies an optional callback when the preference changes.
 *
 * @param preference - The preference entry object containing selector, label, default value, and value setter.
 * @param localForageInstanceRef - Optional ref to a custom localForage instance for storing preferences.
 * @param onUserPreferencesChange - Optional callback invoked when a preference value is updated in storage.
 *
 * @remarks
 * - On mount, attempts to load the preference from storage and dispatches it to the Redux store.
 * - On preference value change, updates the value in storage and triggers the callback if provided.
 * - Handles type checking and falls back to the default value if the stored value is invalid.
 */
export const usePreferencePersistence = (
    preference: PreferenceEntry,
    localForageInstanceRef?: React.RefObject<Preferences>,
    onUserPreferencesChange?: (key: string, value: unknown) => void
) => {
    const state = useSelector(preference.selector);
    const dispatch = useDispatch();

    const insideForageInstanceRef = useRef<Preferences>(
        localForageInstanceRef ? localForageInstanceRef.current : new Preferences()
    );

    const label = preference.label;
    useEffect(() => {
        if (state === null) return;
        insideForageInstanceRef.current?.localStorageInstance
            .setItem(label, state)
            .then((_) => onUserPreferencesChange?.(label, state));
    }, [label, state, onUserPreferencesChange]);

    useEffect(() => {
        insideForageInstanceRef.current?.localStorageInstance
            .getItem(preference.label)
            .then((value) => {
                if (value !== null && typeof value === typeof preference.defaultValue) {
                    dispatch(preference.valueSetter(value));
                } else {
                    if (preference.label === "shortCuts") {
                        dispatch(preference.valueSetter(JSON.stringify(preference.defaultValue)));
                    } else {
                        dispatch(preference.valueSetter(preference.defaultValue));
                    }
                }
            })
            .catch((err) => console.error(`Error retrieving ${preference.label} from local storage:`, err));
    }, []);
};
