/**
 * A movie, as a thing you can save and open again.
 *
 * cameraPath holds the part that varies with time - keyframes, segments, and the arithmetic that
 * gets from one to the next. This holds the whole artefact: that path, plus the settings that do
 * not vary, plus enough about itself to appear in a list.
 *
 * WHERE THE MODES COME FROM
 *
 * A keyframe holds quantities that can be interpolated: halfway between two light positions is a
 * light position. Modes cannot - halfway between shadows-on and shadows-off is nothing at all - so
 * they are set once for the whole movie, and the place they are set is the movie's scene: a scene
 * of its own (the movie scene, `MOVIE_SCENE_ID`), created as a copy of the scene shown when the
 * first keyframe is captured, edited like any other scene, and selected whenever the movie is
 * captured, played or exported. There is one movie at a time, so one movie scene. Shadows, SSAO, edge detection, depth blur and the representations the movie fades all
 * come from it, and it travels in the session a movie file embeds.
 */

import { Movie, movieDuration } from "./cameraPath";
import { DEFAULT_QUALITY } from "./videoBitrate";
import type { VideoQuality } from "./videoBitrate";

/** How the movie is rendered out. Nothing here changes what the scene looks like. */
export interface MovieOutputSettings {
    fps: number;
    /** The drawing buffer the movie is rendered at, independent of the window. */
    width: number;
    height: number;
    /**
     * How many bits the encoder is given, as one of the three presets shared with "Record a
     * video". Optional: a movie written before this existed simply gets the default, which is
     * what it was always encoded at.
     */
    quality?: VideoQuality;
}

export interface MovieDocument {
    /** For the file and for a list of movies; not required to be unique. */
    name: string;
    /** What varies with time. */
    path: Movie;
    output: MovieOutputSettings;
}

export const DEFAULT_OUTPUT: MovieOutputSettings = {
    fps: 30,
    width: 1920,
    height: 1080,
    quality: DEFAULT_QUALITY,
};

export const emptyMovie = (name = "Untitled movie"): MovieDocument => ({
    name,
    path: { keyframes: [], segments: [] },
    output: { ...DEFAULT_OUTPUT },
});

/** How long the movie runs, in seconds. */
export const documentDuration = (document: MovieDocument): number => movieDuration(document.path);

/** How many frames it will render to, at its own frame rate. */
export const documentFrameCount = (document: MovieDocument): number =>
    Math.max(1, Math.round(documentDuration(document) * document.output.fps));

/**
 * Whether the document is coherent enough to play, and what is wrong if not.
 *
 * Checked rather than assumed because a movie is edited a keyframe at a time, and the invariant
 * that there is exactly one segment per gap is easy to break halfway through an edit.
 */
export function movieProblems(document: MovieDocument): string[] {
    const problems: string[] = [];
    const { keyframes, segments } = document.path;

    if (keyframes.length === 0) problems.push("The movie has no keyframes.");
    else if (segments.length !== keyframes.length - 1 && segments.length !== keyframes.length) {
        // One per gap, optionally plus one more: a motion at the end with nowhere to go, which is
        // what a movie that finishes by spinning on the spot - or that is only a spin - consists
        // of. See hasTrailingSegment.
        problems.push(`${keyframes.length} keyframes allow ${keyframes.length - 1} segments `
            + `between them, or ${keyframes.length} with a motion at the end, `
            + `but there are ${segments.length}.`);
    }

    if (segments.some(segment => !(segment.seconds > 0))) {
        problems.push("Every segment needs a duration greater than zero.");
    }
    if (!(document.output.fps > 0)) problems.push("The frame rate must be greater than zero.");
    if (!(document.output.width > 0) || !(document.output.height > 0)) {
        problems.push("The output size must be greater than zero in both directions.");
    }
    // Even dimensions: H.264 encodes in 16x16 macroblocks and the chroma planes are half size, so
    // an odd width or height is rejected outright by some encoders and silently cropped by others.
    if (document.output.width % 2 !== 0 || document.output.height % 2 !== 0) {
        problems.push("The output width and height must both be even numbers.");
    }

    return problems;
}
