/*
 * Which residue types have no dictionary: asked of Coot once per load (twice if some were missing,
 * to see what the lookup found), kept in the molecule's record, and warned about from there, once
 * per change, rather than asked again after every draw of every representation.
 */
import { createCloudInstance, flush, jobUrl, loadCootModules, resetFetch, type CloudInstance } from "./cloudHost/cloudHostHarness";

jest.setTimeout(120_000);

let cloud: CloudInstance;

beforeAll(loadCootModules);
beforeEach(async () => {
    resetFetch();
    cloud = await createCloudInstance();
});
afterEach(() => cloud.cleanup());

/** How many times Coot was asked (the test command centre logs every command, the typed wrapper's included) */
const queries = () => cloud.commandCentre.commands.filter(entry => entry.command === "get_residue_names_with_no_dictionary").length;

const warnings = () =>
    cloud.instance.store
        .getState()
        .snackBars.filter(snackbar => snackbar.message.includes("no dictionary"))
        .map(snackbar => snackbar.message);

describe("missing dictionaries", () => {
    test("a structure with every dictionary: asked once, no warning", async () => {
        const [entry] = await cloud.instance.files.loadFiles(jobUrl("5a3h_no_ligand.pdb"));
        await flush();
        expect(queries()).toBe(1);
        expect(cloud.instance.store.getState().molecules.moleculeRecords[entry.uniqueID].missingDictionaries).toEqual([]);
        expect(warnings()).toEqual([]);
    });

    test("ligands with no dictionary to be found: asked twice, one warning, kept in the record", async () => {
        // Offline: neither BGC nor G2F is found anywhere
        const [entry] = await cloud.instance.files.loadFiles(jobUrl("5a3h.pdb"));
        await flush();
        expect(queries()).toBe(2);
        expect(cloud.instance.store.getState().molecules.moleculeRecords[entry.uniqueID].missingDictionaries).toEqual(["BGC", "G2F"]);
        expect(warnings()).toHaveLength(1);
        expect(warnings()[0]).toContain("BGC, G2F");

        // Redrawing the molecule does not ask again, nor warn again
        await cloud.instance.getMolecule(entry.uniqueID).redraw();
        await flush();
        expect(queries()).toBe(2);
        expect(warnings()).toHaveLength(1);

        // A dictionary read for every molecule updates the record of those that missed it
        await cloud.instance.files.loadFiles(jobUrl("BGC.cif"));
        await flush();
        expect(cloud.instance.store.getState().molecules.moleculeRecords[entry.uniqueID].missingDictionaries).toEqual(["G2F"]);
        expect(warnings()).toHaveLength(1);
    });
});
