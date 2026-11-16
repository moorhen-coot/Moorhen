import type { Store } from "@reduxjs/toolkit";
import { type MoleculeRecord, setMoleculeRecords } from "@/store/moleculesSlice";

/**
 * Molecule records waiting to be written, per store. Records change for many molecules at once (a
 * batch of a thousand ligands refreshes a thousand), and each dispatch notifies every subscriber, so
 * the records of one tick go to the store in one dispatch.
 */
const pending = new WeakMap<Store, Map<string, MoleculeRecord | null>>();

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
            pending.delete(store);
            const records = [...queue.values()].filter((item): item is MoleculeRecord => item !== null);
            if (records.length > 0) store.dispatch(setMoleculeRecords(records));
        });
    }
    queue.set(uniqueId, record);
};

/** The record queued but not yet written, if any: what the store will hold after this tick. */
export const queuedMoleculeRecord = (store: Store, uniqueId: string): MoleculeRecord | null | undefined => pending.get(store)?.get(uniqueId);
