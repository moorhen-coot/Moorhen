import { copyFileSync, readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { startAndGetInstance } from "./helpers";
import type { WebGPUApi } from "../../src/WebGPUComponents/instanceApi";

/**
 * The main view drawn with WebGPU (sceneSettings.useWebGPU; MoorhenWebGPUMainView.tsx).
 *
 * With 5a3h as ribbons: on by default, WebGPU takes the view and draws it, on a canvas the size of
 * the WebGL one; what is on screen is WebGPU's picture of the scene; WebGL can still be read back
 * (save_pixel_data draws that frame with WebGL); a screenshot is drawn by WebGPU, at the size
 * WebGL's would be, with a transparent background when asked; a recording started while WebGPU
 * draws records its canvas and leaves it drawing; a divided canvas (three ways) and anaglyph
 * stereo are WebGPU's too; a view WebGPU does not draw (the shadow map debug view) goes back to
 * WebGL and returns; a map is contoured on the GPU while WebGPU draws (and by Coot while WebGL
 * does), and contoured again at a new radius without anything else asking for a frame; a lost
 * device is replaced and WebGPU draws again; and switched off, WebGL draws the view again - with the buffers that
 * waited while WebGPU drew built for it (switching off crashed until they were), and no page errors.
 *
 * Runs in the chromium-webgpu and firefox-webgpu projects, and skips where there is no WebGPU.
 */

interface Host {
    getMoorhenInstance: () => Promise<{
        webGPU: WebGPUApi;
        representation: { defaultStyle: string };
        sceneSettings: { setDrawCrosshairs(value: boolean): void; setDoThreeWayView(value: boolean): void; setDoAnaglyphStereo(value: boolean): void; setDoShadowDepthDebug(value: boolean): void };
        mapContourSettings: { setMapRadius(value: { molNo: number; radius: number }): void };
        getMapList(): { molNo: number }[];
        getVideoRecorderRef(): { current: Recorder | null };
    }>;
}

interface Recorder {
    takeScreenShot(filename: string, doTransparentBackground?: boolean): Promise<void>;
    startRecording(): void;
    stopRecording(): void;
    isRecording(): boolean;
    recordingCanvas: HTMLCanvasElement | null;
    glRef: { current: { drawScene(): void } | null };
}

const SELECTOR = "[data-testid=webgpu-main-view]";

/** As screenshotSize (src/utils/screenshotSize.ts) has it: 4096 on the long side, the view's shape. */
const expectedScreenshotSize = (width: number, height: number) => width > height
    ? { width: 4096, height: Math.floor(4096 / (width / height)) }
    : { width: Math.floor(4096 * (width / height)), height: 4096 };

test("the main view drawn with WebGPU, handing back to WebGL where it must", async ({ page }) => {
    test.setTimeout(180_000);
    const moorhen = await startAndGetInstance(page);
    const id = moorhen.elementId;
    const pageErrors: string[] = [];
    page.on("pageerror", error => pageErrors.push(String(error)));

    const unavailable = await page.evaluate(async targetId => {
        const host = document.getElementById(targetId) as unknown as Host;
        return (await host.getMoorhenInstance()).webGPU.deviceUnavailableReason();
    }, id);
    test.skip(unavailable !== null, `No WebGPU: ${unavailable}`);

    await page.evaluate(async targetId => {
        const host = document.getElementById(targetId) as unknown as Host;
        const instance = await host.getMoorhenInstance();
        instance.representation.defaultStyle = "CRs";
        instance.sceneSettings.setDrawCrosshairs(false);
    }, id);
    await moorhen.loadFiles([{ url: "/tests/test_data/5a3h.pdb", filename: "5a3h.pdb" }]);
    await moorhen.waitForWebGLRenderSettle({ minSettleMs: 1_500, minDisplayBufferCount: 1, timeoutMs: 60_000 });

    const mainView = async () => await page.evaluate(async targetId => {
        const host = document.getElementById(targetId) as unknown as Host;
        return (await host.getMoorhenInstance()).webGPU.mainView();
    }, id);
    const setMainView = async (on: boolean) => await page.evaluate(async ({ targetId, on }) => {
        const host = document.getElementById(targetId) as unknown as Host;
        (await host.getMoorhenInstance()).webGPU.setMainView(on);
    }, { targetId: id, on });
    const setThreeWay = async (on: boolean) => await page.evaluate(async ({ targetId, on }) => {
        const host = document.getElementById(targetId) as unknown as Host;
        (await host.getMoorhenInstance()).sceneSettings.setDoThreeWayView(on);
    }, { targetId: id, on });
    const setAnaglyph = async (on: boolean) => await page.evaluate(async ({ targetId, on }) => {
        const host = document.getElementById(targetId) as unknown as Host;
        (await host.getMoorhenInstance()).sceneSettings.setDoAnaglyphStereo(on);
    }, { targetId: id, on });
    const setShadowDebug = async (on: boolean) => await page.evaluate(async ({ targetId, on }) => {
        const host = document.getElementById(targetId) as unknown as Host;
        (await host.getMoorhenInstance()).sceneSettings.setDoShadowDepthDebug(on);
    }, { targetId: id, on });

    // On by default: WebGPU takes the view and draws it.
    expect((await mainView()).requested).toBe(true);
    await expect.poll(async () => (await mainView()).drawing, { timeout: 30_000 }).toBe(true);
    // Through the locator, which reaches into the web component's shadow root; document.querySelector does not.
    const canvases = await page.locator(SELECTOR).evaluate((gpu: HTMLCanvasElement) => {
        const gl = gpu.parentElement.querySelector("canvas") as HTMLCanvasElement;
        return {
            gpu: { width: gpu.width, height: gpu.height, cssWidth: gpu.style.width, cssHeight: gpu.style.height, visibility: gpu.style.visibility },
            gl: { width: gl.width, height: gl.height, cssWidth: gl.style.width, cssHeight: gl.style.height },
            gpuIsNotGl: gpu !== gl,
        };
    });
    expect(canvases.gpuIsNotGl).toBe(true);
    expect(canvases.gpu).toEqual({ ...canvases.gl, visibility: "visible" });
    expect((await mainView()).framesDrawn).toBeGreaterThan(0);

    // What is on screen is WebGPU's picture of the scene: the page's pixels where the canvas is,
    // against an offscreen WebGPU snapshot of the same view, where the snapshot has the scene. The
    // page's own UI lies over parts of the canvas (the menu, the test page's banner, the tabs) and
    // is left out that way, as long as it is over background; a blank or stale canvas would be a
    // long way off.
    const screen = (await page.locator(SELECTOR).screenshot()).toString("base64");
    const onScreen = await page.evaluate(async ({ targetId, png }) => {
        const host = document.getElementById(targetId) as unknown as Host;
        const instance = await host.getMoorhenInstance();
        const image = new Image();
        image.src = `data:image/png;base64,${png}`;
        await image.decode();
        const shot = await instance.webGPU.snapshot({ width: image.width, height: image.height });
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0);
        const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
        let differing = 0, drawn = 0;
        for (let i = 0; i < pixels.length; i += 4) {
            if (Math.abs(shot.data[i] - shot.data[0]) + Math.abs(shot.data[i + 1] - shot.data[1]) + Math.abs(shot.data[i + 2] - shot.data[2]) <= 6) continue;
            drawn++;
            const d = Math.max(Math.abs(pixels[i] - shot.data[i]), Math.abs(pixels[i + 1] - shot.data[i + 1]), Math.abs(pixels[i + 2] - shot.data[i + 2]));
            if (d > 24) differing++;
        }
        const n = pixels.length / 4;
        return { width: image.width, height: image.height, differing: drawn > 0 ? differing / drawn : 1, drawn: drawn / n };
    }, { targetId: id, png: screen });
    console.log(`WebGPU main view: on screen ${onScreen.width}x${onScreen.height}, ${(100 * onScreen.drawn).toFixed(1)}% of it scene, `
        + `${(100 * onScreen.differing).toFixed(2)}% of the scene's pixels differing from an offscreen WebGPU snapshot`);
    expect(onScreen.drawn).toBeGreaterThan(0.01);
    expect(onScreen.differing).toBeLessThan(0.03);

    // WebGL can still be read back: that frame is WebGL's, and the next is WebGPU's again.
    const readBack = await page.evaluate(async targetId => {
        const host = document.getElementById(targetId) as unknown as Host;
        const gl = (await host.getMoorhenInstance()).webGPU.webGLSnapshot();
        let drawn = 0;
        for (let i = 0; i < gl.data.length; i += 4) {
            if (Math.abs(gl.data[i] - gl.data[0]) + Math.abs(gl.data[i + 1] - gl.data[1]) + Math.abs(gl.data[i + 2] - gl.data[2]) > 6) drawn++;
        }
        return drawn / (gl.data.length / 4);
    }, id);
    expect(readBack).toBeGreaterThan(0.01);

    // A screenshot (the screenshot popup's takeScreenShot) is drawn by WebGPU, at the size WebGL's
    // would be: the scene in it, about as much of it as on screen; and with a transparent
    // background, transparent where the scene is not and opaque where it is.
    const screenshot = async (transparent: boolean) => {
        const download = page.waitForEvent("download", { timeout: 120_000 });
        await page.evaluate(async ({ targetId, transparent }) => {
            const host = document.getElementById(targetId) as unknown as Host;
            await (await host.getMoorhenInstance()).getVideoRecorderRef().current.takeScreenShot("webgpu-screenshot.png", transparent);
        }, { targetId: id, transparent });
        const downloaded = await (await download).path();
        // Kept with the test's results, to look at.
        copyFileSync(downloaded, test.info().outputPath(transparent ? "screenshot-transparent.png" : "screenshot.png"));
        const png = readFileSync(downloaded).toString("base64");
        const stats = await page.evaluate(async png => {
            const image = new Image();
            image.src = `data:image/png;base64,${png}`;
            await image.decode();
            const canvas = document.createElement("canvas");
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(image, 0, 0);
            const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
            // The background: the commonest of the four corners' colours, as the corners may have a 2D overlay on them.
            const corners = [0, image.width - 1, (image.height - 1) * image.width, image.height * image.width - 1].map(p => p * 4);
            const key = (i: number) => `${pixels[i]},${pixels[i + 1]},${pixels[i + 2]},${pixels[i + 3]}`;
            const background = corners.map(key).sort((a, b) => corners.filter(i => key(i) === b).length - corners.filter(i => key(i) === a).length)[0];
            const [r, g, b] = background.split(",").map(Number);
            let drawn = 0, clear = 0, opaque = 0, partialInside = 0, partialAtEdge = 0, nearlyOpaque = 0;
            const w = image.width, h = image.height;
            for (let p = 0, i = 0; i < pixels.length; p++, i += 4) {
                const a = pixels[i + 3];
                if (a === 0) clear++;
                else if (a === 255) opaque++;
                // Some residues' colours come with an alpha a hair under 1 (254 here), which is
                // drawn as it is - by WebGL too - and cannot be seen.
                else if (a >= 250) nearlyOpaque++;
                else {
                    // Partly transparent: at the scene's edge (next to a clear pixel), as antialiasing
                    // against a transparent background leaves it, or inside the scene, which nothing should.
                    const x = p % w, y = (p - x) / w;
                    const nextToClear = (x > 0 && pixels[i - 1] === 0) || (x < w - 1 && pixels[i + 7] === 0)
                        || (y > 0 && pixels[i - 4 * w + 3] === 0) || (y < h - 1 && pixels[i + 4 * w + 3] === 0);
                    if (nextToClear) partialAtEdge++; else partialInside++;
                }
                if (a > 0 && Math.abs(pixels[i] - r) + Math.abs(pixels[i + 1] - g) + Math.abs(pixels[i + 2] - b) > 6) drawn++;
            }
            const n = pixels.length / 4;
            return {
                width: w, height: h, drawn: drawn / n, clear: clear / n, opaque: opaque / n,
                partialInside: partialInside / n, partialAtEdge: partialAtEdge / n, nearlyOpaque: nearlyOpaque / n,
            };
        }, png);
        return { ...stats, png };
    };
    const expectedSize = expectedScreenshotSize(canvases.gl.width, canvases.gl.height);
    const shot = await screenshot(false);
    console.log(`WebGPU main view: screenshot ${shot.width}x${shot.height}, ${(100 * shot.drawn).toFixed(1)}% scene`);
    expect({ width: shot.width, height: shot.height }).toEqual(expectedSize);
    expect(shot.opaque).toBe(1);
    expect(shot.drawn).toBeGreaterThan(onScreen.drawn / 2);
    expect(shot.drawn).toBeLessThan(onScreen.drawn * 2);
    const transparentShot = await screenshot(true);
    console.log(`WebGPU main view: transparent screenshot ${(100 * transparentShot.clear).toFixed(1)}% clear, `
        + `${(100 * transparentShot.opaque).toFixed(1)}% opaque, ${(100 * transparentShot.nearlyOpaque).toFixed(2)}% nearly (alpha 250-254), `
        + `${(100 * transparentShot.partialAtEdge).toFixed(2)}% partly at the scene's edge, `
        + `${(100 * transparentShot.partialInside).toFixed(3)}% partly inside it`);
    expect({ width: transparentShot.width, height: transparentShot.height }).toEqual(expectedSize);
    expect(transparentShot.clear).toBeGreaterThan(1 - 2 * onScreen.drawn);
    // Fog fades a transparent screenshot rather than whitening it (fogged in previewShaders.ts), so
    // much of the scene is partly transparent; laid over the background colour, it is the ordinary
    // screenshot again, give or take rounding.
    const overBackground = await page.evaluate(async ({ ordinary, clear }) => {
        const decode = async (png: string) => {
            const image = new Image();
            image.src = `data:image/png;base64,${png}`;
            await image.decode();
            const canvas = document.createElement("canvas");
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(image, 0, 0);
            return ctx.getImageData(0, 0, image.width, image.height).data;
        };
        const [a, b] = [await decode(ordinary), await decode(clear)];
        const background = [a[0], a[1], a[2]];
        let differing = 0, worst = 0;
        for (let i = 0; i < a.length; i += 4) {
            const alpha = b[i + 3] / 255;
            let d = 0;
            for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(b[i + c] * alpha + background[c] * (1 - alpha) - a[i + c]));
            if (d > 4) differing++;
            worst = Math.max(worst, d);
        }
        return { differing: differing / (a.length / 4), worst };
    }, { ordinary: shot.png, clear: transparentShot.png });
    console.log(`WebGPU main view: the transparent screenshot over the background, against the ordinary one: `
        + `${(100 * overBackground.differing).toFixed(3)}% differing by more than 4, worst ${overBackground.worst.toFixed(1)}`);
    expect(overBackground.differing).toBeLessThan(0.002);
    expect((await mainView()).drawing).toBe(true);

    // A recording started while WebGPU draws records WebGPU's canvas, which goes on drawing.
    const recordedCanvas = await page.evaluate(async targetId => {
        const host = document.getElementById(targetId) as unknown as Host;
        const recorder = (await host.getMoorhenInstance()).getVideoRecorderRef().current;
        recorder.startRecording();
        // Frames to record: the scene is still, and a canvas not drawn to gives the stream nothing.
        for (let frame = 0; frame < 30; frame++) {
            recorder.glRef.current?.drawScene();
            await new Promise(resolve => requestAnimationFrame(resolve));
        }
        return recorder.isRecording() ? recorder.recordingCanvas?.dataset.testid ?? "another canvas" : "not recording";
    }, id);
    expect(recordedCanvas).toBe("webgpu-main-view");
    expect(await mainView()).toMatchObject({ drawing: true, webGLReason: null });
    const video = page.waitForEvent("download", { timeout: 30_000 });
    await page.evaluate(async targetId => {
        const host = document.getElementById(targetId) as unknown as Host;
        (await host.getMoorhenInstance()).getVideoRecorderRef().current.stopRecording();
    }, id);
    expect(readFileSync(await (await video).path()).length).toBeGreaterThan(0);
    expect((await mainView()).drawing).toBe(true);

    // A divided canvas is WebGPU's: three ways, drawn by WebGPU. Counted from before it is asked
    // for: switching it on draws its frame at once, and a still scene draws no more.
    const before = (await mainView()).framesDrawn;
    await setThreeWay(true);
    await expect.poll(async () => (await mainView()).framesDrawn, { timeout: 30_000 }).toBeGreaterThan(before);
    expect(await mainView()).toMatchObject({ drawing: true, webGLReason: null });
    await expect(page.locator(SELECTOR)).toHaveCSS("visibility", "visible");
    await setThreeWay(false);

    // Anaglyph stereo is WebGPU's too.
    const beforeAnaglyph = (await mainView()).framesDrawn;
    await setAnaglyph(true);
    await expect.poll(async () => (await mainView()).framesDrawn, { timeout: 30_000 }).toBeGreaterThan(beforeAnaglyph);
    expect(await mainView()).toMatchObject({ drawing: true, webGLReason: null });
    await expect(page.locator(SELECTOR)).toHaveCSS("visibility", "visible");
    await setAnaglyph(false);

    // A view WebGPU does not draw yet goes to WebGL, the WebGPU canvas out of its way, and back.
    await setShadowDebug(true);
    await expect.poll(async () => (await mainView()).webGLReason, { timeout: 30_000 }).toBe("the shadow map debug view");
    expect((await mainView()).drawing).toBe(false);
    await expect(page.locator(SELECTOR)).toHaveCSS("visibility", "hidden");
    await setShadowDebug(false);
    await expect.poll(async () => (await mainView()).drawing, { timeout: 30_000 }).toBe(true);
    await expect(page.locator(SELECTOR)).toHaveCSS("visibility", "visible");

    // A map loaded while WebGPU draws is contoured on the GPU, not by Coot (no segments of its
    // own in the scene's buffers), and contoured again at a smaller radius with nothing else
    // asking for a frame (the map contour settings do).
    const ribbonSegments = (await mainView()).lastFrame?.segments ?? 0;
    await moorhen.loadFiles([{ url: "/tests/test_data/5a3h_sigmaa.mtz", filename: "5a3h_sigmaa.mtz" }]);
    await expect.poll(async () => (await moorhen.getObjectCounts()).mapCount, { timeout: 120_000 }).toBeGreaterThan(0);
    await expect.poll(async () => (await mainView()).lastFrame?.mapTriangles ?? 0, { timeout: 60_000 }).toBeGreaterThan(0);
    expect(await mainView()).toMatchObject({ mapsOnGpu: true });
    expect((await mainView()).lastFrame.segments).toBe(ribbonSegments);
    // Settled at the first radius before changing it.
    let mapTriangles = -1;
    await expect.poll(async () => {
        const now = (await mainView()).lastFrame?.mapTriangles ?? 0;
        const steady = now === mapTriangles;
        mapTriangles = now;
        return steady;
    }, { timeout: 60_000, intervals: [2_000] }).toBe(true);
    await page.evaluate(async targetId => {
        const host = document.getElementById(targetId) as unknown as Host;
        const instance = await host.getMoorhenInstance();
        instance.mapContourSettings.setMapRadius({ molNo: instance.getMapList()[0].molNo, radius: 6 });
    }, id);
    await expect.poll(async () => (await mainView()).lastFrame?.mapTriangles ?? 0, { timeout: 60_000 }).toBeLessThan(mapTriangles);

    // While WebGL draws, Coot contours the map, and the GPU has it back after.
    await setShadowDebug(true);
    await expect.poll(async () => (await mainView()).mapsOnGpu, { timeout: 30_000 }).toBe(false);
    await setShadowDebug(false);
    await expect.poll(async () => (await mainView()).mapsOnGpu, { timeout: 30_000 }).toBe(true);

    // A lost device is replaced: WebGPU draws again, maps and all.
    const beforeLoss = (await mainView()).framesDrawn;
    expect(await page.evaluate(async targetId => {
        const host = document.getElementById(targetId) as unknown as Host;
        return await (await host.getMoorhenInstance()).webGPU.simulateDeviceLoss();
    }, id)).toBe(true);
    await expect.poll(async () => {
        const now = await mainView();
        return now.drawing && now.framesDrawn > beforeLoss && (now.lastFrame?.mapTriangles ?? 0) > 0;
    }, { timeout: 60_000 }).toBe(true);
    await expect(page.locator(SELECTOR)).toHaveCSS("visibility", "visible");

    // Off: WebGL draws the view again, from buffers built now for the ones that waited.
    await setMainView(false);
    await expect.poll(async () => (await mainView()).active, { timeout: 30_000 }).toBe(false);
    await expect(page.locator(SELECTOR)).toHaveCount(0);
    const afterOff = await page.evaluate(async targetId => {
        const host = document.getElementById(targetId) as unknown as Host;
        const gl = (await host.getMoorhenInstance()).webGPU.webGLSnapshot();
        let drawn = 0;
        for (let i = 0; i < gl.data.length; i += 4) {
            if (Math.abs(gl.data[i] - gl.data[0]) + Math.abs(gl.data[i + 1] - gl.data[1]) + Math.abs(gl.data[i + 2] - gl.data[2]) > 6) drawn++;
        }
        return drawn / (gl.data.length / 4);
    }, id);
    expect(afterOff).toBeGreaterThan(0.01);
    expect(pageErrors).toEqual([]);
});
