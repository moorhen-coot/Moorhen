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
        sceneSettings: { setDrawCrosshairs(value: boolean): void; setDoSSAO(value: boolean): void; setDoEdgeDetect(value: boolean): void; setDoShadow(value: boolean): void; setUseOffScreenBuffers(value: boolean): void;
            setDoThreeWayView(value: boolean): void; setDoSideBySideStereo(value: boolean): void; setDoCrossEyedStereo(value: boolean): void;
        };
        getMoleculeList(): {
            show(style: string): Promise<unknown>; hide(style: string): unknown; toggleSymmetry(): Promise<void>;
            drawEnvironment(cid?: string): Promise<void>;
            representations: { style: string; setNonCustomOpacity(opacity: number): void }[];
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
    /** The effects drawn, as the main view's settings ask for them. */
    effects: { ssao: boolean; edges: boolean; shadow: boolean; depthBlur: boolean };
    /** Transparent layers WebGPU peeled. */
    peelLayers: number;
    /** Pixels the added symmetry, environment, glTF or effect changed, in each renderer's picture. */
    changed: { webgl: number; webgpu: number } | null;
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
    /** Scene effects on: ambient occlusion, edge detection, shadows. */
    ssao?: boolean; edges?: boolean; shadow?: boolean;
    /** A molecular surface over the ribbons at half opacity: depth peeling. */
    transparentSurface?: boolean;
    /** Depth blur (useOffScreenBuffers), at its default radius and focal plane. */
    depthBlur?: boolean;
    /** The canvas divided: three ways, or stereo side by side or crossed. */
    layout?: "three ways" | "side by side" | "cross-eyed";
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
    // Ambient occlusion and edge detection (effectPasses.ts). The same definitions as WebGL's, but
    // not the same maps - WebGL's g-buffer is a 2048 square and its occlusion a 1024 one, with a
    // random kernel - so these differ by more. Measured (Apple GPU, 1280x647, 2026-10-26): CRs +
    // SSAO 0.51% and 0.58, spacefill + SSAO 3.14% and 2.89. Edges, after drawing them on a
    // g-buffer twice the image as WebGL's finer one does: 0.83% and 0.56, 12 677 pixels edged
    // against WebGL's 12 285 (at image size it was 2.39%, 1.53 and 26 041).
    { style: "CRs", what: "ribbons with ambient occlusion", maxDiffering: 0.01, maxMeanDifference: 1.2, ssao: true },
    { style: "VdwSpheres", what: "spacefill with ambient occlusion", maxDiffering: 0.05, maxMeanDifference: 5.5, ssao: true },
    { style: "CRs", what: "ribbons with edges", maxDiffering: 0.02, maxMeanDifference: 1.2, edges: true },
    // Shadows (shadowMap.ts): GLrender's light camera, clip and lookup. Measured (Apple GPU,
    // 1280x647, 2026-10-26): 0.50% and 0.27, as plain ribbons; 11 318 pixels shadowed in WebGL,
    // 11 323 in WebGPU.
    { style: "CRs", what: "ribbons with shadows", maxDiffering: 0.01, maxMeanDifference: 0.6, shadow: true },
    // Depth peeling (depthPeel.ts): a molecular surface at half opacity over the ribbons, its front
    // and back walls and the ribbons inside sorted. WebGL peels the same nearest 3 layers, but
    // leaves its white rim at opaque silhouettes behind the surface and runs FXAA over the layers;
    // WebGPU does neither, so they differ only along silhouettes. Measured (Apple GPU, 1280x647,
    // 2026-10-26): 0.76% and 0.60; the surface changed 134 909 pixels in WebGL, 135 173 in WebGPU.
    { style: "CRs", what: "ribbons inside a transparent surface", maxDiffering: 0.015, maxMeanDifference: 1.2, transparentSurface: true },
    // Depth blur (depthBlur.ts): WebGL's Gaussian and its mix by depth, behind a focal plane at the
    // view centre (the default), but as one round blur where WebGL's two passes glow in a cross.
    // WebGL's picture is taken from its canvas, as it reads save_pixel_data back before the blur.
    // Measured (Apple GPU, 1280x647, 2026-10-27): 0.38% and 0.40 as WebGL's passes; round, 0.39% and
    // 0.45, the blur changing 8 048 pixels in WebGL and 6 494 in WebGPU (the cross's arms gone).
    { style: "CRs", what: "ribbons with depth blur", maxDiffering: 0.01, maxMeanDifference: 0.8, depthBlur: true },
    // A divided canvas (previewViews, drawViews): each view a frame of its own size, with its own
    // turn, as drawScene's loop over its viewports draws it. Measured (Apple GPU, 1280x647,
    // 2026-10-27): three ways 1.63% and 1.07; side by side and cross-eyed 0.98% and 0.53.
    { style: "CRs", what: "ribbons in three views", maxDiffering: 0.03, maxMeanDifference: 2.0, layout: "three ways" },
    { style: "CRs", what: "ribbons in side-by-side stereo", maxDiffering: 0.02, maxMeanDifference: 1.2, layout: "side by side" },
    { style: "CRs", what: "ribbons in cross-eyed stereo", maxDiffering: 0.02, maxMeanDifference: 1.2, layout: "cross-eyed" },
];

test.describe("WebGPU against WebGL", () => {
    for (const { style, what, maxDiffering, maxMeanDifference, symmetry, map, environment, gltf, ssao, edges, shadow, transparentSurface, depthBlur, layout } of STYLES) test(`${what} (${style}) of 5a3h look the same in both renderers`, async ({ page }, testInfo) => {
        test.setTimeout(180_000);
        const moorhen = await startAndGetInstance(page);

        const unavailable = await page.evaluate(async targetId => {
            const host = document.getElementById(targetId) as unknown as Host;
            const instance = await host.getMoorhenInstance();
            return instance.webGPU.deviceUnavailableReason();
        }, moorhen.elementId);
        test.skip(unavailable !== null, `No WebGPU: ${unavailable}`);

        // Ribbons to start with, and nothing drawn over the scene that WebGPU leaves out. The main
        // view drawn by WebGL, as the reference: so too maps contoured by Coot, for both renderers
        // to draw (while WebGPU draws the main view, maps are contoured on the GPU instead).
        await page.evaluate(async targetId => {
            const host = document.getElementById(targetId) as unknown as Host;
            const instance = await host.getMoorhenInstance();
            instance.webGPU.setMainView(false);
            instance.representation.defaultStyle = "CRs";
            instance.sceneSettings.setDrawCrosshairs(false);
        }, moorhen.elementId);

        const files = [{ url: "/tests/test_data/5a3h.pdb", filename: "5a3h.pdb" }];
        if (map) files.push({ url: "/tests/test_data/5a3h_sigmaa.mtz", filename: "5a3h_sigmaa.mtz" });
        const loaded = await moorhen.loadFiles(files);
        if (map) {
            await expect.poll(async () => (await moorhen.getObjectCounts()).mapCount, { timeout: 120_000 }).toBeGreaterThan(0);
        }
        expect(loaded).toEqual(expect.arrayContaining([expect.objectContaining({ type: "molecule", fileName: "5a3h.pdb" })]));
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

        // Anything else under test is added to the settled scene, with both renderers' pictures of
        // the scene without it kept: it has to change both, or the case passes on a scene that
        // never had it (as the glTF, environment and shadow cases once did - all three came out
        // pixel for pixel as plain ribbons).
        const extra = !!(symmetry || environment || gltf || ssao || edges || shadow || transparentSurface || depthBlur || layout);
        if (extra) {
            await page.evaluate(async targetId => {
                const host = document.getElementById(targetId) as unknown as Host;
                const instance = await host.getMoorhenInstance();
                const gl = instance.webGPU.webGLSnapshot();
                const gpu = await instance.webGPU.snapshot({ width: gl.width, height: gl.height });
                (window as unknown as { parityBefore?: { webgl: Uint8ClampedArray; webgpu: Uint8ClampedArray } }).parityBefore = { webgl: gl.data, webgpu: gpu.data };
            }, moorhen.elementId);
            if (gltf) {
                // After the molecule has settled, so that the import's centring on the glTF is the
                // last word (loaded together, the molecule's own centring won and the sphere was off
                // screen).
                await moorhen.loadFiles([{ url: "/tests/test_data/textured_sphere.gltf", filename: "textured_sphere.gltf" }]);
            }
            await page.evaluate(async ({ targetId, symmetry, environment, ssao, edges, shadow, depthBlur, layout }) => {
                const host = document.getElementById(targetId) as unknown as Host;
                const instance = await host.getMoorhenInstance();
                const [molecule] = instance.getMoleculeList();
                if (symmetry) await molecule.toggleSymmetry();
                // A residue named outright: without one, drawEnvironment takes the atom at the
                // view centre, and found none while the view was still moving to the molecule.
                if (environment) await molecule.drawEnvironment("//A/150");
                if (ssao) instance.sceneSettings.setDoSSAO(true);
                if (edges) instance.sceneSettings.setDoEdgeDetect(true);
                if (shadow) instance.sceneSettings.setDoShadow(true);
                if (depthBlur) instance.sceneSettings.setUseOffScreenBuffers(true);
                if (layout === "three ways") instance.sceneSettings.setDoThreeWayView(true);
                if (layout === "side by side") instance.sceneSettings.setDoSideBySideStereo(true);
                if (layout === "cross-eyed") instance.sceneSettings.setDoCrossEyedStereo(true);
            }, { targetId: moorhen.elementId, symmetry: !!symmetry, environment: !!environment, ssao: !!ssao, edges: !!edges, shadow: !!shadow, depthBlur: !!depthBlur, layout });
            if (transparentSurface) {
                await page.evaluate(async targetId => {
                    const host = document.getElementById(targetId) as unknown as Host;
                    const instance = await host.getMoorhenInstance();
                    const [molecule] = instance.getMoleculeList();
                    await molecule.show("MolecularSurface");
                    molecule.representations.find(r => r.style === "MolecularSurface")?.setNonCustomOpacity(0.5);
                }, moorhen.elementId);
            }
            await moorhen.waitForWebGLRenderSettle({ minSettleMs: 1_500, minDisplayBufferCount: 1, timeoutMs: 60_000 });
        }

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

            // How much what was added changed each renderer's picture.
            const holder = window as unknown as { parityBefore?: { webgl: Uint8ClampedArray; webgpu: Uint8ClampedArray } };
            const before = holder.parityBefore;
            delete holder.parityBefore;
            const changedFrom = (a: Uint8ClampedArray, b: Uint8ClampedArray) => {
                if (a.length !== b.length) return a.length / 4;
                let changed = 0;
                for (let i = 0; i < a.length; i += 4) {
                    if (Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])) > tolerance) changed++;
                }
                return changed;
            };
            const changed = before ? { webgl: changedFrom(before.webgl, gl.data), webgpu: changedFrom(before.webgpu, gpu.data) } : null;

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
                effects: gpu.effects,
                peelLayers: gpu.peelLayers,
                changed,
                drawn,
                differing,
                meanDifference: total / n,
                worst,
                images: { webgl: png(gl.data), webgpu: png(gpu.data), difference: png(difference) },
            };
        }, { targetId: moorhen.elementId, tolerance: PIXEL_TOLERANCE });

        const variant = `${style}${symmetry ? " + symmetry" : ""}${map ? " + map" : ""}${environment ? " + environment" : ""}${gltf ? " + textured glTF" : ""}${ssao ? " + SSAO" : ""}${edges ? " + edges" : ""}${shadow ? " + shadows" : ""}${transparentSurface ? " + transparent surface" : ""}${depthBlur ? " + depth blur" : ""}${layout ? ` + ${layout}` : ""}`;
        for (const [name, url] of Object.entries(result.images ?? {})) {
            await testInfo.attach(`${variant.replace(/ \+ /g, "-")}-${name}.png`, { body: Buffer.from(url.split(",")[1], "base64"), contentType: "image/png" });
        }
        const pixels = result.width * result.height;
        const summary = `${variant}: ${result.width}x${result.height}, ${result.meshes} meshes, ${result.triangles} triangles, ${result.spheres} spheres, ${result.segments} line segments, ${result.labels} labels; ` +
            `${result.drawn} pixels drawn, ${result.differing} differ by more than ${PIXEL_TOLERANCE} ` +
            `(${(100 * result.differing / pixels).toFixed(2)}%), mean difference ${result.meanDifference.toFixed(2)}, worst ${result.worst}` +
            (result.peelLayers ? `; ${result.peelLayers} layers peeled` : "") +
            (result.changed ? `; the addition changed ${result.changed.webgl} pixels in WebGL, ${result.changed.webgpu} in WebGPU` : "") +
            (result.skippedText ? `; not drawn by WebGPU: ${result.skippedText}` : "");
        testInfo.annotations.push({ type: "parity", description: summary });
        console.log(`WebGPU parity: ${summary}`);
        if (result.skippedSubBuffers.length) {
            const lines = result.skippedSubBuffers.map(info => `  ${JSON.stringify(info)}`).join("\n");
            console.log(`WebGPU parity: ${variant}: not drawn, or drawn in part:\n${lines}`);
            await testInfo.attach(`${style}-skipped.json`, { body: JSON.stringify(result.skippedSubBuffers, null, 2), contentType: "application/json" });
        }

        // The effects asked for are the ones drawn, and anything added shows in both pictures.
        expect(result.effects, summary).toEqual({ ssao: !!ssao, edges: !!edges, shadow: !!shadow, depthBlur: !!depthBlur });
        if (result.changed) {
            expect(result.changed.webgl, `${summary}: the addition should show in WebGL`).toBeGreaterThan(pixels * 0.001);
            expect(result.changed.webgpu, `${summary}: the addition should show in WebGPU`).toBeGreaterThan(pixels * 0.001);
        }
        if (environment) expect(result.labels, summary).toBeGreaterThan(0);
        // WebGL's default 4 layers: the opaque one and 3 peeled.
        if (transparentSurface) expect(result.peelLayers, summary).toBe(3);
        // Something of the molecule is in the picture, and WebGPU drew it.
        expect(result.drawn, summary).toBeGreaterThan(pixels * 0.01);
        expect(result.meshes, summary).toBeGreaterThan(0);
        // The same picture, give or take antialiasing.
        expect(result.differing, summary).toBeLessThanOrEqual(pixels * maxDiffering);
        expect(result.meanDifference, summary).toBeLessThanOrEqual(maxMeanDifference);
    });
});
