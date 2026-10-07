/**
 * The depth blur's focal plane lands where the side-on widget draws it.
 *
 * The widget draws every handle as a signed distance from the view centre, negative towards the
 * viewer. The renderer turns that distance into a depth-buffer value. If those two disagree about
 * which way is forwards, the handle and the blur part company - which is exactly what happened,
 * twice, for the same reason: the near clip's sign is not what the code reads like.
 *
 * set_clip_range stores `gl_clipPlane0[3] = -fogClipOffset - clipStart`, so it looks as though a
 * larger clipStart moves the near plane away from the viewer. But MoorhenWebMG calls it as
 * `set_clip_range(-clipStart, clipEnd)`. The negation is at the call site, a different file from
 * the arithmetic, and reading either one alone gives the wrong answer.
 *
 * So these tests pin the direction, not just the magnitude.
 */
import { describe, expect, it } from "@jest/globals";
import { focalPlaneFraction, slabNearFar, slabOffsets } from "../../src/WebGLgComponents/mgWebGLParts/projection";

const FOG_CLIP_OFFSET = 250;
const FOG_END = 100000;

/**
 * The slab for a clip setting, by the exact route the renderer takes - including the negation
 * MoorhenWebMG applies before set_clip_range ever sees clipStart.
 */
const slabFor = (clipStart: number, clipEnd: number, perspective = false) => {
    const clipPlane0W = -FOG_CLIP_OFFSET - (-clipStart);
    const clipPlane1W = FOG_CLIP_OFFSET + clipEnd;
    const { near, far } = slabNearFar(clipPlane0W, clipPlane1W, FOG_END, perspective);
    return slabOffsets(near, far, FOG_CLIP_OFFSET);
};

describe("the slab in view-centre offsets", () => {
    it("puts the near plane in front of the centre and the far plane behind it", () => {
        const { nearOffset, farOffset } = slabFor(20, 40);
        expect(nearOffset).toBeCloseTo(-20);
        expect(farOffset).toBeCloseTo(40);
    });

    it("moves the near plane further forward as the front clip grows", () => {
        expect(slabFor(40, 40).nearOffset).toBeLessThan(slabFor(10, 40).nearOffset);
    });
});

describe("the focal plane", () => {
    it("puts the default of 0 angstroms at the view centre, not at the near clip", () => {
        // The bug: with the near offset negated, 0 A mapped below the near plane and clamped to 0,
        // pinning the focal plane at the front of the slab so the whole scene blurred.
        const { nearOffset, farOffset } = slabFor(20, 40);
        expect(focalPlaneFraction(0, nearOffset, farOffset)).toBeCloseTo(20 / 60);
        expect(focalPlaneFraction(0, nearOffset, farOffset)).toBeGreaterThan(0);
    });

    it("is exactly halfway for a symmetric slab", () => {
        const { nearOffset, farOffset } = slabFor(25, 25);
        expect(focalPlaneFraction(0, nearOffset, farOffset)).toBeCloseTo(0.5);
    });

    it("reads 0 at the near plane and 1 at the far one", () => {
        const { nearOffset, farOffset } = slabFor(20, 40);
        expect(focalPlaneFraction(nearOffset, nearOffset, farOffset)).toBeCloseTo(0);
        expect(focalPlaneFraction(farOffset, nearOffset, farOffset)).toBeCloseTo(1);
    });

    it("moves the plane backwards as the setting increases", () => {
        const { nearOffset, farOffset } = slabFor(30, 30);
        let previous = -1;
        for (let offset = -30; offset <= 30; offset += 5) {
            const fraction = focalPlaneFraction(offset, nearOffset, farOffset);
            expect(fraction).toBeGreaterThan(previous);
            previous = fraction;
        }
    });

    it("stays in the same physical place when Clip is switched off", () => {
        // Switching Clip off writes 1.5 * the scene span to both sides, so the slab balloons. A
        // plane 10 A behind centre must still be 10 A behind centre.
        const tight = slabFor(25, 25);
        const wide = slabFor(300, 300);
        expect(focalPlaneFraction(10, tight.nearOffset, tight.farOffset)).toBeGreaterThan(0.5);
        expect(focalPlaneFraction(10, wide.nearOffset, wide.farOffset)).toBeGreaterThan(0.5);
        expect(focalPlaneFraction(10, wide.nearOffset, wide.farOffset)).toBeLessThan(0.55);
    });

    it("never returns a fraction outside the depth buffer's range", () => {
        const { nearOffset, farOffset } = slabFor(20, 20);
        for (const offset of [-1e6, -1000, 0, 1000, 1e6]) {
            const fraction = focalPlaneFraction(offset, nearOffset, farOffset);
            expect(fraction).toBeGreaterThanOrEqual(0);
            expect(fraction).toBeLessThanOrEqual(1);
        }
    });

    it("is finite for a degenerate slab", () => {
        expect(Number.isFinite(focalPlaneFraction(0, 5, 5))).toBe(true);
        expect(Number.isFinite(focalPlaneFraction(0, 0, 0))).toBe(true);
    });

    it("works under perspective, where the near plane is clamped away from the eye", () => {
        const { nearOffset, farOffset } = slabFor(20, 20, true);
        const fraction = focalPlaneFraction(0, nearOffset, farOffset);
        expect(Number.isFinite(fraction)).toBe(true);
        expect(fraction).toBeGreaterThanOrEqual(0);
        expect(fraction).toBeLessThanOrEqual(1);
    });

    it("keeps a saved 0 to 1 value near the view centre, so old sessions do not jump", () => {
        const { nearOffset, farOffset } = slabFor(25, 25);
        for (const legacy of [0, 0.2, 0.5, 1.0]) {
            expect(focalPlaneFraction(legacy, nearOffset, farOffset)).toBeCloseTo(0.5, 1);
        }
    });
});
