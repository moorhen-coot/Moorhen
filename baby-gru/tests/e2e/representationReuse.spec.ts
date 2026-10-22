import { expect, test } from "@playwright/test";
import { startAndGetInstance } from "./helpers";

/**
 * A molecule must keep one representation per style, not grow a new one per redraw.
 *
 * fetchIfDirtyAndDraw(), show() and hide() used to look their representation up by
 * comparing its cid against a hardcoded whole-molecule literal. The builder derives
 * the cid it actually stores from the style and its options, so the comparison never
 * matched: every redraw created another representation and left the previous one's
 * buffers in the scene. In Drag Atoms -- where each drop calls animateRefine(), which
 * ends in fetchIfDirtyAndDraw() -- that produced a ghost per drop.
 */
test.describe("molecule representation reuse", () => {
    test("redrawing a style reuses its representation instead of adding another", async ({ page }) => {
        test.setTimeout(240_000);

        const moorhen = await startAndGetInstance(page);
        await moorhen.loadFiles([{ url: "https://files.rcsb.org/download/1hck.pdb", filename: "1hck.pdb" }]);

        const counts = await page.evaluate(async targetId => {
            const host = document.getElementById(targetId) as any;
            const instance = await host.getMoorhenInstance();
            const molecule = instance.getMoleculeList()[0];
            const countCBs = () => molecule.representations.filter((r: any) => r.style === "CBs" && !r.isCustom).length;

            await molecule.fetchIfDirtyAndDraw("CBs");
            const afterFirst = countCBs();
            await molecule.fetchIfDirtyAndDraw("CBs");
            await molecule.fetchIfDirtyAndDraw("CBs");
            const afterThird = countCBs();

            // hide()/show() resolve the same representation, so they must find it too.
            molecule.hide("CBs");
            const hiddenVisible = molecule.representations.find((r: any) => r.style === "CBs" && !r.isCustom)?.visible;
            await molecule.show("CBs");
            const shownVisible = molecule.representations.find((r: any) => r.style === "CBs" && !r.isCustom)?.visible;
            const afterShowHide = countCBs();

            return { afterFirst, afterThird, hiddenVisible, shownVisible, afterShowHide };
        }, moorhen.elementId);

        console.log(`representation counts: ${JSON.stringify(counts)}`);

        expect(counts.afterFirst, "one non-custom CBs representation after the first draw").toBe(1);
        expect(counts.afterThird, "redrawing must not add representations").toBe(1);
        expect(counts.afterShowHide, "hide()/show() must not add representations").toBe(1);
        expect(counts.hiddenVisible, "hide() must find the representation and hide it").toBe(false);
        expect(counts.shownVisible, "show() must find the representation and show it").toBe(true);
    });

    test("drawing from a mesh reuses the representation fetchIfDirtyAndDraw uses", async ({ page }) => {
        test.setTimeout(240_000);

        const moorhen = await startAndGetInstance(page);
        await moorhen.loadFiles([{ url: "https://files.rcsb.org/download/1hck.pdb", filename: "1hck.pdb" }]);

        // Drag Atoms and animateRefine() draw each frame with drawWithStyleFromMesh() and
        // finish with fetchIfDirtyAndDraw(). If the two pick different representations,
        // the one not updated last stays on screen as a ghost when dragging stops.
        const counts = await page.evaluate(async targetId => {
            const host = document.getElementById(targetId) as any;
            const instance = await host.getMoorhenInstance();
            const molecule = instance.getMoleculeList()[0];
            const countCBs = () => molecule.representations.filter((r: any) => r.style === "CBs" && !r.isCustom).length;

            await molecule.fetchIfDirtyAndDraw("CBs");
            const afterFetch = countCBs();
            await molecule.drawWithStyleFromMesh("CBs", []);
            await molecule.drawWithStyleFromMesh("CBs", []);
            const afterMesh = countCBs();
            await molecule.fetchIfDirtyAndDraw("CBs");
            const afterFinal = countCBs();

            return { afterFetch, afterMesh, afterFinal };
        }, moorhen.elementId);

        console.log(`representation counts: ${JSON.stringify(counts)}`);

        expect(counts.afterFetch).toBe(1);
        expect(counts.afterMesh, "drawWithStyleFromMesh must reuse the existing representation").toBe(1);
        expect(counts.afterFinal, "the final redraw must not add a representation").toBe(1);
    });
});
