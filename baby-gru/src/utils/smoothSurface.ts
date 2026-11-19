/**
 * A smoothed molecular surface: the solvent-excluded surface as a signed distance field on a
 * grid, blurred, then contoured.
 *
 * The M2T `MolecularSurface` is the exact SES - a convex cap per exposed atom, joined by saddles
 * and concave patches - and reads as "latex stretched over beads". Blurring the SES distance
 * field and contouring it at zero keeps the shape of the molecule at the scale of a few Å and
 * rounds away the per-atom caps below it.
 *
 * 1. SAS occupancy: grid points within r + probe of an atom. The rest - the SAS exterior - is
 *    where the probe's centre can be.
 * 2. Seeds: the exterior points next to the SAS, each given the exact nearest point of the SAS
 *    surface - on an atom's expanded sphere, or on the circle where two meet (the creases the
 *    SES's concave patches roll along).
 * 3. Every point's nearest seed (a feature transform: one EDT that remembers which seed won), and
 *    the field is the exact distance to that seed's surface point less the probe radius. The SES
 *    is where that distance is the probe radius - rolling the probe is eroding the SAS by it - so
 *    this is the SES's signed distance: positive inside, negative in the probe's reach, -probe
 *    beyond. Distances to exact surface points rather than to voxel centres take the voxel-sized
 *    ripple out of the field, which is what showed in the shading at coarser grids.
 * 4. Gaussian blur, separable.
 * 5. Marching cubes at 0 (the table metaballs use: WebGPUComponents/metaballs/mcTable.ts), with
 *    normals from the blurred field's gradient rather than from the triangles, so shading is as
 *    smooth as the field.
 *
 * Colour and residue ownership are not computed here: they are copied from the nearest vertex of
 * the M2T surface (transferM2tAttributes), so colour rules, electrostatics and per-residue hover
 * all carry over without knowing anything about this path.
 *
 * Roadmap: src/.roadmaps/smooth-surface.md.
 */
import { MC_TRIANGLE_TABLE } from "../WebGPUComponents/metaballs/mcTable";

/** The dev-menu switch and its parameters. Read when a MolecularSurface is (re)built. */
export const smoothSurfaceSetting = {
    enabled: true,
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
     * Pits and pockets made exactly: where a projection is buried by several atoms, every one is
     * followed rather than the first. Probe positions too small for the grid are always found
     * (step 2 of sesField), which is most of the accuracy (1df7's concave patches at a 0.4 A grid,
     * against a brute-force SES: mean 0.0065 A, 95% within 0.014 A, worst 0.195 A; with this, 0.0047,
     * 0.012, 0.069); this adds the rest at about 1.7 times the field's cost again. To be on by
     * default once the field is made on the GPU.
     */
    cavities: false,
    /**
     * Split every triangle once, with positions and normals from the field (refineContour): the
     * diffuse light's diamonds at a 0.5 A grid mostly gone, for four times the triangles rather
     * than eight times the field a 0.25 A grid costs.
     */
    refine: true,
    /**
     * Marching cubes with the WebGPU MetaBalls kernels, when WebGPU is there; the field and the
     * colours stay in the Coot worker. Without WebGPU, all of it in the worker, on the CPU.
     */
    gpu: true,
};

/** At most this many grid points; above it the spacing is raised until the grid fits. */
const MAX_GRID_POINTS = 24_000_000;

export interface SurfaceAtom {
    x: number;
    y: number;
    z: number;
    /** Van der Waals radius, Å. */
    r: number;
}

export interface SesGrid {
    /** Signed distance, Å: positive inside the surface, negative outside. x fastest, then y, z. */
    field: Float32Array;
    nx: number;
    ny: number;
    nz: number;
    origin: [number, number, number];
    spacing: number;
    /** The level to contour at: inside is above it. */
    iso: number;
    /** Where the time went, ms. */
    timings: { sas: number; seeds: number; transform: number; distance: number; blur: number };
}

const EDT_INF = 1e20;

/**
 * Felzenszwalb & Huttenlocher's 1D squared distance transform of f into d, both of length n, and
 * which site won: src[q] is the position along the line of the nearest site to q. v and z are
 * scratch of at least n and n + 1.
 */
function edt1dFeature(f: Float64Array, d: Float64Array, src: Int32Array, n: number, v: Int32Array, z: Float64Array): void {
    let k = 0;
    v[0] = 0;
    z[0] = -Infinity;
    z[1] = Infinity;
    for (let q = 1; q < n; q++) {
        let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
        while (s <= z[k]) {
            k--;
            s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
        }
        k++;
        v[k] = q;
        z[k] = s;
        z[k + 1] = Infinity;
    }
    k = 0;
    for (let q = 0; q < n; q++) {
        while (z[k + 1] < q) k++;
        const dq = q - v[k];
        d[q] = dq * dq + f[v[k]];
        src[q] = v[k];
    }
}

/**
 * The feature transform: for every point, which seed is nearest (by grid distance between voxel
 * centres), as `feature` holds it - a seed's own value where feature >= 0, -1 elsewhere. In place.
 * `scratch` is a Float32Array of the grid's size, used for the squared distances.
 */
export function featureTransform3d(feature: Int32Array, scratch: Float32Array, nx: number, ny: number, nz: number): void {
    for (let i = 0; i < feature.length; i++) scratch[i] = feature[i] >= 0 ? 0 : EDT_INF;
    const n = Math.max(nx, ny, nz);
    const f = new Float64Array(n);
    const d = new Float64Array(n);
    const src = new Int32Array(n);
    const lineFeature = new Int32Array(n);
    const v = new Int32Array(n);
    const z = new Float64Array(n + 1);
    const line = (start: number, len: number, stride: number) => {
        for (let i = 0; i < len; i++) {
            f[i] = scratch[start + i * stride];
            lineFeature[i] = feature[start + i * stride];
        }
        edt1dFeature(f, d, src, len, v, z);
        for (let i = 0; i < len; i++) {
            scratch[start + i * stride] = d[i];
            feature[start + i * stride] = lineFeature[src[i]];
        }
    };
    const plane = nx * ny;
    for (let iz = 0; iz < nz; iz++) for (let iy = 0; iy < ny; iy++) line(iz * plane + iy * nx, nx, 1);
    for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) line(iz * plane + ix, ny, nx);
    for (let iy = 0; iy < ny; iy++) for (let ix = 0; ix < nx; ix++) line(iy * nx + ix, nz, plane);
}

/** Atoms as flat arrays: centre and expanded (r + probe) radius. */
interface SasAtoms {
    x: Float64Array;
    y: Float64Array;
    z: Float64Array;
    R: Float64Array;
}

/**
 * The nearest point to p of an SAS primitive - atom a's expanded sphere (b < 0), or the circle
 * where a's and b's meet - into out. False if there is no such point (the spheres do not meet, or
 * p is on the circle's axis).
 */
function projectOnPrimitive(px: number, py: number, pz: number, a: number, b: number, atoms: SasAtoms, out: number[]): boolean {
    const { x: ax, y: ay, z: az, R } = atoms;
    if (b < 0) {
        const dx = px - ax[a], dy = py - ay[a], dz = pz - az[a];
        const len = Math.hypot(dx, dy, dz);
        if (len < 1e-9) return false;
        out[0] = ax[a] + R[a] * dx / len; out[1] = ay[a] + R[a] * dy / len; out[2] = az[a] + R[a] * dz / len;
        return true;
    }
    const ux0 = ax[b] - ax[a], uy0 = ay[b] - ay[a], uz0 = az[b] - az[a];
    const d = Math.hypot(ux0, uy0, uz0);
    if (d < 1e-6 || d >= R[a] + R[b]) return false;
    const ux = ux0 / d, uy = uy0 / d, uz = uz0 / d;
    const t = (d * d + R[a] * R[a] - R[b] * R[b]) / (2 * d);
    const r2 = R[a] * R[a] - t * t;
    if (r2 <= 0) return false;
    const rc = Math.sqrt(r2);
    const cx = ax[a] + t * ux, cy = ay[a] + t * uy, cz = az[a] + t * uz;
    let wx = px - cx, wy = py - cy, wz = pz - cz;
    const along = wx * ux + wy * uy + wz * uz;
    wx -= along * ux; wy -= along * uy; wz -= along * uz;
    const wl = Math.hypot(wx, wy, wz);
    if (wl < 1e-9) return false;
    out[0] = cx + rc * wx / wl; out[1] = cy + rc * wy / wl; out[2] = cz + rc * wz / wl;
    return true;
}

/**
 * The point where the expanded spheres of a, b and c meet that is nearer p, into out: the probe's
 * centre where it touches all three, over a concave spherical patch of the SES. False if they do
 * not meet.
 */
function projectOnVertex(px: number, py: number, pz: number, a: number, b: number, c: number, atoms: SasAtoms, out: number[]): boolean {
    const { x, y, z, R } = atoms;
    const ex0 = x[b] - x[a], ey0 = y[b] - y[a], ez0 = z[b] - z[a];
    const d = Math.hypot(ex0, ey0, ez0);
    if (d < 1e-6) return false;
    const e1x = ex0 / d, e1y = ey0 / d, e1z = ez0 / d;
    const wx = x[c] - x[a], wy = y[c] - y[a], wz = z[c] - z[a];
    const i = e1x * wx + e1y * wy + e1z * wz;
    const vx = wx - i * e1x, vy = wy - i * e1y, vz = wz - i * e1z;
    const j = Math.hypot(vx, vy, vz);
    if (j < 1e-6) return false;
    const e2x = vx / j, e2y = vy / j, e2z = vz / j;
    const e3x = e1y * e2z - e1z * e2y, e3y = e1z * e2x - e1x * e2z, e3z = e1x * e2y - e1y * e2x;
    const u = (R[a] * R[a] - R[b] * R[b] + d * d) / (2 * d);
    const t = (R[a] * R[a] - R[c] * R[c] + i * i + j * j) / (2 * j) - (i / j) * u;
    const h2 = R[a] * R[a] - u * u - t * t;
    if (h2 < 0) return false;
    const hz = Math.sqrt(h2);
    const bx = x[a] + u * e1x + t * e2x, by = y[a] + u * e1y + t * e2y, bz = z[a] + u * e1z + t * e2z;
    const side = (px - bx) * e3x + (py - by) * e3y + (pz - bz) * e3z >= 0 ? hz : -hz;
    out[0] = bx + side * e3x; out[1] = by + side * e3y; out[2] = bz + side * e3z;
    return true;
}

/** The first of `near`, other than a, b and c, whose expanded sphere q is inside; -1 if none. */
function buriedBy(q: number[], near: ArrayLike<number>, from: number, to: number, a: number, b: number, atoms: SasAtoms, c = -1): number {
    for (let k = from; k < to; k++) {
        const c2 = near[k];
        if (c2 === a || c2 === b || c2 === c) continue;
        const dx = q[0] - atoms.x[c2], dy = q[1] - atoms.y[c2], dz = q[2] - atoms.z[c2];
        const R = atoms.R[c2] - 1e-4;
        if (dx * dx + dy * dy + dz * dz < R * R) return c2;
    }
    return -1;
}

/**
 * The nearest point of the SAS surface to p, which is just outside it, and the primitive it is on:
 * the expanded sphere of one of `near`, or the circle where two meet (p is over a crease) -
 * whichever candidate is not buried and is nearest. out gets x, y, z, a, b (b = -1: a sphere).
 * False if every candidate is buried (p over a point where three or more meet).
 */
function nearestSasPoint(px: number, py: number, pz: number, near: readonly number[], atoms: SasAtoms, out: number[],
                         within = Infinity): boolean {
    // Nothing further than `within` is any use to a caller that gives one (it is thrown away), so
    // the search starts there, just past it - for the three-sphere points as well as the spheres
    // and circles: a sphere or circle point further than `within` no longer ends the search
    // before a nearer three-sphere point is looked for.
    const limit = within === Infinity ? Infinity : within * within * (1 + 1e-12);
    let best = limit;
    const q = NEAREST_SCRATCH;
    // The atoms by how far p is from their sphere's surface. Every point of a sphere is at least
    // that far from p, so a circle of two spheres is no nearer than the further of the two, and a
    // point where three meet no nearer than the furthest: in this order, each loop below can stop
    // at the first atom already further than the best found. Skips only what could not win, so
    // the answer is the one the full search gives - at a cost that no longer grows with the cube
    // of the atoms in the window (it did, and a coarse grid's wider window made seeding six times
    // slower per point: 3j2w at 0.76 A).
    const n = near.length;
    if (NEAREST_ORDER.length < n) { NEAREST_ORDER = new Int32Array(2 * n); NEAREST_GAP = new Float64Array(2 * n); }
    // order: places in `near`, not atoms, so that what is recorded below - the pair of atoms -
    // is the one the search in `near`'s order recorded: step 3 follows only the first atom burying
    // that pair's circle (without `cavities`), so which two of three it is changes the field.
    const order = NEAREST_ORDER, gap = NEAREST_GAP;
    for (let i = 0; i < n; i++) {
        const a = near[i];
        const g = Math.abs(Math.hypot(px - atoms.x[a], py - atoms.y[a], pz - atoms.z[a]) - atoms.R[a]);
        // Insertion sort: a few dozen atoms.
        let k = i;
        while (k > 0 && gap[k - 1] > g) { gap[k] = gap[k - 1]; order[k] = order[k - 1]; k--; }
        gap[k] = g; order[k] = i;
    }
    for (let i = 0; i < n; i++) {
        if (gap[i] * gap[i] >= best) break;
        for (let j = i; j < n; j++) {
            if (gap[j] * gap[j] >= best) break;
            // j === i: the sphere of near[order[i]]; otherwise the circle of it and near[order[j]],
            // the earlier in `near` first.
            const oi = order[i], oj = order[j];
            const a = near[Math.min(oi, oj)], b = j === i ? -1 : near[Math.max(oi, oj)];
            if (!projectOnPrimitive(px, py, pz, a, b, atoms, q)) continue;
            const d2 = (q[0] - px) ** 2 + (q[1] - py) ** 2 + (q[2] - pz) ** 2;
            if (d2 >= best || buriedBy(q, near, 0, n, a, b, atoms) >= 0) continue;
            best = d2;
            out[0] = q[0]; out[1] = q[1]; out[2] = q[2]; out[3] = a; out[4] = b;
        }
    }
    if (best < limit) return true;
    // Every sphere and circle point buried (or, with `within`, too far): p is over (or in) a dimple, where the probe touches
    // three atoms at once. The point where their spheres meet; recorded as the circle of two of
    // them, from which the refinement in step 3 finds the third again. Only atoms whose sphere's
    // surface is within `within` of p can meet there within it - in this order, a prefix.
    let m = 0;
    while (m < n && gap[m] <= within) m++;
    // A point where three spheres meet is on each pair's circle, so no nearer than the furthest of
    // the three circles: each pair's distance once (m^2), and every triple bounded by it. A pair
    // whose spheres do not meet has no circle, and no point where it meets a third.
    if (NEAREST_CIRCLE.length < m * m) NEAREST_CIRCLE = new Float64Array(2 * m * m);
    const circle = NEAREST_CIRCLE;
    for (let i = 0; i < m; i++) {
        for (let j = i + 1; j < m; j++) {
            circle[i * m + j] = circleDistance2(px, py, pz, near[order[i]], near[order[j]], atoms);
        }
    }
    for (let i = 0; i < m; i++) {
        if (gap[i] * gap[i] >= best) break;
        for (let j = i + 1; j < m; j++) {
            if (gap[j] * gap[j] >= best) break;
            if (circle[i * m + j] >= best) continue;
            for (let k = j + 1; k < m; k++) {
                if (gap[k] * gap[k] >= best) break;
                if (circle[i * m + k] >= best || circle[j * m + k] >= best) continue;
                // In `near`'s order: a and b, the pair recorded, are the earlier two.
                const o0 = order[i], o1 = order[j], o2 = order[k];
                const first = Math.min(o0, o1, o2), last = Math.max(o0, o1, o2);
                const a = near[first], b = near[o0 + o1 + o2 - first - last], c = near[last];
                if (!projectOnVertex(px, py, pz, a, b, c, atoms, q)) continue;
                const d2 = (q[0] - px) ** 2 + (q[1] - py) ** 2 + (q[2] - pz) ** 2;
                if (d2 >= best || buriedBy(q, near, 0, n, a, b, atoms, c) >= 0) continue;
                best = d2;
                out[0] = q[0]; out[1] = q[1]; out[2] = q[2]; out[3] = a; out[4] = b;
            }
        }
    }
    return best < limit;
}

/**
 * The squared distance from p to the circle where a's and b's expanded spheres meet; Infinity if
 * they do not meet (no circle), and 0 - no bound - where p is on its axis.
 */
function circleDistance2(px: number, py: number, pz: number, a: number, b: number, atoms: SasAtoms): number {
    const { x, y, z, R } = atoms;
    const ux0 = x[b] - x[a], uy0 = y[b] - y[a], uz0 = z[b] - z[a];
    const d = Math.hypot(ux0, uy0, uz0);
    if (d < 1e-6 || d >= R[a] + R[b]) return Infinity;
    const t = (d * d + R[a] * R[a] - R[b] * R[b]) / (2 * d);
    const r2 = R[a] * R[a] - t * t;
    if (r2 <= 0) return Infinity;
    const ux = ux0 / d, uy = uy0 / d, uz = uz0 / d;
    const wx = px - x[a] - t * ux, wy = py - y[a] - t * uy, wz = pz - z[a] - t * uz;
    const along = wx * ux + wy * uy + wz * uz;
    const across = Math.sqrt(Math.max(0, wx * wx + wy * wy + wz * wz - along * along));
    const off = across - Math.sqrt(r2);
    return along * along + off * off;
}
const NEAREST_SCRATCH = [0, 0, 0];
let NEAREST_ORDER = new Int32Array(256);
let NEAREST_GAP = new Float64Array(256);
let NEAREST_CIRCLE = new Float64Array(4096);

/** Separable Gaussian blur in place, sigma in grid units. Edges clamp. */
export function gaussianBlur3d(field: Float32Array, nx: number, ny: number, nz: number, sigma: number): void {
    if (sigma <= 0) return;
    const radius = Math.max(1, Math.ceil(3 * sigma));
    const kernel = new Float64Array(2 * radius + 1);
    let total = 0;
    for (let i = -radius; i <= radius; i++) {
        kernel[i + radius] = Math.exp(-(i * i) / (2 * sigma * sigma));
        total += kernel[i + radius];
    }
    for (let i = 0; i < kernel.length; i++) kernel[i] /= total;
    const line = new Float64Array(Math.max(nx, ny, nz));
    const plane = nx * ny;
    const blurLine = (start: number, len: number, stride: number) => {
        for (let i = 0; i < len; i++) line[i] = field[start + i * stride];
        for (let i = 0; i < len; i++) {
            let sum = 0;
            for (let k = -radius; k <= radius; k++) {
                const j = Math.min(len - 1, Math.max(0, i + k));
                sum += kernel[k + radius] * line[j];
            }
            field[start + i * stride] = sum;
        }
    };
    for (let iz = 0; iz < nz; iz++) for (let iy = 0; iy < ny; iy++) blurLine(iz * plane + iy * nx, nx, 1);
    for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) blurLine(iz * plane + ix, ny, nx);
    for (let iy = 0; iy < ny; iy++) for (let ix = 0; ix < nx; ix++) blurLine(iy * nx + ix, nz, plane);
}

/**
 * The blurred SES signed distance field of these atoms. Null if there are none.
 *
 * `maxShift`: how far the blur may move the surface (soft cap); `openRadius`: the ball for
 * cutting pinched necks (step 3b); `cavities`: follow every atom burying a projection, not just
 * the first - exact pits and pockets, at about 1.7 times the cost.
 */
export function sesField(atoms: readonly SurfaceAtom[], probe: number, spacing: number, sigma: number,
                         maxShift = Infinity, openRadius = 0, cavities = true): SesGrid | null {
    if (atoms.length === 0) return null;
    let rMax = 0;
    const low = [Infinity, Infinity, Infinity];
    const high = [-Infinity, -Infinity, -Infinity];
    for (const a of atoms) {
        rMax = Math.max(rMax, a.r);
        low[0] = Math.min(low[0], a.x); low[1] = Math.min(low[1], a.y); low[2] = Math.min(low[2], a.z);
        high[0] = Math.max(high[0], a.x); high[1] = Math.max(high[1], a.y); high[2] = Math.max(high[2], a.z);
    }

    let h = spacing;
    let pad = 0, nx = 0, ny = 0, nz = 0;
    for (;;) {
        // The SAS reaches rMax + probe from a centre; past it, room for the blur to fall off and
        // for the field to be negative at the grid's edge, so marching cubes closes the surface.
        pad = rMax + probe + 3 * sigma + 3 * h;
        nx = Math.ceil((high[0] - low[0] + 2 * pad) / h) + 1;
        ny = Math.ceil((high[1] - low[1] + 2 * pad) / h) + 1;
        nz = Math.ceil((high[2] - low[2] + 2 * pad) / h) + 1;
        if (nx * ny * nz <= MAX_GRID_POINTS) break;
        h *= 1.15;
    }
    const origin: [number, number, number] = [low[0] - pad, low[1] - pad, low[2] - pad];
    const plane = nx * ny;
    const count = plane * nz;

    let mark = performance.now();
    const lap = () => { const now = performance.now(); const ms = now - mark; mark = now; return ms; };

    // 1. SAS occupancy. Also marked: points deeper than a voxel diagonal inside some sphere. Any
    // other interior point is within a voxel of the SAS's boundary, and may be next to probe
    // positions too small for the grid to have caught (step 2).
    const exterior = new Uint8Array(count).fill(1);
    const deep = new Uint8Array(count);
    const diagonal = Math.sqrt(3) * h;
    for (const a of atoms) {
        const R = a.r + probe;
        const R2 = R * R;
        const inner = Math.max(0, R - diagonal);
        const inner2 = inner * inner;
        const x0 = Math.max(0, Math.floor((a.x - R - origin[0]) / h)), x1 = Math.min(nx - 1, Math.ceil((a.x + R - origin[0]) / h));
        const y0 = Math.max(0, Math.floor((a.y - R - origin[1]) / h)), y1 = Math.min(ny - 1, Math.ceil((a.y + R - origin[1]) / h));
        const z0 = Math.max(0, Math.floor((a.z - R - origin[2]) / h)), z1 = Math.min(nz - 1, Math.ceil((a.z + R - origin[2]) / h));
        for (let iz = z0; iz <= z1; iz++) {
            const dz = origin[2] + iz * h - a.z;
            const dz2 = dz * dz;
            if (dz2 > R2) continue;
            for (let iy = y0; iy <= y1; iy++) {
                const dy = origin[1] + iy * h - a.y;
                const dyz2 = dy * dy + dz2;
                if (dyz2 > R2) continue;
                const row = iz * plane + iy * nx;
                for (let ix = x0; ix <= x1; ix++) {
                    const dx = origin[0] + ix * h - a.x;
                    const d2 = dx * dx + dyz2;
                    if (d2 <= R2) {
                        exterior[row + ix] = 0;
                        if (d2 < inner2) deep[row + ix] = 1;
                    }
                }
            }
        }
    }

    const sasMs = lap();

    // 2. Seeds: exterior points with an interior neighbour - every interior point's nearest
    // exterior point is one of them - each with the exact nearest point of the SAS surface and
    // the primitive it is on (sphere, circle, or the circle of two of the three spheres meeting at
    // a point); and interior points with probe positions too small for the grid within a voxel
    // diagonal (below). The nearest point is looked for among the atoms whose expanded surface is
    // within `window` of the voxel.
    const window = 3 * h;
    // How far in the field is kept exact: far enough for the blur, and for the opening (step 3b)
    // to see where it is deeper than its radius.
    const clamp = Math.max(3 * sigma, openRadius > 0 ? openRadius + 2 * h : 0) + 2 * h;
    // Bins about the size of the atom lookups made; near() scans as many as a lookup needs.
    const atomBins = binAtoms(atoms, rMax + probe + Math.max(window, clamp + h), rMax + probe);
    const sas: SasAtoms = {
        x: Float64Array.from(atoms, a => a.x), y: Float64Array.from(atoms, a => a.y), z: Float64Array.from(atoms, a => a.z),
        R: Float64Array.from(atoms, a => a.r + probe),
    };
    const feature = new Int32Array(count).fill(-1);
    const seedPoints: number[] = [];
    const seedA: number[] = [];
    const seedB: number[] = [];
    const near: number[] = [];
    const found = [0, 0, 0, -1, -1];
    for (let iz = 1; iz < nz - 1; iz++) {
        for (let iy = 1; iy < ny - 1; iy++) {
            for (let ix = 1; ix < nx - 1; ix++) {
                const i = iz * plane + iy * nx + ix;
                const px = origin[0] + ix * h, py = origin[1] + iy * h, pz = origin[2] + iz * h;
                if (exterior[i]) {
                    if (exterior[i - 1] && exterior[i + 1] && exterior[i - nx] && exterior[i + nx] && exterior[i - plane] && exterior[i + plane]) continue;
                    atomBins.near(px, py, pz, sas.x, sas.y, sas.z, sas.R, window, near);
                    if (!nearestSasPoint(px, py, pz, near, sas, found)) {
                        found[0] = px; found[1] = py; found[2] = pz; found[3] = -1; found[4] = -1;
                    }
                } else {
                    // Inside, but within a voxel of the boundary, and with no exterior neighbour
                    // to have seeded it: probe positions too small for the grid to catch - the
                    // bottom of a pit, a pocket the probe only just fits - can be right here. A
                    // seed if there is an unburied boundary point within a voxel diagonal.
                    if (deep[i]) continue;
                    // Not where the grid did see the outside next door: the seeds there, and the
                    // exact projections from them, already reach anything this close.
                    let outsideNear = false;
                    for (let dz = -1; dz <= 1 && !outsideNear; dz++) for (let dy = -1; dy <= 1 && !outsideNear; dy++) for (let dx = -1; dx <= 1; dx++) {
                        if (exterior[i + dz * plane + dy * nx + dx]) { outsideNear = true; break; }
                    }
                    if (outsideNear) continue;
                    atomBins.near(px, py, pz, sas.x, sas.y, sas.z, sas.R, window, near);
                    if (!nearestSasPoint(px, py, pz, near, sas, found, diagonal)) continue;
                    if (Math.hypot(found[0] - px, found[1] - py, found[2] - pz) > diagonal) continue;
                }
                feature[i] = seedA.length;
                seedPoints.push(found[0], found[1], found[2]);
                seedA.push(found[3]);
                seedB.push(found[4]);
            }
        }
    }

    // 3. Each point's nearest seed, then the field: the distance to the SAS surface, less the
    // probe, for interior points; -probe on the exterior, where the probe's centre can be.
    //
    // The nearest seed by voxel centres names the right primitive, or one next to it, but its
    // point is only a sample: a few voxels in, the nearest point of the surface can be well along
    // the primitive from it. So within the blur's reach of the surface the distance is to the
    // primitives themselves - the point's own projection onto each, if not buried - for its own
    // seed and its six neighbours'. Every seed point and every unburied projection is a point of
    // the SAS surface, so the least of them is the distance.
    //
    // A projection buried by atom c is under a crease or a dimple that few seeds lie over at a
    // coarse grid (seen from outside, a narrow valley or pit): then the circle with c, or the
    // point where the three spheres meet, is tried instead.
    const field = new Float32Array(count);
    const seedsMs = lap();
    featureTransform3d(feature, field, nx, ny, nz);
    const transformMs = lap();
    const seeds = new Float64Array(seedPoints);
    const primA = Int32Array.from(seedA);
    const primB = Int32Array.from(seedB);
    // Only near the SES (distance to the SAS within the blur's reach of the probe radius) does
    // the exact value matter; further in it is clamped, further out (towards the SAS) nothing
    // the blur reaches the surface from.
    const exactLow = probe - clamp - h, exactHigh = probe + clamp + h;
    let interiorCount = 0;

    const q = [0, 0, 0];
    let px = 0, py = 0, pz = 0, best = Infinity;
    // The atoms that can bury any projection worth having, looked up once per point: a
    // projection nearer than the best so far is within that distance of the point, so anything
    // burying it has its sphere within that distance of the point too.
    const local: number[] = [];
    const around: number[] = [];
    // Every local atom burying q, other than a, b and c, into out.
    const buriers = (a: number, b: number, c: number, out: number[]): void => {
        out.length = 0;
        for (let k = 0; k < local.length; k++) {
            const d = local[k];
            if (d === a || d === b || d === c) continue;
            const dx = q[0] - sas.x[d], dy = q[1] - sas.y[d], dz = q[2] - sas.z[d];
            const R = sas.R[d] - 1e-4;
            if (dx * dx + dy * dy + dz * dz < R * R) out.push(d);
        }
    };
    // A projection buried by several atoms: its nearest unburied neighbour is where the circle
    // (or point) leaves one of them, and not necessarily the first found - in a pocket two or
    // three atoms often overlap there. So with `cavities` every one is followed, not just the
    // first.
    const sphereBuriers: number[] = [], circleBuriers: number[] = [], vertexBuriers: number[] = [];
    // The spheres and circles already tried for this point (circles as negative keys).
    const tried: number[] = [];
    const tryVertex = (a: number, b: number, c: number) => {
        if (!projectOnVertex(px, py, pz, a, b, c, sas, q)) return;
        const d2 = (q[0] - px) ** 2 + (q[1] - py) ** 2 + (q[2] - pz) ** 2;
        if (d2 >= best) return;
        buriers(a, b, c, vertexBuriers);
        if (vertexBuriers.length === 0) best = d2;
    };
    const tryCircle = (a: number, b: number) => {
        const key = -(Math.min(a, b) * atoms.length + Math.max(a, b)) - 1;
        if (tried.includes(key)) return;
        tried.push(key);
        if (!projectOnPrimitive(px, py, pz, a, b, sas, q)) return;
        const d2 = (q[0] - px) ** 2 + (q[1] - py) ** 2 + (q[2] - pz) ** 2;
        if (d2 >= best) return;
        buriers(a, b, -1, circleBuriers);
        if (circleBuriers.length === 0) { best = d2; return; }
        for (const c of circleBuriers) {
            tryVertex(a, b, c);
            if (!cavities) break;
        }
    };
    const trySphere = (a: number) => {
        if (tried.includes(a)) return;
        tried.push(a);
        if (!projectOnPrimitive(px, py, pz, a, -1, sas, q)) return;
        const d2 = (q[0] - px) ** 2 + (q[1] - py) ** 2 + (q[2] - pz) ** 2;
        if (d2 >= best) return;
        buriers(a, -1, -1, sphereBuriers);
        if (sphereBuriers.length === 0) { best = d2; return; }
        for (const c of sphereBuriers) {
            tryCircle(a, c);
            if (!cavities) break;
        }
    };
    const candidates = new Int32Array(7);
    const neighbours = new Int32Array(7);
    for (let iz = 0; iz < nz; iz++) {
        for (let iy = 0; iy < ny; iy++) {
            for (let ix = 0; ix < nx; ix++) {
                const i = iz * plane + iy * nx + ix;
                px = origin[0] + ix * h; py = origin[1] + iy * h; pz = origin[2] + iz * h;
                if (exterior[i] || feature[i] < 0) {
                    // Outside the SAS, where the probe's centre can be: the SES is the probe
                    // radius further than the SAS, -(probe + gap). The gap to a union of spheres
                    // from outside is the least gap to any of them, exact and cheap; only needed
                    // within the clamp (the nearest seed says roughly how far that is).
                    field[i] = -(probe + clamp);
                    const f = feature[i];
                    if (f < 0) continue;
                    const rough = Math.hypot(seeds[3 * f] - px, seeds[3 * f + 1] - py, seeds[3 * f + 2] - pz);
                    if (rough > clamp + h) continue;
                    atomBins.near(px, py, pz, sas.x, sas.y, sas.z, sas.R, clamp + h, around);
                    let gap = clamp;
                    for (const a of around) gap = Math.min(gap, Math.hypot(px - sas.x[a], py - sas.y[a], pz - sas.z[a]) - sas.R[a]);
                    field[i] = -(probe + Math.max(0, gap));
                    continue;
                }
                neighbours[0] = feature[i];
                neighbours[1] = ix > 0 ? feature[i - 1] : -1;
                neighbours[2] = ix < nx - 1 ? feature[i + 1] : -1;
                neighbours[3] = iy > 0 ? feature[i - nx] : -1;
                neighbours[4] = iy < ny - 1 ? feature[i + nx] : -1;
                neighbours[5] = iz > 0 ? feature[i - plane] : -1;
                neighbours[6] = iz < nz - 1 ? feature[i + plane] : -1;
                let n = 0;
                for (let m = 0; m < 7; m++) {
                    const f = neighbours[m];
                    if (f < 0) continue;
                    let seen = false;
                    for (let k = 0; k < n; k++) if (candidates[k] === f) { seen = true; break; }
                    if (!seen) candidates[n++] = f;
                }
                best = Infinity;
                for (let k = 0; k < n; k++) {
                    const f = candidates[k];
                    const d2 = (seeds[3 * f] - px) ** 2 + (seeds[3 * f + 1] - py) ** 2 + (seeds[3 * f + 2] - pz) ** 2;
                    if (d2 < best) best = d2;
                }
                const approximate = Math.sqrt(best);
                if (approximate > exactLow && approximate < exactHigh) {
                    tried.length = 0;
                    atomBins.near(px, py, pz, sas.x, sas.y, sas.z, sas.R, approximate, local);
                    for (let k = 0; k < n; k++) {
                        const f = candidates[k];
                        if (primA[f] < 0) continue;
                        if (primB[f] >= 0) tryCircle(primA[f], primB[f]);
                        else trySphere(primA[f]);
                    }
                }
                const value = Math.sqrt(best) - probe;
                if (value > 0) interiorCount++;
                field[i] = Math.min(value, clamp);
            }
        }
    }

    // 3b. Opening: roll a ball of radius openRadius inside the surface and keep only where it
    // reaches. A neck thinner than the ball - where two atoms are too close for the probe to pass
    // between but too far apart for a proper saddle, and the SES pinches to a cusp - is cut, and
    // its two sides become two rounded lobes. Anything the ball fits in is left as it was.
    //
    // E is where the field is deeper than the radius t; the opened surface is E grown by t, whose
    // signed distance is t - dist(x, E). dist(x, E) is found by walking from x up the field's
    // gradient, each step as long as the field still falls short of t, until it gets there: the
    // path's length. Where the surface is regular the gradient lines are straight, the first step
    // lands on E, and the length is exactly t - f(x): nothing changes. At a neck the first step
    // lands on its axis, short of t, and the path turns along it to one of the lobes: longer, so
    // the field there goes down. The length changes continuously, so there is no seam where the
    // cut begins. Only points the blur can carry to the surface are walked from.
    if (openRadius > 0) {
        const t = openRadius;
        const original = field.slice();
        const sample = (x: number, y: number, z: number): number => {
            const fx = Math.min(nx - 1.001, Math.max(0, (x - origin[0]) / h));
            const fy = Math.min(ny - 1.001, Math.max(0, (y - origin[1]) / h));
            const fz = Math.min(nz - 1.001, Math.max(0, (z - origin[2]) / h));
            const i = Math.floor(fx), j = Math.floor(fy), k = Math.floor(fz);
            const u = fx - i, v = fy - j, w = fz - k;
            const c = k * plane + j * nx + i;
            const c00 = original[c] + u * (original[c + 1] - original[c]);
            const c10 = original[c + nx] + u * (original[c + nx + 1] - original[c + nx]);
            const c01 = original[c + plane] + u * (original[c + plane + 1] - original[c + plane]);
            const c11 = original[c + plane + nx] + u * (original[c + plane + nx + 1] - original[c + plane + nx]);
            const c0 = c00 + v * (c10 - c00), c1 = c01 + v * (c11 - c01);
            return c0 + w * (c1 - c0);
        };
        const reach = -(3 * sigma + 2 * h);
        const floor = -(probe + clamp);
        const half = h / 2;
        // Sampling between grid points is out by about h^2 / 8R on a surface curved at radius R:
        // a cut has to go deeper than that to count, so regular surfaces stay exactly as they were.
        const allowance = (h * h) / 4;
        interiorCount = 0;
        for (let iz = 0; iz < nz; iz++) {
            for (let iy = 0; iy < ny; iy++) {
                for (let ix = 0; ix < nx; ix++) {
                    const i = iz * plane + iy * nx + ix;
                    const f = original[i];
                    if (f < t && f > reach) {
                        let x = origin[0] + ix * h, y = origin[1] + iy * h, z = origin[2] + iz * h;
                        let value = f, length = 0;
                        for (let step = 0; step < 8 && value < t - 1e-3; step++) {
                            const gx = sample(x + half, y, z) - sample(x - half, y, z);
                            const gy = sample(x, y + half, z) - sample(x, y - half, z);
                            const gz = sample(x, y, z + half) - sample(x, y, z - half);
                            const g = Math.hypot(gx, gy, gz);
                            // On a neck's axis, halfway between its lobes, the gradient vanishes.
                            if (g < 1e-6) break;
                            const move = t - value;
                            x += move * gx / g; y += move * gy / g; z += move * gz / g;
                            length += move;
                            value = sample(x, y, z);
                        }
                        // Whatever is left to go counts in full: an upper bound, so a path that
                        // stopped short still cuts rather than not.
                        const distance = length + Math.max(0, t - value);
                        const opened = t - distance + allowance;
                        if (opened < f) field[i] = Math.max(opened, floor);
                    }
                    if (field[i] > 0) interiorCount++;
                }
            }
        }
    }

    const distanceMs = lap();

    // 4. Blur, and contour where the blurred field encloses as much as the SES did. Blurring a
    // distance field pulls convex parts in (a sphere of radius R by about σ²/R) and pushes concave
    // ones out; contouring at 0 would shrink the molecule overall, every atom cap being convex.
    // Holding the volume makes it a smoothing rather than an erosion.
    //
    // With maxShift, the blur's change to the field - which, the field being a distance, is how
    // far it moves the surface - is capped softly: d -> maxShift * tanh(d / maxShift). Small
    // changes pass almost as they are, large ones level off, and the field stays smooth, so the
    // normals show no edge where the cap starts to bite.
    const exact = sigma > 0 && Number.isFinite(maxShift) && maxShift > 0 ? field.slice() : null;
    gaussianBlur3d(field, nx, ny, nz, sigma / h);
    if (exact) {
        for (let i = 0; i < count; i++) field[i] = exact[i] + maxShift * Math.tanh((field[i] - exact[i]) / maxShift);
    }
    const iso = sigma > 0 ? levelEnclosing(field, interiorCount, clamp) : 0;

    const blurMs = lap();

    return {
        field, nx, ny, nz, origin, spacing: h, iso,
        timings: { sas: sasMs, seeds: seedsMs, transform: transformMs, distance: distanceMs, blur: blurMs },
    };
}

/**
 * Atoms binned on a coarse grid, to find those near a point: cell lists, CSR. `maxR` is the
 * largest radius `near` will be asked about.
 */
function binAtoms(atoms: readonly SurfaceAtom[], size: number, maxR: number) {
    const low = [Infinity, Infinity, Infinity], high = [-Infinity, -Infinity, -Infinity];
    for (const a of atoms) {
        low[0] = Math.min(low[0], a.x); low[1] = Math.min(low[1], a.y); low[2] = Math.min(low[2], a.z);
        high[0] = Math.max(high[0], a.x); high[1] = Math.max(high[1], a.y); high[2] = Math.max(high[2], a.z);
    }
    const dims = [0, 1, 2].map(k => Math.floor((high[k] - low[k]) / size) + 1);
    const cellOf = (v: number, k: number) => Math.floor((v - low[k]) / size);
    const cells = dims[0] * dims[1] * dims[2];
    const start = new Int32Array(cells + 1);
    const cellOfAtom = new Int32Array(atoms.length);
    atoms.forEach((a, i) => {
        const c = (cellOf(a.z, 2) * dims[1] + cellOf(a.y, 1)) * dims[0] + cellOf(a.x, 0);
        cellOfAtom[i] = c;
        start[c + 1]++;
    });
    for (let c = 0; c < cells; c++) start[c + 1] += start[c];
    const fill = start.slice(0, cells);
    const members = new Int32Array(atoms.length);
    for (let i = 0; i < atoms.length; i++) members[fill[cellOfAtom[i]]++] = i;
    return {
        /**
         * Into `out`, every atom in the 27 cells around (x, y, z) whose expanded radius R (from
         * `R`) reaches within `gap` of it: |p - a| - R < gap.
         */
        near(x: number, y: number, z: number, ax: Float64Array, ay: Float64Array, az: Float64Array, R: Float64Array,
             gap: number, out: number[]): void {
            out.length = 0;
            const ci = cellOf(x, 0), cj = cellOf(y, 1), ck = cellOf(z, 2);
            // As many cells out as an atom reaching within `gap` can be.
            const span = Math.max(1, Math.ceil((maxR + gap) / size));
            for (let k = Math.max(0, ck - span); k <= Math.min(dims[2] - 1, ck + span); k++) {
                for (let j = Math.max(0, cj - span); j <= Math.min(dims[1] - 1, cj + span); j++) {
                    for (let i = Math.max(0, ci - span); i <= Math.min(dims[0] - 1, ci + span); i++) {
                        const c = (k * dims[1] + j) * dims[0] + i;
                        for (let m = start[c]; m < start[c + 1]; m++) {
                            const a = members[m];
                            const dx = x - ax[a], dy = y - ay[a], dz = z - az[a];
                            const reach = R[a] + gap;
                            if (dx * dx + dy * dy + dz * dz < reach * reach) out.push(a);
                        }
                    }
                }
            }
        },
    };
}

/** The level above which `target` of the field's values lie, by histogram over [-range, range]. */
function levelEnclosing(field: Float32Array, target: number, range: number): number {
    const bins = 8192;
    const histogram = new Uint32Array(bins);
    const scale = bins / (2 * range);
    for (let i = 0; i < field.length; i++) {
        const b = Math.floor((field[i] + range) * scale);
        histogram[b < 0 ? 0 : b >= bins ? bins - 1 : b]++;
    }
    let above = 0;
    for (let b = bins - 1; b >= 0; b--) {
        if (above + histogram[b] >= target) {
            // Somewhere inside bin b: interpolate, as if its values were spread evenly.
            const fraction = histogram[b] > 0 ? (target - above) / histogram[b] : 0;
            return -range + (b + 1 - fraction) / scale;
        }
        above += histogram[b];
    }
    return -range;
}

/** MC.h's edge numbering, as in metaballsShaders.ts: grid point offset (x, y, z) and axis. */
const EDGE_POINTS: readonly [number, number, number, number][] = [
    [0, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 1, 1, 0],
    [0, 0, 0, 1], [1, 0, 0, 1], [0, 0, 1, 1], [1, 0, 1, 1],
    [0, 0, 0, 2], [1, 0, 0, 2], [0, 1, 0, 2], [1, 1, 0, 2],
];

export interface SurfaceMesh {
    positions: Float32Array;
    /** Unit, pointing out of the surface. */
    normals: Float32Array;
    /** Counter-clockwise seen from outside. */
    indices: Uint32Array;
}

/**
 * A contour as marching cubes leaves it: positions, triangles, and the grid edge each vertex is
 * on, ((z * ny + y) * nx + x) * 3 + axis. Normals and winding are worked out from these after.
 */
export interface EdgeContour {
    positions: Float32Array;
    indices: Uint32Array;
    keys: Uint32Array;
}

/**
 * Marching cubes on a field that is negative inside, at 0. Either the CPU one below or the
 * WebGPU MetaBalls kernels (GpuMetaBalls.contourField), which share the table, the edge numbering
 * and the inside test, and so give the same mesh.
 */
export type Contourer = (field: Float32Array, grid: GridShape) => EdgeContour | Promise<EdgeContour>;

/** The grid without its field: what marching cubes and the normals need to know of it. */
export type GridShape = Pick<SesGrid, "nx" | "ny" | "nz" | "origin" | "spacing" | "iso">;

/**
 * The field as marching cubes takes it: negative inside, the surface at 0. The GPU MetaBalls
 * kernels count a point as inside when its value is below 0, and so does contourOnCpu.
 */
export const contourInput = (grid: SesGrid): Float32Array => grid.field.map(v => grid.iso - v);

/** Marching cubes on the CPU, as the WebGPU MetaBalls kernels do it. */
export function contourOnCpu(field: Float32Array, grid: GridShape): EdgeContour {
    const { nx, ny, nz, origin, spacing: h } = grid;
    const plane = nx * ny;
    const edgeVertex = new Int32Array(3 * nx * ny * nz).fill(-1);
    const positions: number[] = [];
    const keys: number[] = [];
    const indices: number[] = [];

    const vertexOn = (px: number, py: number, pz: number, axis: number): number => {
        const p = pz * plane + py * nx + px;
        const key = 3 * p + axis;
        if (edgeVertex[key] >= 0) return edgeVertex[key];
        const a = field[p];
        const b = field[p + (axis === 0 ? 1 : axis === 1 ? nx : plane)];
        const t = a / (a - b);
        positions.push(
            origin[0] + (px + (axis === 0 ? t : 0)) * h,
            origin[1] + (py + (axis === 1 ? t : 0)) * h,
            origin[2] + (pz + (axis === 2 ? t : 0)) * h,
        );
        keys.push(key);
        edgeVertex[key] = keys.length - 1;
        return keys.length - 1;
    };

    for (let cz = 0; cz < nz - 1; cz++) {
        for (let cy = 0; cy < ny - 1; cy++) {
            for (let cx = 0; cx < nx - 1; cx++) {
                let config = 0;
                for (let c = 0; c < 8; c++) {
                    const v = field[(cz + ((c >> 2) & 1)) * plane + (cy + ((c >> 1) & 1)) * nx + cx + (c & 1)];
                    if (v < 0) config |= 1 << c;
                }
                if (config === 0 || config === 255) continue;
                const lo = MC_TRIANGLE_TABLE[2 * config];
                const hi = MC_TRIANGLE_TABLE[2 * config + 1];
                const nibble = (i: number) => {
                    const bit = 4 * i;
                    return ((bit >= 32 ? hi : lo) >>> (bit & 31)) & 15;
                };
                const triangles = nibble(0);
                for (let t = 0; t < triangles; t++) {
                    const tri = [0, 0, 0];
                    for (let k = 0; k < 3; k++) {
                        const e = EDGE_POINTS[nibble(1 + 3 * t + k)];
                        tri[k] = vertexOn(cx + e[0], cy + e[1], cz + e[2], e[3]);
                    }
                    indices.push(tri[0], tri[1], tri[2]);
                }
            }
        }
    }
    return { positions: new Float32Array(positions), indices: new Uint32Array(indices), keys: new Uint32Array(keys) };
}

/**
 * Each vertex's normal from the field's gradient, as smooth as the field is rather than as faceted
 * as the triangles. `field` is the contour input, rising outwards, so out is up its gradient.
 *
 * Every vertex lies on a grid edge, so the gradient is reconstructed along it with a cubic
 * (Catmull-Rom) through four grid points, P - 1, P, Q, Q + 1: along the edge, the cubic's own
 * derivative at the vertex; across it, fourth-order central differences at those four points,
 * interpolated by the same cubic. The simpler reconstruction - second-order differences at P and Q,
 * interpolated linearly - was out by 3 degrees on average and 17 at worst (in 100) at a 0.5 A
 * grid, and since its error follows each vertex's place in its cell, the diffuse light showed the
 * grid as a pattern of squares.
 */
export function edgeNormals(field: Float32Array, grid: GridShape, keys: Uint32Array): Float32Array {
    const { nx, ny, nz } = grid;
    const plane = nx * ny;
    const dims = [nx, ny, nz];
    const strides = [1, nx, plane];
    const normals = new Float32Array(3 * keys.length);
    const coord = [0, 0, 0];
    // The field at grid point `coord` moved `step` along axis d, held inside the grid.
    const valueAt = (d: number, step: number): number => {
        let i = 0;
        for (let k = 0; k < 3; k++) {
            const c = Math.min(dims[k] - 1, Math.max(0, coord[k] + (k === d ? step : 0)));
            i += c * strides[k];
        }
        return field[i];
    };
    // d(field)/d(axis e) at `coord` moved `step` along axis d: fourth order, in grid units.
    const derivativeAt = (d: number, step: number, e: number): number => {
        const saved = coord[d];
        coord[d] += step;
        const fp1 = valueAt(e, 1), fm1 = valueAt(e, -1), fp2 = valueAt(e, 2), fm2 = valueAt(e, -2);
        coord[d] = saved;
        return (-fp2 + 8 * fp1 - 8 * fm1 + fm2) / 12;
    };
    const catmullRom = (p0: number, p1: number, p2: number, p3: number, t: number) =>
        0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t * t * t);
    const catmullRomSlope = (p0: number, p1: number, p2: number, p3: number, t: number) =>
        0.5 * ((p2 - p0) + 2 * (2 * p0 - 5 * p1 + 4 * p2 - p3) * t + 3 * (3 * p1 - p0 - 3 * p2 + p3) * t * t);
    const g = [0, 0, 0];
    for (let v = 0; v < keys.length; v++) {
        const axis = keys[v] % 3;
        const p = (keys[v] - axis) / 3;
        coord[2] = Math.floor(p / plane);
        coord[1] = Math.floor((p - coord[2] * plane) / nx);
        coord[0] = p - coord[2] * plane - coord[1] * nx;
        const f0 = valueAt(axis, -1), f1 = valueAt(axis, 0), f2 = valueAt(axis, 1), f3 = valueAt(axis, 2);
        const t = f1 === f2 ? 0.5 : f1 / (f1 - f2);
        for (let e = 0; e < 3; e++) {
            g[e] = e === axis
                ? catmullRomSlope(f0, f1, f2, f3, t)
                : catmullRom(derivativeAt(axis, -1, e), derivativeAt(axis, 0, e), derivativeAt(axis, 1, e), derivativeAt(axis, 2, e), t);
        }
        const len = Math.hypot(g[0], g[1], g[2]) || 1;
        normals[3 * v] = g[0] / len;
        normals[3 * v + 1] = g[1] / len;
        normals[3 * v + 2] = g[2] / len;
    }
    return normals;
}

/** Catmull-Rom weights for the four grid points around t in [0, 1): the cubic catmullRom is. */
function catmullRomWeights(t: number, w: Float64Array): void {
    const t2 = t * t, t3 = t2 * t;
    w[0] = 0.5 * (-t + 2 * t2 - t3);
    w[1] = 0.5 * (2 - 5 * t2 + 3 * t3);
    w[2] = 0.5 * (t + 4 * t2 - 3 * t3);
    w[3] = 0.5 * (-t2 + t3);
}

/**
 * The field anywhere, not only on grid edges: Catmull-Rom tricubic through the 4 x 4 x 4 grid
 * points around a point, for its value, and for its gradient the fourth-order differences of
 * edgeNormals at those points, interpolated the same way - on a grid edge, the same cubics
 * edgeNormals uses across the edge. Differences are kept per grid point once worked out: a
 * surface touches a thin shell of the grid, and every point in it is read by many vertices.
 */
export function fieldSampler(field: Float32Array, grid: GridShape) {
    const { nx, ny, nz, origin, spacing: h } = grid;
    const plane = nx * ny;
    const dims = [nx, ny, nz];
    const clampTo = (c: number, d: number) => Math.min(dims[d] - 1, Math.max(0, c));
    const valueAt = (x: number, y: number, z: number) => field[clampTo(z, 2) * plane + clampTo(y, 1) * nx + clampTo(x, 0)];
    // Where each grid point's differences are kept (one more than their slot / 3; 0: not yet).
    // As big as the field, but read 64 times a sample, which a Map made most of the cost.
    const slots = new Int32Array(field.length);
    let derivatives = new Float32Array(3 * 4096);
    let used = 0;
    const strides = [1, nx, plane];
    // The three fourth-order differences at grid point (x, y, z), in grid units: where they are.
    const derivativesAt = (x: number, y: number, z: number): number => {
        x = clampTo(x, 0); y = clampTo(y, 1); z = clampTo(z, 2);
        const index = z * plane + y * nx + x;
        const known = slots[index];
        if (known !== 0) return 3 * (known - 1);
        if (3 * (used + 1) > derivatives.length) {
            const grown = new Float32Array(2 * derivatives.length);
            grown.set(derivatives);
            derivatives = grown;
        }
        const slot = 3 * used++;
        const c = [x, y, z];
        for (let e = 0; e < 3; e++) {
            const s = strides[e];
            if (c[e] >= 2 && c[e] < dims[e] - 2) {
                derivatives[slot + e] = (-field[index + 2 * s] + 8 * field[index + s] - 8 * field[index - s] + field[index - 2 * s]) / 12;
            } else {
                // Held inside the grid, as edgeNormals' valueAt is.
                const lo = -c[e], hi = dims[e] - 1 - c[e];
                const at = (step: number) => field[index + s * Math.min(hi, Math.max(lo, step))];
                derivatives[slot + e] = (-at(2) + 8 * at(1) - 8 * at(-1) + at(-2)) / 12;
            }
        }
        slots[index] = used;
        return slot;
    };
    // The same, for a grid point known to be inside the grid.
    const derivativesAtIndex = (index: number): number => {
        const known = slots[index];
        if (known !== 0) return 3 * (known - 1);
        const z = Math.floor(index / plane), y = Math.floor((index - z * plane) / nx);
        return derivativesAt(index - z * plane - y * nx, y, z);
    };
    const wx = new Float64Array(4), wy = new Float64Array(4), wz = new Float64Array(4);
    /** The value at (x, y, z), in model units, and into `gradient` its gradient, per Å. */
    const sample = (x: number, y: number, z: number, gradient: Float64Array): number => {
        const u = (x - origin[0]) / h, v = (y - origin[1]) / h, w = (z - origin[2]) / h;
        const i = Math.floor(u), j = Math.floor(v), k = Math.floor(w);
        catmullRomWeights(u - i, wx);
        catmullRomWeights(v - j, wy);
        catmullRomWeights(w - k, wz);
        let value = 0, gx = 0, gy = 0, gz = 0;
        if (i >= 1 && j >= 1 && k >= 1 && i + 2 < nx && j + 2 < ny && k + 2 < nz) {
            // Inside the grid, as nearly every sample is: no clamping.
            const base = (k - 1) * plane + (j - 1) * nx + (i - 1);
            for (let c = 0; c < 4; c++) {
                for (let b = 0; b < 4; b++) {
                    const wyz = wy[b] * wz[c];
                    const row = base + c * plane + b * nx;
                    for (let a = 0; a < 4; a++) {
                        const weight = wx[a] * wyz;
                        const index = row + a;
                        value += weight * field[index];
                        const s = derivativesAtIndex(index);
                        gx += weight * derivatives[s];
                        gy += weight * derivatives[s + 1];
                        gz += weight * derivatives[s + 2];
                    }
                }
            }
            gradient[0] = gx / h; gradient[1] = gy / h; gradient[2] = gz / h;
            return value;
        }
        for (let c = 0; c < 4; c++) {
            for (let b = 0; b < 4; b++) {
                const wyz = wy[b] * wz[c];
                if (wyz === 0) continue;
                for (let a = 0; a < 4; a++) {
                    const weight = wx[a] * wyz;
                    if (weight === 0) continue;
                    const gi = i - 1 + a, gj = j - 1 + b, gk = k - 1 + c;
                    value += weight * valueAt(gi, gj, gk);
                    const s = derivativesAt(gi, gj, gk);
                    gx += weight * derivatives[s];
                    gy += weight * derivatives[s + 1];
                    gz += weight * derivatives[s + 2];
                }
            }
        }
        gradient[0] = gx / h; gradient[1] = gy / h; gradient[2] = gz / h;
        return value;
    };
    return { sample };
}

/**
 * Every triangle split in four at its edges' midpoints, and every vertex - old and new - moved onto
 * the field's zero by Newton steps along the gradient and given the gradient as its normal, both
 * from fieldSampler. The diffuse light follows the normal linearly across each triangle, which on
 * the marching cubes mesh at a 0.5 A grid draws the grid as soft diamonds wherever the light
 * changes slowly; halving the triangles takes most of that away at a quarter of the cost of
 * halving the grid (which costs eight times the field). Winding is kept: each new triangle turns
 * the way its parent did.
 */
export function refineContour(field: Float32Array, grid: GridShape, positions: Float32Array, indices: Uint32Array): SurfaceMesh {
    const vertexCount = positions.length / 3;
    // Each edge once, keyed by its ends: exact in a double up to ~9e7 vertices.
    const midpoints = new Map<number, number>();
    const extra: number[] = [];
    const midpoint = (a: number, b: number): number => {
        const key = a < b ? a * vertexCount + b : b * vertexCount + a;
        let m = midpoints.get(key);
        if (m === undefined) {
            m = vertexCount + extra.length / 3;
            extra.push(
                0.5 * (positions[3 * a] + positions[3 * b]),
                0.5 * (positions[3 * a + 1] + positions[3 * b + 1]),
                0.5 * (positions[3 * a + 2] + positions[3 * b + 2]),
            );
            midpoints.set(key, m);
        }
        return m;
    };
    const refined = new Uint32Array(4 * indices.length);
    let r = 0;
    for (let t = 0; t + 2 < indices.length; t += 3) {
        const a = indices[t], b = indices[t + 1], c = indices[t + 2];
        const ab = midpoint(a, b), bc = midpoint(b, c), ca = midpoint(c, a);
        refined.set([a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca], r);
        r += 12;
    }
    const out = new Float32Array(positions.length + extra.length);
    out.set(positions);
    out.set(extra, positions.length);
    const normals = new Float32Array(out.length);
    const { sample } = fieldSampler(field, grid);
    const g = new Float64Array(3);
    const maxStep = 0.5 * grid.spacing;
    for (let v = 0; v < out.length / 3; v++) {
        let x = out[3 * v], y = out[3 * v + 1], z = out[3 * v + 2];
        for (let iteration = 0; iteration < 4; iteration++) {
            const f = sample(x, y, z, g);
            const g2 = g[0] * g[0] + g[1] * g[1] + g[2] * g[2];
            if (g2 < 1e-20) break;
            // Newton along the gradient; held to half a voxel, so a vertex in a flat spot of the
            // field stays near where marching cubes put it.
            let s = f / g2;
            const length = Math.abs(s) * Math.sqrt(g2);
            if (length > maxStep) s *= maxStep / length;
            x -= s * g[0]; y -= s * g[1]; z -= s * g[2];
            if (Math.abs(f) < 1e-5 * grid.spacing) break;
        }
        sample(x, y, z, g);
        const len = Math.hypot(g[0], g[1], g[2]) || 1;
        out[3 * v] = x; out[3 * v + 1] = y; out[3 * v + 2] = z;
        normals[3 * v] = g[0] / len; normals[3 * v + 1] = g[1] / len; normals[3 * v + 2] = g[2] / len;
    }
    return { positions: out, normals, indices: refined };
}

/**
 * A contour finished: degenerate triangles dropped, normals added, wound counter-clockwise.
 * `refine`: and split once by refineContour.
 */
export function finishContour(field: Float32Array, grid: GridShape, contour: EdgeContour, refine = false): SurfaceMesh {
    const { indices: raw } = contour;
    let kept = 0;
    const indices = new Uint32Array(raw.length);
    for (let t = 0; t + 2 < raw.length; t += 3) {
        const a = raw[t], b = raw[t + 1], c = raw[t + 2];
        if (a === b || b === c || a === c) continue;
        indices[kept++] = a; indices[kept++] = b; indices[kept++] = c;
    }
    const mesh = refine
        ? refineContour(field, grid, contour.positions, indices.slice(0, kept))
        : { positions: contour.positions, normals: edgeNormals(field, grid, contour.keys), indices: indices.slice(0, kept) };
    orientTriangles(mesh, true);
    return mesh;
}

/** Marching cubes on the CPU, finished (and split once, with `refine`). */
export function contourField(grid: SesGrid, refine = false): SurfaceMesh {
    const field = contourInput(grid);
    return finishContour(field, grid, contourOnCpu(field, grid), refine);
}

/** Signed volume-ish test: does triangle t's winding agree with its vertices' normals? */
function windingAgrees(positions: ArrayLike<number>, normals: ArrayLike<number>, indices: ArrayLike<number>, t: number): number {
    const a = indices[3 * t], b = indices[3 * t + 1], c = indices[3 * t + 2];
    const ux = positions[3 * b] - positions[3 * a], uy = positions[3 * b + 1] - positions[3 * a + 1], uz = positions[3 * b + 2] - positions[3 * a + 2];
    const vx = positions[3 * c] - positions[3 * a], vy = positions[3 * c + 1] - positions[3 * a + 1], vz = positions[3 * c + 2] - positions[3 * a + 2];
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
    const nx = normals[3 * a] + normals[3 * b] + normals[3 * c];
    const ny = normals[3 * a + 1] + normals[3 * b + 1] + normals[3 * c + 1];
    const nz = normals[3 * a + 2] + normals[3 * b + 2] + normals[3 * c + 2];
    return cx * nx + cy * ny + cz * nz;
}

/** Wind every triangle counter-clockwise about its normals (ccw true) or clockwise. */
export function orientTriangles(mesh: SurfaceMesh, ccw: boolean): void {
    const { positions, normals, indices } = mesh;
    for (let t = 0; t < indices.length / 3; t++) {
        const agrees = windingAgrees(positions, normals, indices, t) >= 0;
        if (agrees !== ccw) {
            const b = indices[3 * t + 1];
            indices[3 * t + 1] = indices[3 * t + 2];
            indices[3 * t + 2] = b;
        }
    }
}

/**
 * How a mesh is laid out: whether its normals point away from its centre (out), and whether its
 * triangles wind counter-clockwise about its normals (ccw). By majority, over a sample.
 */
export function meshConventions(positions: ArrayLike<number>, normals: ArrayLike<number>, indices: ArrayLike<number>): { out: boolean; ccw: boolean } {
    const vertices = Math.floor(positions.length / 3);
    const centre = [0, 0, 0];
    for (let v = 0; v < vertices; v++) for (let k = 0; k < 3; k++) centre[k] += positions[3 * v + k] / vertices;
    let out = 0;
    const vStep = Math.max(1, Math.floor(vertices / 5000));
    for (let v = 0; v < vertices; v += vStep) {
        let dot = 0;
        for (let k = 0; k < 3; k++) dot += (positions[3 * v + k] - centre[k]) * normals[3 * v + k];
        out += dot >= 0 ? 1 : -1;
    }
    let ccw = 0;
    const triangles = Math.floor(indices.length / 3);
    const tStep = Math.max(1, Math.floor(triangles / 5000));
    for (let t = 0; t < triangles; t += tStep) ccw += windingAgrees(positions, normals, indices, t) >= 0 ? 1 : -1;
    return { out: out >= 0, ccw: ccw >= 0 };
}

/** The per-vertex data copied from the M2T surface. */
export interface M2tVertexData {
    positions: ArrayLike<number>;
    colours: ArrayLike<number>;
    /** Values per vertex in `colours` (4). */
    colourStride: number;
    owners?: ArrayLike<number>;
    ownersOther?: ArrayLike<number>;
    ownerWeights?: ArrayLike<number>;
}

export interface TransferredAttributes {
    colours: Float32Array;
    owners?: Uint32Array;
    ownersOther?: Uint32Array;
    ownerWeights?: Float32Array;
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

/** Colour and ownership for each of `positions`, from the nearest M2T vertex. */
export function transferM2tAttributes(positions: ArrayLike<number>, m2t: M2tVertexData): TransferredAttributes {
    const count = Math.floor(positions.length / 3);
    const nearest = nearestVertices(positions, m2t.positions);
    const stride = m2t.colourStride;
    const colours = new Float32Array(4 * count);
    const owners = m2t.owners ? new Uint32Array(count) : undefined;
    const ownersOther = m2t.ownersOther ? new Uint32Array(count) : undefined;
    const ownerWeights = m2t.ownerWeights ? new Float32Array(count) : undefined;
    for (let p = 0; p < count; p++) {
        const v = nearest[p];
        for (let k = 0; k < 4; k++) colours[4 * p + k] = v >= 0 ? (k < stride ? m2t.colours[stride * v + k] : 1) : 0.5;
        if (owners) owners[p] = v >= 0 ? m2t.owners[v] : 0xFFFFFFFF;
        if (ownersOther) ownersOther[p] = v >= 0 ? m2t.ownersOther[v] : 0xFFFFFFFF;
        if (ownerWeights) ownerWeights[p] = v >= 0 ? m2t.ownerWeights[v] : 1;
    }
    return { colours, owners, ownersOther, ownerWeights };
}

/** The M2T mesh fields this path reads and replaces (see libcoot.d.ts SimpleMeshJS). */
export interface M2tSurfaceMesh {
    vert_tri: [[ArrayLike<number>]];
    norm_tri: [[ArrayLike<number>]];
    col_tri: [[ArrayLike<number>]];
    idx_tri: [[ArrayLike<number>]];
    vertex_owners?: ArrayLike<number>;
    vertex_owners_other?: ArrayLike<number>;
    vertex_owner_weights?: ArrayLike<number>;
    [key: string]: unknown;
}

/** Options for smoothing an M2T surface; anything left out comes from smoothSurfaceSetting. */
export interface SmoothOptions {
    spacing?: number;
    sigma?: number;
    maxShift?: number;
    openRadius?: number;
    /** The exact (and slow) handling of pits and pockets: see sesField's `cavities`. */
    cavities?: boolean;
    /** Split the contour once (refineContour). */
    refine?: boolean;
}

/**
 * Smoothing is in four stages, so that the heavy ones can run where the M2T mesh is (the Coot
 * worker) and marching cubes on the GPU (the main thread) - or all four in one place:
 *
 * 1. smoothFieldStage, where the M2T mesh is: the field, ready to contour, and the M2T mesh's
 *    conventions (normals out or in, winding).
 * 2. smoothMeshFromContour, wherever the contour was made: normals and winding. Cheap.
 * 3. smoothAttributes, where the M2T mesh is: colours and owners from its nearest vertices.
 * 4. assembleSmoothMesh: the M2T mesh's shape, with the smoothed arrays.
 */
export interface SmoothField {
    grid: GridShape & { timings: SesGrid["timings"] };
    /** The field as marching cubes takes it (contourInput). */
    input: Float32Array;
    conventions: { out: boolean; ccw: boolean };
    atomCount: number;
    sigma: number;
    maxShift: number;
    /** Whether smoothMeshFromContour splits the contour (refineContour). */
    refine: boolean;
    fieldMs: number;
}

export function smoothFieldStage(m2tMesh: M2tSurfaceMesh, atoms: readonly SurfaceAtom[], probe: number, options: SmoothOptions): SmoothField | null {
    const started = performance.now();
    const spacing = options.spacing ?? smoothSurfaceSetting.spacing;
    const sigma = options.sigma ?? smoothSurfaceSetting.sigma;
    const maxShift = options.maxShift ?? smoothSurfaceSetting.maxShift;
    const openRadius = options.openRadius ?? smoothSurfaceSetting.openRadius;
    const cavities = options.cavities ?? smoothSurfaceSetting.cavities;
    const m2tPositions = m2tMesh.vert_tri?.[0]?.[0];
    const m2tNormals = m2tMesh.norm_tri?.[0]?.[0];
    const m2tIndices = m2tMesh.idx_tri?.[0]?.[0];
    if (!m2tPositions || !m2tNormals || !m2tIndices || !m2tMesh.col_tri?.[0]?.[0] || m2tPositions.length === 0) return null;
    const grid = sesField(atoms, probe, spacing, sigma, maxShift, openRadius, cavities);
    if (!grid) return null;
    const input = contourInput(grid);
    const { nx, ny, nz, origin, spacing: h, iso, timings } = grid;
    return {
        grid: { nx, ny, nz, origin, spacing: h, iso, timings },
        input,
        conventions: meshConventions(m2tPositions, m2tNormals, m2tIndices),
        atomCount: atoms.length, sigma, maxShift,
        refine: options.refine ?? smoothSurfaceSetting.refine,
        fieldMs: performance.now() - started,
    };
}

/** The contour finished - normals, winding - and laid out as the M2T mesh is. */
export function smoothMeshFromContour(field: SmoothField, contour: EdgeContour): SurfaceMesh {
    const mesh = finishContour(field.input, field.grid, contour, field.refine);
    if (!field.conventions.out) for (let i = 0; i < mesh.normals.length; i++) mesh.normals[i] = -mesh.normals[i];
    orientTriangles(mesh, field.conventions.ccw);
    return mesh;
}

/** Colour and ownership for the smoothed vertices, from the M2T mesh's nearest. */
export function smoothAttributes(m2tMesh: M2tSurfaceMesh, positions: Float32Array): TransferredAttributes {
    const m2tPositions = m2tMesh.vert_tri[0][0];
    const m2tColours = m2tMesh.col_tri[0][0];
    return transferM2tAttributes(positions, {
        positions: m2tPositions,
        colours: m2tColours,
        colourStride: Math.round(m2tColours.length / (m2tPositions.length / 3)),
        owners: m2tMesh.vertex_owners,
        ownersOther: m2tMesh.vertex_owners_other,
        ownerWeights: m2tMesh.vertex_owner_weights,
    });
}

/** The M2T mesh without its per-vertex arrays: what the smoothed mesh keeps of it. */
export function m2tShell<T extends M2tSurfaceMesh>(m2tMesh: T): T {
    const shell = { ...m2tMesh } as Record<string, unknown>;
    for (const key of ["vert_tri", "norm_tri", "col_tri", "idx_tri", "additional_norm_tri",
        "vertex_owners", "vertex_owners_other", "vertex_owner_weights"]) delete shell[key];
    return shell as T;
}

/** The smoothed mesh in the M2T mesh's shape, with the same owner table. */
export function assembleSmoothMesh<T extends M2tSurfaceMesh>(m2tMesh: T, mesh: SurfaceMesh, attributes: TransferredAttributes): T {
    const smoothed = {
        ...m2tShell(m2tMesh),
        vert_tri: [[mesh.positions]],
        norm_tri: [[mesh.normals]],
        col_tri: [[attributes.colours]],
        idx_tri: [[mesh.indices]],
    } as T;
    if (attributes.owners) smoothed.vertex_owners = attributes.owners;
    if (attributes.ownersOther) smoothed.vertex_owners_other = attributes.ownersOther;
    if (attributes.ownerWeights) smoothed.vertex_owner_weights = attributes.ownerWeights;
    return smoothed;
}

/** One line for the console: sizes and where the time went. */
export function logSmoothing(field: SmoothField, mesh: SurfaceMesh, m2tVertices: number, contourMs: number, transferMs: number, contourLabel: string): void {
    const { grid } = field;
    console.debug(`Smooth surface: ${field.atomCount} atoms, grid ${grid.nx}x${grid.ny}x${grid.nz} at ${grid.spacing.toFixed(2)} Å, ` +
        `σ ${field.sigma} Å, max shift ${field.maxShift} Å; ${mesh.positions.length / 3} vertices, ${mesh.indices.length / 3} triangles ` +
        `(M2T: ${m2tVertices} vertices); field ${field.fieldMs.toFixed(0)} ms ` +
        `(${Object.entries(grid.timings).map(([stage, ms]) => `${stage} ${ms.toFixed(0)}`).join(", ")}), ` +
        `contour (${contourLabel}) ${contourMs.toFixed(0)} ms, transfer ${transferMs.toFixed(0)} ms`);
}

/** All four stages in one place, with marching cubes by `contour`. */
async function smoothAll<T extends M2tSurfaceMesh>(m2tMesh: T, atoms: readonly SurfaceAtom[], probe: number, options: SmoothOptions,
    contour: Contourer, contourLabel: string): Promise<T> {
    const field = smoothFieldStage(m2tMesh, atoms, probe, options);
    if (!field) return m2tMesh;
    let mark = performance.now();
    const mesh = smoothMeshFromContour(field, await contour(field.input, field.grid));
    if (mesh.indices.length === 0) return m2tMesh;
    const contourMs = performance.now() - mark;
    mark = performance.now();
    const attributes = smoothAttributes(m2tMesh, mesh.positions);
    logSmoothing(field, mesh, m2tMesh.vert_tri[0][0].length / 3, contourMs, performance.now() - mark, contourLabel);
    return assembleSmoothMesh(m2tMesh, mesh, attributes);
}

/**
 * The M2T surface replaced by the smoothed one, in the same shape and with the same owner table,
 * so the caller carries on as if Coot had made it. The M2T mesh is returned unchanged if there is
 * nothing to smooth. Marching cubes on the CPU; this is what the Coot worker runs when there is
 * no GPU to contour on (see smoothSurfaceWorkerEntry.ts).
 */
export function smoothM2tSurfaceSync<T extends M2tSurfaceMesh>(m2tMesh: T, atoms: readonly SurfaceAtom[], probe: number,
    options: SmoothOptions = {}): T {
    const field = smoothFieldStage(m2tMesh, atoms, probe, options);
    if (!field) return m2tMesh;
    let mark = performance.now();
    const mesh = smoothMeshFromContour(field, contourOnCpu(field.input, field.grid));
    if (mesh.indices.length === 0) return m2tMesh;
    const contourMs = performance.now() - mark;
    mark = performance.now();
    const attributes = smoothAttributes(m2tMesh, mesh.positions);
    logSmoothing(field, mesh, m2tMesh.vert_tri[0][0].length / 3, contourMs, performance.now() - mark, "CPU");
    return assembleSmoothMesh(m2tMesh, mesh, attributes);
}

/** smoothM2tSurfaceSync with marching cubes by `contour`, all on the calling thread. */
export async function smoothM2tSurface<T extends M2tSurfaceMesh>(m2tMesh: T, atoms: readonly SurfaceAtom[], probe: number,
    options: SmoothOptions & { contour?: Contourer; contourLabel?: string } = {}): Promise<T> {
    return smoothAll(m2tMesh, atoms, probe, options, options.contour ?? contourOnCpu, options.contourLabel ?? "CPU");
}

/** Atoms as x, y, z, r per atom: how they travel to the Coot worker. */
export function packAtoms(atoms: readonly SurfaceAtom[]): Float32Array {
    const packed = new Float32Array(4 * atoms.length);
    atoms.forEach((a, i) => packed.set([a.x, a.y, a.z, a.r], 4 * i));
    return packed;
}

export function unpackAtoms(packed: ArrayLike<number>): SurfaceAtom[] {
    const atoms: SurfaceAtom[] = [];
    for (let i = 0; i + 3 < packed.length; i += 4) atoms.push({ x: packed[i], y: packed[i + 1], z: packed[i + 2], r: packed[i + 3] });
    return atoms;
}

/** The buffers of a smoothed mesh that can be handed over by postMessage rather than copied. */
export function smoothedMeshTransferables(mesh: M2tSurfaceMesh): ArrayBuffer[] {
    const buffers = new Set<ArrayBuffer>();
    const add = (v: unknown) => {
        if (ArrayBuffer.isView(v) && v.buffer instanceof ArrayBuffer) buffers.add(v.buffer);
    };
    [mesh.vert_tri?.[0]?.[0], mesh.norm_tri?.[0]?.[0], mesh.col_tri?.[0]?.[0], mesh.idx_tri?.[0]?.[0],
        mesh.vertex_owners, mesh.vertex_owners_other, mesh.vertex_owner_weights].forEach(add);
    return [...buffers];
}
