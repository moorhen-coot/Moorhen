import { expect, test } from "@playwright/test";
import {
    startAndGetInstance,
} from "./helpers";
import { sleep } from "@/utils/utils";

test.describe("Moorhen Web Component file loading", () => {
    test("loads molecule and map via moorhenInstance.files.loadFiles and updates WebGL output", async ({ page }) => {
        test.setTimeout(180_000);

        const moorhen = await startAndGetInstance(page);
        const beforeCounts = await moorhen.getObjectCounts();
        const beforeGl = await moorhen.getWebGLStats();
        await moorhen.buttonClick("File Menu");
        await moorhen.buttonClick("Load tutorial data...");
        await moorhen.buttonClick("Load Tutorial OK")
                await moorhen.waitForWebGLRenderSettle({
            minSettleMs: 50,
            timeoutMs: 20_000,
        });

        await moorhen.buttonClick("Validation Menu");
        await moorhen.buttonClick("Fill partial residues...");
        await sleep(200);
        await moorhen.buttonClick(" "



            });
});
