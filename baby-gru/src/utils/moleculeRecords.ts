import type { Store } from "@reduxjs/toolkit";
import { type MoleculeRecord, setMoleculeRecords } from "@/store/moleculesSlice";

/**
 * Molecule records waiting to be written, per store. Records change for many molecules at once (a
 * batch of a thousand ligands refreshes a thousand), and each dispatch notifies every subscriber, so
 * the records of one tick go to the store in one dispatch.
 */
const pending = new WeakMap<Store, Map<string, MoleculeRecord | null>>();

/** How many tasks hold the records back, per store (see holdMoleculeRecords) */
const held = new WeakMap<Store, number>();

/** Write the queued records now, in one dispatch */
export const flushMoleculeRecords = (store: Store): void => {
    const queue = pending.get(store);
    if (!queue) return;
    pending.delete(store);
    const records = [...queue.values()].filter((item): item is MoleculeRecord => item !== null);
    if (records.length > 0) store.dispatch(setMoleculeRecords(records));
};

/**
 * Keep queued records back past the end of the tick (true), until released (false) or flushed. For a
 * task whose molecules are refreshed one tick each (a batch of ligands parsed one at a time), which
 * would otherwise write one record per dispatch. Pair them (try / finally): the last release writes.
 */
export const holdMoleculeRecords = (store: Store, hold: boolean): void => {
    const count = Math.max(0, (held.get(store) ?? 0) + (hold ? 1 : -1));
    held.set(store, count);
    if (count === 0) flushMoleculeRecords(store);
};

/**
 * Write a molecule record (or, with `null`, drop a pending write for a molecule being deleted), with
 * the others queued in the same tick.
 */
export const queueMoleculeRecord = (store: Store, uniqueId: string, record: MoleculeRecord | null): void => {
    let queue = pending.get(store);
    if (!queue) {
        queue = new Map();
        pending.set(store, queue);
        queueMicrotask(() => {
            // Held: written by the flush or release, with what is queued after it
            if (!held.get(store) && pending.get(store) === queue) flushMoleculeRecords(store);
        });
    }
    queue.set(uniqueId, record);
};

/** The record queued but not yet written, if any: what the store will hold once written. */
export const queuedMoleculeRecord = (store: Store, uniqueId: string): MoleculeRecord | null | undefined => pending.get(store)?.get(uniqueId);
