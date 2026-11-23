import { expect, test } from "@playwright/test";
import { resultOrSkip, runGpuCase } from "./helpers/gpuPage";
import type { ContourCase, ContourReport } from "./cases/mapContour.case";

// A synthetic periodic map in a monoclinic cell (tests/gpu/reference/mapContourReference.ts).
const CASES: Record<string, ContourCase> = {
    "inside the cell": { em: false, centre: [12, 15, 18], radius: 9, level: 0.2, room: 0.2 },
    "across the cell edge (wraps)": { em: false, centre: [-3, 34, 2], radius: 10, level: 0.2, room: 0.2 },
    "a negative level": { em: false, centre: [12, 15, 18], radius: 9, level: -0.3, room: 0.2 },
    "a tiny first room (grows, made again)": { em: false, centre: [10, 18, 20], radius: 14, level: 0.0, room: 0.001 },
    "EM: clipped to the map's box": { em: true, centre: [-3, 34, 2], radius: 10, level: 0.2, room: 0.2 },
    // 167^3 points: more than 65535 workgroups for the per-point kernel, so the dispatch is folded.
    "a big box (folded dispatch)": { em: false, centre: [12, 15, 18], radius: 41.5, level: 0.2, room: 0.2 },
};

for (const [name, contourCase] of Object.entries(CASES)) {
    test(`map contour matches the CPU: ${name}`, async ({ page }) => {
        const r = resultOrSkip(await runGpuCase<ContourReport>(page, "mapContour.case.ts", contourCase));
        console.log(`map contour, ${name}: ${r.gpuTriangles} triangles, ${r.lines} lines (${(r.lines / (3 * r.gpuTriangles) * 100).toFixed(0)}% of 3 per triangle)`);
        expect(r.cpuTriangles).toBeGreaterThan(100);
        expect(r.gpuTriangles).toBe(r.cpuTriangles);
        expect(r.unmatchedMidpoints).toBe(0);
        expect(r.degenerate).toBe(0);
        expect(r.thickLineArgsOk).toBe(true);
        // Each edge once: about 1.5 per triangle on a closed surface, more where the sphere cuts it.
        expect(r.strayLines).toBe(0);
        expect(r.repeatedLines).toBe(0);
        expect(r.lines).toBe(r.edges);
        expect(r.lines).toBeLessThan(2 * r.gpuTriangles);
        expect(r.normalsChecked).toBeGreaterThan(r.gpuTriangles / 4);
        expect(r.normalsOff).toBe(0);
        if (contourCase.room < 0.01) expect(r.remade).toBeGreaterThan(0);
    });
}
