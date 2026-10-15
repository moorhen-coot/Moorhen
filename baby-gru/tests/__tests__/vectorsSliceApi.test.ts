/**
 * Removing vectors: by id, by ids, by tag, and the legacy way.
 *
 * `removeVector` and `removeVectors` take whole vectors, so deleting one has always meant having
 * one. The by-id pair fixes that and brings vectors level with `removeObjectById`. The by-tag
 * one replaces `removeVectorsMatchingIDString`, which matched a substring of the identifier.
 *
 * The case most worth a test is the empty query. `matchesTags` returns true for `{}` - which is
 * the right identity for an optional filter - so an empty query reaching the remover would clear
 * the scene. It is guarded, and that guard is the difference between a tag object that came out
 * empty by accident being harmless and being destructive.
 *
 * The deprecated method is tested too: it is deprecated, not gone, because it is public and
 * takes an arbitrary string, so identifiers in the wild carry tags nobody here can migrate.
 */
import { configureStore } from "@reduxjs/toolkit";
import vectorsReducer, {
    addVectors,
    removeVectorById,
    removeVectorsByIds,
    removeVectorsByTag,
    removeVectorsMatchingIDString,
    MoorhenVector
} from "../../src/store/vectorsSlice";
import { newVector } from "../../src/utils/vectorFactories";
import { SOURCE_DEV_TEST, SOURCE_XPID, TAG_MOLECULE, TAG_SOURCE } from "../../src/utils/tags";

const makeStore = () =>
    configureStore({
        reducer: { vectors: vectorsReducer },
        middleware: getDefault => getDefault({ serializableCheck: false })
    });

const ids = (store: ReturnType<typeof makeStore>) =>
    store.getState().vectors.vectorsList.map(v => v.uniqueId);

/** Three XPID vectors across two molecules, one dev-test vector, and one untagged. */
const populate = (store: ReturnType<typeof makeStore>) => {
    const vectors: MoorhenVector[] = [
        newVector({ uniqueId: "xpid-a1", tags: { [TAG_SOURCE]: SOURCE_XPID, [TAG_MOLECULE]: "mol-1" } }),
        newVector({ uniqueId: "xpid-a2", tags: { [TAG_SOURCE]: SOURCE_XPID, [TAG_MOLECULE]: "mol-1" } }),
        newVector({ uniqueId: "xpid-b1", tags: { [TAG_SOURCE]: SOURCE_XPID, [TAG_MOLECULE]: "mol-2" } }),
        newVector({ uniqueId: "dev-1", tags: { [TAG_SOURCE]: SOURCE_DEV_TEST } }),
        newVector({ uniqueId: "plain-1" })
    ];
    store.dispatch(addVectors(vectors));
    return vectors;
};

describe("removeVectorById", () => {
    test("removes just that one", () => {
        const store = makeStore();
        populate(store);
        store.dispatch(removeVectorById("xpid-a1"));
        expect(ids(store)).toEqual(["xpid-a2", "xpid-b1", "dev-1", "plain-1"]);
    });

    test("an id that is not there changes nothing", () => {
        const store = makeStore();
        populate(store);
        store.dispatch(removeVectorById("no-such-vector"));
        expect(ids(store)).toHaveLength(5);
    });
});

describe("removeVectorsByIds", () => {
    test("removes the set and leaves the rest", () => {
        const store = makeStore();
        populate(store);
        store.dispatch(removeVectorsByIds(["xpid-a1", "plain-1"]));
        expect(ids(store)).toEqual(["xpid-a2", "xpid-b1", "dev-1"]);
    });

    test("an empty list removes nothing", () => {
        const store = makeStore();
        populate(store);
        store.dispatch(removeVectorsByIds([]));
        expect(ids(store)).toHaveLength(5);
    });
});

describe("removeVectorsByTag", () => {
    test("one pair removes the whole group", () => {
        const store = makeStore();
        populate(store);
        store.dispatch(removeVectorsByTag({ [TAG_SOURCE]: SOURCE_XPID }));
        expect(ids(store)).toEqual(["dev-1", "plain-1"]);
    });

    test("a second pair narrows it", () => {
        const store = makeStore();
        populate(store);
        store.dispatch(removeVectorsByTag({ [TAG_SOURCE]: SOURCE_XPID, [TAG_MOLECULE]: "mol-1" }));
        expect(ids(store)).toEqual(["xpid-b1", "dev-1", "plain-1"]);
    });

    test("an untagged vector is never caught by a tag query", () => {
        const store = makeStore();
        populate(store);
        store.dispatch(removeVectorsByTag({ [TAG_SOURCE]: SOURCE_XPID }));
        store.dispatch(removeVectorsByTag({ [TAG_SOURCE]: SOURCE_DEV_TEST }));
        expect(ids(store)).toEqual(["plain-1"]);
    });

    test("an empty query removes NOTHING, rather than everything", () => {
        // matchesTags({}, {}) is true, so without the guard this would clear the scene. A tags
        // object that came out empty by accident is the realistic way to get here.
        const store = makeStore();
        populate(store);
        store.dispatch(removeVectorsByTag({}));
        expect(ids(store)).toHaveLength(5);
    });

    test("a tag value that is a prefix of another does not match it", () => {
        const store = makeStore();
        store.dispatch(addVectors([
            newVector({ uniqueId: "nef", tags: { [TAG_SOURCE]: "nef" } }),
            newVector({ uniqueId: "nefarious", tags: { [TAG_SOURCE]: "nefarious" } })
        ]));
        store.dispatch(removeVectorsByTag({ [TAG_SOURCE]: "nef" }));
        // The substring mechanism this replaces would have taken both.
        expect(ids(store)).toEqual(["nefarious"]);
    });
});

describe("removeVectorsMatchingIDString, deprecated but working", () => {
    test("still matches substrings of identifiers", () => {
        const store = makeStore();
        store.dispatch(addVectors([
            newVector({ uniqueId: "abc__TAG_SOMEONE_ELSES_THING" }),
            newVector({ uniqueId: "def-plain" })
        ]));
        store.dispatch(removeVectorsMatchingIDString("__TAG_SOMEONE_ELSES_THING"));
        expect(ids(store)).toEqual(["def-plain"]);
    });

    test("and it is marked deprecated in the slice, so the generated API says so too", () => {
        const slice = require("fs").readFileSync(
            require("path").resolve(__dirname, "../../src/store/vectorsSlice.ts"),
            "utf8"
        );
        const before = slice.slice(0, slice.indexOf("removeVectorsMatchingIDString:"));
        expect(before.slice(-400)).toContain("@deprecated");
    });
});

describe("the generated instance namespace", () => {
    /**
     * The real generated getter, called on a stub carrying only a dispatch. StoreExtension is
     * written by scripts/CreateStoreExport.py from the `// API` markers, so this checks that the
     * markers were actually picked up rather than that the reducers exist.
     */
    const api = () => {
        const store = makeStore();
        const { StoreExtension } = require("../../src/InstanceManager/StoreExtension");
        const descriptor = Object.getOwnPropertyDescriptor(StoreExtension.prototype, "vectors")!;
        return { vectors: descriptor.get!.call({ dispatch: store.dispatch, store }), store };
    };

    test("exposes the three new methods alongside the old ones", () => {
        const { vectors } = api();
        for (const name of [
            "addVector",
            "addVectors",
            "emptyVectors",
            "removeVector",
            "removeVectors",
            "removeVectorById",
            "removeVectorsByIds",
            "removeVectorsByTag",
            "removeVectorsMatchingIDString"
        ]) {
            expect(typeof vectors[name]).toBe("function");
        }
    });

    test("and removing by tag through it reaches the store", () => {
        const { vectors, store } = api();
        populate(store);
        vectors.removeVectorsByTag({ [TAG_SOURCE]: SOURCE_DEV_TEST });
        expect(ids(store)).toEqual(["xpid-a1", "xpid-a2", "xpid-b1", "plain-1"]);
    });
});
