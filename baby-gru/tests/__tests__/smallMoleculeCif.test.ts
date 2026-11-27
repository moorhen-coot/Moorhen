/*
 * Small-molecule CIFs (coreCIF, as the COD and the CSD give them: fractional coordinates in a unit
 * cell, no residues). Coot cannot read one as it is: it is made into an mmCIF of one residue, named
 * after the file's data block, with a dictionary derived from its geometry. Whichever way it is
 * loaded: files.loadFiles (MoorhenMolecule.loadToCootFromString) or files.batchLoadLigands.
 *
 * Two real entries of the Crystallography Open Database are in tests/test_data, as downloaded (their
 * headers say where from): cod_2300455.cif, paracetamol, one molecule of 20 atoms, every coordinate
 * with its uncertainty ("0.07012(43)"); and cod_2103462.cif, paracetamol hemi-dioxane, 61 atoms in
 * several molecules, one of them disordered over two positions with partial occupancies.
 *
 * The other files are made at run time from ligands of tests/test_data: glucose (BGC of 5a3h.pdb) and
 * nitrobenzene (LIG of 5a3h-nitrobenzene.pdb), each written as fractional coordinates in a cubic cell
 * (to choose their data block's name).
 */
import { MoorhenMolecule } from "@/utils/MoorhenMolecule";
import { MoorhenTimeCapsule } from "@/utils/MoorhenTimeCapsule";
import { createCloudInstance, flush, loadCootModules, readTestData, type CloudInstance } from "./cloudHost/cloudHostHarness";

jest.setTimeout(120000);

const CELL = 40;

/** One residue type of a test PDB as a small-molecule CIF, its data block called `blockName` */
const smallMoleculeCif = (fileName: string, resName: string, blockName: string) => {
    const atoms = (readTestData(fileName) as string)
        .split("\n")
        .filter(line => line.startsWith("HETATM") && line.slice(17, 20).trim() === resName)
        .map(line => ({ element: line.slice(76, 78).trim(), xyz: [+line.slice(30, 38), +line.slice(38, 46), +line.slice(46, 54)] }));
    if (atoms.length === 0) throw new Error(`No ${resName} in ${fileName}`);
    const origin = [0, 1, 2].map(axis => Math.min(...atoms.map(atom => atom.xyz[axis])) - 5);
    const sites = atoms.map(
        ({ element, xyz }, i) => `${element}${i + 1} ${element} ${xyz.map((value, axis) => ((value - origin[axis]) / CELL).toFixed(5)).join(" ")}`
    );
    const text = [
        `data_${blockName}`,
        `_cell_length_a ${CELL}`, `_cell_length_b ${CELL}`, `_cell_length_c ${CELL}`,
        "_cell_angle_alpha 90", "_cell_angle_beta 90", "_cell_angle_gamma 90",
        "_symmetry_space_group_name_H-M 'P 1'",
        "loop_", "_atom_site_label", "_atom_site_type_symbol", "_atom_site_fract_x", "_atom_site_fract_y", "_atom_site_fract_z",
        ...sites,
        "",
    ].join("\n");
    return { text, atomCount: atoms.length };
};

let cloud: CloudInstance;

beforeAll(loadCootModules);

beforeEach(async () => {
    cloud = await createCloudInstance();
});

afterEach(async () => {
    await cloud.cleanup();
});

const missingDictionaries = (molNo: number) => cloud.instance.cootCommand.get_residue_names_with_no_dictionary(molNo);
const loadedDictionaries = () => Object.values(cloud.store.getState().dictionaries.loaded);

test("a small-molecule CIF is told from an mmCIF or a PDB file", () => {
    expect(MoorhenMolecule.isSmallMoleculeCif(smallMoleculeCif("5a3h.pdb", "BGC", "glucose").text)).toBe(true);
    expect(MoorhenMolecule.isSmallMoleculeCif(readTestData("5a3h.pdb") as string)).toBe(false);
    expect(MoorhenMolecule.isSmallMoleculeCif(readTestData("BGC.cif") as string)).toBe(false);
});

test("loadFiles loads a small-molecule CIF as a ligand with its dictionary", async () => {
    const { text, atomCount } = smallMoleculeCif("5a3h.pdb", "BGC", "glucose");
    const result = await cloud.instance.files.loadFiles(new File([text], "glucose.cif"));
    await flush();
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("molecule");
    const molecule = cloud.instance.getMolecule(result[0].uniqueID);
    expect(molecule.atomCount).toBe(atomCount);
    expect(molecule.isLigandOnly()).toBe(true);
    expect(molecule.ligands.map(ligand => ligand.resName)).toEqual(["glucose"]);
    // The dictionary that came with it: read, and in the list sessions save
    expect(await missingDictionaries(molecule.molNo)).toEqual([]);
    expect(loadedDictionaries()).toEqual(expect.arrayContaining([expect.objectContaining({ compId: "glucose" })]));
});

/** The entries of the Crystallography Open Database in the test data: [file, atoms in it] */
const COD_ENTRIES: [string, number][] = [
    ["cod_2300455.cif", 20],
    ["cod_2103462.cif", 61],
];

/** The bonds a dictionary lists (the rows of its _chem_comp_bond loop) */
const bondCount = (dictionary: string, compId: string) =>
    dictionary.split("\n").filter(line => new RegExp(`^${compId}\\s+\\S+\\s+\\S+\\s+SINGLE\\b`).test(line.trim())).length;

test.each(COD_ENTRIES)("loadFiles loads the COD entry %s", async (fileName, atomCount) => {
    const compId = fileName.replace(/^cod_|\.cif$/g, "");
    const text = readTestData(fileName) as string;
    expect(MoorhenMolecule.isSmallMoleculeCif(text)).toBe(true);
    const result = await cloud.instance.files.loadFiles(new File([text], fileName));
    await flush();
    expect(result).toHaveLength(1);
    const molecule = cloud.instance.getMolecule(result[0].uniqueID);
    // One residue named after the entry, with every atom of the file
    expect(molecule.atomCount).toBe(atomCount);
    expect(molecule.isLigandOnly()).toBe(true);
    expect(molecule.ligands.map(ligand => ligand.resName)).toEqual([compId]);
    expect(await missingDictionaries(molecule.molNo)).toEqual([]);
    // Its dictionary has bonds: about one per atom for these molecules
    const dictionary = loadedDictionaries().find(item => item.compId === compId);
    expect(dictionary).toBeDefined();
    expect(bondCount(dictionary.content, compId)).toBeGreaterThanOrEqual(atomCount - 8);
    expect(molecule.representations.some(representation => representation.visible)).toBe(true);
});

test("batchLoadLigands loads the COD entries", async () => {
    const files = COD_ENTRIES.map(([fileName]) => new File([readTestData(fileName) as string], fileName));
    const { loaded, failed } = await cloud.instance.files.batchLoadLigands(files);
    await flush();
    expect(failed).toEqual([]);
    expect(loaded.map(entry => entry.fileName)).toEqual(COD_ENTRIES.map(([fileName]) => fileName));
    for (const [i, [fileName, atomCount]] of COD_ENTRIES.entries()) {
        const compId = fileName.replace(/^cod_|\.cif$/g, "");
        const molecule = cloud.instance.getMolecule(loaded[i].uniqueID);
        expect(molecule.atomCount).toBe(atomCount);
        expect(molecule.isLigandOnly()).toBe(true);
        expect(await missingDictionaries(molecule.molNo)).toEqual([]);
        expect(bondCount(molecule.getDict(compId), compId)).toBeGreaterThanOrEqual(atomCount - 8);
        expect(molecule.representations.some(representation => representation.visible)).toBe(true);
    }
});

test("batchLoadLigands loads small-molecule CIFs, each with its own dictionary, among other files", async () => {
    // Two different compounds whose data blocks have the same name, as author CIFs often do
    const glucose = smallMoleculeCif("5a3h.pdb", "BGC", "shelx");
    const nitrobenzene = smallMoleculeCif("5a3h-nitrobenzene.pdb", "LIG", "shelx");
    const pose = (readTestData("5a3h.pdb") as string).split("\n").filter(line => /^HETATM.{11}BGC B   2/.test(line)).join("\n") + "\nEND\n";
    const { loaded, failed } = await cloud.instance.files.batchLoadLigands(
        [
            { file: new File([glucose.text], "glucose.cif"), metadata: { Source: "COD" } },
            new File([nitrobenzene.text], "nitrobenzene.cif"),
            new File([pose], "pose.pdb"),
        ],
        { dictionaries: [new File([readTestData("BGC.cif") as string], "BGC.cif")] }
    );
    await flush();
    expect(failed).toEqual([]);
    expect(loaded.map(entry => entry.fileName)).toEqual(["glucose.cif", "nitrobenzene.cif", "pose.pdb"]);
    const [first, second, third] = loaded.map(entry => cloud.instance.getMolecule(entry.uniqueID));
    expect([first.atomCount, second.atomCount]).toEqual([glucose.atomCount, nitrobenzene.atomCount]);
    expect(first.metadata).toEqual({ Source: "COD" });
    for (const molecule of [first, second, third]) {
        expect(molecule.isLigandOnly()).toBe(true);
        expect(molecule.representations.some(representation => representation.visible)).toBe(true);
        expect(await missingDictionaries(molecule.molNo)).toEqual([]);
        expect(cloud.store.getState().molecules.moleculeRecords[molecule.uniqueId].missingDictionaries).toEqual([]);
    }
    // Each its own "shelx": read for its molecule only, and cached on it for sessions
    const own = loadedDictionaries().filter(dictionary => dictionary.compId === "shelx");
    expect(own.map(dictionary => dictionary.moleculeUid).sort()).toEqual([first.uniqueId, second.uniqueId].sort());
    expect(first.getDict("shelx")).toContain("O1");
    expect(second.getDict("shelx")).toContain("N1");
    expect(first.getDict("shelx")).not.toEqual(second.getDict("shelx"));

    // A session brings them back with their dictionaries
    const session = JSON.stringify(await cloud.instance.getTimeCapsuleRef().current.fetchSession(false));
    expect(await MoorhenTimeCapsule.loadSessionFromJsonString(session, cloud.instance)).toBe(0);
    await flush();
    const restored = cloud.instance.getMoleculeList();
    expect(restored).toHaveLength(3);
    for (const molecule of restored) {
        expect(await missingDictionaries(molecule.molNo)).toEqual([]);
    }
});

test("batchLoadLigands reports a small-molecule CIF it cannot convert, and loads the rest", async () => {
    const glucose = smallMoleculeCif("5a3h.pdb", "BGC", "glucose");
    // Fractional coordinates announced, none given
    const broken = "data_broken\n_cell_length_a 10\nloop_\n_atom_site_label\n_atom_site_fract_x\n";
    const { loaded, failed } = await cloud.instance.files.batchLoadLigands([
        new File([broken], "broken.cif"),
        new File([glucose.text], "glucose.cif"),
    ]);
    await flush();
    expect(loaded.map(entry => entry.fileName)).toEqual(["glucose.cif"]);
    expect(failed.map(entry => entry.fileName)).toEqual(["broken.cif"]);
    // Nothing left of the one that failed
    expect(cloud.instance.getMoleculeList()).toHaveLength(1);
    expect(loadedDictionaries().every(dictionary => dictionary.compId !== "broken")).toBe(true);
});
