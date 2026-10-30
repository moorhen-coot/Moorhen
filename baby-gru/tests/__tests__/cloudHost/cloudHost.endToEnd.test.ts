/*
 * CCP4 Cloud host contract, E2E: a CCP4 Cloud job from start to exit, driven the way jsCoFE's webcoot.js does it
 * (MoorhenWrapper's ccp4cloud/webcoot.js and MOORHEN_HOST_API.md), with the CCP4 Cloud helpers from referenceHost.ts.
 * IDs refer to MoorhenWrapper's CLOUD_HOST_TEST_SPEC.md.
 *
 * Node has no web component: createCloudInstance stands for mounting it with its start-up options. The Moorhen
 * menu system cannot be imported here (it pulls in CSS), so the driver records the Exit action and the tests call
 * it as a click would; the real menu entry is covered by WEB-07/08.
 */
import type { MoorhenInstance } from "@/InstanceManager";
import type { StoredPreferences } from "@/InstanceManager/MoorhenInstance";
import { setDoSSAO } from "@/store";
import { initialState as sceneSettingsInitialState } from "@/store/sceneSettingsSlice";
import { MoorhenTimeCapsule } from "@/utils/MoorhenTimeCapsule";
import type { MtzMapRequest } from "@/utils/MtzLoading";
import {
    createCloudInstance,
    createFakeHost,
    fetchCount,
    fetchedUrls,
    flush,
    jobUrl,
    loadCootModules,
    readTestData,
    resetFetch,
    waitFor,
    type CloudInstance,
    type FakeHost,
} from "./cloudHostHarness";
import { loadCloudDictionary } from "./referenceHost";

jest.setTimeout(120000);

type CloudInputFile =
    | { type: "ligand"; url: string; codes: string[] }
    | { type: "pdb"; url: string; name: string }
    | { type: "mtz"; url: string; maps: MtzMapRequest[] };

const readInputFiles = (): CloudInputFile[] => JSON.parse(readTestData("cloudJob/inputFiles.json"));
const readPreferences = (): StoredPreferences => JSON.parse(readTestData("cloudJob/preferences.moorhen-1.0.json"));

/**
 * webcoot.js: import the preferences, save every change through onChange, add the Exit action, load the
 * dictionaries one after another, then the structures and maps in parallel. Returns the Exit action.
 */
async function runCloudJob(host: FakeHost, instance: MoorhenInstance, inputFiles: CloudInputFile[], preferences: unknown) {
    await instance.preferences.import(preferences);
    host.attach(instance);
    const exitAction = () => onExit(host, instance);

    for (const f of inputFiles) {
        if (f.type === "ligand") await loadCloudDictionary(instance, jobUrl(f.url), f.codes);
    }
    await Promise.all(
        inputFiles.map(f => {
            if (f.type === "pdb") {
                // the molecule is named after the file name without its extension: keep the source's extension
                const ext = new URL(jobUrl(f.url)).pathname.match(/\.(pdb|ent|cif|mmcif)$/i);
                return instance.files.loadFiles({ url: jobUrl(f.url), filename: f.name + (ext ? ext[0] : ".pdb") }, "cloud");
            }
            return f.type === "mtz" ? instance.files.loadMtz(jobUrl(f.url), f.maps, "cloud") : null;
        })
    );
    return exitAction;
}

/** webcoot.js onExit: send getCloudExitData to the exit callback. Preferences are saved by onChange only */
async function onExit(host: FakeHost, instance: MoorhenInstance) {
    return host.onExit(instance);
}

const mapByName = (instance: MoorhenInstance, name: string) => instance.getMapList().find(map => map.name === name);
const mapColour = (list: { molNo: number; rgb: unknown }[], molNo: number) => list.find(item => item.molNo === molNo)?.rgb;

let cloud: CloudInstance;
let host: FakeHost;
const extraCleanups: (() => Promise<void>)[] = [];

beforeAll(loadCootModules);

beforeEach(async () => {
    resetFetch();
    host = createFakeHost();
    cloud = await createCloudInstance({ backupStorage: host.backupStorage, modificationCountBackupThreshold: 2 });
});

afterEach(async () => {
    await cloud.cleanup();
    while (extraCleanups.length) await extraCleanups.pop()();
});

describe("E2E: a CCP4 Cloud job from start to exit", () => {
    test("E2E-01 the job loads one molecule, two maps and the imported preferences", async () => {
        const { instance, store } = cloud;
        await runCloudJob(host, instance, readInputFiles(), readPreferences());

        expect(instance.getMoleculeList().map(molecule => molecule.name)).toEqual(["molecule"]);
        expect(instance.getMapList().map(map => map.name).sort()).toEqual(["diff-map", "map"]);
        const map = mapByName(instance, "map");
        expect(store.getState().generalStates.activeMap?.molNo).toBe(map.molNo);
        expect(map.hasReflectionData).toBe(true);
        expect(mapByName(instance, "diff-map").isDifference).toBe(true);

        expect(store.getState().mapContourSettings.defaultMapSamplingRate).toBe(2.5);
        expect(store.getState().sceneSettings.backgroundColor).toEqual([0.1, 0.1, 0.1, 1]);
    });

    test("E2E-02 the MTZ is fetched once and the dictionary before the structure", async () => {
        await runCloudJob(host, cloud.instance, readInputFiles(), readPreferences());

        expect(fetchCount(jobUrl("5a3h_sigmaa.mtz"))).toBe(1);
        const urls = fetchedUrls();
        const dictionaryIndex = urls.indexOf(jobUrl("nitrobenzene.cif"));
        const structureIndex = urls.indexOf(jobUrl("5a3h-nitrobenzene.pdb"));
        expect(dictionaryIndex).toBeGreaterThanOrEqual(0);
        expect(structureIndex).toBeGreaterThan(dictionaryIndex);
    });

    test("E2E-03 exit without edits sends no molecules and the host's preferences stay the imported ones", async () => {
        // The host no longer exports preferences on exit and import does not fire onChange, so nothing is saved:
        // the host's stored copy (settings.webcoot_pref) remains the imported object, which still matches Moorhen's
        const preferences = readPreferences();
        const exit = await runCloudJob(host, cloud.instance, readInputFiles(), preferences);

        const payload = await exit();
        expect(host.exitPayloads[0]).toBe(payload);
        expect(payload.molData).toEqual([]);
        expect(payload.viewData).toBeDefined();
        expect(payload.viewData.origin).toHaveLength(3);
        expect(host.savedPreferences).toEqual([]);
        expect(await cloud.instance.preferences.export()).toEqual(preferences);
    });

    test("E2E-04 exit after an edit sends the edited molecule and the dictionary", async () => {
        const { instance } = cloud;
        const exit = await runCloudJob(host, instance, readInputFiles(), readPreferences());
        const molecule = instance.getMoleculeList()[0];
        const residueLine = /^ATOM.{9}.{4}MET A   1 /m;
        expect(await molecule.getAtoms("pdb")).toMatch(residueLine);

        await molecule.deleteCid("//A/1");

        const payload = await exit();
        expect(payload.molData).toHaveLength(1);
        const [entry] = payload.molData;
        expect(entry.molName).toBe("molecule");
        expect(entry.isMRSearchModel).toBe(false);
        expect(entry.pdbData).not.toMatch(residueLine);
        expect(entry.pdbData).toMatch(/^ATOM.{9}.{4}... A   2 /m);
        // mmCIF: no atom of chain A residue 1 left (label_asym/auth_asym A, auth_seq_id 1 of MET)
        expect(entry.mmcifData).toContain("_atom_site");
        expect(entry.mmcifData).not.toMatch(/^ATOM\s+\d+\s+\S+\s+\S+\s+\.?\s*MET\s+A\s+\S+\s+1\s/m);
        expect(entry.mmcifData).toMatch(/\sMET\s/);
        expect(payload.ligData.some(dictionary => dictionary.includes("data_comp_LIG"))).toBe(true);
    });

    test("E2E-05 a scene setting saved then saved back to default is added then removed, through onChange alone", async () => {
        const { instance, store } = cloud;
        const exit = await runCloudJob(host, instance, readInputFiles(), readPreferences());
        const changed = !sceneSettingsInitialState.doSSAO;

        // Editing the scene is not a preference until the scene is saved
        store.dispatch(setDoSSAO(changed));
        await flush(100);
        expect(host.savedPreferences).toEqual([]);
        instance.userScene.saveScene("Overview");
        await waitFor(() => host.savedPreferences.some(stored => stored.entries["Overview.doSSAO"]?.value === changed));
        const addedIndex = host.savedPreferences.findIndex(stored => stored.entries["Overview.doSSAO"]?.value === changed);

        store.dispatch(setDoSSAO(sceneSettingsInitialState.doSSAO));
        instance.userScene.saveScene("Overview");
        await waitFor(() => host.savedPreferences.slice(addedIndex + 1).some(stored => !("Overview.doSSAO" in stored.entries)));

        const savedBeforeExit = host.savedPreferences.length;
        await exit();
        // exit saves nothing: the last onChange already holds the reset
        expect(host.savedPreferences).toHaveLength(savedBeforeExit);
        const last = host.savedPreferences[host.savedPreferences.length - 1];
        expect(last.entries).not.toHaveProperty("Overview.doSSAO");
        expect(last).toEqual(readPreferences());
        expect(host.exitPayloads).toHaveLength(1);
    });

    test("E2E-06 edits trigger an automatic backup that a fresh instance restores", async () => {
        const { instance } = cloud;
        await runCloudJob(host, instance, readInputFiles(), readPreferences());
        const molecule = instance.getMoleculeList()[0];

        // threshold is 2 modifications
        await molecule.deleteCid("//A/1");
        await molecule.deleteCid("//A/2");
        await waitFor(() => [...host.backups.values()].some(backup => backup.type === "automatic"));
        const sessionBackups = [...host.backups.values()].filter(backup => backup.type === "automatic");
        expect(sessionBackups).toHaveLength(1);
        expect(sessionBackups[0].molNames).toEqual(["molecule"]);
        const editedAtomCount = (await molecule.getAtoms("pdb")).split("\n").filter(line => line.startsWith("ATOM")).length;

        const fresh = await createCloudInstance({ backupStorage: host.backupStorage, modificationCountBackupThreshold: 2 });
        extraCleanups.push(fresh.cleanup);
        const backup = await fresh.instance.getTimeCapsuleRef().current.retrieveLastBackup();
        expect(typeof backup).toBe("string");
        const status = await MoorhenTimeCapsule.loadSessionFromJsonString(backup as string, fresh.instance);
        expect(status).toBe(0);

        const restored = fresh.instance.getMoleculeList();
        expect(restored.map(item => item.name)).toEqual(["molecule"]);
        const restoredPdb = await restored[0].getAtoms("pdb");
        expect(restoredPdb).not.toMatch(/^ATOM.{9}.{4}... A   [12] /m);
        expect(restoredPdb.split("\n").filter(line => line.startsWith("ATOM")).length).toBe(editedAtomCount);
        expect(fresh.instance.getMapList().map(map => map.name).sort()).toEqual(["diff-map", "map"]);
    });

    test("E2E-07 regression: wrong Fobs/SigFobs labels still load both maps, without reflection data", async () => {
        const { instance } = cloud;
        const inputFiles = readInputFiles();
        const mtz = inputFiles.find(f => f.type === "mtz") as Extract<CloudInputFile, { type: "mtz" }>;
        mtz.maps[0].columns = { ...mtz.maps[0].columns, Fobs: "F", SigFobs: "SIGF" };
        const exit = await runCloudJob(host, instance, inputFiles, readPreferences());

        expect(instance.getMapList().map(map => map.name).sort()).toEqual(["diff-map", "map"]);
        const map = mapByName(instance, "map");
        expect(map.hasReflectionData).toBe(false);
        expect(cloud.store.getState().generalStates.activeMap?.molNo).toBe(map.molNo);

        const payload = await exit();
        expect(payload.molData).toEqual([]);
        expect(payload.viewData).toBeDefined();
        expect(host.exitPayloads).toHaveLength(1);
    });

    test("E2E-08 anomalous maps in the same MTZ entry: four maps, one fetch, colours, map still active", async () => {
        const { instance, store } = cloud;
        const inputFiles = readInputFiles();
        const mtz = inputFiles.find(f => f.type === "mtz") as Extract<CloudInputFile, { type: "mtz" }>;
        const anomColour = { r: 0.733, g: 0.2, b: 1.0 };
        const positiveColour = { r: 0.055, g: 0.4, b: 0.333 };
        const negativeColour = { r: 0.98, g: 0.5, b: 0.45 };
        mtz.maps.push(
            { name: "anom-map", columns: { F: "FWT", PHI: "PHWT" }, isDifference: false, calcStructFact: false, style: { colour: anomColour } },
            {
                name: "anom-diff-map",
                columns: { F: "DELFWT", PHI: "PHDELWT" },
                isDifference: true,
                calcStructFact: false,
                style: { positiveColour, negativeColour },
            }
        );
        await runCloudJob(host, instance, inputFiles, readPreferences());

        expect(instance.getMapList().map(map => map.name).sort()).toEqual(["anom-diff-map", "anom-map", "diff-map", "map"]);
        expect(fetchCount(jobUrl("5a3h_sigmaa.mtz"))).toBe(1);

        const settings = store.getState().mapContourSettings;
        const anomMap = mapByName(instance, "anom-map");
        const anomDiffMap = mapByName(instance, "anom-diff-map");
        expect(anomDiffMap.isDifference).toBe(true);
        expect(mapColour(settings.mapColours, anomMap.molNo)).toEqual(anomColour);
        expect(mapColour(settings.positiveMapColours, anomDiffMap.molNo)).toEqual(positiveColour);
        expect(mapColour(settings.negativeMapColours, anomDiffMap.molNo)).toEqual(negativeColour);
        expect(store.getState().generalStates.activeMap?.molNo).toBe(mapByName(instance, "map").molNo);
    });

    test("E2E-09 a ligand input with a code creates the monomer before the structure", async () => {
        const { instance } = cloud;
        const inputFiles = readInputFiles();
        const ligand = inputFiles.find(f => f.type === "ligand") as Extract<CloudInputFile, { type: "ligand" }>;
        ligand.codes = ["LIG"];
        const exit = await runCloudJob(host, instance, inputFiles, readPreferences());

        expect(instance.getMoleculeList().map(molecule => molecule.name).sort()).toEqual(["LIG", "molecule"]);
        const monomer = instance.getMoleculeList().find(molecule => molecule.name === "LIG");
        expect(monomer.isLigand).toBe(true);

        const payload = await exit();
        const compIdsOf = (dictionary: string) =>
            [...dictionary.matchAll(/^\s*data_comp_(\S+)/gm)].map(match => match[1]).filter(compId => compId !== "list");
        expect(payload.ligData.flatMap(compIdsOf).filter(compId => compId === "LIG")).toHaveLength(1);
        expect(payload.molData.map(entry => entry.molName)).not.toContain("LIG");
    });
});
