import { readFile } from "node:fs/promises";
import * as path from "node:path";
import { expect, test } from "@playwright/test";
import {
    assertPageScreenshotBaseline,
    getMoorhenObjectCounts,
    getWebGLCanvasStats,
    gotoWebComponentPage,
    loadFilesViaMoorhenInstance,
    waitForWebGLRenderSettle,
    waitForMoorhenReady,
} from "./helpers/webcomponent";

test.describe("Moorhen Web Component file loading", () => {
    test("loads molecule and map via moorhenInstance.files.loadFiles and updates WebGL output", async ({ page }) => {
        test.setTimeout(180_000);

        const host = await gotoWebComponentPage(page);
        await waitForMoorhenReady(page);

        const beforeCounts = await getMoorhenObjectCounts(page);
        const beforeGl = await getWebGLCanvasStats(page);

        const pdbPath = path.join(process.cwd(), "tests", "test_data", "5a3h.pdb");
        const mtzPath = path.join(process.cwd(), "tests", "test_data", "5a3h_sigmaa.mtz");
        const [pdbBytes, mtzBytes] = await Promise.all([readFile(pdbPath), readFile(mtzPath)]);

        const loadSummary = await loadFilesViaMoorhenInstance(page, [
            {
                name: "5a3h.pdb",
                mimeType: "chemical/x-pdb",
                bytes: Array.from(pdbBytes),
            },
            {
                name: "5a3h_sigmaa.mtz",
                mimeType: "application/octet-stream",
                bytes: Array.from(mtzBytes),
            },
        ]);

        expect(loadSummary.loadedTypes).toContain("molecule");
        expect(loadSummary.loadedTypes).toContain("map");
        expect(loadSummary.loadedFileNames).toEqual(expect.arrayContaining(["5a3h.pdb", "5a3h_sigmaa.mtz"]));

        await expect
            .poll(async () => {
                const counts = await getMoorhenObjectCounts(page);
                return counts.moleculeCount > beforeCounts.moleculeCount && counts.mapCount > beforeCounts.mapCount;
            }, { timeout: 120_000 })
            .toBe(true);

        const settledGl = await waitForWebGLRenderSettle(page, {
            minSettleMs: 1_500,
            minDisplayBufferCount: beforeGl.displayBufferCount + 1,
            timeoutMs: 30_000,
        });

        const afterCounts = await getMoorhenObjectCounts(page);
        const afterGl = await getWebGLCanvasStats(page);

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

        if (process.env.MOORHEN_E2E_DISABLE_STRICT_CANVAS_BASELINE !== "1") {
            await assertPageScreenshotBaseline(page, {
                snapshotName: "5a3h-load-full-window.png",
                fullPage: false,
            });
        }
    });
});
