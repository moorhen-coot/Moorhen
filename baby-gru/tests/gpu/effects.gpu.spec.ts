import { expect, test } from "@playwright/test";
import { resultOrSkip, runGpuCase } from "./helpers/gpuPage";
import type { EffectsReport } from "./cases/effects.case";

test("ambient occlusion and edges: where WebGL's definitions put them, and nowhere else", async ({ page }) => {
    const r = resultOrSkip(await runGpuCase<EffectsReport>(page, "effects.case.ts"));
    expect(r.rendererErrors).toEqual([]);

    // The floor darkens beside the plateau and under the sphere's edge, and nowhere it is open.
    const o = r.occlusion;
    expect(o.floorByPlateau).toBeLessThan(0.92);
    expect(o.floorBySphere).toBeLessThan(0.97);
    for (const open of [o.floorFar, o.plateauTop, o.sphereTop]) expect(open).toBeCloseTo(1, 2);
    // Strength 0: the maps are made, and change nothing.
    expect(r.strengthZero.differing).toBe(0);

    // Edges along y = 0 at each step in depth: the floor's ends (against the background), the
    // sphere's rim, the plateau's border - and only there.
    const near = (x: number) => r.edgeRow.some(e => Math.abs(e.x - x) < 0.3);
    for (const x of [-10, -7.5, -4.5, 0, 6, 10]) expect(near(x), `an edge near x = ${x}`).toBe(true);
    for (const e of r.edgeRow) {
        expect([-10, -7.5, -4.5, 0, 6, 10].some(x => Math.abs(e.x - x) < 0.3), `no edge at x = ${e.x}`).toBe(true);
    }
    for (const q of r.edgeQuiet) expect(q).toBe(1);
    expect(r.edgesAboveThreshold.differing).toBe(0);

    expect(r.tiled.tiles).toBe(6);
    expect(r.tiled.differing).toBe(0);
});
