import { expect, test } from "@playwright/test";
import { resultOrSkip, runGpuCase } from "./helpers/gpuPage";
import type { SymmetryReport } from "./cases/symmetry.case";

test("symmetry copies look like the mesh moved there, and are grey when asked", async ({ page }) => {
    const r = resultOrSkip(await runGpuCase<SymmetryReport>(page, "symmetry.case.ts"));
    expect(r.rendererErrors).toEqual([]);
    // Moved on the GPU or on the CPU: the same picture, give or take a few edge pixels of rounding.
    expect(r.meshDrawn).toBeGreaterThan(1000);
    expect(r.meshDiffer).toBeLessThanOrEqual(r.meshDrawn * 0.01);
    expect(r.spheresDrawn).toBeGreaterThan(1000);
    expect(r.spheresDiffer).toBeLessThanOrEqual(r.spheresDrawn * 0.01);
    // The grey copy is a whole octahedron's worth of grey pixels; the coloured original has none.
    expect(r.greyOriginal).toBeLessThan(20);
    expect(r.greyCopy).toBeGreaterThan(500);
});
