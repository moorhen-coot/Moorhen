/**
 * The CPU-side set-up for GPU MetaBalls: the grid, and the points sorted into bins.
 *
 * The grid has to be the one metaballs/metaballs.cc builds, to the last bit, or the two meshes
 * cannot be compared vertex for vertex - and a different grid is a visibly different surface.
 * That code works in single precision, so every step here is rounded to float32 with Math.fround
 * in the same order as the C++. Float32 add, subtract, multiply and divide done in double and
 * then rounded give the correctly rounded float32 result, so this is exact, not approximate.
 */

const f = Math.fround;

/** The C++ constants. See GenerateMeshFromPoints and fill_field in metaballs.cc. */
export const METABALLS_PADDING = 4.0;
export const METABALLS_FIELD_CUTOFF = 5.0;

export interface MetaBallsGrid {
    /** World position of grid point (0, 0, 0). */
    min: [number, number, number];
    /** Grid points along each axis. Cells are one fewer. */
    n: [number, number, number];
    /** Spacing, the same on every axis. */
    cell: number;
}

/**
 * The grid GenerateMeshFromPoints lays over `points` (x, y, z, r per point).
 *
 * Null when there is nothing to march: no points, or a grid with fewer than two points along an
 * axis, which has no cells.
 */
export function metaballsGrid(points: Float32Array, gridSize: number, isoLevel: number): MetaBallsGrid | null {
    const count = Math.floor(points.length / 4);
    if (count === 0) return null;
    let minX = f(1e8), minY = f(1e8), minZ = f(1e8);
    let maxX = f(-1e8), maxY = f(-1e8), maxZ = f(-1e8);
    for (let i = 0; i < count; i++) {
        const x = points[4 * i], y = points[4 * i + 1], z = points[4 * i + 2];
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
    }
    const grid = f(gridSize);
    // min_x -= (padding/isoLevel+gridSize);
    const pad = f(f(f(METABALLS_PADDING) / f(isoLevel)) + grid);
    minX = f(minX - pad); minY = f(minY - pad); minZ = f(minZ - pad);
    maxX = f(maxX + pad); maxY = f(maxY + pad); maxZ = f(maxZ + pad);
    // int ncell_x = (max_x - min_x) / gridSize;  - truncation, as the int conversion does.
    const n: [number, number, number] = [
        Math.trunc(f(f(maxX - minX) / grid)),
        Math.trunc(f(f(maxY - minY) / grid)),
        Math.trunc(f(f(maxZ - minZ) / grid)),
    ];
    if (n[0] < 2 || n[1] < 2 || n[2] < 2) return null;
    return { min: [minX, minY, minZ], n, cell: grid };
}

export interface PointBins {
    /** World position of the corner of bin (0, 0, 0). */
    origin: [number, number, number];
    size: number;
    dims: [number, number, number];
    /** start[b] .. start[b+1] are bin b's entries in `order`. Length = bins + 1. */
    start: Uint32Array;
    /** Point indices, grouped by bin, ascending within a bin. */
    order: Uint32Array;
}

/**
 * Sort the points into a uniform grid of cubic bins covering the MetaBalls grid.
 *
 * A counting sort, so stable: within a bin the points stay in their original order. The shaders
 * work out which bins to visit from the exact reach of each calculation, so any bin size gives
 * the same answer; the size only trades bins visited against points tested.
 */
export function binPoints(points: Float32Array, grid: MetaBallsGrid, binSize: number): PointBins {
    const count = Math.floor(points.length / 4);
    const origin: [number, number, number] = [grid.min[0], grid.min[1], grid.min[2]];
    const dims: [number, number, number] = [0, 1, 2].map(a =>
        Math.max(1, Math.ceil(((grid.n[a] - 1) * grid.cell) / binSize) + 1)) as [number, number, number];
    const binOf = (i: number): number => {
        const b = [0, 1, 2].map(a => Math.min(dims[a] - 1, Math.max(0,
            Math.floor((points[4 * i + a] - origin[a]) / binSize))));
        return (b[2] * dims[1] + b[1]) * dims[0] + b[0];
    };
    const nBins = dims[0] * dims[1] * dims[2];
    const start = new Uint32Array(nBins + 1);
    const bins = new Uint32Array(count);
    for (let i = 0; i < count; i++) {
        bins[i] = binOf(i);
        start[bins[i] + 1]++;
    }
    for (let b = 0; b < nBins; b++) start[b + 1] += start[b];
    const fill = start.slice(0, nBins);
    const order = new Uint32Array(count);
    for (let i = 0; i < count; i++) order[fill[bins[i]]++] = i;
    return { origin, size: binSize, dims, start, order };
}

/**
 * The radius of a MetaBalls point for a sphere of instance size `size`, as
 * GenerateMoorhenMetaBallsCootInstancedMesh computes it: r * atomMult / 1.7f in float.
 */
export function metaballRadius(radius: number, size: number): number {
    return f(f(f(radius) * f(size)) / f(1.7));
}

/**
 * How many grid planes to process at a time.
 *
 * The GPU path works through the grid a slab of planes at a time, so its memory is bounded by
 * the slab rather than by the molecule. Each slab holds two planes beyond its own (the next
 * slab's first plane and the one after, for the edges between them), which is the overhead the
 * minimum of 8 keeps small.
 */
export function slabDepth(grid: MetaBallsGrid, maxSlabPoints: number): number {
    const plane = grid.n[0] * grid.n[1];
    return Math.max(8, Math.min(grid.n[2], Math.floor(maxSlabPoints / plane) - 2));
}

/**
 * The grid-index box each point adds to in fill_field, for the points in `order`:
 * [ixMin | ixMax << 16, iyMin | iyMax << 16, izMin | izMax << 16] per point.
 *
 * fill_field works these out per point as (int)((x0 - cutoff - min_x) / cell_x) and so on. Doing
 * the same here, once per point and in float32, leaves the field shader integer comparisons where
 * it had six divisions and six conversions for every point it looked at, at every grid point.
 * Sixteen bits per bound is plenty: a grid that size would need terabytes.
 */
export function pointIndexBoxes(points: Float32Array, grid: MetaBallsGrid, order: Uint32Array): Uint32Array {
    const boxes = new Uint32Array(order.length * 3);
    const c = f(METABALLS_FIELD_CUTOFF);
    for (let k = 0; k < order.length; k++) {
        const i = order[k];
        for (let a = 0; a < 3; a++) {
            const p = points[4 * i + a];
            const lo = Math.max(0, Math.trunc(f(f(f(p - c) - grid.min[a]) / grid.cell)));
            const hi = Math.min(grid.n[a] - 1, Math.trunc(f(f(f(p + c) - grid.min[a]) / grid.cell)));
            // A point whose box misses the grid altogether (it cannot, given the padding) gets a
            // box no index is inside.
            boxes[3 * k + a] = lo > hi ? 0xffff : (lo | (hi << 16)) >>> 0;
        }
    }
    return boxes;
}
