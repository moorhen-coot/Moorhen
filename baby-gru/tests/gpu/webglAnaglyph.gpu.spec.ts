import { expect, test } from "@playwright/test";
import { runGpuCase } from "./helpers/gpuPage";
import type { WebGLAnaglyphReport } from "./cases/webglAnaglyph.case";

test("WebGL anaglyph: the scene's programs grey each colour before the fog, into the masked channels", async ({ page }) => {
    const outcome = await runGpuCase<WebGLAnaglyphReport>(page, "webglAnaglyph.case.ts");
    const r = outcome.result;
    test.skip(!!r.unavailable, `No WebGL2 here: ${r.unavailable}`);
    console.log(`webgl anaglyph: ${JSON.stringify({ ...r, linkErrors: Object.keys(r.linkErrors) })}`);
    expect(r.linkErrors).toEqual({});
    expect(r.missingUniform).toEqual([]);
    expect(r.glErrors).toEqual([]);

    const near = (got: number[], want: number[]) => want.forEach((w, c) => expect(Math.abs(got[c] - Math.round(w * 255))).toBeLessThanOrEqual(2));
    // Its own colour without the grey; its brightest channel, 0.6, with it.
    near(r.plain, [0.2, 0.6, 0.4]);
    near(r.grey, [0.6, 0.6, 0.6]);
    // Into red only, the rest the background (0.1, 0.2, 0.3); fogged half way, red the mean of the
    // grey and the background's red.
    near(r.redOnly, [0.6, 0.2, 0.3]);
    near(r.fogged, [0.35, 0.2, 0.3]);
});
