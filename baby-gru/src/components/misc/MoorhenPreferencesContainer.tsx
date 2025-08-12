import { useEffect, useRef,  useMemo, memo } from "react";
import { useSelector, useDispatch } from "react-redux"
import { setUserPreferencesMounted } from "../../store/generalStatesSlice";
import { moorhen } from "../../types/moorhen"
import { MoorhenPreferences , PreferenceEntry, PREFERENCES_MAP } from "../../utils/MoorhenPreferences";

/* to add a new preference directly update PREFERENCE_MAP in MoorhenPreferences.ts
 * and it will be automatically added to the component.
 * The component will automatically save the preferences to local storage.
 * It will also restore the preferences from local storage when the component mounts.
*/

export const MoorhenPreferencesContainer = memo((props: {
    onUserPreferencesChange?: (key: string, value: unknown) => void;
}) => {

    const localForageInstanceRef = useRef<moorhen.Preferences>(new MoorhenPreferences());
    const dispatch = useDispatch()

    const restoreDefaults = (defaultValues: moorhen.PreferencesValues)=> {
        localForageInstanceRef.current.localStorageInstance.setItem('version', defaultValues.version)
        Object.keys(PREFERENCES_MAP).forEach(key => {
            if (PREFERENCES_MAP[key].label === 'shortCuts') {
                dispatch(
                    PREFERENCES_MAP[key].valueSetter(JSON.stringify(defaultValues[PREFERENCES_MAP[key].label]))
                )
            } else {
                dispatch(
                    PREFERENCES_MAP[key].valueSetter(defaultValues[PREFERENCES_MAP[key].label])
                )
            }
        })
    }

    /**
     * Hook used after component mounts to retrieve user preferences from
     * local storage. If no previously stored data is found, default values
     * are used.
     */
    useEffect(() => {
        const fetchStoredContext = async () => {
            try {

                const storedVersion = await localForageInstanceRef.current?.localStorageInstance.getItem('version')
                const defaultValues = MoorhenPreferences.defaultPreferencesValues
                if (storedVersion !== defaultValues.version) {
                    restoreDefaults(defaultValues)
                    dispatch(setUserPreferencesMounted(true))
                    return
                }

            } catch (err) {
                console.log(err)
                console.log('Unable to fetch preferences from local storage...')
            } finally {
                dispatch(setUserPreferencesMounted(true))
            }
        }

        fetchStoredContext();

    }, [])
   
    //Replace all the individual useEffect hooks with these calls:
    const handlers = useMemo(
        () => Object.keys(PREFERENCES_MAP).map(key => (
            <PreferenceHandler
                key={key}
                preference={PREFERENCES_MAP[key]}
                localForageInstanceRef={localForageInstanceRef}
                onUserPreferencesChange={props.onUserPreferencesChange}
            />
        )),
        [PREFERENCES_MAP, localForageInstanceRef, props.onUserPreferencesChange]
    );

    return (
        <>
            {handlers}
        </>
    );
});

MoorhenPreferencesContainer.displayName = "MoorhenPreferencesContainer";


const usePreferencePersistence = (preference: PreferenceEntry, localForageInstanceRef?: React.RefObject<moorhen.Preferences>, onUserPreferencesChange?: (key: string, value: unknown) => void) => {
        const state = useSelector(preference.selector); 
        const dispatch = useDispatch();

        const insideForageInstanceRef = useRef<moorhen.Preferences>(localForageInstanceRef ? localForageInstanceRef.current : new MoorhenPreferences());

        const label = preference.label;
        //console.log(`MoorhenPreferencesContainer: ${key} state`, state);
        useEffect(() => {
            if (state === null) return;  
            console.log(`MoorhenPreferencesContainer: ${label} state`, state);      
            insideForageInstanceRef.current?.localStorageInstance.setItem(label, state)
                .then(_ => onUserPreferencesChange?.(label, state));
        }, [label, state, onUserPreferencesChange]);

        
        useEffect(() => {
            insideForageInstanceRef.current?.localStorageInstance.getItem(preference.label)
                .then(value => {dispatch(preference.valueSetter(value))})
                .catch(err => console.error(`Error retrieving ${preference.label} from local storage:`, err));
        }, [])
        
    };

// Helper component that uses the hook
const PreferenceHandler = ({ 
    preference, 
    localForageInstanceRef, 
    onUserPreferencesChange 
}: {
    preference: PreferenceEntry;
    localForageInstanceRef?: React.RefObject<moorhen.Preferences>;
    onUserPreferencesChange?: (key: string, value: unknown) => void;
}) => {
    usePreferencePersistence(preference, localForageInstanceRef, onUserPreferencesChange);
    return null;
};