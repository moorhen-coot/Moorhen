import { expect, test } from "@playwright/test";
import { resultOrSkip, runGpuCase } from "./helpers/gpuPage";
import type { DepthPeelReport } from "./cases/depthPeel.case";

/** The largest difference between two colours, in levels of any channel. */
const worst = (a: number[], b: number[]) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));

test("depth peeling: transparent layers sorted, the nearest kept, no rim at opaque silhouettes", async ({ page }) => {
    const r = resultOrSkip(await runGpuCase<DepthPeelReport>(page, "depthPeel.case.ts"));
    expect(r.rendererErrors).toEqual([]);

    // Peeled when something transparent is in view, with depthPeelLayers less the opaque layer;
    // not with it switched off, nor for hover highlights alone (as WebGL), nor for nothing.
    expect(r.peelLayers).toEqual({ default: 3, five: 4, off: 0, hoverOnly: 0, opaqueOnly: 0 });

    // Everywhere, the sorted composite of the nearest three (or, with 5 layers, four) quads over
    // the floor, whatever order the mesh has them in - to within the layers' 8-bit storage.
    for (const p of r.places) {
        expect(worst(p.drawn, p.expected3), `${p.name}, 3 layers: ${p.drawn} against ${p.expected3}`).toBeLessThanOrEqual(2);
        expect(worst(p.drawn4, p.expected4), `${p.name}, 4 layers: ${p.drawn4} against ${p.expected4}`).toBeLessThanOrEqual(2);
    }
    // Where there are four, three layers leave the furthest out, as WebGL's do.
    const allFour = r.places.find(p => p.name === "all four");
    expect(worst(allFour.drawn, allFour.expected4)).toBeGreaterThan(5);
    // And the order matters: blended unsorted, the same place comes out quite differently.
    expect(worst(r.unsortedAllFour, allFour.expected3)).toBeGreaterThan(20);

    // The pixel an opaque bar's edge halves is half bar, half the transparent quad over the floor;
    // WebGL's rim would make it half bar, half bare floor.
    expect(worst(r.rim.edge, r.rim.expectedEdge), `edge ${r.rim.edge}`).toBeLessThanOrEqual(3);
    expect(worst(r.rim.edge, r.rim.rimEdge)).toBeGreaterThan(30);
    expect(r.rim.inside).toEqual([0, 0, 255]);
    expect(worst(r.rim.outside, [204, 51, 51])).toBeLessThanOrEqual(2);

    // A transparent sphere is peeled at its own surface's depth, and shows its lit colour half over
    // the floor.
    expect(worst(r.sphere.centre, r.sphere.expectedCentre)).toBeLessThanOrEqual(2);
    expect(worst(r.sphere.side, r.sphere.expectedSide)).toBeLessThanOrEqual(2);

    // Every pass is per pixel, so tiles join exactly.
    expect(r.tiles).toBe(6);
    expect(r.tiledDiffers).toBe(0);
});
