/*
 * getMonomerMolecule (src/utils/monomers.ts): a monomer made in Coot from its code, its dictionary
 * looked up as Get Monomer does. Shared by the Get Monomer menu and by fitting a ligand by its code.
 */
import { getMonomerMolecule } from "@/utils/monomers";
import { createCloudInstance, flush, jobUrl, loadCootModules, readTestData, resetFetch, type CloudInstance } from "./cloudHost/cloudHostHarness";

jest.setTimeout(120_000);

const LIBRARY = "http://monomers.test";

let cloud: CloudInstance;
let originalFetch: typeof fetch;
let fetched: string[];

beforeAll(loadCootModules);
beforeEach(async () => {
    resetFetch();
    cloud = await createCloudInstance();
    cloud.instance.setPaths(cloud.instance.paths.urlPrefix, LIBRARY);
    // A local monomer library serving the committed <CODE>.cif files; nothing else is reachable
    originalFetch = globalThis.fetch;
    fetched = [];
    globalThis.fetch = (async (input: string | URL | Request) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        fetched.push(url);
        return originalFetch(url.startsWith(LIBRARY) ? jobUrl(url.split("/").pop()) : input);
    }) as typeof fetch;
});
afterEach(async () => {
    globalThis.fetch = originalFetch;
    await cloud.cleanup();
});

const atoms = async (molNo: number) =>
    (await cloud.commandCentre.cootCommand({ returnType: "int", command: "get_number_of_atoms", commandArgs: [molNo] }, false)).data.result
        .result as number;

describe("getMonomerMolecule", () => {
    test("default: a code Coot does not know is looked up, read for every molecule, and made", async () => {
        const monomer = await getMonomerMolecule(cloud.instance, "bgc");
        expect(monomer).not.toBeNull();
        expect(await atoms(monomer.molNo)).toBeGreaterThan(0);
        expect(fetched).toContain(`${LIBRARY}/b/BGC.cif`);
        await flush();
        expect(Object.values(cloud.store.getState().dictionaries.loaded).map(entry => [entry.compId, entry.moleculeUid])).toEqual([["BGC", null]]);
    });

    test("one source: its dictionary only, returned with the monomer", async () => {
        const monomer = await getMonomerMolecule(cloud.instance, "BGC", { source: "local-monomer-library" });
        expect(monomer?.dictionary).toContain("data_comp_BGC");
        expect(await atoms(monomer.molNo)).toBeGreaterThan(0);
    });

    test("imported dictionaries only: nothing is looked up", async () => {
        expect(await getMonomerMolecule(cloud.instance, "BGC", { source: "libcoot-api" })).toBeNull();
        expect(fetched).toEqual([]);
    });

    test("a dictionary loaded for one molecule only is found, with no molecule chosen", async () => {
        // The session's dictionary list is looked up first: the monomer is made with the number of
        // the molecule the dictionary was read for, so Coot uses it as it is
        const [entry] = await cloud.instance.files.loadFiles(jobUrl("5a3h.pdb"));
        await cloud.instance.getMolecule(entry.uniqueID).addDict(readTestData("BGC.cif") as string);
        await flush();
        fetched.length = 0;
        const monomer = await getMonomerMolecule(cloud.instance, "BGC", { source: "libcoot-api" });
        expect(monomer).not.toBeNull();
        expect(monomer.dictionary).toContain("data_comp_BGC");
        expect(await atoms(monomer.molNo)).toBeGreaterThan(0);
        expect(fetched).toEqual([]);
    });

    test("a code no source has gives null", async () => {
        expect(await getMonomerMolecule(cloud.instance, "ZZZ", { source: "local-monomer-library" })).toBeNull();
    });

    test("a monomer made from its code is a template fitLigand can use, without being in the store", async () => {
        const [model] = await cloud.instance.files.loadFiles(jobUrl("5a3h_no_ligand.pdb"));
        const protein = cloud.instance.getMolecule(model.uniqueID);
        const maps = await cloud.instance.files.loadFiles(jobUrl("5a3h_sigmaa.mtz"));
        const map = maps.find(entry => entry.type === "map");
        expect(map).toBeDefined();
        const mapMolNo = map.molNo;

        const template = await getMonomerMolecule(cloud.instance, "BGC");
        expect(template).not.toBeNull();
        const poses = await protein.fitLigand(mapMolNo, template.molNo, false, false, false, 10);
        expect(poses.length).toBeGreaterThan(0);
        for (const pose of poses) expect(await atoms(pose.molNo)).toBeGreaterThan(0);
        await Promise.all(poses.map(pose => pose.delete()));
    });
});
