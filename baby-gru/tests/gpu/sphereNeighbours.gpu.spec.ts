import { expect, test } from "@playwright/test";
import { resultOrSkip, runGpuCase } from "./helpers/gpuPage";
import type { NeighbourReport } from "./cases/sphereNeighbours.case";

test("perfect spheres' neighbour lists: every overlapping sphere, or the most overlapped", async ({ page }) => {
    const reports = resultOrSkip(await runGpuCase<NeighbourReport[]>(page, "sphereNeighbours.case.ts"));
    console.log(`sphere neighbours: ${JSON.stringify(reports)}`);
    for (const r of reports) {
        expect(r.listed, r.label).toBeGreaterThan(r.spheres * 4);
        expect(r.overfull, r.label).toBeGreaterThan(0);
        expect(r.wrong, `${r.label}: ${r.example}`).toBe(0);
    }
});
