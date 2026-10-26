/**
 * The WebGPU main view's handover with WebGL (WebGLgComponents/externalRenderer.ts): which views
 * WebGL keeps, and WebGL's uploads waiting while WebGPU draws (deferWebGLUploads).
 */
import { describe, expect, it, jest } from "@jest/globals";
import { webGLOnlyReason } from "../../src/WebGLgComponents/externalRenderer";
import { buildBuffers, deferWebGLUploads } from "../../src/WebGLgComponents/buildBuffers";
import type { DisplayBuffer } from "../../src/WebGLgComponents/displayBuffer";

describe("webGLOnlyReason", () => {
    it("leaves an ordinary view to WebGPU", () => {
        expect(webGLOnlyReason({}, false)).toBeNull();
        expect(webGLOnlyReason({ doMultiView: false, useOffScreenBuffers: false, doStenciling: false }, false)).toBeNull();
    });

    it("keeps the views WebGPU does not draw yet, and recordings, for WebGL", () => {
        expect(webGLOnlyReason({ doMultiView: true }, false)).toBe("multiple views");
        expect(webGLOnlyReason({ doThreeWayView: true }, false)).toBe("multiple views");
        for (const stereo of ["doSideBySideStereo", "doCrossEyedStereo", "doAnaglyphStereo"]) {
            expect(webGLOnlyReason({ [stereo]: true }, false)).toBe("stereo");
        }
        expect(webGLOnlyReason({ useOffScreenBuffers: true }, false)).toBe("depth blur");
        expect(webGLOnlyReason({ doStenciling: true }, false)).toBe("outlines");
        expect(webGLOnlyReason({ doShadowDepthDebug: true }, false)).toBe("the shadow map debug view");
        expect(webGLOnlyReason({}, true)).toMatch(/recording/);
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
