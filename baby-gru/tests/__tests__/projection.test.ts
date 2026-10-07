/**
 * The arithmetic that turns the view slab into near and far planes.
 *
 * Worth testing on its own because the two failures it can produce look nothing like each
 * other. Get the numbers wrong and geometry is clipped where it should not be - visible
 * immediately. Get `exact` wrong and nothing looks wrong at all: the discard-free shaders get
 * used where the hardware is not in fact clipping the slab, and the front of the model stays on
 * screen when the user drags the clip plane through it. The second is the one tests are for.
 *
 * The slab is -d1 <= z <= d0 in eye space; gl-matrix shows eye z over [-far, -near]; so
 * near = -d0 and far = d1, with fog allowed to pull the far plane in.
 */
import { describe, expect, it } from "@jest/globals";
import {
    MIN_PERSPECTIVE_NEAR,
    ORTHO_HALF_HEIGHT,
    MAX_EYE_DISTANCE,
    clipPlanesAfterEyeMove,
    slabOffsets,
    MIN_EYE_DISTANCE,
    PERSPECTIVE_FOV,
    PERSPECTIVE_SCALE,
    perspectiveScale,
    pickHalfExtents,
    slabNearFar,
    viewportAspect,
} from "../../src/WebGLgComponents/mgWebGLParts/projection";

// Representative of a real session: fogClipOffset is 250, so the planes sit either side of it.
const FRONT = -250;   // clipPlane0[3] with clipStart 0
const BACK = 350;     // clipPlane1[3] with clipEnd 100
const NO_FOG = 1e6;

describe("slabNearFar, orthographic", () => {
    it("takes the slab exactly", () => {
        expect(slabNearFar(FRONT, BACK, NO_FOG, false)).toEqual({ near: 250, far: 350, exact: true });
    });

    it("lets fog pull the far plane in", () => {
        // The orthographic path has always taken the nearer of the back plane and fog end.
        expect(slabNearFar(FRONT, BACK, 300, false).far).toBe(300);
    });

    it("leaves the far plane alone when fog is further away", () => {
        expect(slabNearFar(FRONT, BACK, 1000, false).far).toBe(350);
    });

    it("accepts a near plane behind the eye, which orthographic can represent", () => {
        // Pulling the front clip past the viewer is ordinary in a slab view and must not be
        // clamped: clamping would start hiding the front of the model.
        const range = slabNearFar(100, BACK, NO_FOG, false);
        expect(range.near).toBe(-100);
        expect(range.exact).toBe(true);
    });

    it("is always exact, so orthographic can always use the discard-free shaders", () => {
        for (const front of [-1000, -250, 0, 250]) {
            expect(slabNearFar(front, BACK, NO_FOG, false).exact).toBe(true);
        }
    });
});

describe("slabNearFar, perspective", () => {
    it("takes the slab exactly when the near plane is in front of the eye", () => {
        expect(slabNearFar(FRONT, BACK, NO_FOG, true)).toEqual({ near: 250, far: 350, exact: true });
    });

    it("agrees with orthographic whenever it can", () => {
        // The two projections differ in shape, not in what they clip.
        expect(slabNearFar(FRONT, BACK, 300, true)).toEqual(slabNearFar(FRONT, BACK, 300, false));
    });

    it("clamps a near plane at the eye, because the projection divides by it", () => {
        const range = slabNearFar(0, BACK, NO_FOG, true);
        expect(range.near).toBe(MIN_PERSPECTIVE_NEAR);
        expect(range.exact).toBe(false);
    });

    it("clamps a near plane behind the eye", () => {
        const range = slabNearFar(100, BACK, NO_FOG, true);
        expect(range.near).toBe(MIN_PERSPECTIVE_NEAR);
        expect(range.exact).toBe(false);
    });

    it("says so when it clamps, so the clip discards stay in use", () => {
        // This is the flag that keeps a clamped projection honest. If it reported true, the
        // front of the model would stop being clipped and nothing else would look wrong.
        expect(slabNearFar(100, BACK, NO_FOG, true).exact).toBe(false);
    });

    it("keeps far strictly beyond near when the slab collapses", () => {
        const range = slabNearFar(-250, 250, NO_FOG, true);
        expect(range.far).toBeGreaterThan(range.near);
        expect(range.exact).toBe(false);
    });

    it("never produces a non-finite or inverted matrix input", () => {
        for (const front of [-1000, -250, -1, 0, 1, 250]) {
            for (const back of [-100, 0, 1, 250, 350, 5000]) {
                const range = slabNearFar(front, back, NO_FOG, true);
                expect(Number.isFinite(range.near)).toBe(true);
                expect(Number.isFinite(range.far)).toBe(true);
                expect(range.near).toBeGreaterThan(0);
                expect(range.far).toBeGreaterThan(range.near);
            }
        }
    });

    it("narrows the depth range compared with the fixed 100/1270 it replaces", () => {
        // The point of the change, beyond losing the discards: the depth buffer stops spending
        // its precision on a kilometre of empty space either side of the molecule.
        const range = slabNearFar(FRONT, BACK, NO_FOG, true);
        expect(range.far - range.near).toBeLessThan(1270 - 100);
    });
});

describe("viewportAspect", () => {
    it("is the viewport's own aspect, not the canvas", () => {
        expect(viewportAspect([0, 0, 1600, 800])).toBe(2);
    });

    it("halves for a side-by-side stereo eye", () => {
        // The bug this exists to fix: perspective used the full canvas, so each eye was drawn
        // with twice the aspect its viewport actually had.
        const canvas = [0, 0, 1600, 800];
        const leftEye = [0, 0, 800, 800];
        expect(viewportAspect(leftEye)).toBe(1);
        expect(viewportAspect(canvas)).toBe(2);
        expect(viewportAspect(leftEye)).not.toBe(viewportAspect(canvas));
    });

    it("handles a three-way tile", () => {
        expect(viewportAspect([0, 400, 800, 400])).toBe(2);
    });

    it("survives a viewport collapsing to nothing mid-layout", () => {
        for (const bad of [[0, 0, 0, 0], [0, 0, 100, 0], [0, 0, 0, 100], null, undefined]) {
            expect(viewportAspect(bad)).toBe(1.0);
        }
    });
});

describe("pickHalfExtents", () => {
    const FOG_CLIP_OFFSET = 250;   // the distance from the eye to the view centre
    const RATIO = 2768 / 1448;

    describe("orthographic", () => {
        it("is the two pairs of numbers the picking code used to hardcode", () => {
            // minY = -24*zoom, maxX = 24*ratio*zoom. This must not move: orthographic picking
            // works today and the whole point of the change is to leave it alone.
            const { halfWidth, halfHeight } = pickHalfExtents(FOG_CLIP_OFFSET, 1.5, RATIO, false);
            expect(halfHeight).toBe(ORTHO_HALF_HEIGHT * 1.5);
            expect(halfWidth).toBe(ORTHO_HALF_HEIGHT * RATIO * 1.5);
        });

        it("does not vary with depth, which is why one pair sufficed", () => {
            const near = pickHalfExtents(10, 1, RATIO, false);
            const far = pickHalfExtents(10000, 1, RATIO, false);
            expect(near).toEqual(far);
        });

        it("scales with zoom", () => {
            expect(pickHalfExtents(FOG_CLIP_OFFSET, 2, RATIO, false).halfHeight)
                .toBe(2 * pickHalfExtents(FOG_CLIP_OFFSET, 1, RATIO, false).halfHeight);
        });
    });

    describe("perspective", () => {
        it("matches the orthographic extents at the view centre", () => {
            // This is what the renderer's unexplained 5.7 is for, and it is the reason switching
            // projection does not make the molecule jump: at the depth it sits at, the two
            // projections frame the same thing. Within a fifth of a percent, since the renderer
            // uses 5.7 rather than the derived 5.690.
            const persp = pickHalfExtents(FOG_CLIP_OFFSET, 1, RATIO, true);
            const ortho = pickHalfExtents(FOG_CLIP_OFFSET, 1, RATIO, false);
            expect(persp.halfHeight / ortho.halfHeight).toBeCloseTo(1.0, 2);
            expect(persp.halfWidth / ortho.halfWidth).toBeCloseTo(1.0, 2);
        });

        it("grows in proportion to depth, which orthographic does not", () => {
            // The actual bug: one pair of extents was used for both ends of the ray, so the ray
            // was only correct at whatever depth those extents described.
            const near = pickHalfExtents(100, 1, RATIO, true).halfHeight;
            const far = pickHalfExtents(400, 1, RATIO, true).halfHeight;
            expect(far / near).toBeCloseTo(4.0, 10);
        });

        it("differs from orthographic away from the view centre", () => {
            const front = pickHalfExtents(FOG_CLIP_OFFSET - 150, 1, RATIO, true).halfHeight;
            const ortho = pickHalfExtents(FOG_CLIP_OFFSET - 150, 1, RATIO, false).halfHeight;
            expect(front).toBeLessThan(ortho * 0.75);
        });

        it("follows the renderer's own projection constants", () => {
            // The divisor is derived from the eye distance now that the eye can be moved, so
            // this reads perspectiveScale rather than the 5.7 the renderer used to hard-code. The
            // two differ by 0.17%, which is the one-off shift that came with making it adjustable;
            // the test below holds that difference to where it was measured.
            const depth = 377;
            expect(pickHalfExtents(depth, 1, RATIO, true).halfHeight)
                .toBeCloseTo(depth * Math.tan(PERSPECTIVE_FOV / 2) / perspectiveScale(FOG_CLIP_OFFSET), 10);
        });

        it("sits within a fifth of a percent of what the old fixed 5.7 gave", () => {
            const depth = 377;
            const now = pickHalfExtents(depth, 1, RATIO, true).halfHeight;
            const before = depth * Math.tan(PERSPECTIVE_FOV / 2) / PERSPECTIVE_SCALE;
            expect(Math.abs(now - before) / before).toBeLessThan(0.002);
        });

        it("keeps width and height in the viewport's aspect", () => {
            const { halfWidth, halfHeight } = pickHalfExtents(300, 1.3, RATIO, true);
            expect(halfWidth / halfHeight).toBeCloseTo(RATIO, 10);
        });

        it("collapses to nothing at the eye rather than going negative", () => {
            expect(pickHalfExtents(0, 1, RATIO, true).halfHeight).toBe(0);
        });
    });
});

describe("the adjustable eye distance", () => {
    const RATIO = 2768 / 1448;

    it("reproduces the hand-tuned 5.7 at the historical eye distance", () => {
        // The old constant was 5.7 and the derivation gives 5.690, so views composed before this
        // became adjustable shift by 0.17%. Worth knowing, not worth worrying about.
        expect(perspectiveScale(250)).toBeCloseTo(5.69, 2);
        expect(Math.abs(perspectiveScale(250) - PERSPECTIVE_SCALE) / PERSPECTIVE_SCALE).toBeLessThan(0.002);
    });

    it("scales with the eye distance, which is what holds the framing still", () => {
        expect(perspectiveScale(100)).toBeLessThan(perspectiveScale(250));
        expect(perspectiveScale(250)).toBeLessThan(perspectiveScale(800));
        expect(perspectiveScale(500) / perspectiveScale(250)).toBeCloseTo(2, 9);
    });

    it("frames the same thing as orthographic at the view centre, at every eye distance", () => {
        for (const eye of [50, 120, 250, 600, 1000]) {
            const persp = pickHalfExtents(eye, 1.0, RATIO, true, eye);
            const ortho = pickHalfExtents(eye, 1.0, RATIO, false, eye);
            expect(persp.halfHeight).toBeCloseTo(ortho.halfHeight, 9);
        }
    });

    it("converges more strongly the closer the eye is", () => {
        // How much smaller a feature 40 A behind the centre appears than one 40 A in front: the
        // whole point of the control. This is the quantity that did not move when the slider was
        // a field of view, because at a fixed eye distance the angle cancels out of the matrix.
        const foreshortening = (eye: number) =>
            pickHalfExtents(eye + 40, 1, RATIO, true, eye).halfHeight
            / pickHalfExtents(eye - 40, 1, RATIO, true, eye).halfHeight;

        expect(foreshortening(100)).toBeGreaterThan(foreshortening(250));
        expect(foreshortening(250)).toBeGreaterThan(foreshortening(1000));
        // And a distant eye tends towards orthographic, where the ratio is exactly 1.
        expect(foreshortening(1000)).toBeLessThan(1.09);
        expect(foreshortening(100)).toBeGreaterThan(1.5);
    });

    it("stays within the range the slider offers", () => {
        expect(MIN_EYE_DISTANCE).toBeGreaterThan(0);
        expect(MAX_EYE_DISTANCE).toBeGreaterThan(MIN_EYE_DISTANCE);
    });
});

describe("moving the eye", () => {
    const FOG_END = 100000;

    /** The slab as the renderer sees it, after set_clip_range and then an eye move. */
    const slabAfterMove = (clipStart: number, clipEnd: number, from: number, to: number) => {
        // set_clip_range(-clipStart, clipEnd), as MoorhenWebMG calls it.
        let clipPlane0W = -from - (-clipStart);
        let clipPlane1W = from + clipEnd;
        ({ clipPlane0W, clipPlane1W } = clipPlanesAfterEyeMove(clipPlane0W, clipPlane1W, to - from));
        const { near, far } = slabNearFar(clipPlane0W, clipPlane1W, FOG_END, false);
        return slabOffsets(near, far, to);
    };

    it("carries the clip slab with it, so the molecule is not sliced open", () => {
        // The reported fault: the planes stayed at their old absolute distances while the geometry
        // moved to a new one, cutting the front off the molecule.
        for (const eye of [50, 144, 250, 393, 1000]) {
            const { nearOffset, farOffset } = slabAfterMove(20, 40, 250, eye);
            expect(nearOffset).toBeCloseTo(-20, 9);
            expect(farOffset).toBeCloseTo(40, 9);
        }
    });

    it("leaves the slab untouched when the eye does not move", () => {
        const { nearOffset, farOffset } = slabAfterMove(15, 35, 250, 250);
        expect(nearOffset).toBeCloseTo(-15, 9);
        expect(farOffset).toBeCloseTo(35, 9);
    });

    it("is reversible, so dragging the slider back and forth does not drift", () => {
        let clipPlane0W = -250 + 20;
        let clipPlane1W = 250 + 40;
        const before = { clipPlane0W, clipPlane1W };
        for (const [from, to] of [[250, 80], [80, 640], [640, 137], [137, 250]]) {
            ({ clipPlane0W, clipPlane1W } = clipPlanesAfterEyeMove(clipPlane0W, clipPlane1W, to - from));
        }
        expect(clipPlane0W).toBeCloseTo(before.clipPlane0W, 9);
        expect(clipPlane1W).toBeCloseTo(before.clipPlane1W, 9);
    });

    it("keeps an asymmetric slab asymmetric, rather than centring it", () => {
        const { nearOffset, farOffset } = slabAfterMove(5, 90, 250, 120);
        expect(nearOffset).toBeCloseTo(-5, 9);
        expect(farOffset).toBeCloseTo(90, 9);
    });
});
