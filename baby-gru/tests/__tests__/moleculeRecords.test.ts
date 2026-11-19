/**
 * Molecule records (molecules.moleculeRecords): the plain facts the Models and Ligands panels group
 * and label molecules by, written by each molecule through a queue that coalesces the records of one
 * tick into one dispatch (a batch of a thousand ligands refreshes a thousand records).
 */
import { configureStore } from "@reduxjs/toolkit";
import moleculesReducer, { type MoleculeRecord, removeMolecule, removeMoleculeRecord } from "../../src/store/moleculesSlice";
import { queueMoleculeRecord, queuedMoleculeRecord } from "../../src/utils/moleculeRecords";

const record = (uniqueId: string, isLigandOnly = true): MoleculeRecord => ({
    uniqueId,
    isLigandOnly,
    ligands: [{ resName: "ATP", chainName: "A", resNum: "1", modelName: "1", cid: "/1/A/1(ATP)" }],
    missingDictionaries: [],
});

const makeStore = () => {
    const store = configureStore({
        reducer: { molecules: moleculesReducer },
        middleware: getDefault => getDefault({ serializableCheck: false, immutableCheck: false }),
    });
    const dispatched: unknown[] = [];
    const dispatch = store.dispatch;
    store.dispatch = ((action: unknown) => {
        dispatched.push(action);
        return dispatch(action as Parameters<typeof dispatch>[0]);
    }) as typeof store.dispatch;
    return { store, dispatched };
};

const tick = () => new Promise<void>(resolve => queueMicrotask(resolve));

describe("molecule records", () => {
    test("the records queued in one tick are written in one dispatch", async () => {
        const { store, dispatched } = makeStore();
        for (let i = 0; i < 1000; i++) queueMoleculeRecord(store, `mol-${i}`, record(`mol-${i}`));
        expect(queuedMoleculeRecord(store, "mol-5")).toEqual(record("mol-5"));
        expect(dispatched).toHaveLength(0);
        await tick();
        expect(dispatched).toHaveLength(1);
        expect(Object.keys(store.getState().molecules.moleculeRecords)).toHaveLength(1000);
        expect(queuedMoleculeRecord(store, "mol-5")).toBeUndefined();
    });

    test("the last record queued for a molecule wins", async () => {
        const { store } = makeStore();
        queueMoleculeRecord(store, "a", record("a", true));
        queueMoleculeRecord(store, "a", record("a", false));
        await tick();
        expect(store.getState().molecules.moleculeRecords.a.isLigandOnly).toBe(false);
    });

    test("a molecule deleted in the tick is not written back", async () => {
        const { store } = makeStore();
        queueMoleculeRecord(store, "kept", record("kept"));
        queueMoleculeRecord(store, "deleted", record("deleted"));
        queueMoleculeRecord(store, "deleted", null);
        await tick();
        expect(Object.keys(store.getState().molecules.moleculeRecords)).toEqual(["kept"]);
    });

    test("removing a molecule or its record drops the record", async () => {
        const { store } = makeStore();
        queueMoleculeRecord(store, "a", record("a"));
        queueMoleculeRecord(store, "b", record("b"));
        await tick();
        store.dispatch(removeMoleculeRecord("a"));
        // removeMolecule matches the molecule by molNo for its other lists and by uniqueId for its record
        store.dispatch(removeMolecule({ molNo: 7, uniqueId: "b" } as unknown as Parameters<typeof removeMolecule>[0]));
        expect(store.getState().molecules.moleculeRecords).toEqual({});
    });
});
