/**
 * Drawing shapes without the store behind them.
 *
 * `getThreeDObjectsBuffers(store)` did two jobs: deciding where the shapes come from, and turning
 * them into buffers. Only the first of those is about the scene. A molecule representation that
 * draws itself out of cuboids and cylinders wants the second with none of the first - no store,
 * no uniqueIds that have to persist, nothing in a saved session.
 *
 * So the builder now takes a plain list. Two things about that are worth pinning down rather than
 * assuming: that routing the scene's objects through the new entry point draws exactly what it
 * drew before, and that two callers do not interfere. The second is not obvious - the path tube
 * cache is pruned at the end of every pass by "what did I draw this time", so one cache shared
 * between two callers would have each deleting the other's tubes and rebuilding them on the next
 * frame, for ever.
 */
import { configureStore } from "@reduxjs/toolkit";
import threeDObjectsReducer, { addObject, ThreeDObject } from "../../src/store/threeDObjectsSlice";
import {
    getBuffersForShapes,
    getThreeDObjectsBuffers
} from "../../src/WebGLgComponents/threeDObjectsDraw";
import { newObjectOfType } from "../../src/utils/threeDObjectFactories";
import { MOORHEN_3D_OBJECT_TAG_KIND } from "../../src/utils/enums";

/**
 * A stand-in for the browser's canvas, which the colour conversion borrows to turn a CSS colour
 * name into hex.
 *
 * Only the normalisation is borrowed, and none of these tests is about colour: they compare two
 * routes through the same code, and check labelling and caching. So the stub need only be
 * deterministic - a hex string passes through, anything else comes back black - and both routes
 * get the same answer either way.
 */
(globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas = class {
    getContext() {
        let value = "#000000";
        return {
            set fillStyle(v: string) {
                value = /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : "#000000";
            },
            get fillStyle() {
                return value;
            }
        };
    }
};

const shape = (type: Parameters<typeof newObjectOfType>[0], extra: Record<string, unknown> = {}) =>
    ({ ...newObjectOfType(type), ...extra }) as ThreeDObject;

const tagKinds = (buffers: { pick_info?: { instance_tag_kind?: string } }[]) =>
    [...new Set(buffers.map(b => b.pick_info?.instance_tag_kind).filter(Boolean))];

describe("the builder no longer needs a store", () => {
    test("an empty list draws nothing, without complaint", async () => {
        expect(await getBuffersForShapes([])).toEqual([]);
    });

    test("shapes passed directly draw the same as the same shapes in the store", async () => {
        const shapes = [
            shape("sphere", { origin: [1, 2, 3], radius: 4 }),
            shape("cube", { origin: [-5, 0, 5] }),
            shape("cylinder", { origin: [0, 0, 0], end: [0, 10, 0], radius: 1 })
        ];

        const store = configureStore({
            reducer: { threeDObjects: threeDObjectsReducer },
            middleware: getDefault => getDefault({ serializableCheck: false })
        });
        shapes.forEach(s => store.dispatch(addObject(s)));

        const fromStore = await getThreeDObjectsBuffers(store as never);
        const fromList = await getBuffersForShapes(shapes);

        // Compared as JSON because these carry typed arrays; what matters is that the geometry
        // and the labelling are identical, not that the objects are the same instances.
        expect(JSON.stringify(fromList)).toBe(JSON.stringify(fromStore));
        expect(fromList.length).toBeGreaterThan(0);
    });
});

describe("the tag kind is the caller's to choose", () => {
    test("the scene's objects are still labelled as 3D objects", async () => {
        const store = configureStore({
            reducer: { threeDObjects: threeDObjectsReducer },
            middleware: getDefault => getDefault({ serializableCheck: false })
        });
        store.dispatch(addObject(shape("sphere")));
        expect(tagKinds(await getThreeDObjectsBuffers(store as never))).toEqual([
            MOORHEN_3D_OBJECT_TAG_KIND
        ]);
    });

    test("another caller can label its shapes as something else entirely", async () => {
        // This is what lets a click on a representation's cuboid resolve to a residue rather
        // than to a 3D object that does not exist.
        const buffers = await getBuffersForShapes([shape("cuboid")], { tagKind: "dnatco-residue" });
        expect(tagKinds(buffers)).toEqual(["dnatco-residue"]);
    });

    test("and omitting it keeps the old behaviour", async () => {
        expect(tagKinds(await getBuffersForShapes([shape("sphere")]))).toEqual([
            MOORHEN_3D_OBJECT_TAG_KIND
        ]);
    });
});

describe("path caches do not tread on each other", () => {
    const path = (uniqueId: string, points: number[]) =>
        shape("path", { uniqueId, points, radius: 0.5 });

    test("two callers with their own caches each keep their tubes", async () => {
        const mine = new Map();
        const theirs = new Map();

        await getBuffersForShapes([path("mine-1", [0, 0, 0, 1, 1, 1, 2, 0, 2])], { pathCache: mine });
        expect(mine.size).toBe(1);

        // A second caller drawing entirely different paths. With one shared cache, the prune at
        // the end of this pass would drop "mine-1" because this pass did not draw it.
        await getBuffersForShapes([path("theirs-1", [0, 0, 0, 5, 5, 5, 9, 1, 2])], { pathCache: theirs });

        expect(mine.has("mine-1")).toBe(true);
        expect(theirs.has("theirs-1")).toBe(true);
        expect(mine.has("theirs-1")).toBe(false);
    });

    test("a shared cache WOULD evict, which is why the option exists", async () => {
        // Not a recommendation - a demonstration that the hazard is real, so that nobody
        // "simplifies" the option away later.
        const shared = new Map();
        await getBuffersForShapes([path("a", [0, 0, 0, 1, 1, 1, 2, 2, 2])], { pathCache: shared });
        expect(shared.has("a")).toBe(true);
        await getBuffersForShapes([path("b", [0, 0, 0, 3, 3, 3, 6, 6, 6])], { pathCache: shared });
        expect(shared.has("a")).toBe(false);
        expect(shared.has("b")).toBe(true);
    });

    test("with no cache given, nothing accumulates between calls", async () => {
        // The right default for shapes regenerated every pass, which would otherwise pile up
        // under ids that are never seen again.
        const first = await getBuffersForShapes([path("transient", [0, 0, 0, 1, 1, 1, 2, 2, 2])]);
        const second = await getBuffersForShapes([path("transient", [0, 0, 0, 1, 1, 1, 2, 2, 2])]);
        expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    });

    test("a path's tube is reused when the same object is drawn again", async () => {
        // The store's case: a reducer hands back the same arrays for fields nobody touched, so
        // the reference comparison succeeds and the tube is not rebuilt.
        const cache = new Map();
        const obj = path("p", [0, 0, 0, 1, 1, 1, 2, 2, 2]);
        await getBuffersForShapes([obj], { pathCache: cache });
        const built = cache.get("p");
        await getBuffersForShapes([obj], { pathCache: cache });
        expect(cache.get("p")).toBe(built);
    });

    test("but a path rebuilt from scratch each pass misses, even with identical numbers", async () => {
        // Worth knowing before building a representation that generates its shapes every frame:
        // the cache compares points and run_starts by reference, not by value, because that is
        // what a reducer gives cheaply. newPathObject() makes a fresh run_starts array per call,
        // so two objects describing the same path are not "the same path" to the cache and the
        // tube is swept again.
        //
        // The fix for such a caller is to hold its arrays and reuse them, not to deepen the
        // comparison - scanning thousands of points would cost more than the rebuild it saves.
        const cache = new Map();
        const points = [0, 0, 0, 1, 1, 1, 2, 2, 2];
        await getBuffersForShapes([path("p", points)], { pathCache: cache });
        const built = cache.get("p");
        await getBuffersForShapes([path("p", points)], { pathCache: cache });
        expect(cache.get("p")).not.toBe(built);
    });
});
