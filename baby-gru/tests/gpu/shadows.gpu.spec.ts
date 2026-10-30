import { expect, test } from "@playwright/test";
import { resultOrSkip, runGpuCase } from "./helpers/gpuPage";
import type { ShadowsReport } from "./cases/shadows.case";

test("shadows: where the light puts them, halving the light, soft when asked, tiled as whole", async ({ page }) => {
    const r = resultOrSkip(await runGpuCase<ShadowsReport>(page, "shadows.case.ts"));
    expect(r.rendererErrors).toEqual([]);

    // In shadow, the light is halved (and the highlight, nearly nothing on a flat floor, lost).
    const s = r.ratios;
    for (const inShadow of [s.floorInPlateauShadowLeft, s.floorInPlateauShadowBelow, s.floorInSphereShadow]) {
        expect(inShadow).toBeGreaterThan(0.45);
        expect(inShadow).toBeLessThan(0.55);
    }
    // Just past the shadows, and on the casters' own tops, nothing changes...
    // ...nor where only something clipped away by the front plane stands over the floor.
    for (const lit of [s.floorLeftOfPlateauShadow, s.floorBelowPlateauShadow, s.floorBesideSphereShadow, s.plateauTop, s.sphereTop,
        s.floorUnderClippedSphere]) {
        expect(lit).toBeCloseTo(1, 2);
    }
    // The soft lookup is eight texels across: no narrower an edge than the single one.
    expect(r.edgeWidth.soft).toBeGreaterThanOrEqual(r.edgeWidth.hard);
    expect(r.offDiffers).toBe(0);
    expect(r.tiles).toBe(6);
    expect(r.tiledDiffers).toBe(0);
});
