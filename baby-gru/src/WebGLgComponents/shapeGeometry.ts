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

/**
 * Every distinct signed permutation of a coordinate triple - the usual compact way of writing the
 * vertex set of a symmetric polyhedron. Duplicates are dropped, so a zero or a repeated
 * coordinate does not produce the same vertex twice.
 */
const signedPermutations = (base: Vec3): Vec3[] => {
    const orders = [
        [0, 1, 2],
        [0, 2, 1],
        [1, 0, 2],
        [1, 2, 0],
        [2, 0, 1],
        [2, 1, 0],
    ];
    const seen = new Set<string>();
    const out: Vec3[] = [];
    orders.forEach(order => {
        for (let signs = 0; signs < 8; signs++) {
            const v: Vec3 = [
                base[order[0]] * (signs & 1 ? -1 : 1),
                base[order[1]] * (signs & 2 ? -1 : 1),
                base[order[2]] * (signs & 4 ? -1 : 1),
            ];
            // Normalise -0 to 0 so that it does not read as a distinct vertex.
            const key = v.map(x => (x === 0 ? 0 : x).toFixed(9)).join(",");
            if (!seen.has(key)) {
                seen.add(key);
                out.push(v);
            }
        }
    });
    return out;
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
 * A truncated octahedron: 24 vertices, 8 hexagons and 6 squares.
 *
 * Also the Wigner-Seitz cell of a body-centred cubic lattice, and one of the standard periodic
 * boundary cells in molecular dynamics, which is the main reason it is worth having.
 */
export const getTruncatedOctahedron = (): ShapeMesh =>
    polyhedronFromVertices(signedPermutations([0, 1, 2]));

/**
 * A cuboctahedron: 12 vertices, 8 triangles and 6 squares - a cube with its corners cut back to
 * the edge midpoints. Also the shape of Elite's Coriolis station.
 */
export const getCuboctahedron = (): ShapeMesh =>
    polyhedronFromVertices(signedPermutations([0, 1, 1]));

/**
 * A rhombic dodecahedron: 14 vertices and 12 rhombic faces. The other standard periodic boundary
 * cell shape, and the Wigner-Seitz cell of a face-centred cubic lattice.
 *
 * Unlike the others here it is a Catalan solid, so it is face-transitive rather than
 * vertex-transitive: its vertices sit at two different radii - eight at the cube corners and six
 * further out along the axes. facesFromAdjacency still copes, because what it actually relies on
 * is that all the edges are the same length (they are, at sqrt(3)) rather than all the vertices
 * being equidistant. Normalising to a circumradius therefore refers to the outer six.
 */
export const getRhombicDodecahedron = (): ShapeMesh =>
    polyhedronFromVertices([...signedPermutations([1, 1, 1]), ...signedPermutations([2, 0, 0])]);

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
 * Half the gap between the two faces of a flat shape, in mesh units.
 *
 * A plane or a disc has to be drawn from both sides, and the fragment shader only lights front
 * faces - a back face falls back to flat unlit colour. Emitting the same polygon twice with
 * opposed windings almost works, but the depth function is LESS, so two exactly coplanar faces
 * tie and whichever was drawn first always wins, leaving one side unlit regardless. Separating
 * them by this much breaks the tie, so each face wins from its own side and is lit there. Small
 * enough to be invisible: a disc of radius 10 gets faces 0.01 apart.
 */
const FLAT_FACE_SEPARATION = 5e-4;

/**
 * Emit one flat face of a convex polygon, as a fan, at the given z.
 *
 * `ring` is the outline counter-clockwise seen from +z; `reverse` flips it for the -z face so that
 * each face is wound counter-clockwise when seen from its own side.
 */
const pushFlatFace = (mesh: ShapeMesh, ring: [number, number][], z: number, normal: Vec3, reverse: boolean) => {
    const ordered = reverse ? [...ring].reverse() : ring;
    const base = mesh.vertices.length / 3;
    ordered.forEach(([x, y]) => {
        mesh.vertices.push(x, y, z);
        mesh.normals.push(...normal);
    });
    for (let i = 1; i < ordered.length - 1; i++) {
        mesh.idx.push(base, base + i, base + i + 1);
    }
};

/**
 * A flat, double-sided convex polygon in the xy plane, centred on the origin.
 * @param {[number, number][]} ring - the outline, counter-clockwise seen from +z
 */
const doubleSidedPolygon = (ring: [number, number][]): ShapeMesh => {
    const mesh: ShapeMesh = { vertices: [], normals: [], idx: [] };
    pushFlatFace(mesh, ring, FLAT_FACE_SEPARATION, [0, 0, 1], false);
    pushFlatFace(mesh, ring, -FLAT_FACE_SEPARATION, [0, 0, -1], true);
    return mesh;
};

/**
 * A unit square in the xy plane, centred on the origin and spanning -0.5 to 0.5 on each axis, so
 * the instance size gives its two side lengths directly. Double-sided.
 */
export const getPlane = (): ShapeMesh =>
    doubleSidedPolygon([
        [-0.5, -0.5],
        [0.5, -0.5],
        [0.5, 0.5],
        [-0.5, 0.5],
    ]);

/**
 * A filled circle of radius 1 in the xy plane, centred on the origin, so the instance size gives
 * its radius. Double-sided. `nSides` is the number of segments around the rim.
 */
export const getDisc = (nSides: number): ShapeMesh =>
    doubleSidedPolygon(
        Array.from({ length: nSides }, (_unused, i) => {
            const theta = (2 * Math.PI * i) / nSides;
            return [Math.cos(theta), Math.sin(theta)] as [number, number];
        })
    );

/**
 * A flat ring in the xy plane, centred on the origin: outer radius 1, inner radius `innerRatio`,
 * so the instance size gives the outer radius and the ratio is inner_radius / radius.
 *
 * Double-sided like the plane and disc, and for the same reason. It cannot go through
 * doubleSidedPolygon, because an annulus is not convex - a fan from one corner would cover the
 * hole. Instead each segment of the ring is a quad spanning inner to outer radius.
 *
 * `nSides` is the number of segments around the ring.
 */
export const getAnnulus = (innerRatio: number, nSides: number): ShapeMesh => {
    const mesh: ShapeMesh = { vertices: [], normals: [], idx: [] };
    const inner = Math.min(Math.max(innerRatio, 0), 1);

    const pushSide = (z: number, normal: Vec3, flip: boolean) => {
        for (let i = 0; i < nSides; i++) {
            const theta0 = (2 * Math.PI * i) / nSides;
            const theta1 = (2 * Math.PI * (i + 1)) / nSides;
            // Outer edge counter-clockwise, then back along the inner edge.
            const corners: [number, number][] = [
                [Math.cos(theta0), Math.sin(theta0)],
                [Math.cos(theta1), Math.sin(theta1)],
                [inner * Math.cos(theta1), inner * Math.sin(theta1)],
                [inner * Math.cos(theta0), inner * Math.sin(theta0)],
            ];
            const base = mesh.vertices.length / 3;
            corners.forEach(([x, y]) => {
                mesh.vertices.push(x, y, z);
                mesh.normals.push(...normal);
            });
            if (flip) {
                mesh.idx.push(base, base + 2, base + 1);
                // A zero inner radius collapses both inner corners onto the centre, leaving this
                // triangle degenerate - the shape is then simply a disc.
                if (inner > 0) mesh.idx.push(base, base + 3, base + 2);
            } else {
                mesh.idx.push(base, base + 1, base + 2);
                if (inner > 0) mesh.idx.push(base, base + 2, base + 3);
            }
        }
    };

    pushSide(FLAT_FACE_SEPARATION, [0, 0, 1], false);
    pushSide(-FLAT_FACE_SEPARATION, [0, 0, -1], true);

    return mesh;
};

/**
 * An ellipsoid centred on the origin with semi-axes rx, ry, rz.
 *
 * The axis lengths are baked into the mesh rather than left to a non-uniform instance size,
 * because the vertex shader rotates normals but does not scale them: under a non-uniform scale a
 * normal needs the inverse transpose, so a sphere squashed by the instance size would keep its
 * spherical normals and light as though it were still a sphere. A uniform instance scale leaves
 * normal directions alone, so the caller passes the shape here as a ratio and scales uniformly.
 *
 * The outward normal of an ellipsoid is the gradient of x^2/rx^2 + y^2/ry^2 + z^2/rz^2, i.e.
 * (x/rx^2, y/ry^2, z/rz^2) normalised - not the position, which is only true for a sphere.
 */
export const getEllipsoid = (
    rx: number,
    ry: number,
    rz: number,
    slices: number,
    stacks: number
): ShapeMesh => {
    // A zero axis would make the normal undefined; a degenerate ellipsoid is still drawable flat.
    const ax = Math.max(Math.abs(rx), 1e-6);
    const ay = Math.max(Math.abs(ry), 1e-6);
    const az = Math.max(Math.abs(rz), 1e-6);

    const vertices: number[] = [];
    const normals: number[] = [];
    const idx: number[] = [];

    // Rings of latitude from the south pole to the north, each of `slices` points of longitude.
    for (let i = 0; i <= stacks; i++) {
        const phi = -Math.PI / 2 + (Math.PI * i) / stacks;
        const cosPhi = Math.cos(phi);
        const sinPhi = Math.sin(phi);
        for (let j = 0; j < slices; j++) {
            const theta = (2 * Math.PI * j) / slices;
            const x = ax * cosPhi * Math.cos(theta);
            const y = ay * cosPhi * Math.sin(theta);
            const z = az * sinPhi;
            vertices.push(x, y, z);
            normals.push(...normalise([x / (ax * ax), y / (ay * ay), z / (az * az)]));
        }
    }

    const at = (i: number, j: number) => i * slices + (j % slices);

    for (let i = 0; i < stacks; i++) {
        for (let j = 0; j < slices; j++) {
            const a = at(i, j);
            const b = at(i, j + 1);
            const c = at(i + 1, j + 1);
            const d = at(i + 1, j);
            // Wound so that (+theta) x (+phi) is the outward normal. At the poles every point of
            // the ring is the same position, so one triangle of each quad there is degenerate.
            if (i > 0) idx.push(a, b, c);
            if (i < stacks - 1) idx.push(a, c, d);
        }
    }

    return { vertices, normals, idx };
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
 * An arc - a segment of a torus - sweeping from angle 0 in the xy plane, major radius 1, so the
 * instance size gives the major radius and `minorRatio` is minor_radius / major_radius.
 *
 * There is no start angle: the orientation already decides where the arc begins, so a start angle
 * would just be a second way of saying the same thing.
 *
 * The open ends are capped, otherwise you see through the hollow tube. A sweep of a full turn
 * closes on itself, and the caps are dropped so they do not sit on top of each other.
 *
 * @param {number} minorRatio - tube radius as a fraction of the major radius
 * @param {number} sweep - the angle swept, in radians
 */
export const getArc = (
    minorRatio: number,
    sweep: number,
    majorAccu: number,
    minorAccu: number
): ShapeMesh => {
    const fullTurn = 2 * Math.PI;
    const swept = Math.min(Math.max(sweep, 0), fullTurn);
    const closed = swept >= fullTurn - 1e-9;
    // Keep the segment density of a full torus, so a short arc is not over-tessellated.
    const segments = Math.max(2, Math.ceil((majorAccu * swept) / fullTurn));

    const vertices: number[] = [];
    const normals: number[] = [];
    const idx: number[] = [];

    const ringPoint = (theta: number, phi: number): { position: Vec3; normal: Vec3 } => {
        const normal: Vec3 = [
            Math.cos(theta) * Math.cos(phi),
            Math.sin(theta) * Math.cos(phi),
            Math.sin(phi),
        ];
        return {
            position: [
                Math.cos(theta) + minorRatio * normal[0],
                Math.sin(theta) + minorRatio * normal[1],
                minorRatio * normal[2],
            ],
            normal,
        };
    };

    // The tube surface. Unlike a torus this does not wrap in theta, so there is one more ring of
    // vertices than there are segments.
    for (let i = 0; i <= segments; i++) {
        const theta = (swept * i) / segments;
        for (let j = 0; j < minorAccu; j++) {
            const { position, normal } = ringPoint(theta, (2 * Math.PI * j) / minorAccu);
            vertices.push(...position);
            normals.push(...normal);
        }
    }

    for (let i = 0; i < segments; i++) {
        for (let j = 0; j < minorAccu; j++) {
            const nextJ = (j + 1) % minorAccu;
            const v00 = i * minorAccu + j;
            const v01 = i * minorAccu + nextJ;
            const v10 = (i + 1) * minorAccu + j;
            const v11 = (i + 1) * minorAccu + nextJ;
            idx.push(v00, v10, v11);
            idx.push(v00, v11, v01);
        }
    }

    if (!closed) {
        // A flat cap over each open end, facing along the tube's axis. At angle theta the tangent
        // is (-sin, cos, 0); the start cap faces backwards along it and the end cap forwards. The
        // ring runs counter-clockwise seen from -tangent, so the end cap takes it reversed.
        const pushCap = (theta: number, facingForward: boolean) => {
            const normal: Vec3 = [
                (facingForward ? 1 : -1) * -Math.sin(theta),
                (facingForward ? 1 : -1) * Math.cos(theta),
                0,
            ];
            const base = vertices.length / 3;
            vertices.push(Math.cos(theta), Math.sin(theta), 0);
            normals.push(...normal);
            for (let j = 0; j < minorAccu; j++) {
                const k = facingForward ? minorAccu - 1 - j : j;
                const { position } = ringPoint(theta, (2 * Math.PI * k) / minorAccu);
                vertices.push(...position);
                normals.push(...normal);
            }
            for (let j = 0; j < minorAccu; j++) {
                idx.push(base, base + 1 + j, base + 1 + ((j + 1) % minorAccu));
            }
        };
        pushCap(0, false);
        pushCap(swept, true);
    }

    return { vertices, normals, idx };
};

/**
 * A capsule - a cylinder with hemispherical ends - along z, centred on the origin, radius 1.
 *
 * `lengthRatio` is the total end-to-end length as a multiple of the radius, so the caller scales
 * uniformly by the radius. The shape is baked rather than scaled non-uniformly for the usual two
 * reasons: a [r, r, h] instance size would squash the hemispheres into ellipsoid caps, and the
 * shader does not scale normals.
 *
 * A length of less than twice the radius has no room for a cylindrical section and gives a sphere.
 */
export const getCapsule = (lengthRatio: number, slices: number, capStacks: number): ShapeMesh => {
    const halfLength = Math.max(0, lengthRatio / 2 - 1);

    // Rings of latitude from the south pole to the north. The two hemispheres are generated with
    // their own centres, so the gap between the last ring of one and the first of the other is
    // stitched into the cylindrical band - with radial normals, exactly as a cylinder wants.
    const rings: { r: number; z: number; nr: number; nz: number }[] = [];
    const hemisphere = (centreZ: number, fromEquator: boolean) => {
        for (let i = 0; i <= capStacks; i++) {
            const phi = fromEquator ?
                (Math.PI / 2) * (i / capStacks)
            :   -Math.PI / 2 + (Math.PI / 2) * (i / capStacks);
            rings.push({
                r: Math.cos(phi),
                z: centreZ + Math.sin(phi),
                nr: Math.cos(phi),
                nz: Math.sin(phi),
            });
        }
    };
    hemisphere(-halfLength, false);
    hemisphere(halfLength, true);

    const vertices: number[] = [];
    const normals: number[] = [];
    const idx: number[] = [];

    rings.forEach(ring => {
        for (let j = 0; j < slices; j++) {
            const theta = (2 * Math.PI * j) / slices;
            vertices.push(ring.r * Math.cos(theta), ring.r * Math.sin(theta), ring.z);
            normals.push(...normalise([ring.nr * Math.cos(theta), ring.nr * Math.sin(theta), ring.nz]));
        }
    });

    const at = (i: number, j: number) => i * slices + (j % slices);

    for (let i = 0; i < rings.length - 1; i++) {
        // With no cylindrical section the two equator rings coincide, leaving nothing to stitch.
        if (rings[i].r === rings[i + 1].r && rings[i].z === rings[i + 1].z) continue;
        const poleBelow = rings[i].r < 1e-12;
        const poleAbove = rings[i + 1].r < 1e-12;
        for (let j = 0; j < slices; j++) {
            const a = at(i, j);
            const b = at(i, j + 1);
            const c = at(i + 1, j + 1);
            const d = at(i + 1, j);
            if (!poleBelow) idx.push(a, b, c);
            if (!poleAbove) idx.push(a, c, d);
        }
    }

    return { vertices, normals, idx };
};

/**
 * A helix: a tube following a helical path, major radius 1, rising along z and centred on the
 * origin, so the caller scales uniformly by the major radius.
 *
 * Effectively an arc that climbs, which is why it needs no parameters of its own beyond the ones
 * an arc already has - `heightRatio` is the total rise and `sweep` may exceed a full turn.
 *
 * The tube is swept along a moving frame. The radial direction (cos t, sin t, 0) happens to stay
 * perpendicular to the helix tangent at every point, so it can be used directly as one axis of
 * that frame and the tube never twists relative to the axis.
 *
 * @param {number} minorRatio - tube radius as a fraction of the major radius
 * @param {number} heightRatio - total rise as a fraction of the major radius
 * @param {number} sweep - total angle swept, in radians; 4*pi is two turns
 */
export const getHelix = (
    minorRatio: number,
    heightRatio: number,
    sweep: number,
    majorAccu: number,
    minorAccu: number
): ShapeMesh => {
    const swept = Math.max(sweep, 1e-6);
    const segments = Math.max(2, Math.ceil((majorAccu * swept) / (2 * Math.PI)));
    const pitch = heightRatio / swept; // dz/dtheta
    const halfRise = heightRatio / 2;
    const invLen = 1 / Math.sqrt(1 + pitch * pitch);

    // A right-handed frame (u, w, tangent) at each point of the centre line.
    const frameAt = (theta: number) => {
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);
        return {
            centre: [cos, sin, -halfRise + pitch * theta] as Vec3,
            u: [cos, sin, 0] as Vec3,
            w: [-pitch * sin * invLen, pitch * cos * invLen, -invLen] as Vec3,
            tangent: [-sin * invLen, cos * invLen, pitch * invLen] as Vec3,
        };
    };

    const surfaceNormal = (frame: ReturnType<typeof frameAt>, phi: number): Vec3 => {
        const c = Math.cos(phi);
        const s = Math.sin(phi);
        return [
            c * frame.u[0] + s * frame.w[0],
            c * frame.u[1] + s * frame.w[1],
            c * frame.u[2] + s * frame.w[2],
        ];
    };

    const vertices: number[] = [];
    const normals: number[] = [];
    const idx: number[] = [];

    for (let i = 0; i <= segments; i++) {
        const frame = frameAt((swept * i) / segments);
        for (let j = 0; j < minorAccu; j++) {
            const normal = surfaceNormal(frame, (2 * Math.PI * j) / minorAccu);
            vertices.push(
                frame.centre[0] + minorRatio * normal[0],
                frame.centre[1] + minorRatio * normal[1],
                frame.centre[2] + minorRatio * normal[2]
            );
            normals.push(...normal);
        }
    }

    for (let i = 0; i < segments; i++) {
        for (let j = 0; j < minorAccu; j++) {
            const nextJ = (j + 1) % minorAccu;
            const a = i * minorAccu + j;
            const b = i * minorAccu + nextJ;
            const c = (i + 1) * minorAccu + nextJ;
            const d = (i + 1) * minorAccu + j;
            idx.push(a, b, c);
            idx.push(a, c, d);
        }
    }

    // Cap both open ends. Going round in increasing phi is counter-clockwise seen from +tangent,
    // so the start cap - which faces backwards along the tube - takes the ring reversed.
    const pushCap = (theta: number, facingForward: boolean) => {
        const frame = frameAt(theta);
        const sign = facingForward ? 1 : -1;
        const normal: Vec3 = [
            sign * frame.tangent[0],
            sign * frame.tangent[1],
            sign * frame.tangent[2],
        ];
        const base = vertices.length / 3;
        vertices.push(...frame.centre);
        normals.push(...normal);
        for (let j = 0; j < minorAccu; j++) {
            const k = facingForward ? j : minorAccu - 1 - j;
            const ringNormal = surfaceNormal(frame, (2 * Math.PI * k) / minorAccu);
            vertices.push(
                frame.centre[0] + minorRatio * ringNormal[0],
                frame.centre[1] + minorRatio * ringNormal[1],
                frame.centre[2] + minorRatio * ringNormal[2]
            );
            normals.push(...normal);
        }
        for (let j = 0; j < minorAccu; j++) {
            idx.push(base, base + 1 + j, base + 1 + ((j + 1) % minorAccu));
        }
    };
    pushCap(0, false);
    pushCap(swept, true);

    return { vertices, normals, idx };
};

/** Thickness of a wireframe edge, as a fraction of the shape's own radius. */
const WIREFRAME_RADIUS_FRACTION = 0.02

/** Segments around each edge tube. Six is plenty at these thicknesses. */
const WIREFRAME_TUBE_SIDES = 6

/**
 * Turn a flat-sided solid into a wireframe: a thin tube along each of its edges.
 *
 * The edges have to be recovered from the triangles, because the meshes carry no notion of a
 * polygon. The test is whether an edge is a crease: the triangles either side of a real edge
 * belong to different faces and so have different normals, whereas the diagonals introduced by
 * triangulating a polygon lie *within* one face and are shared by two triangles with the same
 * normal. Drawing every triangle edge instead would criss-cross each face with its fan diagonals.
 *
 * Vertices are welded by position first, because the flat-shaded meshes deliberately duplicate
 * every corner once per face so that each copy can carry its own normal.
 *
 * Only meaningful for flat-sided solids. A curved surface is all creases at this tolerance, so a
 * sphere or a torus would come out as a tube along every triangle edge.
 */
export const getWireframe = (mesh: ShapeMesh, sides: number = WIREFRAME_TUBE_SIDES): ShapeMesh => {
    const vertexCount = mesh.vertices.length / 3
    const at = (i: number): Vec3 => [mesh.vertices[3 * i], mesh.vertices[3 * i + 1], mesh.vertices[3 * i + 2]]

    // Weld by position. -0 is normalised to 0 so that it does not read as a separate corner.
    const positionKey = (v: Vec3) => v.map(x => (Math.abs(x) < 1e-12 ? 0 : x).toFixed(6)).join(",")
    const welded = new Map<string, number>()
    const weldedPositions: Vec3[] = []
    const weldedIndexOf: number[] = []
    for (let i = 0; i < vertexCount; i++) {
        const key = positionKey(at(i))
        if (!welded.has(key)) {
            welded.set(key, weldedPositions.length)
            weldedPositions.push(at(i))
        }
        weldedIndexOf[i] = welded.get(key)
    }

    // Record, for every welded edge, the normals of the triangles that use it.
    const edgeNormals = new Map<string, Vec3[]>()
    for (let t = 0; t < mesh.idx.length; t += 3) {
        const corners = [mesh.idx[t], mesh.idx[t + 1], mesh.idx[t + 2]]
        const [a, b, c] = corners.map(at)
        const faceNormal = normalise(cross(sub(b, a), sub(c, a)))
        if (length(faceNormal) < 0.5) continue // degenerate triangle, no meaningful normal
        for (let e = 0; e < 3; e++) {
            const from = weldedIndexOf[corners[e]]
            const to = weldedIndexOf[corners[(e + 1) % 3]]
            if (from === to) continue
            const key = `${Math.min(from, to)}-${Math.max(from, to)}`
            if (!edgeNormals.has(key)) edgeNormals.set(key, [])
            edgeNormals.get(key).push(faceNormal)
        }
    }

    const creases: [number, number][] = []
    edgeNormals.forEach((normals, key) => {
        const isCrease =
            normals.length === 1 || normals.some(n => Math.abs(dot(n, normals[0])) < 1 - 1e-6)
        if (isCrease) {
            const [from, to] = key.split("-").map(Number)
            creases.push([from, to])
        }
    })

    const shapeRadius = Math.max(...weldedPositions.map(length))
    const radius = Math.max(shapeRadius * WIREFRAME_RADIUS_FRACTION, 1e-6)

    const vertices: number[] = []
    const normals: number[] = []
    const idx: number[] = []

    creases.forEach(([from, to]) => {
        const start = weldedPositions[from]
        const end = weldedPositions[to]
        const axis = normalise(sub(end, start))

        // A right-handed frame (u, w, axis), so that increasing angle winds outward.
        const reference: Vec3 = Math.abs(axis[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]
        const u = normalise(cross(axis, reference))
        const w = cross(axis, u)

        // Overshoot each end by the tube radius so that the tubes meeting at a corner overlap
        // rather than leaving a notch. The caps then sit buried inside the joint.
        const ends = [
            sub(start, scale(axis, radius)),
            sub(end, scale(axis, -radius)),
        ]

        const base = vertices.length / 3
        ends.forEach(end_ => {
            for (let j = 0; j < sides; j++) {
                const theta = (2 * Math.PI * j) / sides
                const normal: Vec3 = [
                    Math.cos(theta) * u[0] + Math.sin(theta) * w[0],
                    Math.cos(theta) * u[1] + Math.sin(theta) * w[1],
                    Math.cos(theta) * u[2] + Math.sin(theta) * w[2],
                ]
                vertices.push(
                    end_[0] + radius * normal[0],
                    end_[1] + radius * normal[1],
                    end_[2] + radius * normal[2]
                )
                normals.push(...normal)
            }
        })

        for (let j = 0; j < sides; j++) {
            const nextJ = (j + 1) % sides
            idx.push(base + j, base + nextJ, base + sides + nextJ)
            idx.push(base + j, base + sides + nextJ, base + sides + j)
        }

        // Flat caps, facing out along the axis at each end.
        const pushCap = (centre: Vec3, normal: Vec3, reverse: boolean) => {
            const capBase = vertices.length / 3
            vertices.push(...centre)
            normals.push(...normal)
            for (let j = 0; j < sides; j++) {
                const k = reverse ? sides - 1 - j : j
                const theta = (2 * Math.PI * k) / sides
                vertices.push(
                    centre[0] + radius * (Math.cos(theta) * u[0] + Math.sin(theta) * w[0]),
                    centre[1] + radius * (Math.cos(theta) * u[1] + Math.sin(theta) * w[1]),
                    centre[2] + radius * (Math.cos(theta) * u[2] + Math.sin(theta) * w[2])
                )
                normals.push(...normal)
            }
            for (let j = 0; j < sides; j++) {
                idx.push(capBase, capBase + 1 + j, capBase + 1 + ((j + 1) % sides))
            }
        }
        // The ring runs counter-clockwise seen from +axis, because (u, w, axis) is right-handed.
        // So the cap facing back down the axis takes it reversed, and the forward-facing one does
        // not - the same handedness rule as the helix and arc caps.
        pushCap(ends[0], scale(axis, -1), true)
        pushCap(ends[1], axis, false)
    })

    return { vertices, normals, idx }
}

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
