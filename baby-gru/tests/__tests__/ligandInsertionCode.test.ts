/*
 * A ligand whose residue has an insertion code. Its cid is as gemmi writes it (/1/B/2A(BGC)), which
 * mmdb, and so Coot's selections, do not read: the contacts and the deletion of such a ligand go
 * through mmdbLigandCid (/1/B/2(BGC).A).
 */
import { getLigandContacts, mmdbLigandCid } from "@/utils/ligandContacts";
import { createCloudInstance, flush, jobUrl, loadCootModules, readTestData, type CloudInstance } from "./cloudHost/cloudHostHarness";

jest.setTimeout(120000);

let cloud: CloudInstance;

beforeAll(loadCootModules);

beforeEach(async () => {
    cloud = await createCloudInstance();
    // BGC's dictionary for every molecule: no monomer library is reachable here
    await cloud.instance.files.loadFiles({ url: jobUrl("BGC.cif"), filename: "BGC.cif" }, "cloud");
});

afterEach(async () => {
    await cloud.cleanup();
});

/** 5a3h with its glucose (BGC B/2) given an insertion code (B/2A), or as it is */
const loadModel = async (insertionCode: boolean) => {
    const text = (readTestData("5a3h.pdb") as string)
        .split("\n")
        .map(line => (insertionCode && /^HETATM.{11}BGC B   2 /.test(line) ? `${line.slice(0, 26)}A${line.slice(27)}` : line))
        .join("\n");
    const [entry] = await cloud.instance.files.loadFiles(new File([text], insertionCode ? "inserted.pdb" : "plain.pdb"));
    await flush();
    const molecule = cloud.instance.getMolecule(entry.uniqueID);
    const ligand = molecule.ligands.find(item => item.resName === "BGC");
    return { molecule, ligand };
};

const contactKeys = (contacts: Awaited<ReturnType<typeof getLigandContacts>>["contacts"]) =>
    contacts.map(contact => `${contact.type}|${contact.ligand.atomName}|${contact.partner.chainId}/${contact.partner.resNo}/${contact.partner.atomName}`).sort();

test("a ligand with an insertion code has the contacts it has without one", async () => {
    const plain = await loadModel(false);
    const inserted = await loadModel(true);
    expect(plain.ligand.cid).toBe("/1/B/2(BGC)");
    expect(inserted.ligand.resNum).toBe("2A");
    expect(mmdbLigandCid(plain.ligand)).toBe(plain.ligand.cid);
    expect(mmdbLigandCid(inserted.ligand)).toBe("/1/B/2(BGC).A");

    // With the rest of its own molecule
    const expected = contactKeys((await getLigandContacts(plain.molecule, plain.molecule, {}, plain.ligand)).contacts);
    expect(expected.length).toBeGreaterThan(0);
    const own = await getLigandContacts(inserted.molecule, inserted.molecule, {}, inserted.ligand);
    expect(contactKeys(own.contacts)).toEqual(expected);
    expect(own.contacts.every(contact => contact.ligand.insCode === "A")).toBe(true);

    // With another molecule (merged with it for the analysis)
    const across = await getLigandContacts(inserted.molecule, plain.molecule, {}, inserted.ligand);
    expect(across.contacts.length).toBeGreaterThan(0);
});

test("a ligand with an insertion code is deleted by its mmdb cid, not by its own", async () => {
    const { molecule, ligand } = await loadModel(true);
    const atomsBefore = await molecule.getNumberOfAtoms();
    // Its own cid selects nothing in Coot
    expect((await molecule.deleteCid(ligand.cid, false)).first).not.toBe(1);
    expect(await molecule.getNumberOfAtoms()).toBe(atomsBefore);

    const result = await molecule.deleteCid(mmdbLigandCid(ligand), false);
    expect(result.first).toBe(1);
    expect(await molecule.getNumberOfAtoms()).toBeLessThan(atomsBefore);
    await molecule.updateAtoms();
    expect(molecule.ligands.some(item => item.resName === "BGC")).toBe(false);
});
