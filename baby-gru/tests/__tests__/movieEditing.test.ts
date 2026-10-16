/**
 * Editing a movie document.
 *
 * The invariant under test throughout: one segment per gap, so n keyframes have n-1 segments. Most
 * of the ways a movie can end up nonsensical are a break in that, and a broken one does not throw
 * - it produces a movie whose duration is wrong and whose later keyframes are never reached.
 */
import { describe, expect, it } from "@jest/globals";
import {
    DEFAULT_SEGMENT_SECONDS, addKeyframe, animatedObjects, applySceneToAll, cloneKeyframe,
    deleteKeyframe, hasTrailingSegment, introduceObject, moveKeyframe, releaseObject,
    removeTrailingSegment, replaceKeyframe, setMotion, setObjectOpacity, setSegment,
} from "../../src/utils/movieEditing";
import { emptyMovie } from "../../src/utils/movieDocument";
import type { MovieDocument } from "../../src/utils/movieDocument";
import type { Keyframe } from "../../src/utils/cameraPath";

const frameAt = (zoom: number): Keyframe => ({
    quat: [0, 0, 0, 1], origin: [0, 0, 0], zoom,
    clipFront: 10, clipBack: 20, fogFront: 8, fogBack: 21,
});

/** A movie of `count` keyframes, each distinguishable by its zoom. */
const movieOf = (count: number): MovieDocument => {
    let document = emptyMovie("Test");
    for (let i = 0; i < count; i++) document = addKeyframe(document, frameAt(i));
    return document;
};

const zooms = (document: MovieDocument) => document.path.keyframes.map(k => k.zoom);
const seconds = (document: MovieDocument) => document.path.segments.map(s => s.seconds);

const invariantHolds = (document: MovieDocument) =>
    document.path.segments.length === Math.max(0, document.path.keyframes.length - 1);

describe("adding keyframes", () => {
    it("gives the first keyframe no segment, because there is no gap yet", () => {
        const document = movieOf(1);
        expect(document.path.segments).toHaveLength(0);
        expect(invariantHolds(document)).toBe(true);
    });

    it("adds a segment for each gap that appears", () => {
        expect(seconds(movieOf(4)))
            .toEqual([DEFAULT_SEGMENT_SECONDS, DEFAULT_SEGMENT_SECONDS, DEFAULT_SEGMENT_SECONDS]);
        expect(invariantHolds(movieOf(4))).toBe(true);
    });

    it("inserts in the middle without changing how long the movie runs", () => {
        // Inserting a keyframe to adjust a path should feel like adjusting it, not lengthening
        // it - the two halves of the split segment share the time it had.
        const document = addKeyframe(movieOf(3), frameAt(99), 1);
        expect(zooms(document)).toEqual([0, 99, 1, 2]);
        expect(seconds(document)).toEqual([1.5, 1.5, DEFAULT_SEGMENT_SECONDS]);
        expect(invariantHolds(document)).toBe(true);
    });

    it("inserts at the front", () => {
        const document = addKeyframe(movieOf(2), frameAt(99), 0);
        expect(zooms(document)).toEqual([99, 0, 1]);
        expect(invariantHolds(document)).toBe(true);
    });

    it("leaves the document it was given alone", () => {
        // Redux freezes state in development, so an operation that mutated in place would work in
        // a build and throw in a dev session.
        const before = movieOf(2);
        addKeyframe(before, frameAt(99));
        expect(zooms(before)).toEqual([0, 1]);
    });
});

describe("deleting keyframes", () => {
    it("merges the two segments either side, keeping the movie the same length", () => {
        // The reason keyframes and segments are separate lists at all.
        const document = deleteKeyframe(setSegment(movieOf(3), 1, { seconds: 5 }), 1);
        expect(zooms(document)).toEqual([0, 2]);
        expect(seconds(document)).toEqual([DEFAULT_SEGMENT_SECONDS + 5]);
        expect(invariantHolds(document)).toBe(true);
    });

    it("shortens the movie when an end keyframe goes, because there is nothing else it means", () => {
        const document = deleteKeyframe(movieOf(3), 2);
        expect(zooms(document)).toEqual([0, 1]);
        expect(seconds(document)).toEqual([DEFAULT_SEGMENT_SECONDS]);
    });

    it("drops the leading segment when the first keyframe goes", () => {
        const document = deleteKeyframe(movieOf(3), 0);
        expect(zooms(document)).toEqual([1, 2]);
        expect(invariantHolds(document)).toBe(true);
    });

    it("leaves nothing behind when the last keyframe goes", () => {
        const document = deleteKeyframe(movieOf(1), 0);
        expect(document.path.keyframes).toHaveLength(0);
        expect(document.path.segments).toHaveLength(0);
    });

    it("ignores an index that is not there", () => {
        expect(deleteKeyframe(movieOf(2), 7)).toEqual(movieOf(2));
    });
});

describe("rearranging and replacing", () => {
    it("updates one keyframe to a new view", () => {
        const document = replaceKeyframe(movieOf(3), 1, frameAt(42));
        expect(zooms(document)).toEqual([0, 42, 2]);
        expect(seconds(document)).toEqual([DEFAULT_SEGMENT_SECONDS, DEFAULT_SEGMENT_SECONDS]);
    });

    it("moves a keyframe without moving the timing", () => {
        // Segments describe the gaps by position - "the third stretch lasts four seconds" - not
        // the pair of views either side.
        const document = moveKeyframe(setSegment(movieOf(3), 0, { seconds: 9 }), 2, 0);
        expect(zooms(document)).toEqual([2, 0, 1]);
        expect(seconds(document)).toEqual([9, DEFAULT_SEGMENT_SECONDS]);
    });

    it("changes what happens during a segment", () => {
        const document = setMotion(movieOf(2), 0, { kind: "spin", turns: 2, axis: "y" });
        expect(document.path.segments[0].motion).toEqual({ kind: "spin", turns: 2, axis: "y" });
    });
});

describe("the scene at a keyframe", () => {
    it("gives one keyframe's look to all of them", () => {
        // Most movies want one look, arrived at by fiddling with a single frame until it is right.
        let document = movieOf(3);
        document = replaceKeyframe(document, 1, { ...frameAt(1), scene: { specularPower: 64 } });
        document = applySceneToAll(document, 1);

        expect(document.path.keyframes.map(k => k.scene?.specularPower)).toEqual([64, 64, 64]);
    });

    it("gives each keyframe its own copy, so editing one does not edit the rest", () => {
        let document = movieOf(2);
        document = replaceKeyframe(document, 0, { ...frameAt(0), scene: { specularPower: 64 } });
        document = applySceneToAll(document, 0);
        document = replaceKeyframe(document, 0, { ...document.path.keyframes[0], scene: { specularPower: 8 } });

        expect(document.path.keyframes[1].scene?.specularPower).toBe(64);
    });
});

describe("objects the movie animates", () => {
    it("sets an opacity at one keyframe only", () => {
        const document = setObjectOpacity(movieOf(3), 1, "surface", 0.25);
        expect(document.path.keyframes.map(k => k.opacity?.surface)).toEqual([undefined, 0.25, undefined]);
    });

    it("introduces an object to every keyframe, which is what makes a fade possible", () => {
        // An object mentioned at one keyframe and not the next is not interpolated between them -
        // it is animated at one and left alone at the other, which is a jump, not a fade.
        const document = introduceObject(movieOf(3), "surface");
        expect(document.path.keyframes.map(k => k.opacity?.surface)).toEqual([0, 0, 0]);
    });

    it("fills only the gaps, so authored fades survive being introduced again", () => {
        // The panel calls this defensively before setting one keyframe's opacity, to guarantee the
        // object is present at every keyframe - without which a fade set at one keyframe and
        // nowhere else is not interpolated, it is simply set and then left, and the object stays
        // faded for the rest of the movie.
        let document = setObjectOpacity(movieOf(3), 1, "surface", 0.5);
        document = introduceObject(document, "surface", 1);

        expect(document.path.keyframes.map(k => k.opacity?.surface)).toEqual([1, 0.5, 1]);
    });

    it("introduces a late arrival invisible, so it does not appear from the first frame", () => {
        // A molecule loaded after the movie was started: its representations did not exist when
        // the earlier keyframes were captured, so nothing refers to them.
        let document = introduceObject(movieOf(3), "late-arrival");
        document = setObjectOpacity(document, 2, "late-arrival", 1);

        expect(document.path.keyframes.map(k => k.opacity?.["late-arrival"])).toEqual([0, 0, 1]);
    });

    it("does not reset fades already authored when an object is introduced again", () => {
        let document = introduceObject(movieOf(3), "surface");
        document = setObjectOpacity(document, 0, "surface", 1);
        document = introduceObject(document, "surface");

        expect(document.path.keyframes[0].opacity?.surface).toBe(1);
    });

    it("hands an object back to the scene when released", () => {
        let document = introduceObject(movieOf(2), "surface");
        document = introduceObject(document, "ribbons");
        document = releaseObject(document, "surface");

        expect(document.path.keyframes[0].opacity).toEqual({ ribbons: 0 });
    });

    it("lists what the movie animates in an order that does not shift", () => {
        // A picker whose contents move as you select a different keyframe is unusable.
        let document = setObjectOpacity(movieOf(3), 2, "surface", 1);
        document = setObjectOpacity(document, 0, "ribbons", 1);
        expect(animatedObjects(document)).toEqual(["ribbons", "surface"]);
    });
});

/**
 * A motion at the end of the movie.
 *
 * A segment says what happens *from* the keyframe it starts at, and for a hold, spin or rock that
 * means the camera stays put and the movie cuts to the next shot afterwards - which is how those
 * have always behaved in the middle of a path. Allowing one in the last slot applies the same rule
 * at the end, so a movie can be a single shot that spins, or a tour that finishes by turning.
 */
describe("a trailing motion", () => {
    const spin = { kind: "spin" as const, turns: 1, axis: "y" as const };

    it("can be the whole movie, one keyframe and a spin", () => {
        const document = setSegment(movieOf(1), 0, { seconds: 5, motion: spin });
        expect(document.path.keyframes).toHaveLength(1);
        expect(document.path.segments).toHaveLength(1);
        expect(hasTrailingSegment(document)).toBe(true);
    });

    it("survives appending a keyframe, becoming the connector into it", () => {
        // The trailing spin keeps spinning where it always did; the movie then cuts to the new
        // shot, which is exactly what a spin does anywhere else in a path.
        let document = setSegment(movieOf(1), 0, { seconds: 5, motion: spin });
        document = addKeyframe(document, frameAt(9));

        expect(zooms(document)).toEqual([0, 9]);
        expect(document.path.segments).toHaveLength(1);
        expect(document.path.segments[0].motion).toEqual(spin);
        expect(hasTrailingSegment(document)).toBe(false);
    });

    it("comes back when that keyframe is deleted, which is what makes it an undo", () => {
        // The reason for this design rather than one where the trailing motion follows the end of
        // the movie: adding a keyframe and deleting it again gets you back exactly where you were.
        const before = setSegment(movieOf(1), 0, { seconds: 5, motion: spin });
        const after = deleteKeyframe(addKeyframe(before, frameAt(9)), 1);

        expect(after.path.keyframes).toHaveLength(1);
        expect(after.path.segments).toHaveLength(1);
        expect(after.path.segments[0]).toEqual({ seconds: 5, motion: spin });
    });

    it("is created by editing the slot past the last gap", () => {
        // Two keyframes have one gap; the second slot is the trailing one.
        const document = setSegment(movieOf(2), 1, { seconds: 4, motion: spin });
        expect(document.path.segments).toHaveLength(2);
        expect(document.path.segments[1]).toEqual({ seconds: 4, motion: spin });
    });

    it("refuses a slot that is not a gap and not the end", () => {
        const document = movieOf(2);
        expect(setSegment(document, 5, { seconds: 1 })).toEqual(document);
    });

    it("can be taken away again, leaving the movie to end on its last keyframe", () => {
        // The panel offers the trailing slot as a dropdown, so whatever a choice there adds it
        // must also be able to remove - otherwise "spin at the end" is a decision that can only
        // be unmade by deleting the keyframe.
        const document = setSegment(movieOf(2), 1, { seconds: 4, motion: spin });
        const ended = removeTrailingSegment(document);

        expect(ended.path.keyframes).toHaveLength(2);
        expect(ended.path.segments).toHaveLength(1);
        expect(hasTrailingSegment(ended)).toBe(false);
    });

    it("is the only segment removing can touch", () => {
        // A connector is not the panel's to delete this way: the gap it spans still exists.
        const document = movieOf(3);
        expect(removeTrailingSegment(document)).toEqual(document);
    });

    it("is what a lost connector turns into, when it was worth keeping", () => {
        // Deleting the last keyframe of a movie that ended by spinning into it: the spin was the
        // way *to* a shot that is now gone, but a spin stands perfectly well on its own, so it
        // stays as the new ending rather than being thrown away with the keyframe.
        let document = setSegment(movieOf(2), 1, { seconds: 4, motion: spin });
        document = deleteKeyframe(document, 1);

        expect(document.path.keyframes).toHaveLength(1);
        expect(document.path.segments).toEqual([{ seconds: 4, motion: spin }]);
    });
});

describe("cloning a keyframe", () => {
    it("puts an identical shot immediately after it", () => {
        // What a spin-then-continue needs: the spin ends where it began, so the next leg has to
        // start from the same place or the movie cuts.
        const document = cloneKeyframe(movieOf(2), 0);
        expect(zooms(document)).toEqual([0, 0, 1]);
    });

    it("copies the arrays rather than sharing them", () => {
        // Both keyframes are in Redux, which freezes them; a shared origin array would make
        // editing one edit the other, or throw.
        const document = cloneKeyframe(movieOf(1), 0);
        expect(document.path.keyframes[1].origin).not.toBe(document.path.keyframes[0].origin);
        expect(document.path.keyframes[1].quat).not.toBe(document.path.keyframes[0].quat);
    });

    it("ignores a keyframe that is not there", () => {
        expect(cloneKeyframe(movieOf(2), 7)).toEqual(movieOf(2));
    });
});
