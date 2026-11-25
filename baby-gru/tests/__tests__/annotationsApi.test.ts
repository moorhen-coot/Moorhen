/**
 * instance.annotations: the same shape as instance.object and instance.vectors - defaults filled
 * in, a handle returned, a passed uniqueId ignored, edit merging, locked items left alone, and
 * clear-by-tag where {} clears nothing.
 */
import { configureStore } from "@reduxjs/toolkit";
import annotationsReducer from "../../src/store/annotationsSlice";

/** The real getter, called on a stub carrying a store and a dispatch. */
const makeApi = () => {
    const store = configureStore({
        reducer: { annotations: annotationsReducer },
        middleware: getDefault => getDefault({ serializableCheck: false }),
    });
    const stub = { store, dispatch: store.dispatch };
    const { MoorhenInstance } = require("../../src/InstanceManager/MoorhenInstance");
    const getter = Object.getOwnPropertyDescriptor(MoorhenInstance.prototype, "annotations")?.get;
    if (!getter) throw new Error("no annotations getter");
    return { store, annotations: getter.call(stub) };
};

describe("instance.annotations", () => {
    test("create fills in defaults, mints an id and returns it", () => {
        const { annotations } = makeApi();
        const uid = annotations.create({ text: "Active site", uniqueId: "mine" } as never);
        expect(uid).not.toBe("mine");
        const a = annotations.get(uid);
        expect(a.text).toBe("Active site");
        expect(a.fontPixelSize).toBe(24);
        expect(a.positionMode).toBe("point");
    });

    test("edit merges, cannot change the id, and leaves a locked annotation alone", () => {
        const { annotations } = makeApi();
        const uid = annotations.create({ text: "a", fontPixelSize: 30 });
        expect(annotations.edit(uid, { colour: "#ff0000ff", uniqueId: "x" } as never)).toBe(true);
        expect(annotations.get(uid)).toMatchObject({ text: "a", fontPixelSize: 30, colour: "#ff0000ff", uniqueId: uid });

        const locked = annotations.create({ text: "b", locked: true });
        expect(annotations.edit(locked, { text: "c" })).toBe(false);
        expect(annotations.get(locked).text).toBe("b");
        expect(annotations.edit("missing", { text: "c" })).toBe(false);
    });

    test("delete, list and clear by tag", () => {
        const { annotations } = makeApi();
        const a = annotations.create({ tags: { source: "app" } });
        annotations.create({ tags: { source: "app" } });
        annotations.create({ tags: { source: "other" } });
        expect(annotations.list({ source: "app" })).toHaveLength(2);
        expect(annotations.delete(a)).toBe(true);
        expect(annotations.delete(a)).toBe(false);
        expect(annotations.clear({})).toBe(0);
        expect(annotations.list()).toHaveLength(2);
        expect(annotations.clear({ source: "app" })).toBe(1);
        expect(annotations.clear()).toBe(1);
        expect(annotations.list()).toEqual([]);
    });
});
