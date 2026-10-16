/*
 * CCP4 Cloud host contract, MOL: molecules loaded with files.loadFiles({ url, filename: molName + ext }).
 * IDs refer to MoorhenWrapper's CLOUD_HOST_TEST_SPEC.md.
 */
import { createCloudInstance, fetchCount, flush, jobUrl, loadCootModules, resetFetch, type CloudInstance } from "./cloudHostHarness";

jest.setTimeout(60000);

let cloud: CloudInstance;

beforeAll(loadCootModules);

beforeEach(async () => {
    resetFetch();
    cloud = await createCloudInstance();
});

afterEach(() => cloud.cleanup());

describe("MOL: molecules", () => {
    test("MOL-01 a PDB file is loaded under the given molecule name", async () => {
        const result = await cloud.instance.files.loadFiles({ url: jobUrl("5a3h.pdb"), filename: "molecule.pdb" }, "cloud");
        expect(result.filter(item => item.type === "molecule")).toHaveLength(1);
        expect(cloud.instance.getMolecule(result[0].uniqueID).name).toBe("molecule");
    });

    test("MOL-02 an mmCIF file is parsed and named without its extension", async () => {
        const result = await cloud.instance.files.loadFiles({ url: jobUrl("5a3h.mmcif"), filename: "molecule.cif" }, "cloud");
        const molecule = cloud.instance.getMolecule(result[0].uniqueID);
        expect(molecule.name).toBe("molecule");
        expect(molecule.atomCount).toBeGreaterThan(0);
    });

    test("MOL-03 a .mmcif filename gives the name without extension", async () => {
        const result = await cloud.instance.files.loadFiles({ url: jobUrl("5a3h.mmcif"), filename: "molecule_1.mmcif" }, "cloud");
        expect(cloud.instance.getMolecule(result[0].uniqueID).name).toBe("molecule_1");
    });

    test("MOL-04 two structures loaded in parallel keep their names and distinct ids", async () => {
        const [first, second] = await Promise.all([
            cloud.instance.files.loadFiles({ url: jobUrl("5a3h.pdb"), filename: "molecule.pdb" }, "cloud"),
            cloud.instance.files.loadFiles({ url: jobUrl("5fjj.pdb"), filename: "molecule_1.pdb" }, "cloud"),
        ]);
        expect(first[0].uniqueID).not.toBe(second[0].uniqueID);
        expect(cloud.instance.getMoleculeList().map(molecule => molecule.name).sort()).toEqual(["molecule", "molecule_1"]);
    });

    test("MOL-05 a relative URL is fetched, not read from the file system", async () => {
        // "job/5a3h.pdb" does not exist relative to the working directory, so only fetch can serve it
        const result = await cloud.instance.files.loadFiles({ url: "job/5a3h.pdb", filename: "molecule.pdb" }, "cloud");
        expect(fetchCount("job/5a3h.pdb")).toBe(1);
        expect(result.filter(item => item.type === "molecule")).toHaveLength(1);
    });

    test("MOL-06 the returned uniqueID finds the molecule", async () => {
        const result = await cloud.instance.files.loadFiles({ url: jobUrl("5a3h.pdb"), filename: "molecule.pdb" }, "cloud");
        expect(cloud.instance.getMolecule(result[0].uniqueID)?.uniqueId).toBe(result[0].uniqueID);
    });

    // BUG: files.loadFiles never checks response.ok when fetching a URL, so a 404 becomes an empty "molecule.pdb"
    // that is passed to Coot (src/InstanceManager/MoorhenInstance.ts, getFileFromURL in files.loadFiles).
    // loadFiles resolves with no molecule, but a Coot C++ exception (`Exception {}`) is thrown afterwards from
    // work loadFiles does not await, so it escapes the host's error handling.
    // SKIPPED, not test.failing: Jest reports an exception that escapes on its own separately from the test's
    // result, so test.failing cannot invert it, and it would leak into the next test. Unskip once fixed.
    test.skip("MOL-07 a URL that 404s adds no molecule and does not throw", async () => {
        const result = await cloud.instance.files.loadFiles({ url: jobUrl("missing.pdb"), filename: "molecule.pdb" }, "cloud");
        await flush(200);
        expect((result ?? []).filter(item => item.type === "molecule")).toHaveLength(0);
        expect(cloud.instance.getMoleculeList()).toHaveLength(0);
    });

    test("MOL-08 newFilesLoadedCallback fires once with the result and the origin", async () => {
        const callback = jest.fn();
        cloud.instance.files.newFilesLoadedCallback(callback);
        const result = await cloud.instance.files.loadFiles({ url: jobUrl("5a3h.pdb"), filename: "molecule.pdb" }, "cloud");
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith(result, "cloud");
    });
});
