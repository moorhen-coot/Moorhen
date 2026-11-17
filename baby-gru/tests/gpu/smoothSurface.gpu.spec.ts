import { expect, test } from "@playwright/test";
import { readFileSync } from "fs";
import { join } from "path";
import { resultOrSkip, runGpuCase } from "./helpers/gpuPage";
import type { ContourComparison, SmoothSurfaceArgs, SmoothSurfaceReport } from "./cases/smoothSurface.case";

function sameMesh(c: ContourComparison): void {
    expect(c.cpuVertices).toBeGreaterThan(1000);
    expect(c.gpuVertices).toBe(c.cpuVertices);
    expect(c.gpuTriangles).toBe(c.cpuTriangles);
    expect(c.unmatchedVertices).toBe(0);
    expect(c.sameTriangles).toBe(c.cpuTriangles);
    // The same float32 division, a couple of ulps apart at most, scaled by a 0.4 A cell.
    expect(c.maxPositionError).toBeLessThan(1e-4);
}

test("the smooth surface's GPU marching cubes match the CPU's (1df7)", async ({ page }) => {
    const pdbLines = readFileSync(join(__dirname, "../test_data/1df7.pdb"), "utf8").split("\n")
        .filter(line => /^(ATOM|HETATM)/.test(line) && line.slice(17, 20) !== "HOH");
    const args: SmoothSurfaceArgs = { pdbLines };
    const r = resultOrSkip(await runGpuCase<SmoothSurfaceReport>(page, "smoothSurface.case.ts", args));
    sameMesh(r.oneSlab);
    expect(r.oneSlab.slabs).toBe(1);
    sameMesh(r.manySlabs);
    expect(r.manySlabs.slabs).toBeGreaterThan(3);
    sameMesh(r.retried);
    expect(r.retried.retries).toBeGreaterThan(0);
});
