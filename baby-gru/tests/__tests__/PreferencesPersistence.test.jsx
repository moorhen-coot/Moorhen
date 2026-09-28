import { waitFor } from "@testing-library/react";
import { initPreferencePersistence } from "../../src/InstanceManager/Preferences/PreferencePersistence";
import { createMoorhenStore } from "../../src/store/MoorhenReduxStore";
import { setDefaultBondSmoothness } from "../../src/store/sceneSettingsSlice";
import { Preferences } from "../../src/InstanceManager/Preferences/MoorhenPreferences";

const makeStore = () => createMoorhenStore();
const makePreferences = (name) => new Preferences(name);

const getStored = async (prefs, key) => prefs.localStorageInstance.getItem(key);

const init = (prefs, { onUserPreferencesChange } = {}) => {
    const store = makeStore();
    const unsubscribe = initPreferencePersistence({
        store,
        dispatch: store.dispatch,
        localStorageInstance: prefs,
        onUserPreferencesChange,
    });
    return { store, unsubscribe };
};

const waitMounted = (store) =>
    waitFor(() => expect(store.getState().generalStates.userPreferencesMounted).toBe(true));

describe("initPreferencePersistence", () => {
    it("applies defaults, persists nothing and dispatches userPreferencesMounted when storage is empty", async () => {
        const prefs = makePreferences("pp-1");
        const { store, unsubscribe } = init(prefs);
        await waitMounted(store);
        expect(store.getState().sceneSettings.defaultBondSmoothness).toBe(2);
        await waitFor(async () => expect(await getStored(prefs, "defaultBondSmoothness")).toBeNull());
        unsubscribe();
    });

    it("resets a legacy plain value (no version) to the default and removes it", async () => {
        const prefs = makePreferences("pp-2");
        await prefs.localStorageInstance.setItem("defaultBondSmoothness", 50);
        const { store, unsubscribe } = init(prefs);
        await waitMounted(store);
        await waitFor(() => expect(store.getState().sceneSettings.defaultBondSmoothness).toBe(2));
        await waitFor(async () => expect(await getStored(prefs, "defaultBondSmoothness")).toBeNull());
        unsubscribe();
    });

    it("resets a stored {version, value} with a stale version to the default and removes it", async () => {
        const prefs = makePreferences("pp-3");
        await prefs.localStorageInstance.setItem("defaultBondSmoothness", { version: 1, value: 3 });
        const { store, unsubscribe } = init(prefs);
        await waitMounted(store);
        await waitFor(() => expect(store.getState().sceneSettings.defaultBondSmoothness).toBe(2));
        await waitFor(async () => expect(await getStored(prefs, "defaultBondSmoothness")).toBeNull());
        unsubscribe();
    });

    it("restores a stored {version, value} with a current version", async () => {
        const prefs = makePreferences("pp-4");
        await prefs.localStorageInstance.setItem("mouseSensitivity", { version: 1, value: 0.8 });
        const { store, unsubscribe } = init(prefs);
        await waitMounted(store);
        await waitFor(() => expect(store.getState().mouseSettings.mouseSensitivity).toBe(0.8));
        await waitFor(async () => expect(await getStored(prefs, "mouseSensitivity")).toEqual({ version: 1, value: 0.8 }));
        unsubscribe();
    });

    it("persists a deviation with the current version and notifies the callback", async () => {
        const onUserPreferencesChange = jest.fn();
        const prefs = makePreferences("pp-5");
        const { store, unsubscribe } = init(prefs, { onUserPreferencesChange });
        await waitMounted(store);

        store.dispatch(setDefaultBondSmoothness(3));
        await waitFor(async () => expect(await getStored(prefs, "defaultBondSmoothness")).toEqual({ version: 2, value: 3 }));
        await waitFor(() => expect(onUserPreferencesChange).toHaveBeenCalledWith("defaultBondSmoothness", 3));
        unsubscribe();
    });

    it("removes the stored value when the user returns to the default", async () => {
        const prefs = makePreferences("pp-6");
        const { store, unsubscribe } = init(prefs);
        await waitMounted(store);

        store.dispatch(setDefaultBondSmoothness(3));
        await waitFor(async () => expect(await getStored(prefs, "defaultBondSmoothness")).toEqual({ version: 2, value: 3 }));

        store.dispatch(setDefaultBondSmoothness(2));
        await waitFor(async () => expect(await getStored(prefs, "defaultBondSmoothness")).toBeNull());
        unsubscribe();
    });
});
