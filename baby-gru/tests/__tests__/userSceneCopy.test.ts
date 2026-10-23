/*
 * Copying the parameters of one scene (or snapshot) into another (userScene.copyFrom), and
 * resetting a scene's settings (userScene.resetSettings).
 */
import { setDoSSAO, setSsaoRadius } from "@/store/sceneSettingsSlice";
import { createCloudInstance, loadCootModules, type CloudInstance } from "./cloudHost/cloudHostHarness";

jest.setTimeout(60000);

let cloud: CloudInstance;

beforeAll(loadCootModules);

beforeEach(async () => {
    cloud = await createCloudInstance();
});

afterEach(async () => {
    // Saving a scene stores preferences, which the next instance would restore
    await cloud.instance.getPreferences().localStorageInstance.clear();
    await cloud.cleanup();
});

const sceneSettings = () => cloud.store.getState().sceneSettings;

describe("copying scene settings", () => {
    test("into the scene shown applies them at once", async () => {
        const userScene = cloud.instance.userScene;
        cloud.store.dispatch(setDoSSAO(true));
        cloud.store.dispatch(setSsaoRadius(7));
        await userScene.select("Model Building");
        expect(sceneSettings().doSSAO).toBe(false);

        expect(await userScene.copyFrom("Model Building", "Default")).toBe(true);
        expect(sceneSettings().doSSAO).toBe(true);
        expect(sceneSettings().ssaoRadius).toBe(7);
        // The whole scene is copied, not only what was changed: Default fixes fog and clipping
        expect(sceneSettings().resetClippingFogging).toBe(false);
    });

    test("into another scene is used on its next visit, and leaves its saved preferences alone", async () => {
        const userScene = cloud.instance.userScene;
        await userScene.select("Model Building");
        cloud.store.dispatch(setSsaoRadius(9));

        expect(await userScene.copyFrom("Default", "Model Building")).toBe(true);
        expect(cloud.store.getState().userScenes.savedSceneSettings.Default.ssaoRadius).not.toBe(9);
        expect(userScene.hasUnsavedChanges("Default")).toBe(true);

        await userScene.select("Default");
        expect(sceneSettings().ssaoRadius).toBe(9);
        expect(sceneSettings().resetClippingFogging).toBe(true);
    });

    test("is refused into a snapshot or from the scene itself", async () => {
        const userScene = cloud.instance.userScene;
        const snapshotId = userScene.takeSnapshot("Shot");
        expect(await userScene.copyFrom(snapshotId, "Default")).toBe(false);
        expect(await userScene.copyFrom("Default", "Default")).toBe(false);
        expect(await userScene.copyFrom("Default", "no-such-scene")).toBe(false);
        // A snapshot can be a source
        expect(await userScene.copyFrom("Model Building", snapshotId)).toBe(true);
    });
});

describe("resetting scene settings", () => {
    test("a built-in scene goes back to its defaults or its saved settings, keeping the saved ones", async () => {
        const userScene = cloud.instance.userScene;
        cloud.store.dispatch(setSsaoRadius(7));
        userScene.saveScene("Default");
        cloud.store.dispatch(setSsaoRadius(9));

        expect(userScene.resetSettings("Default", "saved")).toBe(true);
        expect(sceneSettings().ssaoRadius).toBe(7);

        expect(userScene.resetSettings("Default", "default")).toBe(true);
        expect(sceneSettings().ssaoRadius).not.toBe(7);
        expect(sceneSettings().resetClippingFogging).toBe(false);
        expect(cloud.store.getState().userScenes.savedSceneSettings.Default.ssaoRadius).toBe(7);
    });

    test("another scene goes back to the default settings, and has nothing saved to go back to", async () => {
        const userScene = cloud.instance.userScene;
        const customId = await userScene.create("Figure");
        cloud.store.dispatch(setDoSSAO(true));

        expect(userScene.resetSettings(customId, "saved")).toBe(false);
        expect(userScene.resetSettings(customId, "default")).toBe(true);
        expect(sceneSettings().doSSAO).toBe(false);

        const snapshotId = userScene.takeSnapshot("Shot");
        expect(userScene.resetSettings(snapshotId, "default")).toBe(false);
    });
});

describe("scene names", () => {
    test("a name already used gets a number", async () => {
        const userScene = cloud.instance.userScene;
        const names = (ids: string[]) => ids.map(id => [...userScene.list, ...userScene.snapshots].find(scene => scene.id === id)?.name);

        const snapshots = [userScene.takeSnapshot("Figure"), userScene.takeSnapshot("Figure"), userScene.takeSnapshot("Figure")];
        expect(names(snapshots)).toEqual(["Figure", "Figure (2)", "Figure (3)"]);
        // Scenes and snapshots share the menu, so a scene cannot take a snapshot's name either
        const sceneId = await userScene.create("Figure");
        expect(names([sceneId])).toEqual(["Figure (4)"]);
    });
});
