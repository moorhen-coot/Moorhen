/**
 * One newVector, behaving as the three it replaced.
 *
 * MoorhenDevMenu, MoorhenVectorsModal and MoorhenNOERestraints each had their own local
 * `newVector()`. They were identical but for one field, and the duplication had already cost
 * something: `customTags` was added to MoorhenVector without any of the three learning about it,
 * so `customTags.push("ambiguous")` in the NOE code threw on every ambiguous restraint.
 *
 * So two things are checked. That the shared factory produces what the old copies produced, read
 * back out of git rather than restated here. And that the field whose absence was the bug is
 * present.
 *
 * The one disagreement between the copies was `radius`: the modal set 0.07, the others left it
 * undefined. Nothing drew differently, because vectorsDraw.ts reads it as
 * `vec.radius ? vec.radius : 0.07`. That claim is load-bearing - it is why unifying on 0.07 is
 * not a visual change - so it is checked against the renderer rather than taken on trust.
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { newVector } from "../../src/utils/vectorFactories";

const ROOT = resolve(__dirname, "../..");

/** The fields one copy set, as { name: literal-text }, whitespace normalised. */
const fieldsOfCopyIn = (source: string): Record<string, string> => {
    const body = source.match(/const newVector = \(\) => \{[\s\S]*?return aVector;/);
    if (!body) {
        throw new Error("no local newVector found in that text");
    }
    const fields: Record<string, string> = {};
    for (const [, key, value] of body[0].matchAll(/^\s*(\w+):\s*(.+?),?\s*$/gm)) {
        fields[key] = value.replace(/,$/, "").trim();
    }
    return fields;
};

/**
 * The three local copies as they were, from a fixture rather than from git.
 *
 * This read them with `git show` until CI failed: actions/checkout clones shallow, so any commit
 * but the tip is missing and git reports "invalid object name". A fixture runs anywhere.
 */
const committed: Record<string, Record<string, string>> = (() => {
    const fixture = JSON.parse(
        readFileSync(resolve(__dirname, "fixtures/preMoveNewVector.json"), "utf8")
    ).bodies as Record<string, string>;
    return Object.fromEntries(
        Object.entries(fixture).map(([name, body]) => [name, fieldsOfCopyIn(body)])
    );
})();

describe("the shared factory matches the three it replaced", () => {
    test("all three copies were found, so this is not comparing nothing", () => {
        for (const [name, fields] of Object.entries(committed)) {
            expect(Object.keys(fields).length).toBeGreaterThan(15);
            expect(fields.uniqueId).toBe("uuidv4()");
            expect(name).toBeTruthy();
        }
    });

    test("the copies really did differ only in radius", () => {
        const [dev, modal, noe] = Object.values(committed);
        const without = (f: Record<string, string>) => {
            const { radius, ...rest } = f;
            return rest;
        };
        expect(without(modal)).toEqual(without(dev));
        expect(without(noe)).toEqual(without(dev));
        expect(modal.radius).toBe("0.07");
        expect(dev.radius).toBeUndefined();
        expect(noe.radius).toBeUndefined();
    });

    // Every literal the old copies set, evaluated and compared against the new factory. uniqueId
    // is excluded because it is a fresh uuid by design, and checked separately below.
    test.each(Object.keys(committed.MoorhenDevMenu).filter(key => key !== "uniqueId"))(
        "%s is unchanged",
        key => {
            const expected = eval(`(${committed.MoorhenDevMenu[key]})`);
            expect(newVector()[key as keyof ReturnType<typeof newVector>]).toEqual(expected);
        }
    );

    test("no field the old copies set has been dropped", () => {
        const now = Object.keys(newVector());
        for (const key of Object.keys(committed.MoorhenDevMenu)) {
            expect(now).toContain(key);
        }
    });
});

describe("the bug the duplication caused", () => {
    test("customTags is present, so pushing to it does not throw", () => {
        const v = newVector();
        expect(v.customTags).toEqual([]);
        expect(() => v.customTags!.push("ambiguous")).not.toThrow();
        expect(v.customTags).toEqual(["ambiguous"]);
    });

    test("and it is a fresh array per vector, not one shared between them", () => {
        const a = newVector();
        const b = newVector();
        a.customTags!.push("ambiguous");
        expect(b.customTags).toEqual([]);
    });

    test("none of the three copies initialised it, which is why it threw", () => {
        for (const fields of Object.values(committed)) {
            expect(fields.customTags).toBeUndefined();
        }
    });
});

describe("radius", () => {
    test("the default equals the renderer's own fallback", () => {
        // If someone changes the fallback in vectorsDraw.ts, the factory's default and the
        // renderer's would disagree and vectors built before this change would shift.
        const draw = readFileSync(resolve(ROOT, "src/WebGLgComponents/vectorsDraw.ts"), "utf8");
        const fallback = draw.match(/vec\.radius\s*\?\s*vec\.radius\s*:\s*([\d.]+)/);
        expect(fallback).not.toBeNull();
        expect(newVector().radius).toBe(Number(fallback![1]));
    });
});

describe("overrides", () => {
    test("a caller's field wins over the default", () => {
        expect(newVector({ labelText: "NOE" }).labelText).toBe("NOE");
        expect(newVector({ radius: 0.2 }).radius).toBe(0.2);
    });

    test("and everything else is still filled in", () => {
        const v = newVector({ labelText: "NOE" });
        expect(v.coordsMode).toBe("atoms");
        expect(v.uniqueId).toMatch(/^[0-9a-f-]{36}$/);
    });

    test("each call gives a fresh id", () => {
        expect(newVector().uniqueId).not.toBe(newVector().uniqueId);
    });
});

