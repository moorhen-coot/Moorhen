import { expect, test } from "@playwright/test";
import { assertPageScreenshotBaseline, startAndGetInstance, waitForWebGLRenderSettle } from "./helpers";

test.describe("Moorhen Web Component API", () => {
    test("loads tutorial data via moorhenInstance and fills partial residues", async ({ page }) => {
        test.setTimeout(180_000);

        const moorhen = await startAndGetInstance(page);
        const moorhenInstance = await moorhen.getInstance();

        const navigate = async (steps: string[]) => {
            for (const step of steps) {
                if (step.startsWith("wait ")) {
                    const waitTime = parseInt(step.split(" ")[1], 10);
                    await page.waitForTimeout(waitTime);
                    continue;
                }
                await moorhen.buttonClick(step);
            }
        };

        await moorhenInstance.files.loadFiles([
            "/tests/test_data/LigandTest/00Z.cif",
            "/tests/test_data/LigandTest/refmacat.mtz",
            "/tests/test_data/LigandTest/refmacat.pdb",
        ]);

        await waitForWebGLRenderSettle(page, {
            elementId: moorhen.elementId,
            minSettleMs: 1_500,
            timeoutMs: 30_000,
        });

        await assertPageScreenshotBaseline(page, {
            snapshotName: "load-ligand.png",
            // canvasOnly: true,
        });

        await moorhenInstance.sceneSettings.setOrigin([25, -7, 15]);
        await moorhenInstance.sceneSettings.setZoom(0.35);

        await assertPageScreenshotBaseline(page, {
            snapshotName: "load-ligand.png",
            // canvasOnly: true,
        });

        await navigate(["Ligand Menu", "Find ligand...", "wait 250", "Find ligand"]);

        await expect
            .poll(
                () =>
                    page.evaluate(elementId => {
                        const host = document.getElementById(elementId);
                        const root = host?.shadowRoot;
                        return root?.textContent?.includes("Found 1 possible ligand") ?? false;
                    }, moorhen.elementId),
                { timeout: 10_000 }
            )
            .toBe(true);
        await assertPageScreenshotBaseline(page, {
            snapshotName: "found-ligand.png",
            // canvasOnly: true,
        });

        const molecule = await moorhenInstance.getMoleculeList().find(mol => mol.name === "refmacat");
        const atomsBefore = await molecule?.getNumberOfAtoms();
        expect(atomsBefore).toBe(749);
        await moorhen.buttonClick("Merge 00Z.cif fit. #1 to molecule")
        await page.waitForTimeout(1000)
        expect(await molecule?.getNumberOfAtoms()).toBe(atomsBefore + 40);
    });
});
