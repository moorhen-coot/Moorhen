/**
 * Turning pointer movement into movement of an object, for the manipulation handles.
 *
 * Pure geometry, kept apart from both the renderer and React so that it can be reasoned about
 * and tested on its own: every function here takes numbers and returns numbers. The renderer
 * supplies the pointer as a ray through the scene - the same front and back pair it already
 * hands to the blob-fitting double click - and this works out what that means for the object.
 */

type Vec3 = [number, number, number];

const sub = (a: number[], b: number[]): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: number[], b: number[]): Vec3 => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
];
const length = (a: number[]) => Math.sqrt(dot(a, a));
const normalise = (a: number[]): Vec3 => {
    const l = length(a);
    return l > 0 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 0];
};

/**
 * How far along an axis through `centre` the pointer is, as a distance from the centre.
 *
 * The pointer is a line, not a point, so "where along the axis" means the point on the axis
 * closest to that line. Null when the two are parallel, where the question has no answer - which
 * happens whenever a handle is pointing at or away from the viewer, and is why a drag has to
 * cope with being given nothing.
 */
export const distanceAlongAxis = (
    centre: number[],
    axis: number[],
    rayFrom: number[],
    rayTo: number[]
): number | null => {
    const a = normalise(axis);
    const d = sub(rayTo, rayFrom);
    const r = sub(centre, rayFrom);

    const aa = dot(a, a);
    const ad = dot(a, d);
    const dd = dot(d, d);
    if (aa < 1e-12 || dd < 1e-12) return null;

    const determinant = ad * ad - aa * dd;
    // Zero when the pointer runs along the axis: every point of it is equally close.
    if (Math.abs(determinant) < 1e-9 * aa * dd) return null;

    return (dot(a, r) * dd - ad * dot(d, r)) / determinant;
};

/**
 * The angle round an axis at which the pointer crosses the plane the axis is normal to.
 *
 * Null when the pointer runs along that plane rather than through it - the ring seen edge on,
 * where a rotation cannot be read off the screen at all.
 */
export const angleAboutAxis = (
    centre: number[],
    axis: number[],
    reference: number[],
    rayFrom: number[],
    rayTo: number[]
): number | null => {
    const n = normalise(axis);
    const d = sub(rayTo, rayFrom);
    const alongNormal = dot(d, n);
    if (Math.abs(alongNormal) < 1e-9 * length(d)) return null;

    const t = dot(sub(centre, rayFrom), n) / alongNormal;
    const hit = [rayFrom[0] + t * d[0], rayFrom[1] + t * d[1], rayFrom[2] + t * d[2]];
    const spoke = sub(hit, centre);
    if (length(spoke) < 1e-9) return null;

    // A frame in the plane, so that the angle is measured from somewhere fixed.
    const u = normalise(sub(reference, [dot(reference, n) * n[0], dot(reference, n) * n[1], dot(reference, n) * n[2]]));
    if (length(u) < 0.5) return null;
    const w = cross(n, u);
    return Math.atan2(dot(spoke, w), dot(spoke, u));
};

/** An angle difference brought into (-pi, pi], so that crossing the seam does not spin the object. */
export const shortestAngleBetween = (from: number, to: number): number => {
    let delta = to - from;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta <= -Math.PI) delta += 2 * Math.PI;
    return delta;
};

/**
 * An orientation turned by `angle` about a world axis.
 *
 * The rotation is applied on the left - R times M, not M times R - because the axis is one of
 * the world's, not one of the object's: the handles point along x, y and z however the object
 * itself is turned.
 *
 * Column-major throughout, as everything that reaches the shader is.
 */
export const rotatedOrientation = (orientation: number[], axis: number[], angle: number): number[] => {
    const [x, y, z] = normalise(axis);
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const t = 1 - c;

    // Rodrigues, as a column-major 3x3 held in the 4x4's top left.
    const r = [
        t * x * x + c,      t * x * y + s * z,  t * x * z - s * y,
        t * x * y - s * z,  t * y * y + c,      t * y * z + s * x,
        t * x * z + s * y,  t * y * z - s * x,  t * z * z + c,
    ];

    const out = [...orientation];
    for (let column = 0; column < 3; column++) {
        for (let row = 0; row < 3; row++) {
            out[column * 4 + row] =
                r[0 * 3 + row] * orientation[column * 4 + 0] +
                r[1 * 3 + row] * orientation[column * 4 + 1] +
                r[2 * 3 + row] * orientation[column * 4 + 2];
        }
    }
    return out;
};

/** The world axis a handle's label names. */
export const axisOfTag = (tag: string): Vec3 | null => {
    const axis = tag.split("|")[1];
    if (axis === "x") return [1, 0, 0];
    if (axis === "y") return [0, 1, 0];
    if (axis === "z") return [0, 0, 1];
    return null;
};

/** Whether a handle's label asks for a move or a turn. */
export const actionOfTag = (tag: string): "translate" | "rotate" | null => {
    const action = tag.split("|")[0];
    return action === "translate" || action === "rotate" ? action : null;
};
