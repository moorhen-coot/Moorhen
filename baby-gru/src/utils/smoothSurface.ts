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
     * Split every triangle once, with positions and normals from the field (refineContour): the
     * diffuse light's diamonds at a 0.5 A grid mostly gone, for four times the triangles rather
     * than eight times the field a 0.25 A grid costs.
     */
    refine: true,
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
 * The nearest point of the SAS surface to p, which is outside every expanded sphere: its projection
 * onto the nearest of them (the least |p - c| - R among `near`), into out as x, y, z, a, -1, -1. Nothing
 * buries it - a sphere b covering it would put p nearer b's surface than a's - so no circle or
 * point where three meet can be nearer. (This was a search over spheres, circles and atom triples,
 * from when it also served points inside the SAS; those are nearestExposedPoint's now.) False if
 * `near` is empty or p is at the nearest centre.
 */
function nearestSphere(px: number, py: number, pz: number, near: readonly number[], atoms: SasAtoms, out: number[]): boolean {
    let best = Infinity, bestAtom = -1, bestDistance = 0;
    for (const a of near) {
        const distance = Math.hypot(px - atoms.x[a], py - atoms.y[a], pz - atoms.z[a]);
        const gap = distance - atoms.R[a];
        if (gap < best) { best = gap; bestAtom = a; bestDistance = distance; }
    }
    if (bestAtom < 0 || bestDistance < 1e-9) return false;
    const scale = atoms.R[bestAtom] / bestDistance;
    out[0] = atoms.x[bestAtom] + (px - atoms.x[bestAtom]) * scale;
    out[1] = atoms.y[bestAtom] + (py - atoms.y[bestAtom]) * scale;
    out[2] = atoms.z[bestAtom] + (pz - atoms.z[bestAtom]) * scale;
    out[3] = bestAtom; out[4] = -1; out[5] = -1;
    return true;
}
const NEAREST_SCRATCH = [0, 0, 0];

/**
 * The exposed part of the SAS, worked out once: for every pair of atoms whose expanded spheres
 * meet, the arcs of their circle that no other sphere covers. Each other sphere covers one stretch
 * of angle of a circle (or none, or all of it), in closed form; what is left of the circle once
 * they are merged is its exposed arcs, and the ends of those arcs are the points where three
 * spheres meet that the probe can reach. An atom is exposed if it has an exposed arc, or meets no
 * other sphere and is inside none.
 *
 * Each circle's arcs depend on nothing but its two atoms' neighbours, so this is one independent
 * job per pair: the same loop in C++, or one GPU thread per circle.
 */
interface ExposedSas {
    /** 1 for an atom with exposed surface. */
    exposed: Uint8Array;
    /** Per atom (CSR), the circles it is the lower-numbered atom of: circle ids in `circleIds`. */
    circleStart: Int32Array;
    circleIds: Int32Array;
    /** Per atom (CSR), every exposed circle on its sphere, either end: the boundary of its patch. */
    atomCircleStart: Int32Array;
    atomCircleIds: Int32Array;
    /**
     * Per atom (CSR), every other atom whose expanded sphere meets its own: the only atoms that can
     * bury a point of its sphere, so a burial check needs no spatial lookup.
     */
    neighbourStart: Int32Array;
    neighbourIds: Int32Array;
    /** Per circle: the other atom; centre, axis, a basis of its plane, radius. */
    other: Int32Array;
    centre: Float64Array;
    axis: Float64Array;
    e1: Float64Array;
    e2: Float64Array;
    radius: Float64Array;
    /** Per circle (CSR), its exposed arcs: start angle in [0, 2π) and length. */
    arcStart: Int32Array;
    arcFrom: Float64Array;
    arcLength: Float64Array;
}

const TWO_PI = 2 * Math.PI;

function exposedSas(sas: SasAtoms, neighbours: (a: number, out: number[]) => void): ExposedSas {
    const { x, y, z, R } = sas;
    const n = x.length;
    const exposed = new Uint8Array(n);
    const circleCount = new Int32Array(n);
    const contained = new Uint8Array(n);
    const circleOwner: number[] = [], other: number[] = [];
    const centre: number[] = [], axis: number[] = [], e1s: number[] = [], e2s: number[] = [], radius: number[] = [];
    const arcStart: number[] = [0], arcFrom: number[] = [], arcLength: number[] = [];
    const near: number[] = [];
    const neighbourStart = new Int32Array(n + 1);
    const neighbourIds: number[] = [];
    // Covered stretches of the current circle, as [from, to] within [0, 2π].
    const lo: number[] = [], hi: number[] = [];
    const order: number[] = [];
    for (let a = 0; a < n; a++) {
        neighbours(a, near);
        for (const b of near) if (b !== a) neighbourIds.push(b);
        neighbourStart[a + 1] = neighbourIds.length;
        for (const b of near) {
            if (b === a) continue;
            const ux0 = x[b] - x[a], uy0 = y[b] - y[a], uz0 = z[b] - z[a];
            const d = Math.hypot(ux0, uy0, uz0);
            // Inside b (of two identical spheres, the later counts as inside the earlier).
            if (d + R[a] <= R[b] && (d > 1e-9 || R[a] < R[b] || a > b)) contained[a] = 1;
            if (b < a || d < 1e-6 || d >= R[a] + R[b]) continue;
            const t = (d * d + R[a] * R[a] - R[b] * R[b]) / (2 * d);
            const r2 = R[a] * R[a] - t * t;
            if (r2 <= 0) continue;
            circleCount[a]++; circleCount[b]++;
            const rc = Math.sqrt(r2);
            const ux = ux0 / d, uy = uy0 / d, uz = uz0 / d;
            const cx = x[a] + t * ux, cy = y[a] + t * uy, cz = z[a] + t * uz;
            // A basis of the circle's plane: e1 from the axis' smallest component, e2 = u x e1.
            let px = 0, py = 0, pz = 0;
            if (Math.abs(ux) <= Math.abs(uy) && Math.abs(ux) <= Math.abs(uz)) px = 1;
            else if (Math.abs(uy) <= Math.abs(uz)) py = 1;
            else pz = 1;
            const along = px * ux + py * uy + pz * uz;
            let ax1 = px - along * ux, ay1 = py - along * uy, az1 = pz - along * uz;
            const l1 = Math.hypot(ax1, ay1, az1);
            ax1 /= l1; ay1 /= l1; az1 /= l1;
            const ax2 = uy * az1 - uz * ay1, ay2 = uz * ax1 - ux * az1, az2 = ux * ay1 - uy * ax1;
            // Each other sphere c covers the circle where |X(θ) - c|² < Rc², X(θ) = C + rc(cos θ e1
            // + sin θ e2): A cos θ + B sin θ < K. Held 1e-4 inside c, as buriedBy holds it.
            lo.length = 0; hi.length = 0;
            let whole = false;
            for (const c of near) {
                if (c === a || c === b) continue;
                const wx = cx - x[c], wy = cy - y[c], wz = cz - z[c];
                const A = 2 * rc * (wx * ax1 + wy * ay1 + wz * az1);
                const B = 2 * rc * (wx * ax2 + wy * ay2 + wz * az2);
                const Rc = R[c] - 1e-4;
                const K = Rc * Rc - (wx * wx + wy * wy + wz * wz) - r2;
                const M = Math.hypot(A, B);
                if (K <= -M) continue;
                if (K > M) { whole = true; break; }
                // Covered where cos(θ - φ) < K / M: a stretch centred on φ + π.
                const half = Math.PI - Math.acos(K / M);
                let mid = Math.atan2(B, A) + Math.PI;
                if (mid >= TWO_PI) mid -= TWO_PI;
                const from = mid - half, to = mid + half;
                if (from < 0) { lo.push(from + TWO_PI, 0); hi.push(TWO_PI, to); }
                else if (to > TWO_PI) { lo.push(from, 0); hi.push(TWO_PI, to - TWO_PI); }
                else { lo.push(from); hi.push(to); }
            }
            if (whole) continue;
            // What the covered stretches leave of [0, 2π), in order.
            order.length = 0;
            for (let k = 0; k < lo.length; k++) order.push(k);
            order.sort((p, q) => lo[p] - lo[q]);
            const arcs: number[] = [];
            let reached = 0;
            for (const k of order) {
                if (lo[k] > reached) arcs.push(reached, lo[k] - reached);
                reached = Math.max(reached, hi[k]);
            }
            if (reached < TWO_PI) arcs.push(reached, TWO_PI - reached);
            if (arcs.length === 0) continue;
            // An arc through 0 is one arc, not two.
            if (arcs.length >= 4 && arcs[0] === 0 && arcs[arcs.length - 2] + arcs[arcs.length - 1] >= TWO_PI) {
                arcs[arcs.length - 1] += arcs[1];
                arcs.splice(0, 2);
            }
            exposed[a] = 1; exposed[b] = 1;
            circleOwner.push(a); other.push(b);
            centre.push(cx, cy, cz); axis.push(ux, uy, uz); e1s.push(ax1, ay1, az1); e2s.push(ax2, ay2, az2); radius.push(rc);
            for (let k = 0; k < arcs.length; k += 2) { arcFrom.push(arcs[k]); arcLength.push(arcs[k + 1]); }
            arcStart.push(arcFrom.length);
        }
    }
    // A sphere that meets no other and is inside none is exposed all over.
    for (let a = 0; a < n; a++) if (circleCount[a] === 0 && !contained[a]) exposed[a] = 1;
    // Circles by their lower-numbered atom.
    const circleStart = new Int32Array(n + 1);
    for (const a of circleOwner) circleStart[a + 1]++;
    for (let a = 0; a < n; a++) circleStart[a + 1] += circleStart[a];
    const fill = circleStart.slice(0, n);
    const circleIds = new Int32Array(circleOwner.length);
    circleOwner.forEach((a, id) => { circleIds[fill[a]++] = id; });
    const atomCircleStart = new Int32Array(n + 1);
    circleOwner.forEach((a, id) => { atomCircleStart[a + 1]++; atomCircleStart[other[id] + 1]++; });
    for (let a = 0; a < n; a++) atomCircleStart[a + 1] += atomCircleStart[a];
    const atomFill = atomCircleStart.slice(0, n);
    const atomCircleIds = new Int32Array(2 * circleOwner.length);
    circleOwner.forEach((a, id) => { atomCircleIds[atomFill[a]++] = id; atomCircleIds[atomFill[other[id]]++] = id; });
    return {
        exposed, circleStart, circleIds, atomCircleStart, atomCircleIds,
        neighbourStart, neighbourIds: Int32Array.from(neighbourIds),
        other: Int32Array.from(other), centre: Float64Array.from(centre), axis: Float64Array.from(axis),
        e1: Float64Array.from(e1s), e2: Float64Array.from(e2s), radius: Float64Array.from(radius),
        arcStart: Int32Array.from(arcStart), arcFrom: Float64Array.from(arcFrom), arcLength: Float64Array.from(arcLength),
    };
}

/**
 * The nearest exposed point of the SAS to p within `within`, into out as nearestSphere gives it
 * (x, y, z, a, b, circle id; b and the id -1 for a sphere): p's projection onto an exposed atom's sphere, if nothing
 * buries it, or the nearest point of an exposed arc - p's projection onto the circle if that is on
 * an exposed arc, otherwise the nearer end of one, which is a point where three spheres meet. That
 * is every place the nearest point of the exposed surface can be, so it is the nearest, with no
 * search over triples. False if there is none within `within`.
 *
 * `candidates`: the exposed atoms whose sphere reaches within `within` of p (any atom with a sphere
 * or circle point that near is one).
 */
function nearestExposedPoint(px: number, py: number, pz: number, candidates: readonly number[], exp: ExposedSas,
                             atoms: SasAtoms, within: number, out: number[]): boolean {
    const limit = within * within * (1 + 1e-12);
    let best = limit;
    const q = NEAREST_SCRATCH;
    for (const a of candidates) {
        const dx = px - atoms.x[a], dy = py - atoms.y[a], dz = pz - atoms.z[a];
        const dist = Math.hypot(dx, dy, dz);
        const gap = Math.abs(dist - atoms.R[a]);
        // Every point of a's sphere, its circles included, is at least gap from p.
        if (gap * gap >= best) continue;
        if (dist > 1e-9) {
            q[0] = atoms.x[a] + atoms.R[a] * dx / dist; q[1] = atoms.y[a] + atoms.R[a] * dy / dist; q[2] = atoms.z[a] + atoms.R[a] * dz / dist;
            if (buriedBy(q, exp.neighbourIds, exp.neighbourStart[a], exp.neighbourStart[a + 1], a, -1, atoms) < 0) {
                best = gap * gap;
                out[0] = q[0]; out[1] = q[1]; out[2] = q[2]; out[3] = a; out[4] = -1; out[5] = -1;
            }
        }
        for (let k = exp.circleStart[a]; k < exp.circleStart[a + 1]; k++) {
            const id = exp.circleIds[k];
            const d2 = nearestOnArcs(px, py, pz, exp, id, best, q);
            if (d2 >= best) continue;
            best = d2;
            out[0] = q[0]; out[1] = q[1]; out[2] = q[2]; out[3] = a; out[4] = exp.other[id]; out[5] = id;
        }
    }
    return best < limit;
}

/**
 * The squared distance from p to the nearest exposed point of circle `id` (its projection onto the
 * circle if that is on an exposed arc, otherwise the nearer end of an arc: a point where three
 * spheres meet), with that point into q; `bound` or more, q untouched, if the whole circle is no
 * nearer than `bound`.
 */
function nearestOnArcs(px: number, py: number, pz: number, exp: ExposedSas, id: number, bound: number, q: number[]): number {
    const cx = exp.centre[3 * id], cy = exp.centre[3 * id + 1], cz = exp.centre[3 * id + 2];
    const wx = px - cx, wy = py - cy, wz = pz - cz;
    const along = wx * exp.axis[3 * id] + wy * exp.axis[3 * id + 1] + wz * exp.axis[3 * id + 2];
    const u = wx * exp.e1[3 * id] + wy * exp.e1[3 * id + 1] + wz * exp.e1[3 * id + 2];
    const v = wx * exp.e2[3 * id] + wy * exp.e2[3 * id + 1] + wz * exp.e2[3 * id + 2];
    const s = Math.hypot(u, v), rc = exp.radius[id];
    // The circle's nearest point to p, arcs or not, bounds them all.
    const nearest = along * along + (s - rc) * (s - rc);
    if (nearest >= bound) return nearest;
    let theta = Math.atan2(v, u);
    if (theta < 0) theta += TWO_PI;
    // The exposed angle nearest p's: its own, if on an arc; else the nearest arc end.
    let chosen = theta, gapAngle = Infinity;
    for (let m = exp.arcStart[id]; m < exp.arcStart[id + 1]; m++) {
        let into = theta - exp.arcFrom[m];
        if (into < 0) into += TWO_PI;
        const length = exp.arcLength[m];
        if (into <= length) { chosen = theta; gapAngle = 0; break; }
        // Past the end by (into - length), short of the start by (2π - into).
        const pastEnd = into - length, beforeStart = TWO_PI - into;
        if (pastEnd < gapAngle) { gapAngle = pastEnd; chosen = exp.arcFrom[m] + length; }
        if (beforeStart < gapAngle) { gapAngle = beforeStart; chosen = exp.arcFrom[m]; }
    }
    const d2 = along * along + s * s + rc * rc - 2 * s * rc * Math.cos(gapAngle);
    if (d2 >= bound) return d2;
    const cosC = Math.cos(chosen), sinC = Math.sin(chosen);
    q[0] = cx + rc * (cosC * exp.e1[3 * id] + sinC * exp.e2[3 * id]);
    q[1] = cy + rc * (cosC * exp.e1[3 * id + 1] + sinC * exp.e2[3 * id + 1]);
    q[2] = cz + rc * (cosC * exp.e1[3 * id + 2] + sinC * exp.e2[3 * id + 2]);
    return d2;
}

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
 * cutting pinched necks (step 3b). Pits and pockets are exact: the nearest exposed point of the SAS
 * comes from its exposed arcs (exposedSas), not from following burying atoms (the `cavities`
 * option that used to choose between following the first or all of them is gone).
 */
export function sesField(atoms: readonly SurfaceAtom[], probe: number, spacing: number, sigma: number,
                         maxShift = Infinity, openRadius = 0): SesGrid | null {
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
    // The exposed SAS (exposedSas), for the interior points searched below, and the exposed atoms
    // binned on their own: a point with none of them within a voxel diagonal has nothing to find.
    const exposure = exposedSas(sas, (a, out) => atomBins.near(sas.x[a], sas.y[a], sas.z[a], sas.x, sas.y, sas.z, sas.R, sas.R[a], out));
    const exposedIds: number[] = [];
    for (let a = 0; a < atoms.length; a++) if (exposure.exposed[a]) exposedIds.push(a);
    const exposedSasAtoms: SasAtoms = {
        x: Float64Array.from(exposedIds, a => sas.x[a]), y: Float64Array.from(exposedIds, a => sas.y[a]),
        z: Float64Array.from(exposedIds, a => sas.z[a]), R: Float64Array.from(exposedIds, a => sas.R[a]),
    };
    const exposedBins = binAtoms(exposedIds.map(a => atoms[a]), rMax + probe + diagonal, rMax + probe);
    const exposedNear: number[] = [];
    const exposedCandidates: number[] = [];
    const feature = new Int32Array(count).fill(-1);
    const seedPoints: number[] = [];
    const seedA: number[] = [];
    const near: number[] = [];
    const found = [0, 0, 0, -1, -1, -1];
    const seedCircle: number[] = [];
    for (let iz = 1; iz < nz - 1; iz++) {
        for (let iy = 1; iy < ny - 1; iy++) {
            for (let ix = 1; ix < nx - 1; ix++) {
                const i = iz * plane + iy * nx + ix;
                const px = origin[0] + ix * h, py = origin[1] + iy * h, pz = origin[2] + iz * h;
                if (exterior[i]) {
                    if (exterior[i - 1] && exterior[i + 1] && exterior[i - nx] && exterior[i + nx] && exterior[i - plane] && exterior[i + plane]) continue;
                    atomBins.near(px, py, pz, sas.x, sas.y, sas.z, sas.R, window, near);
                    if (!nearestSphere(px, py, pz, near, sas, found)) {
                        found[0] = px; found[1] = py; found[2] = pz; found[3] = -1; found[4] = -1; found[5] = -1;
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
                    // The nearest exposed SAS point within a voxel diagonal: from the arcs and spheres
                    // worked out once (exposedSas), with no search over atom triples here.
                    exposedBins.near(px, py, pz, exposedSasAtoms.x, exposedSasAtoms.y, exposedSasAtoms.z, exposedSasAtoms.R, diagonal, exposedNear);
                    if (exposedNear.length === 0) continue;
                    exposedCandidates.length = 0;
                    for (const e of exposedNear) exposedCandidates.push(exposedIds[e]);
                    if (!nearestExposedPoint(px, py, pz, exposedCandidates, exposure, sas, diagonal, found)) continue;
                }
                feature[i] = seedA.length;
                seedPoints.push(found[0], found[1], found[2]);
                seedA.push(found[3]);
                seedCircle.push(found[5]);
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
    // Only near the SES (distance to the SAS within the blur's reach of the probe radius) does
    // the exact value matter; further in it is clamped, further out (towards the SAS) nothing
    // the blur reaches the surface from.
    const exactLow = probe - clamp - h, exactHigh = probe + clamp + h;
    let interiorCount = 0;

    const primCircle = Int32Array.from(seedCircle);
    const q = [0, 0, 0];
    let px = 0, py = 0, pz = 0, best = Infinity;
    const around: number[] = [];
    // The spheres and circles already tried for this point (circles as negative keys).
    const tried: number[] = [];
    // The nearest exposed point of a circle: on its exposed arcs (exposedSas), ends included.
    const tryCircle = (id: number) => {
        if (tried.includes(-id - 1)) return;
        tried.push(-id - 1);
        const d2 = nearestOnArcs(px, py, pz, exposure, id, best, q);
        if (d2 < best) best = d2;
    };
    // The nearest exposed point of a sphere: the point's projection if nothing buries it, else on
    // the boundary of the sphere's exposed patch - its circles' exposed arcs. Exact, so there is
    // no following of burying atoms one at a time.
    const trySphere = (a: number) => {
        if (tried.includes(a)) return;
        tried.push(a);
        const dx = px - sas.x[a], dy = py - sas.y[a], dz = pz - sas.z[a];
        const distance = Math.hypot(dx, dy, dz);
        const gap = Math.abs(distance - sas.R[a]);
        if (gap * gap >= best) return;
        if (distance > 1e-9) {
            const scale = sas.R[a] / distance;
            q[0] = sas.x[a] + dx * scale; q[1] = sas.y[a] + dy * scale; q[2] = sas.z[a] + dz * scale;
            // Only atoms whose sphere meets a's can bury a point of it: a's neighbour list.
            if (buriedBy(q, exposure.neighbourIds, exposure.neighbourStart[a], exposure.neighbourStart[a + 1], a, -1, sas) < 0) {
                best = gap * gap;
                return;
            }
        }
        for (let k = exposure.atomCircleStart[a]; k < exposure.atomCircleStart[a + 1]; k++) tryCircle(exposure.atomCircleIds[k]);
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
                    for (let k = 0; k < n; k++) {
                        const f = candidates[k];
                        if (primCircle[f] >= 0) tryCircle(primCircle[f]);
                        else if (primA[f] >= 0) trySphere(primA[f]);
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

/** Options for smoothing an M2T surface; anything left out comes from smoothSurfaceSetting. */
export interface SmoothOptions {
    spacing?: number;
    sigma?: number;
    maxShift?: number;
    openRadius?: number;
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

/**
 * The field, ready to contour. With an M2T mesh, its conventions are read off it; without one (a
 * surface made from the atoms alone, coloured afterwards: smoothSurfaceFromAtoms), the mesh is wound
 * as M2T's always is - normals out, counter-clockwise (both checked on 1df7 and 5a3h) - which is
 * also how marching cubes leaves it.
 */
export function smoothFieldStage(m2tMesh: M2tSurfaceMesh | null, atoms: readonly SurfaceAtom[], probe: number, options: SmoothOptions): SmoothField | null {
    const started = performance.now();
    const spacing = options.spacing ?? smoothSurfaceSetting.spacing;
    const sigma = options.sigma ?? smoothSurfaceSetting.sigma;
    const maxShift = options.maxShift ?? smoothSurfaceSetting.maxShift;
    const openRadius = options.openRadius ?? smoothSurfaceSetting.openRadius;
    const m2tPositions = m2tMesh?.vert_tri?.[0]?.[0];
    const m2tNormals = m2tMesh?.norm_tri?.[0]?.[0];
    const m2tIndices = m2tMesh?.idx_tri?.[0]?.[0];
    if (m2tMesh && (!m2tPositions || !m2tNormals || !m2tIndices || !m2tMesh.col_tri?.[0]?.[0] || m2tPositions.length === 0)) return null;
    const grid = sesField(atoms, probe, spacing, sigma, maxShift, openRadius);
    if (!grid) return null;
    const input = contourInput(grid);
    const { nx, ny, nz, origin, spacing: h, iso, timings } = grid;
    return {
        grid: { nx, ny, nz, origin, spacing: h, iso, timings },
        input,
        conventions: m2tMesh ? meshConventions(m2tPositions, m2tNormals, m2tIndices) : { out: true, ccw: true },
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
        `(${m2tVertices > 0 ? `M2T: ${m2tVertices} vertices` : "no M2T mesh"}); field ${field.fieldMs.toFixed(0)} ms ` +
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

/**
 * For each vertex, the atom it belongs to - the one whose sphere it is nearest, |v - a| - r, which
 * on a convex patch is the atom it lies on, as M2T's generating atom is - and, where the sphere of an
 * atom of another residue is within `band` too (a groove between residues, M2T's saddles), that atom
 * and the split: weight = g2 / (g1 + g2), 1 on the first atom's sphere and 0.5 halfway. What
 * ownership and colour are made from, instead of the M2T mesh's.
 *
 * Bins about the size of the search, so a lookup scans a few dozen atoms.
 */
export function vertexAtoms(positions: ArrayLike<number>, atoms: readonly SurfaceAtom[], residueOf: ArrayLike<number>, band: number): VertexAtoms {
    const n = positions.length / 3;
    const atom = new Int32Array(n).fill(-1), other = new Int32Array(n).fill(-1), weight = new Float32Array(n).fill(1);
    const nearest = new Int32Array(COLOUR_ATOMS * n).fill(-1), nearGap = new Float32Array(COLOUR_ATOMS * n);
    if (atoms.length === 0) return { atom, other, weight, near: nearest, nearGap };
    let rMax = 0;
    for (const a of atoms) rMax = Math.max(rMax, a.r);
    const bins = binAtoms(atoms, rMax + band, rMax);
    const ax = Float64Array.from(atoms, a => a.x), ay = Float64Array.from(atoms, a => a.y), az = Float64Array.from(atoms, a => a.z);
    const ar = Float64Array.from(atoms, a => a.r);
    const near: number[] = [];
    for (let v = 0; v < n; v++) {
        const x = positions[3 * v], y = positions[3 * v + 1], z = positions[3 * v + 2];
        bins.near(x, y, z, ax, ay, az, ar, band, near);
        let best = -1, g1 = Infinity;
        for (const a of near) {
            const g = Math.hypot(x - ax[a], y - ay[a], z - az[a]) - ar[a];
            if (g < g1) { g1 = g; best = a; }
        }
        if (best < 0) {
            // Further than the band from every sphere (nothing should be): the nearest of all.
            for (let a = 0; a < atoms.length; a++) {
                const g = Math.hypot(x - ax[a], y - ay[a], z - az[a]) - ar[a];
                if (g < g1) { g1 = g; best = a; }
            }
            atom[v] = best;
            nearest[COLOUR_ATOMS * v] = best; nearGap[COLOUR_ATOMS * v] = g1;
            continue;
        }
        atom[v] = best;
        // The few nearest, for the colour: insertion into a short sorted list.
        const base = COLOUR_ATOMS * v;
        let kept = 0;
        for (const a of near) {
            const g = Math.hypot(x - ax[a], y - ay[a], z - az[a]) - ar[a];
            if (kept === COLOUR_ATOMS && g >= nearGap[base + kept - 1]) continue;
            let k = Math.min(kept, COLOUR_ATOMS - 1);
            while (k > 0 && nearGap[base + k - 1] > g) { nearest[base + k] = nearest[base + k - 1]; nearGap[base + k] = nearGap[base + k - 1]; k--; }
            nearest[base + k] = a; nearGap[base + k] = g;
            if (kept < COLOUR_ATOMS) kept++;
        }
        const residue = residueOf[best];
        let second = -1, g2 = Infinity;
        for (const a of near) {
            if (residueOf[a] === residue) continue;
            const g = Math.hypot(x - ax[a], y - ay[a], z - az[a]) - ar[a];
            if (g < g2) { g2 = g; second = a; }
        }
        if (second < 0 || g2 > band) continue;
        const d1 = Math.max(0, g1), d2 = Math.max(0, g2);
        other[v] = second;
        weight[v] = d1 + d2 > 0 ? d2 / (d1 + d2) : 0.5;
    }
    return { atom, other, weight, near: nearest, nearGap };
}

/** A surface made from the atoms alone: the mesh, and each vertex's atoms (vertexAtoms). */
export interface AtomSurface extends SurfaceMesh, VertexAtoms {}

/**
 * How far from a second residue's atom a vertex is still shared with it: the probe radius, which
 * is how wide a groove between two atoms is, or 1.4 A for a surface made without a probe (van der
 * Waals, accessible), so they get the same soft boundaries.
 */
export const ownershipBand = (probe: number): number => Math.max(probe, 1.4);

/** The contour finished (normals, winding, the split) and each vertex given its atoms. */
export function atomSurfaceFromContour(field: SmoothField, contour: EdgeContour, atoms: readonly SurfaceAtom[],
                                       residueOf: ArrayLike<number>, probe: number): AtomSurface {
    const mesh = smoothMeshFromContour(field, contour);
    return { ...mesh, ...vertexAtoms(mesh.positions, atoms, residueOf, ownershipBand(probe)) };
}

/**
 * The whole of it in one place, marching cubes on the CPU: the surface of `atoms` with no M2T mesh,
 * for colouring afterwards. Null if there is nothing to contour.
 */
export function smoothSurfaceFromAtomsSync(atoms: readonly SurfaceAtom[], residueOf: ArrayLike<number>, probe: number,
                                           options: SmoothOptions): AtomSurface | null {
    const field = smoothFieldStage(null, atoms, probe, options);
    if (!field) return null;
    const started = performance.now();
    const surface = atomSurfaceFromContour(field, contourOnCpu(field.input, field.grid), atoms, residueOf, probe);
    if (surface.indices.length === 0) return null;
    logSmoothing(field, surface, 0, performance.now() - started, 0, "CPU");
    return surface;
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
 * first - vertexAtoms' weight is never below 0.5 - and 0xFFFFFFFF for none). `residues`: the owner
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

/** An AtomSurface's arrays, to hand over by postMessage rather than copy. */
export function atomSurfaceTransferables(surface: AtomSurface): ArrayBuffer[] {
    return [...new Set([surface.positions, surface.normals, surface.indices, surface.atom, surface.other, surface.weight,
        surface.near, surface.nearGap]
        .map(v => v.buffer as ArrayBuffer))];
}

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
