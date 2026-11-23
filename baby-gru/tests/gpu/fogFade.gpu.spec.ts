import { expect, test } from "@playwright/test";
import { resultOrSkip, runGpuCase } from "./helpers/gpuPage";
import type { FogFadeReport } from "./cases/fogFade.case";

test("transparent snapshots fade with distance: over the background colour, the fogged picture", async ({ page }) => {
    const r = resultOrSkip(await runGpuCase<FogFadeReport>(page, "fogFade.case.ts"));
    expect(r.rendererErrors).toEqual([]);
    console.log(`fog fade: ${JSON.stringify(r)}`);

    // Each square in its own colour, not whitened, its alpha down by its fog: a quarter in front,
    // three quarters behind, half at the centre (where the blue square is also half transparent).
    expect(r.near[0]).toBeGreaterThan(150);
    expect(r.near[1] + r.near[2]).toBeLessThanOrEqual(2);
    expect(r.near[3]).toBeGreaterThanOrEqual(Math.round(0.75 * 255) - 2);
    expect(r.near[3]).toBeLessThanOrEqual(Math.round(0.75 * 255) + 2);
    expect(r.far[1]).toBeGreaterThan(150);
    expect(r.far[0] + r.far[2]).toBeLessThanOrEqual(2);
    expect(r.far[3]).toBeGreaterThanOrEqual(Math.round(0.25 * 255) - 2);
    expect(r.far[3]).toBeLessThanOrEqual(Math.round(0.25 * 255) + 2);
    expect(r.middle[2]).toBeGreaterThan(150);
    expect(r.middle[3]).toBeGreaterThanOrEqual(Math.round(0.25 * 255) - 2);
    expect(r.middle[3]).toBeLessThanOrEqual(Math.round(0.25 * 255) + 2);

    // Laid over white, the background colour, each is the ordinary fogged picture, give or take
    // rounding: transparency peeled or blended, and blurred.
    expect(r.peeled).toBeLessThanOrEqual(3);
    expect(r.blended).toBeLessThanOrEqual(3);
    expect(r.blurred).toBeLessThanOrEqual(4);
});
