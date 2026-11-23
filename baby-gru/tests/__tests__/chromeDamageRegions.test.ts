/**
 * The damage rectangles cover everything the 2D overlay chrome draws.
 *
 * These canvases are software surfaces, so clearing one is a CPU fill of the whole thing plus a
 * copy and format conversion up to the compositor. The axes must be redrawn whenever the view
 * rotates - every frame during a spin - to update a gizmo about 80 pixels across, so the clear is
 * now restricted to where something is actually drawn.
 *
 * The failure mode is specific and ugly: a box that is too small leaves the previous frame's pixels
 * behind, and because the next frame draws over them rather than replacing them, the error
 * accumulates into a smear. So these tests are about coverage with room to spare, not tightness.
 *
 * The expected positions below are taken from the drawing code in Moorhen2DOverlay, not from the
 * implementation of chromeDamageRegions, so the two have to agree independently.
 */
import { describe, expect, it } from "@jest/globals";
import { DamageRegion, chromeDamageRegions, regionsToClear } from "../../src/utils/chromeDamageRegions";

const WIDTH = 2736;
const HEIGHT = 1452;
const SCALE = 1.0;

const all = { drawAxes: true, drawScaleBar: true, drawCrosshairs: true, simpleLayout: true };

const covers = (regions: DamageRegion[], x: number, y: number): boolean =>
    regions.some(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);

const area = (regions: DamageRegion[]): number =>
    regions.reduce((total, r) => total + r.w * r.h, 0);

describe("chrome damage regions", () => {
    it("gives one box per item that is switched on", () => {
        expect(chromeDamageRegions(WIDTH, HEIGHT, SCALE, all)).toHaveLength(3);
        expect(chromeDamageRegions(WIDTH, HEIGHT, SCALE, { ...all, drawAxes: false })).toHaveLength(2);
        expect(chromeDamageRegions(WIDTH, HEIGHT, SCALE,
            { drawAxes: false, drawScaleBar: false, drawCrosshairs: false, simpleLayout: true })).toHaveLength(0);
    });

    it("declines the layouts where the axes are repeated across a grid", () => {
        expect(chromeDamageRegions(WIDTH, HEIGHT, SCALE, { ...all, simpleLayout: false })).toBeNull();
    });

    it("covers the axes gizmo, including its labels", () => {
        const regions = chromeDamageRegions(WIDTH, HEIGHT, SCALE, all);
        // base_x = width*0.92, base_y = height*0.125, arrows reach 40*scale, labels 5 beyond.
        const baseX = WIDTH * 0.92;
        const baseY = HEIGHT * 0.125;
        expect(covers(regions, baseX, baseY)).toBe(true);
        for (const [dx, dy] of [[45, 0], [-45, 0], [0, 45], [0, -45], [32, 32], [-32, -32]]) {
            expect(covers(regions, baseX + dx, baseY + dy)).toBe(true);
        }
    });

    it("covers the crosshair arms", () => {
        const regions = chromeDamageRegions(WIDTH, HEIGHT, SCALE, all);
        expect(covers(regions, WIDTH * 0.5, HEIGHT * 0.5)).toBe(true);
        for (const [dx, dy] of [[6, 0], [-6, 0], [0, 6], [0, -6]]) {
            expect(covers(regions, WIDTH * 0.5 + dx, HEIGHT * 0.5 + dy)).toBe(true);
        }
    });

    it("covers the scale bar at its longest, its ticks and its label", () => {
        const regions = chromeDamageRegions(WIDTH, HEIGHT, SCALE, all);
        const end = WIDTH - 60 * SCALE;
        const vpos = 30 * SCALE;
        const baseline = HEIGHT - vpos;

        // The right-hand tick, and the left-hand one at the longest the bar gets (l = 0.21*width).
        expect(covers(regions, end, baseline)).toBe(true);
        expect(covers(regions, end, baseline - 8 * SCALE)).toBe(true);
        expect(covers(regions, end, baseline + 8 * SCALE)).toBe(true);
        // At its longest the bar is 0.21*width*1.25, not 0.21*width: the length factor is doubled
        // and then multiplied by 2.5, so it exceeds 1. Covering only 0.21*width left a trail of
        // old tick marks at some zoom levels.
        expect(covers(regions, end - 0.21 * WIDTH, baseline)).toBe(true);
        expect(covers(regions, end - 0.21 * WIDTH * 1.25, baseline)).toBe(true);
        expect(covers(regions, end - 0.21 * WIDTH * 1.25, baseline - 8 * SCALE)).toBe(true);
        expect(covers(regions, end - 0.21 * WIDTH * 1.25, baseline + 8 * SCALE)).toBe(true);
        // The label sits to the right of the bar, baseline + 8, in a 22px font.
        expect(covers(regions, end + 60 * SCALE, baseline + 8 * SCALE)).toBe(true);
        // Whatever the label prints as, including a float with a long tail.
        expect(covers(regions, WIDTH - 1, baseline)).toBe(true);
        expect(covers(regions, end + 4 * SCALE, baseline - 14 * SCALE)).toBe(true);
    });

    it("keeps every box inside the canvas, so nothing is clipped away", () => {
        for (const [w, h] of [[2736, 1452], [1280, 800], [3840, 2160], [600, 900]]) {
            for (const r of chromeDamageRegions(w, h, 1.0, all)) {
                expect(r.x).toBeGreaterThanOrEqual(0);
                expect(r.y).toBeGreaterThanOrEqual(0);
                expect(r.x + r.w).toBeLessThanOrEqual(w);
                expect(r.y + r.h).toBeLessThanOrEqual(h);
            }
        }
    });

    it("is a small fraction of the canvas, which is the entire point", () => {
        const regions = chromeDamageRegions(WIDTH, HEIGHT, SCALE, all);
        expect(area(regions) / (WIDTH * HEIGHT)).toBeLessThan(0.05);
    });

    it("scales its boxes with the device scale", () => {
        const atOne = chromeDamageRegions(WIDTH, HEIGHT, 1.0, all);
        const atTwo = chromeDamageRegions(WIDTH, HEIGHT, 2.0, all);
        expect(area(atTwo)).toBeGreaterThan(area(atOne));
    });
});

describe("what a partial clear has to cover", () => {
    const boxes = (n: number): DamageRegion[] =>
        Array.from({ length: n }, (_, i) => ({ x: i, y: i, w: 10, h: 10 }));

    it("covers this frame's boxes and last frame's", () => {
        const result = regionsToClear(boxes(2), boxes(3));
        expect(result).toHaveLength(5);
    });

    it("still clears where an item was when it is switched off", () => {
        // The bug this exists for: with the axes off, the current list loses their box. Clearing
        // only the current list leaves the gizmo on screen, because nothing draws over it either.
        const withAxes = chromeDamageRegions(WIDTH, HEIGHT, SCALE, all);
        const withoutAxes = chromeDamageRegions(WIDTH, HEIGHT, SCALE, { ...all, drawAxes: false });
        const toClear = regionsToClear(withAxes, withoutAxes);

        const baseX = WIDTH * 0.92;
        const baseY = HEIGHT * 0.125;
        expect(covers(withoutAxes, baseX, baseY)).toBe(false);
        expect(covers(toClear, baseX, baseY)).toBe(true);
    });

    it("clears everything when all the chrome is switched off at once", () => {
        const before = chromeDamageRegions(WIDTH, HEIGHT, SCALE, all);
        const after = chromeDamageRegions(WIDTH, HEIGHT, SCALE,
            { drawAxes: false, drawScaleBar: false, drawCrosshairs: false, simpleLayout: true });
        const toClear = regionsToClear(before, after);

        expect(after).toHaveLength(0);
        expect(toClear).toHaveLength(before.length);
        expect(covers(toClear, WIDTH * 0.92, HEIGHT * 0.125)).toBe(true);
        expect(covers(toClear, WIDTH * 0.5, HEIGHT * 0.5)).toBe(true);
    });

    it("demands a full clear when the layout changes either way", () => {
        expect(regionsToClear(null, boxes(3))).toBeNull();
        expect(regionsToClear(boxes(3), null)).toBeNull();
        expect(regionsToClear(null, null)).toBeNull();
    });
});
