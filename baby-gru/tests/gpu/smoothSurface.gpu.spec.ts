import { expect, test } from "@playwright/test";
import { execFileSync, spawnSync } from "child_process";
import { mkdtempSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import type { SmoothSurfaceReport } from "./cases/smoothSurface.case";
import type { SmoothBlurReport } from "./cases/smoothSurfaceBlur.case";
import type { SmoothFieldReport } from "./cases/smoothSurfaceField.case";
import type { SmoothExposureReport } from "./cases/smoothSurfaceExposure.case";
import { resultOrSkip, runGpuCase } from "./helpers/gpuPage";

/**
 * The GPU smooth surface's stage 1 against the C++, from the C++'s field (first 40 atoms of 1df7, the
 * app's default options). The reference is made here, natively, with g++ (skipped without one), so it
 * always follows the C++ as it is.
 */
const hasCompiler = spawnSync("c++", ["--version"]).status === 0;

/** The C++ reference for the first `atoms` atoms of 1df7 (see smoothSurfaceReference.cc), made natively. */
function makeReference(atoms: number): Buffer {
    const work = mkdtempSync(join(tmpdir(), "smooth-surface-gpu-"));
    const root = join(__dirname, "../..");
    const wasmSrc = join(root, "../wasm_src");
    const reference = join(__dirname, "reference/smooth-surface-cpp");
    execFileSync("npx", ["esbuild", join(reference, "makeAtoms.ts"), "--bundle", "--platform=node", `--outfile=${join(work, "makeAtoms.js")}`],
        { cwd: root, stdio: "ignore" });
    execFileSync("node", [join(work, "makeAtoms.js"), join(root, "tests/test_data/1df7.pdb"), String(atoms), join(work, "atoms.bin")]);
    execFileSync("c++", ["-O2", "-std=c++17", "-pthread", `-I${wasmSrc}`, "-o", join(work, "reference"),
        join(reference, "smoothSurfaceReference.cc"), join(wasmSrc, "smooth-surface.cc")]);
    execFileSync(join(work, "reference"), [join(work, "atoms.bin"), join(work, "out.bin")], { stdio: "ignore" });
    return readFileSync(join(work, "out.bin"));
}

test("GPU smooth surface: contour, split and vertex atoms match the C++ (first 40 atoms of 1df7)", async ({ page }) => {
    test.skip(!hasCompiler, "No C++ compiler to make the reference with");
    test.setTimeout(180_000);
    const r = resultOrSkip(await runGpuCase<SmoothSurfaceReport>(page, "smoothSurface.case.ts", null, { "reference.bin": makeReference(40) }));
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

test("GPU smooth surface: blur, cap, heal and level match the C++ (first 40 atoms of 1df7)", async ({ page }) => {
    test.skip(!hasCompiler, "No C++ compiler to make the reference with");
    test.setTimeout(180_000);
    const r = resultOrSkip(await runGpuCase<SmoothBlurReport>(page, "smoothSurfaceBlur.case.ts", null, { "reference.bin": makeReference(40) }));
    console.log(`GPU smooth surface blur: ${JSON.stringify(r)}`);
    expect(r.changed).toBeGreaterThan(0);
    // float32 sums on the GPU against the C++'s double.
    expect(r.maxInputErrorNearSurface).toBeLessThan(1e-4);
    expect(r.maxInputError).toBeLessThan(1e-3);
    expect(r.gpuVertices).toBe(r.cppVertices);
    expect(r.gpuTriangles).toBe(r.cppTriangles);
    expect(r.unmatched1e2).toBe(0);
});

test("GPU smooth surface: occupancy, seeds, transform, distances and opening match the C++ (first 40 atoms of 1df7)", async ({ page }) => {
    test.skip(!hasCompiler, "No C++ compiler to make the reference with");
    test.setTimeout(180_000);
    const r = resultOrSkip(await runGpuCase<SmoothFieldReport>(page, "smoothSurfaceField.case.ts", null, { "reference.bin": makeReference(40) }));
    console.log(`GPU smooth surface field: ${JSON.stringify(r)}`);
    expect(r.exteriorDiffers).toBe(0);
    expect(r.deepDiffers).toBe(0);
    expect(r.cppSeeds).toBeGreaterThan(1000);
    expect(r.gpuSeeds).toBe(r.cppSeeds);
    // float32 against the C++'s double; a point equally near two seeds may pick either.
    expect(r.maxSeedError).toBeLessThan(1e-4);
    expect(r.seedAtomDiffers).toBeLessThanOrEqual(2);
    expect(r.featureDiffers).toBeLessThan(r.points / 10000);
    expect(r.maxDistanceError).toBeLessThan(1e-3);
    expect(r.maxOpenedErrorNearSurface).toBeLessThan(1e-4);
    expect(r.weightDiffers).toBeLessThanOrEqual(2);
    expect(Math.abs(r.gpuInterior - r.cppInterior)).toBeLessThanOrEqual(2);
    expect(r.gpuVertices).toBe(r.cppVertices);
    expect(r.gpuTriangles).toBe(r.cppTriangles);
    expect(r.unmatched1e2).toBe(0);
});

test("GPU smooth surface: grid, neighbours, circles and exposed arcs match the C++ (first 40 atoms of 1df7)", async ({ page }) => {
    test.skip(!hasCompiler, "No C++ compiler to make the reference with");
    test.setTimeout(180_000);
    const r = resultOrSkip(await runGpuCase<SmoothExposureReport>(page, "smoothSurfaceExposure.case.ts", null, { "reference.bin": makeReference(40) }));
    console.log(`GPU smooth surface exposure: ${JSON.stringify(r)}`);
    expect(r.gridSame).toBe(true);
    // Neighbours, circles, their numbering, exposed atoms: the C++'s exactly.
    expect(r.tablesDiffer).toEqual([]);
    expect(r.cppCircles).toBeGreaterThan(50);
    expect(r.gpuCircles).toBe(r.cppCircles);
    expect(r.gpuArcs).toBe(r.cppArcs);
    // float32 against the C++'s double.
    expect(r.maxCircleError).toBeLessThan(1e-4);
    expect(r.maxArcEndError).toBeLessThan(1e-4);
    expect(r.arcClassDiffers).toBe(0);
    expect(r.gpuVertices).toBe(r.cppVertices);
    expect(r.gpuTriangles).toBe(r.cppTriangles);
    expect(r.unmatched1e2).toBe(0);
});
