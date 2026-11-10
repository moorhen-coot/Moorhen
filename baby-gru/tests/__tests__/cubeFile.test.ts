/**
 * Reading a Gaussian Cube file.
 *
 * Mostly about the three things the format gets to decide silently: what unit it is in, whether
 * the grid is skewed, and which index runs fastest. Each of those is wrong in a way that still
 * produces a picture, which is why they are asserted rather than eyeballed.
 */
import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import {
    BOHR_TO_ANGSTROM, CubeFormatError, cubeFieldName, parseCubeFile, suggestedLevelFromComment,
} from "../../src/utils/cubeFile";

/** A 2x2x2 cube in Angstrom (negative counts), values 1..8 in the file's own order. */
const tinyAngstrom = [
    "a comment",
    "another",
    "    1   0.0  0.0  0.0",
    "   -2   1.0  0.0  0.0",
    "   -2   0.0  1.0  0.0",
    "   -2   0.0  0.0  1.0",
    "    8   0.0   0.5  0.5  0.5",
    " 1.0 2.0 3.0",
    " 4.0 5.0 6.0",
    " 7.0 8.0",
    "",
].join("\n");

describe("units", () => {
    it("treats positive voxel counts as Bohr and converts", () => {
        // The only statement of units in the whole format. Getting it wrong scales the molecule by
        // 1.89 and leaves everything self-consistent, so nothing looks broken.
        const text = tinyAngstrom.replace(/   -2 /g, "    2 ");
        const grid = parseCubeFile(text);
        expect(grid.axes[0][0]).toBeCloseTo(BOHR_TO_ANGSTROM, 9);
        expect(grid.atoms[0].position[0]).toBeCloseTo(0.5 * BOHR_TO_ANGSTROM, 9);
    });

    it("leaves negative voxel counts alone, because they are already Angstrom", () => {
        const grid = parseCubeFile(tinyAngstrom);
        expect(grid.axes[0][0]).toBeCloseTo(1.0, 9);
        expect(grid.atoms[0].position[0]).toBeCloseTo(0.5, 9);
        expect(grid.counts).toEqual([2, 2, 2]);
    });
});

describe("the grid", () => {
    it("keeps the axes as vectors so a skewed grid survives", () => {
        const skewed = tinyAngstrom.replace("   -2   0.0  1.0  0.0", "   -2   0.3  1.0  0.0");
        const grid = parseCubeFile(skewed);
        expect(grid.axes[1]).toEqual([0.3, 1.0, 0.0]);
    });

    it("keeps the values in the file's order, last axis fastest", () => {
        // x slowest, z fastest - the opposite of most map formats. A transposed field is the
        // failure this guards, and a transposed field still contours into something believable.
        const grid = parseCubeFile(tinyAngstrom);
        expect(grid.fields).toHaveLength(1);
        expect(grid.fields[0].index).toBeUndefined();
        expect(Array.from(grid.fields[0].values)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
        const at = (i: number, j: number, k: number) => grid.fields[0].values[(i * 2 + j) * 2 + k];
        expect(at(0, 0, 0)).toBe(1);
        expect(at(0, 0, 1)).toBe(2);   // z moves first
        expect(at(1, 0, 0)).toBe(5);   // x moves last
    });

    it("notices a truncated file rather than contouring the gap", () => {
        expect(() => parseCubeFile(tinyAngstrom.replace(" 7.0 8.0", " 7.0")))
            .toThrow(CubeFormatError);
    });

    it("de-interleaves a multi-field cube and keeps the orbital numbers", () => {
        // A negative atom count means several fields share the grid, all of a point's values
        // together. Gaussian's cubegen writes these when asked for more than one orbital.
        // Sixteen values: eight points, two fields, odd numbers in field 5 and even in field 6.
        const multi = [
            "a comment",
            "another",
            "   -1   0.0  0.0  0.0",
            "   -2   1.0  0.0  0.0",
            "   -2   0.0  1.0  0.0",
            "   -2   0.0  0.0  1.0",
            "    8   0.0   0.5  0.5  0.5",
            "    2    5    6",
            " 1.0 10.0 2.0 20.0 3.0 30.0",
            " 4.0 40.0 5.0 50.0 6.0 60.0",
            " 7.0 70.0 8.0 80.0",
            "",
        ].join("\n");
        const grid = parseCubeFile(multi);
        expect(grid.fields.map(f => f.index)).toEqual([5, 6]);
        expect(Array.from(grid.fields[0].values)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
        expect(Array.from(grid.fields[1].values)).toEqual([10, 20, 30, 40, 50, 60, 70, 80]);
        // The grid geometry is shared, not repeated.
        expect(grid.counts).toEqual([2, 2, 2]);
    });

    it("notices a multi-field cube that stops early", () => {
        const short = [
            "a", "b",
            "   -1   0.0  0.0  0.0",
            "   -2   1.0  0.0  0.0",
            "   -2   0.0  1.0  0.0",
            "   -2   0.0  0.0  1.0",
            "    8   0.0   0.5  0.5  0.5",
            "    2    5    6",
            " 1.0 10.0 2.0 20.0",
            "",
        ].join("\n");
        expect(() => parseCubeFile(short)).toThrow(/16 values .*2 fields.*4/s);
    });
});

describe("the level the file suggests", () => {
    it("reads Psi4's isocontour range", () => {
        expect(suggestedLevelFromComment(
            "Property: Psi_a_5_1-B1. Isocontour range for 85% of the density: (0.0790691,-0.0790455)"
        )).toBeCloseTo(0.0790455, 9);
    });

    it("takes the smaller of the pair, so both lobes have a surface", () => {
        // One level is used as +level and -level. Taking the larger magnitude puts the negative
        // level past the field's own minimum and the negative lobe simply does not appear.
        expect(suggestedLevelFromComment("range: (0.5,-0.2)")).toBeCloseTo(0.2, 9);
        expect(suggestedLevelFromComment("range: (0.2,-0.5)")).toBeCloseTo(0.2, 9);
    });

    it("has none when the comment says nothing", () => {
        expect(suggestedLevelFromComment("Psi4 Gaussian Cube File.")).toBeUndefined();
    });
});

/**
 * The real files, when they are to hand.
 *
 * Skipped rather than failed when they are not: they live outside the repo, and a test that only
 * runs on one machine should say so rather than break everyone else's run.
 */
const realCube = join(__dirname, "../../../Psi_a_5_1-B1.cube");
let realText: string | null = null;
try { realText = readFileSync(realCube, "utf8"); } catch { realText = null; }
const withRealFile = realText ? describe : describe.skip;

withRealFile("a Psi4 orbital of water", () => {
    it("reads the grid, the atoms and the suggested level", () => {
        const grid = parseCubeFile(realText as string);
        expect(grid.counts).toEqual([41, 56, 47]);
        expect(grid.fields).toHaveLength(1);
        expect(grid.fields[0].values.length).toBe(41 * 56 * 47);
        expect(grid.atoms.map(atom => atom.element)).toEqual([8, 1, 1]);
        // 0.2 Bohr, stated in Angstrom.
        expect(grid.axes[0][0]).toBeCloseTo(0.2 * BOHR_TO_ANGSTROM, 9);
        expect(grid.suggestedLevel).toBeCloseTo(0.0790455, 7);
        // Signed, which is what makes this want two surfaces rather than one.
        expect(grid.fields[0].signed).toBe(true);
    });

    it("puts the oxygen and both hydrogens a real bond length apart", () => {
        // An end-to-end check on the unit conversion that does not depend on reading the header
        // the same way twice: water's O-H is about 0.96 A, and would come out at 1.81 if the Bohr
        // conversion were skipped.
        const grid = parseCubeFile(realText as string);
        const [o, h1, h2] = grid.atoms.map(atom => atom.position);
        const distance = (a: number[], b: number[]) =>
            Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
        expect(distance(o, h1)).toBeCloseTo(0.96, 1);
        expect(distance(o, h2)).toBeCloseTo(0.96, 1);
    });
});

describe("naming the maps a cube produces", () => {
    it("uses the file's own name when the file holds one field", () => {
        // Psi4 puts the orbital's label in the filename, so there is nothing better to say.
        expect(cubeFieldName("Psi_a_5_1-B1.cube", 1, 0)).toBe("Psi_a_5_1-B1");
        expect(cubeFieldName("Psi_a_5_1-B1.CUB", 1, 0)).toBe("Psi_a_5_1-B1");
    });

    it("uses the orbital numbers the file gives, not its own counting", () => {
        // A file of orbitals 5 and 6 should say 5 and 6. The index line is required of the
        // multi-field form, so this is the ordinary case rather than the lucky one.
        expect(cubeFieldName("orbitals.cube", 2, 0, 5)).toBe("orbitals 5");
        expect(cubeFieldName("orbitals.cube", 2, 1, 6)).toBe("orbitals 6");
    });

    it("counts from one only when the file numbers nothing", () => {
        expect(cubeFieldName("orbitals.cube", 2, 0)).toBe("orbitals 1");
        expect(cubeFieldName("orbitals.cube", 2, 1)).toBe("orbitals 2");
    });

    it("keeps the file name in front, so two cubes cannot collide", () => {
        expect(cubeFieldName("alpha.cube", 2, 0, 5)).not.toBe(cubeFieldName("beta.cube", 2, 0, 5));
    });
});
