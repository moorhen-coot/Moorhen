/*
 * Shared setup for the cloudHost suite: a started MoorhenInstance on the real Coot WASM module, a fake
 * CCP4 Cloud host, fetch counting and a record of the commands sent to the worker.
 *
 * Usage, per test file:
 *     beforeAll(loadCootModules);
 *     beforeEach(resetFetch);
 *     const { instance, store, commandCentre } = await createCloudInstance();
 */
import React from "react";
import { MoorhenInstance } from "@/InstanceManager";
import { createMoorhenStore } from "@/store/MoorhenReduxStore";
import { History } from "@/utils/MoorhenHistory";
import { createCallbackBackupStorage, type CloudBackup } from "@/WebComponent/ccp4cloud/backupStorage";
import type { StoredPreferences } from "@/InstanceManager/MoorhenInstance";
import { doCootCommand, setModules } from "../../../public/MoorhenAssets/wasm/CootWorker";
import { getCloudExitData, type CloudExitData } from "./referenceHost";

const fs = require("fs");
const path = require("path");
const { ungzip } = require("node-gzip");
const createCootModule = require("../../../public/MoorhenAssets/wasm/moorhen");
const createGemmiModule = require("../../../public/MoorhenAssets/wasm/gemmi");

export const TEST_DATA = path.join(__dirname, "..", "..", "test_data");
/** Where the fake CCP4 Cloud server serves the job files from */
export const JOB_URL = "http://cloud.test/job/";
export const jobUrl = (fileName: string) => `${JOB_URL}${fileName}`;
export const testDataPath = (fileName: string) => path.join(TEST_DATA, fileName);
export const readTestData = (fileName: string, encoding: string | null = "utf8") =>
    fs.readFileSync(testDataPath(fileName), encoding ? { encoding } : undefined);

// ------------------------------------------------------------------
// Coot / gemmi modules (once per test file)
// ------------------------------------------------------------------

let cootModule: any = null;

/** Load the real Coot and gemmi WASM modules and Coot's data files. Call in `beforeAll`. */
export async function loadCootModules(): Promise<void> {
    if (cootModule) return;
    // Emscripten mutates the options object, so each module needs its own
    const quiet = () => ({ print: (_text: string) => {}, printErr: (_text: string) => {} });
    cootModule = await createCootModule(quiet());
    const gemmiModule = await createGemmiModule(quiet());
    const g = globalThis as any;
    g.window = g.window ?? {};
    g.window.CCP4Module = cootModule;
    g.window.gemmiModule = gemmiModule;

    cootModule.FS.mkdir("COOT_BACKUP");
    const cootDataZipped = fs.readFileSync(path.join(__dirname, "..", "..", "..", "public", "MoorhenAssets", "data.tar.gz"));
    const cootData = await ungzip(cootDataZipped);
    cootModule.FS.mkdir("data_tmp");
    cootModule.FS_createDataFile("data_tmp", "data.tar", cootData, true, true);
    cootModule.unpackCootDataFile("data_tmp/data.tar", false, "", "");
    cootModule.FS_unlink("data_tmp/data.tar");

    installGlobalMocks();
}

export const getCootModule = () => cootModule;

// ------------------------------------------------------------------
// fetch: serves tests/test_data under JOB_URL (and relative "job/..." URLs), counts calls
// ------------------------------------------------------------------

const fetchCalls: string[] = [];

/** Number of fetches of `url` (exact string as passed to fetch) since the last `resetFetch` */
export const fetchCount = (url: string) => fetchCalls.filter(call => call === url).length;
/** Every URL fetched since the last `resetFetch`, in order */
export const fetchedUrls = () => [...fetchCalls];
export const resetFetch = () => {
    fetchCalls.length = 0;
};

const notFound = () =>
    ({
        ok: false,
        status: 404,
        statusText: "Not Found",
        headers: new Headers(),
        text: async () => "",
        blob: async () => new Blob([]),
        arrayBuffer: async () => new ArrayBuffer(0),
    }) as unknown as Response;

const resolveTestDataFile = (url: string): string | null => {
    let relative: string | null = null;
    if (url.startsWith(JOB_URL)) relative = url.slice(JOB_URL.length);
    else if (url.startsWith("job/")) relative = url.slice("job/".length);
    else if (url.startsWith(TEST_DATA)) relative = path.relative(TEST_DATA, url);
    if (relative === null) return null;
    const filePath = path.join(TEST_DATA, relative.split(/[?#]/)[0]);
    return fs.existsSync(filePath) ? filePath : null;
};

const fakeFetch = async (input: string | URL | Request): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    fetchCalls.push(url);
    const filePath = resolveTestDataFile(url);
    if (!filePath) return notFound();
    const contents: Buffer = fs.readFileSync(filePath);
    const bytes = new Uint8Array(contents);
    return {
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers(),
        text: async () => contents.toString("utf8"),
        blob: async () => new Blob([bytes]),
        arrayBuffer: async () => bytes.slice().buffer,
    } as unknown as Response;
};

class MockFileList {
    files: File[];
    length: number;
    constructor(files: File[] = []) {
        this.files = files;
        this.length = files.length;
        files.forEach((file, index) => ((this as any)[index] = file));
    }
    item(index: number) {
        return this.files[index] ?? null;
    }
    [Symbol.iterator]() {
        return this.files[Symbol.iterator]();
    }
}

function installGlobalMocks() {
    const g = globalThis as any;
    g.fetch = fakeFetch;
    g.DOMParser = class {
        parseFromString() {
            return { getElementsByTagName: () => [] };
        }
    };
    g.FileList = g.FileList ?? MockFileList;
}

// ------------------------------------------------------------------
// Command centre on the real Coot worker code, with history and a command log
// ------------------------------------------------------------------

export type LoggedCommand = { command: string; commandArgs: unknown[]; doJournal: boolean };

/**
 * Stand-in for the worker-backed CommandCentre: runs commands through the real CootWorker code in-process,
 * then journals them in a real History (same order as CommandCentre.cootCommand) and logs every command sent.
 */
export class CloudTestCommandCentre {
    history: History;
    commands: LoggedCommand[] = [];
    activeMessages: unknown[] = [];
    isClosed = false;

    constructor(moleculesContainer: any) {
        this.moleculesContainer = moleculesContainer;
        setModules(moleculesContainer, cootModule);
        this.history = new History(React.createRef());
    }

    /** Commands sent since `mark` (an index from `this.commands.length`) */
    commandsSince(mark: number): string[] {
        return this.commands.slice(mark).map(entry => entry.command);
    }

    async cootCommand(kwargs: any, doJournal: boolean = true) {
        this.commands.push({ command: kwargs.command, commandArgs: kwargs.commandArgs, doJournal });
        // The worker code holds a single module-level container: point it at ours, so two live instances
        // (e.g. a fresh instance restoring a backup) don't run each other's commands
        setModules(this.moleculesContainer, cootModule);
        const data = doCootCommand(kwargs);
        // Journal after running, as CommandCentre.cootCommand does, so automatic backups include this edit
        if (doJournal) {
            await this.history.addEntry(kwargs);
        }
        return { data };
    }

    async cootCommandList(commandList: any[], doJournal: boolean = true) {
        const results = [];
        for (const kwargs of commandList) results.push(await this.cootCommand(kwargs, doJournal));
        return results[results.length - 1];
    }

    /** The worker's non-command messages used by maps and the time capsule */
    async postMessage(kwargs: any) {
        this.commands.push({ command: `message:${kwargs.message}`, commandArgs: [], doJournal: false });
        const reply = (result: unknown) => ({ data: { message: kwargs.message, result } });
        switch (kwargs.message) {
            case "get_mtz_data":
                return reply({ molNo: kwargs.molNo, mtzData: cootModule.FS.readFile(kwargs.fileName, { encoding: "binary" }) });
            case "get_map": {
                const fileName = `./map-${Math.random().toString(36).slice(2)}.map`;
                this.moleculesContainer?.writeCCP4Map(kwargs.molNo, fileName);
                const mapData = cootModule.FS.readFile(fileName, { encoding: "binary" });
                cootModule.FS_unlink(fileName);
                return reply({ molNo: kwargs.molNo, mapData: mapData.buffer });
            }
            case "delete_file_name":
                try {
                    cootModule.FS_unlink(kwargs.fileName);
                } catch {
                    // already gone
                }
                return reply(true);
            default:
                return reply(null);
        }
    }

    moleculesContainer: any = null;

    close() {
        this.isClosed = true;
    }
}

// ------------------------------------------------------------------
// Instance
// ------------------------------------------------------------------

export type CloudInstance = {
    instance: MoorhenInstance;
    store: ReturnType<typeof createMoorhenStore>;
    commandCentre: CloudTestCommandCentre;
    /** Unsubscribes the store listeners and deletes the Coot molecules container, once pending work has settled */
    cleanup: () => Promise<void>;
};

/**
 * A started MoorhenInstance on the real Coot module, with a fresh store, fresh preference storage and
 * preference persistence running (as MainContainer sets it up).
 * @param options.backupStorage - time capsule storage, e.g. `fakeHost.backupStorage`
 * @param options.modificationCountBackupThreshold - modifications before an automatic backup
 */
export async function createCloudInstance(
    options: { backupStorage?: LocalForage; modificationCountBackupThreshold?: number } = {}
): Promise<CloudInstance> {
    const moleculesContainer = new cootModule.molecules_container_js(false);
    moleculesContainer.set_use_gemmi(false);
    const commandCentre = new CloudTestCommandCentre(moleculesContainer);
    commandCentre.moleculesContainer = moleculesContainer;
    const store = createMoorhenStore();

    const instance = new MoorhenInstance(React.createRef<HTMLDivElement>(), null, commandCentre as any);

    // MainContainer keeps these refs in sync with the store; the time capsule reads them
    const moleculesRef = React.createRef<any[]>() as React.MutableRefObject<any[]>;
    const mapsRef = React.createRef<any[]>() as React.MutableRefObject<any[]>;
    const syncRefs = () => {
        moleculesRef.current = store.getState().molecules.moleculeList;
        mapsRef.current = store.getState().maps;
    };
    syncRefs();
    const unsubscribeRefs = store.subscribe(syncRefs);

    await instance.startInstance(store.dispatch, moleculesRef, mapsRef, store, undefined, undefined, {
        providedBackupStorageInstance: options.backupStorage ?? null,
        maxBackupCount: 10,
        modificationCountBackupThreshold: options.modificationCountBackupThreshold ?? 5,
    });
    commandCentre.history.timeCapsule = instance.getTimeCapsuleRef() as any;
    const unsubscribePreferences = instance.initPreferences(store, store.dispatch);
    await waitFor(() => store.getState().generalStates.userPreferencesMounted === true);

    return {
        instance,
        store,
        commandCentre,
        cleanup: async () => {
            unsubscribeRefs();
            unsubscribePreferences();
            // Loading keeps drawing after its promise resolves; let it finish before Coot's container goes
            await flush(200);
            moleculesContainer.delete?.();
        },
    };
}

// ------------------------------------------------------------------
// Fake CCP4 Cloud host
// ------------------------------------------------------------------

export type FakeHost = {
    /** Every object passed to the `preferences.onChange` callback */
    savedPreferences: StoredPreferences[];
    /** Backups stored by the host, by serNo */
    backups: Map<string | number, CloudBackup>;
    /** What getCloudExitData(instance) returned at each exit, as webcoot.js passes it to its exitCallback */
    exitPayloads: CloudExitData[];
    callbacks: {
        save: (backup: CloudBackup) => Promise<void>;
        load: (serNo: string | number) => Promise<CloudBackup | undefined>;
        remove: (serNo: string | number) => Promise<void>;
        list: () => Promise<CloudBackup[]>;
    };
    /** `createCallbackBackupStorage(callbacks)`, to pass to createCloudInstance */
    backupStorage: LocalForage;
    /** Subscribe `savedPreferences` to the instance's preference changes */
    attach: (instance: MoorhenInstance) => () => void;
    /** The reference host's onExit: records the exit payload and returns it */
    onExit: (instance: MoorhenInstance) => Promise<CloudExitData>;
};

export function createFakeHost(): FakeHost {
    const savedPreferences: StoredPreferences[] = [];
    const backups = new Map<string | number, CloudBackup>();
    const exitPayloads: CloudExitData[] = [];
    const callbacks = {
        save: async (backup: CloudBackup) => {
            backups.set(backup.serNo, backup);
        },
        load: async (serNo: string | number) => backups.get(serNo),
        remove: async (serNo: string | number) => {
            backups.delete(serNo);
        },
        list: async () => [...backups.values()],
    };
    return {
        savedPreferences,
        backups,
        exitPayloads,
        callbacks,
        backupStorage: createCallbackBackupStorage(callbacks) as unknown as LocalForage,
        attach: instance => instance.preferences.onChange(stored => savedPreferences.push(stored)),
        onExit: async instance => {
            const payload = await getCloudExitData(instance);
            exitPayloads.push(payload);
            return payload;
        },
    };
}

// ------------------------------------------------------------------
// Utilities
// ------------------------------------------------------------------

/** Poll until `condition()` is true (default 5 s) */
export async function waitFor(condition: () => boolean | Promise<boolean>, timeoutMs = 5000): Promise<void> {
    const start = Date.now();
    while (!(await condition())) {
        if (Date.now() - start > timeoutMs) throw new Error("waitFor timed out");
        await new Promise(resolve => setTimeout(resolve, 10));
    }
}

/** Let pending promise callbacks (e.g. storage writes) run */
export const flush = (ms = 20) => new Promise(resolve => setTimeout(resolve, ms));
