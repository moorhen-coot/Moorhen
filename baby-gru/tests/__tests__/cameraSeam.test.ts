/**
 * The seam between MGWebGL and the camera controller.
 *
 * This slice is meant to be invisible, which makes it exactly the kind of change that needs
 * pinning: the interesting failures are all silent. Two in particular would be, and both have
 * already cost time elsewhere in this work.
 *
 * The first is identity. Forty-odd places in MGWebGL mutate the quaternion in place rather than
 * reassigning it, so if the facade ever hands out a copy, rotation stops working and nothing
 * throws. The second is what the camera holds before mount has finished: `myQuat` and `zoom` used
 * to be null there, and are now the same values mount goes on to assign. The claim that this
 * changes nothing rests on those values being identical, so they are stated here.
 */
import { describe, expect, it } from "@jest/globals";
import * as quat4 from "gl-matrix/quat";
import { Camera } from "../../src/WebGLgComponents/mgWebGLParts/camera";

describe("what MGWebGL starts from", () => {
    it("starts at the very values mount goes on to assign", () => {
        // initGLState does `quat4.set(self.myQuat, 0, 0, 0, -1)` and `self.setZoom(1.0)`. Starting
        // here rather than at null is only safe because these are those numbers; if either side
        // changes, this is the test that should object.
        const camera = new Camera();
        expect([...camera.quat]).toEqual([0, 0, 0, -1]);
        expect(camera.zoom).toBe(1);
    });

    it("has the origin and eye distance available immediately, as they always were", () => {
        const camera = new Camera();
        expect(camera.origin).toEqual([0, 0, 0]);
        expect(camera.fogClipOffset).toBe(250);
    });

    it("records the slab the renderer actually opens with", () => {
        // Read off initGLState: clipPlane0[3] = -0.0, clipPlane1[3] = 1000, fog 250..1250 against
        // an eye at 250. Nothing uses these four yet - the renderer still owns the real planes -
        // so the only way they can be wrong later is to have invented them now.
        const { clipFront, clipBack, fogFront, fogBack } = new Camera().controller.state;
        expect([clipFront, clipBack, fogFront, fogBack]).toEqual([250, 750, 0, 1000]);
    });

});

describe("the live-reference invariant", () => {
    it("hands out the quaternion itself, not a copy", () => {
        // quat4.multiply(self.myQuat, self.myQuat, xQ) is how every drag and every spin frame
        // turns the camera. It only works if the getter returns the object the controller holds.
        const camera = new Camera();
        camera.quat = quat4.create();
        quat4.set(camera.quat, 0, 0, 0, -1);

        const turn = quat4.create();
        quat4.setAxisAngle(turn, [0, 1, 0], Math.PI / 2);
        quat4.multiply(camera.quat, camera.quat, turn);

        expect([...camera.controller.state.quat]).toEqual([...camera.quat]);
        expect(camera.controller.state.quat[1]).not.toBe(0);
    });

    it("keeps the array it was given, so a later in-place write still lands", () => {
        const camera = new Camera();
        const assigned = quat4.create();
        camera.quat = assigned;
        quat4.set(assigned, 1, 0, 0, 0);
        expect([...camera.quat]).toEqual([1, 0, 0, 0]);
    });

    it("does the same for the origin", () => {
        const camera = new Camera();
        camera.origin[0] = 7;
        expect(camera.controller.state.origin).toEqual([7, 0, 0]);
    });
});

describe("the four properties and the controller are one thing", () => {
    it("writes through", () => {
        const camera = new Camera();
        camera.zoom = 0.4;
        camera.origin = [-10, -20, -30];
        camera.fogClipOffset = 400;

        expect(camera.controller.state.zoom).toBe(0.4);
        expect(camera.controller.state.origin).toEqual([-10, -20, -30]);
        // fogClipOffset is eyeDistance; the old name stays on this side of the seam for now.
        expect(camera.controller.state.eyeDistance).toBe(400);
    });

    it("reads back", () => {
        const camera = new Camera();
        camera.controller.acquire("api").set({ zoom: 3, origin: [1, 2, 3], eyeDistance: 300 });
        expect(camera.zoom).toBe(3);
        expect(camera.origin).toEqual([1, 2, 3]);
        expect(camera.fogClipOffset).toBe(300);
    });

    it("gives each instance its own camera", () => {
        const one = new Camera();
        const other = new Camera();
        one.zoom = 5;
        other.origin[0] = 9;
        expect(other.zoom).toBe(1);
        expect(one.origin).toEqual([0, 0, 0]);
    });
});
