/*
 * CCP4 Cloud host contract, DIC: ligand dictionaries.
 * IDs refer to MoorhenWrapper's CLOUD_HOST_TEST_SPEC.md.
 *
 * `loadCloudDictionary` and `getCloudExitData` are CCP4 Cloud helper code (copied in referenceHost.ts). These tests
 * check that the Moorhen internals they rely on keep working: read_dictionary_string, get_monomer_and_position_at,
 * molecule_to_mmCIF_string, close_molecule, files.loadCifString, cacheLigandDict and the missing-monomer lookup.
 */
import { createCloudInstance, fetchedUrls, jobUrl, loadCootModules, readTestData, resetFetch, type CloudInstance } from "./cloudHostHarness";
import { getCloudExitData, loadCloudDictionary } from "./referenceHost";
import { setOrigin } from "@/store/sceneSettingsSlice";

jest.setTimeout(60000);

let cloud: CloudInstance;

beforeAll(loadCootModules);

beforeEach(async () => {
    resetFetch();
    cloud = await createCloudInstance();
});

afterEach(() => cloud.cleanup());

/** Every comp_id defined by a dictionary (its `data_comp_XXX` blocks, except `data_comp_list`) */
const compIds = (dictionary: string): string[] =>
    [...dictionary.matchAll(/^\s*data_comp_(\S+)/gm)].map(match => match[1]).filter(compId => compId !== "list");

/** Coordinates of every atom in a PDB string */
const pdbCoordinates = (pdb: string): [number, number, number][] =>
    pdb
        .split("\n")
        .filter(line => line.startsWith("ATOM") || line.startsWith("HETATM"))
        .map(line => [parseFloat(line.slice(30, 38)), parseFloat(line.slice(38, 46)), parseFloat(line.slice(46, 54))]);

describe("DIC: ligand dictionaries", () => {
    test("DIC-01 a dictionary with no codes is registered for every molecule and creates nothing", async () => {
        const mark = cloud.commandCentre.commands.length;
        const result = await loadCloudDictionary(cloud.instance, jobUrl("nitrobenzene.cif"));
        expect(result).toEqual([]);
        expect(cloud.instance.getMoleculeList()).toHaveLength(0);
        const sent = cloud.commandCentre.commands.slice(mark);
        const reads = sent.filter(entry => entry.command === "read_dictionary_string");
        expect(reads).toHaveLength(1);
        expect(reads[0].commandArgs[0]).toBe(readTestData("nitrobenzene.cif"));
        expect(reads[0].commandArgs[1]).toBe(-999999);
        expect(sent.map(entry => entry.command)).not.toContain("get_monomer_and_position_at");
    });

    test("DIC-02 createMonomers creates one CBs molecule per code, in the store", async () => {
        const result = await loadCloudDictionary(cloud.instance, jobUrl("nitrobenzene.cif"), ["LIG"]);
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe("molecule");
        const molecule = cloud.instance.getMolecule(result[0].uniqueID);
        expect(molecule).toBeDefined();
        expect(molecule.name).toBe("LIG");
        expect(molecule.molNo).toBe(result[0].molNo);
        expect(result[0].fileName).toBe("nitrobenzene.cif");
        expect(molecule.representations.map(representation => representation.style)).toContain("CBs");
        expect(cloud.store.getState().molecules.moleculeList.map(item => item.uniqueId)).toEqual([molecule.uniqueId]);
    });

    test("DIC-03 monomers are placed at (0, 0, 0), not at the view origin", async () => {
        cloud.store.dispatch(setOrigin([-20, -30, -40]));
        const mark = cloud.commandCentre.commands.length;
        const result = await loadCloudDictionary(cloud.instance, jobUrl("nitrobenzene.cif"), ["LIG"]);
        const placement = cloud.commandCentre.commands.slice(mark).filter(entry => entry.command === "get_monomer_and_position_at");
        expect(placement).toHaveLength(1);
        expect(placement[0].commandArgs).toEqual(["LIG", -999999, 0, 0, 0]);

        const coordinates = pdbCoordinates(await cloud.instance.getMolecule(result[0].uniqueID).getAtoms("pdb"));
        expect(coordinates.length).toBeGreaterThan(0);
        const centre = [0, 1, 2].map(axis => coordinates.reduce((sum, xyz) => sum + xyz[axis], 0) / coordinates.length);
        centre.forEach(value => expect(Math.abs(value)).toBeLessThan(2));
    });

    test("DIC-04 an unknown code logs a warning, other codes are still created and the promise resolves", async () => {
        const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
        try {
            const result = await loadCloudDictionary(cloud.instance, jobUrl("nitrobenzene.cif"), ["NOTACODE", "LIG"]);
            expect(warn).toHaveBeenCalledWith(expect.stringContaining("NOTACODE"));
            expect(result).toHaveLength(1);
            expect(cloud.instance.getMolecule(result[0].uniqueID).name).toBe("LIG");
            expect(cloud.instance.getMoleculeList().map(molecule => molecule.name)).toEqual(["LIG"]);
        } finally {
            warn.mockRestore();
        }
    });

    test("DIC-05 a structure loaded after its dictionary uses it (no missing-monomer fetch)", async () => {
        await loadCloudDictionary(cloud.instance, jobUrl("nitrobenzene.cif"));
        resetFetch();
        const result = await cloud.instance.files.loadFiles({ url: jobUrl("5a3h-nitrobenzene.pdb"), filename: "molecule.pdb" }, "cloud");
        expect(result.filter(item => item.type === "molecule")).toHaveLength(1);
        // Sanity check that the structure itself was fetched, so the fetch log is live
        expect(fetchedUrls()).toContain(jobUrl("5a3h-nitrobenzene.pdb"));
        expect(fetchedUrls().filter(url => url.includes("/LIG.cif"))).toEqual([]);
    });

    test("DIC-06 a dictionary loaded with no codes is in the exit ligand dictionaries", async () => {
        await loadCloudDictionary(cloud.instance, jobUrl("nitrobenzene.cif"));
        const { ligData } = await getCloudExitData(cloud.instance);
        expect(ligData).toContain(readTestData("nitrobenzene.cif"));
    });

    test("DIC-07 the same comp_id in two dictionaries is returned once, the first one loaded", async () => {
        // nitrobenzene.cif and benzene.cif both define comp_id LIG
        expect(compIds(readTestData("nitrobenzene.cif"))).toEqual(["LIG"]);
        expect(compIds(readTestData("benzene.cif"))).toEqual(["LIG"]);
        await loadCloudDictionary(cloud.instance, jobUrl("nitrobenzene.cif"));
        await loadCloudDictionary(cloud.instance, jobUrl("benzene.cif"));
        const { ligData } = await getCloudExitData(cloud.instance);
        const withLig = ligData.filter(dictionary => compIds(dictionary).includes("LIG"));
        expect(withLig).toHaveLength(1);
        expect(withLig[0]).toBe(readTestData("nitrobenzene.cif"));
    });

    test("DIC-08 a URL that 404s rejects cleanly, creates no molecules and sends nothing to the worker", async () => {
        // Documented behaviour: loadCloudDictionary rejects with "Error fetching dictionary <url>: 404 Not Found"
        const mark = cloud.commandCentre.commands.length;
        await expect(loadCloudDictionary(cloud.instance, jobUrl("missing.cif"), ["LIG"])).rejects.toThrow(/Error fetching dictionary/);
        expect(cloud.instance.getMoleculeList()).toHaveLength(0);
        expect(cloud.commandCentre.commandsSince(mark)).toEqual([]);
        expect((await getCloudExitData(cloud.instance)).ligData).toEqual([]);
    });

    test("DIC-09 newFilesLoadedCallback: not fired with no codes, fired once per monomer through loadCifString", async () => {
        const callback = jest.fn();
        cloud.instance.files.newFilesLoadedCallback(callback);
        await loadCloudDictionary(cloud.instance, jobUrl("nitrobenzene.cif"));
        expect(callback).not.toHaveBeenCalled();

        const result = await loadCloudDictionary(cloud.instance, jobUrl("nitrobenzene.cif"), ["LIG"]);
        expect(callback).toHaveBeenCalledTimes(1);
        const [loaded, origin] = callback.mock.calls[0];
        expect(origin).toBe("unknown");
        expect(loaded.filter((item: { type: string }) => item.type === "molecule").map((item: { uniqueID: string }) => item.uniqueID)).toEqual([
            result[0].uniqueID,
        ]);
    });

    test("DIC-10 a monomer's comp_id appears once in the exit ligand dictionaries", async () => {
        // The monomer holds a reassembled copy of the dictionary text (cacheLigandDict), so text comparison is not enough
        await loadCloudDictionary(cloud.instance, jobUrl("nitrobenzene.cif"), ["LIG"]);
        const { ligData } = await getCloudExitData(cloud.instance);
        expect(ligData.filter(dictionary => compIds(dictionary).includes("LIG"))).toHaveLength(1);
    });

    test("DIC-11 the temporary Coot molecule is closed and only the loaded monomer remains", async () => {
        const mark = cloud.commandCentre.commands.length;
        const result = await loadCloudDictionary(cloud.instance, jobUrl("nitrobenzene.cif"), ["LIG"]);
        const sent = cloud.commandCentre.commands.slice(mark);
        const placement = sent.findIndex(entry => entry.command === "get_monomer_and_position_at");
        expect(placement).toBeGreaterThanOrEqual(0);
        // The temporary molecule number is what get_monomer_and_position_at returned; it is the molecule the helper
        // reads with molecule_to_mmCIF_string and then closes
        const read = sent.find(entry => entry.command === "molecule_to_mmCIF_string");
        expect(read).toBeDefined();
        const tempMolNo = read.commandArgs[0];
        expect(sent.filter(entry => entry.command === "close_molecule").map(entry => entry.commandArgs[0])).toContain(tempMolNo);
        expect(result[0].molNo).not.toBe(tempMolNo);
        expect(cloud.instance.getMoleculeList().map(molecule => molecule.uniqueId)).toEqual([result[0].uniqueID]);
    });

    test("DIC-12 the monomer molecule is a ligand and holds its dictionary", async () => {
        const result = await loadCloudDictionary(cloud.instance, jobUrl("nitrobenzene.cif"), ["LIG"]);
        const molecule = cloud.instance.getMolecule(result[0].uniqueID);
        expect(molecule.isLigand).toBe(true);
        expect(Object.keys(molecule.ligandDicts)).toContain("LIG");
    });
});
