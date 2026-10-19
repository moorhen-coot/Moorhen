/**
 * The camera path: does it go where it was told, and does it stop when it should?
 *
 * The property that matters most is the one that is easiest to get wrong and hardest to see in a
 * static test: velocity continuity through an interior keyframe. A path that is continuous in
 * position but not in velocity passes every "is it at B at 2 seconds" test and still looks like a
 * slideshow. So the interesting tests here measure finite differences, not positions.
 */
import { describe, expect, it } from "@jest/globals";
import * as quat4 from "gl-matrix/quat";
import {
    CameraKeyframe, Movie, Vec3, easeInOut, movieDuration, sampleMovie,
} from "../../src/utils/cameraPath";

const keyframe = (origin: Vec3, zoom = 1, degreesAboutY = 0, visible?: string[]): CameraKeyframe => {
    const q = quat4.create();
    quat4.setAxisAngle(q, [0, 1, 0], (degreesAboutY * Math.PI) / 180);
    return { quat: q, origin, zoom, clipStart: 8, clipEnd: 21, fogStart: 242, fogEnd: 271, visible };
};

/** How far the camera moves per second at a moment, by finite difference. */
const speedAt = (movie: Movie, seconds: number, step = 1e-3): number => {
    const before = sampleMovie(movie, seconds - step).origin;
    const after = sampleMovie(movie, seconds + step).origin;
    return Math.hypot(after[0] - before[0], after[1] - before[1], after[2] - before[2]) / (2 * step);
};

/** Angular speed in degrees per second, likewise. */
const turnRateAt = (movie: Movie, seconds: number, step = 1e-3): number => {
    const before = sampleMovie(movie, seconds - step).quat;
    const after = sampleMovie(movie, seconds + step).quat;
    return (quat4.getAngle(before, after) * 180) / Math.PI / (2 * step);
};

describe("easing", () => {
    it("starts and stops still", () => {
        expect(easeInOut(0)).toBe(0);
        expect(easeInOut(1)).toBe(1);
        expect(easeInOut(0.5)).toBeCloseTo(0.5, 10);
        // Zero slope at both ends is the whole point.
        expect(easeInOut(0.001)).toBeLessThan(0.001);
        expect(1 - easeInOut(0.999)).toBeLessThan(0.001);
    });

    it("clamps rather than extrapolating", () => {
        expect(easeInOut(-1)).toBe(0);
        expect(easeInOut(2)).toBe(1);
    });
});

describe("a movie's shape", () => {
    it("adds up its segments", () => {
        const movie: Movie = {
            keyframes: [keyframe([0, 0, 0]), keyframe([10, 0, 0]), keyframe([20, 0, 0])],
            segments: [{ seconds: 2, motion: { kind: "move" } }, { seconds: 3, motion: { kind: "hold" } }],
        };
        expect(movieDuration(movie)).toBe(5);
    });

    it("is just the one keyframe when there is nothing to move between", () => {
        const movie: Movie = { keyframes: [keyframe([1, 2, 3], 4)], segments: [] };
        expect(sampleMovie(movie, 0).origin).toEqual([1, 2, 3]);
        expect(sampleMovie(movie, 99).zoom).toBe(4);
    });

    it("refuses a movie with no keyframes rather than guessing", () => {
        expect(() => sampleMovie({ keyframes: [], segments: [] }, 0)).toThrow();
    });
});

describe("passing through keyframes", () => {
    const movie: Movie = {
        keyframes: [keyframe([0, 0, 0], 1), keyframe([10, 5, 0], 2), keyframe([20, 0, 0], 3)],
        segments: [{ seconds: 2, motion: { kind: "move" } }, { seconds: 2, motion: { kind: "move" } }],
    };

    it("is at each keyframe at its own time", () => {
        expect(sampleMovie(movie, 0).origin[0]).toBeCloseTo(0, 6);
        expect(sampleMovie(movie, 2).origin[0]).toBeCloseTo(10, 6);
        expect(sampleMovie(movie, 2).origin[1]).toBeCloseTo(5, 6);
        expect(sampleMovie(movie, 4).origin[0]).toBeCloseTo(20, 6);
    });

    it("interpolates the other camera fields too", () => {
        expect(sampleMovie(movie, 2).zoom).toBeCloseTo(2, 6);
        const midway = sampleMovie(movie, 1).zoom;
        expect(midway).toBeGreaterThan(1);
        expect(midway).toBeLessThan(2);
    });

    it("clamps outside its own duration instead of extrapolating", () => {
        expect(sampleMovie(movie, -5).origin[0]).toBeCloseTo(0, 6);
        expect(sampleMovie(movie, 500).origin[0]).toBeCloseTo(20, 6);
    });
});

describe("turning the corner", () => {
    /** A->B->C with a bend at B, as two move segments. */
    const bend: Movie = {
        keyframes: [keyframe([0, 0, 0]), keyframe([10, 10, 0]), keyframe([20, 0, 0])],
        segments: [{ seconds: 2, motion: { kind: "move" } }, { seconds: 2, motion: { kind: "move" } }],
    };

    it("does not stop at an interior keyframe", () => {
        // The failure this exists for: per-segment easing brings the camera to a halt at B.
        const throughB = speedAt(bend, 2);
        const midFirst = speedAt(bend, 1);
        expect(throughB).toBeGreaterThan(0.5 * midFirst);
    });

    it("keeps its speed continuous across the corner", () => {
        const before = speedAt(bend, 2 - 0.05);
        const after = speedAt(bend, 2 + 0.05);
        expect(Math.abs(after - before) / Math.max(before, after)).toBeLessThan(0.25);
    });

    it("does ease at the beginning and the end", () => {
        expect(speedAt(bend, 0.02)).toBeLessThan(0.5 * speedAt(bend, 1));
        expect(speedAt(bend, 3.98)).toBeLessThan(0.5 * speedAt(bend, 3));
    });

    it("stops at a keyframe where the run is broken by a hold", () => {
        // A hold means the camera really has arrived, so easing belongs there.
        const interrupted: Movie = {
            keyframes: [keyframe([0, 0, 0]), keyframe([10, 10, 0]), keyframe([10, 10, 0]), keyframe([20, 0, 0])],
            segments: [
                { seconds: 2, motion: { kind: "move" } },
                { seconds: 1, motion: { kind: "hold" } },
                { seconds: 2, motion: { kind: "move" } },
            ],
        };
        expect(speedAt(interrupted, 1.98)).toBeLessThan(0.5 * speedAt(interrupted, 1));
    });

    it("turns the orientation corner too, not just the position", () => {
        const turning: Movie = {
            keyframes: [keyframe([0, 0, 0], 1, 0), keyframe([0, 0, 0], 1, 90), keyframe([0, 0, 0], 1, 180)],
            segments: [{ seconds: 2, motion: { kind: "move" } }, { seconds: 2, motion: { kind: "move" } }],
        };
        const throughB = turnRateAt(turning, 2);
        expect(throughB).toBeGreaterThan(0.5 * turnRateAt(turning, 1));
    });

    it("does not swing wide of a keyframe it should pass through", () => {
        // Uniform Catmull-Rom overshoots on a sharp direction change; centripetal does not. B is
        // the extreme point in y, so nothing on the path should go markedly beyond it.
        let highest = -Infinity;
        for (let t = 0; t <= 4; t += 0.01) highest = Math.max(highest, sampleMovie(bend, t).origin[1]);
        expect(highest).toBeLessThan(10.5);
    });
});

describe("spin", () => {
    const spin: Movie = {
        keyframes: [keyframe([0, 0, 0]), keyframe([0, 0, 0])],
        segments: [{ seconds: 4, motion: { kind: "spin", turns: 1 } }],
    };

    it("ends where it began", () => {
        const start = sampleMovie(spin, 0).quat;
        const end = sampleMovie(spin, 4).quat;
        expect(quat4.getAngle(start, end)).toBeCloseTo(0, 4);
    });

    it("goes round the long way rather than not moving at all", () => {
        const quarter = sampleMovie(spin, 1).quat;
        const start = sampleMovie(spin, 0).quat;
        expect(quat4.getAngle(start, quarter)).toBeGreaterThan(0.1);
    });

    it("leaves position and zoom alone", () => {
        const midway = sampleMovie(spin, 2);
        expect(midway.origin).toEqual([0, 0, 0]);
        expect(midway.zoom).toBe(1);
    });

    it("starts and stops smoothly", () => {
        expect(turnRateAt(spin, 0.02)).toBeLessThan(0.5 * turnRateAt(spin, 2));
    });

    it("does two turns when asked", () => {
        const twice: Movie = { ...spin, segments: [{ seconds: 4, motion: { kind: "spin", turns: 2 } }] };
        // Half way through an eased double turn is one full turn, so back to the start.
        expect(quat4.getAngle(sampleMovie(twice, 0).quat, sampleMovie(twice, 2).quat)).toBeCloseTo(0, 3);
    });
});

describe("rock", () => {
    const rock: Movie = {
        keyframes: [keyframe([0, 0, 0]), keyframe([0, 0, 0])],
        segments: [{ seconds: 4, motion: { kind: "rock", degrees: 20, periodSeconds: 2 } }],
    };

    it("returns to the middle every period", () => {
        const middle = sampleMovie(rock, 0).quat;
        for (const t of [0, 2, 4]) {
            expect((quat4.getAngle(middle, sampleMovie(rock, t).quat) * 180) / Math.PI).toBeCloseTo(0, 3);
        }
    });

    it("reaches the rock angle and does not exceed it", () => {
        const middle = sampleMovie(rock, 0).quat;
        let widest = 0;
        for (let t = 0; t <= 4; t += 0.01) {
            widest = Math.max(widest, (quat4.getAngle(middle, sampleMovie(rock, t).quat) * 180) / Math.PI);
        }
        expect(widest).toBeGreaterThan(19);
        expect(widest).toBeLessThan(20.5);
    });

    it("goes both ways", () => {
        // A quarter and three quarters through a period are opposite extremes, so a full rock
        // angle apart from each other and half that from the middle.
        const oneWay = sampleMovie(rock, 0.5).quat;
        const theOther = sampleMovie(rock, 1.5).quat;
        expect((quat4.getAngle(oneWay, theOther) * 180) / Math.PI).toBeCloseTo(40, 1);
    });
});

describe("visibility", () => {
    const movie: Movie = {
        keyframes: [
            keyframe([0, 0, 0], 1, 0, ["ribbons"]),
            keyframe([10, 0, 0], 1, 0, ["ribbons", "ligand"]),
            keyframe([20, 0, 0], 1, 0, ["ligand"]),
        ],
        segments: [{ seconds: 2, motion: { kind: "move" } }, { seconds: 2, motion: { kind: "move" } }],
    };

    it("holds the departing keyframe's set until the next is reached", () => {
        expect(sampleMovie(movie, 0).visible).toEqual(["ribbons"]);
        expect(sampleMovie(movie, 1.9).visible).toEqual(["ribbons"]);
    });

    it("switches as a keyframe is reached, never between two", () => {
        expect(sampleMovie(movie, 2).visible).toEqual(["ribbons", "ligand"]);
        expect(sampleMovie(movie, 4).visible).toEqual(["ligand"]);
    });

    it("inherits from earlier when a keyframe does not say", () => {
        const sparse: Movie = {
            keyframes: [keyframe([0, 0, 0], 1, 0, ["ribbons"]), keyframe([10, 0, 0]), keyframe([20, 0, 0])],
            segments: [{ seconds: 2, motion: { kind: "move" } }, { seconds: 2, motion: { kind: "move" } }],
        };
        expect(sampleMovie(sparse, 3).visible).toEqual(["ribbons"]);
    });

    it("is empty when nothing ever says otherwise", () => {
        const movie: Movie = {
            keyframes: [keyframe([0, 0, 0]), keyframe([1, 0, 0])],
            segments: [{ seconds: 1, motion: { kind: "move" } }],
        };
        expect(sampleMovie(movie, 0.5).visible).toEqual([]);
    });
});

describe("a movie that mixes motions", () => {
    // The thing the whole model exists for: move in, rock to show it off, move on.
    const movie: Movie = {
        keyframes: [
            keyframe([0, 0, 0], 0.2),
            keyframe([10, 0, 0], 1.5),
            keyframe([10, 0, 0], 1.5),
            keyframe([30, 10, 0], 0.4),
        ],
        segments: [
            { seconds: 3, motion: { kind: "move" } },
            { seconds: 4, motion: { kind: "rock", degrees: 15, periodSeconds: 2 } },
            { seconds: 3, motion: { kind: "move" } },
        ],
    };

    it("runs for as long as its segments do", () => {
        expect(movieDuration(movie)).toBe(10);
    });

    it("holds position while rocking", () => {
        for (const t of [3.5, 4.5, 5.5, 6.5]) {
            expect(sampleMovie(movie, t).origin[0]).toBeCloseTo(10, 6);
            expect(sampleMovie(movie, t).zoom).toBeCloseTo(1.5, 6);
        }
    });

    it("never produces a value that is not a number", () => {
        for (let t = 0; t <= 10; t += 0.05) {
            const sample = sampleMovie(movie, t);
            [...sample.origin, sample.zoom, sample.clipStart, sample.clipEnd, sample.fogStart, sample.fogEnd]
                .forEach(value => expect(Number.isFinite(value)).toBe(true));
            sample.quat.forEach(value => expect(Number.isFinite(value)).toBe(true));
            expect(quat4.length(sample.quat)).toBeCloseTo(1, 6);
        }
    });
});
