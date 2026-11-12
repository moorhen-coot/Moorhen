/**
 * Whether Coot will actually give a converted cube its two lobes.
 *
 * This is the one claim about cubes that cannot be checked by reading the buffer back, because it
 * is not about the format - it is about a rule inside Coot. Coot calls a map an EM map when its
 * spacegroup is 0 or 1 and all three cell angles are 90, and it refuses to let an EM map be a
 * difference map: `read_ccp4_map` accepts the flag and discards it. A difference map is how an
 * orbital gets a positive and a negative surface in one object, so without this an orbital draws
 * half of itself and looks merely lopsided.
 *
 * cubeFieldToMrc steps around it by moving one cell angle a thousandth of a degree, which is a
 * deliberate untruth in the header and the sort of thing that stops being true when the library
 * underneath changes. So it is asserted against the real Coot, not against a description of it.
 */
import { beforeAll, describe, expect, it } from "@jest/globals";
import { parseCubeFile } from "../../src/utils/cubeFile";
import { cubeFieldToMrc } from "../../src/utils/cubeToMap";

const createCootModule = require("../../public/MoorhenAssets/wasm/moorhen");

jest.setTimeout(120000);

let cootModule: any;
let moleculesContainer: any;
let loaded = 0;

beforeAll(async () => {
    cootModule = await createCootModule({ print: () => {}, printErr: () => {} });
    cootModule.FS.mkdir("COOT_BACKUP");
    moleculesContainer = new cootModule.molecules_container_js(false);
});

/**
 * A cube with one positive lobe at +x and its mirror image, negative, at -x.
 *
 * Antisymmetric on purpose: the two lobes are the same size and the same distance out, so if only
 * one surface comes back there is no reading of the data that explains it.
 */
const antisymmetricCube = (() => {
    const n = 24, step = 0.25, half = (n - 1) / 2;
    const values: number[] = [];
    for (let x = 0; x < n; x++)
        for (let y = 0; y < n; y++)
            for (let z = 0; z < n; z++) {
                const [dx, dy, dz] = [(x - half) * step, (y - half) * step, (z - half) * step];
                const lobe = (centre: number) =>
                    Math.exp(-(((dx - centre) ** 2 + dy * dy + dz * dz) / 0.5));
                values.push(lobe(1) - lobe(-1));
            }
    return [
        "antisymmetric",
        "Isocontour range for 85% of the density: (0.3,-0.3)",
        "    1   -3.0  -3.0  -3.0",
        `   -${n}   ${step}  0.0  0.0`,
        `   -${n}   0.0  ${step}  0.0`,
        `   -${n}   0.0  0.0  ${step}`,
        "    8   0.0   0.0  0.0  0.0",
        ...values.map(v => ` ${v.toExponential(6)}`),
        "",
    ].join("\n");
})();

/** Load a buffer into Coot as a difference map and describe the mesh it contours. */
const contour = (buffer: ArrayBuffer, centre: number[], radius: number, level: number) => {
    const file = `cube-diff-${loaded++}.map`;
    cootModule.FS_createDataFile(".", file, new Uint8Array(buffer), true, true);
    const molNo = moleculesContainer.read_ccp4_map(`./${file}`, true);
    const mesh = moleculesContainer.get_map_contours_mesh(
        molNo, centre[0], centre[1], centre[2], radius, level);
    const vertices = mesh.vertices;

    // Moorhen splits the two lobes by the red channel Coot puts on each vertex: setupContourBuffers
    // treats red < 0.5 as the positive surface. Read the same way here, so this tests what the
    // renderer will actually see rather than what the mesh merely contains.
    let positive = 0, negative = 0, negativeMinX = Infinity, positiveMaxX = -Infinity;
    for (let i = 0; i < vertices.size(); i++) {
        const vertex = vertices.get(i);
        if (vertex.color[0] < 0.5) {
            positive++;
            if (vertex.pos[0] > positiveMaxX) positiveMaxX = vertex.pos[0];
        } else {
            negative++;
            if (vertex.pos[0] < negativeMinX) negativeMinX = vertex.pos[0];
        }
    }
    return {
        isDifference: moleculesContainer.is_a_difference_map(molNo),
        isEM: moleculesContainer.is_EM_map(molNo),
        positive, negative, negativeMinX, positiveMaxX,
    };
};

describe("a signed cube, loaded as a difference map", () => {
    it("comes back from Coot as a difference map, not an EM map", () => {
        const grid = parseCubeFile(antisymmetricCube);
        const written = cubeFieldToMrc(grid, grid.fields[0].values, { asDifferenceMap: true });
        const result = contour(
            written.buffer, written.centre, written.safeRadius, grid.suggestedLevel as number);
        expect(result.isEM).toBe(false);
        expect(result.isDifference).toBe(true);
    });

    it("draws both lobes, in both colours", () => {
        const grid = parseCubeFile(antisymmetricCube);
        const written = cubeFieldToMrc(grid, grid.fields[0].values, { asDifferenceMap: true });
        const result = contour(
            written.buffer, written.centre, written.safeRadius, grid.suggestedLevel as number);
        expect(result.positive).toBeGreaterThan(0);
        expect(result.negative).toBeGreaterThan(0);
        // The field is antisymmetric, so the two surfaces are the same size.
        expect(result.negative).toBe(result.positive);
    });

    it("puts the negative lobe where the negative values are", () => {
        // The failure this guards is the two surfaces being drawn but the colours swapped, which
        // would look entirely convincing and be the wrong way round.
        const grid = parseCubeFile(antisymmetricCube);
        const written = cubeFieldToMrc(grid, grid.fields[0].values, { asDifferenceMap: true });
        const result = contour(
            written.buffer, written.centre, written.safeRadius, grid.suggestedLevel as number);
        expect(result.positiveMaxX).toBeGreaterThan(0.5);
        expect(result.negativeMinX).toBeLessThan(-0.5);
    });

    it("draws only one lobe without the nudge, which is why the nudge is there", () => {
        // Not a requirement, a record of the rule being worked around: written honestly as P1 with
        // right angles, the very same field loses its negative surface entirely. If this ever
        // starts passing two surfaces, Coot has changed and the nudge can go.
        const grid = parseCubeFile(antisymmetricCube);
        const written = cubeFieldToMrc(grid, grid.fields[0].values, { asDifferenceMap: false });
        const result = contour(
            written.buffer, written.centre, written.safeRadius, grid.suggestedLevel as number);
        expect(result.isEM).toBe(true);
        expect(result.isDifference).toBe(false);
        expect(result.negative).toBe(0);
    });
});

describe("the nudge itself", () => {
    it("moves one angle and leaves the lengths alone", () => {
        const grid = parseCubeFile(antisymmetricCube);
        const plain = new DataView(
            cubeFieldToMrc(grid, grid.fields[0].values, { asDifferenceMap: false }).buffer);
        const nudged = new DataView(
            cubeFieldToMrc(grid, grid.fields[0].values, { asDifferenceMap: true }).buffer);
        for (const offset of [40, 44, 48]) {
            expect(nudged.getFloat32(offset, true)).toBe(plain.getFloat32(offset, true));
        }
        expect(plain.getFloat32(52, true)).toBeCloseTo(90, 5);
        expect(nudged.getFloat32(52, true)).toBeCloseTo(89.995, 5);
        expect(nudged.getFloat32(56, true)).toBeCloseTo(90, 5);
        expect(nudged.getFloat32(60, true)).toBeCloseTo(90, 5);
    });

    it("displaces the far corner by far less than a voxel", () => {
        // The cost of the lie, stated as a number. The cell here is 6 A and the voxel 0.25 A.
        const displacement = 6 * Math.sin((0.005 * Math.PI) / 180);
        expect(displacement).toBeLessThan(0.25 / 100);
    });

    it("leaves an already skewed cell alone", () => {
        // Such a cell is not orthogonal, so Coot never called it EM and there is nothing to avoid.
        const skewed = parseCubeFile(
            antisymmetricCube.replace("   -24   0.0  0.25  0.0", "   -24   0.1  0.25  0.0"));
        const view = new DataView(
            cubeFieldToMrc(skewed, skewed.fields[0].values, { asDifferenceMap: true }).buffer);
        // Gamma is the one the skew changed; alpha stays the true 90 rather than being nudged.
        expect(view.getFloat32(52, true)).toBeCloseTo(90, 4);
        expect(view.getFloat32(60, true)).toBeLessThan(89);
    });
});
