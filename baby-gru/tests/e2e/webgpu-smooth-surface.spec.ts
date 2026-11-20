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
        // Split, as the C++ splits: per-pixel shading leaves the contour unsplit (the next test).
        smoothSurfaceSetting.fieldShading = false;
        await molecule.show("MolecularSurface");
        const representation = molecule.representations.find((r: any) => r.style === "MolecularSurface");
        const gpu = sizes(representation);
        smoothSurfaceSetting.gpu = false;
        await representation.redraw();
        const cpp = sizes(representation);
        smoothSurfaceSetting.fieldShading = true;
        return { gpu, cpp };
    }, moorhen.elementId);
    console.log(`GPU and C++ surfaces: ${JSON.stringify(result)}\n${lines.join("\n")}`);
    expect(lines[0]).toMatch(/contour \(WebGPU\)/);
    expect(lines[1]).toMatch(/contour \(C\+\+\)/);
    expect(result.gpu.hasBuffer).toBe(true);
    expect(result.gpu.vertices).toBe(result.cpp.vertices);
    expect(result.gpu.triangles).toBe(result.cpp.triangles);
});

test("shaded per pixel: the field is kept, the surface unsplit, and WebGPU draws it lit as the split surface is", async ({ page }) => {
    test.setTimeout(240_000);
    const moorhen = await startAndGetInstance(page);
    await moorhen.loadFiles([{ url: "https://files.rcsb.org/download/1hck.pdb", filename: "1hck.pdb" }]);
    const result = await page.evaluate(async targetId => {
        const host = document.getElementById(targetId) as any;
        const instance = await host.getMoorhenInstance();
        const molecule = instance.getMoleculeList()[0];
        const { smoothSurfaceSetting } = await import("/src/utils/smoothSurface.ts");
        const { planPreview } = await import("/src/WebGPUComponents/previewScene.ts");
        smoothSurfaceSetting.gpu = true;
        smoothSurfaceSetting.gpuOnSoftware = true;
        smoothSurfaceSetting.fieldShading = true;
        await molecule.show("MolecularSurface");
        const representation = molecule.representations.find((r: any) => r.style === "MolecularSurface");
        const surfaceBuffer = () => representation.buffers.find((b: any) => b.triangleColours?.[0]?.length === 4 * representation.smoothColouring.vertex.atom.length);
        const shaded = surfaceBuffer();
        const field = shaded.fieldShading?.[0];
        const planned = planPreview(instance.store?.getState?.().glRef.displayBuffers ?? [shaded]).draws.find((d: any) => d.buffer === shaded);
        const shot = await instance.webGPU.snapshot({ width: 400, height: 300 });
        const shadedTriangles = shaded.triangleIndexs[0].length / 3;

        smoothSurfaceSetting.fieldShading = false;
        await representation.redraw();
        const split = surfaceBuffer();
        const splitShot = await instance.webGPU.snapshot({ width: 400, height: 300 });
        // The surface's pixels: those not the background's colour (the corner's).
        let diff = 0, lit = 0;
        for (let i = 0; i < shot.data.length; i += 4) {
            for (let c = 0; c < 3; c++) diff += Math.abs(shot.data[i + c] - splitShot.data[i + c]);
            if ([0, 1, 2].some(c => Math.abs(shot.data[i + c] - shot.data[c]) > 30)) lit++;
        }
        smoothSurfaceSetting.fieldShading = true;
        return {
            hasField: !!field && !field.buffer.destroyed, released: !!field?.released, dims: field?.dims,
            plannedWithField: planned?.fieldShading === field, shadedTriangles, splitTriangles: split.triangleIndexs[0].length / 3,
            splitHasField: !!split.fieldShading?.[0], meanDifference: diff / (3 * shot.width * shot.height), litFraction: lit / (shot.width * shot.height),
        };
    }, moorhen.elementId);
    console.log(`Per-pixel shading: ${JSON.stringify(result)}`);
    expect(result.hasField).toBe(true);
    expect(result.plannedWithField).toBe(true);
    // Redrawn with per-vertex normals: split, and the old field let go.
    expect(result.splitTriangles).toBe(4 * result.shadedTriangles);
    expect(result.splitHasField).toBe(false);
    expect(result.released).toBe(true);
    // The same surface, lit the same way to within shading detail: wrong normals (flipped, in the wrong
    // frame) would change most of the picture.
    expect(result.litFraction).toBeGreaterThan(0.1);
    expect(result.litFraction).toBeLessThan(0.95);
    expect(result.meanDifference).toBeLessThan(6);
});

test("coloured per pixel: the atoms are attached, drawn close to the vertex colours, and recoloured in place", async ({ page }) => {
    test.setTimeout(240_000);
    const moorhen = await startAndGetInstance(page);
    await moorhen.loadFiles([{ url: "https://files.rcsb.org/download/1hck.pdb", filename: "1hck.pdb" }]);
    const result = await page.evaluate(async targetId => {
        const host = document.getElementById(targetId) as any;
        const instance = await host.getMoorhenInstance();
        const molecule = instance.getMoleculeList()[0];
        const { smoothSurfaceSetting } = await import("/src/utils/smoothSurface.ts");
        smoothSurfaceSetting.gpu = true;
        smoothSurfaceSetting.gpuOnSoftware = true;
        smoothSurfaceSetting.fieldShading = true;
        smoothSurfaceSetting.pixelColours = true;
        // Colour rules with boundaries: everything blue, then every other run of 8 residues red.
        const template = molecule.defaultColourRules[0];
        const rule = (cid: string, colour: string) => {
            const r = Object.assign(Object.create(Object.getPrototypeOf(template)), template);
            r.isMultiColourRule = false;
            r.multiColourData = "";
            r.cid = cid;
            r.label = cid;
            r.color = colour;
            return r;
        };
        const stripes = [rule("/*/*/*/*:*", "#0000ff")];
        for (let start = 1; start < 300; start += 16) stripes.push(rule(`//A/${start}-${start + 7}`, "#ff0000"));
        molecule.defaultColourRules = stripes;
        await molecule.show("MolecularSurface");
        const representation = molecule.representations.find((r: any) => r.style === "MolecularSurface");
        const surfaceBuffer = () => representation.buffers.find((b: any) => b.triangleColours?.[0]?.length === 4 * representation.smoothColouring.vertex.atom.length);
        const size = { width: 400, height: 300 };
        const attached = !!surfaceBuffer().fieldShading?.[0]?.colouring;
        const shot = () => instance.webGPU.snapshot(size);
        const withPixelColours = async (on: boolean) => {
            smoothSurfaceSetting.pixelColours = on;
            await representation.redraw();
        };
        const pixel = await shot();
        await withPixelColours(false);
        const noColouring = !surfaceBuffer().fieldShading?.[0]?.colouring;
        const vertex = await shot();

        // Everything red, recoloured in place (no new surface): the per-pixel picture must follow.
        await withPixelColours(true);
        const buffer = surfaceBuffer();
        molecule.defaultColourRules = [rule("/*/*/*/*:*", "#ff0000")];
        const recoloured = await representation.recolour();
        const sameBuffer = surfaceBuffer() === buffer;
        const pixelRed = await shot();
        await withPixelColours(false);
        const vertexRed = await shot();

        // Half opaque: the opacity is the vertex colours' alpha, which the per-pixel colour keeps.
        representation.setNonCustomOpacity(0.5);
        const vertexHalf = await shot();
        await withPixelColours(true);
        representation.setNonCustomOpacity(0.5);
        const pixelHalf = await shot();
        // Recoloured again (the same rules): still half opaque.
        await representation.recolour();
        const pixelHalfRecoloured = await shot();
        smoothSurfaceSetting.pixelColours = true;

        // Over the surface's pixels: those not the background's colour (the corner's).
        const difference = (a: any, b: any) => {
            let diff = 0, covered = 0;
            for (let i = 0; i < a.data.length; i += 4) {
                if (![0, 1, 2].some(c => Math.abs(a.data[i + c] - a.data[c]) > 30)) continue;
                covered++;
                for (let c = 0; c < 3; c++) diff += Math.abs(a.data[i + c] - b.data[i + c]);
            }
            return { mean: diff / (3 * Math.max(1, covered)), covered: covered / (size.width * size.height) };
        };
        const striped = difference(pixel, vertex), allRed = difference(pixelRed, vertexRed);
        const half = difference(pixelHalf, vertexHalf), halfFromOpaque = difference(pixelRed, pixelHalf);
        const halfRecoloured = difference(pixelHalf, pixelHalfRecoloured);
        return {
            attached, noColouring, recoloured, sameBuffer, coveredFraction: striped.covered,
            stripedDifference: striped.mean, redDifference: allRed.mean,
            halfDifference: half.mean, halfFromOpaque: halfFromOpaque.mean, halfRecoloured: halfRecoloured.mean,
        };
    }, moorhen.elementId);
    console.log(`Per-pixel colour: ${JSON.stringify(result)}`);
    expect(result.attached).toBe(true);
    expect(result.noColouring).toBe(true);
    expect(result.coveredFraction).toBeGreaterThan(0.1);
    // Striped: close to the vertex colours (the same weights; only the boundaries are drawn finer), not identical.
    expect(result.stripedDifference).toBeGreaterThan(0.2);
    expect(result.stripedDifference).toBeLessThan(15);
    // All red, recoloured in place: the same picture either way - the per-pixel colours were updated.
    expect(result.recoloured).toBe(true);
    expect(result.sameBuffer).toBe(true);
    expect(result.redDifference).toBeLessThan(1);
    // Half opaque: see-through per pixel as per vertex.
    expect(result.halfFromOpaque).toBeGreaterThan(5);
    expect(result.halfDifference).toBeLessThan(1);
    expect(result.halfRecoloured).toBeLessThan(1);
});

test("the surface benchmark times every way of shading, then puts everything back", async ({ page }) => {
    test.setTimeout(480_000);
    // Small: SwiftShader shades the close-up's every pixel in software.
    await page.setViewportSize({ width: 640, height: 400 });
    const moorhen = await startAndGetInstance(page);
    await moorhen.loadFiles([{ url: "https://files.rcsb.org/download/1hck.pdb", filename: "1hck.pdb" }]);
    const result = await page.evaluate(async targetId => {
        const host = document.getElementById(targetId) as any;
        const instance = await host.getMoorhenInstance();
        const { smoothSurfaceSetting } = await import("/src/utils/smoothSurface.ts");
        const { runSurfaceBenchmark, formatSurfaceBenchmark } = await import("/src/utils/surfaceBenchmark.ts");
        // SwiftShader: the GPU finish must be allowed on a software adapter for the per-pixel modes.
        smoothSurfaceSetting.gpuOnSoftware = true;
        const molecule = instance.getMoleculeList()[0];
        const state = () => instance.store.getState();
        const before = {
            settings: { gpu: smoothSurfaceSetting.gpu, fieldShading: smoothSurfaceSetting.fieldShading, pixelColours: smoothSurfaceSetting.pixelColours },
            zoom: state().sceneSettings.zoom, origin: [...state().sceneSettings.origin], quat: [...state().glRef.quat], clip: state().sceneSettings.doClip,
            surfacesShown: molecule.representations.filter((r: any) => r.style === "MolecularSurface" && r.visible).length,
        };
        const progress: string[] = [];
        const running = runSurfaceBenchmark(instance, { frames: 2, idleFrames: 1, onProgress: (text: string) => progress.push(text) });
        // One run at a time.
        let second = "";
        try { await runSurfaceBenchmark(instance); } catch (err) { second = String(err); }
        const facts = await running;
        return {
            text: formatSurfaceBenchmark(facts),
            cases: facts.cases.map((c: any) => ({ mode: c.mode, view: c.view, opacity: c.opacity, applied: c.applied, triangles: c.triangles, peel: c.peelLayers, timed: c.timing.count, idle: c.timing.idleMs })),
            surfaceAdded: facts.surfaceAdded, surfaces: facts.surfaces, progress: progress.length, second,
            before,
            after: {
                settings: { gpu: smoothSurfaceSetting.gpu, fieldShading: smoothSurfaceSetting.fieldShading, pixelColours: smoothSurfaceSetting.pixelColours },
                zoom: state().sceneSettings.zoom, origin: [...state().sceneSettings.origin], quat: [...state().glRef.quat], clip: state().sceneSettings.doClip,
                surfacesShown: molecule.representations.filter((r: any) => r.style === "MolecularSurface" && r.visible).length,
            },
        };
    }, moorhen.elementId);
    console.log(result.text);
    expect(result.cases).toHaveLength(12);
    expect(result.surfaceAdded).toBe(true);
    expect(result.surfaces).toBe(1);
    expect(result.progress).toBeGreaterThan(12);
    expect(result.second).toContain("already running");
    for (const c of result.cases) {
        expect(c.timed).toBeGreaterThan(0);
        expect(c.idle).toBeGreaterThan(0);
        expect(c.applied.pixelNormals).toBe(c.mode !== "per vertex");
        expect(c.applied.pixelColour).toBe(c.mode === "pixel normals+colour");
        // Half transparent is depth peeled; opaque is not.
        if (c.opacity < 1) expect(c.peel).toBeGreaterThan(0);
        else expect(c.peel).toBe(0);
    }
    // Per pixel: the surface unsplit, a quarter of the split one's triangles.
    const tris = (mode: string) => result.cases.find((c: any) => c.mode === mode && c.view === "whole" && c.opacity === 1)!.triangles;
    expect(tris("per vertex")).toBe(4 * tris("pixel normals"));
    expect(result.after).toEqual(result.before);
});
