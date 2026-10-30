import { expect, test } from "@playwright/test";
import { resultOrSkip, runGpuCase } from "./helpers/gpuPage";
import type { ShaderReport } from "./cases/shaders.case";

test("every WGSL module compiles in this browser", async ({ page }) => {
    const reports = resultOrSkip(await runGpuCase<ShaderReport[]>(page, "shaders.case.ts"));
    expect(reports.length).toBeGreaterThan(20);
    for (const report of reports) {
        expect(report.errors, report.name).toEqual([]);
    }
});
