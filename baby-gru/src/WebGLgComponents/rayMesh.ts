/**
 * Asking whether the pointer is actually over a mesh, rather than near a sample of one.
 *
 * Everything else the pick test handles has something better than isolated points to measure
 * against: a path offers the centre line of each section, a smooth mesh carries a per-vertex
 * influence weight, an instanced shape is compact enough that a handful of samples covers it.
 * A cavity has none of those - it is a branching hollow pocket described only by its triangles -
 * and sampling its surface is the weakest approximation of the lot. Tuning the tolerance on
 * that approximation trades one wrong answer for another; there is no value that is right.
 *
 * So this asks the exact question instead. The triangles are already here: the display buffer
 * keeps `triangleVertices` and `triangleIndexs` in JavaScript to build its GL buffers from, so
 * an exact test costs no extra memory and needs nothing from libcoot.
 *
 * Möller-Trumbore, with a bounding box tried first. Double-sided deliberately: a cavity is a
 * closed surface and the viewer may be inside one, in which case the first thing the ray meets
 * is a back face and refusing it would make the pocket unhoverable from within.
 *
 * A LINE, not a segment. The caller unprojects two points to say which way the ray goes, but
 * how far apart those two points happen to be says nothing about how much of the scene is
 * visible: in Moorhen they straddle only about half the depth of the slab between the clip
 * planes, so bounding the test by them made most of what was on screen unpickable. How far
 * along the line the mesh may be is a question about the clip planes, and it is answered in
 * eye space by the caller, which is where the clip planes are defined.
 */

export type Bounds = { low: [number, number, number]; high: [number, number, number] };

/**
 * The chord the line cuts through the mesh: where it first crosses the surface and where it
 * last does, in increasing t.
 *
 * Both are reported because which of the two faces the viewer depends on which way round the
 * caller's two points run, and that is the caller's business, not this file's.
 */
export type MeshCrossing = {
    point: [number, number, number];
    t: number;
    /**
     * Which triangle was crossed, as an index into the index array in threes.
     *
     * This is how a mesh that knows where its vertices came from answers "what is under the
     * pointer": take a corner of this triangle and look up what owns it. A molecular surface
     * carries the residue behind every vertex, so the residue follows from the intersection
     * with no measuring and no tolerance.
     */
    triangle: number;
};

export type MeshHit = {
    entry: MeshCrossing;
    exit: MeshCrossing;
};

/**
 * Does the line meet this box?
 *
 * The slab test. Cheap, and it rejects almost every mesh on almost every hover - twenty pockets
 * scattered through a protein, and the pointer is over at most one or two of them.
 */
export const rayHitsBounds = (
    bounds: Bounds,
    from: readonly number[],
    to: readonly number[]
): boolean => {
    let near = -Infinity;
    let far = Infinity;
    for (let axis = 0; axis < 3; axis++) {
        const origin = from[axis];
        const span = to[axis] - origin;
        const low = bounds.low[axis];
        const high = bounds.high[axis];
        if (Math.abs(span) < 1e-12) {
            // Parallel to this pair of planes: either inside them for the whole line or
            // outside for all of it.
            if (origin < low || origin > high) return false;
            continue;
        }
        let enter = (low - origin) / span;
        let leave = (high - origin) / span;
        if (enter > leave) [enter, leave] = [leave, enter];
        if (enter > near) near = enter;
        if (leave < far) far = leave;
        if (near > far) return false;
    }
    return true;
};

/**
 * Where the line crosses the mesh, or null if it misses it entirely.
 *
 * `t` is the distance along in units of from→to, and may be anything: the two points are a
 * direction, not a range.
 */
export const rayMeshHit = (
    vertices: ArrayLike<number>,
    indices: ArrayLike<number>,
    from: readonly number[],
    to: readonly number[],
    bounds?: Bounds
): MeshHit | null => {
    if (bounds && !rayHitsBounds(bounds, from, to)) return null;

    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const dz = to[2] - from[2];

    let leastT = Infinity;
    let greatestT = -Infinity;
    let leastTriangle = -1;
    let greatestTriangle = -1;

    for (let i = 0; i + 2 < indices.length; i += 3) {
        const a = 3 * indices[i];
        const b = 3 * indices[i + 1];
        const c = 3 * indices[i + 2];

        const e1x = vertices[b] - vertices[a];
        const e1y = vertices[b + 1] - vertices[a + 1];
        const e1z = vertices[b + 2] - vertices[a + 2];
        const e2x = vertices[c] - vertices[a];
        const e2y = vertices[c + 1] - vertices[a + 1];
        const e2z = vertices[c + 2] - vertices[a + 2];

        // p = direction x e2
        const px = dy * e2z - dz * e2y;
        const py = dz * e2x - dx * e2z;
        const pz = dx * e2y - dy * e2x;

        const det = e1x * px + e1y * py + e1z * pz;
        // No epsilon sign test: a back face is as good as a front one here, since the viewer
        // may be inside a closed pocket. Only a ray in the plane of the triangle is rejected.
        if (det > -1e-12 && det < 1e-12) continue;
        const invDet = 1 / det;

        const tx = from[0] - vertices[a];
        const ty = from[1] - vertices[a + 1];
        const tz = from[2] - vertices[a + 2];

        const u = (tx * px + ty * py + tz * pz) * invDet;
        if (u < 0 || u > 1) continue;

        // q = t x e1
        const qx = ty * e1z - tz * e1y;
        const qy = tz * e1x - tx * e1z;
        const qz = tx * e1y - ty * e1x;

        const v = (dx * qx + dy * qy + dz * qz) * invDet;
        if (v < 0 || u + v > 1) continue;

        const t = (e2x * qx + e2y * qy + e2z * qz) * invDet;
        if (t < leastT) { leastT = t; leastTriangle = i / 3; }
        if (t > greatestT) { greatestT = t; greatestTriangle = i / 3; }
    }

    if (leastT === Infinity) return null;
    const at = (t: number): [number, number, number] =>
        [from[0] + dx * t, from[1] + dy * t, from[2] + dz * t];
    return {
        entry: { t: leastT, point: at(leastT), triangle: leastTriangle },
        exit: { t: greatestT, point: at(greatestT), triangle: greatestTriangle },
    };
};
