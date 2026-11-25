import { expect, test } from "@playwright/test";
import { resultOrSkip, runGpuCase } from "./helpers/gpuPage";
import type { SideOnReport } from "./cases/sideOnView.case";

test("the clip, fog and blur widget's side-on view: WebGL with lines, and WebGPU from the main view's renderer", async ({ page }) => {
    const r = resultOrSkip(await runGpuCase<SideOnReport>(page, "sideOnView.case.ts"));
    test.skip(!!r.unavailable, `Not here: ${r.unavailable}`);
    console.log(`side-on view: ${JSON.stringify(r)}`);
    expect(r.rendererErrors).toEqual([]);
    expect(r.glErrors).toEqual([]);

    // Both pictures: each sphere its own colour where the widget's matrices put it, the line green,
    // and the background grey where there is nothing.
    for (const picture of [r.webgl, r.webgpu]) {
        expect(picture.red[0]).toBeGreaterThan(picture.red[1] + 60);
        expect(picture.red[0]).toBeGreaterThan(picture.red[2] + 60);
        expect(picture.blue[2]).toBeGreaterThan(picture.blue[0] + 60);
        expect(picture.green[1]).toBeGreaterThan(picture.green[0] + 60);
        picture.empty.forEach(c => expect(Math.abs(c - 128)).toBeLessThanOrEqual(2));
    }

    // Copied once (two sub-buffers), not again, again only the one changed, and nothing to copy
    // when one goes.
    expect(r.copied).toEqual([2, 0, 1, 0]);

    // The second canvas draws from the main view's uploads.
    expect(r.uploads.main).toBeGreaterThan(0);
    expect(r.uploads.other).toBe(0);
});
