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
    enabled: false,
    /** Grid spacing, Å. Raised automatically if the grid would be too large. */
    spacing: 0.35,
    /**
     * Gaussian blur of the distance field, Å. 0: no blur (a voxelised SES). 0.8 rounded the
     * molecule into blobs; around 0.3-0.4 softens the atom caps and keeps their shape.
     */
    sigma: 0.35,
    /** Marching cubes with the WebGPU MetaBalls kernels, when WebGPU is there. */
    gpu: false,
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
function nearestSasPoint(px: number, py: number, pz: number, near: readonly number[], atoms: SasAtoms, out: number[]): boolean {
    let best = Infinity;
    const q = NEAREST_SCRATCH;
    for (let i = 0; i < near.length; i++) {
        for (let j = i; j < near.length; j++) {
            // j === i: the sphere of near[i]; otherwise the circle of near[i] and near[j].
            const a = near[i], b = j === i ? -1 : near[j];
            if (!projectOnPrimitive(px, py, pz, a, b, atoms, q)) continue;
            const d2 = (q[0] - px) ** 2 + (q[1] - py) ** 2 + (q[2] - pz) ** 2;
            if (d2 >= best || buriedBy(q, near, 0, near.length, a, b, atoms) >= 0) continue;
            best = d2;
            out[0] = q[0]; out[1] = q[1]; out[2] = q[2]; out[3] = a; out[4] = b;
        }
    }
    return best < Infinity;
}
const NEAREST_SCRATCH = [0, 0, 0];

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

/** The blurred SES signed distance field of these atoms. Null if there are none. */
export function sesField(atoms: readonly SurfaceAtom[], probe: number, spacing: number, sigma: number): SesGrid | null {
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

    // 1. SAS occupancy.
    const exterior = new Uint8Array(count).fill(1);
    for (const a of atoms) {
        const R = a.r + probe;
        const R2 = R * R;
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
                    if (dx * dx + dyz2 <= R2) exterior[row + ix] = 0;
                }
            }
        }
    }

    const sasMs = lap();

    // 2. Seeds: exterior points with an interior neighbour - every interior point's nearest
    // exterior point is one of them - each with the exact nearest point of the SAS surface, the
    // primitive it is on, and the atoms near enough to bury points of that primitive close by.
    const window = 2 * h;
    const atomBins = binAtoms(atoms, rMax + probe + window);
    const sas: SasAtoms = {
        x: Float64Array.from(atoms, a => a.x), y: Float64Array.from(atoms, a => a.y), z: Float64Array.from(atoms, a => a.z),
        R: Float64Array.from(atoms, a => a.r + probe),
    };
    const feature = new Int32Array(count).fill(-1);
    const seedPoints: number[] = [];
    const seedA: number[] = [];
    const seedB: number[] = [];
    const seedNearEnd: number[] = [];
    const seedNear: number[] = [];
    const near: number[] = [];
    const found = [0, 0, 0, -1, -1];
    for (let iz = 1; iz < nz - 1; iz++) {
        for (let iy = 1; iy < ny - 1; iy++) {
            for (let ix = 1; ix < nx - 1; ix++) {
                const i = iz * plane + iy * nx + ix;
                if (!exterior[i]) continue;
                if (exterior[i - 1] && exterior[i + 1] && exterior[i - nx] && exterior[i + nx] && exterior[i - plane] && exterior[i + plane]) continue;
                const px = origin[0] + ix * h, py = origin[1] + iy * h, pz = origin[2] + iz * h;
                atomBins.near(px, py, pz, sas.x, sas.y, sas.z, sas.R, window, near);
                if (!nearestSasPoint(px, py, pz, near, sas, found)) {
                    found[0] = px; found[1] = py; found[2] = pz; found[3] = -1; found[4] = -1;
                }
                feature[i] = seedA.length;
                seedPoints.push(found[0], found[1], found[2]);
                seedA.push(found[3]);
                seedB.push(found[4]);
                for (const a of near) seedNear.push(a);
                seedNearEnd.push(seedNear.length);
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
    const nearList = Int32Array.from(seedNear);
    const nearEnd = Int32Array.from(seedNearEnd);
    const primA = Int32Array.from(seedA);
    const primB = Int32Array.from(seedB);
    const clamp = 3 * sigma + 2 * h;
    // Only near the SES (distance to the SAS within the blur's reach of the probe radius) does
    // the exact value matter; further in it is clamped, further out (towards the SAS) nothing
    // the blur reaches the surface from.
    const exactLow = probe - clamp - h, exactHigh = probe + clamp + h;
    let interiorCount = 0;

    const q = [0, 0, 0];
    let px = 0, py = 0, pz = 0, best = Infinity, from = 0, to = 0;
    const tried: number[] = [];
    const firstTry = (key: number) => {
        if (tried.includes(key)) return false;
        tried.push(key);
        return true;
    };
    const tryVertex = (a: number, b: number, c: number) => {
        if (!projectOnVertex(px, py, pz, a, b, c, sas, q)) return;
        const d2 = (q[0] - px) ** 2 + (q[1] - py) ** 2 + (q[2] - pz) ** 2;
        if (d2 < best && buriedBy(q, nearList, from, to, a, b, sas, c) < 0) best = d2;
    };
    const tryCircle = (a: number, b: number) => {
        if (!firstTry(-(Math.min(a, b) * atoms.length + Math.max(a, b)) - 1)) return;
        if (!projectOnPrimitive(px, py, pz, a, b, sas, q)) return;
        const d2 = (q[0] - px) ** 2 + (q[1] - py) ** 2 + (q[2] - pz) ** 2;
        if (d2 >= best) return;
        const c = buriedBy(q, nearList, from, to, a, b, sas);
        if (c < 0) best = d2;
        else tryVertex(a, b, c);
    };
    const trySphere = (a: number) => {
        if (!firstTry(a)) return;
        if (!projectOnPrimitive(px, py, pz, a, -1, sas, q)) return;
        const d2 = (q[0] - px) ** 2 + (q[1] - py) ** 2 + (q[2] - pz) ** 2;
        if (d2 >= best) return;
        const c = buriedBy(q, nearList, from, to, a, -1, sas);
        if (c < 0) best = d2;
        else tryCircle(a, c);
    };
    const candidates = new Int32Array(7);
    const neighbours = new Int32Array(7);
    for (let iz = 0; iz < nz; iz++) {
        for (let iy = 0; iy < ny; iy++) {
            for (let ix = 0; ix < nx; ix++) {
                const i = iz * plane + iy * nx + ix;
                if (exterior[i] || feature[i] < 0) {
                    field[i] = -probe;
                    continue;
                }
                px = origin[0] + ix * h; py = origin[1] + iy * h; pz = origin[2] + iz * h;
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
                    for (let k = 0; k < n; k++) {
                        const f = candidates[k];
                        if (primA[f] < 0) continue;
                        from = f > 0 ? nearEnd[f - 1] : 0;
                        to = nearEnd[f];
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

    const distanceMs = lap();

    // 4. Blur, and contour where the blurred field encloses as much as the SES did. Blurring a
    // distance field pulls convex parts in (a sphere of radius R by about σ²/R) and pushes concave
    // ones out; contouring at 0 would shrink the molecule overall, every atom cap being convex.
    // Holding the volume makes it a smoothing rather than an erosion.
    gaussianBlur3d(field, nx, ny, nz, sigma / h);
    const iso = sigma > 0 ? levelEnclosing(field, interiorCount, clamp) : 0;

    const blurMs = lap();

    return {
        field, nx, ny, nz, origin, spacing: h, iso,
        timings: { sas: sasMs, seeds: seedsMs, transform: transformMs, distance: distanceMs, blur: blurMs },
    };
}

/** Atoms binned on a coarse grid, to find those near a point: cell lists, CSR. */
function binAtoms(atoms: readonly SurfaceAtom[], size: number) {
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
            for (let k = Math.max(0, ck - 1); k <= Math.min(dims[2] - 1, ck + 1); k++) {
                for (let j = Math.max(0, cj - 1); j <= Math.min(dims[1] - 1, cj + 1); j++) {
                    for (let i = Math.max(0, ci - 1); i <= Math.min(dims[0] - 1, ci + 1); i++) {
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
export type Contourer = (field: Float32Array, grid: SesGrid) => EdgeContour | Promise<EdgeContour>;

/**
 * The field as marching cubes takes it: negative inside, the surface at 0. The GPU MetaBalls
 * kernels count a point as inside when its value is below 0, and so does contourOnCpu.
 */
export const contourInput = (grid: SesGrid): Float32Array => grid.field.map(v => grid.iso - v);

/** Marching cubes on the CPU, as the WebGPU MetaBalls kernels do it. */
export function contourOnCpu(field: Float32Array, grid: SesGrid): EdgeContour {
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
 * Each vertex's normal from the field's gradient, interpolated along its grid edge as its
 * position was: smooth as the field is, not as faceted as the triangles. `field` is the contour
 * input, rising outwards, so out is up its gradient.
 */
export function edgeNormals(field: Float32Array, grid: SesGrid, keys: Uint32Array): Float32Array {
    const { nx, ny, nz } = grid;
    const plane = nx * ny;
    const normals = new Float32Array(3 * keys.length);
    const ga = [0, 0, 0], gb = [0, 0, 0];
    const gradient = (i: number, out: number[]) => {
        const iz = Math.floor(i / plane), iy = Math.floor((i - iz * plane) / nx), ix = i - iz * plane - iy * nx;
        out[0] = field[ix < nx - 1 ? i + 1 : i] - field[ix > 0 ? i - 1 : i];
        out[1] = field[iy < ny - 1 ? i + nx : i] - field[iy > 0 ? i - nx : i];
        out[2] = field[iz < nz - 1 ? i + plane : i] - field[iz > 0 ? i - plane : i];
    };
    for (let v = 0; v < keys.length; v++) {
        const axis = keys[v] % 3;
        const p = (keys[v] - axis) / 3;
        const q = p + (axis === 0 ? 1 : axis === 1 ? nx : plane);
        const a = field[p], b = field[q];
        const t = a === b ? 0.5 : a / (a - b);
        gradient(p, ga);
        gradient(q, gb);
        const gx = ga[0] + t * (gb[0] - ga[0]), gy = ga[1] + t * (gb[1] - ga[1]), gz = ga[2] + t * (gb[2] - ga[2]);
        const len = Math.hypot(gx, gy, gz) || 1;
        normals[3 * v] = gx / len;
        normals[3 * v + 1] = gy / len;
        normals[3 * v + 2] = gz / len;
    }
    return normals;
}

/** A contour finished: degenerate triangles dropped, normals added, wound counter-clockwise. */
export function finishContour(field: Float32Array, grid: SesGrid, contour: EdgeContour): SurfaceMesh {
    const { indices: raw } = contour;
    let kept = 0;
    const indices = new Uint32Array(raw.length);
    for (let t = 0; t + 2 < raw.length; t += 3) {
        const a = raw[t], b = raw[t + 1], c = raw[t + 2];
        if (a === b || b === c || a === c) continue;
        indices[kept++] = a; indices[kept++] = b; indices[kept++] = c;
    }
    const mesh = { positions: contour.positions, normals: edgeNormals(field, grid, contour.keys), indices: indices.slice(0, kept) };
    orientTriangles(mesh, true);
    return mesh;
}

/** Marching cubes on the CPU, finished. */
export function contourField(grid: SesGrid): SurfaceMesh {
    const field = contourInput(grid);
    return finishContour(field, grid, contourOnCpu(field, grid));
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

/**
 * The M2T surface replaced by the smoothed one, in the same shape and with the same owner table,
 * so the caller carries on as if Coot had made it. The M2T mesh is returned unchanged if there is
 * nothing to smooth.
 */
export async function smoothM2tSurface<T extends M2tSurfaceMesh>(m2tMesh: T, atoms: readonly SurfaceAtom[], probe: number,
    options: { spacing?: number; sigma?: number; contour?: Contourer; contourLabel?: string } = {}): Promise<T> {
    const spacing = options.spacing ?? smoothSurfaceSetting.spacing;
    const sigma = options.sigma ?? smoothSurfaceSetting.sigma;
    const contour = options.contour ?? contourOnCpu;
    const started = performance.now();
    const m2tPositions = m2tMesh.vert_tri?.[0]?.[0];
    const m2tNormals = m2tMesh.norm_tri?.[0]?.[0];
    const m2tIndices = m2tMesh.idx_tri?.[0]?.[0];
    const m2tColours = m2tMesh.col_tri?.[0]?.[0];
    if (!m2tPositions || !m2tNormals || !m2tIndices || !m2tColours || m2tPositions.length === 0) return m2tMesh;

    const grid = sesField(atoms, probe, spacing, sigma);
    if (!grid) return m2tMesh;
    const fieldMs = performance.now() - started;
    const input = contourInput(grid);
    const mesh = finishContour(input, grid, await contour(input, grid));
    if (mesh.indices.length === 0) return m2tMesh;
    const contourMs = performance.now() - started - fieldMs;

    // Follow the M2T mesh's own conventions, whatever they are, so the renderer sees what it
    // always has.
    const conventions = meshConventions(m2tPositions, m2tNormals, m2tIndices);
    if (!conventions.out) for (let i = 0; i < mesh.normals.length; i++) mesh.normals[i] = -mesh.normals[i];
    orientTriangles(mesh, conventions.ccw);

    const m2tVertexCount = m2tPositions.length / 3;
    const attributes = transferM2tAttributes(mesh.positions, {
        positions: m2tPositions,
        colours: m2tColours,
        colourStride: Math.round(m2tColours.length / m2tVertexCount),
        owners: m2tMesh.vertex_owners,
        ownersOther: m2tMesh.vertex_owners_other,
        ownerWeights: m2tMesh.vertex_owner_weights,
    });
    const transferMs = performance.now() - started - fieldMs - contourMs;
    console.debug(`Smooth surface: ${atoms.length} atoms, grid ${grid.nx}x${grid.ny}x${grid.nz} at ${grid.spacing.toFixed(2)} Å, ` +
        `σ ${sigma} Å; ${mesh.positions.length / 3} vertices, ${mesh.indices.length / 3} triangles ` +
        `(M2T: ${m2tVertexCount}, ${m2tIndices.length / 3}); field ${fieldMs.toFixed(0)} ms ` +
        `(${Object.entries(grid.timings).map(([stage, ms]) => `${stage} ${ms.toFixed(0)}`).join(", ")}), ` +
        `contour (${options.contourLabel ?? "CPU"}) ${contourMs.toFixed(0)} ms, transfer ${transferMs.toFixed(0)} ms`);

    const smoothed: T = {
        ...m2tMesh,
        vert_tri: [[mesh.positions]],
        norm_tri: [[mesh.normals]],
        col_tri: [[attributes.colours]],
        idx_tri: [[mesh.indices]],
    };
    if (attributes.owners) smoothed.vertex_owners = attributes.owners;
    if (attributes.ownersOther) smoothed.vertex_owners_other = attributes.ownersOther;
    if (attributes.ownerWeights) smoothed.vertex_owner_weights = attributes.ownerWeights;
    // Per-vertex extras of the M2T mesh no longer line up with the vertices.
    delete (smoothed as Record<string, unknown>).additional_norm_tri;
    return smoothed;
}
