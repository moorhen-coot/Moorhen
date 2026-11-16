/**
 * Ligand dictionaries in sessions (.roadmaps/ligand-dictionaries.md, phases 1, 3 and 4): every
 * dictionary read into Coot is recorded in the instance's list (store `dictionaries`) and saved, so
 * a session keeps a dictionary even when the molecule it came with was deleted before saving. Before,
 * only each molecule's own copy was saved, and the dictionary went with the molecule.
 */
import { removeMolecule } from "@/store/moleculesSlice";
import { MoorhenTimeCapsule } from "@/utils/MoorhenTimeCapsule";
import { createCloudInstance, jobUrl, loadCootModules, type CloudInstance } from "./cloudHost/cloudHostHarness";

jest.setTimeout(180000);

let first: CloudInstance;
let second: CloudInstance;

beforeAll(loadCootModules);

afterEach(async () => {
    await first?.cleanup();
    await second?.cleanup();
});

const missingDictionaries = (cloud: CloudInstance, molNo: number) => cloud.instance.cootCommand.get_residue_names_with_no_dictionary(molNo);

test("a dictionary whose molecule was deleted is still in the session", async () => {
    first = await createCloudInstance();
    await first.instance.files.loadFiles({ url: jobUrl("5a3h.pdb"), filename: "5a3h.pdb" }, "cloud");
    const model = first.instance.getMoleculeList()[0];
    // No monomer library is reachable here: the model's glucose has no dictionary
    expect(await missingDictionaries(first, model.molNo)).toContain("BGC");

    // A dictionary file: read for every molecule, and a BGC molecule made from it
    await first.instance.files.loadFiles({ url: jobUrl("BGC.cif"), filename: "BGC.cif" }, "cloud");
    expect(await missingDictionaries(first, model.molNo)).not.toContain("BGC");
    const bgc = first.instance.getMoleculeList().find(molecule => molecule !== model);
    expect(bgc).toBeDefined();
    // Recorded for every molecule; and for the BGC molecule too, which it is also read for
    expect(Object.values(first.store.getState().dictionaries.loaded)).toEqual(
        expect.arrayContaining([
            expect.objectContaining({ compId: "BGC", moleculeUid: null, source: "BGC.cif" }),
            expect.objectContaining({ compId: "BGC", moleculeUid: bgc.uniqueId }),
        ])
    );

    // Delete the molecule the dictionary came with: what was read for it alone goes, the rest stays
    first.store.dispatch(removeMolecule(bgc));
    await bgc.delete();
    expect(Object.values(first.store.getState().dictionaries.loaded)).toEqual([
        expect.objectContaining({ compId: "BGC", moleculeUid: null }),
    ]);
    const session = await first.instance.getTimeCapsuleRef().current.fetchSession(false);
    expect(session.dictionaries.map(dictionary => dictionary.compId)).toEqual(["BGC"]);
    expect(session.moleculeData.flatMap(molecule => Object.keys(molecule.ligandDicts ?? {}))).not.toContain("BGC");

    // A fresh instance (its own Coot, which has never read BGC) gets it back from the session
    second = await createCloudInstance();
    expect(await MoorhenTimeCapsule.loadSessionFromJsonString(JSON.stringify(session), second.instance)).toBe(0);
    const [restored] = second.instance.getMoleculeList();
    expect(await missingDictionaries(second, restored.molNo)).not.toContain("BGC");
    expect(Object.values(second.store.getState().dictionaries.loaded)).toEqual([
        expect.objectContaining({ compId: "BGC", moleculeUid: null }),
    ]);
});

test("a dictionary read for one molecule goes with it, and comes back on it", async () => {
    first = await createCloudInstance();
    await first.instance.files.loadFiles({ url: jobUrl("5a3h.pdb"), filename: "5a3h.pdb" }, "cloud");
    const model = first.instance.getMoleculeList()[0];
    const bgcDictionary = (await (await fetch(jobUrl("BGC.cif"))).text()) as string;
    await model.addDict(bgcDictionary);
    expect(Object.values(first.store.getState().dictionaries.loaded)).toEqual([
        expect.objectContaining({ compId: "BGC", moleculeUid: model.uniqueId }),
    ]);

    const session = await first.instance.getTimeCapsuleRef().current.fetchSession(false);
    second = await createCloudInstance();
    expect(await MoorhenTimeCapsule.loadSessionFromJsonString(JSON.stringify(session), second.instance)).toBe(0);
    const [restored] = second.instance.getMoleculeList();
    expect(restored.uniqueId).toBe(model.uniqueId);
    expect(await missingDictionaries(second, restored.molNo)).not.toContain("BGC");

    // Deleting the molecule removes what was read for it alone
    second.store.dispatch(removeMolecule(restored));
    expect(second.store.getState().dictionaries.loaded).toEqual({});
});
