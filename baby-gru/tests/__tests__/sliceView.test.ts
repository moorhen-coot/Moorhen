/**
 * Turning the view to look straight at a map's slice (src/utils/mapSlice/sliceView.ts), checked
 * through quatToMat4 - the view's own rotation - rather than any reading of its conventions.
 */
import { describe, expect, it } from "@jest/globals";
import { quatToMat4 } from "../../src/WebGLgComponents/quatToMat4.js";
import { IDENTITY_ORIENTATION } from "../../src/utils/mapSlice/mapSlice";
import { quatFacingSlice, quatFromColumns } from "../../src/utils/mapSlice/sliceView";

/** The world directions of the screen's x and y, and of the line of sight back toward the viewer. */
const screenAxes = (q: number[]) => {
    const m = quatToMat4(q);
    return { x: [m[0], m[4], m[8]], y: [m[1], m[5], m[9]], toward: [m[2], m[6], m[10]] };
};

const expectClose = (actual: number[], expected: number[]) => actual.forEach((value, i) => expect(value).toBeCloseTo(expected[i], 6));

/** A unit quaternion about `axis` by `angle`. */
const about = (axis: number[], angle: number) => {
    const l = Math.hypot(axis[0], axis[1], axis[2]), s = Math.sin(angle / 2) / l;
    return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(angle / 2)];
};

/** A slice orientation (column-major 4x4) with these sides and normal. */
const orientation = (u: number[], v: number[], n: number[]) => [...u, 0, ...v, 0, ...n, 0, 0, 0, 0, 1];

describe("looking straight at a slice", () => {
    it("builds the view whose screen axes are the ones asked for", () => {
        const c = Math.SQRT1_2;
        const x = [c, c, 0], y = [-c, c, 0], z = [0, 0, 1];
        const axes = screenAxes(quatFromColumns(x, y, z));
        expectClose(axes.x, x);
        expectClose(axes.y, y);
        expectClose(axes.toward, z);
        // ...and from the other branches of the conversion, where the trace is not positive.
        for (const [a, b, n] of [[[1, 0, 0], [0, -1, 0], [0, 0, -1]], [[-1, 0, 0], [0, 1, 0], [0, 0, -1]], [[-1, 0, 0], [0, -1, 0], [0, 0, 1]]]) {
            const turned = screenAxes(quatFromColumns(a, b, n));
            expectClose(turned.x, a);
            expectClose(turned.y, b);
            expectClose(turned.toward, n);
        }
    });

    it("looks along the slice's normal, with the side nearest the screen's x along it", () => {
        // A slice standing in the xz plane, its normal -y; the view turned a little off the
        // default, so that the slice's u (world x) is nearest the screen's x.
        const slice = orientation([1, 0, 0], [0, 0, 1], [0, -1, 0]);
        const current = about([0.3, 1, 0.2], 0.4);
        const axes = screenAxes(quatFacingSlice(current, slice));
        expectClose(axes.x, [1, 0, 0]);
        expect(Math.abs(axes.toward[1])).toBeCloseTo(1, 6);
        // Right-handed: x cross y toward the viewer.
        expectClose([axes.x[1] * axes.y[2] - axes.x[2] * axes.y[1], axes.x[2] * axes.y[0] - axes.x[0] * axes.y[2], axes.x[0] * axes.y[1] - axes.x[1] * axes.y[0]], axes.toward);
    });

    it("keeps to the side of the slice the view is already on", () => {
        const slice = [...IDENTITY_ORIENTATION];
        // The default view looks down -z, from +z: the slice's normal, +z, is toward the viewer.
        expectClose(screenAxes(quatFacingSlice([0, 0, 0, -1], slice)).toward, [0, 0, 1]);
        // Turned to look from below, it stays below.
        expectClose(screenAxes(quatFacingSlice(about([1, 0, 0], 2.8), slice)).toward, [0, 0, -1]);
    });

    it("lets the user pick which way round: whichever side is nearest the screen's x", () => {
        const slice = [...IDENTITY_ORIENTATION];
        const sides = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]];
        const chosen = new Set<string>();
        // Turned about the line of sight by about a quarter at a time, the screen's x comes round
        // nearest each of the slice's four sides in turn (where it is read, not assumed).
        for (const angle of [0.3, 1.4, 2.9, -1.4]) {
            const current = about([0, 0, 1], angle);
            const nowX = screenAxes(current).x;
            const nearest = sides.reduce((best, s) => (s[0] * nowX[0] + s[1] * nowX[1] > best[0] * nowX[0] + best[1] * nowX[1] ? s : best));
            const x = screenAxes(quatFacingSlice(current, slice)).x;
            expectClose(x, nearest);
            chosen.add(x.map(c => Math.round(c)).join(","));
        }
        expect(chosen.size).toBe(4);
    });
});
