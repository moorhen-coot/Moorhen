import { expect, test } from "@playwright/test";
import { startAndGetInstance } from "./helpers/webcomponent";

test.describe("Moorhen Web Component scene settings", () => {
    test("updates scene settings via moorhenInstance.sceneSettings", async ({ page }) => {
        test.setTimeout(120_000);

        const moorhen = await startAndGetInstance(page);
        const before = await moorhen.getSceneSettings();

        const targetDrawAxes = !before.drawAxes;
        const targetPerspective = !before.doPerspectiveProjection;
        const targetOutline = !before.doOutline;
        const targetBackground: [number, number, number, number] = [0.22, 0.28, 0.36, 1];

        await moorhen.callInstanceMethod("sceneSettings.setDrawAxes", targetDrawAxes);
        await moorhen.callInstanceMethod("sceneSettings.setDoPerspectiveProjection", targetPerspective);
        await moorhen.callInstanceMethod("sceneSettings.setDoOutline", targetOutline);
        await moorhen.callInstanceMethod("sceneSettings.setBackgroundColor", targetBackground);

        await moorhen.waitForWebGLRenderSettle({
            minSettleMs: 500,
            timeoutMs: 20_000,
        });

        const after = await moorhen.getSceneSettings();

        expect(after.drawAxes).toBe(targetDrawAxes);
        expect(after.doPerspectiveProjection).toBe(targetPerspective);
        expect(after.doOutline).toBe(targetOutline);
        expect(after.backgroundColor).toEqual(targetBackground);

        await moorhen.assertPageScreenshotBaseline({
            snapshotName: "scene-settings-toggles-full-window.png",
        });
    });
});
