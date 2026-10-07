/**
 * The depth blur's focal plane lands where the side-on widget draws it, in both projections.
 *
 * The widget draws every handle as a signed distance from the view centre, negative towards the
 * viewer. The renderer turns that distance into a depth-buffer value. Two things have to agree for
 * the handle and the blur to stay together, and both have been wrong at some point:
 *
 * The direction. set_clip_range stores `gl_clipPlane0[3] = -fogClipOffset - clipStart`, so it looks
 * as though a larger clipStart moves the near plane away from the viewer. But MoorhenWebMG calls it
 * as `set_clip_range(-clipStart, clipEnd)`. The negation is at the call site, in a different file
 * from the arithmetic, and reading either alone gives the opposite answer.
 *
 * The curve. Orthographic writes depth linearly across the slab; perspective divides by distance.
 * A fraction that is right for one is a few angstroms out for the other.
 */
import { describe, expect, it } from "@jest/globals";
import { focalPlaneDepth, slabNearFar, slabOffsets } from "../../src/WebGLgComponents/mgWebGLParts/projection";

const FOG_CLIP_OFFSET = 250;
const FOG_END = 100000;

/**
 * The slab for a clip setting, by the exact route the renderer takes - including the negation
 * MoorhenWebMG applies before set_clip_range ever sees clipStart.
 */
const slabFor = (clipStart: number, clipEnd: number, perspective = false) =>
    slabNearFar(-FOG_CLIP_OFFSET - (-clipStart), FOG_CLIP_OFFSET + clipEnd, FOG_END, perspective);

const depthAt = (offset: number, clipStart: number, clipEnd: number, perspective = false) => {
    const { near, far } = slabFor(clipStart, clipEnd, perspective);
    return focalPlaneDepth(offset, near, far, FOG_CLIP_OFFSET, perspective);
};

/** Where the depth buffer actually puts a given value back, in angstroms from the centre. */
const invert = (depth: number, near: number, far: number, perspective: boolean) => {
    const distance = perspective
        ? (far * near) / (far - depth * (far - near))
        : near + depth * (far - near);
    return distance - FOG_CLIP_OFFSET;
};

describe("the slab in view-centre offsets", () => {
    it("puts the near plane in front of the centre and the far plane behind it", () => {
        const { near, far } = slabFor(20, 40);
        const { nearOffset, farOffset } = slabOffsets(near, far, FOG_CLIP_OFFSET);
        expect(nearOffset).toBeCloseTo(-20);
        expect(farOffset).toBeCloseTo(40);
    });

    it("moves the near plane further forward as the front clip grows", () => {
        const a = slabOffsets(slabFor(40, 40).near, slabFor(40, 40).far, FOG_CLIP_OFFSET);
        const b = slabOffsets(slabFor(10, 40).near, slabFor(10, 40).far, FOG_CLIP_OFFSET);
        expect(a.nearOffset).toBeLessThan(b.nearOffset);
    });
});

describe("the focal plane, orthographic", () => {
    it("puts the default of 0 angstroms at the view centre, not at the near clip", () => {
        expect(depthAt(0, 20, 40)).toBeCloseTo(20 / 60);
        expect(depthAt(0, 20, 40)).toBeGreaterThan(0);
    });

    it("is exactly halfway for a symmetric slab", () => {
        expect(depthAt(0, 25, 25)).toBeCloseTo(0.5);
    });

    it("reads 0 at the near plane and 1 at the far one", () => {
        expect(depthAt(-20, 20, 40)).toBeCloseTo(0);
        expect(depthAt(40, 20, 40)).toBeCloseTo(1);
    });

    it("moves the plane backwards as the setting increases", () => {
        let previous = -1;
        for (let offset = -30; offset <= 30; offset += 5) {
            const depth = depthAt(offset, 30, 30);
            expect(depth).toBeGreaterThan(previous);
            previous = depth;
        }
    });

    it("stays in the same physical place when Clip is switched off", () => {
        expect(depthAt(10, 25, 25)).toBeGreaterThan(0.5);
        expect(depthAt(10, 300, 300)).toBeGreaterThan(0.5);
        expect(depthAt(10, 300, 300)).toBeLessThan(0.55);
    });
});

describe("the focal plane, perspective", () => {
    it("still reads 0 at the near plane and 1 at the far one", () => {
        const { near, far } = slabFor(20, 40, true);
        expect(focalPlaneDepth(near - FOG_CLIP_OFFSET, near, far, FOG_CLIP_OFFSET, true)).toBeCloseTo(0);
        expect(focalPlaneDepth(far - FOG_CLIP_OFFSET, near, far, FOG_CLIP_OFFSET, true)).toBeCloseTo(1);
    });

    it("lands the plane where it was asked for, to a tenth of an angstrom", () => {
        // The test that matters: push the value through the conversion, then read it back out of
        // the buffer the way the hardware would, and see whether it comes back to the same place.
        const { near, far } = slabFor(20, 40, true);
        for (const offset of [-19, -10, -5, 0, 5, 15, 30, 39]) {
            const depth = focalPlaneDepth(offset, near, far, FOG_CLIP_OFFSET, true);
            expect(invert(depth, near, far, true)).toBeCloseTo(offset, 1);
        }
    });

    it("is not the linear fraction, which is what it used to send", () => {
        // If these agreed there would have been nothing to fix. The linear value puts the plane
        // about 3 angstroms nearer the viewer on a 60 angstrom slab.
        const { near, far } = slabFor(20, 40, true);
        const linear = (FOG_CLIP_OFFSET + 0 - near) / (far - near);
        const correct = focalPlaneDepth(0, near, far, FOG_CLIP_OFFSET, true);
        expect(Math.abs(correct - linear)).toBeGreaterThan(0.02);
        // And the old behaviour was to sit too near the viewer, not too far.
        expect(invert(linear, near, far, true)).toBeLessThan(0);
    });

    it("moves the plane backwards as the setting increases", () => {
        const { near, far } = slabFor(30, 30, true);
        let previous = -1;
        for (let offset = -29; offset <= 29; offset += 5) {
            const depth = focalPlaneDepth(offset, near, far, FOG_CLIP_OFFSET, true);
            expect(depth).toBeGreaterThan(previous);
            previous = depth;
        }
    });

    it("agrees with orthographic at both ends, and differs between them", () => {
        const o = slabFor(25, 25, false);
        const p = slabFor(25, 25, true);
        expect(focalPlaneDepth(-25, o.near, o.far, FOG_CLIP_OFFSET, false)).toBeCloseTo(
            focalPlaneDepth(-25, p.near, p.far, FOG_CLIP_OFFSET, true), 3);
        expect(focalPlaneDepth(0, o.near, o.far, FOG_CLIP_OFFSET, false)).not.toBeCloseTo(
            focalPlaneDepth(0, p.near, p.far, FOG_CLIP_OFFSET, true), 2);
    });
});

describe("the focal plane, both projections", () => {
    it("never returns a value outside the depth buffer's range", () => {
        for (const perspective of [false, true]) {
            const { near, far } = slabFor(20, 20, perspective);
            for (const offset of [-1e6, -1000, 0, 1000, 1e6]) {
                const depth = focalPlaneDepth(offset, near, far, FOG_CLIP_OFFSET, perspective);
                expect(depth).toBeGreaterThanOrEqual(0);
                expect(depth).toBeLessThanOrEqual(1);
            }
        }
    });

    it("is finite for a degenerate slab", () => {
        for (const perspective of [false, true]) {
            expect(Number.isFinite(focalPlaneDepth(0, 5, 5, FOG_CLIP_OFFSET, perspective))).toBe(true);
            expect(Number.isFinite(focalPlaneDepth(0, 0, 0, FOG_CLIP_OFFSET, perspective))).toBe(true);
        }
    });

    it("survives a plane at or behind the eye without producing a NaN", () => {
        const { near, far } = slabFor(20, 20, true);
        for (const offset of [-FOG_CLIP_OFFSET, -FOG_CLIP_OFFSET - 100]) {
            const depth = focalPlaneDepth(offset, near, far, FOG_CLIP_OFFSET, true);
            expect(Number.isFinite(depth)).toBe(true);
        }
    });

    it("keeps a saved 0 to 1 value near the view centre, so old sessions do not jump", () => {
        for (const legacy of [0, 0.2, 0.5, 1.0]) {
            expect(depthAt(legacy, 25, 25)).toBeCloseTo(0.5, 1);
        }
    });
});
