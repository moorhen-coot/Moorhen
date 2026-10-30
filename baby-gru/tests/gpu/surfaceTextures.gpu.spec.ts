import { expect, test } from "@playwright/test";
import { resultOrSkip, runGpuCase } from "./helpers/gpuPage";
import type { SurfaceTexturesReport } from "./cases/surfaceTextures.case";

test("mesh textures: base colour, normal and metallic-roughness maps, as their untextured equivalents", async ({ page }) => {
    const r = resultOrSkip(await runGpuCase<SurfaceTexturesReport>(page, "surfaceTextures.case.ts"));
    expect(r.rendererErrors).toEqual([]);

    // Each texel where it belongs, times the tint, on a mesh and on an instance.
    for (const c of [r.baseColour, r.instanced]) {
        expect(c.drawn).toBe(c.compared);
        expect(c.worst).toBeLessThanOrEqual(2);
    }

    // A normal map lights the quad as its normals tilted the same way would - and visibly differs
    // from the flat quad, so that a map that did nothing would not pass.
    for (const n of r.normalMaps) {
        expect(n.drawn, n.name).toBe(n.compared);
        expect(n.worst, n.name).toBeLessThanOrEqual(3);
        expect(n.flat, n.name).toBeGreaterThan(10);
    }

    for (const m of r.metallicRoughness) expect(m.worst, `${m.name}: ${m.got} against ${m.expected}`).toBeLessThanOrEqual(2);

    // Minified through mipmaps to an even grey.
    expect(r.mipmapped.worst).toBeLessThanOrEqual(4);

    expect(r.unregisteredMatchesPlain).toBe(true);
});
