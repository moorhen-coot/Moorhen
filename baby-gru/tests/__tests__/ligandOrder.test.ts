/*
 * The order of the ligand list (src/utils/ligandOrder.ts): by name, as loaded, or by a fact the
 * ligand-only molecules carry (molecule.metadata, e.g. a docking score given to batchLoadLigands).
 */
import { isNumericMetadata, ligandMetadataKeys, metadataOrder, orderMetadataKey, sortLigandEntries } from "@/utils/ligandOrder";

const pose = (name: string, metadata: Record<string, string> = {}) => ({ molecule: { name, metadata } });
/** A ligand inside a model: it has no metadata of its own, whatever its model has */
const inModel = (resName: string) => ({
    molecule: { name: "model", metadata: { Score: "-99" } },
    ligand: { resName, chainName: "A", resNum: "301" },
});
const names = (list: { molecule: { name: string }; ligand?: { resName: string } }[]) => list.map(entry => entry.ligand?.resName ?? entry.molecule.name);

const list = [
    pose("pose_10", { Score: "-6.5", Source: "screen" }),
    pose("pose_2", { Score: "-10.25", Source: "docking" }),
    inModel("ATP"),
    pose("pose_1", { Score: "-7", Source: "docking" }),
    pose("unscored"),
];

test("by name and in load order, either way round", () => {
    expect(names(sortLigandEntries(list, { by: "name", descending: false }))).toEqual(["ATP", "pose_1", "pose_2", "pose_10", "unscored"]);
    expect(names(sortLigandEntries(list, { by: "name", descending: true }))).toEqual(["unscored", "pose_10", "pose_2", "pose_1", "ATP"]);
    expect(sortLigandEntries(list, { by: "load", descending: false })).toBe(list);
    expect(names(sortLigandEntries(list, { by: "load", descending: true }))).toEqual(["unscored", "pose_1", "ATP", "pose_2", "pose_10"]);
});

test("the keys offered are those of the ligand-only molecules", () => {
    expect(ligandMetadataKeys(list)).toEqual(["Score", "Source"]);
    expect(ligandMetadataKeys([inModel("ATP")])).toEqual([]);
    expect(orderMetadataKey({ by: metadataOrder("name"), descending: false })).toBe("name");
    expect(orderMetadataKey({ by: "name", descending: false })).toBeNull();
});

test("by a score: as numbers, the ligands without one last whichever the direction", () => {
    expect(isNumericMetadata(list, "Score")).toBe(true);
    const order = { by: metadataOrder("Score"), descending: false };
    // As text, -10.25 would come after -6.5 and -7
    expect(names(sortLigandEntries(list, order, true))).toEqual(["pose_2", "pose_1", "pose_10", "ATP", "unscored"]);
    expect(names(sortLigandEntries(list, { ...order, descending: true }, true))).toEqual(["pose_10", "pose_1", "pose_2", "ATP", "unscored"]);
    // A value with its unit is still a number
    expect(isNumericMetadata([pose("a", { Volume: "120 Å³" }), pose("b", { Volume: "95 Å³" })], "Volume")).toBe(true);
});

test("by a text value: as text, equal values by name", () => {
    expect(isNumericMetadata(list, "Source")).toBe(false);
    const order = { by: metadataOrder("Source"), descending: false };
    expect(names(sortLigandEntries(list, order, false))).toEqual(["pose_1", "pose_2", "pose_10", "ATP", "unscored"]);
    expect(names(sortLigandEntries(list, { ...order, descending: true }, false))).toEqual(["pose_10", "pose_1", "pose_2", "ATP", "unscored"]);
});

test("the list given is not changed", () => {
    const before = [...list];
    sortLigandEntries(list, { by: metadataOrder("Score"), descending: true }, true);
    sortLigandEntries(list, { by: "name", descending: true });
    expect(list).toEqual(before);
});
