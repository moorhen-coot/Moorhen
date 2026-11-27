import { expect, test } from "@playwright/test";
import { resultOrSkip, runGpuCase } from "./helpers/gpuPage";
import type { FieldGradientReport } from "./cases/fieldGradient.case";

/** The per-pixel normals' gradient (FIELD_GRADIENT_WGSL): see cases/fieldGradient.case.ts. */
test("the field's B-spline gradient matches the CPU, reproduces a slope, and points a sphere's normals outwards", async ({ page }) => {
    const r = resultOrSkip(await runGpuCase<FieldGradientReport>(page, "fieldGradient.case.ts", null));
    console.log(`Field gradient: ${JSON.stringify(r)}`);
    expect(r.points).toBe(2000);
    expect(r.maxRelativeError).toBeLessThan(1e-4);
    expect(r.maxLinearError).toBeLessThan(1e-4);
    // A 0.5 Å grid of a sphere of radius 3 Å: well within a degree.
    expect(r.maxSphereDegrees).toBeLessThan(1);
});
