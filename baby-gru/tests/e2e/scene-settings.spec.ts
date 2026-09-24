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

        // Moving the view is the one setting whose sign can be wrong while everything still
        // looks plausible, so it is checked two ways: the picture, and the number behind it.
        //
        // The shift is RELATIVE to wherever loading the molecule left the view, and small. An
        // absolute origin sends the camera to a fixed point in space that the molecule is
        // nowhere near, and the baseline records an empty canvas - which then passes whatever
        // the code does, because there is nothing in it to be wrong. Relative keeps the
        // molecule in frame by construction, at whatever scale it happens to be.
        //
        // Asymmetric on all three axes, and not a permutation of itself, so that a sign error,
        // a pair of axes swapped, or a shift applied to the wrong axis each change the picture.
        const before = await moorhen.getSceneSettings();
        const shifted: [number, number, number] = [
            before.origin[0] + 6.0,
            before.origin[1] - 10.0,
            before.origin[2] + 3.0,
        ];

        await moorhen.callInstanceMethod("sceneSettings.setOrigin", shifted);
        await moorhen.waitForWebGLRenderSettle({ minSettleMs: 50, timeoutMs: 20_000 });

        // The store should hold exactly what it was handed: setOrigin takes the stored
        // convention and must not transform it.
        const moved = await moorhen.getSceneSettings();
        expect(moved.origin[0]).toBeCloseTo(shifted[0], 5);
        expect(moved.origin[1]).toBeCloseTo(shifted[1], 5);
        expect(moved.origin[2]).toBeCloseTo(shifted[2], 5);
        expect(moved.origin).not.toEqual(before.origin);

        await moorhen.assertPageScreenshotBaseline({
            snapshotName: "setOrigin.png",
            canvasOnly: true,
            centerCrop: { width: 300, height: 300 },
            snapshotSubfolder: "scene-settings",
        });

        // ...and putting it back really does put it back, so the checks above cannot be passing
        // because the view never moved at all.
        await moorhen.callInstanceMethod("sceneSettings.resetSceneSettings");
        await moorhen.waitForWebGLRenderSettle({ minSettleMs: 50, timeoutMs: 20_000 });
        const reset = await moorhen.getSceneSettings();
        expect(reset.origin).not.toEqual(moved.origin);
    });

    test("centring on a coordinate centres on that coordinate", async ({ page }) => {
        test.setTimeout(120_000);

        const moorhen = await startAndGetInstance(page);
        await moorhen.loadFiles([{ url: "/tests/test_data/5a3h.pdb", filename: "5a3h.pdb" }]);
        await moorhen.waitForWebGLRenderSettle({ minSettleMs: 50, timeoutMs: 20_000 });

        // centerOnCoordinate is documented as taking the world-space point to centre on, so
        // the stored origin - which is the negative of that point - must come back negated.
        // Asserted on the public method rather than on setOrigin, because that is the promise
        // made to anyone using the package.
        await moorhen.callInstanceMethod("centerOnCoordinate", 5.0, -11.0, 23.0);
        await moorhen.waitForWebGLRenderSettle({ minSettleMs: 50, timeoutMs: 20_000 });

        const after = await moorhen.getSceneSettings();
        expect(after.origin).toEqual([-5.0, 11.0, -23.0]);
    });
});
