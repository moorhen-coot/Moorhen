import type { RootState } from "@/store/MoorhenReduxStore";
import type { MoorhenInstance } from "./MoorhenInstance";

/**
 * A store value kept in sync with something outside the store (usually Coot): `apply` runs every time
 * `selector` returns a new value, whoever changed it (UI, preferences imported by a host, scripts...).
 */
type StoreSync<T> = {
    name: string;
    selector: (state: RootState) => T;
    // method syntax, so entries of any value type fit in one StoreSync<unknown>[] table
    apply(instance: MoorhenInstance, value: T): unknown;
};

/** Helper so each entry's value type is inferred from its selector */
const sync = <T>(entry: StoreSync<T>): StoreSync<T> => entry;

/** Store values kept in sync for the lifetime of an instance (mounted by `startInstance`) */
const STORE_SYNCS: StoreSync<unknown>[] = [
    sync({
        name: "map sampling rate",
        selector: state => state.mapContourSettings.defaultMapSamplingRate,
        apply: (instance, rate) =>
            instance.commandCentre?.cootCommand({ command: "set_map_sampling_rate", commandArgs: [rate], returnType: "status" }, false),
    }),
];

/**
 * Start keeping every STORE_SYNCS entry in sync. Values present at start-up are not applied (start-up does that);
 * only later changes are.
 * @returns A function that stops the syncing
 */
export const startStoreSyncs = (instance: MoorhenInstance): (() => void) => {
    const store = instance.store;
    const previous = STORE_SYNCS.map(entry => entry.selector(store.getState()));
    return store.subscribe(() => {
        const state = store.getState();
        STORE_SYNCS.forEach((entry, index) => {
            const value = entry.selector(state);
            if (value === previous[index]) return;
            previous[index] = value;
            Promise.resolve(entry.apply(instance, value)).catch(err => console.error(`Store sync "${entry.name}" failed:`, err));
        });
    });
};
