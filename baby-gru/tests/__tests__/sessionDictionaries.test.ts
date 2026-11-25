/**
 * Ligand dictionaries in sessions (.roadmaps/ligand-dictionaries.md, phases 1, 3 and 4): every
 * dictionary read into Coot is recorded in the instance's list (store `dictionaries`) and saved, so
 * a session keeps a dictionary even when the molecule it came with was deleted before saving. Before,
 * only each molecule's own copy was saved, and the dictionary went with the molecule.
 */
import { removeMolecule } from "@/store/moleculesSlice";
import { MoorhenTimeCapsule } from "@/utils/MoorhenTimeCapsule";
import { giveDictionary, readDictionary } from "@/utils/dictionaries";
import { createCloudInstance, flush, jobUrl, loadCootModules, type CloudInstance } from "./cloudHost/cloudHostHarness";

jest.setTimeout(180000);

let first: CloudInstance;
let second: CloudInstance;

beforeAll(loadCootModules);

afterEach(async () => {
    await first?.cleanup();
    await second?.cleanup();
    // So that a test failing before it creates its own instances does not clean these up twice
    first = undefined;
    second = undefined;
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

test("a dictionary read for every molecule is not read again for each molecule that cached it", async () => {
    // As a batch of ligand poses: one read for every molecule, cached on each pose so that it is saved
    first = await createCloudInstance();
    await first.instance.files.loadFiles({ url: jobUrl("5a3h.pdb"), filename: "5a3h.pdb" }, "cloud");
    const model = first.instance.getMoleculeList()[0];
    const bgcDictionary = (await (await fetch(jobUrl("BGC.cif"))).text()) as string;
    await readDictionary(first.instance, bgcDictionary, null, "batch");
    model.cacheLigandDict(bgcDictionary);
    await flush();
    const session = await first.instance.getTimeCapsuleRef().current.fetchSession(false);
    expect(Object.keys(session.moleculeData[0].ligandDicts)).toContain("BGC");

    second = await createCloudInstance();
    const cootCommand = jest.spyOn(second.instance.commandCentre, "cootCommand");
    expect(await MoorhenTimeCapsule.loadSessionFromJsonString(JSON.stringify(session), second.instance)).toBe(0);
    const [restored] = second.instance.getMoleculeList();
    expect(await missingDictionaries(second, restored.molNo)).not.toContain("BGC");
    // Its copy is back, for the next save; read once, recorded once
    expect(restored.getDict("BGC")).toBeTruthy();
    expect(cootCommand.mock.calls.filter(([message]) => message.command === "read_dictionary_string")).toHaveLength(1);
    expect(Object.values(second.store.getState().dictionaries.loaded)).toEqual([
        expect.objectContaining({ compId: "BGC", moleculeUid: null }),
    ]);
});

test("a molecule made from another's dictionary gets it, read again only if it was not read for every molecule", async () => {
    // As fitted poses, from the dictionary their template was made with
    first = await createCloudInstance();
    await first.instance.files.loadFiles({ url: jobUrl("5a3h.pdb"), filename: "5a3h.pdb" }, "cloud");
    const model = first.instance.getMoleculeList()[0];
    const bgcDictionary = (await (await fetch(jobUrl("BGC.cif"))).text()) as string;
    // Read for the model only, as loadMissingMonomers does
    await model.addDict(bgcDictionary);
    // Another molecule has none (as a pose Coot fitted from a template made with the model's)
    const other = first.instance.getMolecule(
        (await first.instance.files.loadFiles({ url: jobUrl("5a3h.pdb"), filename: "other.pdb" }, "cloud"))[0].uniqueID
    );
    expect(await missingDictionaries(first, other.molNo)).toContain("BGC");

    await giveDictionary(first.store, [other], model.getDict("BGC"));
    expect(await missingDictionaries(first, other.molNo)).not.toContain("BGC");
    expect(other.getDict("BGC")).toBeTruthy();
    await flush();
    expect(Object.values(first.store.getState().dictionaries.loaded)).toEqual(
        expect.arrayContaining([expect.objectContaining({ compId: "BGC", moleculeUid: other.uniqueId })])
    );

    // Read for every molecule: another molecule only caches it
    await readDictionary(first.instance, bgcDictionary, null, "for all");
    await flush();
    const third = first.instance.getMolecule(
        (await first.instance.files.loadFiles({ url: jobUrl("5a3h.pdb"), filename: "third.pdb" }, "cloud"))[0].uniqueID
    );
    const cootCommand = jest.spyOn(first.instance.commandCentre, "cootCommand");
    await giveDictionary(first.store, [third], model.getDict("BGC"));
    expect(third.getDict("BGC")).toBeTruthy();
    expect(cootCommand.mock.calls.filter(([message]) => message.command === "read_dictionary_string")).toHaveLength(0);
});

test("temporary fragments leave no dictionary behind", async () => {
    // Refinement, drags and fitting work on a copy of part of a molecule, given its dictionaries and
    // then deleted: what was read for the copy goes with it
    first = await createCloudInstance();
    const [entry] = await first.instance.files.ligandFromSmiles("c1ccccc1[N+](=O)[O-]", "NBZ");
    const ligand = first.instance.getMolecule(entry.uniqueID);
    await flush();
    const before = Object.keys(first.store.getState().dictionaries.loaded).sort();
    for (let i = 0; i < 3; i++) {
        const fragment = await ligand.copyFragmentUsingCid("/*", false);
        await flush();
        await fragment.delete();
    }
    await flush();
    expect(Object.keys(first.store.getState().dictionaries.loaded).sort()).toEqual(before);
});
