import type { RootState } from "@/store/MoorhenReduxStore";
import type { MoleculeRecord } from "@/store/moleculesSlice";
import { setHoveredAtom } from "@/store/hoveringStatesSlice";
import { enqueueSnackbar } from "@/store/snackbarSlice";
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

/** The residue types each molecule (by uid) has been warned about having no dictionary, per instance */
const warnedMissingDictionaries = new WeakMap<MoorhenInstance, Map<string, Set<string>>>();

/**
 * Warn about residue types newly without a dictionary, in any molecule: one message for all of
 * them (a batch of a thousand ligands of the same unknown type gives one), each type once per
 * molecule while it stays missing.
 */
const warnAboutMissingDictionaries = (instance: MoorhenInstance, records: Record<string, MoleculeRecord>) => {
    let warned = warnedMissingDictionaries.get(instance);
    if (!warned) {
        warned = new Map();
        warnedMissingDictionaries.set(instance, warned);
    }
    const types = new Set<string>();
    for (const [uid, record] of Object.entries(records)) {
        const before = warned.get(uid);
        record.missingDictionaries.filter(type => !before?.has(type)).forEach(type => types.add(type));
        warned.set(uid, new Set(record.missingDictionaries));
    }
    for (const uid of warned.keys()) if (!(uid in records)) warned.delete(uid);
    if (types.size === 0) return;
    instance.store.dispatch(
        enqueueSnackbar({
            message: `Monomers (${[...types].sort().join(", ")}) have no dictionary description. Some atoms/bonds may be drawn oddly.`,
            variant: "warning",
        })
    );
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
    // A hovered atom of a molecule no longer in the list is not hovered any more: else middle-click,
    // hover shortcuts and the hover box keep using a molecule being deleted (its gemmi structure
    // freed). Removed from a ligand row's popover, for one, the row never gets its mouse leave.
    // Applied as the molecule leaves the list, before it is deleted.
    sync({
        name: "a removed molecule is not hovered",
        selector: state => state.molecules.moleculeList,
        apply: (instance, moleculeList) => {
            const hovered = instance.store.getState().hoveringStates.hoveredAtom.molecule;
            if (hovered && !moleculeList.includes(hovered)) {
                instance.store.dispatch(setHoveredAtom({ molecule: null, cid: null, atomInfo: null }));
            }
        },
    }),
    // Records are refreshed when a molecule's atoms change or it gets a dictionary: warned about
    // there, not after every draw of every representation (which asked Coot each time)
    sync({
        name: "warn about residue types with no dictionary",
        selector: state => state.molecules.moleculeRecords,
        apply: (instance, records) => warnAboutMissingDictionaries(instance, records),
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
