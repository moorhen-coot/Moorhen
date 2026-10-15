/**
 * Nobody negates the arguments to centerOnCoordinate.
 *
 * `centerOnCoordinate(x, y, z)` takes the point to look at and does `setOrigin([-x, -y, -z])`
 * itself, because the stored origin is the negated view centre. It did not always: callers used
 * to pass the origin, negation included, and commit 70bace5b moved the negation inside.
 *
 * One call site was missed by that change - the XPID list's centre-on button - so it negated
 * twice and sent the view to the point reflected through the world origin. Nothing failed, no
 * exception was thrown, and the only symptom was landing somewhere wrong.
 *
 * A unit test of the function cannot catch that, because the function was right. What was wrong
 * was a caller's idea of the convention, so this reads the call sites instead. It is the test
 * that would have caught it.
 */
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative, resolve } from "path";

const ROOT = resolve(__dirname, "../..");
const SRC = resolve(ROOT, "src");

/** Every .ts/.tsx file under src, walked directly rather than asked of git. */
const sourceFiles = (dir: string = SRC): string[] =>
    readdirSync(dir).flatMap(entry => {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) {
            return sourceFiles(path);
        }
        return /\.tsx?$/.test(entry) ? [path] : [];
    });

/**
 * Every call to centerOnCoordinate outside its own declaration, as file:line with its arguments.
 *
 * Walking the directory rather than using `git grep`. The first version of this shelled out to
 * git, which works but means the test needs a repository; the pinned-commit tests next door
 * failed in CI for a related reason - actions/checkout is shallow - and there is no reason for
 * any of these to care whether git is present. Only src is walked, so build output cannot drift
 * into the result either way.
 */
const callSites = (): { where: string; args: string }[] =>
    sourceFiles().flatMap(path =>
        readFileSync(path, "utf8")
            .split("\n")
            .map((text, index) => ({ text, lineNo: index + 1 }))
            .filter(({ text }) => text.includes("centerOnCoordinate("))
            // The declaration itself is not a call site.
            .filter(({ text }) => !/centerOnCoordinate\(x: number/.test(text))
            .map(({ text, lineNo }) => {
                const args = text.slice(text.indexOf("centerOnCoordinate(") + "centerOnCoordinate(".length);
                return {
                    where: `${relative(ROOT, path)}:${lineNo}`,
                    args: args.slice(0, args.indexOf(")"))
                };
            })
    );

describe("the centerOnCoordinate convention", () => {
    const sites = callSites();

    test("there are call sites to check, so this is not vacuous", () => {
        expect(sites.length).toBeGreaterThan(0);
    });

    test.each(sites.map(s => [s.where, s.args]))("%s does not negate its arguments", (where, args) => {
        // A leading minus on any argument is the mistake: it means the caller believes it is
        // passing an origin rather than a point to look at.
        const negated = (args as string)
            .split(",")
            .map(a => a.trim())
            .filter(a => a.startsWith("-"));
        expect(negated).toEqual([]);
        expect(where).toBeTruthy();
    });

    test("and the function itself still negates, which is why callers must not", () => {
        const source = readFileSync(resolve(ROOT, "src/InstanceManager/MoorhenInstance.ts"), "utf8");
        const body = source.match(
            /centerOnCoordinate\(x: number, y: number, z: number\): void \{([\s\S]*?)\n    \}/
        );
        expect(body).not.toBeNull();
        expect(body![1]).toMatch(/setOrigin\(\[\s*-x,\s*-y,\s*-z\s*\]\)/);
    });
});
