import { expect, test } from "@playwright/test";
import { resultOrSkip, runGpuCase } from "./helpers/gpuPage";
import type { LimitsCase, LimitsReport } from "./cases/mapContourLimits.case";

// The synthetic map's grid is 60 x 72 x 84 floats, 1.45 MB, two points an angstrom. A 1 MB largest
// buffer allows 250k box points per array: about 63 a side, so a radius of about 15 A. At 9 A the
// box is about 37 a side; at 30 A it would be about 121.
const CASE: LimitsCase = { bindingBytes: 1_000_000, bigRadius: 30, smallRadius: 9 };

test("a map contour too big for the GPU is made at the largest radius that fits", async ({ page }) => {
    const r = resultOrSkip(await runGpuCase<LimitsReport>(page, "mapContourLimits.case.ts", CASE));
    console.log(`big: r ${r.big.limitedRadius} (${r.big.limitReason}), ${r.big.indexCount / 3} triangles; grid: ${r.gridRefused}`);
    expect(r.uncaptured).toEqual([]);
    for (const big of [r.big, r.bigAgain]) {
        expect(big.tooBig).toBeNull();
        // About 15 A by the box; less if its triangles then overflowed a 1 MB buffer and it was
        // brought down again.
        expect(big.limitedRadius).toBeGreaterThan(r.small.limitedRadius ?? CASE.smallRadius);
        expect(big.limitedRadius).toBeLessThan(18);
        expect(big.limitReason).toMatch(/grid points/);
        expect(big.boxPoints).toBeLessThanOrEqual(250_000);
        expect(big.buffers).toBe(true);
        expect(big.indexCount).toBeGreaterThan(r.small.indexCount);
    }
    expect(r.small.limitedRadius).toBeNull();
    expect(r.small.tooBig).toBeNull();
    expect(r.small.indexCount).toBeGreaterThan(300);
    expect(r.gridRefused).toMatch(/larger than this GPU's largest buffer/);
});
