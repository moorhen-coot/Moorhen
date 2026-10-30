/**
 * Getting MetaBalls points out of Coot's sphere data, and the GPU mesh back into the shape
 * Moorhen's representation code expects.
 *
 * Both ends copy existing code exactly, so that the GPU path is a drop-in for DrawMoorhenMetaBalls:
 *
 *  - in: DrawMoorhenMetaBalls asks for the "VDW-BALLS" instanced spheres and gives each one a
 *    radius of radius * size / 1.7 (GenerateMoorhenMetaBallsCootInstancedMesh). The worker's
 *    "instanced_mesh_perfect_spheres" conversion carries the same spheres to JS.
 *  - out: the worker's "PickableMeshPerm" conversion reverses the normals and swaps the second
 *    and third index of every triangle (simpleMeshToMeshData with perm), and adds pick_info.
 */
import type { MetaBallsInput, MetaBallsMesh } from "./gpuMetaBalls";
import { metaballRadius } from "./metaballsGrid";

/**
 * The arguments DrawMoorhenMetaBalls passes to get_bonds_mesh_for_selection_instanced, after
 * imol and cid: mode, dark background, bond width, atom/bond ratio, aniso, ortep, aniso as empty,
 * hydrogens, smoothness.
 */
export const METABALLS_SPHERE_ARGS = ["VDW-BALLS", false, 0.1, 1.0, false, false, false, true, 1] as const;

/** The subset of the worker's instanced-mesh result that the spheres arrive in. */
export interface InstancedSpheresData {
    instance_origins?: ArrayLike<number>[][];
    instance_sizes?: ArrayLike<number>[][];
    col_tri?: ArrayLike<number>[][];
}

/**
 * MetaBalls points from the worker's VDW-BALLS spheres, in the order DrawMoorhenMetaBalls
 * visits them (geometry by geometry, instance by instance), which is the order its pick points
 * and influence indices refer to.
 */
export function metaballsInputFromSpheres(data: InstancedSpheresData, radius: number): { input: MetaBallsInput; pickPoints: number[][] } {
    const origins = data.instance_origins?.[0] ?? [];
    const sizes = data.instance_sizes?.[0] ?? [];
    const colours = data.col_tri?.[0] ?? [];
    let count = 0;
    origins.forEach(o => { count += Math.floor((o?.length ?? 0) / 3); });
    const points = new Float32Array(count * 4);
    const pointColours = new Float32Array(count * 4);
    const pickPoints: number[][] = [];
    let k = 0;
    origins.forEach((o, g) => {
        const n = Math.floor((o?.length ?? 0) / 3);
        for (let i = 0; i < n; i++, k++) {
            points[4 * k] = o[3 * i];
            points[4 * k + 1] = o[3 * i + 1];
            points[4 * k + 2] = o[3 * i + 2];
            points[4 * k + 3] = metaballRadius(radius, sizes[g]?.[3 * i] ?? 1.7);
            const c = colours[g];
            for (let j = 0; j < 4; j++) pointColours[4 * k + j] = c?.[4 * i + j] ?? 1;
            pickPoints.push([points[4 * k], points[4 * k + 1], points[4 * k + 2]]);
        }
    });
    return { input: { points, colours: pointColours }, pickPoints };
}

/** What getMetaBallBuffers returns for one mesh: mesh data plus pick_info, as from the worker. */
export interface MetaBallsMeshData {
    prim_types: string[][];
    idx_tri: Uint32Array[][];
    vert_tri: Float32Array[][];
    norm_tri: Float32Array[][];
    col_tri: Float32Array[][];
    pick_info: {
        influence_weights: Float32Array;
        influence_index_offsets: Uint32Array;
        influence_point_indexes: Uint32Array;
        pick_points: number[][];
    };
}

/**
 * The GPU mesh as the worker would have handed it over for "PickableMeshPerm".
 *
 * A mesh made with `pickable` already has the reversed normals and winding, and its arrays are
 * used as they are; otherwise they are converted here. An empty mesh is passed through empty, as
 * the C++ leaves coot_mesh empty when there is nothing to draw.
 */
export function metaballsMeshData(mesh: MetaBallsMesh, pickPoints: number[][]): MetaBallsMeshData {
    const pick_info = {
        influence_weights: mesh.influenceWeights,
        influence_index_offsets: mesh.influenceEnds,
        influence_point_indexes: mesh.influencePoints,
        pick_points: pickPoints,
    };
    if (mesh.pickable) {
        return {
            prim_types: [["TRIANGLES"]], idx_tri: [[mesh.indices]], vert_tri: [[mesh.positions]],
            norm_tri: [[mesh.normals]], col_tri: [[mesh.colours]], pick_info,
        };
    }
    const normals = new Float32Array(mesh.normals.length);
    for (let i = 0; i < normals.length; i++) normals[i] = -mesh.normals[i];
    const indices = new Uint32Array(mesh.indices.length);
    for (let t = 0; t + 2 < indices.length; t += 3) {
        indices[t] = mesh.indices[t];
        indices[t + 1] = mesh.indices[t + 2];
        indices[t + 2] = mesh.indices[t + 1];
    }
    return {
        prim_types: [["TRIANGLES"]],
        idx_tri: [[indices]],
        vert_tri: [[mesh.positions]],
        norm_tri: [[normals]],
        col_tri: [[mesh.colours]],
        pick_info,
    };
}
