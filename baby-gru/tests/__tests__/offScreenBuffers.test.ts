/**
 * The off-screen buffers are rebuilt when the canvas changes size, not only when they are missing.
 *
 * Reported as: switching depth blur on made the main view come out squashed, roughly half size.
 * The cause was that resize() rebuilt these buffers only when blur was *already* switched on, while
 * the draw path asked only whether they were "ready". Resize the canvas with blur off - which
 * includes opening a side panel, since that narrows the canvas - and the buffers kept the old size
 * while still claiming to be ready. The first frame with blur on then drew the scene into a
 * framebuffer of the wrong shape.
 *
 * The condition is worth a test on its own because the symptom only appears after a particular
 * order of events, and nothing about the code at either site looked wrong in isolation.
 */
import { describe, expect, it } from "@jest/globals";
import { offScreenBuffersStale } from "../../src/WebGLgComponents/mgWebGLParts/framebuffers";

const fb = (width: number, height: number) => ({ width, height });

describe("off-screen buffer staleness", () => {
    it("is stale when the buffers have never been built", () => {
        expect(offScreenBuffersStale(false, null, 800, 600)).toBe(true);
        expect(offScreenBuffersStale(true, null, 800, 600)).toBe(true);
        expect(offScreenBuffersStale(true, undefined, 800, 600)).toBe(true);
    });

    it("is stale when they were explicitly invalidated", () => {
        expect(offScreenBuffersStale(false, fb(800, 600), 800, 600)).toBe(true);
    });

    it("is fresh when they are ready and already the right size", () => {
        expect(offScreenBuffersStale(true, fb(800, 600), 800, 600)).toBe(false);
    });

    it("is stale when the canvas got narrower, as it does when a side panel opens", () => {
        // The reported case: buffers built at the full width, then the Scene Settings panel opens.
        expect(offScreenBuffersStale(true, fb(1600, 900), 1200, 900)).toBe(true);
    });

    it("is stale when only the height changed", () => {
        expect(offScreenBuffersStale(true, fb(1600, 900), 1600, 600)).toBe(true);
    });

    it("is stale when the canvas grew as well as when it shrank", () => {
        expect(offScreenBuffersStale(true, fb(800, 600), 1600, 1200)).toBe(true);
        expect(offScreenBuffersStale(true, fb(1600, 1200), 800, 600)).toBe(true);
    });

    it("treats a framebuffer carrying no dimensions as stale rather than as a match", () => {
        // A freshly created WebGLFramebuffer has no width until recreateOffScreeenBuffers sets it.
        expect(offScreenBuffersStale(true, {}, 800, 600)).toBe(true);
    });
});
