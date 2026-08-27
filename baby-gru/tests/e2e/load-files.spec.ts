import { expect, test } from "@playwright/test";
import {
    assertPageScreenshotBaseline,
    getWebGLCanvasStats,
    startAndGetInstance,
    waitForWebGLRenderSettle,
} from "./helpers";

test.describe("Moorhen Web Component file loading", () => {
    test("loads molecule and map via moorhenInstance.files.loadFiles and updates WebGL output", async ({ page }) => {
        test.setTimeout(180_000);

        const moorhen = await startAndGetInstance(page);
        const mi = await moorhen.getInstance();

        const beforeMoleculeCount = await mi.store.getState().molecules.moleculeList.length;
        const beforeGl = await getWebGLCanvasStats(page, moorhen.elementId);

        // Drive file loading through the application API directly. `await` on
        // the proxy JSON-serializes the LoadFilesResult so it is assertable.
        const loaded = await mi.files.loadFiles([
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
            .poll(
                async () => {
                    const moleculeCount = await mi.store.getState().molecules.moleculeList.length;
                    const mapCount = await mi.store.getState().maps.length;
                    return moleculeCount > beforeMoleculeCount && mapCount > 0;
                },
                { timeout: 120_000 }
            )
            .toBe(true);

        const settledGl = await waitForWebGLRenderSettle(page, {
            elementId: moorhen.elementId,
            minSettleMs: 1_500,
            minDisplayBufferCount: beforeGl.displayBufferCount + 1,
            timeoutMs: 30_000,
        });

        const afterGl = await getWebGLCanvasStats(page, moorhen.elementId);

        expect(afterGl.displayBufferCount).toBeGreaterThan(beforeGl.displayBufferCount);

        // Visual expectation: render pipeline remains active and drawable content increased.
        expect(afterGl.readPixelsSucceeded).toBe(true);
        expect(afterGl.sampledPixels).toBeGreaterThan(0);
        expect(afterGl.drawingBufferWidth).toBeGreaterThan(0);
        expect(afterGl.drawingBufferHeight).toBeGreaterThan(0);
        expect(afterGl.uniqueColors).toBeGreaterThanOrEqual(beforeGl.uniqueColors);
        expect(settledGl.displayBufferCount).toBeGreaterThan(beforeGl.displayBufferCount);

        await assertPageScreenshotBaseline(page, {
            snapshotName: "5a3h-load-full-window.png",
            // canvasOnly: true,
        });
    });
});
