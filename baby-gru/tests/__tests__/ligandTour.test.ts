/**
 * The generated ligand tour.
 *
 * Mostly this is here for one thing. A movie holds the camera with the slab policy in manual, so
 * its keyframes are the final word on clip and fog. A generated tour has no live scene to capture
 * a slab from, so it has to compute one - and when it did not, every keyframe inherited the slab
 * of the view the tour started from. Flying in from a whole protein to a ligand changes the zoom
 * by more than an order of magnitude with the slab standing still.
 *
 * It looked right until the policy was fixed, because auto-clip used to re-derive the slab from
 * zoom on every write and so overwrote the constant one these keyframes were asserting. Two wrongs
 * again. This is the test that says the tour means what it says.
 */
import { describe, expect, it } from "@jest/globals";
import * as quat4 from "gl-matrix/quat";
import { Keyframe } from "../../src/utils/cameraPath";
import { buildLigandTour } from "../../src/utils/ligandTour";
import { Point3 } from "../../src/utils/principalAxes";
import { slabForZoom } from "../../src/WebGLgComponents/slab";

/** A wide view of a whole protein: zoomed out, with the slab that implies. */
const wideView = (): Keyframe => ({
    quat: quat4.fromValues(0, 0, 0, -1),
    origin: [-30, -30, -30],
    zoom: 3,
    ...slabForZoom(3),
});

/** A small, distinctly elongated ligand, well away from the view centre. */
const at = (x: number, y: number, z: number): Point3 => ({ x, y, z });
const ligand: Point3[] = [
    at(10, 0, 0), at(11, 0.6, -0.3), at(12, -0.4, 0.3), at(13, 0.3, 0.2),
    at(14, -0.5, 0.4), at(15, 0.2, -0.3), at(16, 0.4, 0.5),
];

describe("the slab each keyframe carries", () => {
    it("matches that keyframe's own zoom", () => {
        const tour = buildLigandTour(wideView(), ligand);
        for (const keyframe of tour.keyframes) {
            // Finite first. toEqual counts NaN as equal to NaN, so without this the whole
            // assertion passes vacuously against a keyframe whose zoom never computed - which is
            // how a badly shaped fixture sat here looking green.
            expect(Number.isFinite(keyframe.zoom)).toBe(true);
            expect({
                clipFront: keyframe.clipFront, clipBack: keyframe.clipBack,
                fogFront: keyframe.fogFront, fogBack: keyframe.fogBack,
            }).toEqual(slabForZoom(keyframe.zoom));
        }
    });

    it("is not the same at both ends, which is the bug stated plainly", () => {
        const tour = buildLigandTour(wideView(), ligand);
        const wide = tour.keyframes[0];
        const close = tour.keyframes[1];

        // The tour genuinely changes zoom, or this test proves nothing.
        expect(close.zoom).toBeLessThan(wide.zoom / 2);
        expect(close.clipFront).not.toBeCloseTo(wide.clipFront, 6);
        expect(close.clipBack).toBeLessThan(wide.clipBack);
    });

    it("tightens as the camera comes in, rather than loosening", () => {
        const tour = buildLigandTour(wideView(), ligand);
        const [wide, close] = tour.keyframes;
        expect(close.fogBack / close.zoom).toBeCloseTo(wide.fogBack / wide.zoom, 10);
    });

    it("returns to the starting slab, since the tour returns to the starting view", () => {
        const tour = buildLigandTour(wideView(), ligand);
        const start = tour.keyframes[0];
        const end = tour.keyframes[tour.keyframes.length - 1];
        expect(end.clipFront).toBe(start.clipFront);
        expect(end.fogBack).toBe(start.fogBack);
    });
});

describe("what the tour does with the view it was given", () => {
    it("keeps the keyframes and segments in step", () => {
        const tour = buildLigandTour(wideView(), ligand);
        expect(tour.segments).toHaveLength(tour.keyframes.length - 1);
    });

    it("leaves the turn's departure facing where the spin ended", () => {
        // A half turn does not come back to where it started, so the keyframe after a spin has to
        // be the turned orientation or the following move snaps back through 180 degrees.
        const tour = buildLigandTour(wideView(), ligand);
        const [, arrival, departure] = tour.keyframes;
        const turned = quat4.getAngle(arrival.quat, departure.quat) * 180 / Math.PI;
        expect(turned).toBeGreaterThan(90);
    });
});
