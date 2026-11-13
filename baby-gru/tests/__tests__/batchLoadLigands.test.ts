/*
 * instance.files.batchLoadLigands on the real Coot module (see src/.roadmaps/batch-ligand-loading.md).
 *
 * The ligands are made at run time from structures already in tests/test_data: the LIG (nitrobenzene),
 * BGC and G2F residues are cut out of 5a3h-nitrobenzene.pdb and 5a3h.pdb, and written as one-ligand
 * PDB files, each moved to a different place, like docking poses of three compounds. Their dictionaries
 * are the committed LIG/BGC/G2F .cif files: LIG's is passed in `dictionaries`, BGC and G2F are served by
 * a fake monomer library, so the test also checks that each is looked up at most once.
 *
 * Besides what was loaded, it checks one molecule list update per chunk, nothing journaled and no
 * backup. It also times each chunk and fails if the later chunks are much slower than the early ones.
 *
 * Tuning, all optional:
 *   MOORHEN_BATCH_LIGANDS     number of ligands (default 500)
 *   MOORHEN_BATCH_CHUNK       ligands per chunk (default 50)
 *   MOORHEN_BATCH_MAX_RATIO   slowest allowed ratio of late to early chunk time (default 1.5; flat runs give
 *                             about 1, the bug this guards against about 2 at 500 ligands)
 */
import { createCloudInstance, flush, jobUrl, loadCootModules, readTestData, resetFetch, type CloudInstance } from "./cloudHost/cloudHostHarness";

const LIGANDS = Number(process.env.MOORHEN_BATCH_LIGANDS ?? 500);
const CHUNK = Number(process.env.MOORHEN_BATCH_CHUNK ?? 50);
const MAX_RATIO = Number(process.env.MOORHEN_BATCH_MAX_RATIO ?? 1.5);
const MONOMER_LIBRARY = "http://monomers.test";

jest.setTimeout(300_000);

/** The HETATM records of one residue type in a test PDB, as [record, x, y, z] */
const cutLigand = (fileName: string, resName: string) => {
    const atoms = (readTestData(fileName) as string)
        .split("\n")
        .filter(line => line.startsWith("HETATM") && line.slice(17, 20).trim() === resName)
        .map(line => ({ line, x: +line.slice(30, 38), y: +line.slice(38, 46), z: +line.slice(46, 54) }));
    if (atoms.length === 0) throw new Error(`No ${resName} in ${fileName}`);
    return atoms;
};

const TEMPLATES = [
    { resName: "LIG", atoms: cutLigand("5a3h-nitrobenzene.pdb", "LIG") },
    { resName: "BGC", atoms: cutLigand("5a3h.pdb", "BGC") },
    { resName: "G2F", atoms: cutLigand("5a3h.pdb", "G2F") },
];

/** A small seeded generator, so every run makes the same poses */
const seeded = (seed: number) => () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
};

/** `count` one-ligand PDB files, cycling through the templates, each moved by up to ±20 Å */
const makePoses = (count: number): File[] => {
    const random = seeded(42);
    const format = (value: number) => value.toFixed(3).padStart(8);
    return Array.from({ length: count }, (_, i) => {
        const { resName, atoms } = TEMPLATES[i % TEMPLATES.length];
        const [dx, dy, dz] = [random(), random(), random()].map(r => (r - 0.5) * 40);
        const lines = atoms.map(({ line, x, y, z }) => line.slice(0, 30) + format(x + dx) + format(y + dy) + format(z + dz) + line.slice(54));
        return new File([lines.join("\n") + "\nEND\n"], `pose_${String(i).padStart(4, "0")}_${resName}.pdb`);
    });
};

let cloud: CloudInstance;
let originalFetch: typeof fetch;
const monomerFetches: string[] = [];

beforeAll(loadCootModules);

beforeEach(async () => {
    resetFetch();
    cloud = await createCloudInstance();
    cloud.instance.setPaths(cloud.instance.paths.urlPrefix, MONOMER_LIBRARY);
    // The fake monomer library: <library>/<x>/<CODE>.cif is the committed <CODE>.cif
    originalFetch = globalThis.fetch;
    monomerFetches.length = 0;
    globalThis.fetch = (async (input: string | URL | Request) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        if (url.startsWith(MONOMER_LIBRARY)) {
            monomerFetches.push(url);
            return originalFetch(jobUrl(url.split("/").pop()));
        }
        return originalFetch(input);
    }) as typeof fetch;
});

afterEach(async () => {
    globalThis.fetch = originalFetch;
    await cloud.cleanup();
});

describe("batchLoadLigands", () => {
    test(`loads ${LIGANDS} ligand poses with flat time per chunk`, async () => {
        const { instance, store, commandCentre } = cloud;
        const poses = makePoses(LIGANDS);
        const expectedChunks = Math.ceil(LIGANDS / CHUNK);

        const historyBefore = commandCentre.history.entries.length;
        const buffersBefore = store.getState().glRef.displayBuffers.length;
        const addModification = jest.spyOn(instance.getTimeCapsule(), "addModification");
        let moleculeListUpdates = 0;
        let lastList = store.getState().molecules.moleculeList;
        const unsubscribe = store.subscribe(() => {
            const list = store.getState().molecules.moleculeList;
            if (list !== lastList) moleculeListUpdates++;
            lastList = list;
        });

        const chunkEnds: { done: number; time: number }[] = [];
        const start = performance.now();
        const { loaded, failed } = await instance.files.batchLoadLigands(poses, {
            chunkSize: CHUNK,
            dictionaries: [jobUrl("nitrobenzene.cif")],
            onProgress: done => chunkEnds.push({ done, time: performance.now() }),
        });
        const totalMs = performance.now() - start;
        unsubscribe();
        await flush(100);

        // Timing report
        const chunkMs = chunkEnds.map((end, k) => end.time - (k === 0 ? start : chunkEnds[k - 1].time));
        const perLigand = chunkMs.map((ms, k) => ms / (chunkEnds[k].done - (k === 0 ? 0 : chunkEnds[k - 1].done)));
        console.log(
            `batchLoadLigands: ${LIGANDS} ligands in ${(totalMs / 1000).toFixed(2)} s (${(totalMs / LIGANDS).toFixed(1)} ms/ligand); ` +
                `ms/ligand per chunk: ${perLigand.map(ms => ms.toFixed(1)).join(" ")}`
        );

        // Everything loaded, in order, as one molecule each
        expect(failed).toEqual([]);
        expect(loaded.map(entry => entry.fileName)).toEqual(poses.map(file => file.name));
        const molecules = instance.getMoleculeList();
        expect(molecules).toHaveLength(LIGANDS);
        molecules.forEach((molecule, i) => {
            const template = TEMPLATES[i % TEMPLATES.length];
            expect(molecule.atomCount).toBe(template.atoms.length);
            expect(molecule.ligands.map(ligand => ligand.resName)).toEqual([template.resName]);
            expect(molecule.representations).toHaveLength(1);
            expect(molecule.representations[0].style).toBe("CBs");
            expect(molecule.representations[0].buffers.length).toBeGreaterThan(0);
        });
        expect(store.getState().molecules.customRepresentations).toHaveLength(LIGANDS);
        // Listed in the Models panel's ligand list, instead of a card per molecule
        expect(molecules.every(molecule => molecule.isLigandOnly())).toBe(true);
        expect(store.getState().glRef.displayBuffers.length - buffersBefore).toBe(
            molecules.reduce((sum, molecule) => sum + molecule.representations[0].buffers.length, 0)
        );

        // Dictionaries: LIG supplied, so never looked up; BGC and G2F looked up at most once each
        expect(monomerFetches.filter(url => url.endsWith("/LIG.cif"))).toEqual([]);
        expect(new Set(monomerFetches).size).toBe(monomerFetches.length);
        molecules
            .filter(molecule => molecule.ligands[0].resName === "LIG")
            .forEach(molecule => expect(Object.keys(molecule.ligandDicts)).toContain("LIG"));

        // A single step: no undo history, no backup
        expect(commandCentre.history.entries.length).toBe(historyBefore);
        expect(addModification).not.toHaveBeenCalled();

        // One molecule list update per chunk
        expect(moleculeListUpdates).toBe(expectedChunks);
        expect(chunkEnds).toHaveLength(expectedChunks);

        // Late chunks no slower than early ones (the first chunk is skipped: it includes warm-up and the
        // dictionary lookups)
        if (expectedChunks >= 6) {
            const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
            const early = mean(perLigand.slice(1, 4));
            const late = mean(perLigand.slice(-3));
            expect(late / early).toBeLessThan(MAX_RATIO);
        }
    });

    test("reports files it cannot load and loads the rest", async () => {
        const { instance } = cloud;
        const poses = makePoses(4);
        const notCoordinates = new File(["this is not a structure\n"], "notes.pdb");
        const { loaded, failed } = await instance.files.batchLoadLigands([poses[0], notCoordinates, poses[1], jobUrl("missing.pdb")], {
            dictionaries: [jobUrl("nitrobenzene.cif")],
        });
        expect(loaded.map(entry => entry.fileName)).toEqual([poses[0].name, poses[1].name]);
        expect(failed.map(entry => entry.fileName).sort()).toEqual(["missing.pdb", "notes.pdb"]);
        expect(instance.getMoleculeList()).toHaveLength(2);
    });
});
