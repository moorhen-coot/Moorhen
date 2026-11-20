import { newOwnerNumbering, ownedMeshPickInfo, ownedMeshPickInfoSliced } from "../../src/WebGLgComponents/ownedMeshPick";
import {
    COLOUR_ATOMS, atomSurfaceColours, atomSurfaceInfluences, atomSurfaceMesh, atomSurfaceMeshSliced, blendWeights, mergeAtomSurfaces,
    nearestVertices, residueCid, smoothVertexColours, vertexNeighbours,
} from "../../src/utils/smoothSurface";
import { runSliced } from "../../src/utils/timeSlicing";

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

    test("in slices, a large surface comes out exactly as the plain per-vertex arithmetic makes it", async () => {
        // A strip of 100k vertices (past one slice, SLICE_ITEMS), with 0 to 4 near atoms a vertex, a
        // degenerate triangle in every hundred, and some vertices with another residue's atom.
        const n = 100_000, atoms = 997;
        let seed = 1;
        const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        const near = new Int32Array(COLOUR_ATOMS * n).fill(-1), nearGap = new Float32Array(COLOUR_ATOMS * n);
        const atom = new Int32Array(n), other = new Int32Array(n).fill(-1), weight = new Float32Array(n).fill(1);
        for (let v = 0; v < n; v++) {
            const count = v % 5;
            atom[v] = count > 0 ? Math.floor(random() * atoms) : -1;
            for (let k = 0; k < count; k++) {
                near[COLOUR_ATOMS * v + k] = k === 0 ? atom[v] : Math.floor(random() * atoms);
                nearGap[COLOUR_ATOMS * v + k] = k * random();
            }
            if (count > 1 && v % 3 === 0) { other[v] = near[COLOUR_ATOMS * v + 1]; weight[v] = 0.6; }
        }
        const triangles: number[] = [];
        for (let v = 0; v + 2 < n; v++) triangles.push(v, v + 1, v % 100 === 0 ? v + 1 : v + 2);
        const indices = Uint32Array.from(triangles);
        const positions = Float32Array.from({ length: 3 * n }, () => random() * 50);
        const surface = { positions, normals: new Float32Array(3 * n), indices, atom, other, weight, near, nearGap };
        const residueOf = Int32Array.from({ length: atoms }, (_, i) => Math.floor(i / 9));
        const residues = Array.from({ length: Math.ceil(atoms / 9) }, (_, r) => `/1/${"ABC"[r % 3]}/${r}(ALA)`);
        const atomColours = Float32Array.from({ length: 4 * atoms }, () => random());

        // The reference: blendWeights a vertex at a time, and smoothing through a table of neighbours.
        const width = 0.4, w = new Float64Array(COLOUR_ATOMS);
        const expected = new Float32Array(4 * n).fill(1);
        for (let v = 0; v < n; v++) {
            if (near[COLOUR_ATOMS * v] < 0) continue;
            blendWeights(surface, v, width, w);
            for (let c = 0; c < 4; c++) {
                let sum = 0;
                for (let k = 0; k < COLOUR_ATOMS && w[k] > 0; k++) sum += w[k] * atomColours[4 * near[COLOUR_ATOMS * v + k] + c];
                expected[4 * v + c] = sum;
            }
        }
        const lists: number[][] = Array.from({ length: n }, () => []);
        for (let t = 0; t < indices.length; t += 3) {
            const [a, b, c] = [indices[t], indices[t + 1], indices[t + 2]];
            lists[a].push(b, c); lists[b].push(c, a); lists[c].push(a, b);
        }
        let from = expected;
        for (let pass = 0; pass < 2; pass++) {
            const to = new Float32Array(4 * n);
            for (let v = 0; v < n; v++) {
                for (let c = 0; c < 4; c++) {
                    let sum = from[4 * v + c];
                    for (const u of lists[v]) sum += from[4 * u + c];
                    to[4 * v + c] = sum * (1 / (1 + lists[v].length));
                }
            }
            from = to;
        }

        const mesh = await runSliced(atomSurfaceMeshSliced(surface, residueOf, residues, atomColours, width, 2), 0);
        expect(Buffer.from(mesh.col_tri[0][0].buffer).equals(Buffer.from(from.buffer))).toBe(true);
        const plain = atomSurfaceMesh(surface, residueOf, residues, atomColours, width, 2);
        expect(Buffer.from(mesh.vertex_influence_weights.buffer).equals(Buffer.from(plain.vertex_influence_weights.buffer))).toBe(true);
        const shares = atomSurfaceInfluences(surface, residueOf, width);
        expect(Array.from(mesh.vertex_influence_owners)).toEqual(Array.from(shares.owners));

        const influences = { stride: COLOUR_ATOMS, owners: mesh.vertex_influence_owners, weights: mesh.vertex_influence_weights };
        const sliced = await runSliced(ownedMeshPickInfoSliced(positions, mesh.vertex_owners, mesh.owners, mesh.vertex_owners_other,
            mesh.vertex_owner_weights, newOwnerNumbering(), influences), 0);
        const once = ownedMeshPickInfo(positions, mesh.vertex_owners, mesh.owners, mesh.vertex_owners_other,
            mesh.vertex_owner_weights, newOwnerNumbering(), influences);
        expect(sliced).toEqual(once);
        // The lists themselves, a vertex at a time.
        let listed = 0;
        for (let v = 0; v < n; v++) {
            if (once!.vertex_pick_points[v] !== 0xFFFFFFFF) {
                for (let k = 0; k < COLOUR_ATOMS; k++) {
                    const o = influences.owners[COLOUR_ATOMS * v + k], share = influences.weights[COLOUR_ATOMS * v + k];
                    if (o >= once!.owner_codes.length || share <= 0) continue;
                    expect(once!.influence_point_indexes[listed]).toBe(once!.owner_codes[o]);
                    expect(once!.influence_weights[listed]).toBe(share);
                    listed++;
                }
            }
            expect(once!.influence_index_offsets[v]).toBe(listed);
        }
        expect(once!.influence_point_indexes.length).toBe(listed);
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
