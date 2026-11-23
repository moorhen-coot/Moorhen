import { expect, test } from "@playwright/test";
import { resultOrSkip, runGpuCase } from "./helpers/gpuPage";
import type { ShadowsReport } from "./cases/shadows.case";

test("shadows: where the light puts them, halving the light, soft by the softness asked for, tiled as whole", async ({ page }) => {
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
    // A 1 A penumbra is about 2 A of edge, some 19 pixels here: far wider than the hard edge, on
    // screen and in a screenshot alike.
    expect(r.edgeWidth.soft).toBeGreaterThan(r.edgeWidth.hard + 5);
    expect(r.edgeWidth.softSnapshot).toBeGreaterThan(r.edgeWidth.hard + 5);
    // A screenshot smooths a hard edge over a few texels of the map - no narrower than on screen,
    // and nowhere near a soft shadow's.
    expect(r.edgeWidth.hardSnapshot).toBeGreaterThanOrEqual(r.edgeWidth.hard);
    expect(r.edgeWidth.hardSnapshot).toBeLessThan(r.edgeWidth.soft);
    // Softening moves only the edge: the middle of a shadow is as dark, and what was lit, lit -
    // the curved top of the sphere included, which would speckle without the receiver plane.
    const soft = r.softRatios;
    expect(soft.floorInSphereShadow).toBeGreaterThan(0.45);
    expect(soft.floorInSphereShadow).toBeLessThan(0.55);
    for (const lit of [soft.floorBesideSphereShadow, soft.floorFarFromShadows, soft.plateauTop, soft.sphereTop]) {
        expect(lit).toBeGreaterThan(0.98);
        expect(lit).toBeLessThan(1.02);
    }
    expect(r.offDiffers).toBe(0);
    expect(r.tiles).toBe(6);
    // Tiled as whole: to within one 8-bit step, which is rounding on a hard shadow's edge (see
    // largestDifference in the case), and on no more than a scatter of pixels. A tile drawn wrongly
    // is many steps out. Said where, and whether shadows or occlusion, if not.
    const tiling = `shadows alone: ${JSON.stringify(r.tiledDiffersShadowsOnly)}, occlusion alone: `
        + `${JSON.stringify(r.tiledDiffersOcclusionOnly)}, first: ${JSON.stringify(r.tiledDiffersAt)}`;
    expect(r.tiledLargestDifference, tiling).toBeLessThanOrEqual(1);
    expect(r.tiledDiffersShadowsOnly.largest, tiling).toBeLessThanOrEqual(1);
    expect(r.tiledDiffersOcclusionOnly.largest, tiling).toBeLessThanOrEqual(1);
    // 240 x 160 pixels: a scatter is a handful, a seam is a row or a column of them.
    expect(r.tiledDiffers, tiling).toBeLessThan(40);
});
