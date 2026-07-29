import { expect, test } from "@playwright/test";
import { startAndGetInstance } from "./helpers";


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

        await moorhen.waitForWebGLRenderSettle({
            minSettleMs: 50,
            timeoutMs: 20_000,
        });

        await moorhen.assertPageScreenshotBaseline({
            snapshotName: "default.png",
            canvasOnly: true,
            centerCrop: { width: 200, height: 200 },
            snapshotSubfolder: 'scene-settings',
        });


        const testSceneSetting = async (setting: string, arg: unknown[]) => {
            await moorhen.callInstanceMethod(`sceneSettings.${setting}`, arg);
            await moorhen.buttonClick("File Menu");
            await moorhen.waitForWebGLRenderSettle({
                minSettleMs: 25,
                timeoutMs: 20_000,
            });
            await moorhen.assertPageScreenshotBaseline({
                snapshotName: `${setting}.png`,
                canvasOnly: true,
                centerCrop: { width: 200, height: 200 },
                snapshotSubfolder: 'scene-settings',
                compareWithSnapshot: 'default',
            });
            await moorhen.callInstanceMethod("sceneSettings.resetSceneSettings");
            await moorhen.waitForWebGLRenderSettle({
            minSettleMs: 50,
            timeoutMs: 20_000,
        });
        }


        await testSceneSetting("setBackgroundColor", [0.22, 0.22, 0.32, 1]);
        
        await moorhen.assertPageScreenshotBaseline({
            snapshotName: "reset.png",
            canvasOnly: true,
            centerCrop: { width: 200, height: 200 },
            snapshotSubfolder: 'scene-settings',
        });

        // await testSceneSetting("setAmbient" , [1,0,0,1]);
        // await testSceneSetting("resetSceneSettings", null);


    });
});
