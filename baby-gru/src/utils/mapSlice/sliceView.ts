/**
 * Turning the view to look straight at a map's 2D slice ("Align view" in its Draw Settings).
 *
 * The line of sight goes along the slice's normal, from whichever side the view is already on,
 * so the slice is not turned over. That leaves the turn about the line of sight: the slice's
 * side - either of its two, either way - nearest to the screen's x as the view is now becomes the
 * screen's x exactly. So the slice comes out square on, and which way round is the user's: turn
 * the view roughly as wanted, and this makes it exact.
 *
 * The view's turn is a quaternion whose quatToMat4 is the modelview rotation: world to eye, its
 * rows the world directions of the screen's x, y and the line of sight back toward the viewer
 * (quatToMat4 builds the transpose of the textbook matrix of a quaternion).
 */
import { quatToMat4 } from "../../WebGLgComponents/quatToMat4.js";
import { sliceAxes } from "./mapSlice";

type Vec3 = [number, number, number];

const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: number[], b: number[]): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const negated = (a: number[]): Vec3 => [-a[0], -a[1], -a[2]];

/**
 * The quaternion of the rotation whose columns are x, y and z (a right-handed orthonormal set):
 * as quatToMat4 has it, the view in which x, y and z are the screen's x, y and toward the viewer.
 */
export function quatFromColumns(x: number[], y: number[], z: number[]): [number, number, number, number] {
    const [m00, m10, m20] = x, [m01, m11, m21] = y, [m02, m12, m22] = z;
    const trace = m00 + m11 + m22;
    if (trace > 0) {
        const s = 0.5 / Math.sqrt(trace + 1);
        return [(m21 - m12) * s, (m02 - m20) * s, (m10 - m01) * s, 0.25 / s];
    }
    if (m00 > m11 && m00 > m22) {
        const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
        return [0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s];
    }
    if (m11 > m22) {
        const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
        return [(m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s];
    }
    const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
    return [(m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s];
}

/** The view's turn, from `currentQuat`, that looks straight at a slice of this orientation. */
export function quatFacingSlice(currentQuat: number[], sliceOrientation: number[]): [number, number, number, number] {
    const m = quatToMat4(currentQuat);
    const screenX = [m[0], m[4], m[8]];
    const towardViewer = [m[2], m[6], m[10]];
    const { u, v, normal } = sliceAxes(sliceOrientation);
    const z: Vec3 = dot(normal, towardViewer) >= 0 ? (normal as Vec3) : negated(normal);
    let x: Vec3 = u as Vec3;
    for (const side of [u, negated(u), v, negated(v)]) {
        if (dot(side, screenX) > dot(x, screenX)) x = side as Vec3;
    }
    return quatFromColumns(x, cross(z, x), z);
}
