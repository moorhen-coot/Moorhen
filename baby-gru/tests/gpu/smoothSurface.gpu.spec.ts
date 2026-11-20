import { expect, test } from "@playwright/test";
import { execFileSync, spawnSync } from "child_process";
import { mkdtempSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import type { SmoothSurfaceReport } from "./cases/smoothSurface.case";
import { resultOrSkip, runGpuCase } from "./helpers/gpuPage";

/**
 * The GPU smooth surface's stage 1 against the C++, from the C++'s field (first 40 atoms of 1df7, the
 * app's default options). The reference is made here, natively, with g++ (skipped without one), so it
 * always follows the C++ as it is.
 */
const hasCompiler = spawnSync("c++", ["--version"]).status === 0;

test("GPU smooth surface: contour, split and vertex atoms match the C++ (first 40 atoms of 1df7)", async ({ page }) => {
    test.skip(!hasCompiler, "No C++ compiler to make the reference with");
    test.setTimeout(180_000);
    const work = mkdtempSync(join(tmpdir(), "smooth-surface-gpu-"));
    const root = join(__dirname, "../..");
    const wasmSrc = join(root, "../wasm_src");
    const reference = join(__dirname, "reference/smooth-surface-cpp");
    execFileSync("npx", ["esbuild", join(reference, "makeAtoms.ts"), "--bundle", "--platform=node", `--outfile=${join(work, "makeAtoms.js")}`],
        { cwd: root, stdio: "ignore" });
    execFileSync("node", [join(work, "makeAtoms.js"), join(root, "tests/test_data/1df7.pdb"), "40", join(work, "atoms.bin")]);
    execFileSync("c++", ["-O2", "-std=c++17", "-pthread", `-I${wasmSrc}`, "-o", join(work, "reference"),
        join(reference, "smoothSurfaceReference.cc"), join(wasmSrc, "smooth-surface.cc")]);
    execFileSync(join(work, "reference"), [join(work, "atoms.bin"), join(work, "out.bin")], { stdio: "ignore" });

    const r = resultOrSkip(await runGpuCase<SmoothSurfaceReport>(page, "smoothSurface.case.ts", null,
        { "reference.bin": readFileSync(join(work, "out.bin")) }));
    console.log(`GPU smooth surface: ${JSON.stringify(r)}`);
    expect(r.atoms).toBe(40);
    expect(r.cppVertices).toBeGreaterThan(5000);
    expect(r.gpuVertices).toBe(r.cppVertices);
    expect(r.gpuTriangles).toBe(r.cppTriangles);
    expect(r.unmatchedVertices).toBe(0);
    // float32 on the GPU against the C++'s double, rounded to float.
    expect(r.maxPositionError).toBeLessThan(1e-4);
    expect(r.maxNormalDegrees).toBeLessThan(0.05);
    // Every triangle the C++'s, wound the same way - but where marching cubes put two vertices on the
    // same spot (the field zero at a grid point), matching by position may pick the other one.
    expect(r.sameTriangles + r.otherWithTwins).toBe(r.cppTriangles);
    expect(r.otherWithTwins).toBeLessThan(r.cppTriangles / 500);
    // A vertex half way between two atoms can go either way.
    expect(r.atomDiffers).toBeLessThanOrEqual(2);
    expect(r.otherDiffers).toBeLessThanOrEqual(2);
    expect(r.nearDiffers).toBeLessThanOrEqual(4);
    expect(r.maxWeightError).toBeLessThan(1e-4);
    expect(r.maxGapError).toBeLessThan(1e-4);
});
