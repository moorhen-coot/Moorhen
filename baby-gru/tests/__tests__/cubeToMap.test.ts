/**
 * Writing a cube grid out as an MRC map.
 *
 * Checked by reading the result back with Moorhen's own readMRCHeader rather than against the
 * spec, because that is the reader the loading path actually uses - and because a header that
 * merely satisfies my reading of the format is exactly the thing that would pass a test written
 * from the same misreading.
 *
 * The transpose and the origin get the most attention. Both produce a map that contours into
 * something perfectly believable when they are wrong: a transposed field looks like a different
 * orbital, and a mispositioned one looks like a map of the right shape sitting beside its molecule.
 */
import { describe, expect, it } from "@jest/globals";
import { parseCubeFile } from "../../src/utils/cubeFile";
import { MRC_HEADER_BYTES, cubeFieldToMrc } from "../../src/utils/cubeToMap";
import { readMRCHeader } from "../../src/utils/mapHeaders";

/**
 * A 2x3x4 grid in Angstrom, deliberately not cubic so a transpose cannot hide, with each value
 * encoding its own position as x*100 + y*10 + z.
 */
const orderedCube = (() => {
    const [nx, ny, nz] = [2, 3, 4];
    const values: number[] = [];
    for (let x = 0; x < nx; x++)
        for (let y = 0; y < ny; y++)
            for (let z = 0; z < nz; z++)
                values.push(x * 100 + y * 10 + z);
    return [
        "ordered",
        "values encode x*100 + y*10 + z",
        "    1   1.0  2.0  3.0",
        `   -${nx}   0.5  0.0  0.0`,
        `   -${ny}   0.0  0.5  0.0`,
        `   -${nz}   0.0  0.0  0.5`,
        "    8   0.0   0.0  0.0  0.0",
        ...values.map(v => ` ${v.toFixed(1)}`),
        "",
    ].join("\n");
})();

describe("the header Moorhen will read back", () => {
    it("is a float map of the right shape, in the identity axis order", () => {
        const grid = parseCubeFile(orderedCube);
        const { buffer } = cubeFieldToMrc(grid, grid.fields[0].values, { padding: [0, 0, 0] });
        return readMRCHeader(buffer).then(header => {
            expect(header.dimensions.mode).toBe(2);
            // Columns are x, and x is the fastest axis in the data written below.
            expect(header.axisMapping).toEqual({ mapc: 1, mapr: 2, maps: 3 });
            expect([header.dimensions.nx, header.dimensions.ny, header.dimensions.nz])
                .toEqual([2, 3, 4]);
            expect(header.format.map).toBe("MAP");
            expect(header.format.littleEndian).toBe(true);
            expect(header.spaceGroup.ispg).toBe(1);
            expect(header.extendedHeader.nSymbt).toBe(0);
        });
    });

    it("states a cell that divides back to the step the cube asked for", () => {
        // cell / sampling is the spacing. Getting this wrong scales the map against its molecule.
        const grid = parseCubeFile(orderedCube);
        const { buffer } = cubeFieldToMrc(grid, grid.fields[0].values, { padding: [0, 0, 0] });
        return readMRCHeader(buffer).then(header => {
            const { cella } = header.unitCell;
            const { mx, my, mz } = header.sampling;
            expect(cella.x / mx).toBeCloseTo(0.5, 6);
            expect(cella.y / my).toBeCloseTo(0.5, 6);
            expect(cella.z / mz).toBeCloseTo(0.5, 6);
        });
    });

    it("keeps a skewed grid skewed", () => {
        const skewed = orderedCube.replace("   -3   0.0  0.5  0.0", "   -3   0.5  0.5  0.0");
        const grid = parseCubeFile(skewed);
        const { buffer } = cubeFieldToMrc(grid, grid.fields[0].values, { padding: [0, 0, 0] });
        return readMRCHeader(buffer).then(header => {
            // a and b are now 45 degrees apart, which is gamma.
            expect(header.unitCell.cellb.gamma).toBeCloseTo(45, 4);
            expect(header.unitCell.cellb.alpha).toBeCloseTo(90, 4);
        });
    });

    it("reports statistics taken from the field, not left at zero", () => {
        const grid = parseCubeFile(orderedCube);
        const { buffer, statistics } = cubeFieldToMrc(grid, grid.fields[0].values, { padding: [0, 0, 0] });
        expect(statistics.min).toBe(0);
        expect(statistics.max).toBe(123);
        return readMRCHeader(buffer).then(header => {
            expect(header.statistics.dmin).toBeCloseTo(0, 5);
            expect(header.statistics.dmax).toBeCloseTo(123, 4);
            expect(header.statistics.rms).toBeGreaterThan(0);
        });
    });
});

describe("the transpose", () => {
    it("writes the data x-fastest, which is the opposite of the cube's order", () => {
        // The whole point. Each value says where it came from, so a wrong order is not a subtle
        // statistical difference, it is the wrong number in the wrong place.
        const grid = parseCubeFile(orderedCube);
        const { buffer } = cubeFieldToMrc(grid, grid.fields[0].values, { padding: [0, 0, 0] });
        const data = new Float32Array(buffer, MRC_HEADER_BYTES);
        const [nx, ny] = [2, 3];
        const at = (x: number, y: number, z: number) => data[(z * ny + y) * nx + x];
        for (let x = 0; x < 2; x++)
            for (let y = 0; y < 3; y++)
                for (let z = 0; z < 4; z++)
                    expect(at(x, y, z)).toBe(x * 100 + y * 10 + z);
    });

    it("puts the second value one step along x, where the cube had it along z", () => {
        // Stated separately because it is the single comparison that fails first when the two
        // orders are swapped, and it reads as the claim rather than as a loop.
        const grid = parseCubeFile(orderedCube);
        const { buffer } = cubeFieldToMrc(grid, grid.fields[0].values, { padding: [0, 0, 0] });
        const data = new Float32Array(buffer, MRC_HEADER_BYTES);
        expect(data[0]).toBe(0);     // x=0, y=0, z=0
        expect(data[1]).toBe(100);   // x=1 - one step along the fastest axis
        expect(grid.fields[0].values[1]).toBe(1); // whereas the cube's second value was z=1
    });
});

describe("the origin", () => {
    it("says the same thing in both of the places a reader might look", () => {
        // NXSTART in voxels and ORIGIN in angstrom. Writing two different answers is how a map
        // ends up beside its molecule, so they are derived from one snapped value.
        const grid = parseCubeFile(orderedCube);
        const { buffer } = cubeFieldToMrc(grid, grid.fields[0].values, { padding: [0, 0, 0] });
        const view = new DataView(buffer);
        return readMRCHeader(buffer).then(header => {
            const originWords = [196, 200, 204].map(offset => view.getFloat32(offset, true));
            const starts = [header.start.nxstart, header.start.nystart, header.start.nzstart];
            const steps = [0.5, 0.5, 0.5];
            starts.forEach((start, axis) => {
                expect(start * steps[axis]).toBeCloseTo(originWords[axis], 5);
            });
        });
    });

    it("snaps by less than half a voxel, and says how far", () => {
        // The cube's origin need not sit on a voxel - Psi4's does not in two of three axes - so
        // the snap is real and its size is worth asserting rather than assuming.
        const offGrid = orderedCube.replace("    1   1.0  2.0  3.0", "    1   1.1  2.26  3.0");
        const grid = parseCubeFile(offGrid);
        const { originShift } = cubeFieldToMrc(grid, grid.fields[0].values, { padding: [0, 0, 0] });
        originShift.forEach(shift => expect(Math.abs(shift)).toBeLessThanOrEqual(0.25 + 1e-9));
        expect(Math.abs(originShift[0])).toBeGreaterThan(0);
    });
});

describe("refusing a field that does not fit the grid", () => {
    it("says so rather than writing a short map", () => {
        const grid = parseCubeFile(orderedCube);
        expect(() => cubeFieldToMrc(grid, new Float32Array(5)))
            .toThrow(/5 values and the grid has 24/);
    });
});

/**
 * Padding, and the radius it exists to make possible.
 *
 * A map is a crystal: contour past one cell and the field repeats, which for a box a few angstrom
 * across is most of what anyone would want to see. These are the two halves of the defence -
 * a radius that cannot reach the cell edge, and enough zeros around the data that the radius still
 * reaches the density.
 */
describe("staying inside one cell", () => {
    /** A 40x40x40 grid of 0.25 A steps with a Gaussian blob of width 1 A at its centre. */
    const blob = (halfWidth: number) => {
        const n = 40, step = 0.25;
        const values: number[] = [];
        for (let x = 0; x < n; x++)
            for (let y = 0; y < n; y++)
                for (let z = 0; z < n; z++) {
                    const r2 = [x, y, z].reduce((acc, i) => acc + ((i - (n - 1) / 2) * step) ** 2, 0);
                    values.push(Math.exp(-r2 / (2 * halfWidth * halfWidth)));
                }
        return [
            "blob",
            "Isocontour range for 85% of the density: (0.1,-0.1)",
            "    1   -5.0  -5.0  -5.0",
            `   -${n}   ${step}  0.0  0.0`,
            `   -${n}   0.0  ${step}  0.0`,
            `   -${n}   0.0  0.0  ${step}`,
            "    8   0.0   0.0  0.0  0.0",
            ...values.map(v => ` ${v.toExponential(6)}`),
            "",
        ].join("\n");
    };

    it("never offers a radius that reaches the cell edge", () => {
        // The whole point: at this radius the sphere cannot touch a periodic copy. Coot has no
        // setting that would stop it drawing one if it could.
        const grid = parseCubeFile(blob(0.5));
        const { safeRadius, padding } = cubeFieldToMrc(grid, grid.fields[0].values);
        const narrowest = Math.min(
            (40 + 2 * padding[0]) * 0.25, (40 + 2 * padding[1]) * 0.25, (40 + 2 * padding[2]) * 0.25);
        expect(safeRadius).toBeLessThan(narrowest / 2);
        expect(safeRadius).toBeGreaterThan(0);
    });

    it("adds nothing when the density already sits well inside", () => {
        // A tight blob in a roomy box, which is what a cube writer normally produces. Padding here
        // would be memory spent on zeros.
        const grid = parseCubeFile(blob(0.5));
        const { padding, clipsSignificantDensity } = cubeFieldToMrc(grid, grid.fields[0].values);
        expect(padding).toEqual([0, 0, 0]);
        expect(clipsSignificantDensity).toBe(false);
    });

    it("pads when the density reaches past the inscribed sphere", () => {
        // Spread the same blob out until it fills the corners. The box is unchanged, so the only
        // way to keep it all inside the sphere is to grow the cell.
        const grid = parseCubeFile(blob(2.2));
        const { padding, safeRadius } = cubeFieldToMrc(grid, grid.fields[0].values);
        expect(padding.some(p => p > 0)).toBe(true);
        expect(safeRadius).toBeGreaterThan(40 * 0.25 / 2);
    });

    it("keeps the data centred when it pads, so the map does not move", () => {
        // Padding is symmetric and the origin moves back to match. Getting this wrong would shift
        // the orbital off its molecule - the one error that looks like a plausible map.
        const grid = parseCubeFile(blob(2.2));
        const unpadded = cubeFieldToMrc(grid, grid.fields[0].values, { padding: [0, 0, 0] });
        const padded = cubeFieldToMrc(grid, grid.fields[0].values);
        padded.centre.forEach((coord, axis) => {
            expect(coord).toBeCloseTo(unpadded.centre[axis], 5);
        });
    });

    it("writes the padding as zeros, leaving the field's own extremes alone", () => {
        const grid = parseCubeFile(blob(2.2));
        const padded = cubeFieldToMrc(grid, grid.fields[0].values);
        expect(padded.padding.some(p => p > 0)).toBe(true);
        // The blob never quite reaches 1: with an even count its peak falls between voxels.
        expect(padded.statistics.min).toBeCloseTo(0, 6);
        expect(padded.statistics.max).toBeCloseTo(
            cubeFieldToMrc(grid, grid.fields[0].values, { padding: [0, 0, 0] }).statistics.max, 6);
    });
});
