/**
 * Telling the rest of the application where a travelling camera is.
 *
 * The controller's contract is that listeners hear from it when the camera comes to rest, which is
 * what keeps playback free of React. That is wrong for the handful of things drawn *about* the
 * view centre - a contoured map, the environment distances, the symmetry mates - because for the
 * whole length of a movie they were being drawn around where the camera stood when Play was
 * pressed, and the map slid off the screen.
 *
 * The motion echo is the exception, and these are its edges: off unless asked for, measured in
 * distance so that holding still or turning on the spot costs nothing, and put back when the movie
 * hands the camera over.
 */
import { describe, expect, it } from "@jest/globals";
import * as quat4 from "gl-matrix/quat";
import { CameraController, CameraState } from "../../src/WebGLgComponents/cameraController";
import { Movie } from "../../src/utils/cameraPath";
import { holdCameraForMovie } from "../../src/utils/movieCamera";

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

const keyframe = (origin: [number, number, number], quat = quat4.fromValues(0, 0, 0, -1)) => ({
    quat,
    origin,
    zoom: 1,
    clipFront: 8,
    clipBack: 21,
    fogFront: 8,
    fogBack: 21,
});

/** Travels 100 angstrom along x over ten seconds, so one angstrom per tenth of a second. */
const travelling: Movie = {
    keyframes: [keyframe([0, 0, 0]), keyframe([100, 0, 0])],
    segments: [{ seconds: 10, motion: { kind: "move" } }],
};

/** Turns on the spot for ten seconds, going nowhere. */
const turningOnTheSpot: Movie = {
    keyframes: [
        keyframe([0, 0, 0], quat4.fromValues(0, 0, 0, -1)),
        keyframe([0, 0, 0], quat4.fromValues(0, 1, 0, 0)),
    ],
    segments: [{ seconds: 10, motion: { kind: "move" } }],
};

/** Play a movie through a hold, counting what listeners heard and when. */
const playing = (movie: Movie, echo: { distance: number } | null, ticks: number[]) => {
    const controller = new CameraController(startingAt());
    const heard: number[][] = [];
    controller.subscribe(state => heard.push([...state.origin]));
    const hold = holdCameraForMovie({ cameraController: controller }, false, echo);
    hold.play(movie);
    ticks.forEach(seconds => controller.tick(seconds));
    return { controller, heard, hold };
};

describe("the contract when nobody asks for an echo", () => {
    it("says nothing while a movie travels", () => {
        // The existing behaviour, unchanged: every path except a movie leaves the policy alone.
        const { heard } = playing(travelling, null, [0, 1, 2, 3, 4, 5]);
        expect(heard).toEqual([]);
    });

    it("still moves the camera while saying nothing", () => {
        const { controller } = playing(travelling, null, [0, 5]);
        expect(controller.state.origin[0]).toBeCloseTo(50, 5);
    });
});

describe("echoing by distance", () => {
    it("tells listeners far less often than it is ticked", () => {
        // A hundred angstrom of travel at a ten angstrom threshold, sampled every tenth of a
        // second: a hundred and one ticks, and nothing like a hundred and one echoes. The exact
        // count is not fixed here because the segment eases, so the camera covers the ground
        // unevenly - the point is only that the echo is driven by distance and not by ticking.
        const ticks = Array.from({ length: 101 }, (_, i) => i / 10);
        const { heard } = playing(travelling, { distance: 10 }, ticks);
        expect(heard.length).toBeGreaterThan(5);
        expect(heard.length).toBeLessThanOrEqual(10);
    });

    it("does not echo before the threshold has been reached", () => {
        // Early in an eased segment the camera has barely left; nothing should be announced.
        const { heard, controller } = playing(travelling, { distance: 5 }, [0, 0.1, 0.2]);
        expect(controller.state.origin[0]).toBeLessThan(5);
        expect(heard).toEqual([]);
    });

    it("says nothing for a camera turning on the spot", () => {
        // The whole reason for measuring distance rather than counting frames or seconds. A spin
        // is the commonest movie there is, and nothing drawn about the centre needs redoing for it.
        const { heard } = playing(turningOnTheSpot, { distance: 1 },
            [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        expect(heard).toEqual([]);
    });

    it("says nothing while a movie holds a frame", () => {
        const { heard } = playing(travelling, { distance: 5 }, [0, 0, 0, 0]);
        expect(heard).toEqual([]);
    });

    it("measures from the last echo, not from the start", () => {
        // Otherwise a long journey echoes once and then falls silent, or echoes on every frame
        // after the first threshold is passed - depending on which way round the mistake is made.
        // Stated as the invariant the threshold actually promises: consecutive echoes are never
        // closer together than it, and the journey is reported from end to end.
        const ticks = Array.from({ length: 101 }, (_, i) => i / 10);
        const { heard } = playing(travelling, { distance: 10 }, ticks);
        const gaps = heard.slice(1).map((origin, i) => origin[0] - heard[i][0]);
        gaps.forEach(gap => expect(gap).toBeGreaterThanOrEqual(10));
        expect(heard[0][0]).toBeGreaterThanOrEqual(10);
    });

    it("leaves the last stretch of an eased arrival to the release", () => {
        // A threshold means the final approach - which eases, so it is slow - can end without ever
        // crossing it again. That would leave the scene drawn a few angstrom behind where the
        // movie stopped, which matters because a panel's Play deliberately stays on the last
        // keyframe. Handing the camera back announces where it actually came to rest, and this is
        // the test that says so rather than leaving it to driverRelease's good manners.
        const ticks = Array.from({ length: 101 }, (_, i) => i / 10);
        const { heard, controller, hold } = playing(travelling, { distance: 10 }, ticks);
        const beforeRelease = heard.at(-1)![0];
        expect(beforeRelease).toBeLessThan(100);

        hold.release();
        expect(controller.state.origin[0]).toBeCloseTo(100, 3);
        expect(heard.at(-1)![0]).toBeCloseTo(100, 3);
    });

    it("measures in three dimensions, not along one axis", () => {
        const diagonal: Movie = {
            keyframes: [keyframe([0, 0, 0]), keyframe([3, 4, 0])],
            segments: [{ seconds: 1, motion: { kind: "move" } }],
        };
        // The move is 5 long, so a threshold of 4 is passed and one of 6 is not.
        expect(playing(diagonal, { distance: 4 }, [0, 1]).heard.length).toBe(1);
        expect(playing(diagonal, { distance: 6 }, [0, 1]).heard.length).toBe(0);
    });
});

describe("the policy is the movie's to borrow", () => {
    it("is off before a movie and off again afterwards", () => {
        const controller = new CameraController(startingAt());
        expect(controller.motionEcho).toBeNull();
        const hold = holdCameraForMovie({ cameraController: controller }, false, { distance: 2 });
        expect(controller.motionEcho).toEqual({ distance: 2 });
        hold.release();
        expect(controller.motionEcho).toBeNull();
    });

    it("is put back on release even when a movie is cut short", () => {
        const controller = new CameraController(startingAt());
        const hold = holdCameraForMovie({ cameraController: controller }, false, { distance: 2 });
        hold.play(travelling);
        controller.tick(0);
        controller.tick(3);
        hold.release();
        expect(controller.motionEcho).toBeNull();
    });

    it("starts counting from where the camera is, not from the last thing announced", () => {
        // A movie beginning far from wherever the camera was last heard from should not fire an
        // echo on its first frame for a journey it has not made yet.
        const controller = new CameraController(startingAt({ origin: [500, 0, 0] }));
        const heard: number[][] = [];
        controller.subscribe(state => heard.push([...state.origin]));
        const hold = holdCameraForMovie({ cameraController: controller }, false, { distance: 5 });
        hold.play({
            keyframes: [keyframe([500, 0, 0]), keyframe([501, 0, 0])],
            segments: [{ seconds: 1, motion: { kind: "move" } }],
        });
        controller.tick(0);
        controller.tick(0.5);
        expect(heard).toEqual([]);
        hold.release();
    });
});

describe("an eased move, which is not a movie", () => {
    it("echoes on the way when a policy is set, and settles as it always did", () => {
        // moveTo runs through the same tick. Nothing sets a policy for it today, but if anything
        // ever does, the arrival notification must still happen - that is what keeps the store's
        // copy of the view current once the camera stops.
        const controller = new CameraController(startingAt());
        const heard: number[][] = [];
        controller.subscribe(state => heard.push([...state.origin]));
        controller.motionEcho = { distance: 4 };
        const driver = controller.acquire("centring");
        driver.moveTo({ origin: [10, 0, 0] }, { kind: "ease", seconds: 1 });
        controller.tick(0);
        controller.tick(0.5);
        const midway = heard.length;
        controller.tick(1);
        expect(midway).toBeGreaterThan(0);
        expect(heard.length).toBeGreaterThan(midway);
        expect(controller.state.origin[0]).toBeCloseTo(10, 5);
    });
});
