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

    it("does not adopt the array it was given, only its values", () => {
        // This test used to assert the opposite, and that was the bug. The invariant MGWebGL
        // actually relies on is that mutating *what the getter returns* works - every call site
        // goes through `self.myQuat` - not that the camera keeps the caller's object. Keeping it
        // meant the camera's storage could be someone else's frozen state.
        const camera = new Camera();
        const assigned = quat4.create();
        quat4.set(assigned, 0, 0, 0, -1);
        camera.quat = assigned;

        quat4.set(assigned, 1, 0, 0, 0);
        expect([...camera.quat]).toEqual([0, 0, 0, -1]);

        quat4.set(camera.quat, 0, 1, 0, 0);
        expect([...camera.controller.state.quat]).toEqual([0, 1, 0, 0]);
    });

    it("does the same for the origin", () => {
        const camera = new Camera();
        camera.origin[0] = 7;
        expect(camera.controller.state.origin).toEqual([7, 0, 0]);
    });
});

describe("the camera owns its arrays", () => {
    /**
     * This cost a crash on loading a file: "Cannot assign to read only property '0'".
     *
     * Redux Toolkit freezes state in development. The camera's origin reached the store - handed
     * out live by setOrigin to onOriginChanged - and was frozen where it lay, so the next frame of
     * the next move could not write it. The same trap was open in the other direction, a
     * store-owned array arriving through the setter and becoming the camera's storage.
     *
     * The rule is now simply that an assigned array is copied in and the camera's own array never
     * leaves. These tests state the first half; the dispatch sites carry the second.
     */
    it("does not adopt a frozen array it is given", () => {
        const camera = new Camera();
        camera.origin = Object.freeze([1, 2, 3]) as unknown as [number, number, number];
        expect(() => { camera.origin[0] = 9; }).not.toThrow();
        expect(camera.controller.state.origin).toEqual([9, 2, 3]);
    });

    it("does the same for the quaternion", () => {
        const camera = new Camera();
        camera.quat = Object.freeze([0, 0, 0, 1]) as unknown as quat4;
        expect(() => quat4.set(camera.quat, 1, 0, 0, 0)).not.toThrow();
        expect([...camera.quat]).toEqual([1, 0, 0, 0]);
    });

    it("leaves the array it was given alone afterwards", () => {
        const camera = new Camera();
        const theirs: [number, number, number] = [1, 2, 3];
        camera.origin = theirs;
        camera.origin[0] = 50;
        expect(theirs).toEqual([1, 2, 3]);
    });

    it("keeps a Float32Array a Float32Array, as MGWebGL installs one at mount", () => {
        const camera = new Camera();
        camera.quat = quat4.create();
        expect(camera.quat).toBeInstanceOf(Float32Array);
    });

    it("can still be ticked through a move after being handed frozen state", () => {
        // The crash in full: a frozen origin, then a move, then writeVec3 on the first frame.
        const camera = new Camera();
        camera.origin = Object.freeze([0, 0, 0]) as unknown as [number, number, number];
        camera.controller.acquire("centring").moveTo({ origin: [10, 20, 30] }, { kind: "ease", seconds: 1 });

        expect(() => { camera.controller.tick(0); camera.controller.tick(1); }).not.toThrow();
        expect(camera.origin[0]).toBeCloseTo(10, 10);
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
