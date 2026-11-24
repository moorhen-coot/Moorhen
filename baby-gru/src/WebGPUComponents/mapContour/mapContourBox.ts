/**
 * The CPU side of contouring a map on the GPU: the map's grid as Moorhen holds it, and the box of
 * grid points Coot contours around a point.
 */

/** A map over one whole unit cell (every symmetry copy filled in), as the Coot worker sends it. */
export interface MapUnitCellGrid {
    /** Grid points along a, b and c. */
    nu: number;
    nv: number;
    nw: number;
    /** Fractional to orthogonal coordinates, row by row: clipper's Cell::matrix_orth(). */
    orth: number[];
    /** EM maps are not periodic: Coot keeps only what lies inside the box (the cell). */
    isEM: boolean;
    /** Value at grid point (u, v, w): data[(w * nv + v) * nu + u]. */
    data: Float32Array;
}

/** A box of grid points, which may run past the cell: indices wrap around it. */
export interface ContourBox {
    /** Grid coordinates of the box's first point. */
    min: [number, number, number];
    /** Points along each axis. */
    size: [number, number, number];
}

/** clipper's Util::intr: rint, which rounds halves to even. */
export function rint(x: number): number {
    const r = Math.round(x);
    return Math.abs(x % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r;
}

/** The inverse of a 3x3 matrix given row by row. */
export function inverse3(m: number[]): number[] {
    const [a, b, c, d, e, f, g, h, i] = m;
    const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
    const det = a * A + b * B + c * C;
    return [
        A / det, -(b * i - c * h) / det, (b * f - c * e) / det,
        B / det, (a * i - c * g) / det, -(a * f - c * d) / det,
        C / det, -(a * h - b * g) / det, (a * e - b * d) / det,
    ];
}

const multiply = (m: number[], v: ArrayLike<number>): [number, number, number] => [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];

/** The lengths of the cell edges a, b and c: the columns of the orthogonalising matrix. */
export function cellLengths(orth: number[]): [number, number, number] {
    return [0, 1, 2].map(j => Math.hypot(orth[j], orth[3 + j], orth[6 + j])) as [number, number, number];
}

/**
 * The grid points CIsoSurface::GenerateTriangles_from_Xmap contours for a sphere of `radius`
 * about `centre`: in fractional coordinates, the centre plus and minus radius / (a, b, c), each
 * end rounded to the grid as clipper's Coord_frac::coord_grid does, inclusive. Triangles are then
 * kept only if their midpoint is within the sphere. Null if there is nothing to contour.
 *
 * For an EM map the box stops one cell past each face of the map. Triangles are kept there only
 * if their midpoint is inside the map (keepMidpoint in mapContourShaders.ts), so the cells beyond
 * add nothing; and with a radius larger than the map they can be most of the box - a box too big
 * for the GPU's buffers. The one cell kept on each side keeps a triangle whose midpoint rounds onto
 * a face, so the triangles are the same as for the whole box.
 */
export function contourBox(grid: MapUnitCellGrid, centre: ArrayLike<number>, radius: number): ContourBox | null {
    if (!(radius > 0)) return null;
    const frac = multiply(inverse3(grid.orth), centre);
    const lengths = cellLengths(grid.orth);
    const n = [grid.nu, grid.nv, grid.nw];
    const min = [0, 1, 2].map(a => rint(n[a] * (frac[a] - radius / lengths[a]))) as [number, number, number];
    const max = [0, 1, 2].map(a => rint(n[a] * (frac[a] + radius / lengths[a]))) as [number, number, number];
    if (grid.isEM) {
        for (let a = 0; a < 3; a++) {
            min[a] = Math.max(min[a], -1);
            max[a] = Math.min(max[a], n[a] + 1);
        }
    }
    const size = [0, 1, 2].map(a => max[a] - min[a] + 1) as [number, number, number];
    if (size.some(s => s < 2)) return null;
    return { min, size };
}

/**
 * How many items of `bytesEach` to make room for: `needed` with `slack` to spare (so that a
 * slightly larger next request fits without making the buffer again), but no more than a buffer
 * of `limitBytes` holds. Null if even `needed` would not fit: the GPU cannot do it in one buffer.
 */
export function roomFor(needed: number, bytesEach: number, limitBytes: number, slack = 1): number | null {
    const most = Math.floor(limitBytes / bytesEach);
    if (needed > most) return null;
    return Math.min(Math.ceil(needed * slack), most);
}

/** Bytes as a person would say them: a decimal place below 10 MB, so 1.45 MB is not "1 MB". */
export function formatBytes(bytes: number): string {
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
    return bytes >= 1e7 ? `${Math.round(bytes / 1e6)} MB` : `${+(bytes / 1e6).toFixed(1)} MB`;
}

/**
 * Bytes of work buffers a contour needs per box point: the field, edge mask and vertex offset per
 * point, the keep and line masks per cell (about as many). The per-run sums are an eighth of that.
 */
export const WORK_BYTES_PER_BOX_POINT = 20;

/**
 * The largest radius, up to `radius`, whose box about `centre` has no more than `maxPoints` grid
 * points: `radius` itself if its box is small enough. The box only grows with the radius, so a
 * bisection finds it.
 */
export function largestRadiusWithin(grid: MapUnitCellGrid, centre: ArrayLike<number>, radius: number, maxPoints: number): number {
    const points = (r: number) => {
        const box = contourBox(grid, centre, r);
        return box ? box.size[0] * box.size[1] * box.size[2] : 0;
    };
    if (points(radius) <= maxPoints) return radius;
    let lo = 0, hi = radius;
    for (let i = 0; i < 50 && hi - lo > 1e-3; i++) {
        const mid = (lo + hi) / 2;
        if (points(mid) <= maxPoints) lo = mid;
        else hi = mid;
    }
    return lo;
}
