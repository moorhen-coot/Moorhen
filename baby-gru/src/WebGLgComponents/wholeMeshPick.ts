/**
 * Making a plain mesh hoverable and centre-able as a single object.
 *
 * Some things Coot sends are one thing rather than an assembly of parts - a cavity, say. There
 * is nothing to divide them into and no atom behind any particular vertex, so the useful
 * question is not "which piece is under the cursor" but "am I over this at all, and where is
 * its middle". That needs no help from libcoot: the geometry is already here.
 *
 * Two things are recorded, and deliberately nothing else:
 *
 *  - The centroid, as pick point zero, with every pick point claiming instance zero.
 *    pickedMeshPosition looks up the first pick point of the instance it was given, so centring
 *    lands on the middle of the mesh from wherever on it you clicked, with no change to the
 *    pick code.
 *  - The bounding box, so the exact ray test can reject this mesh in a few comparisons on the
 *    overwhelming majority of hovers.
 *
 * This used to sample the surface for pick points and derive a tolerance from how far apart
 * the samples fell. That is gone. Whether the pointer is over the mesh is now decided by
 * intersecting the ray with the actual triangles - see rayMesh.ts - which is exact, needs no
 * tolerance, and cannot be tuned into being wrong. The sampled version got the answer
 * noticeably wrong far more often than anything else in the renderer, because every other
 * pickable thing has something better than isolated points to measure against.
 */

import type { Bounds } from "./rayMesh";

export type WholeMeshPickInfo = {
    pick_points: number[][];
    pick_point_instances: number[];
    pick_bounds: Bounds;
    pick_exact: boolean;
    highlight_whole: boolean;
};

/**
 * Pick information for a mesh that is to be treated as one whole object.
 *
 * `vertices` is the flat x,y,z list as it arrives from Coot. Returns null for a mesh with no
 * vertices, so a caller can attach the result unconditionally and an empty mesh simply stays
 * unpickable rather than producing a pick point at the origin.
 */
export const wholeMeshPickInfo = (
    vertices: number[] | Float32Array
): WholeMeshPickInfo | null => {
    const count = Math.floor(vertices.length / 3);
    if (count === 0) return null;

    const total = [0, 0, 0];
    const low: [number, number, number] = [Infinity, Infinity, Infinity];
    const high: [number, number, number] = [-Infinity, -Infinity, -Infinity];
    for (let v = 0; v < count; v++) {
        for (let c = 0; c < 3; c++) {
            const value = vertices[3 * v + c];
            total[c] += value;
            if (value < low[c]) low[c] = value;
            if (value > high[c]) high[c] = value;
        }
    }

    return {
        // One point, and it is the centre: the exact test decides whether the pointer is over
        // the mesh, so there is nothing for surface samples to do any more.
        pick_points: [total.map(sum => sum / count)],
        // One instance, which is what makes centring find the centroid.
        pick_point_instances: [0],
        pick_bounds: { low, high },
        // Ask the pick test for an intersection rather than a nearest-point measurement.
        pick_exact: true,
        highlight_whole: true,
    };
};
