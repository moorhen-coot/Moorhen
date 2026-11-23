/**
 * The natural axes of a group of atoms: which way is it long, which way is it wide.
 *
 * Used to frame something in the camera. "Align the ligand's long axis with the screen x axis" has
 * to start by deciding what the long axis is, and for an arbitrary ligand there is no bond or atom
 * name to read it off - unlike a residue, where centreAndAlignViewOn can use C, CA and O.
 *
 * This is principal component analysis of the atom positions: the first axis is the direction of
 * greatest spread, the second the greatest spread perpendicular to it, the third completes a
 * right-handed set. For a flat ring the third axis is the ring normal, which is why looking down
 * it shows the ring face on.
 *
 * The eigenvectors come from power iteration with deflation rather than a general eigensolver.
 * Three-by-three symmetric is a small enough problem that the simple method converges in a few
 * dozen iterations, and it has the property that matters here: it is deterministic. The same atoms
 * give the same axes every time, which a movie depends on.
 */

export type Vec3 = [number, number, number];

export interface Point3 {
    x: number;
    y: number;
    z: number;
}

export interface PrincipalAxes {
    /** The mean position. */
    centre: Vec3;
    /** Long, middle and short, right-handed, each a unit vector. */
    axes: [Vec3, Vec3, Vec3];
    /** Full width along each axis, so twice the furthest atom from the centre in that direction. */
    extents: Vec3;
}

/** Enough for a 3x3 covariance to settle; a handful more costs nothing and guards odd cases. */
const ITERATIONS = 64;

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

const normalise = (v: Vec3): Vec3 => {
    const length = Math.hypot(v[0], v[1], v[2]);
    return length > 1e-12 ? [v[0] / length, v[1] / length, v[2] / length] : [0, 0, 0];
};

const cross = (a: Vec3, b: Vec3): Vec3 => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
];

/** A unit vector perpendicular to the given one, chosen deterministically. */
const anyPerpendicular = (v: Vec3): Vec3 => {
    // Cross with whichever axis the vector is least aligned to, so the result is never degenerate.
    const smallest = Math.abs(v[0]) <= Math.abs(v[1]) && Math.abs(v[0]) <= Math.abs(v[2]) ? [1, 0, 0]
        : Math.abs(v[1]) <= Math.abs(v[2]) ? [0, 1, 0] : [0, 0, 1];
    return normalise(cross(v, smallest as Vec3));
};

type Matrix3 = [number, number, number, number, number, number, number, number, number];

const multiply = (m: Matrix3, v: Vec3): Vec3 => [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];

/** The dominant eigenvector, by repeatedly applying the matrix and renormalising. */
const dominantEigenvector = (m: Matrix3, start: Vec3): Vec3 => {
    let v = normalise(start);
    if (v[0] === 0 && v[1] === 0 && v[2] === 0) return [1, 0, 0];
    for (let i = 0; i < ITERATIONS; i++) {
        const next = normalise(multiply(m, v));
        if (next[0] === 0 && next[1] === 0 && next[2] === 0) return v;
        v = next;
    }
    return v;
};

/** Remove a direction from a matrix, so the next iteration finds the next axis instead. */
const deflate = (m: Matrix3, v: Vec3): Matrix3 => {
    const eigenvalue = dot(v, multiply(m, v));
    const out = [...m] as Matrix3;
    for (let row = 0; row < 3; row++) {
        for (let column = 0; column < 3; column++) {
            out[row * 3 + column] -= eigenvalue * v[row] * v[column];
        }
    }
    return out;
};

export function principalAxes(points: ArrayLike<Point3>): PrincipalAxes {
    const n = points.length;
    if (n === 0) {
        return { centre: [0, 0, 0], axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], extents: [0, 0, 0] };
    }

    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < n; i++) { cx += points[i].x; cy += points[i].y; cz += points[i].z; }
    const centre: Vec3 = [cx / n, cy / n, cz / n];

    // Covariance of the centred positions. Symmetric, so six distinct entries.
    let xx = 0, xy = 0, xz = 0, yy = 0, yz = 0, zz = 0;
    for (let i = 0; i < n; i++) {
        const dx = points[i].x - centre[0];
        const dy = points[i].y - centre[1];
        const dz = points[i].z - centre[2];
        xx += dx * dx; xy += dx * dy; xz += dx * dz;
        yy += dy * dy; yz += dy * dz; zz += dz * dz;
    }
    const covariance: Matrix3 = [xx / n, xy / n, xz / n, xy / n, yy / n, yz / n, xz / n, yz / n, zz / n];

    // A fixed, slightly irregular start vector: an axis-aligned one can be exactly orthogonal to
    // the true principal direction, in which case iteration never moves off it.
    let first = dominantEigenvector(covariance, [0.577, 0.511, 0.637]);
    if (first[0] === 0 && first[1] === 0 && first[2] === 0) first = [1, 0, 0];

    const deflated = deflate(covariance, first);
    let second = dominantEigenvector(deflated, anyPerpendicular(first));
    // Numerical drift can leave the second axis slightly off perpendicular; take out the component
    // along the first so the set really is orthogonal.
    second = normalise([
        second[0] - dot(second, first) * first[0],
        second[1] - dot(second, first) * first[1],
        second[2] - dot(second, first) * first[2],
    ]);
    if (second[0] === 0 && second[1] === 0 && second[2] === 0) second = anyPerpendicular(first);

    const third = normalise(cross(first, second));

    const widest = (axis: Vec3): number => {
        let furthest = 0;
        for (let i = 0; i < n; i++) {
            const d = (points[i].x - centre[0]) * axis[0]
                + (points[i].y - centre[1]) * axis[1]
                + (points[i].z - centre[2]) * axis[2];
            furthest = Math.max(furthest, Math.abs(d));
        }
        return 2 * furthest;
    };

    return {
        centre,
        axes: [first, second, third],
        extents: [widest(first), widest(second), widest(third)],
    };
}
