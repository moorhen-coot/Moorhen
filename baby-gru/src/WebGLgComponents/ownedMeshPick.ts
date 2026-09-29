/**
 * Pick information for a mesh whose vertices know which residue they came from.
 *
 * A molecular surface is built one atom at a time - a sphere patch per atom, a torus per pair -
 * and CXXSurface has always recorded the generating atom against every vertex. Coot now carries
 * that through to the mesh as a per-vertex owner index and a table of residue CIDs, so on this
 * side there is nothing to infer: which residue is under the pointer follows from which
 * triangle the ray hit, and a triangle's corners name their residue directly.
 *
 * That makes this the opposite of the cavity case. A cavity is one thing with no internal
 * structure, so the question is only whether you are over it. A surface has as many pickable
 * pieces as the molecule has residues, and they interleave: one residue's vertices are
 * scattered through the mesh wherever its atoms reach the air, so there is no contiguous range
 * of vertices to light and the section machinery the paths use does not apply.
 *
 * What does apply, unchanged, is the influence machinery written for metaballs. The vertex
 * shader already asks, per vertex, "how strongly does this vertex belong to the hovered point"
 * by walking a list of (point, weight) pairs held in textures, so all this has to do is fill
 * those lists.
 *
 * Most vertices have one entry with weight 1: a convex cap belongs to the atom whose sphere it
 * lies on and to nothing else. The vertices that matter have two. Where the probe rolls along
 * the groove between two atoms it sweeps a saddle that genuinely belongs to both, and those
 * grooves are exactly where one residue's territory gives way to the next - so the residue
 * boundary runs through the middle of a band of two-owner vertices rather than along its edge.
 *
 * That is what makes the highlight smooth. With one owner per vertex the field is 0 or 1 at
 * every vertex, so its contour can only run along mesh edges: the outline zigzags with the
 * tessellation, and sits on the far rim of the groove rather than in it. With the saddle
 * blended, the contour crosses each triangle at a fraction and the outline is a smooth curve
 * down the middle of the groove, where the boundary actually is.
 */

import type { Bounds } from "./rayMesh";
import { MOORHEN_SURFACE_RESIDUE_TAG_KIND } from "../utils/enums";

/** The per-vertex owner value meaning "no residue known", as Coot writes it. */
export const NO_OWNER = 0xFFFFFFFF;

export type OwnedMeshPickInfo = {
    /** One per owner: the middle of that residue's patch of surface, for centring on. */
    pick_points: number[][];
    pick_point_tags: string[];
    pick_tag_kind: string;
    /**
     * Which pick point each vertex belongs to, or NO_OWNER.
     *
     * Kept separately from the influence arrays even though the same fact is in both. The
     * influence encoding is a list indexed by offsets, and it is only because each vertex here
     * has exactly one owner that a vertex index happens to work as an index into it. Relying on
     * that coincidence in the pick loop would be a trap for whoever reads it next.
     */
    vertex_pick_points: Uint32Array;
    influence_index_offsets: Uint32Array;
    influence_point_indexes: Uint32Array;
    influence_weights: Float32Array;
    pick_bounds: Bounds;
    pick_exact: boolean;
    /** How many vertices are shared between two residues, as a diagnostic. */
    shared_vertices: number;
};

/**
 * What the ownership actually looks like on a real surface, for the console.
 *
 * Two questions worth answering from the data rather than from the picture. First, do the
 * blended weights span the range they should - a blend that only ever ran from 0.5 to 0.55
 * would look almost exactly like no blend at all. Second, and the reason this exists: how much
 * of the boundary is still hard?
 *
 * A boundary triangle is one whose corners name different residues. If any of its corners is
 * shared between two, the field varies across it and the contour can cross it smoothly. If all
 * three corners belong outright to their own residue, the field is 0 or 1 at each and the
 * contour is pinned to the edges - a visible facet. Counting those says exactly how much is
 * left to gain, without knowing anything about which patch type produced them.
 */
export const surfaceOwnerReport = (
    info: OwnedMeshPickInfo,
    vertices?: number[] | Float32Array
): string => {
    const count = info.vertex_pick_points.length;
    const shared = info.shared_vertices;

    // How lopsided each shared vertex is: the larger of its two shares, so the number runs
    // from 0.5 (the middle of a groove, evenly split) to 1 (at a contact point, where the
    // groove meets a cap). Per vertex rather than per contribution, because the two shares of
    // one vertex always sum to 1 and pooling them would say nothing but that.
    //
    // A blend that only ever reported 0.95 to 1 would be no blend worth having, and would
    // look like one in a screenshot.
    const buckets = new Array(10).fill(0);
    let min = Infinity, max = -Infinity, total = 0, n = 0;
    for (let v = 0; v < count; v++) {
        const begin = v === 0 ? 0 : info.influence_index_offsets[v - 1];
        const end = info.influence_index_offsets[v];
        if (end - begin < 2) continue;
        let dominant = 0;
        for (let i = begin; i < end; i++)
            if (info.influence_weights[i] > dominant) dominant = info.influence_weights[i];
        if (dominant < min) min = dominant;
        if (dominant > max) max = dominant;
        total += dominant; n++;
        buckets[Math.min(9, Math.floor(dominant * 10))]++;
    }

    let lines = `Surface owners: ${info.pick_points.length} residues, `
        + `${shared} of ${count} vertices shared between two `
        + `(${(100 * shared / Math.max(count, 1)).toFixed(1)}%)`;
    if (n > 0) {
        lines += `\n  dominant share: ${min.toFixed(3)} to ${max.toFixed(3)}, `
            + `mean ${(total / n).toFixed(3)} over ${n} shared vertices`
            + `\n  by tenth: ${buckets.map((b, i) => `${i / 10}-${(i + 1) / 10}:${b}`).join("  ")}`;
    }

    if (vertices) {
        // Where the hard edges are, given that the mesh is not welded.
        //
        // Counting triangles whose corners disagree finds nothing, and that is a fact about
        // the surface rather than a bug: each patch is uploaded as its own block of vertices
        // with its own triangles, and a torus element spans only half a saddle - from the
        // midline, where the two atoms share the vertex evenly, out to its own contact circle.
        // So no triangle ever joins two residues; they meet at seams between patches, where
        // the vertices are duplicated.
        //
        // A seam is smooth if the copies agree about who owns them, which is what makes the
        // halfway line between two atoms invisible. It is a hard edge if they disagree - and
        // that is what is left to fix, in the three sectors of a re-entrant patch, where each
        // sector claims its own atom outright and its neighbour's copy claims the next.
        // Gathered per position: the signatures the copies carry, and the union of the
        // residues they name. The union is the thing that decides how much room the data
        // model needs - a seam where three residues meet cannot be described by a vertex that
        // holds two of them, however the two are chosen.
        const atPosition = new Map<string, { copies: number; sigs: Set<string>; owners: Set<number> }>();
        for (let v = 0; v < count; v++) {
            const key = `${Math.round(vertices[3 * v] * 1000)},`
                      + `${Math.round(vertices[3 * v + 1] * 1000)},`
                      + `${Math.round(vertices[3 * v + 2] * 1000)}`;
            const begin = v === 0 ? 0 : info.influence_index_offsets[v - 1];
            const end = info.influence_index_offsets[v];
            const pairs: string[] = [];
            let group = atPosition.get(key);
            if (!group) { group = { copies: 0, sigs: new Set(), owners: new Set() }; atPosition.set(key, group); }
            group.copies++;
            for (let i = begin; i < end; i++) {
                pairs.push(`${info.influence_point_indexes[i]}:${info.influence_weights[i].toFixed(2)}`);
                group.owners.add(info.influence_point_indexes[i]);
            }
            group.sigs.add(pairs.sort().join("|"));
        }

        let seams = 0, mismatched = 0, differentOwners = 0, threeOrMore = 0;
        for (const group of atPosition.values()) {
            if (group.copies < 2) continue;      // not a seam: only one patch reaches here
            seams++;
            if (group.sigs.size > 1) {
                mismatched++;
                // Do the copies name different residues, or only split the same pair
                // differently? The first is a real discontinuity; the second can be nothing
                // more than the two patches rounding theta differently at their shared edge.
                const namesPerSig = new Set<string>();
                for (const s of group.sigs)
                    namesPerSig.add(s.split("|").map(p => p.split(":")[0]).sort().join(","));
                if (namesPerSig.size > 1) differentOwners++;
                if (group.owners.size > 2) threeOrMore++;
            }
        }
        lines += `\n  seams: ${seams} duplicated positions, ${mismatched} where the copies `
            + `disagree (${(100 * mismatched / Math.max(seams, 1)).toFixed(1)}% hard edges)`
            + `\n  of those: ${differentOwners} name different residues, `
            + `${mismatched - differentOwners} only split the same pair differently`
            + `\n  ${threeOrMore} seams have three or more residues meeting `
            + `(these cannot fit a two-owner vertex)`;
    }
    return lines;
};

/**
 * Build it from what Coot sent.
 *
 * `vertices` is the flat x,y,z list, `vertexOwners` one entry per vertex, `owners` the residue
 * CIDs those entries index. Returns null if the mesh has no vertices or the arrays do not
 * agree, so a caller can attach the result unconditionally and a mesh Coot knew nothing about
 * simply stays as it was.
 */
export const ownedMeshPickInfo = (
    vertices: number[] | Float32Array,
    vertexOwners: Uint32Array | number[] | undefined,
    owners: string[] | undefined,
    vertexOwnersOther?: Uint32Array | number[],
    vertexOwnerWeights?: Float32Array | number[]
): OwnedMeshPickInfo | null => {
    const count = Math.floor(vertices.length / 3);
    if (count === 0) return null;
    if (!vertexOwners || !owners || owners.length === 0) return null;
    if (vertexOwners.length !== count) return null;

    const low: [number, number, number] = [Infinity, Infinity, Infinity];
    const high: [number, number, number] = [-Infinity, -Infinity, -Infinity];
    const meshTotal = [0, 0, 0];

    // Sums and counts per owner, to be turned into centroids below.
    const totals = new Float64Array(owners.length * 3);
    const counts = new Uint32Array(owners.length);

    const vertex_pick_points = new Uint32Array(count);
    // A vertex contributes one (point, weight) pair per residue it belongs to - two in the
    // grooves, one on the caps, none where Coot could not place it. The offsets express all
    // three by how far they advance.
    const influence_index_offsets = new Uint32Array(count);
    const pointIndexes: number[] = [];
    const weights: number[] = [];
    const hasSecond = !!vertexOwnersOther && !!vertexOwnerWeights
        && vertexOwnersOther.length === count && vertexOwnerWeights.length === count;
    let shared_vertices = 0;

    let running = 0;
    for (let v = 0; v < count; v++) {
        for (let c = 0; c < 3; c++) {
            const value = vertices[3 * v + c];
            meshTotal[c] += value;
            if (value < low[c]) low[c] = value;
            if (value > high[c]) high[c] = value;
        }

        const owner = vertexOwners[v];
        if (owner < owners.length) {
            // The dominant owner, which Coot has already put first. This is the one the pick
            // reports, so a click in a groove picks the residue most of the vertex belongs to.
            vertex_pick_points[v] = owner;
            counts[owner]++;
            totals[3 * owner] += vertices[3 * v];
            totals[3 * owner + 1] += vertices[3 * v + 1];
            totals[3 * owner + 2] += vertices[3 * v + 2];

            const other = hasSecond ? vertexOwnersOther[v] : NO_OWNER;
            const weight = hasSecond ? vertexOwnerWeights[v] : 1.0;
            if (other < owners.length && other !== owner) {
                pointIndexes.push(owner); weights.push(weight);
                pointIndexes.push(other); weights.push(1.0 - weight);
                running += 2;
                shared_vertices++;
            } else {
                pointIndexes.push(owner); weights.push(1.0);
                running++;
            }
        } else {
            // Either Coot's no-owner sentinel or an index past the table. Both mean the same
            // thing here, and both must still occupy a slot so vertex ids keep lining up.
            vertex_pick_points[v] = NO_OWNER;
        }
        influence_index_offsets[v] = running;
    }

    const meshCentre = meshTotal.map(sum => sum / count);
    const pick_points: number[][] = [];
    for (let o = 0; o < owners.length; o++) {
        if (counts[o] === 0) {
            // Unreachable by hovering, since an owner only becomes hovered by way of one of its
            // vertices. It still needs an entry to keep the indices aligned with the tags.
            pick_points.push(meshCentre.slice());
        } else {
            pick_points.push([totals[3 * o] / counts[o],
                              totals[3 * o + 1] / counts[o],
                              totals[3 * o + 2] / counts[o]]);
        }
    }

    const influence_point_indexes = new Uint32Array(pointIndexes);
    const influence_weights = new Float32Array(weights);

    return {
        pick_points,
        pick_point_tags: owners.slice(),
        pick_tag_kind: MOORHEN_SURFACE_RESIDUE_TAG_KIND,
        vertex_pick_points,
        influence_index_offsets,
        influence_point_indexes,
        influence_weights,
        pick_bounds: { low, high },
        // Whether the pointer is over the surface is an intersection with its triangles, as it
        // is for a cavity. Nothing here is measured against a tolerance.
        pick_exact: true,
        shared_vertices,
    };
};
