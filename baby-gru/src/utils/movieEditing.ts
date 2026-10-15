/**
 * Editing a movie document.
 *
 * Every operation the panel offers, as a function from a document to a new document. No React, no
 * store, no renderer - so the rules below can be checked directly, and so the panel is left with
 * nothing but which button was pressed.
 *
 * WHY THESE ARE NOT ONE-LINERS
 *
 * Keyframes and segments are separate lists with an invariant between them: there is exactly one
 * segment per gap, so a movie with n keyframes has n-1 segments. CCP4MG's editor avoids the
 * invariant by hanging each motion off the keyframe before it, and pays for it every time a
 * checkpoint is deleted - removing a view also removes a motion, and the neighbours have to be
 * renegotiated. Keeping them apart means a deleted keyframe leaves its two segments to merge into
 * one, which is both what an author expects and something that has to be written down somewhere.
 *
 * Every function returns a new document and leaves the old one alone. The panel keeps its document
 * in Redux, which freezes state in development, so an operation that mutated in place would work
 * in a build and throw in a dev session - a failure worth designing out rather than remembering.
 */

import type { Keyframe, Motion, Segment } from "./cameraPath";
import type { MovieDocument, MovieSceneSettings } from "./movieDocument";

/** How long a newly added segment runs, before anyone has said otherwise. */
export const DEFAULT_SEGMENT_SECONDS = 3;

const newSegment = (seconds = DEFAULT_SEGMENT_SECONDS): Segment => ({
    seconds,
    motion: { kind: "move" },
});

/** A shallow copy deep enough that nothing shared with the old document can be written through. */
const withPath = (
    document: MovieDocument, keyframes: Keyframe[], segments: Segment[],
): MovieDocument => ({ ...document, path: { keyframes, segments } });

/**
 * Add a keyframe, and the segment that reaches it.
 *
 * @param at  where to put it; appended when omitted. Inserting in the middle splits the segment
 *            that spanned the gap, and the two halves each take half its time - so the movie's
 *            total length does not change, which is what makes inserting a keyframe to adjust a
 *            path feel like adjusting rather than lengthening.
 */
export function addKeyframe(
    document: MovieDocument, keyframe: Keyframe, at?: number,
): MovieDocument {
    const keyframes = [...document.path.keyframes];
    const segments = [...document.path.segments];
    const index = at === undefined ? keyframes.length : Math.max(0, Math.min(at, keyframes.length));

    keyframes.splice(index, 0, keyframe);

    if (keyframes.length === 1) return withPath(document, keyframes, segments);

    if (index === 0) {
        segments.unshift(newSegment());
    } else if (index >= keyframes.length - 1) {
        segments.push(newSegment());
    } else {
        // Splitting a gap: the segment that used to span it becomes two, sharing its time.
        const split = segments[index - 1];
        const half = (split?.seconds ?? DEFAULT_SEGMENT_SECONDS) / 2;
        segments.splice(index - 1, 1, { ...split, seconds: half }, { ...split, seconds: half });
    }

    return withPath(document, keyframes, segments);
}

/**
 * Remove a keyframe, leaving the movie continuous.
 *
 * The two segments either side become one, carrying the sum of their times, so what was a path
 * through three views becomes a path through two over the same stretch of movie. Removing an end
 * keyframe simply drops the segment that reached it, which does shorten the movie - there is
 * nothing else it could mean.
 */
export function deleteKeyframe(document: MovieDocument, index: number): MovieDocument {
    const keyframes = [...document.path.keyframes];
    const segments = [...document.path.segments];
    if (index < 0 || index >= keyframes.length) return document;

    keyframes.splice(index, 1);

    if (keyframes.length === 0) {
        return withPath(document, keyframes, []);
    }
    if (index === 0) {
        segments.shift();
    } else if (index === keyframes.length) {
        segments.pop();
    } else {
        const before = segments[index - 1];
        const after = segments[index];
        segments.splice(index - 1, 2, {
            ...before,
            seconds: (before?.seconds ?? 0) + (after?.seconds ?? 0),
        });
    }

    return withPath(document, keyframes, segments);
}

/** Replace a keyframe in place - the "update this one to what I am looking at now" operation. */
export function replaceKeyframe(
    document: MovieDocument, index: number, keyframe: Keyframe,
): MovieDocument {
    if (index < 0 || index >= document.path.keyframes.length) return document;
    const keyframes = [...document.path.keyframes];
    keyframes[index] = keyframe;
    return withPath(document, keyframes, [...document.path.segments]);
}

/** Move a keyframe to a different place in the order, keeping the segment times where they are. */
export function moveKeyframe(
    document: MovieDocument, from: number, to: number,
): MovieDocument {
    const keyframes = [...document.path.keyframes];
    if (from < 0 || from >= keyframes.length || to < 0 || to >= keyframes.length || from === to) {
        return document;
    }
    const [moved] = keyframes.splice(from, 1);
    keyframes.splice(to, 0, moved);
    // The segments are deliberately left as they were. They describe the gaps by position - "the
    // third stretch of this movie lasts four seconds" - not the pair of views either side, so
    // reordering views does not reorder the timing.
    return withPath(document, keyframes, [...document.path.segments]);
}

/** How long a segment runs, and what happens during it. */
export function setSegment(
    document: MovieDocument, index: number, change: Partial<Segment>,
): MovieDocument {
    if (index < 0 || index >= document.path.segments.length) return document;
    const segments = [...document.path.segments];
    segments[index] = { ...segments[index], ...change };
    return withPath(document, [...document.path.keyframes], segments);
}

/** What happens during a segment, as the motion dropdown changes it. */
export const setMotion = (document: MovieDocument, index: number, motion: Motion): MovieDocument =>
    setSegment(document, index, { motion });

/**
 * One keyframe's scene settings, given to all of them.
 *
 * The lighting, background and focal plane are per keyframe so that they *can* change during a
 * movie, but most movies do not want them to - they want one look, arrived at by fiddling with a
 * single frame until it is right. Without this that means repeating the fiddling, or capturing
 * every keyframe again.
 */
export function applySceneToAll(document: MovieDocument, index: number): MovieDocument {
    const source = document.path.keyframes[index];
    if (!source) return document;
    const scene = source.scene ?? {};
    return withPath(
        document,
        document.path.keyframes.map(keyframe => ({ ...keyframe, scene: { ...scene } })),
        [...document.path.segments]);
}

/**
 * How solid an object is at one keyframe.
 *
 * Only this keyframe. An object absent from the others stays absent, and so stays untouched by
 * the movie there - which is the rule that lets a camera tour be played over a scene it was not
 * authored against.
 */
export function setObjectOpacity(
    document: MovieDocument, index: number, id: string, value: number,
): MovieDocument {
    const keyframe = document.path.keyframes[index];
    if (!keyframe) return document;
    const keyframes = [...document.path.keyframes];
    keyframes[index] = { ...keyframe, opacity: { ...(keyframe.opacity ?? {}), [id]: value } };
    return withPath(document, keyframes, [...document.path.segments]);
}

/**
 * Bring an object under the movie's control, everywhere.
 *
 * ALL the keyframes, which is the point. An object the movie mentions at one keyframe and not at
 * the next is not interpolated between them - it is animated at one and left alone at the other -
 * so an opacity set in a single frame does not produce a fade, it produces a jump followed by
 * whatever the scene happened to be doing.
 *
 * It is also the answer to a molecule loaded after a movie was started. Its representations did
 * not exist when the earlier keyframes were captured, so nothing refers to them; introduced at
 * zero they are invisible until some keyframe says otherwise, instead of being present from the
 * first frame of a movie made before they arrived.
 */
export function introduceObject(
    document: MovieDocument, id: string, value = 0,
): MovieDocument {
    return withPath(
        document,
        document.path.keyframes.map(keyframe =>
            keyframe.opacity?.[id] !== undefined
                // Already spoken for. Introducing an object twice must not quietly reset the
                // fades somebody has already authored for it.
                ? keyframe
                : { ...keyframe, opacity: { ...(keyframe.opacity ?? {}), [id]: value } }),
        [...document.path.segments]);
}

/** Stop animating an object, at every keyframe. It goes back to being the scene's business. */
export function releaseObject(document: MovieDocument, id: string): MovieDocument {
    return withPath(
        document,
        document.path.keyframes.map(keyframe => {
            if (keyframe.opacity?.[id] === undefined) return keyframe;
            const opacity = { ...keyframe.opacity };
            delete opacity[id];
            return { ...keyframe, opacity };
        }),
        [...document.path.segments]);
}

/**
 * Every object this movie animates, in a stable order.
 *
 * Gathered across all keyframes rather than from one, so the list does not change as the selected
 * keyframe changes - a picker whose contents shift as you move through the movie is unusable.
 */
export function animatedObjects(document: MovieDocument): string[] {
    const seen = new Set<string>();
    document.path.keyframes.forEach(keyframe => {
        Object.keys(keyframe.opacity ?? {}).forEach(id => seen.add(id));
    });
    return [...seen].sort();
}

/** The movie's scene settings, which apply throughout rather than per keyframe. */
export const setSceneSettings = (
    document: MovieDocument, change: Partial<MovieSceneSettings>,
): MovieDocument => ({ ...document, scene: { ...document.scene, ...change } });
