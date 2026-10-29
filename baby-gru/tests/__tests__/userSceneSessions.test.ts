/*
 * Scenes in session files (src/.roadmaps/sessions-to-scenes.md): a session replaces every scene and
 * the movie, never changes the saved preferences, and is refused while a movie plays.
 */
import { appendKeyframe, setMoviePlaying } from "@/store/movieSlice";
import { setSelectedThreeDObject } from "@/store/generalStatesSlice";
import { setDoSSAO, setDrawCrosshairs } from "@/store/sceneSettingsSlice";
import { builtInSceneDefaults } from "@/store/userScenesSlice";
import { ColourRule } from "@/utils/MoorhenColourRule";
import { MoleculeRepresentation } from "@/utils/Representation/MoorhenMoleculeRepresentation";
import { cidModel, withCidModel } from "@/utils/Representation/RepresentationBuilder";
import { readSceneList } from "@/store/userSceneFormat";
import { MoorhenTimeCapsule } from "@/utils/MoorhenTimeCapsule";
import type { Keyframe } from "@/utils/cameraPath";
import * as quat4 from "gl-matrix/quat";
import { createCloudInstance, flush, jobUrl, loadCootModules, readTestData, type CloudInstance } from "./cloudHost/cloudHostHarness";

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
        expect(shown).toHaveLength(rebuilt.length);
        expect(shown.every(rep => rebuilt.includes(rep))).toBe(true);
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
        expect(after.length).toBeGreaterThan(0);
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
        expect(plain.length).toBeGreaterThan(0);
        expect(plain.some(rep => red.includes(rep))).toBe(false);
        await userScene.select(redSnapshot);
        expect(rulesOf()).toContain("#ff0000");
        const redAgain = defaultColoured();
        expect(redAgain.length).toBeGreaterThan(0);
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

describe("a kept representation", () => {
    const shownRepresentations = () => [...state().molecules.customRepresentations];
    /** A stand-in display buffer (no WebGL here): only the fade a movie sets on it */
    const fadedBuffer = (alphaMultiplier: number) => ({
        alphaMultiplier,
        transparent: true,
        customColour: null as number[] | null,
        visible: true,
        setAlphaMultiplier(value: number) {
            this.alphaMultiplier = value;
            this.transparent = value < 0.99;
        },
    });

    test("loses a movie fade, back to its own opacity", async () => {
        const { userScene } = cloud.instance;
        const [solid, seeThrough] = shownRepresentations();
        seeThrough.nonCustomOpacity = 0.5;
        const snapshotId = userScene.takeSnapshot("Before the movie");
        const solidBuffer = fadedBuffer(0.2);
        const seeThroughBuffer = fadedBuffer(0.2);
        solid.buffers = [solidBuffer] as any;
        seeThrough.buffers = [seeThroughBuffer] as any;

        await userScene.select(snapshotId);
        expect(shownRepresentations()).toContain(solid);
        expect(solidBuffer.alphaMultiplier).toBe(1);
        expect(solidBuffer.transparent).toBe(false);
        expect(seeThroughBuffer.alphaMultiplier).toBe(1);
        expect(seeThroughBuffer.transparent).toBe(true);
    });

    test("takes the scene's place in the store and in the molecule's own list", async () => {
        const { userScene, representation } = cloud.instance;
        const molecule = cloud.instance.getMoleculeList()[0];
        const snapshotId = userScene.takeSnapshot("In order");
        const sceneOrder = shownRepresentations().map(rep => rep.style);
        // The same first representation, made again: now last
        const [first] = shownRepresentations();
        const { uniqueId: _uniqueId, ...params } = structuredClone(first.backup());
        await representation.delete(first.uniqueId);
        await representation.create(molecule.uniqueId, params as Parameters<typeof representation.create>[1]);
        expect(shownRepresentations().map(rep => rep.style)).not.toEqual(sceneOrder);

        await userScene.select(snapshotId);
        expect(shownRepresentations().map(rep => rep.style)).toEqual(sceneOrder);
        expect(molecule.representations.filter(rep => rep.isCustom).map(rep => rep.style)).toEqual(sceneOrder);
    });

    test("is never left drawn but out of the store when a rebuild fails", async () => {
        const { userScene, representation } = cloud.instance;
        const molecule = cloud.instance.getMoleculeList()[0];
        const [first, second] = shownRepresentations();
        const snapshotId = userScene.takeSnapshot("Two");
        // Now: the second, then another one. The snapshot rebuilds the first, then keeps the second
        await representation.delete(first.uniqueId);
        await representation.create(molecule.uniqueId, { representationStyle: "CAs" });
        const create = jest.spyOn(MoleculeRepresentation, "create").mockRejectedValue(new Error("rebuild failed"));
        try {
            await userScene.select(snapshotId);
        } finally {
            create.mockRestore();
        }
        const inStore = shownRepresentations();
        expect(inStore).toContain(second);
        for (const rep of molecule.representations.filter(rep => rep.isCustom)) expect(inStore).toContain(rep);
        expect(userScene.isBusy).toBe(false);
    });

    test("showing a scene, even the shown snapshot again, counts for what reads per-scene state once", async () => {
        const { userScene } = cloud.instance;
        const revision = () => state().userScenes.shownRevision;
        const snapshotId = userScene.takeSnapshot();
        const before = revision();
        await userScene.select(snapshotId);
        await userScene.select(snapshotId);
        expect(revision()).toBe(before + 2);
        await userScene.select("Default");
        await userScene.reset("Default", "default", true);
        expect(revision()).toBe(before + 4);
    });
});

describe("reading scenes from a file", () => {
    test("drops default colour rules that could not be applied", () => {
        const valid = { ruleType: "molecule", cid: "/*/*/*/*", color: "#ff0000", isMultiColourRule: false, args: [] };
        const [scene] = readSceneList(
            [
                {
                    id: "custom-1",
                    name: "From a file",
                    sections: {
                        representations: [],
                        sceneSettings: {},
                        moleculeDefaults: {
                            good: { colourRules: [valid] },
                            coot: { colourRules: null },
                            noColour: { colourRules: [{ ruleType: "molecule", cid: "/*" }] },
                            multiWithoutData: { colourRules: [{ ...valid, isMultiColourRule: true, args: [] }] },
                            notAList: { colourRules: "red" },
                        },
                    },
                },
            ],
            () => true
        );
        expect(Object.keys(scene.content.sections.moleculeDefaults).sort()).toEqual(["coot", "good"]);
    });
});

describe("vectors and 3D shapes", () => {
    const vectorIds = () => state().vectors.vectorsList.map(vector => vector.uniqueId);
    const objectIds = () => state().threeDObjects.objects.map(object => object.uniqueId);

    test("belong to the scene: each scene shows its own", async () => {
        const { userScene, vectors, object } = cloud.instance;
        const arrow = vectors.create({ xTo: 10 });
        const sphere = object.create({ type: "sphere", origin: [0, 0, 0], radius: 2 });
        expect(vectorIds()).toEqual([arrow]);
        expect(objectIds()).toEqual([sphere]);

        // Model Building, never shown: starts with what is shown, then lives on its own
        await userScene.select("Model Building");
        expect(vectorIds()).toEqual([arrow]);
        vectors.delete(arrow);
        const cube = object.create({ type: "cube", origin: [5, 5, 5] });

        await userScene.select("Default");
        expect(vectorIds()).toEqual([arrow]);
        expect(objectIds()).toEqual([sphere]);
        await userScene.select("Model Building");
        expect(vectorIds()).toEqual([]);
        expect(objectIds()).toEqual([sphere, cube]);
    });

    test("an edited one comes back as it was edited, and a list shown unchanged is not replaced", async () => {
        const { userScene, vectors } = cloud.instance;
        const arrow = vectors.create({ xTo: 10 });
        vectors.edit(arrow, { xTo: 20 });
        const snapshotId = userScene.takeSnapshot();
        const shownList = state().vectors.vectorsList;

        await userScene.select(snapshotId);
        expect(state().vectors.vectorsList).toBe(shownList);
        vectors.edit(arrow, { xTo: 30 });
        await userScene.select(snapshotId);
        expect(vectors.get(arrow).xTo).toBe(20);
    });

    test("deselect a shape the new scene does not have", async () => {
        const { userScene, object } = cloud.instance;
        const snapshotId = userScene.takeSnapshot("Empty");
        const sphere = object.create({ type: "sphere", origin: [0, 0, 0], radius: 2 });
        cloud.store.dispatch(setSelectedThreeDObject(sphere));

        await userScene.select(snapshotId);
        expect(objectIds()).toEqual([]);
        expect(state().generalStates.selectedThreeDObjectId).toBeNull();
    });

    test("are saved with the scenes in a session", async () => {
        const { userScene, vectors, object } = cloud.instance;
        await userScene.select("Model Building");
        const arrow = vectors.create({ xTo: 10 });
        const sphere = object.create({ type: "sphere", origin: [0, 0, 0], radius: 2 });
        await userScene.select("Default");
        const session = await saveSession();

        userScene.resetForLegacySession();
        expect(await loadSession(session)).toBe(0);
        expect(vectorIds()).toEqual([]);
        await userScene.select("Model Building");
        expect(vectorIds()).toEqual([arrow]);
        expect(objectIds()).toEqual([sphere]);
    });
});

describe("a session saved by Moorhen 1.0.1, before scenes", () => {
    // tests/test_data/session/1.0.1.pb, as 1.0.1 wrote it but without its two maps
    const SESSION_MOLECULE_UID = "d2216c9c-ef0d-48f7-9b71-e38b92349348";

    test("becomes the Default scene, replacing the scenes there were", async () => {
        const { userScene } = cloud.instance;
        await userScene.create("Figure");
        userScene.takeSnapshot();
        await userScene.select("Model Building");

        const file = readTestData("session/1.0.1.pb", null) as Buffer;
        const buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
        expect(await MoorhenTimeCapsule.loadSessionFromArrayBuffer(buffer, cloud.instance)).toBe(0);

        expect(sceneNames()).toEqual(["Default", "Model Building"]);
        expect(state().userScenes.snapshots).toEqual([]);
        expect(userScene.selected).toBe("Default");
        expect(cloud.instance.representation.defaultStyle).toBe("ribbons-and-ligands");
        expect(cloud.instance.getMoleculeList().map(molecule => molecule.uniqueId)).toEqual([SESSION_MOLECULE_UID]);
        expect(representationStyles()).toEqual(["CBs", "CRs"]);
        expect(state().vectors.vectorsList).toHaveLength(2);
        // The session's own view, not the Default preset
        expect(state().sceneSettings.zoom).toBeCloseTo(0.2661, 3);
    });
});
