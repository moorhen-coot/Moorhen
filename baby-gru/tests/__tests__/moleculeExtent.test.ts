/**
 * The molecule extent used for the initial zoom.
 *
 * The property that matters most is the dull one: the same atoms must give the same answer, every
 * time, in any order, whatever else the program has done first. That is the whole reason this
 * exists - the coot call it replaces drew from a global unseeded random stream, so its answer moved
 * when anything upstream consumed randomness, and the front clip plane moved with it.
 */
import { describe, expect, it } from "@jest/globals";
import { DIAMETER_PERCENTILE, Point3, ZOOM_DIVISOR, centroidOf, moleculeDiameter } from "../../src/utils/moleculeExtent";

const p = (x: number, y: number, z: number): Point3 => ({ x, y, z });

/** A deterministic pseudo-random cloud, for the order and repetition tests. */
const cloud = (n: number): Point3[] => {
    const out: Point3[] = [];
    let seed = 12345;
    const next = () => {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        return seed / 2147483648;
    };
    for (let i = 0; i < n; i++) out.push(p(next() * 80 - 40, next() * 60 - 30, next() * 100 - 50));
    return out;
};

describe("the centroid", () => {
    it("is the mean position", () => {
        expect(centroidOf([p(0, 0, 0), p(2, 4, 6)])).toEqual([1, 2, 3]);
    });

    it("is the origin for no atoms, rather than NaN", () => {
        expect(centroidOf([])).toEqual([0, 0, 0]);
    });
});

describe("the diameter", () => {
    it("is twice the furthest atom from the centroid", () => {
        // Centroid at the origin, atoms at +-5 along x and +-3 along y.
        const atoms = [p(-5, 0, 0), p(5, 0, 0), p(0, -3, 0), p(0, 3, 0)];
        expect(moleculeDiameter(atoms)).toBeCloseTo(10, 10);
    });

    it("measures the long axis of an elongated molecule, not the short one", () => {
        const atoms = [p(-50, 0, 0), p(50, 0, 0), p(0, -2, 0), p(0, 2, 0)];
        expect(moleculeDiameter(atoms)).toBeCloseTo(100, 10);
    });

    it("counts distance in all three dimensions", () => {
        const atoms = [p(-3, -4, 0), p(3, 4, 0)];
        expect(moleculeDiameter(atoms)).toBeCloseTo(10, 10);
    });

    it("is zero for degenerate selections rather than an arbitrary number", () => {
        expect(moleculeDiameter([])).toBe(0);
        expect(moleculeDiameter([p(17, -4, 2)])).toBe(0);
    });

    it("accepts a precomputed centroid, to avoid walking the list twice", () => {
        const atoms = cloud(500);
        const centre = centroidOf(atoms);
        expect(moleculeDiameter(atoms, centre)).toBe(moleculeDiameter(atoms));
    });
});

describe("determinism, which is the point", () => {
    it("gives the same answer every time", () => {
        const atoms = cloud(2000);
        const first = moleculeDiameter(atoms);
        for (let i = 0; i < 20; i++) expect(moleculeDiameter(atoms)).toBe(first);
    });

    it("does not depend on the order the atoms arrive in", () => {
        const atoms = cloud(2000);
        const expected = moleculeDiameter(atoms);
        const shuffled = [...atoms].reverse();
        expect(moleculeDiameter(shuffled)).toBeCloseTo(expected, 10);
    });

    it("does not depend on anything outside the atom list", () => {
        // The failure this replaces: consuming randomness first changed the result. Nothing here
        // reads a global, so burning a few thousand Math.random calls must change nothing.
        const atoms = cloud(1000);
        const before = moleculeDiameter(atoms);
        for (let i = 0; i < 5000; i++) Math.random();
        expect(moleculeDiameter(atoms)).toBe(before);
    });
});

/** Twice the exact percentile of the radius, by sorting - what the histogram approximates. */
const exactDiameter = (atoms: Point3[], percentile: number): number => {
    const [cx, cy, cz] = centroidOf(atoms);
    const radii = atoms
        .map(a => Math.hypot(a.x - cx, a.y - cy, a.z - cz))
        .sort((p, q) => p - q);
    const index = Math.min(radii.length - 1, Math.ceil((percentile / 100) * radii.length) - 1);
    return 2 * radii[index];
};

describe("trimming the outliers", () => {
    it("takes the strict maximum at 100", () => {
        const atoms = [...cloud(300), p(500, 0, 0)];
        const [cx, cy, cz] = centroidOf(atoms);
        const furthest = Math.max(...atoms.map(a => Math.hypot(a.x - cx, a.y - cy, a.z - cz)));
        expect(moleculeDiameter(atoms, undefined, 100)).toBeCloseTo(2 * furthest, 6);
    });

    it("ignores one atom on a flexible terminus, which the maximum does not", () => {
        // The reason for the percentile. One stray atom five times further out than anything else
        // should not decide how far the whole view zooms back.
        const atoms = cloud(400);
        const strayed = [...atoms, p(400, 400, 400)];

        // The maximum follows the stray out to five times the molecule. The percentile barely
        // moves - and what movement is left is only that one extra atom shifting where the 99.5th
        // falls in a list of four hundred, which shrinks as molecules get bigger.
        expect(moleculeDiameter(strayed, undefined, 100)).toBeGreaterThan(5 * moleculeDiameter(atoms));
        expect(moleculeDiameter(strayed) / moleculeDiameter(atoms)).toBeLessThan(1.1);
    });

    it("still moves when a real part of the molecule moves", () => {
        // Trimming outliers must not mean ignoring a whole domain: 3% of the atoms placed far out
        // is a feature of the structure, not a stray.
        const core = cloud(1000);
        const domain = Array.from({ length: 30 }, (_, i) => p(200 + i, 0, 0));
        expect(moleculeDiameter([...core, ...domain])).toBeGreaterThan(1.5 * moleculeDiameter(core));
    });

    it("agrees with an exact sorted percentile", () => {
        // The histogram is an optimisation, not a different definition. Bins divide squared
        // distance, so they are at their finest where the answer is - one part in a few thousand.
        for (const n of [50, 1000, 5000]) {
            const atoms = cloud(n);
            const binned = moleculeDiameter(atoms);
            const exact = exactDiameter(atoms, DIAMETER_PERCENTILE);
            expect(Math.abs(binned - exact) / exact).toBeLessThan(0.005);
        }
    });
});

describe("the resulting zoom", () => {
    it("frames a molecule at roughly one screen height", () => {
        // ORTHO_HALF_HEIGHT is 24, so zoom = diameter / ZOOM_DIVISOR puts a molecule of diameter d
        // across 48 * d / 50 world units of view - a little under a screen height, which is the
        // margin the old framing had.
        const atoms = cloud(2000);
        const zoom = moleculeDiameter(atoms) / ZOOM_DIVISOR;
        const viewHeight = 48 * zoom;
        expect(viewHeight / moleculeDiameter(atoms)).toBeGreaterThan(0.9);
        expect(viewHeight / moleculeDiameter(atoms)).toBeLessThan(1.0);
    });
});
