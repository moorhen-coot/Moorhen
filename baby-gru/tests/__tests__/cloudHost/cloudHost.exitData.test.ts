/*
 * CCP4 Cloud host contract, EXT: the data CCP4 Cloud saves as the job output when the user presses Exit.
 * IDs refer to MoorhenWrapper's CLOUD_HOST_TEST_SPEC.md.
 *
 * The spec's `session.getModifiedMolecules()`, `session.getLigandDictionaries()` and `view.get()` are now CCP4 Cloud
 * helper code: `(await getCloudExitData(instance)).molData / .ligData / .viewData` (copied in referenceHost.ts).
 * molData entries are `{ molName, pdbData, mmcifData, isMRSearchModel }`. These tests check that the Moorhen
 * internals the helper relies on (History, MoorhenMolecule flags and ligandDicts, sceneSettings and glRef state)
 * keep working.
 */
import { createCloudInstance, createFakeHost, jobUrl, loadCootModules, readTestData, resetFetch, type CloudInstance } from "./cloudHostHarness";
import { getCloudExitData, loadCloudDictionary, type CloudViewData } from "./referenceHost";
import { setBackgroundColor, setOrigin, setZoom } from "@/store/sceneSettingsSlice";
import { setQuat } from "@/store/glRefSlice";

jest.setTimeout(60000);

let cloud: CloudInstance;

beforeAll(loadCootModules);

beforeEach(async () => {
    resetFetch();
    cloud = await createCloudInstance();
});

afterEach(() => cloud.cleanup());

/** Load a job file as CCP4 Cloud does (`filename` = molecule name + extension) and return the molecule */
const loadMolecule = async (fileName: string, filename: string) => {
    const result = await cloud.instance.files.loadFiles({ url: jobUrl(fileName), filename }, "cloud");
    return cloud.instance.getMolecule(result.find(item => item.type === "molecule").uniqueID);
};

/** True if a PDB string has any atom in residue `chain`/`resNo` */
const pdbHasResidue = (pdb: string, chain: string, resNo: number) =>
    pdb.split("\n").some(line => /^(ATOM  |HETATM)/.test(line) && line.slice(21, 26) === `${chain}${String(resNo).padStart(4)}`);

/** Every comp_id defined by a dictionary (its `data_comp_XXX` blocks, except `data_comp_list`) */
const compIds = (dictionary: string): string[] =>
    [...dictionary.matchAll(/^\s*data_comp_(\S+)/gm)].map(match => match[1]).filter(compId => compId !== "list");

const VIEW_DATA_KEYS = [
    "origin",
    "backgroundColor",
    "ambientLight",
    "diffuseLight",
    "lightPosition",
    "specularLight",
    "specularPower",
    "fogStart",
    "fogEnd",
    "zoom",
    "doDrawClickedAtomLines",
    "clipStart",
    "clipEnd",
    "quat4",
    "shadows",
    "ssao",
    "edgeDetection",
    "doPerspectiveProjection",
    "blur",
];

/** Reference: MoorhenWrapper's getViewSettings (src/MoorhenWrapper.tsx), copied verbatim apart from the types */
function getViewSettings(store: CloudInstance["store"]): CloudViewData {
    const sceneSettings = store.getState().sceneSettings;
    return {
        origin: sceneSettings.origin as [number, number, number],
        backgroundColor: sceneSettings.backgroundColor,
        ambientLight: sceneSettings.ambient,
        diffuseLight: sceneSettings.diffuse,
        lightPosition: sceneSettings.lightPosition,
        specularLight: sceneSettings.specular,
        fogStart: sceneSettings.fogStart,
        fogEnd: sceneSettings.fogEnd,
        zoom: sceneSettings.zoom,
        doDrawClickedAtomLines: false,
        clipStart: sceneSettings.clipStart * -1,
        clipEnd: sceneSettings.clipEnd,
        specularPower: sceneSettings.specularPower,
        quat4: store.getState().glRef.quat,
        doPerspectiveProjection: sceneSettings.doPerspectiveProjection,
        edgeDetection: {
            enabled: sceneSettings.doEdgeDetect,
            depthScale: sceneSettings.edgeDetectDepthScale,
            depthThreshold: sceneSettings.edgeDetectDepthThreshold,
            normalScale: sceneSettings.edgeDetectNormalScale,
            normalThreshold: sceneSettings.edgeDetectNormalThreshold,
        },
        shadows: sceneSettings.doShadow,
        ssao: {
            enabled: sceneSettings.doSSAO,
            radius: sceneSettings.ssaoRadius,
            bias: sceneSettings.ssaoBias,
        },
        blur: {
            enabled: sceneSettings.useOffScreenBuffers,
            radius: sceneSettings.depthBlurRadius,
            depth: sceneSettings.depthBlurDepth,
        },
    };
}

describe("EXT: exit data", () => {
    test("EXT-01 a structure loaded with no edits is not returned", async () => {
        await loadMolecule("5a3h.pdb", "molecule.pdb");
        expect(cloud.commandCentre.history.getModifiedMolNo()).toEqual([]);
        const { molData } = await getCloudExitData(cloud.instance);
        expect(molData).toEqual([]);
    });

    test("EXT-02 an edited molecule is returned, with PDB and mmCIF reflecting the edit", async () => {
        const molecule = await loadMolecule("5a3h.pdb", "molecule.pdb");
        const pdbBefore = await molecule.getAtoms("pdb");
        const mmcifBefore = await molecule.getAtoms("mmcif");
        expect(pdbHasResidue(pdbBefore, "A", 100)).toBe(true);

        await molecule.deleteCid("/1/A/100");
        expect(cloud.commandCentre.history.getModifiedMolNo()).toEqual([molecule.molNo]);

        const { molData } = await getCloudExitData(cloud.instance);
        expect(molData).toHaveLength(1);
        expect(molData[0].molName).toBe("molecule");
        expect(molData[0].isMRSearchModel).toBe(false);
        expect(molData[0].pdbData.length).toBeGreaterThan(0);
        expect(pdbHasResidue(molData[0].pdbData, "A", 100)).toBe(false);
        expect(pdbHasResidue(molData[0].pdbData, "A", 101)).toBe(true);
        expect(molData[0].mmcifData.length).toBeGreaterThan(0);
        expect(molData[0].mmcifData).toContain("_atom_site");
        expect(molData[0].mmcifData).not.toBe(mmcifBefore);
        expect(molData[0].mmcifData.length).toBeLessThan(mmcifBefore.length);
    });

    test("EXT-03 with two structures, only the edited one is returned", async () => {
        const first = await loadMolecule("5a3h.pdb", "molecule.pdb");
        const second = await loadMolecule("5fjj.pdb", "molecule_1.pdb");
        await second.deleteCid("/1/A/120");
        expect(cloud.commandCentre.history.getModifiedMolNo()).toEqual([second.molNo]);
        expect(first.molNo).not.toBe(second.molNo);

        const { molData } = await getCloudExitData(cloud.instance);
        expect(molData.map(item => item.molName)).toEqual(["molecule_1"]);
    });

    test("EXT-04 after going back in history (detached head) every molecule is returned", async () => {
        await loadMolecule("5a3h.pdb", "molecule.pdb");
        const second = await loadMolecule("5fjj.pdb", "molecule_1.pdb");
        await second.deleteCid("/1/A/120");
        await second.deleteCid("/1/A/121");
        const history = cloud.commandCentre.history;
        const edits = history.entries.filter(entry => entry.changesMolecules?.length > 0);
        expect(edits).toHaveLength(2);
        // The app's own "go back to this history step" (HistoryMenu, restoring the step's time capsule backup and then
        // calling history.setCurrentHead) is commented out, and Molecule.undo() journals a new entry instead of
        // detaching the head. So the detached head is set the way that code would: on the first edit.
        history.setCurrentHead(edits[0].uniqueId, true);
        expect(history.headIsDetached).toBe(true);

        const { molData } = await getCloudExitData(cloud.instance);
        expect(molData.map(item => item.molName).sort()).toEqual(["molecule", "molecule_1"]);
    });

    test("EXT-05 an unedited MR search model is returned with isMRSearchModel true", async () => {
        const molecule = await loadMolecule("5a3h.pdb", "molecule.pdb");
        await loadMolecule("5fjj.pdb", "molecule_1.pdb");
        molecule.isMRSearchModel = true;
        expect(cloud.commandCentre.history.getModifiedMolNo()).toEqual([]);

        const { molData } = await getCloudExitData(cloud.instance);
        expect(molData).toHaveLength(1);
        expect(molData[0].molName).toBe("molecule");
        expect(molData[0].isMRSearchModel).toBe(true);
        expect(molData[0].pdbData.length).toBeGreaterThan(0);
        expect(molData[0].mmcifData.length).toBeGreaterThan(0);
    });

    test("EXT-06 a ligand molecule is never returned, even if edited", async () => {
        // A structure that only contains the LIG residue of 5a3h-nitrobenzene.pdb
        const ligand = await loadMolecule("cloudJob/nitrobenzene-ligand.pdb", "ligand.pdb");
        expect(ligand.isLigand).toBe(true);
        await ligand.deleteCid("/1/A/301/O1");
        expect(cloud.commandCentre.history.getModifiedMolNo()).toEqual([ligand.molNo]);

        const { molData } = await getCloudExitData(cloud.instance);
        expect(molData).toEqual([]);
    });

    test("EXT-07 a monomer created from a dictionary is not returned", async () => {
        const created = await loadCloudDictionary(cloud.instance, jobUrl("nitrobenzene.cif"), ["LIG"]);
        expect(created).toHaveLength(1);
        expect(cloud.instance.getMolecule(created[0].uniqueID).isLigand).toBe(true);

        const { molData } = await getCloudExitData(cloud.instance);
        expect(molData).toEqual([]);
    });

    test("EXT-08 returned names are the loaded names, with no extension", async () => {
        const first = await loadMolecule("5a3h.pdb", "molecule.pdb");
        const second = await loadMolecule("5fjj.pdb", "molecule_1.pdb");
        await first.deleteCid("/1/A/100");
        await second.deleteCid("/1/A/120");

        const { molData } = await getCloudExitData(cloud.instance);
        expect(molData.map(item => item.molName).sort()).toEqual(["molecule", "molecule_1"]);
    });

    test("EXT-09 ligand dictionaries are the union of molecule and loaded dictionaries, one per comp_id", async () => {
        // On a molecule: LZA, added with Molecule.addDict
        const molecule = await loadMolecule("5a3h.pdb", "molecule.pdb");
        await molecule.addDict(readTestData("LZA.cif"));
        expect(Object.keys(molecule.ligandDicts)).toEqual(["LZA"]);
        // Loaded with a monomer: LIG, cached on the monomer molecule and in the helper's loaded dictionaries
        await loadCloudDictionary(cloud.instance, jobUrl("nitrobenzene.cif"), ["LIG"]);
        // Loaded with no codes: BGC
        await loadCloudDictionary(cloud.instance, jobUrl("BGC.cif"));
        // A later dictionary for LIG (benzene.cif also defines comp_id LIG): the first one seen wins
        await loadCloudDictionary(cloud.instance, jobUrl("benzene.cif"));

        const { ligData } = await getCloudExitData(cloud.instance);
        const allCompIds = ligData.flatMap(compIds);
        expect(allCompIds.sort()).toEqual(["BGC", "LIG", "LZA"]);
        // nitrobenzene's LIG has a nitrogen, benzene's does not
        const lig = ligData.find(dictionary => compIds(dictionary).includes("LIG"));
        expect(lig).toMatch(/\bN1\b/);
    });

    test("EXT-10 view data has every field, taken from sceneSettings and glRef", async () => {
        const { viewData } = await getCloudExitData(cloud.instance);
        const state = cloud.store.getState();
        const scene = state.sceneSettings;

        expect(Object.keys(viewData).sort()).toEqual([...VIEW_DATA_KEYS].sort());
        const findUndefined = (value: unknown, at: string): string[] =>
            value === undefined
                ? [at]
                : value && typeof value === "object" && !Array.isArray(value)
                  ? Object.entries(value).flatMap(([key, child]) => findUndefined(child, `${at}.${key}`))
                  : [];
        expect(findUndefined(viewData, "viewData")).toEqual([]);

        expect(viewData.origin).toEqual(scene.origin);
        expect(viewData.backgroundColor).toEqual(scene.backgroundColor);
        expect(viewData.ambientLight).toEqual(scene.ambient);
        expect(viewData.diffuseLight).toEqual(scene.diffuse);
        expect(viewData.lightPosition).toEqual(scene.lightPosition);
        expect(viewData.specularLight).toEqual(scene.specular);
        expect(viewData.specularPower).toBe(scene.specularPower);
        expect(viewData.fogStart).toBe(scene.fogStart);
        expect(viewData.fogEnd).toBe(scene.fogEnd);
        expect(viewData.zoom).toBe(scene.zoom);
        expect(viewData.clipStart).toBe(-scene.clipStart);
        expect(viewData.clipEnd).toBe(scene.clipEnd);
        expect(viewData.quat4).toEqual(state.glRef.quat);
        expect(viewData.doDrawClickedAtomLines).toBe(false);
        expect(viewData.doPerspectiveProjection).toBe(scene.doPerspectiveProjection);
        expect(viewData.shadows).toBe(scene.doShadow);
        expect(viewData.edgeDetection).toEqual({
            enabled: scene.doEdgeDetect,
            depthScale: scene.edgeDetectDepthScale,
            depthThreshold: scene.edgeDetectDepthThreshold,
            normalScale: scene.edgeDetectNormalScale,
            normalThreshold: scene.edgeDetectNormalThreshold,
        });
        expect(viewData.ssao).toEqual({ enabled: scene.doSSAO, radius: scene.ssaoRadius, bias: scene.ssaoBias });
        expect(viewData.blur).toEqual({ enabled: scene.useOffScreenBuffers, radius: scene.depthBlurRadius, depth: scene.depthBlurDepth });
    });

    test("EXT-11 view data reflects changes to zoom, origin and background", async () => {
        const before = (await getCloudExitData(cloud.instance)).viewData;
        cloud.store.dispatch(setZoom(2.5));
        cloud.store.dispatch(setOrigin([-12.5, 3.25, 40]));
        cloud.store.dispatch(setBackgroundColor([0.1, 0.2, 0.3, 1]));
        const { viewData } = await getCloudExitData(cloud.instance);
        expect(before.zoom).not.toBe(2.5);
        expect(viewData.zoom).toBe(2.5);
        expect(viewData.origin).toEqual([-12.5, 3.25, 40]);
        expect(viewData.backgroundColor).toEqual([0.1, 0.2, 0.3, 1]);
    });

    test("EXT-12 view data deep-equals MoorhenWrapper's getViewSettings on the same store", async () => {
        expect((await getCloudExitData(cloud.instance)).viewData).toEqual(getViewSettings(cloud.store));

        cloud.store.dispatch(setZoom(0.75));
        cloud.store.dispatch(setOrigin([1, 2, 3]));
        cloud.store.dispatch(setBackgroundColor([0, 0, 0, 1]));
        cloud.store.dispatch(setQuat([0.5, 0.5, 0.5, 0.5]));
        const fakeHost = createFakeHost();
        const payload = await fakeHost.onExit(cloud.instance);
        expect(payload.viewData).toEqual(getViewSettings(cloud.store));
        expect(fakeHost.exitPayloads).toEqual([payload]);
    });
});
