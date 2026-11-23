/**
 * The curated vectors namespace, and tag filtering on both namespaces.
 *
 * `instance.vectors` is generated from the `// API` markers by scripts/CreateStoreExport.py, so
 * the curated version overrides the getter and spreads `super.vectors` rather than taking a name
 * of its own. The thing most worth testing is therefore that the override did not eat anything:
 * every generated method must still be reachable, or this is a breaking change dressed up as an
 * addition.
 *
 * The rest is the behaviour the two namespaces are supposed to share, so that `object` and
 * `vectors` read alike: defaults filled in, a handle returned, a uniqueId passed in ignored,
 * edit merging rather than replacing, and clear-by-tag.
 */
import { configureStore } from "@reduxjs/toolkit";
import threeDObjectsReducer from "../../src/store/threeDObjectsSlice";
import vectorsReducer, { MoorhenVector } from "../../src/store/vectorsSlice";
import { newVector } from "../../src/utils/vectorFactories";
import { SOURCE_XPID, TAG_MOLECULE, TAG_SOURCE } from "../../src/utils/tags";

/**
 * The real getters, called on a stub carrying a store and a dispatch. Walking the prototype
 * chain because `vectors` is now defined on MoorhenInstance while the generated one it spreads
 * lives on StoreExtension - which is the arrangement under test.
 */
const makeApi = () => {
    const store = configureStore({
        reducer: { vectors: vectorsReducer, threeDObjects: threeDObjectsReducer },
        middleware: getDefault => getDefault({ serializableCheck: false })
    });
    const stub = { store, dispatch: store.dispatch };
    const { MoorhenInstance } = require("../../src/InstanceManager/MoorhenInstance");
    const { StoreExtension } = require("../../src/InstanceManager/StoreExtension");

    const getterOn = (proto: object, name: string) => {
        for (let p: object | null = proto; p; p = Object.getPrototypeOf(p)) {
            const d = Object.getOwnPropertyDescriptor(p, name);
            if (d?.get) return d.get;
        }
        throw new Error(`no getter for ${name}`);
    };

    return {
        store,
        vectors: getterOn(MoorhenInstance.prototype, "vectors").call(stub),
        object: getterOn(MoorhenInstance.prototype, "object").call(stub),
        generatedNames: Object.keys(getterOn(StoreExtension.prototype, "vectors").call(stub))
    };
};

describe("the override keeps everything the generated namespace had", () => {
    test("every generated method is still reachable", () => {
        const { vectors, generatedNames } = makeApi();
        expect(generatedNames.length).toBeGreaterThan(5);
        for (const name of generatedNames) {
            expect(typeof vectors[name]).toBe("function");
        }
    });

    test("and the curated methods are there alongside them", () => {
        const { vectors, generatedNames } = makeApi();
        for (const name of ["get", "list", "create", "edit", "delete", "clear"]) {
            expect(typeof vectors[name]).toBe("function");
            // None of the additions may shadow a generated method.
            expect(generatedNames).not.toContain(name);
        }
    });

    test("a generated method still reaches the store through the override", () => {
        const { vectors, store } = makeApi();
        vectors.addVector(newVector({ uniqueId: "added-the-old-way" }));
        expect(store.getState().vectors.vectorsList.map(v => v.uniqueId)).toEqual(["added-the-old-way"]);
    });
});

describe("vectors.create", () => {
    test("returns a handle that get finds, with defaults filled in", () => {
        const { vectors } = makeApi();
        const uid = vectors.create({ xTo: 10 });
        expect(typeof uid).toBe("string");
        const v = vectors.get(uid) as MoorhenVector;
        expect(v.xTo).toBe(10);
        // Untouched fields come from the shared factory, not from nowhere.
        expect(v.coordsMode).toBe(newVector().coordsMode);
        expect(v.radius).toBe(newVector().radius);
    });

    test("takes no arguments at all", () => {
        const { vectors } = makeApi();
        expect(typeof vectors.create()).toBe("string");
    });

    test("ignores a uniqueId passed in, so two identical calls make two vectors", () => {
        const { vectors } = makeApi();
        const first = vectors.create({ uniqueId: "pick-me" } as never);
        const second = vectors.create({ uniqueId: "pick-me" } as never);
        expect(first).not.toBe("pick-me");
        expect(first).not.toBe(second);
        expect(vectors.list()).toHaveLength(2);
    });

    test("compile-time: a field a vector does not have is rejected", () => {
        const { vectors } = makeApi();
        // @ts-expect-error
        vectors.create({ radius: 2, notAVectorField: true });
        // ...including when it arrives in a variable rather than a literal.
        const viaVariable = { radius: 2, notAVectorField: true };
        // @ts-expect-error
        vectors.create(viaVariable);
        // A real field is fine either way.
        const valid = { radius: 2, labelText: "ok" };
        expect(typeof vectors.create(valid)).toBe("string");
    });
});

describe("vectors.edit", () => {
    test("changes the named field, keeps the others, keeps the id", () => {
        const { vectors } = makeApi();
        const uid = vectors.create({ xTo: 10, labelText: "before", radius: 0.2 });
        expect(vectors.edit(uid, { labelText: "after" })).toBe(true);
        const v = vectors.get(uid) as MoorhenVector;
        expect(v.labelText).toBe("after");
        expect(v.xTo).toBe(10);
        expect(v.radius).toBe(0.2);
        expect(v.uniqueId).toBe(uid);
    });

    test("does not change the uniqueId even if asked", () => {
        const { vectors } = makeApi();
        const uid = vectors.create({});
        vectors.edit(uid, { uniqueId: "something-else" } as never);
        expect(vectors.get(uid)).not.toBeNull();
        expect(vectors.get("something-else")).toBeNull();
    });

    test("editing does not duplicate the vector", () => {
        // It is implemented as a remove and re-add, there being no update reducer for vectors.
        const { vectors } = makeApi();
        const uid = vectors.create({});
        vectors.edit(uid, { labelText: "x" });
        expect(vectors.list()).toHaveLength(1);
    });

    test("reports a miss rather than throwing", () => {
        const { vectors } = makeApi();
        expect(vectors.edit("no-such-vector", { labelText: "x" })).toBe(false);
        expect(vectors.delete("no-such-vector")).toBe(false);
    });
});

describe("tag filtering, on both namespaces", () => {
    const populate = (api: ReturnType<typeof makeApi>) => {
        api.vectors.create({ tags: { [TAG_SOURCE]: SOURCE_XPID, [TAG_MOLECULE]: "mol-1" } });
        api.vectors.create({ tags: { [TAG_SOURCE]: SOURCE_XPID, [TAG_MOLECULE]: "mol-2" } });
        api.vectors.create({ tags: { [TAG_SOURCE]: "myApp" } });
        api.vectors.create({});
        api.object.create({ type: "sphere", tags: { [TAG_SOURCE]: "myApp" } });
        api.object.create({ type: "cube", tags: { [TAG_SOURCE]: SOURCE_XPID } });
        api.object.create({ type: "torus" });
    };

    test("list narrows by tag, and without a filter returns everything", () => {
        const api = makeApi();
        populate(api);
        expect(api.vectors.list()).toHaveLength(4);
        expect(api.vectors.list({ [TAG_SOURCE]: SOURCE_XPID })).toHaveLength(2);
        expect(api.vectors.list({ [TAG_SOURCE]: SOURCE_XPID, [TAG_MOLECULE]: "mol-1" })).toHaveLength(1);
        expect(api.object.list()).toHaveLength(3);
        expect(api.object.list({ [TAG_SOURCE]: "myApp" })).toHaveLength(1);
    });

    test("clear by tag removes that group and nothing else", () => {
        const api = makeApi();
        populate(api);
        expect(api.vectors.clear({ [TAG_SOURCE]: SOURCE_XPID })).toBe(2);
        expect(api.vectors.list()).toHaveLength(2);
        expect(api.object.clear({ [TAG_SOURCE]: "myApp" })).toBe(1);
        expect(api.object.list()).toHaveLength(2);
    });

    test("clear with no argument means all of them", () => {
        const api = makeApi();
        populate(api);
        expect(api.vectors.clear()).toBe(4);
        expect(api.vectors.list()).toHaveLength(0);
        expect(api.object.clear()).toBe(3);
        expect(api.object.list()).toHaveLength(0);
    });

    test("clear with an EMPTY tag object removes nothing, on both", () => {
        // The distinction that matters: no argument means all, {} means none. Without it, a tag
        // object that came out empty by accident would clear the scene.
        const api = makeApi();
        populate(api);
        expect(api.vectors.clear({})).toBe(0);
        expect(api.object.clear({})).toBe(0);
        expect(api.vectors.list()).toHaveLength(4);
        expect(api.object.list()).toHaveLength(3);
    });

    test("an untagged item is never caught by a tag filter", () => {
        const api = makeApi();
        populate(api);
        api.vectors.clear({ [TAG_SOURCE]: SOURCE_XPID });
        api.vectors.clear({ [TAG_SOURCE]: "myApp" });
        expect(api.vectors.list()).toHaveLength(1);
        expect(api.vectors.list()[0].tags).toBeUndefined();
    });
});
