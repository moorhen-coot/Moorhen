import { expect, test } from "@playwright/test";
import { startAndGetInstance, waitForWebGLRenderSettle } from "./helpers";

test.describe("Moorhen Web Component API", () => {
    test("loads tutorial data via moorhenInstance and fills partial residues", async ({ page }) => {
        test.setTimeout(180_000);

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

        const moorhen = await startAndGetInstance(page);
        // The instance proxy IS the application API: call methods directly,
        // read properties with `await`, iterate lists with `for await`.
        const moorhenInstance = await moorhen.getInstance();

        await moorhen.buttonClick("File Menu");
        await moorhen.buttonClick("Load tutorial data...");
        await moorhen.buttonClick("Load Tutorial OK");

        // Wait for the tutorial data to load and ensure the first
        await waitForWebGLRenderSettle(page, {
                    elementId: moorhen.elementId,
                    minSettleMs: 50,
                    timeoutMs: 20_000,
                });
        

        // molecule (2107 atoms) is present.
        await expect.poll(() => moorhenInstance.getMoleculeList()[0]?.getNumberOfAtoms(), { timeout: 2_000 }).toBe(2107);


        // Filling partial residues should add atoms to the generated structure.
        await navigate([
            "Validation Menu",
            "Fill partial residues...",
            "wait 250",
            "View /1/A/167/",
            "Fill /1/A/167/",
        ]);
        await expect.poll(() => moorhenInstance.getMoleculeList()[0]?.getNumberOfAtoms(), { timeout: 2_000 }).toBe(2116);
        await moorhen.buttonClick("Close fill-partial-residues");

        await navigate([
            "Edit Menu",
            "Add/Remove hydrogen atoms...",
            "Add hydrogen atoms",
        ]);
        await expect.poll(() => moorhenInstance.getMoleculeList()[0]?.getNumberOfAtoms(), { timeout: 2_000 }).toBe(4265);


        await navigate([
            "Edit Menu",
            "Add/Remove hydrogen atoms...",
            "Remove hydrogen atoms",
        ]);

        await expect.poll(() => moorhenInstance.getMoleculeList()[0]?.getNumberOfAtoms(), { timeout: 2_000 }).toBe(2116);

        await navigate([
            "Edit Menu",
            "Add simple...",
            "wait 250",
        ]);

        // The Add Simple dialog renders a MoorhenSelect labelled "Add..."
        // inside the shadow DOM. Grab it via the label -> select association
        // and choose PO4 before confirming.
        const addTypeSelect = page.locator("#moorhen-test").getByLabel("Add...");
        await expect(addTypeSelect).toBeVisible();
        await addTypeSelect.selectOption("PO4");
        await expect(addTypeSelect).toHaveValue("PO4");
        await moorhen.buttonClick("Add simple molecule");

        await expect.poll(() => moorhenInstance.getMoleculeList()[0]?.getNumberOfAtoms(), { timeout: 2_000 }).toBe(2121);

        await navigate([
            "Calculate Menu",
            "Add Water...",
            "Add Waters"]);
        await expect.poll(() => moorhenInstance.getMoleculeList()[0]?.getNumberOfAtoms(), { timeout: 2_000 }).toBe(2171);
    })  
});
