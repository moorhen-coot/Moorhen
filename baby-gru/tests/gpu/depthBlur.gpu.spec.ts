import { expect, test } from "@playwright/test";
import { resultOrSkip, runGpuCase } from "./helpers/gpuPage";
import type { DepthBlurReport } from "./cases/depthBlur.case";

test("depth blur: what is behind the focal plane blurs, and nothing in front of it moves", async ({ page }) => {
    const r = resultOrSkip(await runGpuCase<DepthBlurReport>(page, "depthBlur.case.ts"));
    expect(r.rendererErrors).toEqual([]);
    console.log(`depth blur: edge widths ${JSON.stringify(r.edges)}`);

    // Without blur both squares' edges are a pixel or two of antialiasing each side.
    expect(r.edges.plain.near).toBeLessThanOrEqual(4);
    expect(r.edges.plain.far).toBeLessThanOrEqual(4);

    // Focal plane at the view centre: the square behind it softens, by several pixels an edge...
    expect(r.edges.focusAtCentre.far).toBeGreaterThanOrEqual(r.edges.plain.far + 4);
    expect(r.farChanged.differing).toBeGreaterThan(0);
    // ...and the square in front of it, and the background round it, are as they were.
    expect(r.edges.focusAtCentre.near).toBe(r.edges.plain.near);
    expect(r.nearUnchanged.worst).toBeLessThanOrEqual(1);

    // In front of everything, both blur; behind everything, nothing changes.
    expect(r.edges.focusInFront.near).toBeGreaterThanOrEqual(r.edges.plain.near + 4);
    expect(r.edges.focusInFront.far).toBeGreaterThanOrEqual(r.edges.plain.far + 4);
    expect(r.focusBehind.differing).toBe(0);

    // Tiles drawn with a margin as wide as the blur reaches join exactly.
    expect(r.tiled.tiles).toBe(6);
    expect(r.tiled.differing).toBe(0);

    // Peeled, the far square still blurs: with nothing opaque there, the blur reads the nearest
    // transparent layer's depth.
    console.log(`depth blur, peeled: ${JSON.stringify(r.peeled)}`);
    expect(r.peeled.layers).toBeGreaterThan(0);
    expect(r.peeled.plain).toBeLessThanOrEqual(4);
    expect(r.peeled.focusAtCentre).toBeGreaterThanOrEqual(r.peeled.plain + 4);

    // Four times the canvas: as smooth as on the canvas, and reaching four times as far. Skipping
    // pixels, the blur came out in steps of a quarter of the square's green or more.
    console.log(`depth blur, scaled: ${JSON.stringify(r.scaled)}; transparent: ${JSON.stringify(r.transparent)}`);
    expect(r.scaled.reach).toBeGreaterThan(12);
    expect(r.scaled.largestStep).toBeLessThan(r.scaled.green / 8);

    // Transparent on white: the square's edge and the blur's spread onto the background are green,
    // with none of the white. (Blurring straight colours over a background cleared to white gave 29
    // levels of it; the edges alone, before the picture was drawn premultiplied, 9.)
    expect(r.transparent.partly).toBeGreaterThan(20);
    expect(r.transparent.worstRedBlue).toBeLessThanOrEqual(2);

    // A small blurred dot glows round: along a diagonal about as bright as along an axis, as far
    // out. (Dropping the across pass's spread in the down pass, as WebGL does, left the diagonals
    // dark: a cross.)
    console.log(`depth blur, glow: ${JSON.stringify(r.glow)}`);
    for (const { distance, axis, diagonal } of r.glow) {
        expect(axis, `the glow ${distance} pixels out`).toBeGreaterThan(4);
        expect(diagonal / axis, `the glow ${distance} pixels out`).toBeGreaterThan(0.6);
        expect(diagonal / axis, `the glow ${distance} pixels out`).toBeLessThan(1.6);
    }
});
