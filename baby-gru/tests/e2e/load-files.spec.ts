import { expect, test } from "@playwright/test";
import {
    startAndGetInstance,
} from "./helpers";

test.describe("Moorhen Web Component file loading", () => {
    test("loads molecule and map via moorhenInstance.files.loadFiles and updates WebGL output", async ({ page }) => {
        test.setTimeout(180_000);

        const moorhen = await startAndGetInstance(page);
        const beforeCounts = await moorhen.getObjectCounts();
        const beforeGl = await moorhen.getWebGLStats();

        const loaded = await moorhen.loadFiles([
            {
                url: "/tests/test_data/5a3h.pdb",
                filename: "5a3h.pdb",
            },
            {
                url: "/tests/test_data/5a3h_sigmaa.mtz",
                filename: "5a3h_sigmaa.mtz",
            },
        ]);

        expect(loaded).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ type: "molecule", fileName: "5a3h.pdb" }),
                expect.objectContaining({ type: "map", fileName: "5a3h_sigmaa.mtz" }),
            ])
        );

        await expect
            .poll(async () => {
                const counts = await moorhen.getObjectCounts();
                return counts.moleculeCount > beforeCounts.moleculeCount && counts.mapCount > beforeCounts.mapCount;
            }, { timeout: 120_000 })
            .toBe(true);

        const settledGl = await moorhen.waitForWebGLRenderSettle({
            minSettleMs: 1_500,
            minDisplayBufferCount: beforeGl.displayBufferCount + 1,
            timeoutMs: 30_000,
        });

        const afterCounts = await moorhen.getObjectCounts();
        const afterGl = await moorhen.getWebGLStats();

        expect(afterCounts.moleculeCount).toBeGreaterThan(beforeCounts.moleculeCount);
        expect(afterCounts.mapCount).toBeGreaterThan(beforeCounts.mapCount);
        expect(afterGl.displayBufferCount).toBeGreaterThan(beforeGl.displayBufferCount);

        // Visual expectation: render pipeline remains active and drawable content increased.
        expect(afterGl.readPixelsSucceeded).toBe(true);
        expect(afterGl.sampledPixels).toBeGreaterThan(0);
        expect(afterGl.drawingBufferWidth).toBeGreaterThan(0);
        expect(afterGl.drawingBufferHeight).toBeGreaterThan(0);
        expect(afterGl.displayBufferCount).toBeGreaterThan(beforeGl.displayBufferCount);
        expect(afterGl.uniqueColors).toBeGreaterThanOrEqual(beforeGl.uniqueColors);
        expect(settledGl.displayBufferCount).toBeGreaterThan(beforeGl.displayBufferCount);

        await moorhen.assertPageScreenshotBaseline({
            snapshotName: "5a3h-load-full-window.png",
            // canvasOnly: true,
        });
    });
});
