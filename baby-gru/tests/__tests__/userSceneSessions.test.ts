/*
 * Scenes in session files (src/.roadmaps/sessions-to-scenes.md): a session replaces every scene and
 * the movie, never changes the saved preferences, and is refused while a movie plays.
 */
import { appendKeyframe, setMoviePlaying } from "@/store/movieSlice";
import { setDoSSAO, setDrawCrosshairs } from "@/store/sceneSettingsSlice";
import { builtInSceneDefaults } from "@/store/userScenesSlice";
import { ColourRule } from "@/utils/MoorhenColourRule";
import { cidModel, withCidModel } from "@/utils/Representation/RepresentationBuilder";
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

describe("default colour rules of a molecule", () => {
    const molecule = () => cloud.instance.getMoleculeList()[0];
    const rulesOf = () => JSON.stringify(molecule().defaultColourRules.map(rule => [rule.ruleType, rule.cid, rule.color]));
    /** As the colour rules card does: one red rule for the whole molecule */
    const colourRed = () => {
        const rule = new ColourRule("molecule", "/*/*/*/*", "#ff0000", cloud.instance.commandCentre, false);
        rule.setParentMolecule(molecule());
        molecule().defaultColourRules = [rule];
    };
    const defaultColoured = () => state().molecules.customRepresentations.filter(rep => rep.useDefaultColourRules);

    test("belong to the scene: each scene shows its own", async () => {
        const { userScene } = cloud.instance;
        const defaultRules = rulesOf();
        await userScene.select("Model Building");
        colourRed();
        const redRules = rulesOf();
        expect(redRules).not.toBe(defaultRules);

        await userScene.select("Default");
        expect(rulesOf()).toBe(defaultRules);
        await userScene.select("Model Building");
        expect(rulesOf()).toBe(redRules);
    });

    test("rebuild the representations that use them when they change, and only then", async () => {
        const { userScene } = cloud.instance;
        expect(defaultColoured().length).toBeGreaterThan(0);
        const sameColours = userScene.takeSnapshot("Same colours");
        colourRed();
        const redSnapshot = userScene.takeSnapshot("Red");
        const red = defaultColoured();

        // Other colours: rebuilt, both ways
        await userScene.select(sameColours);
        const plain = defaultColoured();
        expect(plain.some(rep => red.includes(rep))).toBe(false);
        await userScene.select(redSnapshot);
        expect(rulesOf()).toContain("#ff0000");
        const redAgain = defaultColoured();
        expect(redAgain.some(rep => plain.includes(rep))).toBe(false);

        // The same colours (the snapshot selected again): kept, the same objects
        await userScene.select(redSnapshot);
        expect(defaultColoured().every(rep => redAgain.includes(rep))).toBe(true);
    });

    test("are saved with the scenes in a session", async () => {
        const { userScene } = cloud.instance;
        const defaultRules = rulesOf();
        await userScene.select("Model Building");
        colourRed();
        const redRules = rulesOf();
        await userScene.select("Default");
        const session = await saveSession();

        userScene.resetForLegacySession();
        expect(await loadSession(session)).toBe(0);
        expect(rulesOf()).toBe(defaultRules);
        await userScene.select("Model Building");
        expect(rulesOf()).toBe(redRules);
    });

    test("go back to Coot's when a scene is reset with its representations", async () => {
        const { userScene } = cloud.instance;
        const cootRules = rulesOf();
        colourRed();
        expect(await userScene.reset("Default", "default", true)).toBe(true);
        expect(rulesOf()).toBe(cootRules);
    });
});

describe("the model shown by a representation of a multi-model molecule", () => {
    test("is read from and written to the first component of its CID", () => {
        expect(cidModel("/2/A/10-20/*")).toBe(2);
        expect(cidModel("/*/*/*/*:*")).toBeNull();
        expect(cidModel("//A/")).toBeNull();
        expect(cidModel("/0/*/*/*:*")).toBeNull();
        expect(withCidModel("/*/*/*/*:*", 2)).toBe("/2/*/*/*:*");
        expect(withCidModel("//A/*/", 3)).toBe("/3/A/*/");
        expect(withCidModel("/2/*/*/*:*", 0)).toBe("/*/*/*/*:*");
    });

    test("is kept when the representation is rebuilt from its scene", async () => {
        const { userScene, representation } = cloud.instance;
        const [loaded] = await cloud.instance.files.loadFiles({ url: jobUrl("two-models.pdb"), filename: "two-models.pdb" }, "cloud");
        const molecule = cloud.instance.getMolecule(loaded.uniqueID);
        expect(molecule.numberOfModels).toBe(2);
        const uid = await representation.create(molecule.uniqueId, { representationStyle: "CBs" });
        const shownModel = () => representation.getList(molecule.uniqueId).find(rep => rep.uniqueId === uid)?.cid;
        representation.getList(molecule.uniqueId).find(rep => rep.uniqueId === uid).setShownMultimodel(2);
        expect(cidModel(shownModel())).toBe(2);

        // Model Building shows other representations: back in Default, this one is rebuilt
        await userScene.select("Model Building");
        await userScene.select("Default");
        expect(cidModel(shownModel())).toBe(2);
    });
});
