import { expect, test } from "@playwright/test";
import {
    startAndGetInstance,
} from "./helpers";
import { sleep } from "@/utils/utils";

test.describe("Moorhen Web Component file loading", () => {
    // Skipped, not deleted: this was committed mid-edit and has never been finished - see the
    // note at the end of the body. Skipping keeps the intent on record while letting Playwright
    // parse the file, which it has to do before it can discover any spec at all.
    test.skip("loads molecule and map via moorhenInstance.files.loadFiles and updates WebGL output", async ({ page }) => {
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
        // Unfinished. The call here was left open with no button named - `buttonClick(" "` -
        // and the statement never closed, which is a parse error. Left un-guessed rather than
        // completed with an invented label, since only the author knows what this was meant to
        // reproduce.
    });
});
