/**
 * Keeping the store's copy of the view current.
 *
 * The rule under test is small and the consequence of breaking it is not: a camera move that does
 * not reach the store leaves a disagreement, and MoorhenWebMG's reconciling effect resolves a
 * disagreement by easing the camera back to the store. A missed echo therefore looks like the view
 * sliding away from where it was just put.
 */
import { describe, expect, it } from "@jest/globals";
import { VIEW_EPSILON, isSilent, viewEcho } from "../../src/WebGLgComponents/viewEcho";

const camera = { origin: [1, 2, 3], quat: [0, 0, 0, 1], zoom: 0.5 };
const agreeing = { origin: [1, 2, 3], quat: [0, 0, 0, 1], zoom: 0.5 };

describe("when the store already agrees", () => {
    it("says nothing at all", () => {
        // The guard that stops the echo looping: the store feeds the effect, the effect writes the
        // camera, the camera notifies, which echoes. Dispatching an unchanged value is a cycle.
        expect(isSilent(viewEcho(camera, agreeing))).toBe(true);
    });

    it("ignores a difference too small for the reconciling effect to act on", () => {
        const nudged = { ...agreeing, zoom: 0.5 + VIEW_EPSILON / 10 };
        expect(isSilent(viewEcho(camera, nudged))).toBe(true);
    });
});

describe("when the camera has moved", () => {
    it("echoes only the field that changed", () => {
        // Waking React for the other two would be waste on a path that runs on every mouse event.
        const echo = viewEcho(camera, { ...agreeing, zoom: 2 });
        expect(echo).toEqual({ zoom: 0.5 });
    });

    it("echoes the origin as the renderer holds it, negated view centre and all", () => {
        // The store's copy is in the camera's convention, which is what lets the effect compare
        // them directly. Flipping the sign here would make every move look like a disagreement.
        expect(viewEcho(camera, { ...agreeing, origin: [9, 9, 9] }).origin).toEqual([1, 2, 3]);
    });

    it("echoes the whole quaternion when any component moves", () => {
        // Three quarters of a rotation is not a rotation.
        const echo = viewEcho({ ...camera, quat: [0.5, 0, 0, 0.866] }, agreeing);
        expect(echo.quat).toEqual([0.5, 0, 0, 0.866]);
    });

    it("notices a difference the reconciling effect would act on", () => {
        // The two tolerances are deliberately the same. Anything the effect would move the camera
        // for has to be echoed, or the effect moves it to the stale value instead.
        const echo = viewEcho(camera, { ...agreeing, zoom: 0.5 + VIEW_EPSILON * 10 });
        expect(echo.zoom).toBe(0.5);
    });

    it("copies rather than handing over the camera's own arrays", () => {
        // These reach Redux, which freezes what it is given, and the renderer writes its origin and
        // quaternion in place on every frame of every move.
        const echo = viewEcho(camera, { origin: [9, 9, 9], quat: [1, 0, 0, 0], zoom: 2 });
        expect(echo.origin).not.toBe(camera.origin);
        expect(echo.quat).not.toBe(camera.quat);
    });
});

describe("when the store has nothing yet", () => {
    it("echoes everything, rather than treating absence as agreement", () => {
        const echo = viewEcho(camera, { origin: [], quat: [], zoom: NaN });
        expect(echo.origin).toEqual([1, 2, 3]);
        expect(echo.quat).toEqual([0, 0, 0, 1]);
        expect(echo.zoom).toBe(0.5);
    });
});
