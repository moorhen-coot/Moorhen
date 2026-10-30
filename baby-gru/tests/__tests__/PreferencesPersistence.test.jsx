import { waitFor } from "@testing-library/react";
import { initPreferencePersistence } from "../../src/InstanceManager/Preferences/PreferencePersistence";
import { createMoorhenStore } from "../../src/store/MoorhenReduxStore";
import { setMouseSensitivity } from "../../src/store/mouseSettings";
import { setDoSSAO } from "../../src/store/sceneSettingsSlice";
import { builtInSceneDefaults, saveSceneSettings } from "../../src/store/userScenesSlice";
import { Preferences } from "../../src/InstanceManager/Preferences/MoorhenPreferences";

const makeStore = () => createMoorhenStore();
const makePreferences = (name) => new Preferences(name);

const getStored = async (prefs, key) => prefs.localStorageInstance.getItem(key);

const init = (prefs, callbacks = {}) => {
    const store = makeStore();
    const unsubscribe = initPreferencePersistence({
        store,
        dispatch: store.dispatch,
        localStorageInstance: prefs,
        ...callbacks,
    });
    return { store, unsubscribe };
};

const waitMounted = (store) =>
    waitFor(() => expect(store.getState().generalStates.userPreferencesMounted).toBe(true));

const flush = () => new Promise(resolve => setTimeout(resolve, 50));

describe("initPreferencePersistence", () => {
    it("applies defaults, persists nothing and dispatches userPreferencesMounted when storage is empty", async () => {
        const prefs = makePreferences("pp-1");
        const { store, unsubscribe } = init(prefs);
        await waitMounted(store);
        expect(store.getState().mouseSettings.mouseSensitivity).toBe(0.3);
        await waitFor(async () => expect(await prefs.localStorageInstance.keys()).toEqual([]));
        unsubscribe();
    });

    it("resets a legacy plain value (no version) to the default and removes it", async () => {
        const prefs = makePreferences("pp-2");
        await prefs.localStorageInstance.setItem("mouseSensitivity", 0.8);
        const { store, unsubscribe } = init(prefs);
        await waitMounted(store);
        await waitFor(() => expect(store.getState().mouseSettings.mouseSensitivity).toBe(0.3));
        await waitFor(async () => expect(await getStored(prefs, "mouseSensitivity")).toBeNull());
        unsubscribe();
    });

    it("resets a stored {version, value} with a stale version to the default and removes it", async () => {
        const prefs = makePreferences("pp-3");
        await prefs.localStorageInstance.setItem("mouseSensitivity", { version: 0, value: 0.8 });
        const { store, unsubscribe } = init(prefs);
        await waitMounted(store);
        await waitFor(() => expect(store.getState().mouseSettings.mouseSensitivity).toBe(0.3));
        await waitFor(async () => expect(await getStored(prefs, "mouseSensitivity")).toBeNull());
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

    it("persists a deviation with the current version and notifies the callbacks", async () => {
        const onUserPreferencesChange = jest.fn();
        const onPreferencesStored = jest.fn();
        const prefs = makePreferences("pp-5");
        const { store, unsubscribe } = init(prefs, { onUserPreferencesChange, onPreferencesStored });
        await waitMounted(store);

        store.dispatch(setMouseSensitivity(0.8));
        await waitFor(async () => expect(await getStored(prefs, "mouseSensitivity")).toEqual({ version: 1, value: 0.8 }));
        await waitFor(() => expect(onUserPreferencesChange).toHaveBeenCalledWith("mouseSensitivity", 0.8));
        await waitFor(() => expect(onPreferencesStored).toHaveBeenCalledTimes(1));
        unsubscribe();
    });

    it("removes the stored value when the user returns to the default", async () => {
        const prefs = makePreferences("pp-6");
        const { store, unsubscribe } = init(prefs);
        await waitMounted(store);

        store.dispatch(setMouseSensitivity(0.8));
        await waitFor(async () => expect(await getStored(prefs, "mouseSensitivity")).toEqual({ version: 1, value: 0.8 }));

        store.dispatch(setMouseSensitivity(0.3));
        await waitFor(async () => expect(await getStored(prefs, "mouseSensitivity")).toBeNull());
        unsubscribe();
    });

    it("calls onRestored after every restore", async () => {
        const onRestored = jest.fn();
        const prefs = makePreferences("pp-7");
        const { store, unsubscribe } = init(prefs, { onRestored });
        await waitMounted(store);
        expect(onRestored).toHaveBeenCalledTimes(1);
        await unsubscribe.restore();
        expect(onRestored).toHaveBeenCalledTimes(2);
        unsubscribe();
    });
});

describe("per-scene preferences", () => {
    it("editing a scene setting stores nothing", async () => {
        const prefs = makePreferences("pp-scene-1");
        const { store, unsubscribe } = init(prefs);
        await waitMounted(store);

        store.dispatch(setDoSSAO(!store.getState().sceneSettings.doSSAO));
        await flush();
        expect(await prefs.localStorageInstance.keys()).toEqual([]);
        unsubscribe();
    });

    it("saving a scene stores only its deviations from that scene's defaults, notifying once", async () => {
        const onPreferencesStored = jest.fn();
        const prefs = makePreferences("pp-scene-2");
        const { store, unsubscribe } = init(prefs, { onPreferencesStored });
        await waitMounted(store);

        const defaults = builtInSceneDefaults("Model Building");
        const settings = { ...defaults, doSSAO: !defaults.doSSAO, backgroundColor: [0.1, 0.2, 0.3, 1] };
        store.dispatch(saveSceneSettings({ sceneId: "Model Building", settings }));
        await waitFor(() => expect(onPreferencesStored).toHaveBeenCalledTimes(1));
        expect((await prefs.localStorageInstance.keys()).sort()).toEqual(["Model Building.backgroundColor", "Model Building.doSSAO"]);
        expect(await getStored(prefs, "Model Building.doSSAO")).toEqual({ version: 1, value: !defaults.doSSAO });
        unsubscribe();
    });

    it("restores the saved settings of each scene, with each scene's own defaults", async () => {
        const prefs = makePreferences("pp-scene-3");
        await prefs.localStorageInstance.setItem("Overview.doSSAO", { version: 1, value: true });
        const { store, unsubscribe } = init(prefs);
        await waitMounted(store);

        const saved = store.getState().userScenes.savedSceneSettings;
        expect(saved.Overview.doSSAO).toBe(true);
        expect(saved["Model Building"].doSSAO).toBe(builtInSceneDefaults("Model Building").doSSAO);
        expect(saved.Overview.resetClippingFogging).toBe(false);
        expect(saved["Model Building"].resetClippingFogging).toBe(true);
        unsubscribe();
    });

    it("saving unchanged settings reports no change, array settings included", async () => {
        const onUserPreferencesChange = jest.fn();
        const prefs = makePreferences("pp-scene-4");
        const { store, unsubscribe } = init(prefs, { onUserPreferencesChange });
        await waitMounted(store);

        const saved = store.getState().userScenes.savedSceneSettings.Overview;
        // New arrays with the same values, as a save button builds them
        const settings = { ...saved, lightPosition: [...saved.lightPosition], backgroundColor: [...saved.backgroundColor] };
        store.dispatch(saveSceneSettings({ sceneId: "Overview", settings }));
        await flush();
        expect(onUserPreferencesChange).not.toHaveBeenCalled();
        expect(store.getState().userScenes.savedSceneSettings.Overview).toBe(saved);
        unsubscribe();
    });

    it("a stored value of the wrong type is replaced by the scene's default", async () => {
        const prefs = makePreferences("pp-scene-5");
        await prefs.localStorageInstance.setItem("Overview.backgroundColor", { version: 1, value: "red" });
        await prefs.localStorageInstance.setItem("Overview.resetClippingFogging", { version: 1, value: 1 });
        const { store, unsubscribe } = init(prefs);
        await waitMounted(store);

        const saved = store.getState().userScenes.savedSceneSettings.Overview;
        expect(saved.backgroundColor).toEqual(builtInSceneDefaults("Overview").backgroundColor);
        // The Default scene's default, not the global one (true)
        expect(saved.resetClippingFogging).toBe(false);
        unsubscribe();
    });
});
