import { readFileSync } from "fs";
import { join } from "path";
import { m2tAtomRadius } from "../../src/utils/m2tAtomRadii";
import { newOwnerNumbering, ownedMeshPickInfo } from "../../src/WebGLgComponents/ownedMeshPick";
import {
    atomSurfaceColours, atomSurfaceInfluences, atomSurfaceMesh, smoothVertexColours, vertexNeighbours, contourField, featureTransform3d, meshConventions, nearestVertices, residueCid, sesField,
    smoothM2tSurface, smoothSurfaceFromAtomsSync, transferM2tAttributes, vertexAtoms,
} from "../../src/utils/smoothSurface";

const radialStats = (positions: Float32Array, centre: number[]) => {
    let min = Infinity, max = -Infinity, sum = 0;
    const n = positions.length / 3;
    for (let v = 0; v < n; v++) {
        const d = Math.hypot(positions[3 * v] - centre[0], positions[3 * v + 1] - centre[1], positions[3 * v + 2] - centre[2]);
        min = Math.min(min, d); max = Math.max(max, d); sum += d;
    }
    return { min, max, mean: sum / n };
};

describe("smoothSurface", () => {
    test("featureTransform3d gives every point its nearest seed", () => {
        const n = 9;
        const feature = new Int32Array(n * n * n).fill(-1);
        feature[(2 * n + 2) * n + 2] = 7;
        feature[(6 * n + 6) * n + 6] = 11;
        const scratch = new Float32Array(n * n * n);
        featureTransform3d(feature, scratch, n, n, n);
        expect(feature[0]).toBe(7);
        expect(feature[n * n * n - 1]).toBe(11);
        expect(feature[(3 * n + 3) * n + 3]).toBe(7);
        expect(feature[(5 * n + 5) * n + 5]).toBe(11);
        expect(scratch[(2 * n + 2) * n + 5]).toBe(9);
    });

    test("one atom's SES is its van der Waals sphere", () => {
        const grid = sesField([{ x: 1, y: 2, z: 3, r: 1.7 }], 1.4, 0.25, 0);
        const mesh = contourField(grid);
        expect(mesh.indices.length).toBeGreaterThan(0);
        const { min, max, mean } = radialStats(mesh.positions, [1, 2, 3]);
        expect(Math.abs(mean - 1.7)).toBeLessThan(0.1);
        expect(max - min).toBeLessThan(0.3);
    });

    test("blurring keeps the enclosed volume", () => {
        const atoms = [{ x: 0, y: 0, z: 0, r: 1.7 }, { x: 2.5, y: 0, z: 0, r: 1.7 }, { x: 1.2, y: 2.2, z: 0, r: 1.55 }];
        const volume = (sigma: number) => {
            const grid = sesField(atoms, 1.4, 0.3, sigma);
            return grid.field.reduce((n, v) => n + (v > grid.iso ? 1 : 0), 0);
        };
        expect(Math.abs(volume(0.9) / volume(0) - 1)).toBeLessThan(0.01);
    });

    // The field is exact to within the grid's interpolation: distances are to the SAS's own
    // spheres, circles and three-sphere points, not to voxel centres. Checked unblurred, at 0.35 A,
    // against each kind of SES patch's exact shape.
    const surfaceError = (mesh: ReturnType<typeof contourField>, select: (x: number[]) => number[] | null, radius: number) => {
        let worstPosition = 0, worstDegrees = 0, n = 0;
        for (let v = 0; v < mesh.positions.length / 3; v++) {
            const x = [mesh.positions[3 * v], mesh.positions[3 * v + 1], mesh.positions[3 * v + 2]];
            const centre = select(x);
            if (!centre) continue;
            const to = [centre[0] - x[0], centre[1] - x[1], centre[2] - x[2]];
            const dist = Math.hypot(to[0], to[1], to[2]);
            worstPosition = Math.max(worstPosition, Math.abs(dist - Math.abs(radius)));
            const sign = radius < 0 ? -1 : 1;
            const cos = sign * (to[0] * mesh.normals[3 * v] + to[1] * mesh.normals[3 * v + 1] + to[2] * mesh.normals[3 * v + 2]) / dist;
            worstDegrees = Math.max(worstDegrees, Math.acos(Math.min(1, cos)) * 180 / Math.PI);
            n++;
        }
        return { worstPosition, worstDegrees, n };
    };

    test("a convex cap is the atom's sphere", () => {
        const c = [0.12, 0.27, 0.05];
        const mesh = contourField(sesField([{ x: c[0], y: c[1], z: c[2], r: 8 }], 1.4, 0.35, 0));
        // Normals point away from the centre: radius given negative.
        const e = surfaceError(mesh, () => c, -8);
        expect(e.worstPosition).toBeLessThan(0.01);
        expect(e.worstDegrees).toBeLessThan(3);
    });

    test("normals are reconstructed smoothly across grid cells", () => {
        // A cubic along each vertex's grid edge, fourth-order differences across it: on a sphere
        // the size of an atom cap, at the default grid, half the error of second-order differences
        // interpolated linearly (0.145 degrees mean, 0.34 worst), whose error followed each vertex's
        // place in its cell and showed the grid in the diffuse light as a pattern of squares.
        const c = [0.13, 0.27, 0.05];
        const mesh = contourField(sesField([{ x: c[0], y: c[1], z: c[2], r: 3 }], 1.4, 0.5, 0));
        let sum = 0, worst = 0;
        const n = mesh.positions.length / 3;
        for (let v = 0; v < n; v++) {
            const d = [0, 1, 2].map(k => mesh.positions[3 * v + k] - c[k]);
            const l = Math.hypot(d[0], d[1], d[2]);
            const degrees = Math.acos(Math.min(1, (d[0] * mesh.normals[3 * v] + d[1] * mesh.normals[3 * v + 1] + d[2] * mesh.normals[3 * v + 2]) / l)) * 180 / Math.PI;
            sum += degrees;
            worst = Math.max(worst, degrees);
        }
        expect(sum / n).toBeLessThan(0.1);
        expect(worst).toBeLessThan(0.27);
    });

    test("splitting the contour keeps it on the sphere and its normals as accurate", () => {
        const c = [0.13, 0.27, 0.05];
        const grid = sesField([{ x: c[0], y: c[1], z: c[2], r: 3 }], 1.4, 0.5, 0);
        const coarse = contourField(grid);
        const fine = contourField(grid, true);
        expect(fine.indices.length).toBe(4 * coarse.indices.length);
        const e = surfaceError(fine, () => c, -3);
        expect(e.worstPosition).toBeLessThan(0.01);
        // A little behind edgeNormals' 0.27 worst: a midpoint's normal is a tricubic in the middle
        // of a cell, where edgeNormals' is a cubic along a grid edge.
        expect(e.worstDegrees).toBeLessThan(0.45);
        expect(meshConventions(fine.positions, fine.normals, fine.indices)).toEqual({ out: true, ccw: true });
    });

    test("a split contour is closed", () => {
        const grid = sesField([{ x: 0, y: 0, z: 0, r: 1.7 }, { x: 3, y: 0.5, z: 0, r: 1.52 }, { x: 1.4, y: 2.4, z: 0.3, r: 1.55 }], 1.4, 0.3, 0.6);
        const { indices } = contourField(grid, true);
        const edges = new Map<string, number>();
        for (let t = 0; t < indices.length; t += 3) {
            for (let k = 0; k < 3; k++) {
                const a = indices[t + k], b = indices[t + (k + 1) % 3];
                const key = a < b ? `${a},${b}` : `${b},${a}`;
                edges.set(key, (edges.get(key) ?? 0) + 1);
            }
        }
        expect([...edges.values()].every(count => count === 2)).toBe(true);
    });

    test("a saddle between two atoms is the probe's torus", () => {
        const r = 1.9, p = 1.4, d = 3.4, o = [0.13, 0.21, 0.07];
        const rc = Math.sqrt((r + p) ** 2 - (d / 2) ** 2);
        const mesh = contourField(sesField([{ x: o[0] - d / 2, y: o[1], z: o[2], r }, { x: o[0] + d / 2, y: o[1], z: o[2], r }], p, 0.35, 0));
        const e = surfaceError(mesh, x => {
            const rho = Math.hypot(x[1] - o[1], x[2] - o[2]);
            if (Math.abs(x[0] - o[0]) > 0.6 || rho < 1e-6) return null;
            return [o[0], o[1] + (x[1] - o[1]) * rc / rho, o[2] + (x[2] - o[2]) * rc / rho];
        }, p);
        expect(e.n).toBeGreaterThan(50);
        expect(e.worstPosition).toBeLessThan(0.03);
        expect(e.worstDegrees).toBeLessThan(5);
    });

    test("a dimple between three atoms is the probe's sphere", () => {
        const r = 1.9, p = 1.4, side = 3.6, o = [0.11, 0.23, 0.05];
        const circ = side / Math.sqrt(3);
        const atoms = [0, 1, 2].map(k => ({ x: o[0] + circ * Math.cos(2 * Math.PI * k / 3), y: o[1] + circ * Math.sin(2 * Math.PI * k / 3), z: o[2], r }));
        const height = Math.sqrt((r + p) ** 2 - circ ** 2);
        const mesh = contourField(sesField(atoms, p, 0.35, 0));
        const e = surfaceError(mesh, x => Math.hypot(x[0] - o[0], x[1] - o[1]) > 0.4 ? null : [o[0], o[1], o[2] + Math.sign(x[2] - o[2]) * height], p);
        expect(e.n).toBeGreaterThan(8);
        expect(e.worstPosition).toBeLessThan(0.08);
        expect(e.worstDegrees).toBeLessThan(6);
    });

    test("no false cavities inside a protein (1df7)", () => {
        // A projection onto an atom's sphere can land on its far side, buried by atoms the seed it
        // came from never saw; judged by the seed's atoms alone, that once put spots of "outside"
        // deep inside the protein, which a capped blur then kept as cavities.
        const atoms = readFileSync(join(__dirname, "../test_data/1df7.pdb"), "utf8").split("\n")
            .filter(line => /^(ATOM|HETATM)/.test(line) && line.slice(17, 20) !== "HOH" && [" ", "A"].includes(line[16]))
            .map(line => ({
                x: parseFloat(line.slice(30, 38)), y: parseFloat(line.slice(38, 46)), z: parseFloat(line.slice(46, 54)),
                r: m2tAtomRadius(line.slice(12, 16), line.slice(17, 20)),
            }));
        const grid = sesField(atoms, 1.4, 0.5, 0);
        let negative = 0, checked = 0;
        const cell = new Map<string, number[]>();
        atoms.forEach((a, n) => {
            const key = [a.x, a.y, a.z].map(v => Math.floor(v)).join();  // 1 A cells
            cell.set(key, [...(cell.get(key) ?? []), n]);
        });
        for (let k = 0; k < grid.nz; k++) for (let j = 0; j < grid.ny; j++) for (let i = 0; i < grid.nx; i++) {
            const p = [grid.origin[0] + i * grid.spacing, grid.origin[1] + j * grid.spacing, grid.origin[2] + k * grid.spacing];
            // How far inside an atom the point is. The SES encloses every atom, so the distance to
            // it from inside one is at least that.
            let depth = 0;
            for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) for (let dz = -2; dz <= 2; dz++) {
                for (const n of cell.get([Math.floor(p[0]) + dx, Math.floor(p[1]) + dy, Math.floor(p[2]) + dz].join()) ?? []) {
                    depth = Math.max(depth, atoms[n].r - Math.hypot(atoms[n].x - p[0], atoms[n].y - p[1], atoms[n].z - p[2]));
                }
            }
            if (depth <= 0) continue;
            checked++;
            // The field stops at 2 grid steps in when unblurred.
            if (grid.field[(k * grid.ny + j) * grid.nx + i] < Math.min(depth, 2 * grid.spacing) - 0.05) negative++;
        }
        expect(checked).toBeGreaterThan(1000);
        expect(negative).toBe(0);
    });

    test("with no probe it is the van der Waals surface, and on spheres of r + probe the accessible surface", () => {
        const c = [0.12, 0.27, 0.05];
        const vdw = contourField(sesField([{ x: c[0], y: c[1], z: c[2], r: 1.7 }], 0, 0.35, 0));
        const vdwError = surfaceError(vdw, () => c, -1.7);
        expect(vdwError.worstPosition).toBeLessThan(0.01);
        expect(vdwError.worstDegrees).toBeLessThan(3);
        const accessible = contourField(sesField([{ x: c[0], y: c[1], z: c[2], r: 1.7 + 1.4 }], 0, 0.35, 0));
        expect(surfaceError(accessible, () => c, -3.1).worstPosition).toBeLessThan(0.01);
        // Two overlapping atoms: the crease where they meet is kept, and nothing bridges it.
        const pair = contourField(sesField([{ x: -1, y: 0, z: 0, r: 1.7 }, { x: 1, y: 0, z: 0, r: 1.7 }], 0, 0.35, 0));
        const e = surfaceError(pair, x => [x[0] < 0 ? -1 : 1, 0, 0], -1.7);
        // The crease is a sharp edge, which marching cubes cuts across within a cell.
        expect(e.worstPosition).toBeLessThan(0.1);
    });

    // Connected pieces of a mesh, by its shared vertices.
    const components = (indices: Uint32Array, vertices: number) => {
        const parent = Int32Array.from({ length: vertices }, (_, i) => i);
        const find = (i: number): number => { while (parent[i] !== i) i = parent[i] = parent[parent[i]]; return i; };
        for (let t = 0; t < indices.length; t += 3) {
            const a = find(indices[t]);
            parent[find(indices[t + 1])] = a;
            parent[find(indices[t + 2])] = a;
        }
        const roots = new Set<number>();
        for (let t = 0; t < indices.length; t++) roots.add(find(indices[t]));
        return roots.size;
    };

    test("the opening cuts a pinched neck into two lobes and leaves a proper saddle alone", () => {
        // 6 A apart, radius 2: the probe (2.8 A across) cannot pass between them, and its circle
        // of positions touching both (radius 1.6 A) is barely wider than the probe, so the SES joins
        // them by a neck about 0.2 A thick - the "singularity" look. (Further apart, the circle is
        // narrower than the probe and the two sides end in cone tips instead, which the opening
        // rounds too.)
        const pinched = [{ x: -3, y: 0.1, z: 0.05, r: 2 }, { x: 3, y: 0.1, z: 0.05, r: 2 }];
        const plain = contourField(sesField(pinched, 1.4, 0.3, 0));
        expect(components(plain.indices, plain.positions.length / 3)).toBe(1);
        const opened = contourField(sesField(pinched, 1.4, 0.3, 0, Infinity, 0.5));
        expect(components(opened.indices, opened.positions.length / 3)).toBe(2);
        // Each lobe is still its atom's sphere where the atom is exposed.
        const e = surfaceError(opened, x => Math.abs(x[0]) > 3.2 ? [Math.sign(x[0]) * 3, 0.1, 0.05] : null, -2);
        expect(e.worstPosition).toBeLessThan(0.02);

        // A proper saddle (3.4 A apart, radius 1.9: a neck of radius 1.4 A) is unchanged.
        const pair = [{ x: -1.7, y: 0.21, z: 0.07, r: 1.9 }, { x: 1.7, y: 0.21, z: 0.07, r: 1.9 }];
        const before = sesField(pair, 1.4, 0.3, 0);
        const after = sesField(pair, 1.4, 0.3, 0, Infinity, 0.5);
        let changed = 0;
        for (let i = 0; i < before.field.length; i++) {
            // Compare where both are within the unopened field's clamp.
            if (Math.abs(before.field[i]) < 0.5 && Math.abs(after.field[i] - before.field[i]) > 1e-6) changed++;
        }
        expect(changed).toBe(0);
    });

    test("concave patches match a brute-force SES (1df7)", () => {
        // In pits and pockets the probe touches two, three or more atoms, often where several
        // overlap, and can fit in places no grid point falls in. Checked against the exact
        // distance to the probe-centre set, by brute force over every sphere, circle and
        // three-sphere point near each vertex: on the surface it is the probe radius.
        const P = 1.4;
        const atoms = readFileSync(join(__dirname, "../test_data/1df7.pdb"), "utf8").split("\n")
            .filter(line => /^(ATOM|HETATM)/.test(line) && line.slice(17, 20) !== "HOH" && [" ", "A"].includes(line[16]))
            .map(line => ({
                x: parseFloat(line.slice(30, 38)), y: parseFloat(line.slice(38, 46)), z: parseFloat(line.slice(46, 54)),
                r: m2tAtomRadius(line.slice(12, 16), line.slice(17, 20)),
            }));
        type V = [number, number, number];
        const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
        const len = (a: V) => Math.hypot(a[0], a[1], a[2]);
        const truth = (x: V) => {
            const near = atoms.filter(a => len(sub([a.x, a.y, a.z], x)) < a.r + P + 2.5).map(a => ({ c: [a.x, a.y, a.z] as V, R: a.r + P }));
            const free = (q: V, skip: number[]) => near.every((a, i) => skip.includes(i) || len(sub(q, a.c)) >= a.R - 1e-6);
            let best = Infinity;
            const consider = (q: V, skip: number[]) => { const d = len(sub(q, x)); if (d < best && free(q, skip)) best = d; };
            near.forEach((a, i) => { const d = sub(x, a.c); const l = len(d); consider([a.c[0] + a.R * d[0] / l, a.c[1] + a.R * d[1] / l, a.c[2] + a.R * d[2] / l], [i]); });
            for (let i = 0; i < near.length; i++) for (let j = i + 1; j < near.length; j++) {
                const A = near[i], B = near[j], u0 = sub(B.c, A.c), d = len(u0);
                if (d >= A.R + B.R) continue;
                const u: V = [u0[0] / d, u0[1] / d, u0[2] / d], t = (d * d + A.R * A.R - B.R * B.R) / (2 * d), r2 = A.R * A.R - t * t;
                if (r2 <= 0) continue;
                const C: V = [A.c[0] + t * u[0], A.c[1] + t * u[1], A.c[2] + t * u[2]];
                let w = sub(x, C); const al = w[0] * u[0] + w[1] * u[1] + w[2] * u[2];
                w = [w[0] - al * u[0], w[1] - al * u[1], w[2] - al * u[2]]; const wl = len(w), rc = Math.sqrt(r2);
                if (wl > 1e-9) consider([C[0] + rc * w[0] / wl, C[1] + rc * w[1] / wl, C[2] + rc * w[2] / wl], [i, j]);
                for (let k = j + 1; k < near.length; k++) {
                    const Cc = near[k], wv = sub(Cc.c, A.c), ii = wv[0] * u[0] + wv[1] * u[1] + wv[2] * u[2];
                    const v0: V = [wv[0] - ii * u[0], wv[1] - ii * u[1], wv[2] - ii * u[2]], jj = len(v0);
                    if (jj < 1e-6) continue;
                    const e2: V = [v0[0] / jj, v0[1] / jj, v0[2] / jj];
                    const e3: V = [u[1] * e2[2] - u[2] * e2[1], u[2] * e2[0] - u[0] * e2[2], u[0] * e2[1] - u[1] * e2[0]];
                    const uu = (A.R * A.R - B.R * B.R + d * d) / (2 * d), tt = (A.R * A.R - Cc.R * Cc.R + ii * ii + jj * jj) / (2 * jj) - (ii / jj) * uu;
                    const h2 = A.R * A.R - uu * uu - tt * tt;
                    if (h2 < 0) continue;
                    for (const sgn of [1, -1]) consider([0, 1, 2].map(m => A.c[m] + uu * u[m] + tt * e2[m] + sgn * Math.sqrt(h2) * e3[m]) as V, [i, j, k]);
                }
            }
            return best;
        };
        // The nearest exposed SAS point comes from the exposed arcs (exposedSas), exactly: 95%
        // 0.012 A, worst 0.069 A at this grid. (Following burying atoms one at a time, the first
        // only, was 95% 0.047 A, worst 0.21 A; all of them, the old `cavities` option, 0.012 and
        // 0.072 at 1.7 times the cost.)
        for (const [worst95, worst] of [[0.02, 0.1]] as const) {
            const mesh = contourField(sesField(atoms, P, 0.4, 0, Infinity, 0));
            const errors: number[] = [];
            for (let v = 0; v < mesh.positions.length / 3 && errors.length < 400; v += 13) {
                const x: V = [mesh.positions[3 * v], mesh.positions[3 * v + 1], mesh.positions[3 * v + 2]];
                if (atoms.some(a => len(sub([a.x, a.y, a.z], x)) - a.r < 0.05)) continue; // on an atom: convex
                errors.push(Math.abs(truth(x) - P));
            }
            errors.sort((a, b) => a - b);
            expect(errors.length).toBeGreaterThan(200);
            expect(errors[Math.floor(0.95 * (errors.length - 1))]).toBeLessThan(worst95);
            expect(errors[errors.length - 1]).toBeLessThan(worst);
        }
    });

    test("normals point out and triangles wind counter-clockwise about them", () => {
        const grid = sesField([{ x: 0, y: 0, z: 0, r: 1.7 }, { x: 2.5, y: 0, z: 0, r: 1.7 }], 1.4, 0.3, 0.6);
        const mesh = contourField(grid);
        expect(meshConventions(mesh.positions, mesh.normals, mesh.indices)).toEqual({ out: true, ccw: true });
    });

    test("the surface is closed: every edge is shared by exactly two triangles", () => {
        const grid = sesField([{ x: 0, y: 0, z: 0, r: 1.7 }, { x: 3, y: 0.5, z: 0, r: 1.52 }, { x: 1.4, y: 2.4, z: 0.3, r: 1.55 }], 1.4, 0.3, 0.6);
        const { indices } = contourField(grid);
        const edges = new Map<string, number>();
        for (let t = 0; t < indices.length; t += 3) {
            for (let k = 0; k < 3; k++) {
                const a = indices[t + k], b = indices[t + (k + 1) % 3];
                const key = a < b ? `${a},${b}` : `${b},${a}`;
                edges.set(key, (edges.get(key) ?? 0) + 1);
            }
        }
        expect([...edges.values()].every(count => count === 2)).toBe(true);
    });

    test("the probe fills the groove between two touching atoms", () => {
        // A point on the axis between two atoms, just outside both spheres' surfaces in the
        // groove: outside the vdW surface but inside the SES.
        const grid = sesField([{ x: -1.6, y: 0, z: 0, r: 1.7 }, { x: 1.6, y: 0, z: 0, r: 1.7 }], 1.4, 0.2, 0);
        const { field, nx, ny, origin, spacing } = grid;
        const at = (x: number, y: number, z: number) => {
            const i = Math.round((x - origin[0]) / spacing), j = Math.round((y - origin[1]) / spacing), k = Math.round((z - origin[2]) / spacing);
            return field[(k * ny + j) * nx + i];
        };
        // Distance from (0, 0.8, 0) to either centre is ~1.79 > 1.7: outside both spheres.
        expect(at(0, 0.8, 0)).toBeGreaterThan(0);
        expect(at(0, 4, 0)).toBeLessThan(0);
    });

    test("residue owners are named as M2T names them", () => {
        expect(residueCid("1", "A", "23", "ALA")).toBe("/1/A/23(ALA)");
        expect(residueCid("1", "B", "23A", "GLY")).toBe("/1/B/23(GLY).A");
        expect(residueCid("2", "C", "-4", "SER")).toBe("/2/C/-4(SER)");
    });

    test("a vertex belongs to the atom it lies on, and in a groove is shared with the other residue", () => {
        // Atom 2 is residue 0's too, far away: it must not be anyone's other.
        const atoms = [{ x: 0, y: 0, z: 0, r: 1.7 }, { x: 3, y: 0, z: 0, r: 1.7 }, { x: 0, y: 0, z: 10, r: 1.5 }];
        const residueOf = [0, 1, 0];
        // On atom 0's far side; in the groove, as near one sphere as the other; on atom 1's far side.
        const positions = new Float32Array([-1.7, 0, 0, 1.5, 1.2, 0, 4.7, 0, 0]);
        const v = vertexAtoms(positions, atoms, residueOf, 1.4);
        expect(Array.from(v.atom)).toEqual([0, 0, 1]);
        expect(Array.from(v.other)).toEqual([-1, 1, -1]);
        expect(v.weight[0]).toBe(1);
        expect(v.weight[1]).toBeCloseTo(0.5, 5);
        expect(v.weight[2]).toBe(1);
        // For colour, the nearest atoms whatever their residue, nearest first.
        expect(Array.from(v.near.slice(0, 4))).toEqual([0, -1, -1, -1]);
        expect(Array.from(v.near.slice(4, 8))).toEqual([0, 1, -1, -1]);
        expect(v.nearGap[4]).toBeCloseTo(v.nearGap[5], 5);
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

    test("a surface from the atoms alone is closed, wound as M2T's, and every vertex has an atom", () => {
        const atoms = [{ x: 0, y: 0, z: 0, r: 1.7 }, { x: 3, y: 0.5, z: 0, r: 1.52 }, { x: 1.4, y: 2.4, z: 0.3, r: 1.55 }];
        const surface = smoothSurfaceFromAtomsSync(atoms, [0, 1, 1], 1.4, { spacing: 0.3, refine: true })!;
        expect(surface).not.toBeNull();
        expect(meshConventions(surface.positions, surface.normals, surface.indices)).toEqual({ out: true, ccw: true });
        expect(Array.from(surface.atom).every(a => a >= 0 && a < 3)).toBe(true);
        const edges = new Map<string, number>();
        for (let t = 0; t < surface.indices.length; t += 3) {
            for (let k = 0; k < 3; k++) {
                const a = surface.indices[t + k], b = surface.indices[t + (k + 1) % 3];
                const key = a < b ? `${a},${b}` : `${b},${a}`;
                edges.set(key, (edges.get(key) ?? 0) + 1);
            }
        }
        expect([...edges.values()].every(count => count === 2)).toBe(true);
    });

    test("nearestVertices finds the nearest source vertex", () => {
        const source = new Float32Array([0, 0, 0, 10, 0, 0, 0, 7, 0]);
        const queries = new Float32Array([1, 0, 0, 9, 1, 0, 0, 5, 0, 30, 30, 30]);
        expect(Array.from(nearestVertices(queries, source))).toEqual([0, 1, 2, 1]);
    });

    test("attributes come from the nearest M2T vertex", () => {
        const out = transferM2tAttributes(new Float32Array([0.1, 0, 0, 9.9, 0, 0]), {
            positions: [0, 0, 0, 10, 0, 0],
            colours: [1, 0, 0, 1, 0, 0, 1, 1],
            colourStride: 4,
            owners: [3, 5],
            ownersOther: [0xFFFFFFFF, 4],
            ownerWeights: [1, 0.25],
        });
        expect(Array.from(out.colours)).toEqual([1, 0, 0, 1, 0, 0, 1, 1]);
        expect(Array.from(out.owners)).toEqual([3, 5]);
        expect(Array.from(out.ownersOther)).toEqual([0xFFFFFFFF, 4]);
        expect(Array.from(out.ownerWeights)).toEqual([1, 0.25]);
    });

    test("smoothM2tSurface follows the M2T mesh's winding and keeps its owner table", async () => {
        // A stand-in "M2T surface": the smooth surface of the same atom, wound clockwise.
        const atoms = [{ x: 0, y: 0, z: 0, r: 1.7 }];
        const sphere = contourField(sesField(atoms, 1.4, 0.4, 0));
        const cw = sphere.indices.slice();
        for (let t = 0; t < cw.length; t += 3) [cw[t + 1], cw[t + 2]] = [cw[t + 2], cw[t + 1]];
        const n = sphere.positions.length / 3;
        const m2t = {
            vert_tri: [[sphere.positions]] as [[Float32Array]],
            norm_tri: [[sphere.normals]] as [[Float32Array]],
            col_tri: [[new Float32Array(4 * n).fill(0.5)]] as [[Float32Array]],
            idx_tri: [[cw]] as [[Uint32Array]],
            vertex_owners: new Uint32Array(n),
            owners: ["/1/A/1(ALA)"],
            prim_types: [["TRIANGLES"]],
        };
        const smoothed = await smoothM2tSurface(m2t, atoms, 1.4, { spacing: 0.3, sigma: 0.5 });
        expect(smoothed.owners).toEqual(["/1/A/1(ALA)"]);
        expect((smoothed.vertex_owners as Uint32Array).length).toBe(smoothed.vert_tri[0][0].length / 3);
        expect(meshConventions(smoothed.vert_tri[0][0], smoothed.norm_tri[0][0], smoothed.idx_tri[0][0]).ccw).toBe(false);
    });
});
