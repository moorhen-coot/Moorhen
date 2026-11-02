import { expect, test } from "@playwright/test";
import { resultOrSkip, runGpuCase } from "./helpers/gpuPage";
import type { DragAndShapesReport } from "./cases/dragAndShapes.case";

test("dragged buffers are drawn where the drag puts them; textured shapes through their ramp", async ({ page }) => {
    const r = resultOrSkip(await runGpuCase<DragAndShapesReport>(page, "dragAndShapes.case.ts"));
    expect(r.rendererErrors).toEqual([]);

    // Dragged on the GPU or moved on the CPU: the same pixels covered (the dragged one glows, so
    // only coverage is compared), for meshes, spheres and lines - which must stay as wide.
    for (const m of [r.mesh, r.spheres, r.lines]) {
        expect(m.drawn).toBeGreaterThan(100);
        expect(m.differ).toBeLessThanOrEqual(m.drawn * 0.01);
    }
    expect(r.meshMoved).toBeGreaterThan(500);

    // Each texel's value, through a black-to-white ramp of 256, nearest texel and nearest colour.
    expect(r.shape.drawn).toBe(1);
    r.shape.got.forEach((grey, i) => expect(Math.abs(grey - r.shape.expected[i])).toBeLessThanOrEqual(1));
});
