import { expect, test } from "@playwright/test";
import { startAndGetInstance } from "./helpers/webcomponent";

test.describe("Moorhen Web Component scene settings", () => {
    test("updates scene settings via moorhenInstance.sceneSettings", async ({ page }) => {
        test.setTimeout(120_000);

        const moorhen = await startAndGetInstance(page);

        await moorhen.loadFiles([
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

        await moorhen.waitForWebGLRenderSettle({
            minSettleMs: 500,
            timeoutMs: 20_000,
        });

        await moorhen.assertPageScreenshotBaseline({
            snapshotName: "base-interface-light.png",
        });

         await moorhen.callInstanceMethod("sceneSettings.setBackgroundColor", [0.22, 0.22, 0.32, 1]);
        await moorhen.assertPageScreenshotBaseline({
            snapshotName: "base-interface-dark.png",
        });
    });
});
