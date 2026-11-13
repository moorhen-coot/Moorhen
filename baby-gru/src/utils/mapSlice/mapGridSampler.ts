/**
 * A map's value anywhere, from the whole unit cell Coot exports (get_map_unit_cell_grid, the same
 * grid the GPU contours use), for contouring a slice through it.
 *
 * Interpolated tricubically, with Catmull-Rom weights along each grid axis: the value at each grid
 * point is kept, and between them the field is smooth (C1), so a contour of it bends smoothly
 * rather than in straight pieces from one grid cell to the next. That is what lets a slice be
 * contoured more finely than the grid where the contours curve tightly (sliceContour.ts): a
 * trilinear field sampled more finely only gives the same corners back more often. The grid is
 * all there is, so what lies between grid points is the interpolation's, not the data's - but a
 * smooth guess, not a faceted one.
 *
 * A crystal map is periodic, so the grid wraps. An EM map is not (Coot keeps only the box): the
 * grid stops at its edges instead.
 */
import type { MapUnitCellGrid } from "../../WebGPUComponents/mapContour/mapContourBox";
import { cellLengths, inverse3 } from "../../WebGPUComponents/mapContour/mapContourBox";

export interface MapGridSampler {
    /** The map's value at an orthogonal (world) point, in angstroms. */
    value(x: number, y: number, z: number): number;
    /** The smallest distance between neighbouring grid points along a grid axis (angstroms). */
    spacing: number;
    /** The largest magnitude of any grid value: no slice through the map goes beyond it. */
    maxAbs: number;
}

/** Catmull-Rom weights for the four grid points around a fraction t of the way between the middle two. */
function catmullRom(t: number, w: Float64Array): void {
    const t2 = t * t, t3 = t2 * t;
    w[0] = 0.5 * (-t3 + 2 * t2 - t);
    w[1] = 0.5 * (3 * t3 - 5 * t2 + 2);
    w[2] = 0.5 * (-3 * t3 + 4 * t2 + t);
    w[3] = 0.5 * (t3 - t2);
}

export function makeMapGridSampler(grid: MapUnitCellGrid): MapGridSampler {
    const { nu, nv, nw, data } = grid;
    const toFrac = inverse3(grid.orth);
    const periodic = !grid.isEM;
    const lengths = cellLengths(grid.orth);
    const spacing = Math.min(lengths[0] / nu, lengths[1] / nv, lengths[2] / nw);
    let maxAbs = 0;
    for (let k = 0; k < data.length; k++) {
        const magnitude = Math.abs(data[k]);
        if (magnitude > maxAbs) maxAbs = magnitude;
    }

    // Reused between calls: a slice asks for tens of thousands of values.
    const wu = new Float64Array(4), wv = new Float64Array(4), ww = new Float64Array(4);
    const iu = new Int32Array(4), iv = new Int32Array(4), iw = new Int32Array(4);

    const indices = (g: number, n: number, out: Int32Array): number => {
        const base = Math.floor(g);
        if (base >= 1 && base + 2 < n) {
            out[0] = base - 1; out[1] = base; out[2] = base + 1; out[3] = base + 2;
        } else {
            for (let k = 0; k < 4; k++) {
                const i = base - 1 + k;
                out[k] = periodic ? ((i % n) + n) % n : Math.min(n - 1, Math.max(0, i));
            }
        }
        return g - base;
    };

    return {
        spacing,
        maxAbs,
        value(x: number, y: number, z: number): number {
            const gu = (toFrac[0] * x + toFrac[1] * y + toFrac[2] * z) * nu;
            const gv = (toFrac[3] * x + toFrac[4] * y + toFrac[5] * z) * nv;
            const gw = (toFrac[6] * x + toFrac[7] * y + toFrac[8] * z) * nw;
            catmullRom(indices(gu, nu, iu), wu);
            catmullRom(indices(gv, nv, iv), wv);
            catmullRom(indices(gw, nw, iw), ww);
            let sum = 0;
            for (let c = 0; c < 4; c++) {
                const planeOffset = iw[c] * nv;
                let plane = 0;
                for (let b = 0; b < 4; b++) {
                    const rowOffset = (planeOffset + iv[b]) * nu;
                    plane += wv[b] * (wu[0] * data[rowOffset + iu[0]] + wu[1] * data[rowOffset + iu[1]]
                        + wu[2] * data[rowOffset + iu[2]] + wu[3] * data[rowOffset + iu[3]]);
                }
                sum += ww[c] * plane;
            }
            return sum;
        },
    };
}
