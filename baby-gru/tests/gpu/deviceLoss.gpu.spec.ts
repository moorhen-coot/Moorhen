import { expect, test } from "@playwright/test";
import { resultOrSkip, runGpuCase } from "./helpers/gpuPage";
import type { DeviceLossReport } from "./cases/deviceLoss.case";

test("a lost device is reported as lost, and a renderer made after it draws on a new one", async ({ page }) => {
    const r = resultOrSkip(await runGpuCase<DeviceLossReport>(page, "deviceLoss.case.ts"));
    console.log(`device loss: ${JSON.stringify(r)}`);
    expect(r.lost.length).toBe(1);
    expect(r.errors).toEqual([]);
    expect(r.newDevice).toBe(true);
    expect(r.drawnBefore).toBeGreaterThan(1000);
    expect(r.drawnAfter).toBe(r.drawnBefore);
    expect(r.worst).toBe(0);
});
