import { expect, test } from "@playwright/test";
import { resultOrSkip, runGpuCase } from "./helpers/gpuPage";
import type { SpheresReport } from "./cases/spheres.case";

test("perfect spheres: shape, shading and depth as WebGL's impostors, chunked and tiled", async ({ page }) => {
    const r = resultOrSkip(await runGpuCase<SpheresReport>(page, "spheres.case.ts"));
    expect(r.rendererErrors).toEqual([]);

    // Pixel for pixel against the CPU transcription of WebGL's shaders. Pixels exactly on the
    // impostor's cut can fall either way with float rounding: allow a thin ring of them.
    expect(r.single.expected).toBeGreaterThan(1000);
    expect(Math.abs(r.single.drawn - r.single.expected)).toBeLessThanOrEqual(r.single.expected * 0.01);
    expect(r.single.differ).toBeLessThanOrEqual(r.single.expected * 0.02);

    // The big blue sphere's front is in front of the small red one: blue wins, either order.
    const blue = (c: number[]) => c[2] > 100 && c[0] < 20;
    expect(blue(r.depth.centre)).toBe(true);
    expect(blue(r.depth.centreOtherOrder)).toBe(true);
    // ... and the small one is there to be hidden.
    expect(r.depth.smallAlone[0]).toBeGreaterThan(100);

    expect(r.beyondBackPlane).toBe(0);

    // Cut by the front plane: as the reference, with and without clip caps; with them, a disc of
    // flat colour.
    for (const cut of [r.cut, r.capped]) {
        expect(cut.expected).toBeGreaterThan(1000);
        expect(Math.abs(cut.drawn - cut.expected)).toBeLessThanOrEqual(cut.expected * 0.01);
        expect(cut.differ).toBeLessThanOrEqual(cut.expected * 0.02);
    }
    expect(r.capped.flat).toBeGreaterThan(200);
    // ... and the caps leave no holes, wherever the plane cuts (a pixel or two at the cut).
    expect(r.capErrors.expected).toBeGreaterThan(20000);
    expect(r.capErrors.holes).toBeLessThanOrEqual(r.capErrors.expected * 0.002);
    expect(r.capErrors.extra).toBeLessThanOrEqual(r.capErrors.expected * 0.002);

    expect(r.chunked.drawn).toBeGreaterThan(500);
    expect(r.chunked.differ).toBe(0);

    expect(r.tiled.tiles).toBe(5 * 4);
    expect(r.tiled.differ).toBeLessThanOrEqual(r.pixels * 0.001);
    expect(r.perspectiveTiled.drawn).toBeGreaterThan(500);
    // (and perspective is a different picture, so it was a different test)
    expect(r.perspectiveTiled.fromOrthographic).toBeGreaterThan(100);
    expect(r.perspectiveTiled.differ).toBeLessThanOrEqual(r.pixels * 0.001);
});
