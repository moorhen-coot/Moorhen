import type { AppDispatch, MoorhenReduxStoreType } from "@/store/MoorhenReduxStore";
import { setUserPreferencesMounted } from "@/store/generalStatesSlice";
import { ALL_PREFERENCES, type PreferenceEntry } from "./PreferencesList";
import { Preferences } from "./MoorhenPreferences";

export type InitPreferencePersistenceArgs = {
    store: MoorhenReduxStoreType;
    dispatch: AppDispatch;
    localStorageInstance: Preferences;
    onUserPreferencesChange?: (key: string, value: unknown) => void;
    /**
     * Called once all the changes caused by one store update are written to storage (a scene save
     * changes many preferences at once), after their `onUserPreferencesChange` calls
     */
    onPreferencesStored?: () => void;
    /** Called after every restore (start-up and imports), before `userPreferencesMounted` */
    onRestored?: () => void;
};

/**
 * Compares a Redux value against a preference default by value (not reference), because
 * defaults like arrays are stored as literals while the Redux state may hold other references.
 * `shortCuts` are kept in Redux as a JSON string while the default is an object.
 */
const valuesEqual = (a: unknown, b: unknown): boolean => {
    if (typeof a === "string" && typeof b !== "string") {
        return a === JSON.stringify(b);
    }
    if (typeof a !== "string" && typeof b === "string") {
        return JSON.stringify(a) === b;
    }
    return JSON.stringify(a) === JSON.stringify(b);
};

/**
 * Initialises preference persistence for a given Redux store and localForage instance.
 *
 * Preferences are persisted ONLY when their value differs from the current code default
 * ("persist only deviations"). Defaults are never stored, so developers can change default
 * values freely and users who never touched a preference automatically pick up the new default.
 *
 * Stored values are wrapped as `{ version, value }`, where `version` is the preference's version
 * at the time the value was saved. On restore:
 *   - nothing stored -> the code default is used
 *   - stored `version` is stale (older than the preference's current version) -> reset to default
 *   - stored plain value (legacy format, no version) -> untrusted -> reset to default
 *   - stored `{ version, value }` with a current version -> restored (an explicit user choice)
 *
 * Once all preferences have been restored, `userPreferencesMounted` is dispatched so the rest of
 * the application can proceed (see MainContainer's startup effect).
 *
 * `onUserPreferencesChange` is called once a change has been written to storage, including when a
 * preference is set back to its default (its stored entry is removed). `onPreferencesStored` is then
 * called once for all the changes of the same store update.
 *
 * @returns an unsubscribe function that stops the store subscription (call on cleanup). Its `restore`
 * method re-applies whatever is in storage to the store (used to import preferences after start-up);
 * changes made by a restore are not persisted again and do not call `onUserPreferencesChange`.
 */
export const initPreferencePersistence = (
    args: InitPreferencePersistenceArgs
): (() => void) & { restore: () => Promise<void> } => {
    const { store, dispatch, localStorageInstance, onUserPreferencesChange, onPreferencesStored, onRestored } = args;
    const preferences = ALL_PREFERENCES;
    const previousValues = new Map<string, unknown>();
    let hasRestored = false;

    const persist = (pref: PreferenceEntry, value: unknown): Promise<void> => {
        if (valuesEqual(value, pref.defaultValue)) {
            // Value matches the code default - remove any stored value so that future default
            // changes propagate automatically.
            return localStorageInstance.localStorageInstance
                .removeItem(pref.label)
                .then(_ => onUserPreferencesChange?.(pref.label, value))
                .catch(err => console.error(`Error removing ${pref.label} from local storage:`, err));
        }
        return localStorageInstance.localStorageInstance
            .setItem(pref.label, { version: pref.version ?? 1, value })
            .then(_ => onUserPreferencesChange?.(pref.label, value))
            .catch(err => console.error(`Error storing ${pref.label} in local storage:`, err));
    };

    const applyDefault = (pref: PreferenceEntry) => {
        if (pref.label === "shortCuts") {
            dispatch(pref.valueSetter(JSON.stringify(pref.defaultValue)));
        } else {
            dispatch(pref.valueSetter(pref.defaultValue));
        }
    };

    const finishRestore = () => {
        // Snapshot current values so the subscriber only reacts to real changes from here on.
        const state = store.getState();
        preferences.forEach(pref => previousValues.set(pref.label, pref.selector(state)));
        hasRestored = true;
        dispatch(setUserPreferencesMounted(true));
    };

    // --- Restore existing preferences (or apply defaults) ---
    const restorePreference = (pref: PreferenceEntry): Promise<void> =>
        localStorageInstance.localStorageInstance
            .getItem(pref.label)
            .then(stored => {
                if (stored === null || stored === undefined) {
                    applyDefault(pref);
                } else if (
                    typeof stored === "object" &&
                    !Array.isArray(stored) &&
                    "value" in stored &&
                    "version" in stored
                ) {
                    const storedVersion = (stored as { version: number }).version;
                    const storedValue = (stored as { value: unknown }).value;
                    const prefVersion = pref.version ?? 1;
                    if (storedVersion >= prefVersion && storedValue !== null && storedValue !== undefined) {
                        dispatch(pref.valueSetter(storedValue));
                    } else {
                        // Stale version (the default changed since this was saved) or unusable value
                        localStorageInstance.localStorageInstance.removeItem(pref.label);
                        applyDefault(pref);
                    }
                } else {
                    // Legacy plain value (old format, no version) - it was auto-saved by the old
                    // persistence system and cannot be trusted as a user choice, so reset to default.
                    localStorageInstance.localStorageInstance.removeItem(pref.label);
                    applyDefault(pref);
                }
            })
            .catch(err => {
                console.error(`Error retrieving ${pref.label} from local storage:`, err);
            });

    let restoring: Promise<void> = Promise.resolve();
    const restore = (): Promise<void> => {
        restoring = restoring.then(async () => {
            hasRestored = false;
            await Promise.all(preferences.map(restorePreference));
            onRestored?.();
            finishRestore();
        });
        return restoring;
    };
    restore();

    // --- Persist deviations on any subsequent store change ---
    const unsubscribe = store.subscribe(() => {
        if (!hasRestored) return;
        const state = store.getState();
        const writes: Promise<void>[] = [];
        preferences.forEach(pref => {
            const current = pref.selector(state);
            if (previousValues.get(pref.label) !== current) {
                previousValues.set(pref.label, current);
                writes.push(persist(pref, current));
            }
        });
        if (writes.length > 0 && onPreferencesStored) Promise.all(writes).then(onPreferencesStored);
    });

    return Object.assign(unsubscribe, { restore });
};
