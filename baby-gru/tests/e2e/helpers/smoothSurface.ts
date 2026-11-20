import { expect, type Page } from "@playwright/test";
import { startAndGetInstance } from "./index";

/**
 * A molecular surface drawn the ordinary way is a smooth surface by default, made by the C++ in the
 * Coot worker (wasm_src/smooth-surface.cc) - or, with `gpu`, its field, the GPU finishing it
 * (smoothSurfaceSetting.gpu) - and without falling back to the plain M2T surface. Told apart by the one
 * "Smooth surface: ..." line logged.
 */
export async function checkDefaultSmoothSurface(page: Page, gpu = false): Promise<void> {
    const smoothLines: string[] = [];
    const warnings: string[] = [];
    page.on("console", message => {
        if (message.text().startsWith("Smooth surface:")) smoothLines.push(message.text());
        if (message.type() === "warning" && /smooth surface/i.test(message.text())) warnings.push(message.text());
    });

    const moorhen = await startAndGetInstance(page);
    await moorhen.loadFiles([{ url: "https://files.rcsb.org/download/1hck.pdb", filename: "1hck.pdb" }]);

    const report = await page.evaluate(async ({ targetId, gpu }) => {
        const host = document.getElementById(targetId) as any;
        const instance = await host.getMoorhenInstance();
        const molecule = instance.getMoleculeList()[0];
        const { smoothSurfaceSetting } = await import("/src/utils/smoothSurface.ts");
        smoothSurfaceSetting.gpu = gpu;
        await molecule.show("MolecularSurface");
        const representation = molecule.representations.find((r: any) => r.style === "MolecularSurface");
        const hasAdapter = !!(await (navigator as any).gpu?.requestAdapter?.().catch(() => null));
        return { buffers: representation?.buffers?.length ?? 0, hasAdapter };
    }, { targetId: moorhen.elementId, gpu });

    console.log(`default smooth surface: ${JSON.stringify(report)}; ${smoothLines.join(" | ")}`);
    expect(warnings, "no fallback to the plain M2T surface").toEqual([]);
    expect(report.buffers).toBeGreaterThan(0);
    expect(smoothLines.length).toBe(1);
    expect(smoothLines[0]).toMatch(gpu && report.hasAdapter ? /contour \(WebGPU\)/ : /contour \(C\+\+\)/);
}
