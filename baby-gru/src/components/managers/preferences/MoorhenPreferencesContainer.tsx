import { useDispatch } from 'react-redux';
import { memo, useEffect, useMemo, useRef } from 'react';
import { useMoorhenInstance } from '../../../InstanceManager';
import { setUserPreferencesMounted } from '../../../store/generalStatesSlice';
import { Preferences } from './MoorhenPreferences';
import { PREFERENCES_MAP } from './PreferencesList';
import type { PreferenceEntry, PreferencesValues } from './PreferencesList';
import { usePreferencePersistence } from './usePreferencePersistence';

/* to add a new preference directly update PREFERENCE_MAP in PreferencesList.ts
 * and it will be automatically added to the component.
 * The component will automatically save the preferences to local storage.
 * It will also restore the preferences from local storage when the component mounts.
 */

export const MoorhenPreferencesContainer = memo((props: { onUserPreferencesChange?: (key: string, value: unknown) => void }) => {
    const moorhenGlobalInstance = useMoorhenInstance();
    const localForageInstanceRef = useRef<Preferences>(moorhenGlobalInstance.getPreferences());
    const dispatch = useDispatch();

    const restoreDefaults = (defaultValues: PreferencesValues) => {
        localForageInstanceRef.current.localStorageInstance.setItem('version', defaultValues.version);
        Object.keys(PREFERENCES_MAP).forEach(key => {
            if (PREFERENCES_MAP[key].label === 'shortCuts') {
                dispatch(PREFERENCES_MAP[key].valueSetter(JSON.stringify(defaultValues[PREFERENCES_MAP[key].label])));
            } else {
                dispatch(PREFERENCES_MAP[key].valueSetter(defaultValues[PREFERENCES_MAP[key].label]));
            }
        });
    };

    /**
     * Hook used after component mounts to retrieve user preferences from
     * local storage. If no previously stored data is found, default values
     * are used.
     */
    useEffect(() => {
        const fetchStoredContext = async () => {
            try {
                const storedVersion = await localForageInstanceRef.current?.localStorageInstance.getItem('version');
                const defaultValues = Preferences.defaultPreferencesValues;
                if (storedVersion !== defaultValues.version) {
                    restoreDefaults(defaultValues);
                    dispatch(setUserPreferencesMounted(true));
                    return;
                }
            } catch (err) {
                console.log(err);
                console.log('Unable to fetch preferences from local storage...');
            } finally {
                dispatch(setUserPreferencesMounted(true));
            }
        };

        fetchStoredContext();

        //restoreDefaults(MoorhenPreferences.defaultPreferencesValues);
    }, []);

    //Replace all the individual useEffect hooks with these calls:
    const handlers = useMemo(
        () =>
            Object.keys(PREFERENCES_MAP).map(key => (
                <PreferenceHandler
                    key={key}
                    preference={PREFERENCES_MAP[key]}
                    localForageInstanceRef={localForageInstanceRef}
                    onUserPreferencesChange={props.onUserPreferencesChange}
                />
            )),
        [PREFERENCES_MAP, localForageInstanceRef, props.onUserPreferencesChange]
    );

    return <>{handlers}</>;
});

MoorhenPreferencesContainer.displayName = 'MoorhenPreferencesContainer';

// Helper component that uses the hook
const PreferenceHandler = ({
    preference,
    localForageInstanceRef,
    onUserPreferencesChange,
}: {
    preference: PreferenceEntry;
    localForageInstanceRef?: React.RefObject<Preferences>;
    onUserPreferencesChange?: (key: string, value: unknown) => void;
}) => {
    usePreferencePersistence(preference, localForageInstanceRef, onUserPreferencesChange);
    return null;
};
