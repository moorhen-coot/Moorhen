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
    /** EM maps are not periodic: only what lies inside the map's data is kept. */
    isEM: boolean;
    /**
     * For an EM map, the grid points its data covers, from `min` to `max` inclusive of the point
     * past the end (as the cell is 0 to nu): from the map file's header (`emRangeFromMrcHeader`).
     * The grid itself is periodic, so the data is there wherever the header starts it; without
     * this the cell from 0 is taken, which cuts a map whose start is not 0 in two and swaps the
     * halves (EMD-1001: 30 sections from -15). Absent, the whole cell.
     */
    emRange?: { min: [number, number, number]; max: [number, number, number] };
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
 * For an EM map the box stops one cell past each face of the map's data (`emRange`, else the
 * cell). Triangles are kept there only if their midpoint is inside it (keepMidpoint in
 * mapContourShaders.ts), so the cells beyond
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
        const { min: from, max: to } = emRangeOf(grid);
        for (let a = 0; a < 3; a++) {
            min[a] = Math.max(min[a], from[a] - 1);
            max[a] = Math.min(max[a], to[a] + 1);
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

/** The grid points an EM map's data covers: its `emRange`, or the whole cell. */
export function emRangeOf(grid: MapUnitCellGrid): { min: [number, number, number]; max: [number, number, number] } {
    return grid.emRange ?? { min: [0, 0, 0], max: [grid.nu, grid.nv, grid.nw] };
}

/** What emRangeFromMrcHeader reads of a CCP4/MRC header (utils/mapHeaders.ts, MRCHeaderJson). */
export interface MrcGridHeader {
    dimensions: { nx: number; ny: number; nz: number };
    start: { nxstart: number; nystart: number; nzstart: number };
    sampling: { mx: number; my: number; mz: number };
    axisMapping: { mapc: number; mapr: number; maps: number };
}

/**
 * The grid points an EM map's data covers, in the grid's own axes (a, b, c: clipper's u, v, w),
 * from its CCP4/MRC header: columns, rows and sections start at NCSTART, NRSTART, NSSTART and run
 * for NC, NR, NS points, along the axes MAPC, MAPR, MAPS. Null if the header does not describe
 * this grid (its sampling differs, or its axes are not a permutation), when the whole cell is used.
 */
export function emRangeFromMrcHeader(header: MrcGridHeader, grid: MapUnitCellGrid): MapUnitCellGrid["emRange"] | null {
    const axes = [header.axisMapping.mapc, header.axisMapping.mapr, header.axisMapping.maps];
    if ([...axes].sort().join() !== "1,2,3") return null;
    const sampling = [header.sampling.mx, header.sampling.my, header.sampling.mz];
    if (sampling[0] !== grid.nu || sampling[1] !== grid.nv || sampling[2] !== grid.nw) return null;
    const starts = [header.start.nxstart, header.start.nystart, header.start.nzstart];
    const counts = [header.dimensions.nx, header.dimensions.ny, header.dimensions.nz];
    if (counts.some(n => !(n > 0)) || starts.some(s => !Number.isInteger(s))) return null;
    const min: [number, number, number] = [0, 0, 0], max: [number, number, number] = [0, 0, 0];
    axes.forEach((axis, i) => {
        min[axis - 1] = starts[i];
        max[axis - 1] = starts[i] + counts[i];
    });
    return { min, max };
}
