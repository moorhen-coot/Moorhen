import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/store/MoorhenReduxStore";
import type { MoorhenMolecule } from "@/utils/MoorhenMolecule";
import type { MoleculeRecord } from "@/store/moleculesSlice";
import { setHoveredAtom } from "@/store/hoveringStatesSlice";
import { enqueueSnackbar } from "@/store/snackbarSlice";
import { removeVectorsByTag } from "@/store/vectorsSlice";
import { setRequestDrawScene } from "@/store/glRefSlice";
import { setBusy } from "@/store/globalUISlice";
import { SOURCE_LIGAND_CONTACTS, TAG_MOLECULE, TAG_PARTNER, TAG_SOURCE, matchesTags } from "@/utils/tags";
import type { MoorhenInstance } from "./MoorhenInstance";
import { M2T_SURFACE_REPRESENTATIONS } from "@/utils/enums";

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

/** Instances restoring a session: their missing-dictionary warnings wait for the end of it */
const restoringSession = new WeakSet<MoorhenInstance>();

/**
 * Warn about residue types newly without a dictionary, in any molecule of the list: one message for
 * all of them (a batch of a thousand ligands of the same unknown type gives one), each type once per
 * molecule while it stays missing. Molecules not in the list are left out (a multi-model file split
 * into its poses, a file that failed to load): they would warn about what their replacements warn
 * about, or about nothing the user sees.
 */
const warnAboutMissingDictionaries = (instance: MoorhenInstance, records: Record<string, MoleculeRecord>, moleculeList: MoorhenMolecule[]) => {
    if (restoringSession.has(instance)) return;
    let warned = warnedMissingDictionaries.get(instance);
    if (!warned) {
        warned = new Map();
        warnedMissingDictionaries.set(instance, warned);
    }
    const listed = new Set(moleculeList.map(molecule => molecule.uniqueId));
    const types = new Set<string>();
    for (const [uid, record] of Object.entries(records)) {
        if (!listed.has(uid)) continue;
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

/**
 * Run a session restore with its missing-dictionary warnings held until the end: a molecule is
 * checked for missing monomers as soon as it is read, before the restore reads the dictionaries
 * saved for it alone, which would warn about types the session does have. Then warns once about
 * what is still missing.
 */
export const whileRestoringSession = async <T>(instance: MoorhenInstance, restore: () => Promise<T>): Promise<T> => {
    restoringSession.add(instance);
    try {
        return await restore();
    } finally {
        restoringSession.delete(instance);
        // The records queued in the restore's last tick are written in the next one
        await new Promise<void>(resolve => queueMicrotask(resolve));
        const { moleculeRecords, moleculeList } = instance.store.getState().molecules;
        warnAboutMissingDictionaries(instance, moleculeRecords, moleculeList);
    }
};

/** The records and the molecule list, one value while neither changes */
const selectRecordsAndList = createSelector(
    [(state: RootState) => state.molecules.moleculeRecords, (state: RootState) => state.molecules.moleculeList],
    (records, moleculeList) => ({ records, moleculeList })
);

/**
 * Show each ligand pocket (a neighbourhood representation of a model around a ligand that is another
 * molecule, neighboursMoleculeUid) only while both the ligand's molecule and the model are shown, so
 * hiding a ligand hides its pocket and showing it brings the pocket back. A pocket switched off in the
 * interface (interfaceOption.visible false) stays off. One redraw request for all of them.
 */
const showPocketsOfShownLigands = (instance: MoorhenInstance) => {
    const { molecules } = instance.store.getState();
    const visible = new Set(molecules.visibleMolecules);
    const shownUids = new Set(
        instance
            .getMoleculeList()
            .filter(molecule => visible.has(molecule.molNo))
            .map(molecule => molecule.uniqueId)
    );
    let changed = false;
    for (const molecule of instance.getMoleculeList()) {
        for (const representation of molecule.representations) {
            const ligandUid = representation.neighboursMoleculeUid;
            // Pockets around another molecule only: one around a ligand of the model follows the model
            if (!representation.restrictToNeighbours || !ligandUid || ligandUid === molecule.uniqueId) continue;
            const show = shownUids.has(ligandUid) && shownUids.has(molecule.uniqueId) && representation.interfaceOption?.visible !== false;
            if (show === representation.visible) continue;
            if (show) representation.show(false);
            else representation.hide(false);
            changed = true;
        }
    }
    if (changed) instance.store.dispatch(setRequestDrawScene(true));
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
    sync({
        // Every surface on screen drawn again, smooth or M2T as the preference now says; hidden
        // ones are drawn that way when next shown.
        name: "smooth surfaces",
        selector: state => state.generalStates.useSmoothSurface,
        apply: async instance => {
            for (const molecule of instance.getMoleculeList()) {
                for (const representation of molecule.representations) {
                    if (representation.visible && M2T_SURFACE_REPRESENTATIONS.includes(representation.style)) {
                        await representation.redraw();
                    }
                }
            }
        },
    }),
    // The spinner is kept on while a task reports its progress, whatever the worker's queue
    // (MoorhenInstance, onActiveMessagesChanged): once it reports none it follows the queue again,
    // which may have emptied before that (a host clearing globalUI.setJobProgress after its last command)
    sync({
        name: "the busy spinner follows the worker once no task reports its progress",
        selector: state => state.generalStates.jobProgress === null,
        apply: (instance, noProgress) => {
            if (!noProgress) return;
            const busy = (instance.commandCentre?.activeMessages?.length ?? 0) !== 0;
            if (instance.store.getState().globalUI.busy !== busy) instance.store.dispatch(setBusy(busy));
        },
    }),
    // However a molecule stops being shown (eye button, scene, delete, script): contacts are drawn
    // between two shown molecules, so one that is not, ligand or partner, takes its contact vectors
    // with it
    sync({
        name: "a ligand's pocket is shown with the ligand",
        selector: state => state.molecules.visibleMolecules,
        apply: instance => showPocketsOfShownLigands(instance),
    }),
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
        // The list too: a record may be written before its molecule is added to the list
        selector: selectRecordsAndList,
        apply: (instance, { records, moleculeList }) => warnAboutMissingDictionaries(instance, records, moleculeList),
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
