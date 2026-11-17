/*
 * Monomers made from a dictionary (a dictionary .cif through files.loadFiles, or files.ligandFromSmiles)
 * are returned like any other loaded molecule, and are ligand-only molecules.
 */
import { setMoleculeVisible } from "@/utils/moleculeVisibility";
import { createCloudInstance, flush, jobUrl, loadCootModules, readTestData, resetFetch, type CloudInstance } from "./cloudHost/cloudHostHarness";

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

    /** 5a3h's BGC as `count` models (docking poses), each moved by `model` Å along x, as PDB records */
    const ligandModels = (count: number) => {
        const atoms = (readTestData("5a3h.pdb") as string)
            .split("\n")
            .filter(line => line.startsWith("HETATM") && line.slice(17, 20) === "BGC");
        return Array.from({ length: count }, (_, model) => [
            `MODEL     ${String(model + 1).padStart(4)}`,
            ...atoms.map(line => line.slice(0, 30) + (+line.slice(30, 38) + model).toFixed(3).padStart(8) + line.slice(38)),
            "ENDMDL",
        ]);
    };

    test("a ligand-only file with several models is loaded as one molecule per model", async () => {
        const text = ligandModels(3).flat().join("\n") + "\nEND\n";
        const result = await cloud.instance.files.loadFiles(new File([text], "poses.pdb"));
        expect(result).toHaveLength(3);
        const poses = result.map(entry => cloud.instance.getMolecule(entry.uniqueID));
        expect(poses.map(pose => pose.name)).toEqual(["poses-1", "poses-2", "poses-3"]);
        poses.forEach(pose => {
            expect(pose.isLigandOnly()).toBe(true);
            expect(pose.numberOfModels).toBe(1);
            expect(pose.ligands.map(ligand => ligand.resName)).toEqual(["BGC"]);
        });
        // The multi-model original is gone: only the poses are listed, each in Coot
        const listed = cloud.instance.getMoleculeList();
        expect(listed.map(molecule => molecule.uniqueId).sort()).toEqual(result.map(entry => entry.uniqueID).sort());
        expect(new Set(result.map(entry => entry.molNo)).size).toBe(3);
    });

    test("the poses of a file share one dictionary, and the original leaves none behind", async () => {
        // A monomer library serving the committed BGC.cif, so the file's missing dictionary is found
        const library = "http://monomers.test";
        cloud.instance.setPaths(cloud.instance.paths.urlPrefix, library);
        const originalFetch = globalThis.fetch;
        globalThis.fetch = (async (input: string | URL | Request) => {
            const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
            return originalFetch(url.startsWith(library) ? jobUrl(url.split("/").pop()) : input);
        }) as typeof fetch;
        try {
            const text = ligandModels(3).flat().join("\n") + "\nEND\n";
            const result = await cloud.instance.files.loadFiles(new File([text], "poses.pdb"));
            await flush();
            const poses = result.map(entry => cloud.instance.getMolecule(entry.uniqueID));
            // One entry for BGC, for every molecule: none for the deleted original, none per pose
            const loaded = Object.values(cloud.instance.store.getState().dictionaries.loaded);
            expect(loaded.map(dictionary => [dictionary.compId, dictionary.moleculeUid])).toEqual([["BGC", null]]);
            poses.forEach(pose => {
                // Still cached on each pose (sessions save it with the molecule), and known to Coot
                expect(Object.keys(pose.ligandDicts)).toEqual(["BGC"]);
                expect(cloud.instance.store.getState().molecules.moleculeRecords[pose.uniqueId].missingDictionaries).toEqual([]);
            });
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    test("a Vina PDBQT with several poses is loaded as one molecule per pose", async () => {
        // Vina's layout: a result remark, ROOT / BRANCH torsion tree records, and each atom line carrying
        // a partial charge and an AutoDock type after column 66
        const text = ligandModels(2)
            .map(([model, ...rest]) => {
                const atoms = rest.slice(0, -1).map(line => line.slice(0, 66).padEnd(66) + "    +0.000 OA");
                return [model, "REMARK VINA RESULT:    -6.5      0.000      0.000", "ROOT", ...atoms.slice(0, 6), "ENDROOT",
                    "BRANCH   1   7", ...atoms.slice(6), "ENDBRANCH   1   7", "TORSDOF 1", "ENDMDL"];
            })
            .flat()
            .join("\n") + "\n";
        const result = await cloud.instance.files.loadFiles(new File([text], "docked.pdbqt"));
        expect(result).toHaveLength(2);
        result.forEach(entry => {
            const pose = cloud.instance.getMolecule(entry.uniqueID);
            expect(pose.isLigandOnly()).toBe(true);
            expect(pose.ligands.map(ligand => ligand.resName)).toEqual(["BGC"]);
        });
    });

    test("a protein with several models is not split", async () => {
        const protein = (readTestData("5a3h_no_ligand.pdb") as string)
            .split("\n")
            .filter(line => line.startsWith("ATOM") && +line.slice(22, 26) <= 20);
        const text = [1, 2].flatMap(model => [`MODEL     ${String(model).padStart(4)}`, ...protein, "ENDMDL"]).join("\n") + "\nEND\n";
        const result = await cloud.instance.files.loadFiles(new File([text], "ensemble.pdb"));
        expect(result).toHaveLength(1);
        expect(cloud.instance.getMolecule(result[0].uniqueID).numberOfModels).toBe(2);
    });

    test("a monomer is drawn as custom bonds, which come back when it is hidden and shown again", async () => {
        const [entry] = await cloud.instance.files.loadFiles(jobUrl("BGC.cif"));
        const monomer = cloud.instance.getMolecule(entry.uniqueID);
        const bonds = monomer.representations.filter(representation => representation.style === "CBs");
        expect(bonds).toHaveLength(1);
        // A custom representation, as every loaded molecule's: listed in the store, editable in the interface
        expect(bonds[0].isCustom).toBe(true);
        expect(cloud.instance.store.getState().molecules.customRepresentations).toContain(bonds[0]);
        expect(bonds.every(representation => representation.visible)).toBe(true);
        setMoleculeVisible(monomer, false);
        expect(bonds.some(representation => representation.visible)).toBe(false);
        setMoleculeVisible(monomer, true);
        await flush();
        expect(bonds.every(representation => representation.visible)).toBe(true);
    });

    test("a protein with ligands is not ligand-only", async () => {
        const [entry] = await cloud.instance.files.loadFiles(jobUrl("5a3h.pdb"));
        const protein = cloud.instance.getMolecule(entry.uniqueID);
        expect(protein.ligands.length).toBeGreaterThan(0);
        expect(protein.isLigandOnly()).toBe(false);
    });
});
