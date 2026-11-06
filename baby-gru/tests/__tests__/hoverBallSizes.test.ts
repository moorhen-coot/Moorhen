/**
 * The golden hover balls' sizes (hoverBallSizes.ts): each as big as the sphere drawn at its atom.
 */
import { describe, expect, it } from "@jest/globals";
import { HOVER_BALL_MARGIN, HOVER_BALL_SIZE, hoverBallSizes } from "../../src/WebGLgComponents/hoverBallSizes";

const spheres = (centres: number[][], radii: number[], over: Record<string, unknown> = {}) => ({
    bufferTypes: ["PERFECT_SPHERES"],
    triangleInstanceOrigins: [new Float32Array(centres.flat())],
    triangleInstanceSizes: [new Float32Array(radii.flatMap(r => [r, r, r]))],
    visible: true,
    ...over,
});

const radii = (sizes: Float32Array) => Array.from(sizes.filter((_, n) => n % 3 === 0));

describe("hover ball sizes", () => {
    const C = [0, 0, 0], H = [1.09, 0, 0], Mg = [5, 5, 5], O = [6, 5, 5];

    it("gives each atom its own sphere's size plus the margin (VdW: C and H differ)", () => {
        const vdw = spheres([H, C], [1.2, 1.7]);
        const sizes = radii(hoverBallSizes([...C, ...H], [vdw]));
        expect(sizes[0]).toBeCloseTo(1.7 + HOVER_BALL_MARGIN);
        expect(sizes[1]).toBeCloseTo(1.2 + HOVER_BALL_MARGIN);
    });

    it("finds a big ion among small bond-mode spheres", () => {
        const bonds = spheres([O, Mg], [0.2, 0.9]);
        expect(radii(hoverBallSizes(Mg, [bonds]))[0]).toBeCloseTo(0.9 + HOVER_BALL_MARGIN);
        expect(radii(hoverBallSizes(O, [bonds]))[0]).toBeCloseTo(HOVER_BALL_SIZE);
    });

    it("finds bonds-mode atoms drawn as instanced triangle spheres, but not the bonds that start there", () => {
        const C2 = [1.5, 0, 0];
        const bonds = {
            bufferTypes: ["TRIANGLES", "TRIANGLES"],
            // Coot's "atoms": spheres, sizes equal. Then a bond cylinder from Mg: width, width, length.
            triangleInstanceOrigins: [new Float32Array([...O, ...Mg]), new Float32Array(Mg)],
            triangleInstanceSizes: [new Float32Array([0.45, 0.45, 0.45, 0.6, 0.6, 0.6]), new Float32Array([0.15, 0.15, 2.1])],
            visible: true,
        };
        expect(radii(hoverBallSizes(Mg, [bonds]))[0]).toBeCloseTo(0.6 + HOVER_BALL_MARGIN);
        const cylinderOnly = { ...bonds, bufferTypes: ["TRIANGLES"], triangleInstanceOrigins: [new Float32Array(C2)], triangleInstanceSizes: [new Float32Array([0.15, 0.15, 2.1])] };
        expect(radii(hoverBallSizes(C2, [cylinderOnly]))[0]).toBeCloseTo(HOVER_BALL_SIZE);
        // A plain triangle mesh, with no instances, is passed over.
        expect(radii(hoverBallSizes(Mg, [{ bufferTypes: ["TRIANGLES"], triangleInstanceOrigins: [], triangleInstanceSizes: [], visible: true }]))[0]).toBeCloseTo(HOVER_BALL_SIZE);
    });

    it("takes the biggest sphere at the atom, from visible, non-hover sphere buffers only", () => {
        const small = spheres([C], [0.5]);
        const big = spheres([C], [1.5]);
        expect(radii(hoverBallSizes(C, [small, big]))[0]).toBeCloseTo(1.5 + HOVER_BALL_MARGIN);
        expect(radii(hoverBallSizes(C, [small, { ...big, visible: false }]))[0]).toBeCloseTo(0.5 + HOVER_BALL_MARGIN);
        expect(radii(hoverBallSizes(C, [small, { ...big, isHoverBuffer: true }]))[0]).toBeCloseTo(0.5 + HOVER_BALL_MARGIN);
        expect(radii(hoverBallSizes(C, [{ ...big, bufferTypes: ["LINES"] }]))[0]).toBeCloseTo(HOVER_BALL_SIZE);
    });

    it("keeps the default where nothing is drawn at the atom, or the sphere there is stick-sized", () => {
        expect(Array.from(hoverBallSizes([...C, ...H], []))).toEqual(new Array(6).fill(Math.fround(HOVER_BALL_SIZE)));
        expect(radii(hoverBallSizes(C, [spheres([C], [0.27])]))[0]).toBeCloseTo(HOVER_BALL_SIZE);
        expect(radii(hoverBallSizes(C, [spheres([[0.01, 0, 0]], [1.7])]))[0]).toBeCloseTo(HOVER_BALL_SIZE);
        expect(hoverBallSizes([], [spheres([C], [1.7])]).length).toBe(0);
    });
});
