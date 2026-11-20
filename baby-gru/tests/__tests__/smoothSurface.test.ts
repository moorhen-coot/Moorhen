import { newOwnerNumbering, ownedMeshPickInfo } from "../../src/WebGLgComponents/ownedMeshPick";
import {
    atomSurfaceColours, atomSurfaceInfluences, atomSurfaceMesh, mergeAtomSurfaces, nearestVertices, residueCid, smoothVertexColours,
    vertexNeighbours,
} from "../../src/utils/smoothSurface";

/**
 * What the main thread does with a smooth surface: owner names, colours from atom colours, the hover's
 * shares, colour smoothing, chains joined, nearest vertices (electrostatics colours). The surface
 * itself is the C++'s, tested natively: smoothSurfaceCpp.test.ts.
 */
describe("smoothSurface", () => {
    test("residue owners are named as M2T names them", () => {
        expect(residueCid("1", "A", "23", "ALA")).toBe("/1/A/23(ALA)");
        expect(residueCid("1", "B", "23A", "GLY")).toBe("/1/B/23(GLY).A");
        expect(residueCid("2", "C", "-4", "SER")).toBe("/2/C/-4(SER)");
    });

    test("vertex colours from atom colours, hard or blended by distance, and owners by residue", () => {
        // Vertex 0: atom 0 only. Vertex 1: atoms 0 and 1 equally near. Vertex 2: atom 1 one width further.
        const vertex = {
            atom: Int32Array.from([0, 0, 0]), other: Int32Array.from([-1, 1, 1]), weight: Float32Array.from([1, 0.75, 0.6]),
            near: Int32Array.from([0, -1, -1, -1, 0, 1, -1, -1, 0, 1, -1, -1]),
            nearGap: Float32Array.from([0, 0, 0, 0, 0.2, 0.2, 0, 0, 0, 0.5, 0, 0]),
        };
        const atomColours = [1, 0, 0, 1, 0, 0, 1, 1];
        // Hard edge: the nearest atom's.
        expect(Array.from(atomSurfaceColours(vertex, atomColours, 0))).toEqual([1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1]);
        const soft = atomSurfaceColours(vertex, atomColours, 0.5);
        expect(Array.from(soft.slice(0, 4))).toEqual([1, 0, 0, 1]);
        expect(soft[4]).toBeCloseTo(0.5, 6);
        expect(soft[6]).toBeCloseTo(0.5, 6);
        // One width further, half way to the reach of 2 widths: weight (1 - 1/2)² = 1/4 against 1.
        expect(soft[10]).toBeCloseTo(0.25 / 1.25, 6);
        const mesh = atomSurfaceMesh({
            positions: new Float32Array(9), normals: new Float32Array(9), indices: new Uint32Array(0), ...vertex,
        }, [3, 7], ["/1/A/1(ALA)", "", "", "/1/A/4(GLY)", "", "", "", "/1/B/2(SER)"], atomColours, 0);
        expect(Array.from(mesh.vertex_owners)).toEqual([3, 3, 3]);
        expect(Array.from(mesh.vertex_owners_other)).toEqual([0xFFFFFFFF, 7, 7]);
        expect(Array.from(mesh.vertex_owner_weights)).toEqual([1, 0.75, Math.fround(0.6)]);
    });

    test("the hover shares a vertex as its colour does, residue by residue", () => {
        // Vertex 0: two atoms of residue 5 as near as each other, one of residue 2 one width further.
        // Vertex 1: one atom only.
        const vertex = {
            atom: Int32Array.from([0, 1]), other: Int32Array.from([-1, -1]), weight: Float32Array.from([1, 1]),
            near: Int32Array.from([0, 1, 2, -1, 1, -1, -1, -1]),
            nearGap: Float32Array.from([0.1, 0.1, 0.6, 0, 0, 0, 0, 0]),
        };
        const residueOf = [5, 5, 2];
        const soft = atomSurfaceInfluences(vertex, residueOf, 0.5);
        // Half way to the reach: (1 - 1/2)² = 1/4.
        const total = 2.25;
        expect(Array.from(soft.owners.slice(0, 4))).toEqual([5, 2, 0xFFFFFFFF, 0xFFFFFFFF]);
        expect(soft.weights[0]).toBeCloseTo(2 / total, 6);
        expect(soft.weights[1]).toBeCloseTo(0.25 / total, 6);
        expect(Array.from(soft.owners.slice(4, 8))).toEqual([5, 0xFFFFFFFF, 0xFFFFFFFF, 0xFFFFFFFF]);
        expect(soft.weights[4]).toBe(1);
        // A hard edge: the nearest atom's residue, all of it.
        const hard = atomSurfaceInfluences(vertex, residueOf, 0);
        expect(Array.from(hard.owners.slice(0, 4))).toEqual([5, 0xFFFFFFFF, 0xFFFFFFFF, 0xFFFFFFFF]);
        expect(hard.weights[0]).toBe(1);
        // And the pick info lists exactly those shares for the shader.
        const owners = ["/1/A/0(A)", "/1/A/1(A)", "/1/A/2(GLY)", "/1/A/3(A)", "/1/A/4(A)", "/1/A/5(ALA)"];
        const info = ownedMeshPickInfo([0, 0, 0, 1, 0, 0], [5, 5], owners, undefined, undefined, newOwnerNumbering(),
                                       { stride: 4, ...soft })!;
        expect(Array.from(info.influence_index_offsets)).toEqual([2, 3]);
        expect(info.influence_weights[0]).toBeCloseTo(2 / total, 6);
        expect(info.influence_point_indexes[0]).toBe(info.owner_codes[5]);
        expect(info.influence_point_indexes[1]).toBe(info.owner_codes[2]);
        expect(info.shared_vertices).toBe(1);
    });

    test("colour smoothing averages speckle away and leaves a uniform area alone", () => {
        // A fan of four triangles round vertex 0; vertex 0 red, the rest blue.
        const indices = Uint32Array.from([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1]);
        const colours = new Float32Array(20);
        for (let v = 0; v < 5; v++) colours.set(v === 0 ? [1, 0, 0, 1] : [0, 0, 1, 1], 4 * v);
        const neighbours = vertexNeighbours(indices, 5);
        const once = smoothVertexColours(colours, neighbours, 1);
        // Vertex 0: itself and its four neighbours, each listed twice: 1 red in 9.
        expect(once[0]).toBeCloseTo(1 / 9, 6);
        expect(once[3]).toBeCloseTo(1, 6);
        expect(Array.from(colours.slice(0, 4))).toEqual([1, 0, 0, 1]);
        const uniform = new Float32Array(20).fill(0.5);
        expect(Array.from(smoothVertexColours(uniform, neighbours, 3)).every(c => Math.abs(c - 0.5) < 1e-7)).toBe(true);
    });

    test("surfaces of separate chains join into one, atom indices into the whole list's", () => {
        // Two one-triangle parts; part 2's atoms 0 and 1 are atoms 5 and 7 of the whole.
        const part = (atom: number[], near: number[]) => ({
            positions: new Float32Array(9), normals: new Float32Array(9), indices: Uint32Array.from([0, 1, 2]),
            atom: Int32Array.from(atom), other: Int32Array.from([-1, 1, -1]), weight: Float32Array.from([1, 0.7, 1]),
            near: Int32Array.from(near), nearGap: new Float32Array(12),
        });
        const merged = mergeAtomSurfaces([
            { surface: part([0, 1, 0], [0, 1, -1, -1, 1, 0, -1, -1, 0, -1, -1, -1]), atomIndex: [2, 3] },
            { surface: part([1, 0, 1], [1, -1, -1, -1, 0, 1, -1, -1, 1, 0, -1, -1]), atomIndex: [5, 7] },
        ]);
        expect(Array.from(merged.indices)).toEqual([0, 1, 2, 3, 4, 5]);
        expect(Array.from(merged.atom)).toEqual([2, 3, 2, 7, 5, 7]);
        expect(Array.from(merged.other)).toEqual([-1, 3, -1, -1, 7, -1]);
        expect(Array.from(merged.near.slice(12, 16))).toEqual([7, -1, -1, -1]);
        expect(merged.positions.length).toBe(18);
    });

    test("nearestVertices finds the nearest source vertex", () => {
        const source = new Float32Array([0, 0, 0, 10, 0, 0, 0, 7, 0]);
        const queries = new Float32Array([1, 0, 0, 9, 1, 0, 0, 5, 0, 30, 30, 30]);
        expect(Array.from(nearestVertices(queries, source))).toEqual([0, 1, 2, 1]);
    });
});
