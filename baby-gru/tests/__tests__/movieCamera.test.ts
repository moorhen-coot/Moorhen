/**
 * Lending the camera to a movie.
 *
 * Three invariants, each of which was a bug before it was a rule: a movie owns the camera so
 * reconciliation defers to it, the slab policy is manual so the movie's own clip and fog survive,
 * and the view comes back however the movie ends.
 */
import { describe, expect, it } from "@jest/globals";
import * as quat4 from "gl-matrix/quat";
import { CameraController, CameraState } from "../../src/WebGLgComponents/cameraController";
import { Movie } from "../../src/utils/cameraPath";
import { cameraTargetFrom, holdCameraForMovie } from "../../src/utils/movieCamera";

/** A keyframe at a given zoom, with the slab a movie would have authored. */
const keyframeAt = (zoom: number) => ({
    quat: [0, 0, 0, 1] as [number, number, number, number],
    origin: [0, 0, 0] as [number, number, number],
    zoom, clipFront: 8, clipBack: 21, fogFront: 8, fogBack: 21,
});

const startingAt = (overrides: Partial<CameraState> = {}): CameraState => ({
    quat: [0, 0, 0, -1],
    origin: [0, 0, 0],
    zoom: 1,
    eyeDistance: 250,
    clipFront: 8,
    clipBack: 21,
    fogFront: 8,
    fogBack: 21,
    ...overrides,
});

const keyframe = (origin: [number, number, number], zoom: number, clipFront: number) => ({
    quat: quat4.fromValues(0, 0, 0, -1),
    origin,
    zoom,
    clipFront,
    clipBack: clipFront * 2,
    fogFront: clipFront,
    fogBack: clipFront * 2,
});

const twoSecondMovie: Movie = {
    keyframes: [keyframe([0, 0, 0], 1, 8), keyframe([30, 0, 0], 4, 90)],
    segments: [{ seconds: 2, motion: { kind: "move" } }],
};

const autoClip = { kind: "auto" as const, fieldDepthFront: 8, fieldDepthBack: 21 };

describe("holding the camera", () => {
    it("takes it, so reconciliation has to defer", () => {
        const controller = new CameraController(startingAt());
        const hold = holdCameraForMovie({ cameraController: controller });

        // `driver` being set is the whole of it: moveCameraTo, which is how a store change reaches
        // the camera, declines while anyone holds it.
        expect(controller.driver).toBe("movie");

        hold.release();
        expect(controller.driver).toBeNull();
    });

    it("reports each sampled frame, which is how the fades reach the scene", () => {
        // The camera is only half of a movie. applySample puts the opacities on the scene, and it
        // needs the same sample at the same instant - so the hold hands it over at the one place
        // the movie is sampled rather than letting a second sampler run on its own clock.
        //
        // Without this the opacity half of every frame was computed and dropped: a fade saved and
        // reloaded perfectly, and never once seen.
        const controller = new CameraController(startingAt());
        const hold = holdCameraForMovie({ cameraController: controller });
        const seen: number[] = [];

        hold.play(
            {
                keyframes: [
                    { ...keyframeAt(1), opacity: { surface: 0 } },
                    { ...keyframeAt(2), opacity: { surface: 1 } },
                ],
                segments: [{ seconds: 1, motion: { kind: "move" } }],
            },
            sample => seen.push(sample.opacity.surface),
        );

        controller.tick(0);
        controller.tick(1);

        expect(seen).toHaveLength(2);
        expect(seen[0]).toBeCloseTo(0, 6);
        expect(seen[1]).toBeCloseTo(1, 6);
        hold.release();
    });

    it("puts the slab policy in manual, and gives it back", () => {
        // Under auto-clip the camera re-derives clip and fog from zoom on every write, so a movie
        // that authors its own slab would have it discarded frame by frame.
        const controller = new CameraController(startingAt(), autoClip);
        const hold = holdCameraForMovie({ cameraController: controller });

        expect(controller.slabPolicy).toEqual({ kind: "manual" });
        hold.release();
        expect(controller.slabPolicy).toEqual(autoClip);
    });

    it("lets a movie's own clip and fog reach the camera under auto-clip", () => {
        // The point of the policy switch, stated as the thing a viewer would see.
        const controller = new CameraController(startingAt(), autoClip);
        const hold = holdCameraForMovie({ cameraController: controller });
        hold.play(twoSecondMovie);

        controller.tick(0);
        controller.tick(2);

        expect(controller.state.clipFront).toBeCloseTo(90, 6);
        expect(controller.state.zoom).toBeCloseTo(4, 6);
        // Not zoom * 8, which is what the policy would have imposed.
        expect(controller.state.clipFront).not.toBeCloseTo(32, 6);
    });

    it("puts the view back on release", () => {
        const controller = new CameraController(startingAt({ zoom: 1, origin: [5, 6, 7] }));
        const hold = holdCameraForMovie({ cameraController: controller });
        hold.play(twoSecondMovie);
        controller.tick(0);
        controller.tick(2);
        expect(controller.state.origin[0]).toBeCloseTo(30, 6);

        hold.release();
        expect(controller.state.zoom).toBe(1);
        expect(controller.state.origin).toEqual([5, 6, 7]);
    });

    it("can be told to leave the view where the movie ended", () => {
        // A movie being authored in a panel wants to land on the frame you were looking at.
        const controller = new CameraController(startingAt());
        const hold = holdCameraForMovie({ cameraController: controller }, false);
        hold.play(twoSecondMovie);
        controller.tick(0);
        controller.tick(2);
        hold.release();
        expect(controller.state.zoom).toBeCloseTo(4, 6);
    });

    it("is safe to release twice, which a finally block will do", () => {
        const controller = new CameraController(startingAt({ zoom: 3 }), autoClip);
        const hold = holdCameraForMovie({ cameraController: controller });
        hold.release();
        expect(() => hold.release()).not.toThrow();
        expect(controller.slabPolicy).toEqual(autoClip);
    });
});

describe("the movie's clock", () => {
    it("starts at the first frame, whatever the clock says then", () => {
        // The live preview is ticked with wall-clock seconds, which are large and arbitrary; an
        // export is ticked with i/fps starting at zero. The sampler sees the same movie either way.
        const atZero = new CameraController(startingAt());
        holdCameraForMovie({ cameraController: atZero }).play(twoSecondMovie);
        atZero.tick(0);
        atZero.tick(1);

        const atWallClock = new CameraController(startingAt());
        holdCameraForMovie({ cameraController: atWallClock }).play(twoSecondMovie);
        atWallClock.tick(1_728_000_000);
        atWallClock.tick(1_728_000_001);

        expect(atWallClock.state.origin[0]).toBeCloseTo(atZero.state.origin[0], 10);
        expect(atWallClock.state.zoom).toBeCloseTo(atZero.state.zoom, 10);
    });

    it("does not announce every frame", () => {
        // A driven sequence is not a settle. Echoing per frame is the React cost the whole design
        // avoids - the store hears about it when the camera comes to rest.
        const controller = new CameraController(startingAt());
        const hold = holdCameraForMovie({ cameraController: controller });
        let announcements = 0;
        controller.subscribe(() => { announcements++; });

        hold.play(twoSecondMovie);
        for (let t = 0; t <= 2; t += 0.1) controller.tick(t);
        expect(announcements).toBe(0);

        hold.release();
        expect(announcements).toBeGreaterThan(0);
    });
});

describe("turning a sample into a camera target", () => {
    it("carries the slab across under the same names", () => {
        // Both sides call these offsets from the view centre now. They did not always, and a
        // mismatch here is a movie whose fog is hundreds of angstroms out.
        const target = cameraTargetFrom({
            quat: quat4.fromValues(0, 0, 0, -1),
            origin: [1, 2, 3],
            zoom: 2,
            clipFront: 16, clipBack: 42, fogFront: 16, fogBack: 42,
            opacity: { ligand: 0.5 },
        });
        expect(target).toEqual({
            quat: [0, 0, 0, -1],
            origin: [1, 2, 3],
            zoom: 2,
            clipFront: 16, clipBack: 42, fogFront: 16, fogBack: 42,
        });
    });

    it("leaves opacity out, which is not the camera's business", () => {
        const target = cameraTargetFrom({
            quat: quat4.fromValues(0, 0, 0, -1),
            origin: [0, 0, 0], zoom: 1,
            clipFront: 8, clipBack: 21, fogFront: 8, fogBack: 21,
            opacity: { ligand: 0.5 },
        });
        expect("opacity" in target).toBe(false);
    });
});
