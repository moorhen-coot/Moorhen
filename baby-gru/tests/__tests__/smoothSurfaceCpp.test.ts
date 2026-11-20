import { execFileSync, spawnSync } from "child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { m2tAtomRadius } from "../../src/utils/m2tAtomRadii";

/**
 * The smooth surface's C++ (wasm_src/smooth-surface.cc), built natively with g++ and run against its
 * tests (wasm_src/smooth-surface-unit-test.cc): each kind of SES patch against its exact shape, the
 * mesh's conventions, the opening, vertex atoms, and on 1df7 - written here with M2T's united-atom
 * radii, as the app sizes atoms - no false cavities and concave patches against a brute-force SES.
 * Skipped where there is no g++.
 */
const wasmSrc = join(__dirname, "../../../wasm_src");
const hasCompiler = spawnSync("g++", ["--version"]).status === 0;

(hasCompiler ? test : test.skip)("the C++ smooth surface passes its native tests", () => {
    const work = mkdtempSync(join(tmpdir(), "smooth-surface-"));
    const binary = join(work, "smooth-surface-unit-test");
    execFileSync("g++", ["-O2", "-std=c++17", "-pthread", join(wasmSrc, "smooth-surface.cc"), join(wasmSrc, "smooth-surface-unit-test.cc"),
        "-o", binary]);
    const protein = readFileSync(join(__dirname, "../test_data/1df7.pdb"), "utf8").split("\n")
        .filter(line => /^(ATOM|HETATM)/.test(line) && line.slice(17, 20) !== "HOH" && [" ", "A"].includes(line[16]))
        .map(line => `${parseFloat(line.slice(30, 38))} ${parseFloat(line.slice(38, 46))} ${parseFloat(line.slice(46, 54))} ` +
            `${m2tAtomRadius(line.slice(12, 16), line.slice(17, 20))}`);
    const atoms = join(work, "1df7.xyzr");
    writeFileSync(atoms, protein.join("\n") + "\n");
    const run = spawnSync(binary, [atoms], { encoding: "utf8" });
    expect(run.stderr).toContain("all checks passed");
    expect(run.status).toBe(0);
}, 180_000);
