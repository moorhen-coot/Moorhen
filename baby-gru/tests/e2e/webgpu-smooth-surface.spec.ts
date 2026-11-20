import { expect, test } from "@playwright/test";
import { startAndGetInstance } from "./helpers";
import { checkDefaultSmoothSurface } from "./helpers/smoothSurface";

/**
 * With smoothSurfaceSetting.gpu, where WebGPU is there, the smooth surface is finished on the GPU: the
 * C++ makes the field in the Coot worker, the GPU the contour, split, normals and vertex atoms
 * (src/WebGPUComponents/smoothSurface). The same surface as the C++ makes all by itself.
 */
test("with gpu on, the smooth surface is finished on the GPU", async ({ page }) => {
    test.setTimeout(240_000);
    await checkDefaultSmoothSurface(page, true);
});

test("the GPU finishes the same surface the C++ makes", async ({ page }) => {
    test.setTimeout(240_000);
    const lines: string[] = [];
    page.on("console", message => {
        if (message.text().startsWith("Smooth surface:")) lines.push(message.text());
    });
    const moorhen = await startAndGetInstance(page);
    await moorhen.loadFiles([{ url: "https://files.rcsb.org/download/1hck.pdb", filename: "1hck.pdb" }]);
    const result = await page.evaluate(async targetId => {
        const host = document.getElementById(targetId) as any;
        const instance = await host.getMoorhenInstance();
        const molecule = instance.getMoleculeList()[0];
        const { smoothSurfaceSetting } = await import("/src/utils/smoothSurface.ts");
        const sizes = (rep: any) => {
            const buffer = rep.buffers.find((b: any) => b.triangleColours?.[0]?.length === 4 * rep.smoothColouring.vertex.atom.length);
            return { vertices: rep.smoothColouring.vertex.atom.length, triangles: rep.smoothColouring.indices.length / 3, hasBuffer: !!buffer };
        };
        smoothSurfaceSetting.gpu = true;
        smoothSurfaceSetting.gpuOnSoftware = true;
        await molecule.show("MolecularSurface");
        const representation = molecule.representations.find((r: any) => r.style === "MolecularSurface");
        const gpu = sizes(representation);
        smoothSurfaceSetting.gpu = false;
        await representation.redraw();
        const cpp = sizes(representation);
        return { gpu, cpp };
    }, moorhen.elementId);
    console.log(`GPU and C++ surfaces: ${JSON.stringify(result)}\n${lines.join("\n")}`);
    expect(lines[0]).toMatch(/contour \(WebGPU\)/);
    expect(lines[1]).toMatch(/contour \(C\+\+\)/);
    expect(result.gpu.hasBuffer).toBe(true);
    expect(result.gpu.vertices).toBe(result.cpp.vertices);
    expect(result.gpu.triangles).toBe(result.cpp.triangles);
});
