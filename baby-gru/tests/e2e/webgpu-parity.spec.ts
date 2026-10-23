import { expect, test } from "@playwright/test";
import { startAndGetInstance } from "./helpers";
import type { SkippedSubBufferInfo, WebGPUApi } from "../../src/WebGPUComponents/instanceApi";

/**
 * The WebGPU renderer against the WebGL one, on the same scene and camera.
 *
 * 5a3h is loaded in one representation at a time, with the crosshairs off: ribbons (meshes),
 * ball-and-stick (instanced cylinders and perfect spheres) and spacefill (perfect spheres). Then,
 * in one go in the page, the main view's pixels are read back and the WebGPU renderer
 * draws the same scene offscreen at the same size (moorhenInstance.webGPU), and the two are
 * compared pixel by pixel. Both pictures and their difference are attached to the report.
 *
 * Runs only in the chromium-webgpu and firefox-webgpu projects (playwright.config.ts), whose
 * browsers are started with WebGPU on; Playwright's default headless Chromium has no GPU. Skipped,
 * with the reason, where the browser still offers no WebGPU device (Playwright's Firefox, usually).
 */

/** Per-pixel difference, in levels of the largest channel, above which a pixel counts as different. */
const PIXEL_TOLERANCE = 24;

/** The web component, as far as this test uses its instance. */
interface Host {
    getMoorhenInstance: () => Promise<{
        webGPU: WebGPUApi;
        representation: { defaultStyle: string };
        sceneSettings: { setDrawCrosshairs(value: boolean): void };
        getMoleculeList(): {
            show(style: string): Promise<unknown>; hide(style: string): unknown; toggleSymmetry(): Promise<void>;
            drawEnvironment(cid?: string): Promise<void>;
        }[];
    }>;
}

interface ParityResult {
    width: number;
    height: number;
    meshes: number;
    triangles: number;
    spheres: number;
    segments: number;
    labels: number;
    skippedText: string;
    skippedSubBuffers: SkippedSubBufferInfo[];
    tiles: number;
    /** Pixels that are not background, in the WebGL picture. */
    drawn: number;
    differing: number;
    meanDifference: number;
    worst: number;
    images: { webgl: string; webgpu: string; difference: string } | null;
}

/**
 * The representations compared, what they exercise, and how far they may differ: the share of
 * all pixels differing by more than PIXEL_TOLERANCE, and the mean difference in levels. Triangle
 * silhouettes antialias a little differently in the two; sphere impostors are not antialiased in
 * either. The limits are about twice what was measured (Apple GPU, 1280x647, 2026-10-23): CRs
 * 0.49% and 0.26, CBs 1.47% and 0.82 (many more edges), VdwSpheres 0.01% and 0.01.
 */
const STYLES: {
    style: string; what: string; maxDiffering: number; maxMeanDifference: number;
    symmetry?: boolean; map?: boolean; environment?: boolean; gltf?: boolean;
}[] = [
    { style: "CRs", what: "ribbons", maxDiffering: 0.01, maxMeanDifference: 0.6 },
    { style: "CBs", what: "ball-and-stick", maxDiffering: 0.03, maxMeanDifference: 1.6 },
    { style: "VdwSpheres", what: "spacefill", maxDiffering: 0.002, maxMeanDifference: 0.2 },
    // Crystal symmetry on: grey copies of the ribbons around the view centre. Not yet measured.
    { style: "CRs", what: "ribbons with symmetry copies", maxDiffering: 0.02, maxMeanDifference: 1.2, symmetry: true },
    // A map contoured by Coot, drawn as LINES (thick lines). Not yet measured.
    { style: "CRs", what: "ribbons and a map", maxDiffering: 0.03, maxMeanDifference: 1.6, map: true },
    // Environment distances around the view centre: dashed cylinders and their text labels.
    // Not yet measured.
    { style: "CRs", what: "ribbons with environment distances", maxDiffering: 0.02, maxMeanDifference: 1.2, environment: true },
    // An imported glTF with a base colour texture, a normal map and a metallic-roughness map
    // (tests/test_data/textured_sphere.gltf, made by make_textured_sphere.py beside it). The
    // import centres the view on it, so it is what is in the picture. Not yet measured.
    { style: "CRs", what: "a textured glTF sphere", maxDiffering: 0.02, maxMeanDifference: 1.2, gltf: true },
];

test.describe("WebGPU against WebGL", () => {
    for (const { style, what, maxDiffering, maxMeanDifference, symmetry, map, environment, gltf } of STYLES) test(`${what} (${style}) of 5a3h look the same in both renderers`, async ({ page }, testInfo) => {
        test.setTimeout(180_000);
        const moorhen = await startAndGetInstance(page);

        const unavailable = await page.evaluate(async targetId => {
            const host = document.getElementById(targetId) as unknown as Host;
            const instance = await host.getMoorhenInstance();
            return instance.webGPU.deviceUnavailableReason();
        }, moorhen.elementId);
        test.skip(unavailable !== null, `No WebGPU: ${unavailable}`);

        // Ribbons to start with, and nothing drawn over the scene that WebGPU leaves out.
        await page.evaluate(async targetId => {
            const host = document.getElementById(targetId) as unknown as Host;
            const instance = await host.getMoorhenInstance();
            instance.representation.defaultStyle = "CRs";
            instance.sceneSettings.setDrawCrosshairs(false);
        }, moorhen.elementId);

        const files = [{ url: "/tests/test_data/5a3h.pdb", filename: "5a3h.pdb" }];
        if (map) files.push({ url: "/tests/test_data/5a3h_sigmaa.mtz", filename: "5a3h_sigmaa.mtz" });
        if (gltf) files.push({ url: "/tests/test_data/textured_sphere.gltf", filename: "textured_sphere.gltf" });
        const loaded = await moorhen.loadFiles(files);
        if (map) {
            await expect.poll(async () => (await moorhen.getObjectCounts()).mapCount, { timeout: 120_000 }).toBeGreaterThan(0);
        }
        expect(loaded).toEqual(expect.arrayContaining([expect.objectContaining({ type: "molecule", fileName: "5a3h.pdb" })]));
        if (symmetry) {
            await page.evaluate(async targetId => {
                const host = document.getElementById(targetId) as unknown as Host;
                const instance = await host.getMoorhenInstance();
                await instance.getMoleculeList()[0].toggleSymmetry();
            }, moorhen.elementId);
        }
        if (environment) {
            await page.evaluate(async targetId => {
                const host = document.getElementById(targetId) as unknown as Host;
                const instance = await host.getMoorhenInstance();
                await instance.getMoleculeList()[0].drawEnvironment();
            }, moorhen.elementId);
        }
        // Then the representation under test in place of the ribbons.
        if (style !== "CRs") {
            await page.evaluate(async ({ targetId, wanted }) => {
                const host = document.getElementById(targetId) as unknown as Host;
                const instance = await host.getMoorhenInstance();
                const [molecule] = instance.getMoleculeList();
                await molecule.show(wanted);
                molecule.hide("CRs");
            }, { targetId: moorhen.elementId, wanted: style });
        }
        await moorhen.waitForWebGLRenderSettle({ minSettleMs: 1_500, minDisplayBufferCount: 1, timeoutMs: 60_000 });

        const result: ParityResult = await page.evaluate(async ({ targetId, tolerance }) => {
            const host = document.getElementById(targetId) as unknown as Host;
            const instance = await host.getMoorhenInstance();
            const gl = instance.webGPU.webGLSnapshot();
            const gpu = await instance.webGPU.snapshot({ width: gl.width, height: gl.height });

            const n = gl.width * gl.height;
            const background = [gl.data[0], gl.data[1], gl.data[2]];
            const difference = new Uint8ClampedArray(n * 4);
            let drawn = 0, differing = 0, total = 0, worst = 0;
            for (let i = 0; i < n * 4; i += 4) {
                const d = Math.max(Math.abs(gl.data[i] - gpu.data[i]), Math.abs(gl.data[i + 1] - gpu.data[i + 1]), Math.abs(gl.data[i + 2] - gpu.data[i + 2]));
                total += d;
                worst = Math.max(worst, d);
                if (d > tolerance) differing++;
                if (Math.abs(gl.data[i] - background[0]) + Math.abs(gl.data[i + 1] - background[1]) + Math.abs(gl.data[i + 2] - background[2]) > 6) drawn++;
                // Differences in red, amplified, over a faint grey copy of the WebGL picture.
                const grey = (gl.data[i] + gl.data[i + 1] + gl.data[i + 2]) / 12;
                difference[i] = Math.min(255, grey + d * 4);
                difference[i + 1] = grey;
                difference[i + 2] = grey;
                difference[i + 3] = 255;
            }

            const png = (data: Uint8ClampedArray): string => {
                const canvas = document.createElement("canvas");
                canvas.width = gl.width;
                canvas.height = gl.height;
                const opaque = new Uint8ClampedArray(data);
                for (let i = 3; i < opaque.length; i += 4) opaque[i] = 255;
                canvas.getContext("2d").putImageData(new ImageData(opaque, gl.width, gl.height), 0, 0);
                return canvas.toDataURL("image/png");
            };

            return {
                width: gl.width,
                height: gl.height,
                meshes: gpu.meshes,
                triangles: gpu.triangles,
                spheres: gpu.spheres,
                segments: gpu.segments,
                labels: gpu.labels,
                skippedText: gpu.skippedText,
                skippedSubBuffers: instance.webGPU.describeSkipped(),
                tiles: gpu.tiles,
                drawn,
                differing,
                meanDifference: total / n,
                worst,
                images: { webgl: png(gl.data), webgpu: png(gpu.data), difference: png(difference) },
            };
        }, { targetId: moorhen.elementId, tolerance: PIXEL_TOLERANCE });

        const variant = `${style}${symmetry ? " + symmetry" : ""}${map ? " + map" : ""}${environment ? " + environment" : ""}${gltf ? " + textured glTF" : ""}`;
        for (const [name, url] of Object.entries(result.images ?? {})) {
            await testInfo.attach(`${variant.replace(/ \+ /g, "-")}-${name}.png`, { body: Buffer.from(url.split(",")[1], "base64"), contentType: "image/png" });
        }
        const pixels = result.width * result.height;
        const summary = `${variant}: ${result.width}x${result.height}, ${result.meshes} meshes, ${result.triangles} triangles, ${result.spheres} spheres, ${result.segments} line segments, ${result.labels} labels; ` +
            `${result.drawn} pixels drawn, ${result.differing} differ by more than ${PIXEL_TOLERANCE} ` +
            `(${(100 * result.differing / pixels).toFixed(2)}%), mean difference ${result.meanDifference.toFixed(2)}, worst ${result.worst}` +
            (result.skippedText ? `; not drawn by WebGPU: ${result.skippedText}` : "");
        testInfo.annotations.push({ type: "parity", description: summary });
        console.log(`WebGPU parity: ${summary}`);
        if (result.skippedSubBuffers.length) {
            const lines = result.skippedSubBuffers.map(info => `  ${JSON.stringify(info)}`).join("\n");
            console.log(`WebGPU parity: ${variant}: not drawn, or drawn in part:\n${lines}`);
            await testInfo.attach(`${style}-skipped.json`, { body: JSON.stringify(result.skippedSubBuffers, null, 2), contentType: "application/json" });
        }

        // Something of the molecule is in the picture, and WebGPU drew it.
        expect(result.drawn, summary).toBeGreaterThan(pixels * 0.01);
        expect(result.meshes, summary).toBeGreaterThan(0);
        // The same picture, give or take antialiasing.
        expect(result.differing, summary).toBeLessThanOrEqual(pixels * maxDiffering);
        expect(result.meanDifference, summary).toBeLessThanOrEqual(maxMeanDifference);
    });
});
