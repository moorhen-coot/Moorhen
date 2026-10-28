/**
 * Principal axes of a group of atoms.
 *
 * The axes are only defined up to sign - an eigenvector and its negative are equally valid - so
 * every test here compares directions by absolute dot product rather than by components. A test
 * that expected [1,0,0] would fail on a perfectly correct answer of [-1,0,0].
 */
import { describe, expect, it } from "@jest/globals";
import { Point3, Vec3, principalAxes } from "../../src/utils/principalAxes";

const at = (x: number, y: number, z: number): Point3 => ({ x, y, z });

/** 1 when the two directions are parallel or antiparallel, 0 when perpendicular. */
const alignment = (a: Vec3, b: Vec3) => Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2]);

describe("finding the long axis", () => {
    it("follows a line of atoms", () => {
        const points = [-10, -5, 0, 5, 10].map(x => at(x, 0, 0));
        expect(alignment(principalAxes(points).axes[0], [1, 0, 0])).toBeCloseTo(1, 6);
    });

    it("finds it at an angle, not just along a coordinate axis", () => {
        const direction = [1 / Math.sqrt(3), 1 / Math.sqrt(3), 1 / Math.sqrt(3)] as Vec3;
        const points = [-9, -3, 3, 9].map(t => at(t * direction[0], t * direction[1], t * direction[2]));
        expect(alignment(principalAxes(points).axes[0], direction)).toBeCloseTo(1, 5);
    });

    it("picks the longer of two directions", () => {
        // Twenty across in y, four in x: y must win.
        const points = [at(-2, -10, 0), at(2, -10, 0), at(-2, 10, 0), at(2, 10, 0)];
        expect(alignment(principalAxes(points).axes[0], [0, 1, 0])).toBeCloseTo(1, 6);
        expect(alignment(principalAxes(points).axes[1], [1, 0, 0])).toBeCloseTo(1, 6);
    });

    it("gives a flat ring a normal as its third axis", () => {
        // Eight atoms round a circle in the xy plane: the short axis is the ring normal, which is
        // what makes "look down the third axis" show a ring face on.
        const points: Point3[] = [];
        for (let i = 0; i < 8; i++) {
            const angle = (2 * Math.PI * i) / 8;
            points.push(at(5 * Math.cos(angle), 5 * Math.sin(angle), 0));
        }
        expect(alignment(principalAxes(points).axes[2], [0, 0, 1])).toBeCloseTo(1, 5);
    });
});

describe("the axes as a set", () => {
    const points = [at(-8, -3, -1), at(-4, 2, 1), at(0, -1, 0), at(5, 3, -1), at(9, -2, 1)];

    it("is orthonormal", () => {
        const { axes } = principalAxes(points);
        axes.forEach(axis => expect(Math.hypot(...axis)).toBeCloseTo(1, 6));
        expect(alignment(axes[0], axes[1])).toBeCloseTo(0, 6);
        expect(alignment(axes[1], axes[2])).toBeCloseTo(0, 6);
        expect(alignment(axes[0], axes[2])).toBeCloseTo(0, 6);
    });

    it("is right handed, so the camera does not come out mirrored", () => {
        const [a, b, c] = principalAxes(points).axes;
        const expected = [
            a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0],
        ];
        expected.forEach((value, i) => expect(c[i]).toBeCloseTo(value, 6));
    });

    it("orders them longest first", () => {
        const { extents } = principalAxes(points);
        expect(extents[0]).toBeGreaterThanOrEqual(extents[1]);
        expect(extents[1]).toBeGreaterThanOrEqual(extents[2]);
    });
});

describe("the centre and extents", () => {
    it("is the mean position", () => {
        expect(principalAxes([at(0, 0, 0), at(4, 8, 12)]).centre).toEqual([2, 4, 6]);
    });

    it("measures the full width along each axis", () => {
        const points = [at(-6, -2, 0), at(6, -2, 0), at(-6, 2, 0), at(6, 2, 0)];
        const { extents } = principalAxes(points);
        expect(extents[0]).toBeCloseTo(12, 6);
        expect(extents[1]).toBeCloseTo(4, 6);
        expect(extents[2]).toBeCloseTo(0, 6);
    });
});

describe("determinism, which a movie depends on", () => {
    const points = Array.from({ length: 40 }, (_, i) =>
        at(Math.sin(i) * 9, Math.cos(i * 1.7) * 4, Math.sin(i * 0.3) * 2));

    it("gives the same answer every time", () => {
        const first = principalAxes(points);
        for (let i = 0; i < 10; i++) {
            expect(principalAxes(points).axes).toEqual(first.axes);
        }
    });

    it("does not depend on the order the atoms arrive in", () => {
        const forwards = principalAxes(points).axes;
        const backwards = principalAxes([...points].reverse()).axes;
        forwards.forEach((axis, i) => expect(alignment(axis, backwards[i])).toBeCloseTo(1, 5));
    });
});

describe("degenerate inputs", () => {
    it("returns the coordinate axes for no atoms rather than NaN", () => {
        const { axes, centre, extents } = principalAxes([]);
        expect(centre).toEqual([0, 0, 0]);
        expect(extents).toEqual([0, 0, 0]);
        expect(axes[0]).toEqual([1, 0, 0]);
    });

    it("still returns an orthonormal set for a single atom", () => {
        const { axes } = principalAxes([at(3, 4, 5)]);
        axes.forEach(axis => expect(Math.hypot(...axis)).toBeCloseTo(1, 6));
    });

    it("still returns an orthonormal set for two atoms, where two axes are arbitrary", () => {
        const { axes } = principalAxes([at(-5, 0, 0), at(5, 0, 0)]);
        expect(alignment(axes[0], [1, 0, 0])).toBeCloseTo(1, 6);
        axes.forEach(axis => expect(Math.hypot(...axis)).toBeCloseTo(1, 6));
        expect(alignment(axes[0], axes[1])).toBeCloseTo(0, 6);
    });

    it("copes with every atom in the same place", () => {
        const { axes, extents } = principalAxes([at(1, 1, 1), at(1, 1, 1), at(1, 1, 1)]);
        axes.forEach(axis => expect(Math.hypot(...axis)).toBeCloseTo(1, 6));
        expect(extents).toEqual([0, 0, 0]);
    });
});
