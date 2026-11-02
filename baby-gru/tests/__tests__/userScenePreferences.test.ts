/*
 * The settings of the built-in scenes as user preferences (src/.roadmaps/scene-preferences.md):
 * saved explicitly, one key per scene per setting, and never changed by editing what is shown.
 */
import { PREFERENCES_MAP } from "@/InstanceManager/Preferences/PreferencesList";
import { createMoorhenStore } from "@/store/MoorhenReduxStore";
import {
    PER_SCENE_PREFERENCE_KEYS,
    autoClipFogByZoom,
    initialState as sceneSettingsInitialState,
    setClipStart,
    setDoSSAO,
    setZoom,
} from "@/store/sceneSettingsSlice";
import { builtInSceneDefaults } from "@/store/userScenesSlice";
import { createCloudInstance, flush, loadCootModules, type CloudInstance } from "./cloudHost/cloudHostHarness";

jest.setTimeout(60000);

let cloud: CloudInstance | null = null;

beforeAll(loadCootModules);

afterEach(async () => {
    if (!cloud) return;
    // Saving a scene stores preferences, which the next instance would restore
    await cloud.instance.getPreferences().localStorageInstance.clear();
    await cloud.cleanup();
    cloud = null;
});

const start = async () => {
    cloud = await createCloudInstance();
    return cloud;
};

const sceneSettings = () => cloud.store.getState().sceneSettings;
const saved = (sceneId: "Overview" | "Model Building") => cloud.store.getState().userScenes.savedSceneSettings[sceneId];
const storedKeys = async () => (await cloud.instance.getPreferences().localStorageInstance.keys()).sort();

describe("saving a built-in scene", () => {
    test("stores its settings without changing what is shown", async () => {
        const { instance } = await start();
        cloud.store.dispatch(setDoSSAO(!builtInSceneDefaults("Overview").doSSAO));
        expect(instance.userScene.hasUnsavedChanges("Overview")).toBe(true);
        const shownBefore = { ...sceneSettings() };

        expect(instance.userScene.saveScene("Overview")).toBe(true);
        expect(saved("Overview").doSSAO).toBe(!builtInSceneDefaults("Overview").doSSAO);
        expect(instance.userScene.hasUnsavedChanges("Overview")).toBe(false);
        expect(sceneSettings()).toEqual(shownBefore);
        await flush(100);
        expect(await storedKeys()).toEqual(["Overview.doSSAO"]);
    });

    test("is not possible for custom scenes and snapshots", async () => {
        const { instance } = await start();
        const customId = await instance.userScene.create("Figure");
        const snapshotId = instance.userScene.takeSnapshot();
        expect(instance.userScene.saveScene(customId)).toBe(false);
        expect(instance.userScene.saveScene(snapshotId)).toBe(false);
        expect(instance.userScene.hasUnsavedChanges(customId)).toBe(false);
    });
});

describe("restoring a built-in scene", () => {
    test("to its saved or default settings leaves the saved preferences alone", async () => {
        const { instance } = await start();
        cloud.store.dispatch(setDoSSAO(true));
        instance.userScene.saveScene("Overview");
        await flush(100);
        const savedBefore = saved("Overview");
        const storedBefore = await storedKeys();

        expect(await instance.userScene.reset("Overview", "default")).toBe(true);
        expect(sceneSettings().doSSAO).toBe(builtInSceneDefaults("Overview").doSSAO);
        expect(instance.userScene.hasUnsavedChanges("Overview")).toBe(true);

        expect(await instance.userScene.reset("Overview", "saved")).toBe(true);
        expect(sceneSettings().doSSAO).toBe(true);
        expect(instance.userScene.hasUnsavedChanges("Overview")).toBe(false);

        await flush(100);
        expect(saved("Overview")).toBe(savedBefore);
        expect(await storedKeys()).toEqual(storedBefore);
    });

    test("that is not shown updates its unsaved-changes indicator at once", async () => {
        const { instance } = await start();
        cloud.store.dispatch(setDoSSAO(!builtInSceneDefaults("Overview").doSSAO));
        await instance.userScene.select("Model Building");
        expect(instance.userScene.hasUnsavedChanges("Overview")).toBe(true);

        await instance.userScene.reset("Overview", "saved");
        expect(instance.userScene.hasUnsavedChanges("Overview")).toBe(false);
    });
});

describe("unsaved changes", () => {
    test("survive a switch to another scene and back", async () => {
        const { instance } = await start();
        const changed = !builtInSceneDefaults("Overview").doSSAO;
        cloud.store.dispatch(setDoSSAO(changed));
        await instance.userScene.select("Model Building");
        expect(sceneSettings().doSSAO).toBe(builtInSceneDefaults("Model Building").doSSAO);
        await instance.userScene.select("Overview");
        expect(sceneSettings().doSSAO).toBe(changed);
        expect(instance.userScene.hasUnsavedChanges("Overview")).toBe(true);
        expect(saved("Overview").doSSAO).toBe(builtInSceneDefaults("Overview").doSSAO);
    });
});

describe("fog and clipping", () => {
    test("following the zoom do not make a scene unsaved, and are saved as the scene's defaults", async () => {
        const { instance } = await start();
        await instance.userScene.select("Model Building");
        expect(sceneSettings().resetClippingFogging).toBe(true);
        const fogBefore = sceneSettings().fogStart;
        // As the view does when zooming
        cloud.store.dispatch(setZoom(sceneSettings().zoom * 2));
        cloud.store.dispatch(autoClipFogByZoom());
        expect(sceneSettings().fogStart).not.toBe(fogBefore);
        expect(instance.userScene.hasUnsavedChanges("Model Building")).toBe(false);

        // Saving for another reason stores no zoom-driven plane
        cloud.store.dispatch(setDoSSAO(!builtInSceneDefaults("Model Building").doSSAO));
        instance.userScene.saveScene("Model Building");
        const defaults = builtInSceneDefaults("Model Building");
        for (const key of ["fogStart", "fogEnd", "clipStart", "clipEnd"] as const) {
            expect(saved("Model Building")[key]).toBe(defaults[key]);
        }
    });

    test("set by hand are part of the scene, and saved", async () => {
        const { instance } = await start();
        expect(sceneSettings().resetClippingFogging).toBe(false);
        cloud.store.dispatch(setClipStart(12));
        expect(instance.userScene.hasUnsavedChanges("Overview")).toBe(true);
        instance.userScene.saveScene("Overview");
        expect(saved("Overview").clipStart).toBe(12);
    });
});

// Start-up and preferences.import() run the same restore, then the same scene update
describe("restoring preferences (start-up, import)", () => {
    test("each built-in scene starts from its own saved settings", async () => {
        const { instance } = await start();
        const modelBuildingSSAO = !builtInSceneDefaults("Model Building").doSSAO;
        await instance.preferences.import({
            format: "moorhen-1.0",
            entries: { "Model Building.doSSAO": { version: 1, value: modelBuildingSSAO } },
        });

        expect(instance.userScene.selected).toBe("Overview");
        expect(sceneSettings().doSSAO).toBe(builtInSceneDefaults("Overview").doSSAO);
        await instance.userScene.select("Model Building");
        expect(sceneSettings().doSSAO).toBe(modelBuildingSSAO);
        expect(instance.userScene.hasUnsavedChanges("Model Building")).toBe(false);
    });

    test("an outdated version resets that scene's key only", async () => {
        const { instance } = await start();
        await instance.preferences.import({
            format: "moorhen-1.0",
            entries: { "Overview.doSSAO": { version: 0, value: true }, "Model Building.doSSAO": { version: 1, value: true } },
        });

        expect(saved("Overview").doSSAO).toBe(builtInSceneDefaults("Overview").doSSAO);
        expect(saved("Model Building").doSSAO).toBe(true);
    });
});

describe("the preference registry", () => {
    test("no global preference reads a per-scene setting (it would be stored twice)", () => {
        const base = createMoorhenStore().getState();
        for (const key of PER_SCENE_PREFERENCE_KEYS) {
            const initial = sceneSettingsInitialState[key];
            const changed = Array.isArray(initial) ? initial.map(() => 0.123) : typeof initial === "number" ? initial + 1 : !initial;
            const state = { ...base, sceneSettings: { ...base.sceneSettings, [key]: changed } };
            for (const pref of Object.values(PREFERENCES_MAP)) {
                expect([key, pref.label, pref.selector(state)]).toEqual([key, pref.label, pref.selector(base)]);
            }
        }
    });
});
