import { test } from "@playwright/test";
import { assertPageScreenshotBaseline, startAndGetInstance, waitForWebGLRenderSettle } from "./helpers";


test.describe.skip("Moorhen Web Component scene settings", () => {
    test("updates scene settings via moorhenInstance.sceneSettings", async ({ page }) => {
        test.setTimeout(120_000);

        const moorhen = await startAndGetInstance(page);
        const mi = await moorhen.getInstance();

        await mi.files.loadFiles([
            {
                url: "/tests/test_data/5a3h.pdb",
                filename: "5a3h.pdb",
            },
        ]);

        await waitForWebGLRenderSettle(page, {
            elementId: moorhen.elementId,
            minSettleMs: 50,
            timeoutMs: 20_000,
        });

        await assertPageScreenshotBaseline(page, {
            snapshotName: "default.png",
            canvasOnly: true,
            centerCrop: { width: 300, height: 300 },
            snapshotSubfolder: 'scene-settings',
        });


        const sceneSettings = mi.sceneSettings as unknown as Record<string, (arg?: unknown) => unknown>;
        const testSceneSetting = async (setting: string, arg?: unknown, settleMs = 50) => {
            await sceneSettings[setting](arg);
            await waitForWebGLRenderSettle(page, {
                elementId: moorhen.elementId,
                minSettleMs: settleMs,
                timeoutMs: 20_000,
            });
            await assertPageScreenshotBaseline(page, {
                snapshotName: `${setting}.png`,
                canvasOnly: true,
                centerCrop: { width: 300, height: 300 },
                snapshotSubfolder: 'scene-settings',
            });
            await sceneSettings.resetSceneSettings();
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
