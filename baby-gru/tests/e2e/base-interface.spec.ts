import { test } from "@playwright/test";
import { assertPageScreenshotBaseline, startAndGetInstance, waitForWebGLRenderSettle } from "./helpers";

test.describe("Moorhen Web Component scene settings", () => {
    test("updates scene settings via moorhenInstance.sceneSettings", async ({ page }) => {
        test.setTimeout(120_000);

        const moorhen = await startAndGetInstance(page);
        const mi = await moorhen.getInstance();

        await mi.files.loadFiles([
            {
                url: "/tests/test_data/5a3h.pdb",
                filename: "5a3h.pdb",
            },
            {
                url: "/tests/test_data/5a3h_sigmaa.mtz",
                filename: "5a3h_sigmaa.mtz",
            },
        ]);

        await moorhen.buttonClick("Open Models Panel");
        await moorhen.buttonClick("Open Maps Panel");
        await moorhen.buttonClick("File Menu");

        await waitForWebGLRenderSettle(page, {
            elementId: moorhen.elementId,
            minSettleMs: 500,
            timeoutMs: 20_000,
        });

        await assertPageScreenshotBaseline(page, {
            snapshotName: "base-interface-light.png",
        });

        await mi.sceneSettings.setBackgroundColor([0.22, 0.22, 0.32, 1]);
        await assertPageScreenshotBaseline(page, {
            snapshotName: "base-interface-dark.png",
        });
    });
});
