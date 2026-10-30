/*
 * CCP4 Cloud host contract, PRF: preferences exchanged through instance.preferences (import / export / onChange).
 * The stored shape is { format: "moorhen-1.0", entries: { [label]: { version, value } } }.
 * IDs refer to MoorhenWrapper's CLOUD_HOST_TEST_SPEC.md.
 */
import { ALL_PREFERENCES, type PreferenceEntry } from "@/InstanceManager/Preferences/PreferencesList";
import type { StoredPreferences } from "@/InstanceManager/MoorhenInstance";
import {
    createCloudInstance,
    createFakeHost,
    flush,
    loadCootModules,
    readTestData,
    resetFetch,
    waitFor,
    type CloudInstance,
} from "./cloudHostHarness";

jest.setTimeout(60000);

let cloud: CloudInstance;
const extraInstances: CloudInstance[] = [];

beforeAll(loadCootModules);

beforeEach(async () => {
    resetFetch();
    cloud = await createCloudInstance();
});

afterEach(async () => {
    await cloud.cleanup();
    while (extraInstances.length > 0) await extraInstances.pop()!.cleanup();
});

// ------------------------------------------------------------------
// Local helpers
// ------------------------------------------------------------------

const readFixture = (fileName: string) => JSON.parse(readTestData(`cloudJob/${fileName}`));
const moorhen10 = (): StoredPreferences => readFixture("preferences.moorhen-1.0.json");
const v41 = () => readFixture("preferences.v41.json");

const pref = (label: string): PreferenceEntry => {
    const entry = ALL_PREFERENCES.find(candidate => candidate.label === label);
    if (!entry) throw new Error(`No preference ${label}`);
    return entry;
};

/** The store value of a preference */
const valueOf = (c: CloudInstance, label: string) => pref(label).selector(c.store.getState());
/** The default as the store holds it (shortCuts are kept as a JSON string) */
const defaultOf = (label: string) => (label === "shortCuts" ? JSON.stringify(pref(label).defaultValue) : pref(label).defaultValue);
const setValue = (c: CloudInstance, label: string, value: unknown) => c.store.dispatch(pref(label).valueSetter(value) as any);

/** Everything in the instance's preference storage, by label */
const storageContents = async (c: CloudInstance) => {
    const contents: Record<string, unknown> = {};
    await c.instance.getPreferences().localStorageInstance.iterate((value: unknown, key: string) => {
        contents[key] = value;
    });
    return contents;
};
const storedEntry = async (c: CloudInstance, label: string) => c.instance.getPreferences().localStorageInstance.getItem(label);

/** Change a preference in the store and wait until the change is in storage */
const changeAndPersist = async (c: CloudInstance, label: string, value: unknown) => {
    setValue(c, label, value);
    await waitFor(async () => JSON.stringify((await storedEntry(c, label) as any)?.value) === JSON.stringify(value));
};

/** Every preference's store value, for whole-store comparisons */
const allValues = (c: CloudInstance) =>
    Object.fromEntries(ALL_PREFERENCES.filter(entry => entry.selector).map(entry => [entry.label, entry.selector(c.store.getState())]));

const newInstance = async () => {
    const other = await createCloudInstance();
    extraInstances.push(other);
    return other;
};

// ------------------------------------------------------------------

describe("PRF: preferences", () => {
    test("PRF-01 import after start-up sets the store values immediately", async () => {
        const fixture = moorhen10();
        await cloud.instance.preferences.import(fixture);
        expect(valueOf(cloud, "defaultMapSamplingRate")).toBe(2.5);
        expect(valueOf(cloud, "Overview.backgroundColor")).toEqual([0.1, 0.1, 0.1, 1]);
        expect(valueOf(cloud, "shortCuts")).toBe(fixture.entries.shortCuts.value);
        expect(JSON.parse(valueOf(cloud, "shortCuts") as string).show_shortcuts.keyPress).toBe("j");
    });

    test("PRF-02 after import the preference storage contains exactly the imported entries", async () => {
        const fixture = moorhen10();
        await changeAndPersist(cloud, "defaultBondSmoothness", 3);
        await cloud.instance.preferences.import(fixture);
        await flush();
        expect(await storageContents(cloud)).toEqual(fixture.entries);
    });

    test("PRF-03 an entry older than the preference's version is reset to the default and removed", async () => {
        expect(pref("defaultBondSmoothness").version).toBe(2);
        await cloud.instance.preferences.import({
            format: "moorhen-1.0",
            entries: { defaultBondSmoothness: { version: 1, value: 3 } },
        });
        expect(valueOf(cloud, "defaultBondSmoothness")).toBe(defaultOf("defaultBondSmoothness"));
        // restore removes stale entries without awaiting the removal
        await waitFor(async () => (await storedEntry(cloud, "defaultBondSmoothness")) === null);
        expect(await storageContents(cloud)).toEqual({});
    });

    test("PRF-04 a preference with no entry in the import returns to its default", async () => {
        await changeAndPersist(cloud, "defaultBondSmoothness", 3);
        expect(valueOf(cloud, "defaultBondSmoothness")).toBe(3);
        await cloud.instance.preferences.import(moorhen10());
        expect(valueOf(cloud, "defaultBondSmoothness")).toBe(defaultOf("defaultBondSmoothness"));
        await flush();
        expect(await storedEntry(cloud, "defaultBondSmoothness")).toBeNull();
    });

    test("PRF-05 an old flat v41 object is ignored: store and storage unchanged", async () => {
        await changeAndPersist(cloud, "defaultBondSmoothness", 1);
        const valuesBefore = allValues(cloud);
        const storageBefore = await storageContents(cloud);
        await cloud.instance.preferences.import(v41());
        await flush();
        expect(allValues(cloud)).toEqual(valuesBefore);
        expect(await storageContents(cloud)).toEqual(storageBefore);
        expect(valueOf(cloud, "defaultMapSamplingRate")).toBe(defaultOf("defaultMapSamplingRate"));
    });

    // Documented behaviour: import returns early for anything that is not { format: "moorhen-1.0", entries: object },
    // so none of these inputs clears the storage: what was stored before is kept, and the store is untouched.
    test("PRF-06 null, undefined, a string or a moorhen-1.0 object without entries: no throw, nothing imported, storage NOT cleared", async () => {
        await changeAndPersist(cloud, "defaultBondSmoothness", 3);
        const valuesBefore = allValues(cloud);
        const storageBefore = await storageContents(cloud);
        expect(storageBefore).toEqual({ defaultBondSmoothness: { version: 2, value: 3 } });
        for (const input of [null, undefined, "x", { format: "moorhen-1.0" }]) {
            await expect(cloud.instance.preferences.import(input)).resolves.toBeUndefined();
            await flush();
            expect(allValues(cloud)).toEqual(valuesBefore);
            expect(await storageContents(cloud)).toEqual(storageBefore);
        }
    });

    test("PRF-07 import does not fire onChange", async () => {
        const host = createFakeHost();
        host.attach(cloud.instance);
        await cloud.instance.preferences.import(moorhen10());
        await flush(100);
        // Also an import that resets an existing deviation and removes a stale entry
        await changeAndPersist(cloud, "defaultBondSmoothness", 3);
        await flush();
        host.savedPreferences.length = 0;
        await cloud.instance.preferences.import({ format: "moorhen-1.0", entries: { "defaultBondSmoothness": { version: 0, value: 1 } } });
        await flush(100);
        expect(host.savedPreferences).toHaveLength(0);
    });

    test("PRF-08 a store change fires onChange once with the new { version, value }", async () => {
        const host = createFakeHost();
        host.attach(cloud.instance);
        setValue(cloud, "defaultMapSamplingRate", 3.0);
        await waitFor(() => host.savedPreferences.length > 0);
        await flush(100);
        expect(host.savedPreferences).toHaveLength(1);
        expect(host.savedPreferences[0].format).toBe("moorhen-1.0");
        expect(host.savedPreferences[0].entries.defaultMapSamplingRate).toEqual({ version: 1, value: 3.0 });
    });

    test("PRF-09 regression: setting a preference back to its default fires onChange without that label", async () => {
        const host = createFakeHost();
        host.attach(cloud.instance);
        setValue(cloud, "defaultMapSamplingRate", 3.0);
        await waitFor(() => host.savedPreferences.length === 1);
        expect(host.savedPreferences[0].entries).toHaveProperty("defaultMapSamplingRate");
        setValue(cloud, "defaultMapSamplingRate", defaultOf("defaultMapSamplingRate"));
        await waitFor(() => host.savedPreferences.length === 2);
        expect(host.savedPreferences[1].entries).not.toHaveProperty("defaultMapSamplingRate");
    });

    test("PRF-10 export() inside the onChange callback returns the already-updated value", async () => {
        const exported: StoredPreferences[] = [];
        cloud.instance.preferences.onChange(() => {
            cloud.instance.preferences.export().then(stored => exported.push(stored));
        });
        setValue(cloud, "defaultMapSamplingRate", 3.5);
        await waitFor(() => exported.length > 0);
        expect(exported[0].entries.defaultMapSamplingRate).toEqual({ version: 1, value: 3.5 });
    });

    test("PRF-11 export() with nothing changed is an empty moorhen-1.0 object", async () => {
        expect(await cloud.instance.preferences.export()).toEqual({ format: "moorhen-1.0", entries: {} });
    });

    test("PRF-12 round trip: change several, export, import into a new instance gives identical store values", async () => {
        await changeAndPersist(cloud, "defaultMapSamplingRate", 3.0);
        await changeAndPersist(cloud, "Overview.backgroundColor", [0.2, 0.3, 0.4, 1]);
        await changeAndPersist(cloud, "defaultBondSmoothness", 3);
        const exported = await cloud.instance.preferences.export();
        expect(Object.keys(exported.entries).sort()).toEqual(["Overview.backgroundColor", "defaultBondSmoothness", "defaultMapSamplingRate"]);

        const other = await newInstance();
        expect(allValues(other)).not.toEqual(allValues(cloud));
        await other.instance.preferences.import(JSON.parse(JSON.stringify(exported)));
        expect(allValues(other)).toEqual(allValues(cloud));
    });

    test("PRF-13 shortCuts survive the round trip as the JSON string the store uses", async () => {
        const shortCuts = JSON.parse(defaultOf("shortCuts") as string);
        shortCuts.show_shortcuts.keyPress = "j";
        const shortCutsString = JSON.stringify(shortCuts);
        await changeAndPersist(cloud, "shortCuts", shortCutsString);
        const exported = await cloud.instance.preferences.export();
        expect(exported.entries.shortCuts.value).toBe(shortCutsString);

        const other = await newInstance();
        await other.instance.preferences.import(JSON.parse(JSON.stringify(exported)));
        expect(valueOf(other, "shortCuts")).toBe(shortCutsString);
        expect(typeof valueOf(other, "shortCuts")).toBe("string");
        expect(JSON.parse(valueOf(other, "shortCuts") as string).show_shortcuts.keyPress).toBe("j");
    });

    test("PRF-14 after unsubscribing, onChange is not called again", async () => {
        const callback = jest.fn();
        const unsubscribe = cloud.instance.preferences.onChange(callback);
        setValue(cloud, "defaultMapSamplingRate", 3.0);
        await waitFor(() => callback.mock.calls.length === 1);
        unsubscribe();
        setValue(cloud, "defaultMapSamplingRate", 3.5);
        await waitFor(async () => ((await storedEntry(cloud, "defaultMapSamplingRate")) as any)?.value === 3.5);
        await flush(100);
        expect(callback).toHaveBeenCalledTimes(1);
    });

    test("PRF-15 an imported defaultMapSamplingRate is sent to Coot with set_map_sampling_rate", async () => {
        const mark = cloud.commandCentre.commands.length;
        await cloud.instance.preferences.import(moorhen10());
        await flush(100);
        const sent = cloud.commandCentre.commands.slice(mark).filter(entry => entry.command === "set_map_sampling_rate");
        expect(sent.length).toBeGreaterThan(0);
        expect(sent[sent.length - 1].commandArgs).toEqual([2.5]);
    });

    test("PRF-16 (extra) an imported background colour of the shown scene recolours the current view", async () => {
        // Not a spec row: preferences imported after start-up must reach the view, as PRF-15 does for Coot
        const stored = moorhen10();
        await cloud.instance.preferences.import(stored);
        const imported = stored.entries["Overview.backgroundColor"].value;
        expect(cloud.store.getState().userScenes.selectedScene).toBe("Overview");
        expect(cloud.store.getState().userScenes.savedSceneSettings.Overview.backgroundColor).toEqual(imported);
        expect(cloud.store.getState().sceneSettings.backgroundColor).toEqual(imported);
    });

    test("PRF-17 (extra) an import while the start-up restore is still running wins, and fires no onChange", async () => {
        // Not a spec row: a host imports as soon as it has the instance, possibly while preferences are still
        // being restored. Start a fresh restore and import without waiting for it.
        const onChange = jest.fn();
        cloud.instance.preferences.onChange(onChange);
        const unsubscribe = cloud.instance.initPreferences(cloud.store, cloud.store.dispatch);
        const stored = moorhen10();
        await cloud.instance.preferences.import(stored);
        await new Promise(resolve => setTimeout(resolve, 50));
        expect(cloud.store.getState().mapContourSettings.defaultMapSamplingRate).toBe(stored.entries.defaultMapSamplingRate.value);
        expect(await cloud.instance.preferences.export()).toEqual(stored);
        expect(onChange).not.toHaveBeenCalled();
        unsubscribe();
    });
});
