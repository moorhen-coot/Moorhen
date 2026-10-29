/*
 * Scenes in session files (src/.roadmaps/sessions-to-scenes.md): a session replaces every scene and
 * the movie, never changes the saved preferences, and is refused while a movie plays.
 */
import { appendKeyframe, setMoviePlaying } from "@/store/movieSlice";
import { setDoSSAO, setDrawCrosshairs } from "@/store/sceneSettingsSlice";
import { builtInSceneDefaults } from "@/store/userScenesSlice";
import { MoorhenTimeCapsule } from "@/utils/MoorhenTimeCapsule";
import type { Keyframe } from "@/utils/cameraPath";
import * as quat4 from "gl-matrix/quat";
import { createCloudInstance, flush, jobUrl, loadCootModules, type CloudInstance } from "./cloudHost/cloudHostHarness";

jest.setTimeout(120000);

let cloud: CloudInstance;

beforeAll(loadCootModules);

beforeEach(async () => {
    cloud = await createCloudInstance();
    await cloud.instance.files.loadFiles({ url: jobUrl("5a3h.pdb"), filename: "molecule.pdb" }, "cloud");
});

afterEach(async () => {
    await cloud.instance.getPreferences().localStorageInstance.clear();
    await cloud.cleanup();
});

const state = () => cloud.store.getState();
const sceneNames = () => state().userScenes.scenes.map(scene => scene.name);
const representationStyles = () => state().molecules.customRepresentations.map(rep => rep.style).sort();
const storedKeys = async () => (await cloud.instance.getPreferences().localStorageInstance.keys()).sort();

/** The session as saved now, as JSON (what the time capsule stores) */
const saveSession = async () => JSON.stringify(await cloud.instance.getTimeCapsuleRef().current.fetchSession(false));

const loadSession = (session: string) => MoorhenTimeCapsule.loadSessionFromJsonString(session, cloud.instance);

const keyframe: Keyframe = {
    quat: quat4.fromValues(0, 0, 0, -1),
    origin: [0, 0, 0],
    zoom: 1,
    clipFront: 8, clipBack: 21, fogFront: 8, fogBack: 21,
};

describe("loading a session", () => {
    test("restores its scenes and snapshots, and changes no saved preference", async () => {
        const { userScene } = cloud.instance;
        // Unsaved Default settings, a custom scene, a snapshot, and Model Building shown
        cloud.store.dispatch(setDoSSAO(!builtInSceneDefaults("Default").doSSAO));
        const customId = await userScene.create("Figure");
        userScene.takeSnapshot("Close-up");
        await userScene.select("Model Building");
        const session = await saveSession();
        await flush(100);
        const savedBefore = state().userScenes.savedSceneSettings;
        const storedBefore = await storedKeys();

        // Forget the scenes, then load the session
        userScene.resetForLegacySession();
        expect(await loadSession(session)).toBe(0);

        expect(sceneNames()).toEqual(["Default", "Model Building", "Figure"]);
        expect(state().userScenes.snapshots.map(snapshot => snapshot.name)).toEqual(["Close-up"]);
        expect(userScene.selected).toBe("Model Building");
        expect(await userScene.select(customId)).toBe(true);
        // The session's Default keeps its unsaved settings, the preferences their saved ones
        await userScene.select("Default");
        expect(state().sceneSettings.doSSAO).toBe(!builtInSceneDefaults("Default").doSSAO);
        await flush(100);
        expect(state().userScenes.savedSceneSettings).toEqual(savedBefore);
        expect(await storedKeys()).toEqual(storedBefore);
    });

    test("without scenes (older Moorhen) makes it the Default scene, keeping settings it does not carry", async () => {
        const { userScene } = cloud.instance;
        const session = JSON.parse(await saveSession());
        delete session.sceneData;
        await userScene.create("Figure");
        await userScene.select("Model Building");
        // Not saved in older sessions
        cloud.store.dispatch(setDrawCrosshairs(!state().sceneSettings.drawCrosshairs));
        const crosshairs = state().sceneSettings.drawCrosshairs;

        expect(await loadSession(JSON.stringify(session))).toBe(0);
        expect(sceneNames()).toEqual(["Default", "Model Building"]);
        expect(state().userScenes.snapshots).toEqual([]);
        expect(userScene.selected).toBe("Default");
        expect(state().sceneSettings.drawCrosshairs).toBe(crosshairs);
        expect(cloud.instance.representation.defaultStyle).toBe("ribbons-and-ligands");
    });

    test("from a more recent Moorhen is refused, leaving everything as it was", async () => {
        const { userScene } = cloud.instance;
        const session = JSON.parse(await saveSession());
        await userScene.create("Figure");
        const moleculesBefore = state().molecules.moleculeList;
        const sceneData = JSON.parse(session.sceneData);

        const newerScenes = { ...session, sceneData: JSON.stringify({ ...sceneData, formatVersion: sceneData.formatVersion + 1 }) };
        const newerSession = { ...session, version: `v${parseInt(session.version.replace(/^v/, "")) + 1}` };
        for (const newer of [newerScenes, newerSession]) {
            expect(await loadSession(JSON.stringify(newer))).toBe(MoorhenTimeCapsule.NEWER_VERSION_STATUS);
            expect(state().molecules.moleculeList).toBe(moleculesBefore);
            expect(sceneNames()).toEqual(["Default", "Model Building", "Figure"]);
            expect(userScene.selected).toBe("custom-1");
        }
    });

    test("clears the movie", async () => {
        const session = await saveSession();
        cloud.store.dispatch(appendKeyframe(keyframe));
        expect(await loadSession(session)).toBe(0);
        expect(state().movie.document.path.keyframes).toEqual([]);
    });

    test("is refused while a movie plays, leaving everything as it was", async () => {
        const { userScene } = cloud.instance;
        const session = await saveSession();
        await userScene.create("Figure");
        cloud.store.dispatch(appendKeyframe(keyframe));
        cloud.store.dispatch(setMoviePlaying(true));
        const moleculesBefore = state().molecules.moleculeList;

        expect(await loadSession(session)).toBe(MoorhenTimeCapsule.MOVIE_PLAYING_STATUS);
        expect(state().molecules.moleculeList).toBe(moleculesBefore);
        expect(sceneNames()).toEqual(["Default", "Model Building", "Figure"]);
        expect(state().movie.document.path.keyframes).toHaveLength(1);
        expect(cloud.instance.getTimeCapsuleRef().current.busy).toBe(false);
    });
});

describe("copying a scene with its representations", () => {
    test("gives the target the source's representations, shown on its next visit", async () => {
        const { userScene } = cloud.instance;
        const defaultStyles = representationStyles();
        expect(defaultStyles.length).toBeGreaterThan(0);
        await userScene.select("Model Building");
        expect(representationStyles()).not.toEqual(defaultStyles);

        await userScene.select("Default");
        expect(await userScene.copyFrom("Model Building", "Default", true)).toBe(true);
        await userScene.select("Model Building");
        expect(representationStyles()).toEqual(defaultStyles);
    });
});

describe("switching between scenes that draw the same representations", () => {
    const shownRepresentations = () => [...state().molecules.customRepresentations];

    test("keeps them instead of rebuilding them, with the new scene's ids and order", async () => {
        const { userScene } = cloud.instance;
        const snapshotId = userScene.takeSnapshot("Same look");
        const snapshotIds = shownRepresentations().map(rep => rep.uniqueId);
        // Rebuilt from scratch: the same representations, with new ids
        expect(await userScene.reset("Default", "default", true)).toBe(true);
        const rebuilt = shownRepresentations();
        expect(rebuilt.map(rep => rep.uniqueId)).not.toEqual(snapshotIds);
        expect(rebuilt.map(rep => rep.style).sort()).toEqual(representationStyles());

        await userScene.select(snapshotId);
        const shown = shownRepresentations();
        // The same objects (nothing rebuilt), now answering to the snapshot's ids
        expect(new Set(shown)).toEqual(new Set(rebuilt));
        expect(shown.map(rep => rep.uniqueId)).toEqual(snapshotIds);
        expect(cloud.instance.getMoleculeList()[0].representations.filter(rep => rep.isCustom)).toHaveLength(shown.length);
    });

    test("keeps one that is only hidden or shown differently, and applies its visibility", async () => {
        const { userScene } = cloud.instance;
        const [first] = shownRepresentations();
        first.hide();
        const snapshotId = userScene.takeSnapshot("Hidden");
        await first.show();
        expect(first.visible).toBe(true);

        await userScene.select(snapshotId);
        const kept = shownRepresentations().find(rep => rep.uniqueId === first.uniqueId);
        expect(kept).toBe(first);
        expect(kept.visible).toBe(false);
    });

    test("rebuilds the ones that differ", async () => {
        const { userScene } = cloud.instance;
        const before = shownRepresentations();
        await userScene.select("Model Building");
        const after = shownRepresentations();
        expect(after.some(rep => before.includes(rep))).toBe(false);
    });
});
