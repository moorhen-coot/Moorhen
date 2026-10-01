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
import { execFileSync } from "child_process";
import { readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "../..");

/** Every call to centerOnCoordinate outside its own declaration, as file:line:text. */
const callSites = (): { where: string; args: string }[] => {
    // git grep rather than a directory walk: it respects .gitignore, so node_modules and build
    // output cannot drift into the result.
    const out = execFileSync("git", ["grep", "-n", "centerOnCoordinate(", "--", "baby-gru/src"], {
        cwd: resolve(ROOT, ".."),
        encoding: "utf8",
        maxBuffer: 8 * 1024 * 1024
    });
    return out
        .split("\n")
        .filter(line => line.trim().length > 0)
        .filter(line => !/(public|private)?\s*centerOnCoordinate\(x: number/.test(line))
        .map(line => {
            const [file, lineNo, ...rest] = line.split(":");
            const text = rest.join(":");
            const args = text.slice(text.indexOf("centerOnCoordinate(") + "centerOnCoordinate(".length);
            return { where: `${file}:${lineNo}`, args: args.slice(0, args.indexOf(")")) };
        });
};

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
