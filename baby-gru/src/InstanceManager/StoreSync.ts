import type { RootState } from "@/store/MoorhenReduxStore";
import { removeVectorsByTag } from "@/store/vectorsSlice";
import { SOURCE_LIGAND_CONTACTS, TAG_MOLECULE, TAG_PARTNER, TAG_SOURCE, matchesTags } from "@/utils/tags";
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

/**
 * Remove the ligand contact vectors whose ligand or partner molecule is not shown: not in
 * visibleMolecules, or deleted.
 */
const removeContactVectorsOfHiddenMolecules = (instance: MoorhenInstance) => {
    const { molecules, vectors } = instance.store.getState();
    // Nothing to remove (the usual case): no need to look at the molecules
    if (!vectors.vectorsList.some(vector => matchesTags(vector, { [TAG_SOURCE]: SOURCE_LIGAND_CONTACTS }))) return;
    const visible = new Set(molecules.visibleMolecules);
    const shownUids = new Set(
        instance
            .getMoleculeList()
            .filter(molecule => visible.has(molecule.molNo))
            .map(molecule => molecule.uniqueId)
    );
    const gone = new Set<string>();
    for (const vector of vectors.vectorsList) {
        if (!matchesTags(vector, { [TAG_SOURCE]: SOURCE_LIGAND_CONTACTS })) continue;
        for (const uid of [vector.tags?.[TAG_MOLECULE], vector.tags?.[TAG_PARTNER]]) {
            if (uid && !shownUids.has(uid)) gone.add(uid);
        }
    }
    for (const uid of gone) {
        instance.store.dispatch(removeVectorsByTag({ [TAG_SOURCE]: SOURCE_LIGAND_CONTACTS, [TAG_MOLECULE]: uid }));
        instance.store.dispatch(removeVectorsByTag({ [TAG_SOURCE]: SOURCE_LIGAND_CONTACTS, [TAG_PARTNER]: uid }));
    }
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
    // However a molecule stops being shown (eye button, scene, delete, script): contacts are drawn
    // between two shown molecules, so one that is not, ligand or partner, takes its contact vectors
    // with it
    sync({
        name: "hidden or deleted molecules lose their ligand contact vectors",
        selector: state => state.molecules.visibleMolecules,
        apply: instance => removeContactVectorsOfHiddenMolecules(instance),
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
