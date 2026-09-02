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
        ]);

        await moorhen.waitForWebGLRenderSettle({
            minSettleMs: 50,
            timeoutMs: 20_000,
        });

        await moorhen.assertPageScreenshotBaseline({
            snapshotName: "default.png",
            canvasOnly: true,
            centerCrop: { width: 300, height: 300 },
            snapshotSubfolder: 'scene-settings',
        });


        const testSceneSetting = async (setting: string, arg?: unknown, settleMs = 50) => {
            await moorhen.callInstanceMethod(`sceneSettings.${setting}`, arg);
            await moorhen.waitForWebGLRenderSettle({
                minSettleMs: settleMs,
                timeoutMs: 20_000,
            });
            await moorhen.assertPageScreenshotBaseline({
                snapshotName: `${setting}.png`,
                canvasOnly: true,
                centerCrop: { width: 300, height: 300 },
                snapshotSubfolder: 'scene-settings',
            });
            await moorhen.callInstanceMethod("sceneSettings.resetSceneSettings");
        }


        await testSceneSetting("setBackgroundColor", [0.22, 0.22, 0.32, 1]);
        // await testSceneSetting("setDoSSAO", true, 250); //not reproducible unde chrome ?!

        await testSceneSetting("setDoEdgeDetect", true);
        await testSceneSetting("setDoPerspectiveProjection", true);
        await testSceneSetting("setUseOffScreenBuffers", true);
        await testSceneSetting("setAmbient", [0.0, 1.0, 0.0, 1.0]);
        await testSceneSetting("setDiffuse", [0.0, 1.0, 0.0, 1.0]);
        await testSceneSetting("setSpecular", [1.0, 0.0, 0.0, 1.0]);
        await testSceneSetting("setLightPosition", [-25.0, -25.0, 50.0, 1.0]);
        await testSceneSetting("setDoShadow", true);

    });
});
