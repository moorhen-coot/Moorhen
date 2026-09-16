/**
 * Geometry generators for the 3D annotation objects.
 *
 * Every generator returns local-space geometry that is then placed by the instanced draw path:
 * the vertex shader computes `instancePosition + instanceOrientation * (instanceSize * vertex)`.
 * So each mesh is built at a canonical size and the per-instance size/orientation do the rest.
 *
 * Normals are a per-vertex attribute, so `normals` always has exactly the same length as
 * `vertices`. Faces that should read as flat are given per-face duplicated vertices rather than
 * shared corners - a shared corner can only carry one normal.
 */

export type ShapeMesh = {
    vertices: number[];
    normals: number[];
    idx: number[];
};

type Vec3 = [number, number, number];

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const length = (a: Vec3): number => Math.sqrt(dot(a, a));
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const normalise = (a: Vec3): Vec3 => {
    const l = length(a);
    return l > 0 ? scale(a, 1 / l) : [0, 0, 0];
};
const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
];

/** Circumradius every closed polyhedron is normalised to, so `scale` behaves as a diameter. */
const POLYHEDRON_CIRCUMRADIUS = 0.5;

const GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2;

/**
 * Order a face's vertices counter-clockwise seen from outside, and emit it flat-shaded.
 *
 * The solids below are all centred on the origin, so a face's outward normal is simply the
 * direction of its centroid. Sorting by angle in the plane around that normal puts the corners in
 * winding order regardless of how they were collected, which means the callers only have to say
 * which vertices belong to a face, not in what order.
 */
const pushFace = (mesh: ShapeMesh, faceVertices: Vec3[]) => {
    const n = faceVertices.length;
    const centroid: Vec3 = [
        faceVertices.reduce((t, v) => t + v[0], 0) / n,
        faceVertices.reduce((t, v) => t + v[1], 0) / n,
        faceVertices.reduce((t, v) => t + v[2], 0) / n,
    ];
    const normal = normalise(centroid);

    // An in-plane basis (u, w) with u x w = normal, so increasing angle is counter-clockwise
    // when viewed from outside.
    const u = normalise(sub(faceVertices[0], centroid));
    const w = cross(normal, u);
    const ordered = [...faceVertices].sort((p, q) => {
        const dp = sub(p, centroid);
        const dq = sub(q, centroid);
        return Math.atan2(dot(dp, w), dot(dp, u)) - Math.atan2(dot(dq, w), dot(dq, u));
    });

    const base = mesh.vertices.length / 3;
    ordered.forEach(v => {
        mesh.vertices.push(...v);
        mesh.normals.push(...normal);
    });
    // Fan from the first corner; keeps the winding of the ordered ring.
    for (let i = 1; i < n - 1; i++) {
        mesh.idx.push(base, base + i, base + i + 1);
    }
};

/**
 * Build a flat-shaded mesh from vertex positions and faces given as index lists, normalising the
 * solid to POLYHEDRON_CIRCUMRADIUS.
 */
const buildPolyhedron = (vertices: Vec3[], faces: number[][]): ShapeMesh => {
    const maxRadius = Math.max(...vertices.map(length));
    const scaled = vertices.map(v => scale(v, POLYHEDRON_CIRCUMRADIUS / maxRadius));
    const mesh: ShapeMesh = { vertices: [], normals: [], idx: [] };
    faces.forEach(face => pushFace(mesh, face.map(i => scaled[i])));
    return mesh;
};

/**
 * Derive the faces of a convex solid whose vertices all lie on a sphere, from the vertices alone.
 *
 * Edges are the closest vertex pairs, so each vertex knows its neighbours; any two neighbours of a
 * vertex span a candidate plane. A candidate is a real face only if it is a *supporting* plane -
 * every other vertex on or behind it - which is what rejects the planes that slice through the
 * solid (the equatorial square of an octahedron, say). The face is then every vertex lying in that
 * plane, which handles pentagons and hexagons as readily as triangles.
 *
 * Deriving faces rather than hand-maintaining index tables means the polyhedra below are defined
 * by their vertex coordinates alone, and a table can't fall out of step with them.
 */
const facesFromAdjacency = (vertices: Vec3[]): number[][] => {
    let minDist = Infinity;
    for (let i = 0; i < vertices.length; i++) {
        for (let j = i + 1; j < vertices.length; j++) {
            minDist = Math.min(minDist, length(sub(vertices[i], vertices[j])));
        }
    }
    const tol = minDist * 1e-6;
    const neighbours = vertices.map((v, i) =>
        vertices
            .map((_unused, j) => j)
            .filter(j => j !== i && Math.abs(length(sub(v, vertices[j])) - minDist) < tol)
    );

    const faces: number[][] = [];
    const faceNormals: Vec3[] = [];

    vertices.forEach((v, i) => {
        const nb = neighbours[i];
        for (let p = 0; p < nb.length; p++) {
            for (let q = p + 1; q < nb.length; q++) {
                let normal = normalise(cross(sub(vertices[nb[p]], v), sub(vertices[nb[q]], v)));
                if (dot(normal, v) < 0) normal = scale(normal, -1);
                // Same plane already found from another of its corners?
                if (faceNormals.some(existing => dot(existing, normal) > 1 - 1e-9)) continue;

                const d = dot(v, normal);
                // Reject planes that cut through the solid rather than supporting it.
                if (vertices.some(w => dot(w, normal) > d + 1e-6)) continue;

                const face = vertices
                    .map((_unused, k) => k)
                    .filter(k => Math.abs(dot(vertices[k], normal) - d) < 1e-6);
                if (face.length >= 3) {
                    faces.push(face);
                    faceNormals.push(normal);
                }
            }
        }
    });

    return faces;
};

const icosahedronVertices = (): Vec3[] => {
    const p = GOLDEN_RATIO;
    return [
        [0, 1, p], [0, 1, -p], [0, -1, p], [0, -1, -p],
        [1, p, 0], [1, -p, 0], [-1, p, 0], [-1, -p, 0],
        [p, 0, 1], [-p, 0, 1], [p, 0, -1], [-p, 0, -1],
    ];
};

const polyhedronFromVertices = (vertices: Vec3[]): ShapeMesh =>
    buildPolyhedron(vertices, facesFromAdjacency(vertices));

/** A regular tetrahedron: four alternate corners of a cube. */
export const getTetrahedron = (): ShapeMesh =>
    polyhedronFromVertices([
        [1, 1, 1],
        [1, -1, -1],
        [-1, 1, -1],
        [-1, -1, 1],
    ]);

/** A regular octahedron: the six signed unit axes. */
export const getOctahedron = (): ShapeMesh =>
    polyhedronFromVertices([
        [1, 0, 0], [-1, 0, 0],
        [0, 1, 0], [0, -1, 0],
        [0, 0, 1], [0, 0, -1],
    ]);

/** A regular icosahedron: 12 vertices, 20 triangular faces. */
export const getIcosahedron = (): ShapeMesh => polyhedronFromVertices(icosahedronVertices());

/** A regular dodecahedron: 20 vertices, 12 pentagonal faces. */
export const getDodecahedron = (): ShapeMesh => {
    const p = GOLDEN_RATIO;
    const q = 1 / p;
    return polyhedronFromVertices([
        [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
        [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1],
        [0, q, p], [0, q, -p], [0, -q, p], [0, -q, -p],
        [q, p, 0], [q, -p, 0], [-q, p, 0], [-q, -p, 0],
        [p, 0, q], [-p, 0, q], [p, 0, -q], [-p, 0, -q],
    ]);
};

/**
 * A truncated icosahedron - the football / Bucky ball: 60 vertices, 12 pentagons and 20 hexagons.
 *
 * Built by actually truncating an icosahedron rather than from a vertex table. Cutting every edge
 * at both of its third-points replaces each vertex with a pentagon and each triangular face with a
 * hexagon; cutting at exactly one third is what makes every edge of the result the same length,
 * and so every face regular. The faces themselves fall out of facesFromAdjacency.
 */
export const getFootball = (): ShapeMesh => {
    const base = icosahedronVertices();
    const baseFaces = facesFromAdjacency(base);

    const edgeKey = (i: number, j: number) => `${Math.min(i, j)}-${Math.max(i, j)}`;
    const edges = new Set<string>();
    baseFaces.forEach(face => {
        face.forEach((vertex, k) => edges.add(edgeKey(vertex, face[(k + 1) % face.length])));
    });

    const vertices: Vec3[] = [];
    edges.forEach(edge => {
        const [i, j] = edge.split("-").map(Number);
        vertices.push(lerp(base[i], base[j], 1 / 3));
        vertices.push(lerp(base[j], base[i], 1 / 3));
    });

    return polyhedronFromVertices(vertices);
};

/**
 * A torus lying in the xy plane, major radius 1, so the instance size scales it to the wanted
 * major radius and `minorRatio` is minor_radius / major_radius.
 */
export const getTorus = (minorRatio: number, majorAccu: number, minorAccu: number): ShapeMesh => {
    const vertices: number[] = [];
    const normals: number[] = [];
    const idx: number[] = [];

    for (let i = 0; i < majorAccu; i++) {
        const theta = (2 * Math.PI * i) / majorAccu;
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);
        for (let j = 0; j < minorAccu; j++) {
            const phi = (2 * Math.PI * j) / minorAccu;
            // Outward normal of the tube at this point, pointing away from the tube's centre line.
            const normal: Vec3 = [cosTheta * Math.cos(phi), sinTheta * Math.cos(phi), Math.sin(phi)];
            vertices.push(
                cosTheta + minorRatio * normal[0],
                sinTheta + minorRatio * normal[1],
                minorRatio * normal[2]
            );
            normals.push(...normal);

            const next_i = (i + 1) % majorAccu;
            const next_j = (j + 1) % minorAccu;
            const v00 = i * minorAccu + j;
            const v01 = i * minorAccu + next_j;
            const v10 = next_i * minorAccu + j;
            const v11 = next_i * minorAccu + next_j;
            idx.push(v00, v10, v11);
            idx.push(v00, v11, v01);
        }
    }

    return { vertices, normals, idx };
};

/**
 * A frustum - a cone or pyramid with its tip cut off - running along z from a base of radius 1 at
 * z = -0.5 to a top of radius `topRadiusRatio` at z = +0.5, with both ends capped.
 *
 * Centred on the origin, like the closed solids, so that the instance orientation turns it on the
 * spot rather than swinging it about its base, and the instance size's z component is its height.
 *
 * `nSides` controls the cross section: a large value gives a circular (conical) frustum, a small
 * one a truncated pyramid. `flat` selects the shading to match - a truncated pyramid wants one
 * normal per face, a cone wants normals that vary around the barrel.
 *
 * The side normal is not purely radial: for a surface of revolution r(z) the outward normal is
 * (cos, sin, -dr/dz) normalised. The radius goes from 1 to topRadiusRatio over a unit height, so
 * dr/dz is the constant (topRadiusRatio - 1) regardless of where the ends sit.
 */
export const getFrustum = (nSides: number, topRadiusRatio: number, flat: boolean): ShapeMesh => {
    const vertices: number[] = [];
    const normals: number[] = [];
    const idx: number[] = [];

    const slope = topRadiusRatio - 1;
    const normalScale = 1 / Math.sqrt(1 + slope * slope);
    const sideNormal = (angle: number): Vec3 => [
        Math.cos(angle) * normalScale,
        Math.sin(angle) * normalScale,
        -slope * normalScale,
    ];

    const pushVertex = (position: Vec3, normal: Vec3) => {
        vertices.push(...position);
        normals.push(...normal);
    };

    for (let i = 0; i < nSides; i++) {
        const angle0 = (2 * Math.PI * i) / nSides;
        const angle1 = (2 * Math.PI * (i + 1)) / nSides;

        const base0: Vec3 = [Math.cos(angle0), Math.sin(angle0), -0.5];
        const base1: Vec3 = [Math.cos(angle1), Math.sin(angle1), -0.5];
        const top0: Vec3 = [topRadiusRatio * Math.cos(angle0), topRadiusRatio * Math.sin(angle0), 0.5];
        const top1: Vec3 = [topRadiusRatio * Math.cos(angle1), topRadiusRatio * Math.sin(angle1), 0.5];
        const apex: Vec3 = [0, 0, 0.5];

        // Wound base0 -> base1 -> top1 -> top0: counter-clockwise seen from outside the barrel, so
        // the cross product of the first two edges is the outward normal.
        const far = topRadiusRatio > 0 ? top1 : apex;
        // A flat face is planar, so its one normal comes from the facet itself. Note this is not
        // the analytic surface normal used for the smooth case: a truncated pyramid's face spans
        // the chord between two corners rather than the arc, and tilts differently as a result.
        const faceNormal = normalise(cross(sub(base1, base0), sub(far, base0)));
        const normal0 = flat ? faceNormal : sideNormal(angle0);
        const normal1 = flat ? faceNormal : sideNormal(angle1);

        const base = vertices.length / 3;
        if (topRadiusRatio > 0) {
            pushVertex(base0, normal0);
            pushVertex(base1, normal1);
            pushVertex(top1, normal1);
            pushVertex(top0, normal0);
            idx.push(base, base + 1, base + 2);
            idx.push(base, base + 2, base + 3);
        } else {
            // A zero top radius collapses the quad to a triangle; emitting it as a quad anyway
            // would leave a degenerate triangle along the apex edge.
            pushVertex(base0, normal0);
            pushVertex(base1, normal1);
            pushVertex(apex, flat ? faceNormal : sideNormal((angle0 + angle1) / 2));
            idx.push(base, base + 1, base + 2);
        }

        // Bottom cap, wound clockwise seen from +z so that it faces -z.
        const bottom = vertices.length / 3;
        pushVertex([0, 0, -0.5], [0, 0, -1]);
        pushVertex(base1, [0, 0, -1]);
        pushVertex(base0, [0, 0, -1]);
        idx.push(bottom, bottom + 1, bottom + 2);

        if (topRadiusRatio > 0) {
            const top = vertices.length / 3;
            pushVertex([0, 0, 0.5], [0, 0, 1]);
            pushVertex(top0, [0, 0, 1]);
            pushVertex(top1, [0, 0, 1]);
            idx.push(top, top + 1, top + 2);
        }
    }

    return { vertices, normals, idx };
};
