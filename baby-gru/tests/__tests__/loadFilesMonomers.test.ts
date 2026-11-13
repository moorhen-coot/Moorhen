/*
 * Monomers made from a dictionary (a dictionary .cif through files.loadFiles, or files.ligandFromSmiles)
 * are returned like any other loaded molecule, and are ligand-only molecules.
 */
import { createCloudInstance, jobUrl, loadCootModules, resetFetch, type CloudInstance } from "./cloudHost/cloudHostHarness";

jest.setTimeout(120_000);

let cloud: CloudInstance;
beforeAll(loadCootModules);
beforeEach(async () => {
    resetFetch();
    cloud = await createCloudInstance();
});
afterEach(() => cloud.cleanup());

describe("monomers from dictionaries", () => {
    test("loadFiles on a dictionary .cif returns the monomer it creates", async () => {
        const result = await cloud.instance.files.loadFiles(jobUrl("BGC.cif"));
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({ type: "molecule", fileName: "BGC.cif" });
        const monomer = cloud.instance.getMolecule(result[0].uniqueID);
        expect(monomer.molNo).toBe(result[0].molNo);
        expect(monomer.isLigandOnly()).toBe(true);
    });

    test("ligandFromSmiles returns the monomer it creates", async () => {
        const result = await cloud.instance.files.ligandFromSmiles("c1ccccc1[N+](=O)[O-]", "NBZ");
        expect(result).toHaveLength(1);
        const monomer = cloud.instance.getMolecule(result[0].uniqueID);
        expect(monomer.ligands.map(ligand => ligand.resName)).toEqual(["NBZ"]);
        expect(monomer.isLigandOnly()).toBe(true);
    });

    test("a protein with ligands is not ligand-only", async () => {
        const [entry] = await cloud.instance.files.loadFiles(jobUrl("5a3h.pdb"));
        const protein = cloud.instance.getMolecule(entry.uniqueID);
        expect(protein.ligands.length).toBeGreaterThan(0);
        expect(protein.isLigandOnly()).toBe(false);
    });
});
