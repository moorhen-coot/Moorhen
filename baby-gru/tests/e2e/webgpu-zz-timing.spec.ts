// TEMPORARY: main-thread timings after a GPU smooth surface (delete).
import { test } from "@playwright/test";
import { startAndGetInstance } from "./helpers";

test("timing 3j2w", async ({ page }) => {
    test.setTimeout(900_000);
    const lines: string[] = [];
    page.on("console", m => { const t = m.text(); if (t.startsWith("TIMING") || t.startsWith("Smooth surface:") || t.startsWith("LONGTASK")) lines.push(t); });
    const moorhen = await startAndGetInstance(page);
    await moorhen.loadFiles([{ url: "/tests/test_data/3j2w.pdb", filename: "3j2w.pdb" }]);
    await page.evaluate(async targetId => {
        new PerformanceObserver(list => { for (const e of list.getEntries()) if (e.duration > 50) console.log(`LONGTASK ${e.duration.toFixed(0)} ms`); })
            .observe({ type: "longtask", buffered: false });
        const host = document.getElementById(targetId) as any;
        const instance = await host.getMoorhenInstance();
        const molecule = instance.getMoleculeList()[0];
        const { smoothSurfaceSetting } = await import("/src/utils/smoothSurface.ts");
        smoothSurfaceSetting.gpu = true;
        smoothSurfaceSetting.gpuOnSoftware = true;
        console.log("LONGTASK --- start");
        await molecule.show("MolecularSurface");
        console.log("LONGTASK --- shown");
        await new Promise(r => setTimeout(r, 3000));
    }, moorhen.elementId);
    console.log(lines.join("\n"));
});
