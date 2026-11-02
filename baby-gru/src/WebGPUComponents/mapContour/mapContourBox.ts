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
 */
export function contourBox(grid: MapUnitCellGrid, centre: ArrayLike<number>, radius: number): ContourBox | null {
    if (!(radius > 0)) return null;
    const frac = multiply(inverse3(grid.orth), centre);
    const lengths = cellLengths(grid.orth);
    const n = [grid.nu, grid.nv, grid.nw];
    const min = [0, 1, 2].map(a => rint(n[a] * (frac[a] - radius / lengths[a]))) as [number, number, number];
    const max = [0, 1, 2].map(a => rint(n[a] * (frac[a] + radius / lengths[a]))) as [number, number, number];
    const size = [0, 1, 2].map(a => max[a] - min[a] + 1) as [number, number, number];
    if (size.some(s => s < 2)) return null;
    return { min, size };
}
