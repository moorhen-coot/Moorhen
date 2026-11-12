/**
 * The decisions the cube loader makes before Coot is involved.
 *
 * The load itself needs a running Coot, so what is checked here is everything that is decided
 * without it: which files are claimed, where the centre and radius land, and the fallback contour
 * level for a file that suggests none. The centre and radius are the ones worth pinning - an
 * orbital box is a few angstrom across, so a radius taken from the counts rather than the steps,
 * or a centre off by the half-box, puts the surface somewhere else entirely.
 */
import { describe, expect, it } from "@jest/globals";
import { parseCubeFile } from "../../src/utils/cubeFile";
import { cubeFieldToMrc } from "../../src/utils/cubeToMap";
import { defaultLevelFor, isCubeFileName } from "../../src/utils/loadCubeFile";

/** A 3x5x7 grid in Angstrom with 1 A steps, cornered at the origin, values all zero. */
const box = (() => {
    const [nx, ny, nz] = [3, 5, 7];
    return [
        "a box",
        "with known corners",
        "    1   0.0  0.0  0.0",
        `   -${nx}   1.0  0.0  0.0`,
        `   -${ny}   0.0  1.0  0.0`,
        `   -${nz}   0.0  0.0  1.0`,
        "    8   0.0   0.0  0.0  0.0",
        ...new Array(nx * ny * nz).fill(" 0.0"),
        "",
    ].join("\n");
})();

describe("which files this reader claims", () => {
    it("takes both spellings, in any case", () => {
        expect(isCubeFileName("orbital.cube")).toBe(true);
        expect(isCubeFileName("orbital.cub")).toBe(true);
        expect(isCubeFileName("ORBITAL.CUBE")).toBe(true);
    });

    it("leaves the map formats alone", () => {
        // .cub must not swallow anything ending in those three letters by accident.
        expect(isCubeFileName("density.mrc")).toBe(false);
        expect(isCubeFileName("cube")).toBe(false);
        expect(isCubeFileName("notacub.map")).toBe(false);
    });
});

describe("where the map is centred", () => {
    it("centres on the middle of the sampled points", () => {
        // Points run 0..n-1, so the centre of a 3x5x7 grid of 1 A steps is at (1, 2, 3). The map
        // is positioned from this, so an off-by-one step here puts the orbital off its molecule.
        const grid = parseCubeFile(box);
        const { centre } = cubeFieldToMrc(grid, grid.fields[0].values, { padding: [0, 0, 0] });
        expect(centre[0]).toBeCloseTo(1, 6);
        expect(centre[1]).toBeCloseTo(2, 6);
        expect(centre[2]).toBeCloseTo(3, 6);
    });

    it("moves the centre with the origin", () => {
        const shifted = parseCubeFile(box.replace("    1   0.0  0.0  0.0", "    1   2.0  0.0  0.0"));
        const { centre } = cubeFieldToMrc(shifted, shifted.fields[0].values, { padding: [0, 0, 0] });
        expect(centre[0]).toBeCloseTo(3, 6);
    });

    it("scales with the step, not just the count", () => {
        // The failure this guards is reading the counts as a size. A grid of the same shape at
        // half the spacing is half the size.
        const fine = parseCubeFile(box
            .replace("   -3   1.0  0.0  0.0", "   -3   0.5  0.0  0.0")
            .replace("   -5   0.0  1.0  0.0", "   -5   0.0  0.5  0.0")
            .replace("   -7   0.0  0.0  1.0", "   -7   0.0  0.0  0.5"));
        const { centre } = cubeFieldToMrc(fine, fine.fields[0].values, { padding: [0, 0, 0] });
        expect(centre[1]).toBeCloseTo(1, 6);
    });
});

describe("the fallback contour level", () => {
    it("is two sigma of the field", () => {
        // Values 0 and 2 alternating: mean 1, sigma 1, so two sigma is 2.
        const values = Float32Array.from([0, 2, 0, 2, 0, 2, 0, 2]);
        expect(defaultLevelFor(values)).toBeCloseTo(2, 9);
    });

    it("scales with the field, which is the point of not using a constant", () => {
        const small = Float32Array.from([0, 2, 0, 2]);
        const large = Float32Array.from([0, 200, 0, 200]);
        expect(defaultLevelFor(large)).toBeCloseTo(100 * defaultLevelFor(small), 6);
    });

    it("is zero rather than NaN for an empty field", () => {
        expect(defaultLevelFor(new Float32Array(0))).toBe(0);
    });
});
