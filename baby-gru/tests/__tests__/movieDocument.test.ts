/**
 * The movie document, and the scene quantities a keyframe now carries.
 *
 * Two rules are being pinned, and they are the same rule seen from two sides. A field a movie does
 * not mention is a field it does not animate - so a camera-only tour leaves the lighting alone
 * rather than asserting a rig it never chose. And a mode, which has no halfway, belongs to the
 * movie rather than to a keyframe.
 */
import { describe, expect, it } from "@jest/globals";
import * as quat4 from "gl-matrix/quat";
import { Keyframe, Movie, SceneKeyframe, sampleMovie } from "../../src/utils/cameraPath";
import {
    DEFAULT_OUTPUT, DEFAULT_SCENE, MovieDocument,
    documentFrameCount, emptyMovie, movieProblems,
} from "../../src/utils/movieDocument";

const keyframe = (zoom: number, scene?: SceneKeyframe): Keyframe => ({
    quat: quat4.fromValues(0, 0, 0, -1),
    origin: [0, 0, 0],
    zoom,
    clipFront: 8, clipBack: 21, fogFront: 8, fogBack: 21,
    scene,
});

const twoKeyframes = (from?: SceneKeyframe, to?: SceneKeyframe): Movie => ({
    keyframes: [keyframe(1, from), keyframe(2, to)],
    segments: [{ seconds: 2, motion: { kind: "move" } }],
});

describe("the scene quantities on a keyframe", () => {
    it("interpolate between two keyframes", () => {
        const movie = twoKeyframes(
            { backgroundColor: [0, 0, 0, 1], specularPower: 10 },
            { backgroundColor: [1, 1, 1, 1], specularPower: 50 },
        );
        const half = sampleMovie(movie, 1).scene;
        expect(half.specularPower).toBeGreaterThan(10);
        expect(half.specularPower).toBeLessThan(50);
        expect(half.backgroundColor![0]).toBeGreaterThan(0);
        expect(half.backgroundColor![0]).toBeLessThan(1);
    });

    it("arrive exactly at the far keyframe", () => {
        const movie = twoKeyframes(
            { lightPosition: [0, 0, 0, 1] },
            { lightPosition: [25, 25, 50, 1] },
        );
        expect(sampleMovie(movie, 2).scene.lightPosition).toEqual([25, 25, 50, 1]);
    });

    it("stay inside the range they were given", () => {
        // Straight lines rather than splines, for the same reason as opacity: a colour channel is
        // bounded, and a Catmull-Rom through three colours can leave the gamut on the way.
        const movie: Movie = {
            keyframes: [
                keyframe(1, { backgroundColor: [0, 0, 0, 1] }),
                keyframe(1, { backgroundColor: [1, 1, 1, 1] }),
                keyframe(1, { backgroundColor: [0, 0, 0, 1] }),
            ],
            segments: [
                { seconds: 1, motion: { kind: "move" } },
                { seconds: 1, motion: { kind: "move" } },
            ],
        };
        for (let t = 0; t <= 2; t += 0.05) {
            for (const channel of sampleMovie(movie, t).scene.backgroundColor!) {
                expect(channel).toBeGreaterThanOrEqual(0);
                expect(channel).toBeLessThanOrEqual(1);
            }
        }
    });

    it("are absent when the movie never mentions them", () => {
        // The rule that keeps a camera-only tour from asserting a lighting rig.
        expect(sampleMovie(twoKeyframes(), 1).scene).toEqual({});
    });

    it("hold a value only one end gives, rather than blending from nothing", () => {
        const movie = twoKeyframes(undefined, { specularPower: 42 });
        expect(sampleMovie(movie, 0).scene.specularPower).toBe(42);
        expect(sampleMovie(movie, 1).scene.specularPower).toBe(42);
    });

    it("come through a hold or a spin unchanged", () => {
        const movie: Movie = {
            keyframes: [keyframe(1, { specularPower: 7 }), keyframe(1, { specularPower: 99 })],
            segments: [{ seconds: 2, motion: { kind: "spin", turns: 1 } }],
        };
        expect(sampleMovie(movie, 1).scene.specularPower).toBe(7);
    });
});

describe("a new movie", () => {
    it("starts empty, quiet, and at a sensible size", () => {
        const movie = emptyMovie();
        expect(movie.path.keyframes).toEqual([]);
        expect(movie.scene).toEqual(DEFAULT_SCENE);
        expect(movie.output).toEqual(DEFAULT_OUTPUT);
    });

    it("does not acquire the expensive passes by accident", () => {
        // A movie made without thinking about shadows should not have them, and the costly passes
        // are the ones most likely to turn a smooth export into a slow one.
        const { scene } = emptyMovie();
        expect([scene.doShadow, scene.doSSAO, scene.doEdgeDetect, scene.useOffScreenBuffers])
            .toEqual([false, false, false, false]);
    });

    it("does not share its settings between documents", () => {
        const one = emptyMovie();
        one.scene.doShadow = true;
        expect(emptyMovie().scene.doShadow).toBe(false);
    });
});

describe("counting frames", () => {
    it("is the duration times the frame rate", () => {
        const movie: MovieDocument = { ...emptyMovie(), path: twoKeyframes() };
        movie.output.fps = 30;
        expect(documentFrameCount(movie)).toBe(60);
    });

    it("never says zero, so an empty movie still renders something", () => {
        expect(documentFrameCount(emptyMovie())).toBe(1);
    });
});

describe("what makes a movie unplayable", () => {
    const playable = (): MovieDocument => ({ ...emptyMovie(), path: twoKeyframes() });

    it("says nothing about a sound one", () => {
        expect(movieProblems(playable())).toEqual([]);
    });

    it("notices a segment missing between two keyframes", () => {
        // The invariant most easily broken halfway through an edit.
        const movie = playable();
        movie.path = { ...movie.path, segments: [] };
        expect(movieProblems(movie).join(" ")).toContain("segments");
    });

    it("notices a segment with no duration", () => {
        const movie = playable();
        movie.path = { ...movie.path, segments: [{ seconds: 0, motion: { kind: "move" } }] };
        expect(movieProblems(movie).join(" ")).toContain("duration");
    });

    it("notices an odd output size, which an encoder will refuse or silently crop", () => {
        const movie = playable();
        movie.output = { ...movie.output, width: 1921 };
        expect(movieProblems(movie).join(" ")).toContain("even");
    });

    it("notices an empty movie", () => {
        expect(movieProblems(emptyMovie()).join(" ")).toContain("no keyframes");
    });
});
