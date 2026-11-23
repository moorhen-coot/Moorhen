import { expect, test } from "@playwright/test";
import { resultOrSkip, runGpuCase } from "./helpers/gpuPage";
import type { ScanReport } from "./cases/scan.case";

// Either side of a 2048-element block, of 2048 blocks (a second level of recursion), and large.
const SIZES = [1, 7, 2047, 2048, 2049, 4_194_303, 4_194_305, 5_000_001];

test("GpuScan matches a plain prefix sum", async ({ page }) => {
    const reports = resultOrSkip(await runGpuCase<ScanReport[]>(page, "scan.case.ts", SIZES));
    for (const report of reports) {
        expect(report.firstDifference, `n = ${report.n}`).toBe(-1);
        expect(report.gpuTotal, `n = ${report.n}`).toBe(report.cpuTotal);
    }
});
