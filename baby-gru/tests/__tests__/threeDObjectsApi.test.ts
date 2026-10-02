/**
 * The 3D object API, and the move that made it possible.
 *
 * Two things are worth pinning down here.
 *
 * The defaults were lifted out of Moorhen3DObjectsModal's component body so that the API and the
 * dialog could share them. A move like that is only safe if it changed nothing, so the committed
 * version of the modal is read back out of git and compared against the extracted module, factory
 * by factory.
 *
 * And the API's own semantics, which are not quite trivial: updateObject replaces the stored
 * object wholesale, so `edit` has to read-merge-write or an edit of one field would silently drop
 * every other. `create` has to ignore a uniqueId handed to it, or two calls with the same
 * parameters would collide on one object instead of making two.
 *
 * These need no libcoot: an object is plain data, and the API talks only to the store.
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { configureStore } from "@reduxjs/toolkit";
import threeDObjectsReducer, { ThreeDObject } from "../../src/store/threeDObjectsSlice";
import {
    OBJECT_FACTORIES,
    OBJECT_TYPES,
    newObjectOfType,
    AllowedObjectKeys,
    ThreeDObjectCreateParams
} from "../../src/utils/threeDObjectFactories";

const ROOT = resolve(__dirname, "../..");

/** Every `newXxxObject` in a file, as { name: body-text }, whitespace normalised. */
const factoriesIn = (source: string): Record<string, string> => {
    const found: Record<string, string> = {};
    // The trailing semicolon is optional because the originals were inconsistent about it -
    // newSphereObject ended "})" and newTorusObject "});". Requiring it made a match run on
    // into the following factory.
    const re = /const (new\w+Object) = \(\): \w+ => \(\{([\s\S]*?)\n\s*\}\);?/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(source)) !== null) {
        found[m[1]] = m[2]
            .split("\n")
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join("\n");
    }
    return found;
};


describe("the factories survived the move out of the modal", () => {
    // The modal as it was before the extraction, from a fixture rather than from git.
    //
    // This read `git show 330282d0:...` until CI failed on it: actions/checkout clones shallow,
    // so a commit that is not the tip simply is not there - "fatal: invalid object name". A test
    // that needs history is a test that only runs where history happens to be.
    const committedModal = JSON.parse(
        readFileSync(resolve(__dirname, "fixtures/preMoveObjectFactories.json"), "utf8")
    ).region as string;
    const before = factoriesIn(committedModal);
    const after = factoriesIn(readFileSync(resolve(ROOT, "src/utils/threeDObjectFactories.ts"), "utf8"));

    test("the committed modal really did hold them, so this is not comparing nothing", () => {
        expect(Object.keys(before).length).toBeGreaterThan(20);
    });

    test("the extracted module still holds every one that moved", () => {
        // Containment rather than equality: the claim is that nothing was lost or altered in the
        // move, not that the module is frozen. Shapes added since - a mesh, say - are fine and
        // should not make this fail.
        for (const name of Object.keys(before)) {
            expect(Object.keys(after)).toContain(name);
        }
    });

    test.each(Object.keys(before).sort())("%s is unchanged", name => {
        expect(after[name]).toBe(before[name]);
    });
});

describe("every shape can be made", () => {
    /** The union members, read from the slice rather than restated here. */
    const unionTypes = (() => {
        const slice = readFileSync(resolve(ROOT, "src/store/threeDObjectsSlice.ts"), "utf8");
        const union = slice.slice(slice.indexOf("export type ThreeDObject"));
        const names = union.slice(0, union.indexOf(";")).match(/\| (\w+Object)/g)!.map(s => s.slice(2));
        const types = names.map(name => {
            const decl = slice.slice(slice.indexOf(`export interface ${name} `));
            return decl.match(/type: "(\w+)"/)![1];
        });
        return types;
    })();

    test("OBJECT_FACTORIES covers the whole union, with nothing spare", () => {
        // The type of OBJECT_FACTORIES makes tsc enforce this too; the point of asserting it at
        // runtime is the "nothing spare" half, and that the union is what we think it is.
        expect(OBJECT_TYPES.slice().sort()).toEqual(unionTypes.slice().sort());
    });

    test.each(OBJECT_TYPES)("a default %s is complete and drawable", type => {
        const obj = newObjectOfType(type);
        expect(obj.type).toBe(type);
        expect(obj.origin).toHaveLength(3);
        expect(typeof obj.colour).toBe("string");
        expect(obj.uniqueId).toMatch(/^[0-9a-f-]{36}$/);
    });

    test("each call gives a fresh id", () => {
        expect(newObjectOfType("sphere").uniqueId).not.toBe(newObjectOfType("sphere").uniqueId);
    });
});

/**
 * Compile-time assertions about create's parameter type.
 *
 * These run at `npx tsc`, which the test scripts do before jest. @ts-expect-error is itself the
 * assertion: it is an error when the line below it compiles cleanly, so each one fails if the
 * typing ever loosens. The runtime body here only exists to keep jest reporting them.
 */
describe("create rejects fields belonging to other shapes", () => {
    test("at compile time", () => {
        const create = <P extends ThreeDObjectCreateParams>(
            _params: P & { [K in Exclude<keyof P, AllowedObjectKeys<P>>]: never }
        ): string | null => null;

        // Allowed: a shape's own fields, and nothing but the type.
        create({ type: "sphere", origin: [10, 0, 0], radius: 5 });
        create({ type: "sphere" });
        create({ type: "cylinder", end: [0, 20, 0], radius: 2 });
        create({ type: "path", points: [0, 0, 0, 1, 1, 1] });
        create({ type: "torus", major_radius: 4, minor_radius: 1 });

        // `end` belongs to a cylinder, not a sphere - as a literal at the call site.
        // @ts-expect-error
        create({ type: "sphere", origin: [10, 0, 0], radius: 5, end: [0, 0, 0] });

        // And the case the plain excess-property check misses: the same object arriving in a
        // variable. This is the one worth having a test for, because it is the one that needs
        // the Exclude/never machinery rather than coming free from TypeScript.
        const viaVariable = {
            type: "sphere" as const,
            radius: 5,
            end: [0, 0, 0] as [number, number, number]
        };
        // @ts-expect-error
        create(viaVariable);

        // A known field of the wrong type.
        // @ts-expect-error
        create({ type: "sphere", radius: "big" });

        // A shape that does not exist.
        // @ts-expect-error
        create({ type: "trapezohedron" });

        // radius means nothing to a plane.
        // @ts-expect-error
        create({ type: "plane", radius: 3 });

        // A valid object in a variable still passes, which is what stops the check above from
        // being vacuously strict.
        const validInVariable = {
            type: "cylinder" as const,
            end: [0, 20, 0] as [number, number, number],
            radius: 2
        };
        expect(create(validInVariable)).toBeNull();
    });
});

describe("moorhenInstance.object", () => {
    /**
     * The real getter, called on a stub carrying only what it uses - a store and a dispatch.
     * Reaching for the property descriptor rather than constructing a MoorhenInstance keeps
     * libcoot, React and the web component out of it, while still exercising the shipped code
     * rather than a copy of it.
     */
    const makeApi = () => {
        const store = configureStore({
            reducer: { threeDObjects: threeDObjectsReducer },
            middleware: getDefault => getDefault({ serializableCheck: false })
        });
        const stub = { store, dispatch: store.dispatch };
        const descriptor = Object.getOwnPropertyDescriptor(
            require("../../src/InstanceManager/MoorhenInstance").MoorhenInstance.prototype,
            "object"
        )!;
        return { api: descriptor.get!.call(stub), store };
    };

    test("create returns a handle that get finds", () => {
        const { api } = makeApi();
        const uid = api.create({ type: "sphere", radius: 5 });
        expect(typeof uid).toBe("string");
        expect(api.get(uid).radius).toBe(5);
        expect(api.get(uid).type).toBe("sphere");
    });

    test("create fills the rest from the shape's defaults", () => {
        const { api } = makeApi();
        const uid = api.create({ type: "sphere", radius: 5 });
        const fresh = OBJECT_FACTORIES.sphere();
        expect(api.get(uid).colour).toBe(fresh.colour);
        expect(api.get(uid).origin).toEqual(fresh.origin);
        expect(api.get(uid).wireframe).toBe(fresh.wireframe);
    });

    test("create ignores a uniqueId passed in, so two identical calls make two objects", () => {
        const { api } = makeApi();
        const first = api.create({ type: "cube", uniqueId: "pick-me" } as never);
        const second = api.create({ type: "cube", uniqueId: "pick-me" } as never);
        expect(first).not.toBe("pick-me");
        expect(first).not.toBe(second);
        expect(api.list()).toHaveLength(2);
    });

    test("create rejects a shape that does not exist", () => {
        const { api } = makeApi();
        const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
        expect(api.create({ type: "trapezohedron" } as never)).toBeNull();
        expect(api.list()).toHaveLength(0);
        warn.mockRestore();
    });

    test("edit changes the named field and keeps the others", () => {
        const { api } = makeApi();
        const uid = api.create({ type: "cylinder", radius: 2, end: [0, 20, 0], colour: "#112233ff" });
        expect(api.edit(uid, { radius: 7 })).toBe(true);
        const after = api.get(uid) as Extract<ThreeDObject, { type: "cylinder" }>;
        expect(after.radius).toBe(7);
        // The whole reason edit merges rather than dispatching the patch.
        expect(after.end).toEqual([0, 20, 0]);
        expect(after.colour).toBe("#112233ff");
        expect(after.type).toBe("cylinder");
    });

    test("edit cannot change type or uniqueId", () => {
        const { api } = makeApi();
        const uid = api.create({ type: "sphere", radius: 1 });
        api.edit(uid, { type: "cube", uniqueId: "something-else" } as never);
        expect(api.get(uid).type).toBe("sphere");
        expect(api.get("something-else")).toBeNull();
    });

    test("edit and delete report a miss rather than throwing", () => {
        const { api } = makeApi();
        expect(api.edit("no-such-object", { colour: "#ffffffff" })).toBe(false);
        expect(api.delete("no-such-object")).toBe(false);
        expect(api.get("no-such-object")).toBeNull();
    });

    test("delete removes only its own object", () => {
        const { api } = makeApi();
        const keep = api.create({ type: "sphere" });
        const drop = api.create({ type: "cube" });
        expect(api.delete(drop)).toBe(true);
        expect(api.list().map(o => o.uniqueId)).toEqual([keep]);
    });

    test("clear empties the scene and says how many went", () => {
        const { api } = makeApi();
        api.create({ type: "sphere" });
        api.create({ type: "torus" });
        api.create({ type: "helix" });
        expect(api.clear()).toBe(3);
        expect(api.list()).toHaveLength(0);
    });

    test("types lists what create accepts, and every one of them works", () => {
        const { api } = makeApi();
        expect(api.types).toEqual(OBJECT_TYPES);
        for (const type of api.types) {
            expect(api.create({ type } as never)).not.toBeNull();
        }
        expect(api.list()).toHaveLength(api.types.length);
    });
});
