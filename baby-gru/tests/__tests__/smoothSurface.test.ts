import {
    contourField, featureTransform3d, meshConventions, nearestVertices, sesField, smoothM2tSurface, transferM2tAttributes,
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
