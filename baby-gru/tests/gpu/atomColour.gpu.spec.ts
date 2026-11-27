import { expect, test } from "@playwright/test";
import { resultOrSkip, runGpuCase } from "./helpers/gpuPage";
import type { AtomColourReport } from "./cases/atomColour.case";

/** Per-pixel colour from the atoms (ATOM_COLOUR_WGSL): see cases/atomColour.case.ts. */
test("per-pixel colour from the atoms matches every atom visited on the CPU, at widths 0, 0.4 and 1, colours random and grouped", async ({ page }) => {
    const r = resultOrSkip(await runGpuCase<AtomColourReport>(page, "atomColour.case.ts", null));
    console.log(`Atom colour: ${JSON.stringify(r)}`);
    expect(r.points).toBe(3050);
    // Some points with no atom in band, all of them given the fallback.
    expect(r.fallbacks).toBeGreaterThan(50);
    expect(r.fallbackDiffers).toBe(0);
    for (const scheme of ["random", "grouped"]) for (const width of ["0", "0.4", "1"]) {
        expect(r.maxError[`${scheme} ${width}`], `${scheme} colours, width ${width}`).toBeLessThan(1e-4);
    }
});
