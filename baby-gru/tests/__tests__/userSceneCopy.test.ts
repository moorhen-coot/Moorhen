/*
 * Copying the parameters of one scene (or snapshot) into another (userScene.copyFrom), and
 * resetting a scene's settings (userScene.reset).
 */
import { setDefaultBondSmoothness, setDoAnaglyphStereo, setDoSSAO, setDoSpin, setSsaoRadius } from "@/store/sceneSettingsSlice";
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

        expect(await userScene.copyFrom("Model Building", "Overview")).toBe(true);
        expect(sceneSettings().doSSAO).toBe(true);
        expect(sceneSettings().ssaoRadius).toBe(7);
        // The whole scene is copied, not only what was changed: Overview fixes fog and clipping
        expect(sceneSettings().resetClippingFogging).toBe(false);
    });

    test("into another scene is used on its next visit, and leaves its saved preferences alone", async () => {
        const userScene = cloud.instance.userScene;
        await userScene.select("Model Building");
        cloud.store.dispatch(setSsaoRadius(9));

        expect(await userScene.copyFrom("Overview", "Model Building")).toBe(true);
        expect(cloud.store.getState().userScenes.savedSceneSettings.Overview.ssaoRadius).not.toBe(9);
        expect(userScene.hasUnsavedChanges("Overview")).toBe(true);

        await userScene.select("Overview");
        expect(sceneSettings().ssaoRadius).toBe(9);
        expect(sceneSettings().resetClippingFogging).toBe(true);
    });

    test("is refused into a snapshot or from the scene itself", async () => {
        const userScene = cloud.instance.userScene;
        const snapshotId = userScene.takeSnapshot("Shot");
        expect(await userScene.copyFrom(snapshotId, "Overview")).toBe(false);
        expect(await userScene.copyFrom("Overview", "Overview")).toBe(false);
        expect(await userScene.copyFrom("Overview", "no-such-scene")).toBe(false);
        // A snapshot can be a source
        expect(await userScene.copyFrom("Model Building", snapshotId)).toBe(true);
    });
});

describe("resetting scene settings", () => {
    test("a built-in scene goes back to its defaults or its saved settings, keeping the saved ones", async () => {
        const userScene = cloud.instance.userScene;
        cloud.store.dispatch(setSsaoRadius(7));
        userScene.saveScene("Overview");
        cloud.store.dispatch(setSsaoRadius(9));

        expect(await userScene.reset("Overview", "saved")).toBe(true);
        expect(sceneSettings().ssaoRadius).toBe(7);

        expect(await userScene.reset("Overview", "default")).toBe(true);
        expect(sceneSettings().ssaoRadius).not.toBe(7);
        expect(sceneSettings().resetClippingFogging).toBe(false);
        expect(cloud.store.getState().userScenes.savedSceneSettings.Overview.ssaoRadius).toBe(7);
    });

    test("another scene goes back to the default settings, and has nothing saved to go back to", async () => {
        const userScene = cloud.instance.userScene;
        const customId = await userScene.create("Figure");
        cloud.store.dispatch(setDoSSAO(true));

        expect(await userScene.reset(customId, "saved")).toBe(false);
        expect(await userScene.reset(customId, "default")).toBe(true);
        expect(sceneSettings().doSSAO).toBe(false);

        const snapshotId = userScene.takeSnapshot("Shot");
        expect(await userScene.reset(snapshotId, "default")).toBe(false);
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

describe("how scenes draw new molecules", () => {
    test("only Model Building draws them as bonds, not the scenes and snapshots made from it", async () => {
        const userScene = cloud.instance.userScene;
        const representation = cloud.instance.representation;
        await userScene.select("Model Building");
        expect(representation.defaultStyle).toBe("CBs");

        const customId = await userScene.create("From Model Building");
        expect(representation.defaultStyle).toBe("ribbons-and-ligands");
        await userScene.select("Model Building");
        const snapshotId = userScene.takeSnapshot();

        await userScene.select(snapshotId);
        expect(representation.defaultStyle).toBe("ribbons-and-ligands");
        await userScene.select("Model Building");
        expect(representation.defaultStyle).toBe("CBs");
        await userScene.select(customId);
        expect(representation.defaultStyle).toBe("ribbons-and-ligands");
        await userScene.select("Overview");
        expect(representation.defaultStyle).toBe("ribbons-and-ligands");
    });
});

describe("global settings", () => {
    test("the bond smoothness is the same in every scene", async () => {
        const userScene = cloud.instance.userScene;
        cloud.store.dispatch(setDefaultBondSmoothness(3));
        await userScene.select("Model Building");
        expect(sceneSettings().defaultBondSmoothness).toBe(3);
        cloud.store.dispatch(setDefaultBondSmoothness(1));
        await userScene.select("Overview");
        expect(sceneSettings().defaultBondSmoothness).toBe(1);
    });
});

describe("view modes", () => {
    test("spin and stereo are not part of a scene: switching leaves them alone, on every visit", async () => {
        const userScene = cloud.instance.userScene;
        cloud.store.dispatch(setDoSpin(true));
        cloud.store.dispatch(setDoAnaglyphStereo(true));
        // First visit of Model Building, then later visits of both scenes
        for (const sceneId of ["Model Building", "Overview", "Model Building", "Overview"]) {
            await userScene.select(sceneId);
            expect(sceneSettings().doSpin).toBe(true);
            expect(sceneSettings().doAnaglyphStereo).toBe(true);
        }
        cloud.store.dispatch(setDoSpin(false));
        await userScene.select("Model Building");
        expect(sceneSettings().doSpin).toBe(false);
    });

    test("a built-in scene looks the same on its first visit and after", async () => {
        const userScene = cloud.instance.userScene;
        await userScene.select("Model Building");
        const firstVisit = { ...sceneSettings() };
        await userScene.select("Overview");
        await userScene.select("Model Building");
        const { zoom: _zoomNow, origin: _originNow, ...rest } = sceneSettings();
        const { zoom: _zoom, origin: _origin, ...firstRest } = firstVisit;
        expect(rest).toEqual(firstRest);
    });
});
