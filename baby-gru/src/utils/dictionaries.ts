import type { Store } from "@reduxjs/toolkit";
import type { CommandCentre } from "@/InstanceManager/CommandCentre";
import { type LoadedDictionary, addDictionaries } from "@/store/dictionariesSlice";

/**
 * Dictionaries read but not yet recorded, per store: those read in one tick (a batch of a thousand
 * ligands, each with its dictionary) go to the store in one dispatch, as each dispatch runs every
 * selector and, in development, walks the whole store.
 */
const pending = new WeakMap<Store, LoadedDictionary[]>();

/** How many tasks hold the records back, per store (see holdDictionaryRecords) */
const held = new WeakMap<Store, number>();

/** Record the queued dictionaries now, in one dispatch */
export const flushDictionaryRecords = (store: Store): void => {
    const queue = pending.get(store);
    if (!queue) return;
    pending.delete(store);
    store.dispatch(addDictionaries(queue));
};

/**
 * Keep queued dictionaries back past the end of the tick (true), until released (false) or flushed.
 * For a task reading many, each in its own tick (a batch of ligands of many types). Pair them
 * (try / finally): the last release records them.
 */
export const holdDictionaryRecords = (store: Store, hold: boolean): void => {
    const count = Math.max(0, (held.get(store) ?? 0) + (hold ? 1 : -1));
    held.set(store, count);
    if (count === 0) flushDictionaryRecords(store);
};

const recordDictionaries = (store: Store, dictionaries: LoadedDictionary[]) => {
    let queue = pending.get(store);
    if (!queue) {
        queue = [];
        pending.set(store, queue);
        queueMicrotask(() => {
            if (!held.get(store) && pending.get(store) === queue) flushDictionaryRecords(store);
        });
    }
    queue.push(...dictionaries);
};

/** Coot's "every molecule" molecule number */
export const ALL_MOLECULES = -999999;

/**
 * Split dictionary text into its data_comp_ blocks: [comp_id, block]. The data_comp_list block (the
 * list of what the file defines) is not a compound of its own: it stays at the start of the first one.
 */
export const splitDictionary = (text: string): [string, string][] => {
    const blocks: [string, string][] = [];
    let compId = "list";
    let lines: string[] = [];
    const rx1 = /data_comp_(.*)/;
    const rx2 = /data_(.*)/;
    for (const line of text.split("\n")) {
        const trimmed = line.trim();
        const match = rx1.exec(trimmed) ?? rx2.exec(trimmed);
        if (match !== null) {
            // What comes before the first compound (the global_ header, the data_comp_list block) stays
            // at the start of the first one's text, as molecule.ligandDicts has always held it
            if (compId !== "list") {
                blocks.push([compId, lines.join("\n")]);
                lines = [];
            }
            compId = match[1];
        }
        lines.push(trimmed);
    }
    if (compId !== "list") blocks.push([compId, lines.join("\n")]);
    return blocks;
};

/**
 * Read a ligand dictionary into Coot, for every molecule or for one, and record it in the instance's
 * list of loaded dictionaries (store `dictionaries`), which sessions save. Every path that loads a
 * dictionary goes through here (.roadmaps/ligand-dictionaries.md, phase 3), so the list is complete
 * whatever loaded it and whichever molecules are deleted later. Recorded at the end of the tick, with
 * the other dictionaries read in it (one dispatch). Caching on molecules
 * (molecule.ligandDicts) is still the caller's, as before.
 * @param molecule - The molecule to read it for; every molecule if omitted
 * @param source - Where it came from, for display
 */
export const readDictionary = async (
    target: { store: Store; commandCentre: CommandCentre },
    text: string,
    molecule?: { molNo: number; uniqueId?: string } | null,
    source?: string
): Promise<void> => {
    if (!text) return;
    await target.commandCentre.cootCommand(
        {
            returnType: "status",
            command: "read_dictionary_string",
            commandArgs: [text, molecule ? molecule.molNo : ALL_MOLECULES],
            changesMolecules: [],
        },
        false
    );
    const blocks = splitDictionary(text);
    // A molecule Moorhen does not know (only its Coot number): read for it, as asked, but not
    // recorded, as no molecule would save it
    if (blocks.length === 0 || (molecule && !molecule.uniqueId)) return;
    recordDictionaries(
        target.store,
        blocks.map(([compId, content]) => ({ compId, content, moleculeUid: molecule?.uniqueId ?? null, source }))
    );
    // Read for every molecule: those whose records list one of its types as missing ask Coot again
    // (the one it was read for, if any, does so itself)
    if (!molecule) {
        const compIds = new Set(blocks.map(([compId]) => compId));
        const { moleculeList, moleculeRecords } = target.store.getState().molecules;
        for (const other of moleculeList) {
            if (moleculeRecords[other.uniqueId]?.missingDictionaries.some(type => compIds.has(type))) {
                void other.refreshMissingDictionaries();
            }
        }
    }
};
