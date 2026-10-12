/**
 * A worked example of a movie: fly in to a ligand, turn around it, fly back out.
 *
 * This exists to exercise cameraPath against a real molecule rather than against test fixtures -
 * the arithmetic can be right and the result still look wrong, and only a real ligand in a real
 * scene will say which. It is a spike, not a feature: a real movie editor would let someone place
 * these keyframes by hand rather than computing them.
 *
 * The three parts are:
 *
 *   1. move from wherever the camera is now to the ligand, framed so its long axis lies along the
 *      screen x axis and its second axis along y - so the molecule lies flat and wide on screen
 *      rather than at an arbitrary angle;
 *   2. half a turn about the vertical, to show the other side;
 *   3. move back out to exactly where it started.
 *
 * ORIENTING THE CAMERA
 *
 * The rotation is built the same way centreAndAlignViewOn builds its: three orthonormal world
 * vectors written into a mat3 as right, up and forward, then quat4.fromMat3. That function aligns
 * on a residue using C, CA and O, which a ligand has no equivalent of - so the principal axes of
 * the ligand's atoms stand in. Following its construction exactly rather than deriving one is
 * deliberate: the sign and handedness conventions are then whatever already works on screen,
 * instead of whatever I reasoned they should be.
 */

import * as mat3 from "gl-matrix/mat3";
import * as quat4 from "gl-matrix/quat";
import { CameraKeyframe, Movie, Vec3 } from "./cameraPath";
import { Point3, principalAxes } from "./principalAxes";

export interface LigandTourOptions {
    /** Seconds to fly in, and the same again to fly back out. */
    approachSeconds?: number;
    /** Seconds spent turning around the ligand. */
    turnSeconds?: number;
    /** How far round to go. Half a turn shows the far side. */
    turns?: number;
    /**
     * How much of the frame the ligand should fill.
     *
     * The orthographic view is 48 world units tall at zoom 1, so a zoom of extent/48 would have
     * the ligand exactly touching the edges. A little more leaves some room around it.
     */
    marginFactor?: number;
}

const DEFAULTS = {
    approachSeconds: 3,
    turnSeconds: 4,
    turns: 0.5,
    marginFactor: 1.6,
};

/** Half the orthographic view height at zoom 1, matching mgWebGLParts/projection. */
const ORTHO_HALF_HEIGHT = 24;

const normalise = (v: Vec3): Vec3 => {
    const length = Math.hypot(v[0], v[1], v[2]);
    return length > 1e-12 ? [v[0] / length, v[1] / length, v[2] / length] : [1, 0, 0];
};

const cross = (a: Vec3, b: Vec3): Vec3 => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
];

/**
 * A view orientation that puts `right` along the screen x axis and `upInit` roughly along y.
 *
 * `upInit` only has to be in the right half-plane; it is orthogonalised against `right`, so the
 * caller can hand over two principal axes without worrying whether they are exactly perpendicular
 * after the numerics.
 */
export const orientationLookingAt = (right: Vec3, upInit: Vec3): quat4.quat => {
    const rightNorm = normalise(right);
    const forwardNorm = normalise(cross(rightNorm, normalise(upInit)));
    const upNorm = normalise(cross(forwardNorm, rightNorm));

    const mat = mat3.create();
    mat3.set(mat,
        rightNorm[0], rightNorm[1], rightNorm[2],
        upNorm[0], upNorm[1], upNorm[2],
        forwardNorm[0], forwardNorm[1], forwardNorm[2]);

    const out = quat4.create();
    quat4.fromMat3(out, mat);
    quat4.normalize(out, out);
    return out;
};

/** The keyframe that frames a group of atoms nicely. */
export const keyframeFacing = (
    atoms: ArrayLike<Point3>,
    template: CameraKeyframe,
    marginFactor = DEFAULTS.marginFactor,
): CameraKeyframe => {
    const { centre, axes, extents } = principalAxes(atoms);

    // The view centre is the negated position, which is the convention setOrigin and
    // centreOnGemmiAtoms both use.
    const origin: Vec3 = [-centre[0], -centre[1], -centre[2]];

    // Fit the larger of the two on-screen extents, so a long thin ligand is framed by its length
    // and a round one by its width.
    const onScreen = Math.max(extents[0], extents[1], 1);
    const zoom = (onScreen * marginFactor) / (2 * ORTHO_HALF_HEIGHT);

    // The second principal axis goes in as `right` and the long axis as `up`.
    //
    // That reads backwards and is not: the quaternion built here is the inverse of the rotation
    // that carries world directions onto screen ones, because mat3.set fills gl-matrix's
    // column-major storage and so writes these three vectors as the matrix's columns rather than
    // its rows. Passing the long axis as `right` put it up the screen. The construction is copied
    // from centreAndAlignViewOn, which has the same inversion and is correct on screen, so the
    // compensation belongs here rather than in a "fix" to that.
    return {
        ...template,
        quat: orientationLookingAt(axes[1], axes[0]),
        origin,
        zoom,
    };
};

/** The same orientation, turned about the screen's vertical by some fraction of a full turn. */
const turnedBy = (base: quat4.quat, turns: number): quat4.quat => {
    const turn = quat4.create();
    quat4.setAxisAngle(turn, [0, 1, 0], turns * 2 * Math.PI);
    const out = quat4.create();
    quat4.multiply(out, base, turn);
    quat4.normalize(out, out);
    return out;
};

/**
 * Build the tour.
 *
 * @param current  where the camera is now, which is both the first and the last keyframe
 * @param atoms    the ligand
 */
export function buildLigandTour(
    current: CameraKeyframe,
    atoms: ArrayLike<Point3>,
    options: LigandTourOptions = {},
): Movie {
    const { approachSeconds, turnSeconds, turns, marginFactor } = { ...DEFAULTS, ...options };

    const arrival = keyframeFacing(atoms, current, marginFactor);
    // Where the turn leaves the camera. A half turn does not come back to where it started, so the
    // keyframe after a spin has to be the turned orientation - otherwise the following move would
    // snap back through 180 degrees.
    const departure: CameraKeyframe = { ...arrival, quat: turnedBy(arrival.quat, turns) };

    return {
        keyframes: [current, arrival, departure, current],
        segments: [
            { seconds: approachSeconds, motion: { kind: "move" } },
            { seconds: turnSeconds, motion: { kind: "spin", turns, axis: "y" } },
            { seconds: approachSeconds, motion: { kind: "move" } },
        ],
    };
}
