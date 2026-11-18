import { expect, test } from "@playwright/test";
import { checkDefaultSmoothSurface } from "./helpers/smoothSurface";

/**
 * The default smooth surface where WebGPU is there: the field and the colours in the Coot worker,
 * marching cubes on the GPU in between (smoothSurfaceWithGpuContour). The CPU-only case is in
 * smoothSurfaceWorker.spec.ts.
 */
test("the default smooth surface is contoured on the GPU", async ({ page }) => {
    test.setTimeout(240_000);
    const { hasAdapter } = await checkDefaultSmoothSurface(page);
    expect(hasAdapter, "this project runs with WebGPU").toBe(true);
});
