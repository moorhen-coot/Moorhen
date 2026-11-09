/**
 * Keeping the two copies of the view in step.
 *
 * One comparison, used in both directions: the camera's echo asks what the store needs told, and
 * MoorhenWebMG's reconciling effect asks whether the store wants a view the camera is not at. They
 * must agree on when a difference counts, which is why it is one function rather than two sets of
 * epsilons - and the consequence of them disagreeing is not small. A difference the echo failed to
 * report but the effect acted on would ease the camera back to the store a moment after something
 * moved it, which is the view sliding away from where it was just put.
 */
import { describe, expect, it } from "@jest/globals";
import { VIEW_EPSILON, isSilent, viewDifference } from "../../src/WebGLgComponents/viewEcho";

const camera = { origin: [1, 2, 3], quat: [0, 0, 0, 1], zoom: 0.5 };
const agreeing = { origin: [1, 2, 3], quat: [0, 0, 0, 1], zoom: 0.5 };

describe("when the store already agrees", () => {
    it("says nothing at all", () => {
        // The guard that stops the echo looping: the store feeds the effect, the effect writes the
        // camera, the camera notifies, which echoes. Dispatching an unchanged value is a cycle.
        expect(isSilent(viewDifference(camera, agreeing))).toBe(true);
    });

    it("ignores a difference too small for the other side to act on", () => {
        const nudged = { ...agreeing, zoom: 0.5 + VIEW_EPSILON / 10 };
        expect(isSilent(viewDifference(camera, nudged))).toBe(true);
    });
});

describe("when the camera has moved", () => {
    it("echoes only the field that changed", () => {
        // Waking React for the other two would be waste on a path that runs on every mouse event.
        const echo = viewDifference(camera, { ...agreeing, zoom: 2 });
        expect(echo).toEqual({ zoom: 0.5 });
    });

    it("echoes the origin as the renderer holds it, negated view centre and all", () => {
        // The store's copy is in the camera's convention, which is what lets the effect compare
        // them directly. Flipping the sign here would make every move look like a disagreement.
        expect(viewDifference(camera, { ...agreeing, origin: [9, 9, 9] }).origin).toEqual([1, 2, 3]);
    });

    it("echoes the whole quaternion when any component moves", () => {
        // Three quarters of a rotation is not a rotation.
        const echo = viewDifference({ ...camera, quat: [0.5, 0, 0, 0.866] }, agreeing);
        expect(echo.quat).toEqual([0.5, 0, 0, 0.866]);
    });

    it("notices a difference the other side would act on", () => {
        // There is only one tolerance now, which is the point: anything one side would act on is
        // by construction something the other side reports.
        const echo = viewDifference(camera, { ...agreeing, zoom: 0.5 + VIEW_EPSILON * 10 });
        expect(echo.zoom).toBe(0.5);
    });

    it("answers in the other direction too, which is what the reconciling effect asks", () => {
        // Same function, arguments swapped: what the store wants that the camera is not at.
        const store = { origin: [1, 2, 3], quat: [0, 0, 0, 1], zoom: 9 };
        expect(viewDifference(store, camera).zoom).toBe(9);
        expect(isSilent(viewDifference(camera, camera))).toBe(true);
    });

    it("copies rather than handing over the camera's own arrays", () => {
        // These reach Redux, which freezes what it is given, and the renderer writes its origin and
        // quaternion in place on every frame of every move.
        const echo = viewDifference(camera, { origin: [9, 9, 9], quat: [1, 0, 0, 0], zoom: 2 });
        expect(echo.origin).not.toBe(camera.origin);
        expect(echo.quat).not.toBe(camera.quat);
    });
});

describe("when the store has nothing yet", () => {
    it("echoes everything, rather than treating absence as agreement", () => {
        const echo = viewDifference(camera, { origin: [], quat: [], zoom: NaN });
        expect(echo.origin).toEqual([1, 2, 3]);
        expect(echo.quat).toEqual([0, 0, 0, 1]);
        expect(echo.zoom).toBe(0.5);
    });
});
