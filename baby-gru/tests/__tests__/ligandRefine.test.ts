/*
 * Refining a ligand that is a molecule of its own, as the right-click "Refine Residues" button
 * does, when its dictionary was read for that molecule only (as batchLoadLigands does).
 *
 * Refinement runs on a copy of the residues, a new Coot molecule. Coot keeps dictionaries per
 * molecule, so that copy must have the ligand's dictionary before its refinement is set up;
 * without it the ligand has no restraints and refinement leaves it where it was.
 */
import fs from "fs";
import path from "path";
import { addMolecule } from "@/store/moleculesSlice";
import { getMonomerMolecule } from "@/utils/monomers";
import { drawLigandBonds } from "@/utils/Representation/defaultRepresentation";
import type { MoorhenMolecule } from "@/utils/MoorhenMolecule";
import { residueCidForRefinement } from "@/utils/utils";
import { createCloudInstance, flush, jobUrl, loadCootModules, readTestData, resetFetch, type CloudInstance } from "./cloudHost/cloudHostHarness";

jest.setTimeout(120_000);

let cloud: CloudInstance;

beforeAll(loadCootModules);
beforeEach(async () => {
    resetFetch();
    cloud = await createCloudInstance();
});
afterEach(async () => {
    await cloud.cleanup();
});

/** The LIG residue of 5a3h-nitrobenzene.pdb as a one-ligand PDB file, each atom moved by `shift` Å in x */
const ligandFile = (shift: number) => {
    const format = (value: number) => value.toFixed(3).padStart(8);
    const lines = (readTestData("5a3h-nitrobenzene.pdb") as string)
        .split("\n")
        .filter(line => line.startsWith("HETATM") && line.slice(17, 20).trim() === "LIG")
        .map(line => line.slice(0, 30) + format(+line.slice(30, 38) + shift) + line.slice(38));
    return new File([lines.join("\n") + "\nEND\n"], "nitrobenzene_pose.pdb");
};

/** x, y, z of every atom of a molecule, from Coot */
const coordinates = async (molecule: { getAtoms: () => Promise<string> }) =>
    (await molecule.getAtoms())
        .split("\n")
        .filter(line => line.startsWith("ATOM") || line.startsWith("HETATM"))
        .map(line => [+line.slice(30, 38), +line.slice(38, 46), +line.slice(46, 54)]);

describe("refining a ligand molecule", () => {
    test("moves a ligand whose dictionary was read for it only back into its density", async () => {
        const { instance, store } = cloud;
        await instance.files.loadFiles(jobUrl("5a3h_no_ligand.pdb"));
        const maps = await instance.files.loadFiles(jobUrl("5a3h_sigmaa.mtz"));
        expect(maps.find(entry => entry.type === "map")).toBeDefined();
        const activeMap = store.getState().generalStates.activeMap;
        expect(activeMap).toBeTruthy();

        const { loaded, failed } = await instance.files.batchLoadLigands([ligandFile(0.6)], {
            dictionaries: [jobUrl("nitrobenzene.cif")],
        });
        expect(failed).toEqual([]);
        const ligand = instance.getMolecule(loaded[0].uniqueID);
        await flush(50);

        const before = await coordinates(ligand);
        // What MoorhenRefineResiduesButton does with the animated refinement on (the default)
        await ligand.refineResiduesUsingAtomCidAnimated("//A/301", activeMap, -1);
        const after = await coordinates(ligand);

        expect(after.length).toBe(before.length);
        const meanShift = after.reduce((sum, [x, y, z], i) => sum + Math.hypot(x - before[i][0], y - before[i][1], z - before[i][2]), 0) / after.length;
        // Moved 0.6 Å off its density: refined, it comes most of the way back
        expect(meanShift).toBeGreaterThan(0.2);
    });
});

const TUTORIALS = "http://tutorials.test/";
const MONOMER_LIBRARY = "http://monomers.test";
const TUTORIAL_DIR = path.join(__dirname, "..", "..", "public", "MoorhenAssets", "tutorials");
const CCP4_MONOMERS = "/opt/xtal/ccp4-9/lib/data/monomers";

/** Rejects if `promise` takes longer than `ms`: a refinement that never finishes fails the test instead of hanging it */
const within = <T,>(promise: Promise<T>, ms: number, what: string) =>
    Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${what} did not finish in ${ms} ms`)), ms))]);

(fs.existsSync(path.join(CCP4_MONOMERS, "l", "LZA.cif")) ? describe : describe.skip)("refining a fitted ligand", () => {
    let originalFetch: typeof fetch;
    beforeEach(() => {
        cloud.instance.setPaths(cloud.instance.paths.urlPrefix, MONOMER_LIBRARY);
        originalFetch = globalThis.fetch;
        globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
            const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
            if (url.startsWith(TUTORIALS)) return new Response(fs.readFileSync(path.join(TUTORIAL_DIR, url.slice(TUTORIALS.length))));
            if (url.startsWith(MONOMER_LIBRARY)) {
                const code = url.split("/").pop().replace(".cif", "");
                const file = path.join(CCP4_MONOMERS, code[0].toLowerCase(), `${code}.cif`);
                return fs.existsSync(file) ? new Response(fs.readFileSync(file, "utf8")) : new Response("", { status: 404 });
            }
            return originalFetch(input, init);
        }) as typeof fetch;
    });
    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    test("LZA fitted anywhere into tutorial 1, saved, then refined (the right-click button)", async () => {
        const { instance, store } = cloud;
        const [model] = await instance.files.loadFiles(`${TUTORIALS}moorhen-tutorial-structure-number-1.ent`);
        const protein = instance.getMolecule(model.uniqueID) as MoorhenMolecule;
        const maps = await instance.files.loadFiles(`${TUTORIALS}moorhen-tutorial-map-number-1.mtz`);
        const map = maps.find(entry => entry.type === "map");
        expect(map).toBeDefined();
        const activeMap = store.getState().generalStates.activeMap;
        expect(activeMap).toBeTruthy();

        // What MoorhenFindLigandModal does: template from the code, fit anywhere, close the template
        const template = await getMonomerMolecule(instance, "LZA");
        expect(template).not.toBeNull();
        const poses = await protein.fitLigand(activeMap.molNo, template.molNo, false, false, false, 0);
        await instance.commandCentre.cootCommand({ returnType: "status", command: "close_molecule", commandArgs: [template.molNo] }, false);
        expect(poses.length).toBeGreaterThan(0);

        // Save the first pose
        const ligand = poses[0] as MoorhenMolecule;
        await drawLigandBonds(ligand);
        store.dispatch(addMolecule(ligand));
        await poses.slice(1).reduce((done, pose) => done.then(() => pose.delete()), Promise.resolve());
        await flush(50);

        // Right-click "Refine Residues", animated (the default), TRIPLE (the default)
        const [atom] = await ligand.gemmiAtomsForCid("/*/*/*/*");
        const cid = residueCidForRefinement({ chain_id: atom.chain_id, res_no: Number(atom.res_no), alt_conf: atom.alt_loc });
        const before = await coordinates(ligand);
        await within(ligand.refineResiduesUsingAtomCidAnimated(cid, activeMap, 2), 60_000, "refineResiduesUsingAtomCidAnimated");
        const after = await coordinates(ligand);
        expect(after.length).toBe(before.length);
    });
});
