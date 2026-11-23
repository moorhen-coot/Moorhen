/*
 * CCP4 Cloud host contract, MTZ: maps loaded with files.loadMtz(url, maps, origin).
 * IDs refer to MoorhenWrapper's CLOUD_HOST_TEST_SPEC.md.
 */
import type { MtzMapRequest } from "@/utils/MtzLoading";
import { createCloudInstance, fetchCount, fetchedUrls, jobUrl, loadCootModules, resetFetch, type CloudInstance } from "./cloudHostHarness";

jest.setTimeout(60000);

let cloud: CloudInstance;

beforeAll(loadCootModules);

beforeEach(async () => {
    resetFetch();
    cloud = await createCloudInstance();
});

afterEach(() => cloud.cleanup());

const SIGMAA = "5a3h_sigmaa.mtz";
const NO_FREE = "1cxq_phases.mtz";

const reflection = { Fobs: "FP", SigFobs: "SIGFP", FreeR: "FREE" };

/** The jsCoFE map/diff-map pair */
const jscofePair = (): MtzMapRequest[] => [
    { name: "map", columns: { F: "FWT", PHI: "PHWT", ...reflection }, calcStructFact: true, active: true },
    { name: "diff-map", columns: { F: "DELFWT", PHI: "PHDELWT" }, isDifference: true },
];

const PURPLE = { r: 0.733, g: 0.2, b: 1.0 };
const ANOM_POSITIVE = { r: 0.055, g: 0.4, b: 0.333 };
const ANOM_NEGATIVE = { r: 0.98, g: 0.5, b: 0.45 };
const BLUE = { r: 0.3, g: 0.4, b: 0.9 };
const GREEN = { r: 0.1, g: 0.8, b: 0.2 };
const RED = { r: 0.9, g: 0.1, b: 0.1 };

const colourOf = (list: "mapColours" | "positiveMapColours" | "negativeMapColours", molNo: number) =>
    cloud.store.getState().mapContourSettings[list].find(item => item.molNo === molNo)?.rgb;

const activeMap = () => cloud.store.getState().generalStates.activeMap;
const storeMaps = () => cloud.store.getState().maps;
const snackbars = () => cloud.store.getState().snackBars;

describe("MTZ: maps", () => {
    test("MTZ-01 the jsCoFE pair loads two named maps in request order", async () => {
        const result = await cloud.instance.files.loadMtz(jobUrl(SIGMAA), jscofePair(), "cloud");
        expect(result).toHaveLength(2);
        expect(result.map(item => cloud.instance.getMap(item.uniqueID).name)).toEqual(["map", "diff-map"]);
        expect(storeMaps().map(map => map.name)).toEqual(["map", "diff-map"]);
    });

    test("MTZ-02 the MTZ URL is fetched exactly once", async () => {
        await cloud.instance.files.loadMtz(jobUrl(SIGMAA), jscofePair(), "cloud");
        expect(fetchCount(jobUrl(SIGMAA))).toBe(1);
    });

    test("MTZ-03 selectedColumns and isDifference follow the request", async () => {
        const requests = jscofePair();
        const result = await cloud.instance.files.loadMtz(jobUrl(SIGMAA), requests, "cloud");
        const [map, diffMap] = result.map(item => cloud.instance.getMap(item.uniqueID));
        expect(map.selectedColumns).toMatchObject(requests[0].columns);
        expect(diffMap.selectedColumns).toMatchObject(requests[1].columns);
        expect(map.isDifference).toBe(false);
        expect(diffMap.isDifference).toBe(true);
    });

    test("MTZ-04 requested colours are in the store after loading", async () => {
        const result = await cloud.instance.files.loadMtz(jobUrl(SIGMAA), [
            { name: "map", columns: { F: "FWT", PHI: "PHWT" }, style: { colour: BLUE } },
            { name: "diff-map", columns: { F: "DELFWT", PHI: "PHDELWT" }, isDifference: true, style: { positiveColour: GREEN, negativeColour: RED } },
        ]);
        expect(colourOf("mapColours", result[0].molNo)).toEqual(BLUE);
        expect(colourOf("positiveMapColours", result[1].molNo)).toEqual(GREEN);
        expect(colourOf("negativeMapColours", result[1].molNo)).toEqual(RED);
    });

    test("MTZ-05 the four jsCoFE map types load from one URL with their flags and colours", async () => {
        const result = await cloud.instance.files.loadMtz(
            jobUrl(SIGMAA),
            [
                { name: "map", columns: { F: "FWT", PHI: "PHWT", ...reflection }, style: { colour: BLUE }, active: true },
                { name: "diff-map", columns: { F: "DELFWT", PHI: "PHDELWT" }, isDifference: true, style: { positiveColour: GREEN, negativeColour: RED } },
                // No anomalous fixture: column labels are arbitrary, so the anomalous maps reuse the same columns
                { name: "anom-map", columns: { F: "FWT", PHI: "PHWT" }, style: { colour: PURPLE } },
                {
                    name: "anom-diff-map",
                    columns: { F: "DELFWT", PHI: "PHDELWT" },
                    isDifference: true,
                    style: { positiveColour: ANOM_POSITIVE, negativeColour: ANOM_NEGATIVE },
                },
            ],
            "cloud"
        );
        expect(fetchCount(jobUrl(SIGMAA))).toBe(1);
        const maps = result.map(item => cloud.instance.getMap(item.uniqueID));
        expect(maps.map(map => map.name)).toEqual(["map", "diff-map", "anom-map", "anom-diff-map"]);
        expect(maps.map(map => map.isDifference)).toEqual([false, true, false, true]);
        expect(colourOf("mapColours", maps[0].molNo)).toEqual(BLUE);
        expect(colourOf("positiveMapColours", maps[1].molNo)).toEqual(GREEN);
        expect(colourOf("negativeMapColours", maps[1].molNo)).toEqual(RED);
        expect(colourOf("mapColours", maps[2].molNo)).toEqual(PURPLE);
        expect(colourOf("positiveMapColours", maps[3].molNo)).toEqual(ANOM_POSITIVE);
        expect(colourOf("negativeMapColours", maps[3].molNo)).toEqual(ANOM_NEGATIVE);
    });

    test("MTZ-06 calcStructFact with all reflection columns associates reflection data", async () => {
        const result = await cloud.instance.files.loadMtz(jobUrl(SIGMAA), [
            { name: "map", columns: { F: "FWT", PHI: "PHWT", ...reflection }, calcStructFact: true },
        ]);
        expect(cloud.instance.getMap(result[0].uniqueID).hasReflectionData).toBe(true);
    });

    test("MTZ-07 calcStructFact defaults to true when all reflection columns are given", async () => {
        const result = await cloud.instance.files.loadMtz(jobUrl(SIGMAA), [{ name: "map", columns: { F: "FWT", PHI: "PHWT", ...reflection } }]);
        const map = cloud.instance.getMap(result[0].uniqueID);
        expect(map.selectedColumns.calcStructFact).toBe(true);
        expect(map.hasReflectionData).toBe(true);
    });

    test("MTZ-08 calcStructFact defaults to false when FreeR is not requested", async () => {
        const result = await cloud.instance.files.loadMtz(jobUrl(SIGMAA), [
            { name: "map", columns: { F: "FWT", PHI: "PHWT", Fobs: "FP", SigFobs: "SIGFP" } },
        ]);
        const map = cloud.instance.getMap(result[0].uniqueID);
        expect(map.selectedColumns.calcStructFact).toBe(false);
        expect(map.hasReflectionData).toBe(false);
    });

    test("MTZ-09 mislabelled Fobs/SigFobs (absent from the file) load without reflection data, with a neutral note", async () => {
        const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
        try {
            const result = await cloud.instance.files.loadMtz(jobUrl(SIGMAA), [
                { name: "map", columns: { F: "FWT", PHI: "PHWT", Fobs: "F", SigFobs: "SIGF", FreeR: "FREE" }, calcStructFact: true },
                { name: "diff-map", columns: { F: "DELFWT", PHI: "PHDELWT" }, isDifference: true },
            ]);
            expect(result).toHaveLength(2);
            expect(cloud.instance.getMap(result[0].uniqueID).hasReflectionData).toBe(false);
            expect(warn).toHaveBeenCalledWith(expect.stringContaining('Fobs="F"'));
            // The user gets a plain note, not a warning: the maps are fine, only live updates and R-factors are unavailable
            expect(snackbars().some(snackbar => snackbar.variant === "info" && /Live map updates and R-factors.*\bmap\b.*SIGF/.test(snackbar.message))).toBe(true);
            expect(snackbars().some(snackbar => snackbar.variant === "warning" || snackbar.variant === "error")).toBe(false);
        } finally {
            warn.mockRestore();
        }
    });

    test("MTZ-10 FreeR requested on a file without FreeR loads without reflection data, with a neutral note", async () => {
        const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
        try {
            const result = await cloud.instance.files.loadMtz(jobUrl(NO_FREE), [
                { name: "map", columns: { F: "FWT", PHI: "PHWT", ...reflection }, calcStructFact: true },
                { name: "diff-map", columns: { F: "DELFWT", PHI: "PHDELWT" }, isDifference: true },
            ]);
            expect(result).toHaveLength(2);
            expect(cloud.instance.getMap(result[0].uniqueID).hasReflectionData).toBe(false);
            expect(warn).toHaveBeenCalledWith(expect.stringContaining('FreeR="FREE"'));
            expect(snackbars().some(snackbar => snackbar.variant === "info" && /Live map updates and R-factors.*\bmap\b.*FREE/.test(snackbar.message))).toBe(true);
            expect(snackbars().some(snackbar => snackbar.variant === "warning" || snackbar.variant === "error")).toBe(false);
        } finally {
            warn.mockRestore();
        }
    });

    test("MTZ-11 a missing F or PHI column rejects before any worker command", async () => {
        const mark = cloud.commandCentre.commands.length;
        const promise = cloud.instance.files.loadMtz(jobUrl(SIGMAA), [{ name: "map", columns: { F: "FWT", PHI: "NOPE" } }]);
        await expect(promise).rejects.toThrow(/PHI="NOPE"/);
        const message = await promise.catch((err: Error) => err.message);
        // Available columns are listed with their types
        expect(message).toMatch(/Available columns:.*FWT \(F\).*PHWT \(P\)/);
        expect(cloud.commandCentre.commandsSince(mark)).toEqual([]);
        expect(storeMaps()).toHaveLength(0);

        await expect(cloud.instance.files.loadMtz(jobUrl(SIGMAA), [{ name: "map", columns: { F: "NOPE_F", PHI: "PHWT" } }])).rejects.toThrow(
            /F="NOPE_F"/
        );
        expect(cloud.commandCentre.commandsSince(mark)).toEqual([]);
        expect(storeMaps()).toHaveLength(0);
    });

    test("MTZ-12 one bad map in a multi-map call rejects the whole call", async () => {
        const mark = cloud.commandCentre.commands.length;
        await expect(
            cloud.instance.files.loadMtz(jobUrl(SIGMAA), [
                { name: "map", columns: { F: "FWT", PHI: "PHWT", ...reflection } },
                { name: "diff-map", columns: { F: "DELFWT", PHI: "MISSING" }, isDifference: true },
            ])
        ).rejects.toThrow(/MISSING/);
        expect(cloud.commandCentre.commandsSince(mark)).toEqual([]);
        expect(storeMaps()).toHaveLength(0);
    });

    test("MTZ-13 an omitted name defaults to fileName-F", async () => {
        const result = await cloud.instance.files.loadMtz(jobUrl(SIGMAA), [{ columns: { F: "FWT", PHI: "PHWT" } }]);
        expect(cloud.instance.getMap(result[0].uniqueID).name).toBe("5a3h_sigmaa-FWT");
    });

    test("MTZ-14 an omitted isDifference defaults to false", async () => {
        const result = await cloud.instance.files.loadMtz(jobUrl(SIGMAA), [{ name: "map", columns: { F: "DELFWT", PHI: "PHDELWT" } }]);
        const map = cloud.instance.getMap(result[0].uniqueID);
        expect(map.isDifference).toBe(false);
        expect(map.selectedColumns.isDifference).toBe(false);
    });

    test("MTZ-15 visible: false sets showOnLoad false and the map is not visible", async () => {
        const result = await cloud.instance.files.loadMtz(jobUrl(SIGMAA), [
            { name: "map", columns: { F: "FWT", PHI: "PHWT" }, visible: false },
            { name: "shown", columns: { F: "DELFWT", PHI: "PHDELWT" }, isDifference: true },
        ]);
        const map = cloud.instance.getMap(result[0].uniqueID);
        expect(map.showOnLoad).toBe(false);
        expect(cloud.instance.getMap(result[1].uniqueID).showOnLoad).toBe(true);
        // Nothing (no React map manager) shows maps here; the hidden one must at least not be in visibleMaps
        expect(cloud.store.getState().mapContourSettings.visibleMaps).not.toContain(map.molNo);
    });

    test("MTZ-16 a map flagged active (not the first) becomes active", async () => {
        const result = await cloud.instance.files.loadMtz(jobUrl(SIGMAA), [
            { name: "first", columns: { F: "DELFWT", PHI: "PHDELWT" }, isDifference: true },
            { name: "map", columns: { F: "FWT", PHI: "PHWT" }, active: true },
        ]);
        expect(activeMap()?.uniqueId).toBe(result[1].uniqueID);
    });

    test("MTZ-17 with none flagged and no active map, the first map becomes active", async () => {
        expect(activeMap()).toBeFalsy();
        const result = await cloud.instance.files.loadMtz(jobUrl(SIGMAA), [
            { name: "first", columns: { F: "FWT", PHI: "PHWT" } },
            { name: "second", columns: { F: "DELFWT", PHI: "PHDELWT" }, isDifference: true },
        ]);
        expect(activeMap()?.uniqueId).toBe(result[0].uniqueID);
    });

    test("MTZ-18 with none flagged and an active map already, the active map is unchanged", async () => {
        const first = await cloud.instance.files.loadMtz(jobUrl(SIGMAA), [{ name: "first", columns: { F: "FWT", PHI: "PHWT" } }]);
        expect(activeMap()?.uniqueId).toBe(first[0].uniqueID);
        await cloud.instance.files.loadMtz(jobUrl(NO_FREE), [{ name: "second", columns: { F: "FWT", PHI: "PHWT" } }]);
        expect(activeMap()?.uniqueId).toBe(first[0].uniqueID);
    });

    test("MTZ-19 two parallel calls: the map flagged active wins whatever order they finish in", async () => {
        const [first, second] = await Promise.all([
            cloud.instance.files.loadMtz(jobUrl(SIGMAA), [
                { name: "map", columns: { F: "FWT", PHI: "PHWT", ...reflection }, active: true },
                { name: "diff-map", columns: { F: "DELFWT", PHI: "PHDELWT" }, isDifference: true },
            ]),
            cloud.instance.files.loadMtz(jobUrl(NO_FREE), [
                { name: "map-2", columns: { F: "FWT", PHI: "PHWT" } },
                { name: "diff-map-2", columns: { F: "DELFWT", PHI: "PHDELWT" }, isDifference: true },
            ]),
        ]);
        expect(first).toHaveLength(2);
        expect(second).toHaveLength(2);
        expect(activeMap()?.uniqueId).toBe(first[0].uniqueID);

        // And with the flagged call finishing last: the other call is started (and finishes) first
        const other = await createCloudInstance();
        try {
            const unflagged = other.instance.files.loadMtz(jobUrl(NO_FREE), [{ name: "map-2", columns: { F: "FWT", PHI: "PHWT" } }]);
            const flagged = other.instance.files.loadMtz(jobUrl(SIGMAA), [{ name: "map", columns: { F: "FWT", PHI: "PHWT" }, active: true }]);
            const [, flaggedResult] = await Promise.all([unflagged, flagged]);
            expect(other.store.getState().generalStates.activeMap?.uniqueId).toBe(flaggedResult[0].uniqueID);
        } finally {
            await other.cleanup();
        }
    });

    test("MTZ-20 the legacy useWeight option is ignored", async () => {
        const plain = await cloud.instance.files.loadMtz(jobUrl(SIGMAA), [{ name: "plain", columns: { F: "FWT", PHI: "PHWT" } }]);
        const legacy = { name: "legacy", columns: { F: "FWT", PHI: "PHWT", useWeight: true }, useWeight: true } as unknown as MtzMapRequest;
        const weighted = await cloud.instance.files.loadMtz(jobUrl(SIGMAA), [legacy]);
        expect(weighted).toHaveLength(1);
        const plainMap = cloud.instance.getMap(plain[0].uniqueID);
        const weightedMap = cloud.instance.getMap(weighted[0].uniqueID);
        expect(weightedMap.isDifference).toBe(plainMap.isDifference);
        expect(weightedMap.hasReflectionData).toBe(plainMap.hasReflectionData);
        expect(weightedMap.mapRmsd).toBeCloseTo(plainMap.mapRmsd, 5);
    });

    test("MTZ-21 with maps omitted, the same maps as loadFiles on the same file", async () => {
        const summary = (uniqueIDs: string[]) =>
            uniqueIDs.map(uniqueID => {
                const map = cloud.instance.getMap(uniqueID);
                return { F: map.selectedColumns?.F, PHI: map.selectedColumns?.PHI, isDifference: map.isDifference };
            });
        const viaLoadMtz = await cloud.instance.files.loadMtz(jobUrl(SIGMAA));
        const viaLoadFiles = await cloud.instance.files.loadFiles(jobUrl(SIGMAA));
        const loadFilesMaps = viaLoadFiles.filter(item => item.type === "map");
        expect(viaLoadMtz.length).toBeGreaterThan(0);
        expect(viaLoadMtz).toHaveLength(loadFilesMaps.length);
        expect(summary(viaLoadMtz.map(item => item.uniqueID))).toEqual(summary(loadFilesMaps.map(item => item.uniqueID)));
    });

    test("MTZ-22 result entries describe each map in request order", async () => {
        const result = await cloud.instance.files.loadMtz(jobUrl(SIGMAA), jscofePair(), "cloud");
        expect(result).toEqual([
            { type: "map", uniqueID: expect.any(String), molNo: expect.any(Number), fileName: SIGMAA },
            { type: "map", uniqueID: expect.any(String), molNo: expect.any(Number), fileName: SIGMAA },
        ]);
        result.forEach(item => {
            const map = cloud.instance.getMap(item.uniqueID);
            expect(map).toBeDefined();
            expect(map.molNo).toBe(item.molNo);
        });
        expect(result.map(item => cloud.instance.getMap(item.uniqueID).name)).toEqual(["map", "diff-map"]);
    });

    test("MTZ-23 newFilesLoadedCallback fires once per call with all maps and the origin", async () => {
        const callback = jest.fn();
        cloud.instance.files.newFilesLoadedCallback(callback);
        const result = await cloud.instance.files.loadMtz(jobUrl(SIGMAA), jscofePair(), "cloud");
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith(result, "cloud");
        expect(callback.mock.calls[0][0]).toHaveLength(2);
    });

    test("MTZ-24 maps are added to the store in a single addMapList dispatch", async () => {
        const dispatch = jest.spyOn(cloud.instance, "dispatch");
        const storeDispatch = jest.spyOn(cloud.store, "dispatch");
        try {
            await cloud.instance.files.loadMtz(jobUrl(SIGMAA), jscofePair(), "cloud");
            const types = [...dispatch.mock.calls, ...storeDispatch.mock.calls].map(([action]) => (action as { type?: string })?.type);
            const addMapList = [...dispatch.mock.calls, ...storeDispatch.mock.calls].filter(
                ([action]) => (action as { type?: string })?.type === "maps/addMapList"
            );
            // instance.dispatch is store.dispatch, so the same action may be recorded by both spies
            const distinct = new Set(addMapList.map(([action]) => action));
            expect(distinct.size).toBe(1);
            expect(((distinct.values().next().value as unknown) as { payload: unknown[] }).payload).toHaveLength(2);
            expect(types).not.toContain("maps/addMap");
        } finally {
            dispatch.mockRestore();
            storeDispatch.mockRestore();
        }
    });

    test("MTZ-25 a relative URL is passed to fetch, not read from the file system", async () => {
        // The api-utils project runs in node, so there is no document.baseURI here. loadMtz passes the string
        // to fetch unchanged; in a browser, resolving it against document.baseURI is fetch's job. The harness
        // serves "job/..." URLs, and "job/5a3h_sigmaa.mtz" does not exist relative to the working directory.
        const result = await cloud.instance.files.loadMtz("job/5a3h_sigmaa.mtz", [{ name: "map", columns: { F: "FWT", PHI: "PHWT" } }]);
        expect(fetchCount("job/5a3h_sigmaa.mtz")).toBe(1);
        expect(fetchedUrls()).toEqual(["job/5a3h_sigmaa.mtz"]);
        expect(result).toHaveLength(1);
        expect(result[0].fileName).toBe(SIGMAA);
    });
});
