import { expect, test } from "@playwright/test";
import { resultOrSkip, runGpuCase } from "./helpers/gpuPage";
import type { ViewsReport } from "./cases/views.case";

test("a divided canvas: each view the picture a canvas of its own size draws", async ({ page }) => {
    const r = resultOrSkip(await runGpuCase<ViewsReport>(page, "views.case.ts"));
    expect(r.rendererErrors).toEqual([]);
    console.log(`views: ${JSON.stringify(r)}`);

    // The eyes are turned apart, and each half of the stereo picture is that eye's picture.
    expect(r.eyesDiffer).toBeGreaterThan(50);
    expect(r.effectsChange).toBeGreaterThan(20);
    for (const halfOf of [r.stereo, r.effects, r.peeled, r.multiple]) {
        for (const h of halfOf) {
            expect(h.drawn).toBeGreaterThan(500);
            expect(h.worst).toBeLessThanOrEqual(1);
        }
    }
    expect(r.peelLayers).toBeGreaterThan(0);
    // Drawn in tiles, with effects: as drawn whole.
    expect(r.tiled.tiles).toBeGreaterThan(4);
    expect(r.tiled.worst).toBeLessThanOrEqual(1);
});
