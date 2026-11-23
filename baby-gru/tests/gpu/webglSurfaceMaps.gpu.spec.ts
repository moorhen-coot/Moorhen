import { expect, test } from "@playwright/test";
import { runGpuCase } from "./helpers/gpuPage";
import type { WebGLSurfaceMapsReport } from "./cases/webglSurfaceMaps.case";

test("WebGL mesh textures: the programs link, and the maps light as their untextured equivalents", async ({ page }) => {
    const outcome = await runGpuCase<WebGLSurfaceMapsReport>(page, "webglSurfaceMaps.case.ts");
    const r = outcome.result;
    test.skip(!!r.unavailable, `No WebGL2 here: ${r.unavailable}`);
    expect(r.linkErrors).toEqual({});
    expect(r.glErrors).toEqual([]);

    expect(r.baseColour.drawn).toBe(r.baseColour.compared);
    expect(r.baseColour.worst).toBeLessThanOrEqual(2);
    for (const n of r.normalMaps) {
        expect(n.drawn, n.name).toBe(n.compared);
        expect(n.worst, n.name).toBeLessThanOrEqual(3);
        expect(n.flat, n.name).toBeGreaterThan(10);
    }
    for (const m of r.metallicRoughness) expect(m.worst, `${m.name}: ${m.got} against ${m.expected}`).toBeLessThanOrEqual(2);
    expect(r.mipmapped.worst).toBeLessThanOrEqual(4);
});
