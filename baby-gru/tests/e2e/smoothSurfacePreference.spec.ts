import { expect, test } from "@playwright/test";
import { startAndGetInstance } from "./helpers";

/**
 * The "Use Moorhen smooth surfaces" preference (generalStates.useSmoothSurface, on by default):
 * changing it redraws the surfaces on screen (StoreSync "smooth surfaces"), as M2T's surface when
 * off and Moorhen's smooth one when on. A smooth surface made from the atoms keeps smoothColouring;
 * an M2T one does not.
 */
test("the smooth surface preference switches the surfaces on screen", async ({ page }) => {
    test.setTimeout(120_000);
    const moorhen = await startAndGetInstance(page);
    await moorhen.loadFiles([{ url: "/tests/test_data/5a3h.pdb", filename: "5a3h.pdb" }]);

    const result = await page.evaluate(async targetId => {
        const host = document.getElementById(targetId) as any;
        const instance = await host.getMoorhenInstance();
        const molecule = instance.getMoleculeList()[0];
        await molecule.show("MolecularSurface");
        const representation = molecule.representations.find((r: any) => r.style === "MolecularSurface");
        const smooth = () => representation.smoothColouring !== null;
        // Waits for the store sync's redraw: the surface's kind changes when it is done.
        const until = async (wanted: boolean) => {
            for (let i = 0; i < 300 && smooth() !== wanted; i++) await new Promise(resolve => setTimeout(resolve, 100));
            return smooth();
        };
        const byDefault = smooth();
        instance.store.dispatch({ type: "generalStates/setUseSmoothSurface", payload: false });
        const off = await until(false);
        instance.store.dispatch({ type: "generalStates/setUseSmoothSurface", payload: true });
        const on = await until(true);
        return { byDefault, off, on };
    }, moorhen.elementId);

    console.log(`preference: ${JSON.stringify(result)}`);
    expect(result).toEqual({ byDefault: true, off: false, on: true });
});
