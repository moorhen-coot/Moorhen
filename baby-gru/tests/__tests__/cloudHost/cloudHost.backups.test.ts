/*
 * CCP4 Cloud host contract, BAK: time capsule backups stored by CCP4 Cloud through createCallbackBackupStorage.
 * IDs refer to MoorhenWrapper's CLOUD_HOST_TEST_SPEC.md.
 *
 * Existing CCP4 Cloud jobs contain backups in this format, so it must not change. BAK-01…11 check the storage
 * format on plain objects (golden values from MoorhenWrapper's CloudStorageInstance); BAK-12…14 run the real time
 * capsule on the real Coot module.
 */
import type { CloudBackup } from "@/WebComponent/ccp4cloud/backupStorage";
import { gunzipSync } from "zlib";
import { MoorhenTimeCapsule } from "@/utils/MoorhenTimeCapsule";
import {
    createCloudInstance,
    createFakeHost,
    jobUrl,
    loadCootModules,
    readTestData,
    resetFetch,
    type CloudInstance,
    type FakeHost,
} from "./cloudHostHarness";

jest.setTimeout(120000);

beforeAll(loadCootModules);
beforeEach(resetFetch);

/** The maps CCP4 Cloud loads from a Refmac MTZ */
const cloudMaps = () =>
    [
        {
            name: "map",
            columns: { F: "FWT", PHI: "PHWT", Fobs: "FP", SigFobs: "SIGFP", FreeR: "FREE" },
            isDifference: false,
            calcStructFact: true,
            active: true,
        },
        { name: "diff-map", columns: { F: "DELFWT", PHI: "PHDELWT" }, isDifference: true },
    ] as any;

const automaticKey = () => ({
    dateTime: "1700000000000",
    type: "automatic",
    serNo: "4f2b8c1e-0d7a-4f43-9b51-5c3a6e2d9f10",
    molNames: ["molecule"],
    mapNames: ["a1b2c3d4-map"],
    mtzNames: ["./a1b2c3d4-map.mtz"],
    label: "molecule -- Tuesday, 14 November 2023 22:13:20 -- AUTO",
});

/** Residue numbers present in chain `chain` of a PDB string */
const residuesInChain = (pdb: string, chain: string): Set<number> =>
    new Set(
        pdb
            .split("\n")
            .filter(line => (line.startsWith("ATOM") || line.startsWith("HETATM")) && line[21] === chain)
            .map(line => parseInt(line.slice(22, 26)))
    );

/** Run `body` with a cloud instance, always cleaning it up */
async function withInstance<T>(options: Parameters<typeof createCloudInstance>[0], body: (cloud: CloudInstance) => Promise<T>): Promise<T> {
    const cloud = await createCloudInstance(options);
    try {
        return await body(cloud);
    } finally {
        await cloud.cleanup();
    }
}

describe("BAK: backups", () => {
    let host: FakeHost;

    beforeEach(() => {
        host = createFakeHost();
    });

    test("BAK-01 setItem of the version saves serNo 0 with the version as data", async () => {
        const save = jest.spyOn(host.callbacks, "save");
        await host.backupStorage.setItem('{"type":"version"}', "v1");
        expect(save).toHaveBeenCalledTimes(1);
        expect(save).toHaveBeenCalledWith({ type: "version", serNo: 0, data: "v1" });
    });

    test("BAK-02 getItem of the version loads serNo 0 and returns its data", async () => {
        host.backups.set(0, { type: "version", serNo: 0, data: "v1" } as CloudBackup);
        const load = jest.spyOn(host.callbacks, "load");
        await expect(host.backupStorage.getItem('{"type":"version"}')).resolves.toBe("v1");
        expect(load).toHaveBeenCalledWith(0);
    });

    test("BAK-03 setItem of mtzData uses '<name>-mtz' as serNo and a JSON byte array as data", async () => {
        const bytes = new Uint8Array([77, 84, 90, 32, 0, 1, 127, 128, 255]);
        const save = jest.spyOn(host.callbacks, "save");
        await host.backupStorage.setItem('{"type":"mtzData","name":"./abc.mtz"}', bytes);
        expect(save).toHaveBeenCalledWith({ type: "mtzData", name: "./abc.mtz", serNo: "abc-mtz", data: JSON.stringify(Array.from(bytes)) });
        expect(host.backups.get("abc-mtz").data).toBe("[77,84,90,32,0,1,127,128,255]");
    });

    test("BAK-04 getItem of mtzData returns a Uint8Array of the original bytes", async () => {
        const bytes = new Uint8Array([77, 84, 90, 32, 0, 1, 127, 128, 255]);
        await host.backupStorage.setItem('{"type":"mtzData","name":"./abc.mtz"}', bytes);
        const load = jest.spyOn(host.callbacks, "load");
        const result = await host.backupStorage.getItem('{"type":"mtzData","name":"./abc.mtz"}');
        expect(load).toHaveBeenCalledWith("abc-mtz");
        expect(result).toBeInstanceOf(Uint8Array);
        expect(Array.from(result as Uint8Array)).toEqual(Array.from(bytes));
    });

    test("BAK-05 setItem of mapData uses the key name as serNo and a JSON byte array as data", async () => {
        const uid = "9d7e6f5a-map-uid";
        const buffer = new Uint8Array([0, 2, 4, 200, 255]).buffer;
        const save = jest.spyOn(host.callbacks, "save");
        await host.backupStorage.setItem(JSON.stringify({ type: "mapData", name: uid }), buffer);
        expect(save).toHaveBeenCalledWith({ type: "mapData", name: uid, serNo: uid, data: "[0,2,4,200,255]" });
    });

    test("BAK-06 getItem of mapData returns an ArrayBuffer with the same bytes", async () => {
        const uid = "9d7e6f5a-map-uid";
        const buffer = new Uint8Array([0, 2, 4, 200, 255]).buffer;
        await host.backupStorage.setItem(JSON.stringify({ type: "mapData", name: uid }), buffer);
        const load = jest.spyOn(host.callbacks, "load");
        const result = await host.backupStorage.getItem(JSON.stringify({ type: "mapData", name: uid }));
        expect(load).toHaveBeenCalledWith(uid);
        expect(result).toBeInstanceOf(ArrayBuffer);
        expect(Array.from(new Uint8Array(result as ArrayBuffer))).toEqual([0, 2, 4, 200, 255]);
    });

    test("BAK-07 setItem of an automatic backup saves the key fields plus data under the key's serNo", async () => {
        const key = automaticKey();
        const save = jest.spyOn(host.callbacks, "save");
        await host.backupStorage.setItem(JSON.stringify(key), '{"version":"v23"}');
        expect(save).toHaveBeenCalledWith({ data: '{"version":"v23"}', ...key });
        expect(host.backups.get(key.serNo)).toEqual({ data: '{"version":"v23"}', ...key });
    });

    test("BAK-08 getItem of an automatic backup loads its serNo and returns the data", async () => {
        const key = automaticKey();
        await host.backupStorage.setItem(JSON.stringify(key), '{"version":"v23"}');
        const load = jest.spyOn(host.callbacks, "load");
        await expect(host.backupStorage.getItem(JSON.stringify(key))).resolves.toBe('{"version":"v23"}');
        expect(load).toHaveBeenCalledWith(key.serNo);
    });

    test("BAK-09 keys() returns every listed backup as a JSON string", async () => {
        const backups = [
            { type: "version", serNo: 0, data: "v23" },
            { type: "mtzData", name: "./abc.mtz", serNo: "abc-mtz", data: "[1,2]" },
            { data: "{}", ...automaticKey() },
        ] as CloudBackup[];
        backups.forEach(backup => host.backups.set(backup.serNo, backup));
        const list = jest.spyOn(host.callbacks, "list");
        await expect(host.backupStorage.keys()).resolves.toEqual(backups.map(backup => JSON.stringify(backup)));
        expect(list).toHaveBeenCalledTimes(1);
    });

    test("BAK-10 removeItem(keyString) removes the key's serNo", async () => {
        const backup = { data: "{}", ...automaticKey() } as CloudBackup;
        host.backups.set(backup.serNo, backup);
        const remove = jest.spyOn(host.callbacks, "remove");
        await host.backupStorage.removeItem(JSON.stringify(backup));
        expect(remove).toHaveBeenCalledTimes(1);
        expect(remove).toHaveBeenCalledWith(backup.serNo);
        expect(host.backups.size).toBe(0);
    });

    test("BAK-11 clear() removes every listed serNo", async () => {
        const backups = [
            { type: "version", serNo: 0, data: "v23" },
            { type: "mtzData", name: "./abc.mtz", serNo: "abc-mtz", data: "[1,2]" },
            { type: "mapData", name: "map-uid", serNo: "map-uid", data: "[3]" },
            { data: "{}", ...automaticKey() },
        ] as CloudBackup[];
        backups.forEach(backup => host.backups.set(backup.serNo, backup));
        const remove = jest.spyOn(host.callbacks, "remove");
        await host.backupStorage.clear();
        expect(remove.mock.calls.map(call => call[0]).sort()).toEqual(backups.map(backup => backup.serNo).sort());
        expect(host.backups.size).toBe(0);
    });

    /*
     * legacyBackups.json.gz holds exactly what CCP4 Cloud stores for a job: the version entry, one automatic session
     * backup of 5a3h.pdb ("molecule") + 5a3h_sigmaa.mtz ("map", "diff-map"), its mtzData entry, and the two
     * mapData entries the automatic backup refers to (automatic backups don't embed map data, so a restore needs
     * them). It was generated once by the current code: a throwaway test drove the real MoorhenTimeCapsule
     * (addModification with threshold 1) through createCallbackBackupStorage and dumped the fake host's backups,
     * one per line. It was then checked by hand against MoorhenWrapper's CloudStorageInstance
     * (src/utils/MoorhenCloudTimeCapsule.ts): version serNo 0, mtzData serNo "<uid>-mtz" from "./<uid>.mtz",
     * mapData serNo = name, byte arrays as JSON arrays, session = key fields + data. Coot's map sampling rate was
     * lowered to 1.0 while generating, only to keep the map entries small (~9.7 MB total, mostly the MTZ bytes).
     */
    test("BAK-12 legacy backups are listed by the time capsule and restore the molecule and maps", async () => {
        // gzipped to keep the repository small (about 9 MB uncompressed)
        const legacy: CloudBackup[] = JSON.parse(gunzipSync(readTestData("cloudJob/legacyBackups.json.gz", null)).toString("utf8"));
        legacy.forEach(backup => host.backups.set(backup.serNo, backup));
        const sessionBackup = legacy.find(backup => backup.type === "automatic");
        const mtzBackup = legacy.find(backup => backup.type === "mtzData");
        const load = jest.spyOn(host.callbacks, "load");
        const remove = jest.spyOn(host.callbacks, "remove");

        await withInstance({ backupStorage: host.backupStorage }, async cloud => {
            const timeCapsule = cloud.instance.getTimeCapsule();
            // Same version: the legacy backups survive the start-up version check
            expect(remove).not.toHaveBeenCalled();
            expect(host.backups.size).toBe(legacy.length);

            const keys = await timeCapsule.getSortedKeys();
            expect(keys).toHaveLength(1);
            expect(keys[0]).toMatchObject({ type: "automatic", serNo: sessionBackup.serNo, molNames: ["molecule"] });

            const sessionString = (await timeCapsule.retrieveLastBackup()) as string;
            expect(sessionString).toBe(sessionBackup.data);
            const status = await MoorhenTimeCapsule.loadSessionFromJsonString(sessionString, cloud.instance);
            expect(status).toBe(0);

            const session = JSON.parse(sessionBackup.data);
            const molecules = cloud.instance.getMoleculeList();
            expect(molecules.map(molecule => molecule.name)).toEqual(["molecule"]);
            expect(molecules[0].uniqueId).toBe(session.moleculeData[0].uniqueId);
            expect(residuesInChain(await molecules[0].getAtoms(), "A").size).toBeGreaterThan(0);

            const maps = cloud.instance.getMapList();
            expect(maps.map(map => map.name).sort()).toEqual(["diff-map", "map"]);
            const map = maps.find(item => item.name === "map");
            const diffMap = maps.find(item => item.name === "diff-map");
            expect(map.isDifference).toBe(false);
            expect(diffMap.isDifference).toBe(true);
            expect(map.uniqueId).toBe(session.mapData.find(item => item.name === "map").uniqueId);
            // The reflection data came back from the mtzData entry, looked up by its "<uid>-mtz" serNo
            expect(load).toHaveBeenCalledWith(mtzBackup.serNo);
            expect(map.hasReflectionData).toBe(true);
            legacy.filter(backup => backup.type === "mapData").forEach(backup => expect(load).toHaveBeenCalledWith(backup.serNo));
        });
    });

    test("BAK-13 enough journalled edits save an automatic session backup that restores the edit", async () => {
        const threshold = 2;
        const save = jest.spyOn(host.callbacks, "save");

        const sessionBackup = await withInstance({ backupStorage: host.backupStorage, modificationCountBackupThreshold: threshold }, async cloud => {
            const result = await cloud.instance.files.loadFiles({ url: jobUrl("5a3h.pdb"), filename: "molecule.pdb" }, "cloud");
            const molecule = cloud.instance.getMolecule(result[0].uniqueID);
            const before = residuesInChain(await molecule.getAtoms(), "A");
            expect(before.has(10)).toBe(true);
            expect(before.has(11)).toBe(true);
            save.mockClear();

            const deleteResidue = (resNo: number) =>
                cloud.commandCentre.cootCommand(
                    {
                        returnType: "status",
                        command: "delete_using_cid",
                        commandArgs: [molecule.molNo, `//A/${resNo}`, "LITERAL"],
                        changesMolecules: [molecule.molNo],
                    },
                    true
                );

            await deleteResidue(10);
            expect(save.mock.calls.filter(call => call[0].type === "automatic")).toHaveLength(0);
            await deleteResidue(11);

            const sessionSaves = save.mock.calls.map(call => call[0]).filter(backup => backup.type === "automatic");
            expect(sessionSaves).toHaveLength(1);
            const backup = sessionSaves[0];
            expect(typeof backup.serNo).toBe("string");
            expect(backup.serNo).not.toBe("");
            expect(host.backups.get(backup.serNo)).toBe(backup);
            expect(backup.molNames).toEqual(["molecule"]);
            expect(JSON.parse(backup.data).version).toBe(cloud.instance.getTimeCapsule().version);
            return backup;
        });

        // A fresh instance on the same host storage (a reopened CCP4 Cloud job)
        await withInstance({ backupStorage: host.backupStorage }, async cloud => {
            const timeCapsule = cloud.instance.getTimeCapsule();
            const keys = await timeCapsule.getSortedKeys();
            expect(keys.map(key => key.serNo)).toEqual([sessionBackup.serNo]);
            const sessionString = (await timeCapsule.retrieveLastBackup()) as string;
            expect(await MoorhenTimeCapsule.loadSessionFromJsonString(sessionString, cloud.instance)).toBe(0);

            const molecules = cloud.instance.getMoleculeList();
            expect(molecules.map(molecule => molecule.name)).toEqual(["molecule"]);
            const restored = residuesInChain(await molecules[0].getAtoms(), "A");
            expect(restored.size).toBeGreaterThan(0);
            // Both edits are in the backup: commands are journalled after they run, as in MoorhenCommandCentre,
            // so the edit that triggers the backup is included
            expect(restored.has(10)).toBe(false);
            expect(restored.has(11)).toBe(false);
        });
    });

    // Extra (not a spec row): CCP4 Cloud restores through the time capsule, and ErrorBoundary's crash recovery
    // calls retrieveLastBackup. getSortedKeys lists the newest first, so the most recent backup is its first entry.
    test("BAK-15 (extra) retrieveLastBackup returns the most recent backup", async () => {
        const older = { ...automaticKey(), serNo: "older", dateTime: "1000" };
        const newer = { ...automaticKey(), serNo: "newer", dateTime: "2000" };
        await host.callbacks.save({ ...older, data: "older session" } as CloudBackup);
        await host.callbacks.save({ ...newer, data: "newer session" } as CloudBackup);
        const timeCapsule = new MoorhenTimeCapsule(null, null, null, null);
        timeCapsule.storageInstance = host.backupStorage;
        expect((await timeCapsule.getSortedKeys()).map(key => key.serNo)).toEqual(["newer", "older"]);
        expect(await timeCapsule.retrieveLastBackup()).toBe("newer session");
    });

    test("BAK-14 a stored version mismatch clears the host backups then stores the current version", async () => {
        const stale = [
            { type: "version", serNo: 0, data: "v1-stale" },
            { type: "mtzData", name: "./abc.mtz", serNo: "abc-mtz", data: "[1,2]" },
            { data: "{}", ...automaticKey() },
        ] as CloudBackup[];
        stale.forEach(backup => host.backups.set(backup.serNo, backup));

        const calls: string[] = [];
        const { save, load, remove, list } = host.callbacks;
        jest.spyOn(host.callbacks, "save").mockImplementation(async backup => {
            calls.push(`save:${backup.serNo}`);
            return save(backup);
        });
        jest.spyOn(host.callbacks, "load").mockImplementation(async serNo => {
            calls.push(`load:${serNo}`);
            return load(serNo);
        });
        jest.spyOn(host.callbacks, "remove").mockImplementation(async serNo => {
            calls.push(`remove:${serNo}`);
            return remove(serNo);
        });
        jest.spyOn(host.callbacks, "list").mockImplementation(async () => {
            calls.push("list");
            return list();
        });

        await withInstance({ backupStorage: host.backupStorage }, async cloud => {
            const version = cloud.instance.getTimeCapsule().version;
            expect(version).not.toBe("v1-stale");
            expect(calls[0]).toBe("load:0");
            const removes = calls.filter(call => call.startsWith("remove:"));
            expect(removes.sort()).toEqual(stale.map(backup => `remove:${backup.serNo}`).sort());
            // Everything is removed before the version is saved again
            const saveIndex = calls.indexOf("save:0");
            expect(saveIndex).toBeGreaterThan(-1);
            expect(calls.slice(0, saveIndex).filter(call => call.startsWith("remove:"))).toHaveLength(stale.length);
            expect(calls.filter(call => call.startsWith("save:"))).toEqual(["save:0"]);
            expect([...host.backups.values()]).toEqual([{ type: "version", serNo: 0, data: version }]);
        });
    });

    // Extra (not a spec row): cleanupUnusedDataFiles used to keep only the data files of the first backup key, so the
    // maps and reflection data of every other backup were deleted as orphans
    test("BAK-16 (extra) data files used by any backup are kept, only orphans are removed", async () => {
        const session = (serNo: string, dateTime: string, mapName: string, mtzName: string) =>
            ({ ...automaticKey(), serNo, dateTime, mapNames: [mapName], mtzNames: [mtzName], data: "session" }) as CloudBackup;
        const data = (type: "mapData" | "mtzData", name: string) => ({ type, name, serNo: name, data: "[]" }) as unknown as CloudBackup;
        for (const backup of [
            session("first", "1000", "map-a", "./mtz-a.mtz"),
            session("second", "2000", "map-b", "./mtz-b.mtz"),
            data("mapData", "map-a"),
            data("mtzData", "./mtz-a.mtz"),
            data("mapData", "map-b"),
            data("mtzData", "./mtz-b.mtz"),
            data("mapData", "map-orphan"),
        ]) {
            await host.callbacks.save(backup);
        }
        const timeCapsule = new MoorhenTimeCapsule(null, null, null, null);
        timeCapsule.storageInstance = host.backupStorage;
        await timeCapsule.cleanupUnusedDataFiles();
        expect([...host.backups.keys()].sort()).toEqual(["./mtz-a.mtz", "./mtz-b.mtz", "first", "map-a", "map-b", "second"]);
    });

    // Extra (not a spec row): a backup whose entry the host no longer has (e.g. data files removed by the old
    // cleanupUnusedDataFiles bug) reads as null, like LocalForage, instead of throwing on undefined
    test("BAK-17 (extra) a missing backup reads as null for every key type", async () => {
        const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
        try {
            for (const key of [
                { type: "version" },
                { type: "mtzData", name: "./gone.mtz" },
                { type: "mapData", name: "gone-map" },
                { ...automaticKey(), serNo: "gone-session" },
            ]) {
                await expect(host.backupStorage.getItem(JSON.stringify(key))).resolves.toBeNull();
            }
            expect(warn).toHaveBeenCalledWith(expect.stringContaining("gone-session"));
        } finally {
            warn.mockRestore();
        }
    });
});
