/**
 * A movie, as a thing you can save and open again.
 *
 * cameraPath holds the part that varies with time - keyframes, segments, and the arithmetic that
 * gets from one to the next. This holds the whole artefact: that path, plus the settings that do
 * not vary, plus enough about itself to appear in a list.
 *
 * WHY THE SETTINGS ARE NOT KEYFRAME PROPERTIES
 *
 * The line is between quantities and modes. Halfway between two light positions is a light
 * position; halfway between shadows-on and shadows-off is nothing at all. So a quantity belongs on
 * a keyframe, where it can be interpolated, and a mode belongs here, set once and applied for the
 * whole movie.
 *
 * SSAO and edge detection sit here whole, parameters and all, which is the one place the rule is
 * applied loosely. Their numbers are quantities, but they configure a feature that is either
 * running or not, and animating a radius while the thing it belongs to switches off midway is more
 * confusion than anyone wanted. Recording them at all - rather than leaving them to whatever the
 * viewer happens to have set - is what makes a movie look the same tomorrow as it does today.
 *
 * Blur is split rather than lumped: whether the off-screen buffers run is a mode and lives here,
 * while how deep and how wide the blur is are quantities and live on the keyframe.
 */

import { Movie, movieDuration } from "./cameraPath";

/**
 * The scene's modes, fixed for the length of a movie.
 *
 * Every field is required, because a saved movie that declines to say whether it wanted shadows is
 * a movie that looks different on someone else's machine. Capturing them is cheap; guessing is not.
 */
export interface MovieSceneSettings {
    doShadow: boolean;
    doSSAO: boolean;
    ssaoRadius: number;
    ssaoBias: number;
    doEdgeDetect: boolean;
    edgeDetectDepthScale: number;
    edgeDetectNormalScale: number;
    edgeDetectDepthThreshold: number;
    edgeDetectNormalThreshold: number;
    doOutline: boolean;
    /** Whether depth of field runs at all. Where the focal plane sits is per keyframe. */
    useOffScreenBuffers: boolean;
    /**
     * How wide the depth-of-field blur is.
     *
     * A quantity that cannot be animated: setting it reallocates the blur framebuffers, so it has
     * to be chosen once for the movie rather than interpolated between keyframes.
     */
    blurRadius: number;
    doPerspectiveProjection: boolean;
    /**
     * Distance from the eye to the view centre.
     *
     * A quantity, and it still sits here: a camera path has no slot to interpolate it, so a movie
     * that wanted a dolly zoom could not have one anyway. Recording it keeps perspective looking
     * the way it was authored.
     */
    eyeDistance: number;
}

/** How the movie is rendered out. Nothing here changes what the scene looks like. */
export interface MovieOutputSettings {
    fps: number;
    /** The drawing buffer the movie is rendered at, independent of the window. */
    width: number;
    height: number;
}

export interface MovieDocument {
    /** For the file and for a list of movies; not required to be unique. */
    name: string;
    /** What varies with time. */
    path: Movie;
    scene: MovieSceneSettings;
    output: MovieOutputSettings;
}

export const DEFAULT_OUTPUT: MovieOutputSettings = {
    fps: 30,
    width: 1920,
    height: 1080,
};

/**
 * The settings a movie gets when nothing says otherwise.
 *
 * Deliberately the quiet ones. A movie made without thinking about shadows should not acquire
 * them, and the expensive passes are the ones most likely to turn a smooth export into a slow one.
 */
export const DEFAULT_SCENE: MovieSceneSettings = {
    doShadow: false,
    doSSAO: false,
    ssaoRadius: 1.0,
    ssaoBias: 0.025,
    doEdgeDetect: false,
    edgeDetectDepthScale: 1.0,
    edgeDetectNormalScale: 1.0,
    edgeDetectDepthThreshold: 1.0,
    edgeDetectNormalThreshold: 1.0,
    doOutline: false,
    useOffScreenBuffers: false,
    blurRadius: 3.0,
    doPerspectiveProjection: false,
    eyeDistance: 250,
};

export const emptyMovie = (name = "Untitled movie"): MovieDocument => ({
    name,
    path: { keyframes: [], segments: [] },
    scene: { ...DEFAULT_SCENE },
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
    else if (segments.length !== Math.max(0, keyframes.length - 1)) {
        problems.push(`${keyframes.length} keyframes need ${Math.max(0, keyframes.length - 1)} `
            + `segments between them, but there are ${segments.length}.`);
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
