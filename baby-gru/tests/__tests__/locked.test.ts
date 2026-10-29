/**
 * `locked`: not editable, still deletable.
 *
 * The rule is one sentence - a locked thing is not edited, `locked` itself included - and the
 * two halves worth testing are the ones it would be tempting to get wrong. Deleting a locked
 * object must still work, or an owner that redraws cannot clear what it owns and every redraw
 * leaks a set. And the lock must hold at the reducer, not only in the public API, because the
 * objects dialog dispatches `updateObject` directly; a rule checked at every caller is a rule
 * the next caller misses.
 */
import { configureStore } from "@reduxjs/toolkit";
import threeDObjectsReducer, { updateObject, addObject, ThreeDObject } from "../../src/store/threeDObjectsSlice";
import vectorsReducer from "../../src/store/vectorsSlice";
import { newObjectOfType } from "../../src/utils/threeDObjectFactories";
import { SOURCE_XPID, TAG_SOURCE } from "../../src/utils/tags";

const makeApi = () => {
    const store = configureStore({
        reducer: { threeDObjects: threeDObjectsReducer, vectors: vectorsReducer },
        middleware: getDefault => getDefault({ serializableCheck: false })
    });
    const stub = { store, dispatch: store.dispatch };
    const { MoorhenInstance } = require("../../src/InstanceManager/MoorhenInstance");
    const getterOn = (name: string) => {
        for (let p: object | null = MoorhenInstance.prototype; p; p = Object.getPrototypeOf(p)) {
            const d = Object.getOwnPropertyDescriptor(p, name);
            if (d?.get) return d.get;
        }
        throw new Error(`no getter for ${name}`);
    };
    return {
        store,
        object: getterOn("object").call(stub),
        vectors: getterOn("vectors").call(stub)
    };
};

describe("a locked object", () => {
    test("is not edited", () => {
        const api = makeApi();
        const uid = api.object.create({ type: "sphere", radius: 5, locked: true });
        expect(api.object.edit(uid, { radius: 50 })).toBe(false);
        expect(api.object.get(uid).radius).toBe(5);
    });

    test("cannot be unlocked by editing, since `locked` is not exempt from itself", () => {
        const api = makeApi();
        const uid = api.object.create({ type: "sphere", locked: true });
        expect(api.object.edit(uid, { locked: false })).toBe(false);
        expect(api.object.get(uid).locked).toBe(true);
        // And so the second edit still cannot get through.
        expect(api.object.edit(uid, { radius: 99 })).toBe(false);
    });

    test("IS deletable - otherwise an owner could never clear its own", () => {
        const api = makeApi();
        const uid = api.object.create({ type: "sphere", locked: true });
        expect(api.object.delete(uid)).toBe(true);
        expect(api.object.get(uid)).toBeNull();
    });

    test("and is cleared by tag, which is how a representation disposes of a redraw", () => {
        const api = makeApi();
        api.object.create({ type: "sphere", locked: true, tags: { [TAG_SOURCE]: SOURCE_XPID } });
        api.object.create({ type: "cube", locked: true, tags: { [TAG_SOURCE]: SOURCE_XPID } });
        api.object.create({ type: "torus" });
        expect(api.object.clear({ [TAG_SOURCE]: SOURCE_XPID })).toBe(2);
        expect(api.object.list()).toHaveLength(1);
    });

    test("an unlocked object is unaffected by any of this", () => {
        const api = makeApi();
        const uid = api.object.create({ type: "sphere", radius: 5 });
        expect(api.object.edit(uid, { radius: 50 })).toBe(true);
        expect(api.object.get(uid).radius).toBe(50);
    });
});

describe("the lock holds at the reducer, not just in the API", () => {
    // The objects dialog dispatches updateObject directly, so this is the path that matters.
    const populate = () => {
        const store = configureStore({
            reducer: { threeDObjects: threeDObjectsReducer },
            middleware: getDefault => getDefault({ serializableCheck: false })
        });
        const locked = { ...newObjectOfType("sphere"), radius: 5, locked: true } as ThreeDObject;
        const free = { ...newObjectOfType("sphere"), radius: 5 } as ThreeDObject;
        store.dispatch(addObject(locked));
        store.dispatch(addObject(free));
        return { store, locked, free };
    };

    test("a direct updateObject on a locked object is refused", () => {
        const { store, locked } = populate();
        store.dispatch(updateObject({ ...locked, radius: 999 } as ThreeDObject));
        const after = store.getState().threeDObjects.objects.find(o => o.uniqueId === locked.uniqueId);
        expect((after as { radius: number }).radius).toBe(5);
    });

    test("a direct updateObject on an unlocked object still works", () => {
        const { store, free } = populate();
        store.dispatch(updateObject({ ...free, radius: 999 } as ThreeDObject));
        const after = store.getState().threeDObjects.objects.find(o => o.uniqueId === free.uniqueId);
        expect((after as { radius: number }).radius).toBe(999);
    });

    test("and a direct updateObject cannot clear the lock either", () => {
        const { store, locked } = populate();
        store.dispatch(updateObject({ ...locked, locked: false } as ThreeDObject));
        const after = store.getState().threeDObjects.objects.find(o => o.uniqueId === locked.uniqueId);
        expect(after!.locked).toBe(true);
    });
});

describe("a locked vector", () => {
    test("is not edited, but is deletable", () => {
        const api = makeApi();
        const uid = api.vectors.create({ labelText: "owned", locked: true });
        expect(api.vectors.edit(uid, { labelText: "changed" })).toBe(false);
        expect(api.vectors.get(uid).labelText).toBe("owned");
        expect(api.vectors.delete(uid)).toBe(true);
        expect(api.vectors.get(uid)).toBeNull();
    });

    test("cannot be unlocked by editing", () => {
        const api = makeApi();
        const uid = api.vectors.create({ locked: true });
        expect(api.vectors.edit(uid, { locked: false })).toBe(false);
        expect(api.vectors.get(uid).locked).toBe(true);
    });

    test("and clear by tag takes locked ones too", () => {
        const api = makeApi();
        api.vectors.create({ locked: true, tags: { [TAG_SOURCE]: "nef" } });
        api.vectors.create({ locked: true, tags: { [TAG_SOURCE]: "nef" } });
        expect(api.vectors.clear({ [TAG_SOURCE]: "nef" })).toBe(2);
        expect(api.vectors.list()).toHaveLength(0);
    });
});

describe("the handles", () => {
    test("gizmoDraw returns nothing for a locked object", () => {
        const source = require("fs").readFileSync(
            require("path").resolve(__dirname, "../../src/WebGLgComponents/gizmoDraw.ts"),
            "utf8"
        );
        // A source check rather than a render: drawing needs a GL context. What is asserted is
        // that the guard sits after the object is found and returns the empty list.
        const afterFind = source.slice(source.indexOf("objects.find(item => item.uniqueId === selectedId)"));
        expect(afterFind.slice(0, 600)).toMatch(/object\.locked[\s\S]{0,80}return \[\]/);
    });

    test("and DragHandles refuses both the start and the move", () => {
        const source = require("fs").readFileSync(
            require("path").resolve(__dirname, "../../src/components/webMG/DragHandles.tsx"),
            "utf8"
        );
        // Two guards, because a drag already in progress would otherwise be honoured to its end.
        const guards = source.match(/!object \|\| object\.locked/g) ?? [];
        expect(guards).toHaveLength(2);
    });
});
