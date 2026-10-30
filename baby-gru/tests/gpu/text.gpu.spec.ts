import { expect, test } from "@playwright/test";
import { resultOrSkip, runGpuCase } from "./helpers/gpuPage";
import type { TextReport } from "./cases/text.case";

test("text labels and line overlays: placed and sized as WebGL draws them", async ({ page }) => {
    const r = resultOrSkip(await runGpuCase<TextReport>(page, "text.case.ts"));
    expect(r.rendererErrors).toEqual([]);
    const cx = r.width / 2, cy = r.height / 2;

    // As many pixels as in the atlas (40 x 20), bottom-left corner on the label's point (the
    // view centre).
    expect(r.labels).toBe(1);
    expect(r.plain).toMatchObject({ left: cx, right: cx + 40, top: cy - 20, bottom: cy, count: 800 });
    // Beside the vector (1, 0, 0), 3 units away: centred on the point across the screen, its
    // bottom 3 x 128 / 48 = 8 pixels above it.
    expect(r.offset).toMatchObject({ left: cx - 20, right: cx + 20, top: cy - 28, bottom: cy - 8, count: 800 });
    // Over a mesh in front of it; hidden by it in atomLabelDepthMode.
    expect(r.overWall.count).toBe(800);
    expect(r.behindWall.count).toBe(0);
    // The atlas is copied again when its revision moves, and not otherwise.
    expect(r.staleRevision).toEqual({ red: 800, green: 0 });
    expect(r.newRevision).toEqual({ red: 0, green: 800 });

    // The FPS meter: a box and a bar per frame (4 + 60 segments), from x -22.9 to -12.7 and y
    // -16.6 to -6.4 of a square 48 across - whatever the image's shape.
    const px = (x: number) => (x + 24) / 48 * r.width;
    const py = (y: number) => (24 - y) / 48 * r.height;
    expect(r.fps.segments).toBe(64);
    expect(Math.abs(r.fps.left - px(-22.9))).toBeLessThanOrEqual(1.5);
    expect(Math.abs(r.fps.right - px(-12.7))).toBeLessThanOrEqual(1.5);
    expect(Math.abs(r.fps.top - py(-6.4))).toBeLessThanOrEqual(1.5);
    expect(Math.abs(r.fps.bottom - py(-16.6))).toBeLessThanOrEqual(1.5);

    // Measuring lines between (-10, 0) and (10, -8) of the 48-unit screen frame (y down): 4 box
    // sides a point and the joining line.
    expect(r.measure.segments).toBe(9);
    expect(Math.abs(r.measure.left - px(-10.3))).toBeLessThanOrEqual(2);
    expect(Math.abs(r.measure.right - px(10.3))).toBeLessThanOrEqual(2);
    expect(Math.abs(r.measure.top - py(8.3))).toBeLessThanOrEqual(2);
    expect(Math.abs(r.measure.bottom - py(-0.3))).toBeLessThanOrEqual(2);
});
