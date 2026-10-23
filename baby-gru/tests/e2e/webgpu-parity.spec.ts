import { expect, test } from "@playwright/test";
import { startAndGetInstance } from "./helpers";
import type { WebGPUApi } from "../../src/WebGPUComponents/instanceApi";

/**
 * The WebGPU renderer against the WebGL one, on the same scene and camera.
 *
 * 5a3h is loaded as ribbons only, which the WebGPU renderer draws in full, with the crosshairs
 * off. Then, in one go in the page, the main view's pixels are read back and the WebGPU renderer
 * draws the same scene offscreen at the same size (moorhenInstance.webGPU), and the two are
 * compared pixel by pixel. Both pictures and their difference are attached to the report.
 *
 * Runs only in the chromium-webgpu and firefox-webgpu projects (playwright.config.ts), whose
 * browsers are started with WebGPU on; Playwright's default headless Chromium has no GPU. Skipped,
 * with the reason, where the browser still offers no WebGPU device (Playwright's Firefox, usually).
 */

/** Per-pixel difference, in levels of the largest channel, above which a pixel counts as different. */
const PIXEL_TOLERANCE = 24;
/**
 * Share of all pixels that may differ by more than that: silhouettes antialias a little
 * differently. First measured (Apple GPU, 2026-10-23): 0.49% of 1280x647, all on silhouettes.
 */
const MAX_DIFFERING = 0.015;
/** Mean difference over all pixels, in levels. First measured: 0.26. */
const MAX_MEAN_DIFFERENCE = 1;

/** The web component, as far as this test uses its instance. */
interface Host {
    getMoorhenInstance: () => Promise<{
        webGPU: WebGPUApi;
        representation: { defaultStyle: string };
        sceneSettings: { setDrawCrosshairs(value: boolean): void };
    }>;
}

interface ParityResult {
    width: number;
    height: number;
    meshes: number;
    triangles: number;
    skippedText: string;
    tiles: number;
    /** Pixels that are not background, in the WebGL picture. */
    drawn: number;
    differing: number;
    meanDifference: number;
    worst: number;
    images: { webgl: string; webgpu: string; difference: string } | null;
}

test.describe("WebGPU against WebGL", () => {
    test("ribbons of 5a3h look the same in both renderers", async ({ page }, testInfo) => {
        test.setTimeout(180_000);
        const moorhen = await startAndGetInstance(page);

        const unavailable = await page.evaluate(async targetId => {
            const host = document.getElementById(targetId) as unknown as Host;
            const instance = await host.getMoorhenInstance();
            return instance.webGPU.deviceUnavailableReason();
        }, moorhen.elementId);
        test.skip(unavailable !== null, `No WebGPU: ${unavailable}`);

        // Ribbons only, and nothing drawn over the scene that the WebGPU renderer leaves out.
        await page.evaluate(async targetId => {
            const host = document.getElementById(targetId) as unknown as Host;
            const instance = await host.getMoorhenInstance();
            instance.representation.defaultStyle = "CRs";
            instance.sceneSettings.setDrawCrosshairs(false);
        }, moorhen.elementId);

        const loaded = await moorhen.loadFiles([{ url: "/tests/test_data/5a3h.pdb", filename: "5a3h.pdb" }]);
        expect(loaded).toEqual(expect.arrayContaining([expect.objectContaining({ type: "molecule", fileName: "5a3h.pdb" })]));
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
                skippedText: gpu.skippedText,
                tiles: gpu.tiles,
                drawn,
                differing,
                meanDifference: total / n,
                worst,
                images: { webgl: png(gl.data), webgpu: png(gpu.data), difference: png(difference) },
            };
        }, { targetId: moorhen.elementId, tolerance: PIXEL_TOLERANCE });

        for (const [name, url] of Object.entries(result.images ?? {})) {
            await testInfo.attach(`${name}.png`, { body: Buffer.from(url.split(",")[1], "base64"), contentType: "image/png" });
        }
        const pixels = result.width * result.height;
        const summary = `${result.width}x${result.height}, ${result.meshes} meshes, ${result.triangles} triangles; ` +
            `${result.drawn} pixels drawn, ${result.differing} differ by more than ${PIXEL_TOLERANCE} ` +
            `(${(100 * result.differing / pixels).toFixed(2)}%), mean difference ${result.meanDifference.toFixed(2)}, worst ${result.worst}` +
            (result.skippedText ? `; not drawn by WebGPU: ${result.skippedText}` : "");
        testInfo.annotations.push({ type: "parity", description: summary });
        console.log(`WebGPU parity: ${summary}`);

        // Something of the molecule is in the picture, and WebGPU drew it.
        expect(result.drawn, summary).toBeGreaterThan(pixels * 0.01);
        expect(result.meshes, summary).toBeGreaterThan(0);
        // The same picture, give or take antialiasing.
        expect(result.differing, summary).toBeLessThanOrEqual(pixels * MAX_DIFFERING);
        expect(result.meanDifference, summary).toBeLessThanOrEqual(MAX_MEAN_DIFFERENCE);
    });
});
