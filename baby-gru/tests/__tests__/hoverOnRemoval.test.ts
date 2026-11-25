/*
 * A hovered atom of a molecule removed from the list is not hovered any more (StoreSync), before the
 * molecule is deleted: else middle-click and the hover shortcuts would use a deleted molecule.
 */
import { setHoveredAtom } from "@/store/hoveringStatesSlice";
import { removeMolecule } from "@/store/moleculesSlice";
import { createCloudInstance, jobUrl, loadCootModules, resetFetch, type CloudInstance } from "./cloudHost/cloudHostHarness";

jest.setTimeout(120_000);

let cloud: CloudInstance;
beforeAll(loadCootModules);
beforeEach(async () => {
    resetFetch();
    cloud = await createCloudInstance();
});
afterEach(() => cloud.cleanup());

test("removing the hovered molecule clears the hover; removing another does not", async () => {
    const [first] = await cloud.instance.files.loadFiles(jobUrl("BGC.cif"));
    const [second] = await cloud.instance.files.loadFiles(jobUrl("BGC.cif"));
    const hovered = cloud.instance.getMolecule(first.uniqueID);
    const other = cloud.instance.getMolecule(second.uniqueID);
    const hoveredMolecule = () => cloud.store.getState().hoveringStates.hoveredAtom.molecule;

    cloud.store.dispatch(setHoveredAtom({ molecule: hovered, cid: "/1/A/1(BGC)/C1", atomInfo: null }));
    cloud.store.dispatch(removeMolecule(other));
    expect(hoveredMolecule()).toBe(hovered);

    // Cleared at once, before the caller goes on to delete it
    cloud.store.dispatch(removeMolecule(hovered));
    expect(hoveredMolecule()).toBeNull();
    await hovered.delete();
    await other.delete();
});
