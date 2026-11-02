/**
 * The WebGPU main view's handover with WebGL (WebGLgComponents/externalRenderer.ts): which views
 * WebGL keeps, and WebGL's uploads waiting while WebGPU draws (deferWebGLUploads).
 */
import { describe, expect, it, jest } from "@jest/globals";
import { webGLOnlyReason } from "../../src/WebGLgComponents/externalRenderer";
import { ANAGLYPH_COLOURS, DEFAULT_ANAGLYPH_COLOURS, anaglyphChannels } from "../../src/WebGLgComponents/anaglyph";
import { anaglyphUniforms } from "../../src/WebGPUComponents/anaglyphCombine";
import { SCREENSHOT_SIDE, screenshotSize } from "../../src/utils/screenshotSize";
import { buildBuffers } from "../../src/WebGLgComponents/buildBuffers";
import { deferWebGLUploads } from "../../src/WebGLgComponents/webGLUploads";
import type { DisplayBuffer } from "../../src/WebGLgComponents/displayBuffer";

describe("webGLOnlyReason", () => {
    it("leaves an ordinary view to WebGPU", () => {
        expect(webGLOnlyReason({}, false)).toBeNull();
        expect(webGLOnlyReason({ doShadowDepthDebug: false }, false)).toBeNull();
        // Depth blur is drawn by WebGPU too (depthBlur.ts); divided canvases (previewViews); and
        // anaglyph stereo (drawAnaglyph).
        for (const mode of ["useOffScreenBuffers", "doMultiView", "doThreeWayView", "doSideBySideStereo", "doCrossEyedStereo", "doAnaglyphStereo"]) {
            const view = { doShadowDepthDebug: false, [mode]: true };
            expect(webGLOnlyReason(view, false)).toBeNull();
        }
    });

    it("keeps the views WebGPU does not draw yet, and recordings, for WebGL", () => {
        expect(webGLOnlyReason({ doShadowDepthDebug: true }, false)).toBe("the shadow map debug view");
        expect(webGLOnlyReason({}, true)).toBe("a recording of the WebGL canvas");
        // Before anything else: the recording is of what WebGL draws, whatever the view.
        expect(webGLOnlyReason({ doShadowDepthDebug: true }, true)).toBe("a recording of the WebGL canvas");
    });
});

describe("anaglyph colours", () => {
    it("are red and green by default, as WebGL has always drawn them", () => {
        expect(DEFAULT_ANAGLYPH_COLOURS).toBe("red-green");
        expect(anaglyphChannels(undefined)).toBe(ANAGLYPH_COLOURS["red-green"]);
        expect(anaglyphChannels("no such glasses")).toBe(ANAGLYPH_COLOURS["red-green"]);
        expect(anaglyphChannels("red-green")).toMatchObject({ left: [true, false, false], right: [false, true, false] });
    });

    it("give each eye its own channels, and between them no more than all three", () => {
        for (const channels of Object.values(ANAGLYPH_COLOURS)) {
            for (let c = 0; c < 3; c++) expect(channels.left[c] && channels.right[c]).toBe(false);
            expect(channels.left.some(Boolean) && channels.right.some(Boolean)).toBe(true);
        }
    });

    it("go to the WebGPU combine as masks, with the background and whether on nothing", () => {
        expect(Array.from(anaglyphUniforms("red-cyan", [0.1, 0.2, 0.3, 1], false))).toEqual(
            Array.from(new Float32Array([1, 0, 0, 0, 0, 1, 1, 0, 0.1, 0.2, 0.3, 1, 0, 0, 0, 0])));
        expect(anaglyphUniforms(undefined, [0, 0, 0, 1], true)[12]).toBe(1);
        expect(Array.from(anaglyphUniforms(undefined, [0, 0, 0, 1], true).slice(0, 8))).toEqual([1, 0, 0, 0, 0, 1, 0, 0]);
    });
});

describe("screenshotSize", () => {
    // WebGL's screenshot: a square render-to-texture buffer, with the view's shape cropped out of it.
    it("keeps the long side and the view's shape", () => {
        expect(SCREENSHOT_SIDE).toBe(4096);
        expect(screenshotSize(1280, 647, 4096)).toEqual({ width: 4096, height: 2070 });
        expect(screenshotSize(647, 1280, 4096)).toEqual({ width: 2070, height: 4096 });
    });

    it("rounds the short side down, as WebGL's crop does", () => {
        expect(screenshotSize(3, 2, 100)).toEqual({ width: 100, height: 66 });
        expect(screenshotSize(2, 3, 100)).toEqual({ width: 66, height: 100 });
    });

    it("gives a square view a square picture", () => {
        expect(screenshotSize(800, 800, 4096)).toEqual({ width: 4096, height: 4096 });
    });
});

describe("deferWebGLUploads", () => {
    // A store that says whether buildBuffers looked at it: it reads the store before anything else.
    const storeThatCounts = () => {
        const getState = jest.fn(() => ({ mapContourSettings: { mapLineWidth: 1 }, glRef: { isWebGL2: true, glCtx: null } }));
        return { getState } as unknown as Parameters<typeof buildBuffers>[1] & { getState: typeof getState };
    };
    const dirty = () => [{ isDirty: true } as unknown as DisplayBuffer];

    it("makes building for the store's own context wait, leaving the buffers dirty", () => {
        const store = storeThatCounts();
        const buffers = dirty();
        deferWebGLUploads(store, true);
        buildBuffers(buffers, store);
        expect(store.getState).not.toHaveBeenCalled();
        expect(buffers[0].isDirty).toBe(true);
        deferWebGLUploads(store, false);
    });

    it("builds again once WebGL draws the view again, and only for the store asked", () => {
        const store = storeThatCounts();
        const other = storeThatCounts();
        deferWebGLUploads(store, true);
        buildBuffers(dirty(), other);
        expect(other.getState).toHaveBeenCalled();
        deferWebGLUploads(store, false);
        buildBuffers(dirty(), store);
        expect(store.getState).toHaveBeenCalled();
    });

    it("always builds for a context passed outright: WebGL is about to draw with it", () => {
        const store = storeThatCounts();
        deferWebGLUploads(store, true);
        // No buffers to build, so the context is never used; what matters is that it got past the wait.
        buildBuffers([], store, {} as WebGLRenderingContext);
        expect(store.getState).toHaveBeenCalled();
        deferWebGLUploads(store, false);
    });
});
