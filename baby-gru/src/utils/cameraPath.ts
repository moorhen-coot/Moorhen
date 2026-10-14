/**
 * Where the camera is at a given moment in a movie.
 *
 * Pure arithmetic: no GL, no store, no React. Give it a movie and a time in seconds and it returns
 * a camera and the set of things visible. What to do with that is the renderer's problem.
 *
 * THE SHAPE OF A MOVIE
 *
 * Keyframes say where the camera is. Segments say what happens between two of them. CCP4MG's movie
 * editor puts both on one object - each checkpoint carries its view *and* the motion leading away
 * from it - which is why deleting and re-adding checkpoints there behaves badly: removing a view
 * also removes a motion, and the neighbours have to be renegotiated. Kept apart, a keyframe can be
 * deleted and the two segments either side merge into one.
 *
 * Spin and rock are motions applied around a held view rather than interpolations, so their two
 * endpoint keyframes are the same. That is what lets them compose with moves instead of being a
 * special case inside them.
 *
 * TURNING THE CORNER
 *
 * Interpolating A->B and B->C as separate eased segments makes the camera stop dead at B, which
 * reads as a slideshow. Avoiding that needs the path to be continuous in velocity through B, not
 * just position, so a run of consecutive `move` segments is treated as one curve:
 *
 *   - orientation by squad - slerp between slerps, with control quaternions derived from each
 *     keyframe's neighbours. Plain slerp per segment is continuous in position and not in velocity,
 *     which is exactly the corner problem.
 *   - everything else by centripetal Catmull-Rom. The uniform variety overshoots when the direction
 *     changes sharply, swinging the camera wide of a keyframe it was supposed to pass through.
 *
 * Easing is applied at the ends of a run, not at every keyframe. A spin or a hold breaks the run,
 * because there the camera really has stopped and should ease into and out of it.
 *
 * A caveat worth knowing: time maps linearly to the curve parameter within a segment, and equal
 * steps in parameter are not quite equal steps in distance on a curve. With keyframes spaced
 * roughly evenly the difference is not visible. It would need arc-length parameterisation to be
 * exactly right, which is a lot of machinery for a wobble nobody can see.
 */

import * as quat4 from "gl-matrix/quat";

export type Vec3 = [number, number, number];

/** Where the camera is, and how solid the things it looks at are. */
export interface Keyframe {
    /** View orientation, as the renderer's myQuat. */
    quat: quat4.quat;
    origin: Vec3;
    zoom: number;
    /**
     * The slab, as offsets from the view centre, matching CameraState.
     *
     * These were called clipStart/clipEnd/fogStart/fogEnd, which were the renderer's names for
     * absolute distances from the eye. They have always held offsets here; the names simply lied,
     * and a reader who believed them would place a movie's fog hundreds of angstroms adrift.
     */
    clipFront: number;
    clipBack: number;
    fogFront: number;
    fogBack: number;
    /**
     * How solid each object is at this keyframe, by unique id, from 0 to 1.
     *
     * Interpolated, which is what makes a fade possible - and once it is, visibility has no
     * separate existence: hidden is opacity 0, shown is 1, and an object that appears halfway
     * through is one that goes from 0 to 1. A boolean alongside this would only be a second way to
     * say the same thing, and they could disagree.
     *
     * An id missing from a keyframe is not animated by it rather than hidden by it, so a movie
     * that only moves the camera - a tour with no opacity map at all - leaves the scene's own
     * opacities alone. The authoring side keeps keyframes complete, adding new objects to earlier
     * keyframes at 0; this rule is what makes a hand-written movie behave sensibly anyway.
     */
    opacity?: Record<string, number>;
    /**
     * The rest of the scene at this keyframe, interpolated between keyframes like everything else.
     *
     * QUANTITIES LIVE HERE; MODES LIVE ON THE MOVIE
     *
     * A light's position and a background colour are quantities: halfway between two of them means
     * something, so they belong on a keyframe. Whether shadows are on is a mode - there is no
     * halfway between on and off - so it belongs to the movie as a whole, set once and applied
     * throughout. SSAO and edge detection go with it: their parameters are quantities, but they
     * describe a feature that is either running or not, and animating one while the other switches
     * is more confusion than anyone asked for.
     *
     * Blur splits along that line rather than against it. Whether the off-screen buffers are used
     * at all is the movie's; how deep and how wide the blur is are the keyframe's.
     */
    scene?: SceneKeyframe;
}

/** A colour or a position, as the store holds them. */
export type Vec4 = [number, number, number, number];

/**
 * The scene's quantities at a keyframe. Every field optional, and absent means not animated.
 *
 * That is the same rule as opacity, and for the same reason: a movie that only moves the camera
 * must leave the scene it is shown in alone, not assert a lighting rig it never chose. A keyframe
 * captured from a live scene fills all of these in; one written by hand or generated need not.
 */
export interface SceneKeyframe {
    backgroundColor?: Vec4;
    lightPosition?: Vec4;
    ambient?: Vec4;
    diffuse?: Vec4;
    specular?: Vec4;
    specularPower?: number;
    /**
     * Depth of field: where the focal plane sits.
     *
     * The radius is not here, though it is just as much a quantity. Setting it calls
     * makeBlurBuffers, which reallocates the blur framebuffers - cheap for a slider someone drags
     * now and then, ruinous sixty times a second. It lives in the movie's settings instead, and
     * the half that carries the expression anyway is this one: what is in focus, not how soft the
     * rest is.
     */
    blurDepth?: number;
}

/** What happens between one keyframe and the next. */
export type Motion =
    /** Interpolate from one keyframe to the next. */
    | { kind: "move" }
    /** Stay where you are. */
    | { kind: "hold" }
    /** Whole turns about an axis, ending where it began. */
    | { kind: "spin"; turns?: number; axis?: "x" | "y" | "z" }
    /** Swing back and forth by `degrees` either side, completing a cycle every `periodSeconds`. */
    | { kind: "rock"; degrees?: number; periodSeconds?: number; axis?: "x" | "y" | "z" };

export interface Segment {
    seconds: number;
    motion: Motion;
}

export interface Movie {
    keyframes: Keyframe[];
    /** One per gap between keyframes, so there is always one fewer than there are keyframes. */
    segments: Segment[];
}

export interface MovieSample {
    quat: quat4.quat;
    origin: Vec3;
    zoom: number;
    /** Offsets from the view centre, as in Keyframe. */
    clipFront: number;
    clipBack: number;
    fogFront: number;
    fogBack: number;
    /** Only the objects this movie animates; anything absent is left as the scene has it. */
    opacity: Record<string, number>;
    /** Only the scene quantities this movie animates; likewise. */
    scene: SceneKeyframe;
}

const SPIN_DEFAULTS = { turns: 1, axis: "y" as const };
const ROCK_DEFAULTS = { degrees: 20, periodSeconds: 2, axis: "y" as const };

/** Catmull-Rom's exponent: 0 uniform, 0.5 centripetal, 1 chordal. */
const CENTRIPETAL = 0.5;

export const movieDuration = (movie: Movie): number =>
    movie.segments.reduce((total, segment) => total + Math.max(0, segment.seconds), 0);

/**
 * Smooth start and stop.
 *
 * The classic smoothstep: zero slope at both ends, so the camera neither jerks into motion nor
 * stops dead.
 */
export const easeInOut = (u: number): number => {
    const t = Math.min(1, Math.max(0, u));
    return t * t * (3 - 2 * t);
};

const axisVector = (axis: "x" | "y" | "z"): Vec3 =>
    axis === "x" ? [1, 0, 0] : axis === "z" ? [0, 0, 1] : [0, 1, 0];

/** The keyframe's orientation with an extra turn about an axis, as spin and rock both need. */
const rotatedBy = (base: quat4.quat, degrees: number, axis: "x" | "y" | "z"): quat4.quat => {
    const turn = quat4.create();
    quat4.setAxisAngle(turn, axisVector(axis), (degrees * Math.PI) / 180);
    const out = quat4.create();
    quat4.multiply(out, base, turn);
    return out;
};

/**
 * A phantom neighbour just beyond the end of a run.
 *
 * The spline needs a value on each side of the segment to find its tangent. At the ends of a run
 * there is nothing there, and repeating the endpoint does not work: two knots at the same value
 * give a zero-length interval and the formula collapses. Reflecting the other neighbour through
 * the endpoint - the usual "natural" end condition - keeps the knots apart and makes the curve
 * leave the end in the direction it was already going.
 */
const reflect = (at: number, away: number): number => 2 * at - away;

/**
 * One scalar of a centripetal Catmull-Rom spline.
 */
const catmullRom = (before: number, from: number, to: number, after: number, t: number): number => {
    // Knot spacing from the distances between values rather than assuming they are even; this is
    // what stops a sharp change of direction overshooting. A floor keeps coincident values - a
    // field that does not change across a segment - from producing a zero-length interval.
    const knot = (previous: number, a: number, b: number) =>
        previous + Math.max(1e-6, Math.pow(Math.abs(b - a), CENTRIPETAL));

    const t0 = 0;
    const t1 = knot(t0, before, from);
    const t2 = knot(t1, from, to);
    const t3 = knot(t2, to, after);
    if (!(t2 > t1)) return from;

    const at = t1 + t * (t2 - t1);
    const a1 = ((t1 - at) * before + (at - t0) * from) / (t1 - t0 || 1);
    const a2 = ((t2 - at) * from + (at - t1) * to) / (t2 - t1 || 1);
    const a3 = ((t3 - at) * to + (at - t2) * after) / (t3 - t2 || 1);
    const b1 = ((t2 - at) * a1 + (at - t0) * a2) / (t2 - t0 || 1);
    const b2 = ((t3 - at) * a2 + (at - t1) * a3) / (t3 - t1 || 1);
    return ((t2 - at) * b1 + (at - t1) * b2) / (t2 - t1 || 1);
};

/**
 * Shoemake's intermediate control quaternion for squad.
 *
 * It points the curve so that it arrives at `current` travelling in a direction that suits both
 * neighbours, which is what makes the orientation carry its velocity through an interior keyframe
 * instead of stopping there.
 */
const controlQuat = (before: quat4.quat, current: quat4.quat, after: quat4.quat): quat4.quat => {
    const inverse = quat4.create();
    quat4.invert(inverse, current);

    const toPrevious = quat4.create();
    quat4.multiply(toPrevious, inverse, before);
    quat4.ln(toPrevious, toPrevious);

    const toNext = quat4.create();
    quat4.multiply(toNext, inverse, after);
    quat4.ln(toNext, toNext);

    const sum = quat4.create();
    quat4.add(sum, toPrevious, toNext);
    quat4.scale(sum, sum, -0.25);
    quat4.exp(sum, sum);

    const control = quat4.create();
    quat4.multiply(control, current, sum);
    quat4.normalize(control, control);
    return control;
};

/**
 * The orientation one step further on, continuing the turn from `from` to `to`.
 *
 * The quaternion counterpart of reflecting a scalar: it supplies the phantom neighbour squad needs
 * at the end of a run, so the orientation leaves the last keyframe still turning the way it was
 * rather than being pulled back towards where it came from.
 */
const extrapolateQuat = (from: quat4.quat, to: quat4.quat): quat4.quat => {
    const inverse = quat4.create();
    quat4.invert(inverse, from);
    const delta = quat4.create();
    quat4.multiply(delta, inverse, to);
    const out = quat4.create();
    quat4.multiply(out, to, delta);
    quat4.normalize(out, out);
    return out;
};

/**
 * Which keyframes belong to the same uninterrupted run of moves.
 *
 * Returns, for a move segment, the index of the first and last keyframe of its run. A run's
 * interior keyframes are passed through; its ends are where the camera actually starts and stops,
 * and so where easing belongs.
 */
const runContaining = (movie: Movie, segmentIndex: number): { first: number; last: number } => {
    let first = segmentIndex;
    while (first > 0 && movie.segments[first - 1]?.motion.kind === "move") first--;
    let last = segmentIndex;
    while (last + 1 < movie.segments.length && movie.segments[last + 1]?.motion.kind === "move") last++;
    return { first, last: last + 1 };
};

/** The segment covering a time, and how far through it we are. */
const locate = (movie: Movie, seconds: number): { index: number; u: number } => {
    if (movie.segments.length === 0) return { index: -1, u: 0 };
    let remaining = Math.max(0, seconds);
    for (let index = 0; index < movie.segments.length; index++) {
        const length = Math.max(0, movie.segments[index].seconds);
        if (remaining <= length || index === movie.segments.length - 1) {
            return { index, u: length > 0 ? Math.min(1, remaining / length) : 1 };
        }
        remaining -= length;
    }
    return { index: movie.segments.length - 1, u: 1 };
};

/**
 * Blend the two keyframes' opacities.
 *
 * Every id either keyframe mentions appears in the result. One that only one end mentions holds
 * that value rather than fading from an assumed zero: a movie that first names an object halfway
 * through is saying "from here it is this solid", not "ghost it in from nothing".
 *
 * LINEAR, NOT SPLINED, UNLIKE EVERYTHING ELSE HERE
 *
 * Opacity is bounded and the others are not. A Catmull-Rom through 0, 1, 0 - which is exactly what
 * fading something in and out looks like - overshoots both ends, so an object would go more than
 * solid and then less than invisible before coming back. Clamping that is visible as a pause at
 * the limit. Straight lines between the values, carrying the segment's own easing, are what a fade
 * should do.
 */
const blendOpacity = (
    from: Keyframe, to: Keyframe, t: number
): Record<string, number> => {
    const blended: Record<string, number> = {};
    for (const id of new Set([...Object.keys(from.opacity ?? {}), ...Object.keys(to.opacity ?? {})])) {
        const a = from.opacity?.[id] ?? to.opacity?.[id] as number;
        const b = to.opacity?.[id] ?? from.opacity?.[id] as number;
        blended[id] = Math.min(1, Math.max(0, a + (b - a) * t));
    }
    return blended;
};

/**
 * Blend the scene quantities, by the same rules as opacity.
 *
 * A field only one keyframe mentions holds that value rather than being interpolated from nothing,
 * and a field neither mentions is absent from the result, so whoever applies it leaves the scene's
 * own value alone. Straight lines, not splines: a colour channel is bounded like an opacity, and
 * a Catmull-Rom through three colours can leave the gamut on the way between them.
 */
const blendScene = (from: Keyframe, to: Keyframe, t: number): SceneKeyframe => {
    const a = from.scene ?? {};
    const b = to.scene ?? {};
    const blended: SceneKeyframe = {};

    const number = (key: "specularPower" | "blurDepth") => {
        const x = a[key] ?? b[key];
        const y = b[key] ?? a[key];
        if (x === undefined || y === undefined) return;
        blended[key] = x + (y - x) * t;
    };
    const vector = (key: "backgroundColor" | "lightPosition" | "ambient" | "diffuse" | "specular") => {
        const x = a[key] ?? b[key];
        const y = b[key] ?? a[key];
        if (!x || !y) return;
        blended[key] = [0, 1, 2, 3].map(i => x[i] + (y[i] - x[i]) * t) as Vec4;
    };

    (["specularPower", "blurDepth"] as const).forEach(number);
    (["backgroundColor", "lightPosition", "ambient", "diffuse", "specular"] as const).forEach(vector);
    return blended;
};

const sampleOf = (keyframe: Keyframe, quat: quat4.quat): MovieSample => ({
    quat,
    origin: [...keyframe.origin] as Vec3,
    zoom: keyframe.zoom,
    clipFront: keyframe.clipFront,
    clipBack: keyframe.clipBack,
    fogFront: keyframe.fogFront,
    fogBack: keyframe.fogBack,
    opacity: { ...(keyframe.opacity ?? {}) },
    scene: { ...(keyframe.scene ?? {}) },
});

/**
 * The camera at a moment in the movie.
 *
 * @param seconds  from the start; clamped to the movie's length at both ends
 */
export function sampleMovie(movie: Movie, seconds: number): MovieSample {
    if (movie.keyframes.length === 0) throw new Error("A movie needs at least one keyframe");
    if (movie.keyframes.length === 1 || movie.segments.length === 0) {
        const only = movie.keyframes[0];
        return sampleOf(only, quat4.clone(only.quat));
    }

    const { index, u } = locate(movie, seconds);
    const segment = movie.segments[index];
    const from = movie.keyframes[index];
    const to = movie.keyframes[Math.min(index + 1, movie.keyframes.length - 1)];

    switch (segment.motion.kind) {
        // The camera stays put in all three of these, so the opacities do too - a spin or a rock
        // is one pose held while the view turns, not a journey between two keyframes.
        case "hold":
            return sampleOf(from, quat4.clone(from.quat));

        case "spin": {
            const { turns, axis } = { ...SPIN_DEFAULTS, ...segment.motion };
            // Eased, so a spin starts and stops smoothly rather than snapping into full speed.
            return sampleOf(from, rotatedBy(from.quat, easeInOut(u) * 360 * turns, axis));
        }

        case "rock": {
            const { degrees, periodSeconds, axis } = { ...ROCK_DEFAULTS, ...segment.motion };
            // A sine rather than a triangle: it is already smooth at the turning points, which is
            // the whole character of a rock.
            const cycles = periodSeconds > 0 ? (u * segment.seconds) / periodSeconds : 0;
            return sampleOf(from, rotatedBy(from.quat, degrees * Math.sin(2 * Math.PI * cycles), axis));
        }

        case "move":
        default: {
            const run = runContaining(movie, index);
            // Ease only where the camera genuinely starts or stops. Inside a run it keeps its
            // speed, which is what carries it round the corner at an interior keyframe.
            const atRunStart = index === run.first;
            const atRunEnd = index + 1 === run.last;
            const eased = atRunStart && atRunEnd ? easeInOut(u)
                : atRunStart ? easeInOut(u * 0.5) * 2
                : atRunEnd ? (easeInOut(0.5 + u * 0.5) - 0.5) * 2
                : u;

            // Real neighbours where the run has them, reflected phantoms where it does not.
            const before = index - 1 >= run.first ? movie.keyframes[index - 1] : null;
            const after = index + 2 <= run.last ? movie.keyframes[index + 2] : null;

            const orientation = quat4.create();
            quat4.sqlerp(orientation, from.quat,
                controlQuat(before ? before.quat : extrapolateQuat(to.quat, from.quat), from.quat, to.quat),
                controlQuat(from.quat, to.quat, after ? after.quat : extrapolateQuat(from.quat, to.quat)),
                to.quat, eased);
            quat4.normalize(orientation, orientation);

            const spline = (pick: (keyframe: Keyframe) => number) =>
                catmullRom(
                    before ? pick(before) : reflect(pick(from), pick(to)),
                    pick(from), pick(to),
                    after ? pick(after) : reflect(pick(to), pick(from)),
                    eased);

            return {
                quat: orientation,
                origin: [
                    spline(k => k.origin[0]),
                    spline(k => k.origin[1]),
                    spline(k => k.origin[2]),
                ],
                zoom: spline(k => k.zoom),
                clipFront: spline(k => k.clipFront),
                clipBack: spline(k => k.clipBack),
                fogFront: spline(k => k.fogFront),
                fogBack: spline(k => k.fogBack),
                // Eased like the rest of the move, so a fade keeps step with the camera, but
                // blended straight rather than splined. See blendOpacity.
                opacity: blendOpacity(from, to, eased),
                scene: blendScene(from, to, eased),
            };
        }
    }
}
