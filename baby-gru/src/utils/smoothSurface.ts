/**
 * Moorhen's smooth molecular surface, the main thread's part. The surface itself - the solvent-excluded
 * surface as a signed distance field, blurred with its shift capped, opened, contoured, split, and each
 * vertex given its nearest atoms - is made in the Coot worker by the C++ (wasm_src/smooth-surface.cc,
 * smoothSurfaceFromAtoms). Here: its settings, and what is done with it after - colours from the atoms'
 * colours (blended, smoothed), the hover's residue shares, surfaces of separate chains joined into one.
 * Colouring here rather than in the worker is what lets a colour-rule change recolour a surface without
 * rebuilding it.
 *
 * Roadmap: src/.roadmaps/smooth-surface.md.
 */

/**
 * The smooth surface's parameters (dev menu). Read when a surface is (re)built. Whether surfaces are
 * smooth at all is a user preference in the store: generalStates.useSmoothSurface.
 */
export const smoothSurfaceSetting = {
    /**
     * Grid spacing, Å. Raised automatically if the grid would be too large. The field is exact to
     * well under a voxel, so 0.5 looks as good as finer grids did with voxel-centre distances.
     */
    spacing: 0.5,
    /**
     * Gaussian blur of the distance field, Å. 0: no blur (the SES itself). With maxShift capping
     * how far it moves the surface, 0.5 softens the atom caps and keeps the shape.
     */
    sigma: 0.5,
    /**
     * How far, Å, the blur may move the surface from the exact SES, softly (tanh). The beads -
     * the seams between atom caps - are a few tenths of an Å deep, so a cap about that size
     * smooths them away and keeps anything bigger: pockets, grooves, the shape of a loop.
     * Infinity: the plain blur.
     */
    maxShift: 0.3,
    /**
     * Radius, Å, of the ball rolled inside the surface (an opening): necks thinner than twice this
     * are cut, so two atoms joined only by a pinched saddle become two rounded lobes. 0: off.
     */
    openRadius: 0.5,
    /**
     * Where the opening cut a neck, it leaves the lobe the saddle's concave footprint: a dent, deeper
     * than the cap lets the blur fill. Round the cuts (fading out over about an A), no cap on the blur.
     */
    openUncapped: true,
    /**
     * And round the cuts, the field blurred more, to this sigma in all, Å (at most `sigma`: off). 0.8
     * about halves the deepest dents but changes the protein's overall shape a little; 1.3 makes
     * dents of its own where it fades out. 0.6 by eye.
     */
    healBlur: 0.6,
    /**
     * Split every triangle once, with positions and normals from the field: the
     * diffuse light's diamonds at a 0.5 A grid mostly gone, for four times the triangles rather
     * than eight times the field a 0.25 A grid costs.
     */
    refine: true,
    /**
     * With WebGPU, the surface finished on the GPU from the C++'s field (contour, split, normals, vertex
     * atoms: src/WebGPUComponents/smoothSurface); the C++ makes all of it without WebGPU, when this is
     * off, or if the GPU fails. On a real GPU it is about twice as fast (3j2w on an RX 9070: 455 ms
     * against the C++'s 869 ms for contour and finish, 2026-11-20).
     */
    gpu: true,
    /**
     * Use the GPU even on a software adapter (SwiftShader, llvmpipe, WARP), where it is 3-4 times slower
     * than the C++: for tests, which have only SwiftShader on Linux.
     */
    gpuOnSoftware: false,
    /**
     * How softly the colours of a surface made from the atoms change from one atom's to the next,
     * Å (atomSurfaceColours): 0 is a hard edge, each vertex its nearest atom's, as M2T has it -
     * jagged along the triangles; above that, each vertex mixes its nearest atoms' colours by how
     * much further each is than the nearest. Applied when colouring, so changing it rebuilds nothing.
     */
    colourBlend: 0.4,
    /**
     * Passes of averaging each vertex's colour with its neighbours' (smoothVertexColours), after
     * colourBlend: takes out what is left of triangle-sized speckle at colour edges. Uniform areas
     * are untouched. At colour time too.
     */
    colourSmoothing: 2,
};

export interface SurfaceAtom {
    x: number;
    y: number;
    z: number;
    /** Van der Waals radius, Å. */
    r: number;
}

export interface SurfaceMesh {
    positions: Float32Array;
    /** Unit, pointing out of the surface. */
    normals: Float32Array;
    /** Counter-clockwise seen from outside. */
    indices: Uint32Array;
}

/** For each of `positions`, the index of the nearest of `source`'s vertices (-1 if none). */
export function nearestVertices(positions: ArrayLike<number>, source: ArrayLike<number>, cell = 1.5): Int32Array {
    const count = Math.floor(positions.length / 3);
    const sourceCount = Math.floor(source.length / 3);
    const result = new Int32Array(count).fill(-1);
    if (sourceCount === 0) return result;
    const low = [Infinity, Infinity, Infinity], high = [-Infinity, -Infinity, -Infinity];
    for (let v = 0; v < sourceCount; v++) for (let k = 0; k < 3; k++) {
        low[k] = Math.min(low[k], source[3 * v + k]);
        high[k] = Math.max(high[k], source[3 * v + k]);
    }
    const dims = [0, 1, 2].map(k => Math.max(1, Math.floor((high[k] - low[k]) / cell) + 1));
    const cellOf = (x: number, k: number) => Math.min(dims[k] - 1, Math.max(0, Math.floor((x - low[k]) / cell)));
    const cellIndex = (i: number, j: number, l: number) => (l * dims[1] + j) * dims[0] + i;
    const cells = dims[0] * dims[1] * dims[2];
    const start = new Uint32Array(cells + 1);
    const sourceCell = new Uint32Array(sourceCount);
    for (let v = 0; v < sourceCount; v++) {
        const c = cellIndex(cellOf(source[3 * v], 0), cellOf(source[3 * v + 1], 1), cellOf(source[3 * v + 2], 2));
        sourceCell[v] = c;
        start[c + 1]++;
    }
    for (let c = 0; c < cells; c++) start[c + 1] += start[c];
    const fill = start.slice(0, cells);
    const sorted = new Uint32Array(sourceCount);
    for (let v = 0; v < sourceCount; v++) sorted[fill[sourceCell[v]]++] = v;

    const maxRing = Math.max(dims[0], dims[1], dims[2]);
    for (let p = 0; p < count; p++) {
        const x = positions[3 * p], y = positions[3 * p + 1], z = positions[3 * p + 2];
        const ci = cellOf(x, 0), cj = cellOf(y, 1), cl = cellOf(z, 2);
        let best = -1, bestD = Infinity;
        for (let ring = 1; ring <= maxRing; ring++) {
            // Search the cube of cells `ring` around the point's cell. Anything not yet searched
            // is at least ring cells from the point, so a vertex nearer than that is the nearest.
            for (let l = Math.max(0, cl - ring); l <= Math.min(dims[2] - 1, cl + ring); l++)
                for (let j = Math.max(0, cj - ring); j <= Math.min(dims[1] - 1, cj + ring); j++)
                    for (let i = Math.max(0, ci - ring); i <= Math.min(dims[0] - 1, ci + ring); i++) {
                        // Only the shell of this ring: the inside was searched already.
                        if (ring > 1 && Math.abs(i - ci) < ring && Math.abs(j - cj) < ring && Math.abs(l - cl) < ring) continue;
                        const c = cellIndex(i, j, l);
                        for (let s = start[c]; s < start[c + 1]; s++) {
                            const v = sorted[s];
                            const dx = source[3 * v] - x, dy = source[3 * v + 1] - y, dz = source[3 * v + 2] - z;
                            const d = dx * dx + dy * dy + dz * dz;
                            if (d < bestD) { bestD = d; best = v; }
                        }
                    }
            if (best >= 0 && bestD <= (ring * cell) * (ring * cell)) break;
        }
        result[p] = best;
    }
    return result;
}

/**
 * A residue as M2T names it in a mesh's owner table (coot-molecule-moltris.cc, residue_cid):
 * /model/chain/seqnum(RES), and .ins after the name for an insertion code. `resNo` as gemmi writes a
 * SeqId ("23", "23A").
 */
export function residueCid(model: string, chain: string, resNo: string, resName: string): string {
    const match = /^(-?\d+)(.*)$/.exec(resNo.trim());
    const number = match ? match[1] : resNo.trim();
    const insertion = match ? match[2].trim() : "";
    return `/${model}/${chain}/${number}(${resName})${insertion ? `.${insertion}` : ""}`;
}

/** How many of its nearest atoms a vertex keeps for its colour (VertexAtoms.near). */
export const COLOUR_ATOMS = 4;

/** Each vertex's atom, and near a boundary between residues, the other residue's atom. */
export interface VertexAtoms {
    /** The atom whose sphere the vertex is nearest (index into the surface's atoms). */
    atom: Int32Array;
    /** The nearest atom of another residue, if its sphere is within the band; -1 if none. */
    other: Int32Array;
    /** How much of the vertex is `atom`'s (≥ 0.5), the rest `other`'s; 1 where there is no other. */
    weight: Float32Array;
    /**
     * For its colour, whatever their residues: the vertex's COLOUR_ATOMS nearest atoms, nearest first
     * (-1 past the last), and how far each one's sphere is, |v - a| - r: COLOUR_ATOMS in a row per
     * vertex, `near[COLOUR_ATOMS * v + k]`.
     */
    near: Int32Array;
    nearGap: Float32Array;
}

/** A surface made from the atoms alone (the C++ smoothSurfaceFromAtoms): the mesh, and each vertex's atoms. */
export interface AtomSurface extends SurfaceMesh, VertexAtoms {}

/**
 * Surfaces made from parts of the atoms (one per chain, for "surface each chain separately") as
 * one: the arrays end to end, each part's triangles moved past the vertices before it, and its atom
 * indices - `atom`, `other`, `near` - taken from the part's own numbering to the whole list's by
 * `atomIndex` (part atom i is atom atomIndex[i] of the whole). -1 stays -1.
 */
export function mergeAtomSurfaces(parts: { surface: AtomSurface; atomIndex: ArrayLike<number> }[]): AtomSurface {
    let vertices = 0, triangleCorners = 0;
    for (const { surface } of parts) { vertices += surface.atom.length; triangleCorners += surface.indices.length; }
    const merged: AtomSurface = {
        positions: new Float32Array(3 * vertices), normals: new Float32Array(3 * vertices), indices: new Uint32Array(triangleCorners),
        atom: new Int32Array(vertices), other: new Int32Array(vertices), weight: new Float32Array(vertices),
        near: new Int32Array(COLOUR_ATOMS * vertices), nearGap: new Float32Array(COLOUR_ATOMS * vertices),
    };
    const remap = (from: Int32Array, to: Int32Array, at: number, atomIndex: ArrayLike<number>) => {
        for (let i = 0; i < from.length; i++) to[at + i] = from[i] < 0 ? -1 : atomIndex[from[i]];
    };
    let v = 0, t = 0;
    for (const { surface, atomIndex } of parts) {
        const n = surface.atom.length;
        merged.positions.set(surface.positions, 3 * v);
        merged.normals.set(surface.normals, 3 * v);
        for (let i = 0; i < surface.indices.length; i++) merged.indices[t + i] = surface.indices[i] + v;
        remap(surface.atom, merged.atom, v, atomIndex);
        remap(surface.other, merged.other, v, atomIndex);
        merged.weight.set(surface.weight, v);
        remap(surface.near, merged.near, COLOUR_ATOMS * v, atomIndex);
        merged.nearGap.set(surface.nearGap, COLOUR_ATOMS * v);
        v += n;
        t += surface.indices.length;
    }
    return merged;
}

/**
 * How much each of vertex v's nearest atoms counts, into `out` (COLOUR_ATOMS, summing to 1, 0 past
 * the last atom): atom k weighted (1 - d / R)² for d = gap_k - gap_0 < R = 2 * width, nothing beyond
 * - two atoms as near as each other count half each, whatever their residues, and one `width`
 * further a quarter as much. The weight reaches zero at R, so an atom has faded out before it can
 * drop off the end of a vertex's short list (an exp(-d / width) weight never did, and a vertex
 * whose fourth atom was its neighbour's third jumped: single-triangle splatter at colour edges). A
 * width of 0 is a hard edge: all of it the nearest atom's, as M2T has it. What colours and hover
 * both use, so they agree.
 */
export function blendWeights(vertex: VertexAtoms, v: number, width: number, out: Float64Array): void {
    const base = COLOUR_ATOMS * v;
    out.fill(0);
    if (vertex.near[base] < 0) return;
    if (width <= 0) { out[0] = 1; return; }
    const reach = 2 * width;
    let total = 0;
    for (let k = 0; k < COLOUR_ATOMS && vertex.near[base + k] >= 0; k++) {
        const t = 1 - (vertex.nearGap[base + k] - vertex.nearGap[base]) / reach;
        out[k] = t > 0 ? t * t : 0;
        total += out[k];
    }
    for (let k = 0; k < COLOUR_ATOMS; k++) out[k] /= total;
}

/**
 * A surface's vertex colours from its atoms' (RGBA, 4 per atom), mixed by blendWeights. Cheap - what
 * a colour-rule or width change redoes, with no surface to rebuild. White where a vertex has no atom.
 */
export function atomSurfaceColours(vertex: VertexAtoms, atomColours: ArrayLike<number>, width: number): Float32Array {
    const n = vertex.atom.length;
    const colours = new Float32Array(4 * n);
    const w = new Float64Array(COLOUR_ATOMS);
    for (let v = 0; v < n; v++) {
        const base = COLOUR_ATOMS * v;
        if (vertex.near[base] < 0) { colours.fill(1, 4 * v, 4 * v + 4); continue; }
        blendWeights(vertex, v, width, w);
        for (let c = 0; c < 4; c++) {
            let sum = 0;
            for (let k = 0; k < COLOUR_ATOMS && w[k] > 0; k++) sum += w[k] * atomColours[4 * vertex.near[base + k] + c];
            colours[4 * v + c] = sum;
        }
    }
    return colours;
}

/**
 * Who a vertex belongs to for the hover, by the same weights as its colour: its nearest atoms'
 * residues, an atom's weight added to any other atom's of the same residue - up to COLOUR_ATOMS
 * (residue, share) pairs per vertex, in a row, NO_OWNER and 0 past the last. So the hover fades
 * across a boundary exactly as the colour does.
 */
export function atomSurfaceInfluences(vertex: VertexAtoms, residueOf: ArrayLike<number>, width: number): { owners: Uint32Array; weights: Float32Array } {
    const n = vertex.atom.length;
    const owners = new Uint32Array(COLOUR_ATOMS * n).fill(0xFFFFFFFF);
    const weights = new Float32Array(COLOUR_ATOMS * n);
    const w = new Float64Array(COLOUR_ATOMS);
    for (let v = 0; v < n; v++) {
        const base = COLOUR_ATOMS * v;
        blendWeights(vertex, v, width, w);
        let kept = 0;
        for (let k = 0; k < COLOUR_ATOMS && w[k] > 0; k++) {
            const residue = residueOf[vertex.near[base + k]];
            let slot = 0;
            while (slot < kept && owners[base + slot] !== residue) slot++;
            if (slot === kept) { owners[base + slot] = residue; kept++; }
            weights[base + slot] += w[k];
        }
    }
    return { owners, weights };
}

/**
 * Each vertex's neighbours along the mesh's edges (CSR), for smoothVertexColours: from every
 * triangle each corner lists the other two, so on a closed mesh every neighbour is listed twice,
 * evenly.
 */
export function vertexNeighbours(indices: ArrayLike<number>, vertexCount: number): { start: Int32Array; ids: Int32Array } {
    const start = new Int32Array(vertexCount + 1);
    for (let i = 0; i < indices.length; i++) start[indices[i] + 1] += 2;
    for (let v = 0; v < vertexCount; v++) start[v + 1] += start[v];
    const fill = start.slice(0, vertexCount);
    const ids = new Int32Array(start[vertexCount]);
    for (let t = 0; t + 2 < indices.length; t += 3) {
        const a = indices[t], b = indices[t + 1], c = indices[t + 2];
        ids[fill[a]++] = b; ids[fill[a]++] = c;
        ids[fill[b]++] = c; ids[fill[b]++] = a;
        ids[fill[c]++] = a; ids[fill[c]++] = b;
    }
    return { start, ids };
}

/**
 * Colours (RGBA per vertex) averaged with their neighbours' `passes` times, each vertex with itself
 * and its neighbours: a little diffusion along the surface, which takes out triangle-sized speckle
 * where colours meet and leaves a uniform area as it was. A new array; `colours` is not changed.
 */
export function smoothVertexColours(colours: Float32Array, neighbours: { start: Int32Array; ids: Int32Array }, passes: number): Float32Array {
    let from: Float32Array = colours, to: Float32Array = new Float32Array(colours.length);
    const n = neighbours.start.length - 1;
    for (let pass = 0; pass < passes; pass++) {
        for (let v = 0; v < n; v++) {
            let r = from[4 * v], g = from[4 * v + 1], b = from[4 * v + 2], a = from[4 * v + 3];
            const s0 = neighbours.start[v], s1 = neighbours.start[v + 1];
            for (let k = s0; k < s1; k++) {
                const u = neighbours.ids[k];
                r += from[4 * u]; g += from[4 * u + 1]; b += from[4 * u + 2]; a += from[4 * u + 3];
            }
            const scale = 1 / (1 + s1 - s0);
            to[4 * v] = r * scale; to[4 * v + 1] = g * scale; to[4 * v + 2] = b * scale; to[4 * v + 3] = a * scale;
        }
        if (from === colours) { from = to; to = new Float32Array(colours.length); }
        else { const swap = from; from = to; to = swap; }
    }
    return passes > 0 ? from : colours.slice();
}

/** A surface made from the atoms as Coot hands a mesh over (libcootApi.SimpleMeshJS's shape). */
export interface AtomSurfaceMeshJS {
    status: number;
    prim_types: [[string]];
    idx_tri: [[Uint32Array]];
    vert_tri: [[Float32Array]];
    norm_tri: [[Float32Array]];
    col_tri: [[Float32Array]];
    vertex_owners: Uint32Array;
    vertex_owners_other: Uint32Array;
    vertex_owner_weights: Float32Array;
    /** The hover's shares, by the colours' weights (atomSurfaceInfluences): COLOUR_ATOMS per vertex. */
    vertex_influence_owners: Uint32Array;
    vertex_influence_weights: Float32Array;
    owners: string[];
}

/**
 * The mesh, coloured, with residue owners as M2T gives them: each vertex's atom's residue, and near
 * a boundary the other residue and the share (owners as in coot-molecule-moltris.cc: the heavier
 * first - the vertex weight is never below 0.5 - and 0xFFFFFFFF for none). `residues`: the owner
 * table, residueCid strings, indexed by `residueOf`.
 */
export function atomSurfaceMesh(surface: AtomSurface, residueOf: ArrayLike<number>, residues: string[],
                                atomColours: ArrayLike<number>, colourBlend: number, colourSmoothing = 0): AtomSurfaceMeshJS {
    const n = surface.atom.length;
    const owners = new Uint32Array(n), others = new Uint32Array(n).fill(0xFFFFFFFF), weights = new Float32Array(n).fill(1);
    for (let v = 0; v < n; v++) {
        const a = surface.atom[v], b = surface.other[v];
        owners[v] = a >= 0 ? residueOf[a] : 0xFFFFFFFF;
        if (b >= 0) { others[v] = residueOf[b]; weights[v] = surface.weight[v]; }
    }
    const influences = atomSurfaceInfluences(surface, residueOf, colourBlend);
    return {
        status: 1,
        prim_types: [["TRIANGLES"]],
        idx_tri: [[surface.indices]],
        vert_tri: [[surface.positions]],
        norm_tri: [[surface.normals]],
        col_tri: [[colourSmoothing > 0
            ? smoothVertexColours(atomSurfaceColours(surface, atomColours, colourBlend),
                vertexNeighbours(surface.indices, surface.atom.length), colourSmoothing)
            : atomSurfaceColours(surface, atomColours, colourBlend)]],
        vertex_owners: owners,
        vertex_owners_other: others,
        vertex_owner_weights: weights,
        vertex_influence_owners: influences.owners,
        vertex_influence_weights: influences.weights,
        owners: residues,
    };
}

/** Atoms as x, y, z, r per atom: how they travel to the Coot worker. */
export function packAtoms(atoms: readonly SurfaceAtom[]): Float32Array {
    const packed = new Float32Array(4 * atoms.length);
    atoms.forEach((a, i) => packed.set([a.x, a.y, a.z, a.r], 4 * i));
    return packed;
}
