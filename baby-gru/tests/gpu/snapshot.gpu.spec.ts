import { expect, test } from "@playwright/test";
import { resultOrSkip, runGpuCase } from "./helpers/gpuPage";
import type { SnapshotReport } from "./cases/snapshot.case";

test("snapshots match the canvas, and tiled snapshots match whole ones", async ({ page }) => {
    const r = resultOrSkip(await runGpuCase<SnapshotReport>(page, "snapshot.case.ts"));
    // Something of the scene is in the picture, in both projections.
    expect(r.drawn).toBeGreaterThan(r.pixels * 0.05);
    expect(r.perspectiveDrawn).toBeGreaterThan(r.pixels * 0.05);
    // The same pixels as the canvas at the same size.
    expect(r.canvasVsSnapshot.differ).toBe(0);
    // Tiles join without seams. Narrowing the projection changes float rounding a little, which
    // can move a multisample coverage decision at an edge, so a very few pixels may differ.
    expect(r.tiledVsWhole.tiles).toBe(20);
    expect(r.tiledVsWhole.differ).toBeLessThanOrEqual(r.pixels * 0.001);
    expect(r.perspectiveTiledVsWhole.differ).toBeLessThanOrEqual(r.pixels * 0.001);
    expect(r.oddTiles.tiles).toBe(12);
    expect(r.oddTiles.differ).toBeLessThanOrEqual(r.pixels * 0.001);
});
