import { expect, test } from "@playwright/test";
import { resultOrSkip, runGpuCase } from "./helpers/gpuPage";
import type { PreviewReport } from "./cases/preview.case";

test("the preview draws meshes, chunked meshes and GPU map contours in every style", async ({ page }) => {
    const r = resultOrSkip(await runGpuCase<PreviewReport>(page, "preview.case.ts"));
    expect(r.rendererErrors).toEqual([]);
    expect(r.background).toBe(0);
    expect(r.mesh).toBeGreaterThan(200);
    // In chunks, the same octahedron: the same pixels, give or take antialiasing.
    expect(r.chunkedMeshDrawn).toBe(true);
    // StrictMode's double mount: the surviving renderer still draws.
    expect(r.overlapError).toBeNull();
    expect(r.overlapMesh).toBe(r.mesh);
    expect(Math.abs(r.meshChunked - r.mesh)).toBeLessThanOrEqual(r.mesh * 0.02);
    expect(r.surface).toBeGreaterThan(200);
    expect(r.lines).toBeGreaterThan(50);
    expect(r.litLines).toBeGreaterThan(50);
    // The line width is applied (half-width 0.04 x zoom x width^2 A, as WebGL's thick lines).
    expect(r.thinLines).toBeGreaterThan(20);
    expect(r.thinLines).toBeLessThan(r.lines * 0.8);
});
