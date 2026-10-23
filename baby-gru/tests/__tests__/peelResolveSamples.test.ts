/**
 * How many samples the opaque depth-peel layer gets.
 *
 * Making any object transparent sends the whole scene through the depth-peel layers, which were
 * single-sample, so every line in the scene lost its antialiasing. The opaque layer is now drawn
 * multisampled and resolved. The layers follow the render target, so the sample count has to fall
 * with size: a 4096x4096 capture at 4 samples would want over 500 MB on top of the capture buffers,
 * so it gets 2.
 */
import { describe, expect, it } from "@jest/globals";
import {
    peelResolveSamples,
    PEEL_MSAA_BUDGET_BYTES,
    PEEL_MSAA_MAX_SAMPLES,
} from "../../src/WebGLgComponents/mgWebGLParts/framebuffers";

const typical = [8, 4, 2];

describe("opaque peel layer sample count", () => {
    it("gives an ordinary window the browser's usual 4 samples", () => {
        expect(peelResolveSamples(1854, 1468, typical)).toBe(4);
        expect(peelResolveSamples(1920, 1080, typical)).toBe(4);
    });

    it("never asks for more than the cap, however much the hardware offers", () => {
        expect(peelResolveSamples(800, 600, [16, 8, 4, 2])).toBe(PEEL_MSAA_MAX_SAMPLES);
    });

    it("drops the count for a large Retina window rather than blowing the budget", () => {
        // 5120x2880 at 8 bytes a sample is about 118 MB a sample.
        expect(peelResolveSamples(5120, 2880, typical)).toBe(2);
    });

    it("gives a 4096x4096 capture 2 samples, which is exactly the budget", () => {
        expect(peelResolveSamples(4096, 4096, typical)).toBe(2);
    });

    it("does not multisample beyond what the budget allows even 2 samples for", () => {
        expect(peelResolveSamples(8192, 8192, typical)).toBe(0);
    });

    it("keeps every choice inside the budget", () => {
        for (const [w, h] of [[640, 480], [1854, 1468], [2560, 1440], [3840, 2160], [5120, 2880], [4096, 4096], [8192, 8192]]) {
            const n = peelResolveSamples(w, h, typical);
            expect(w * h * 8 * n).toBeLessThanOrEqual(PEEL_MSAA_BUDGET_BYTES);
        }
    });

    it("only picks a count the implementation supports", () => {
        expect(peelResolveSamples(800, 600, [8, 2])).toBe(2);
        expect(peelResolveSamples(800, 600, [3, 2])).toBe(3);
    });

    it("returns 0 when nothing usable is supported, so the layer stays single-sample", () => {
        expect(peelResolveSamples(800, 600, [])).toBe(0);
        expect(peelResolveSamples(800, 600, [1])).toBe(0);
        expect(peelResolveSamples(800, 600, [8, 16])).toBe(0);
    });

    it("returns 0 for an empty target", () => {
        expect(peelResolveSamples(0, 600, typical)).toBe(0);
        expect(peelResolveSamples(800, 0, typical)).toBe(0);
    });
});
