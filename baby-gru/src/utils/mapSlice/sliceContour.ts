/**
 * Contour lines of a field over a square, finely where they need it and coarsely where they do not.
 *
 * WHY NOT JUST MARCHING SQUARES ON THE MAP GRID
 *
 * CCP4MG's contour slice samples the plane at the map's grid spacing, interpolating trilinearly,
 * and contours that with marching squares. Where the field changes slowly beside the grid that is
 * fine. Where it changes fast - an orbital near a nucleus, where successive contours are closer
 * together than grid points and curl round tightly - the contours come out as diamonds and
 * zig-zags, or vanish between two grid points. Sampling more finely everywhere would fix that at a
 * cost paid over the whole square, nearly all of it for nothing.
 *
 * WHAT IS DONE INSTEAD
 *
 * The square is divided into cells of the map's grid spacing, and each cell is split in four,
 * again and again, while it might hold a contour that straight pieces between its corners would
 * put in the wrong place:
 *
 *  - it is sampled at its corners, centre and edge midpoints, and the field's departure from what
 *    the corners alone predict (bilinear) is its curvature, `dev`;
 *  - no contour level within the sampled range widened by twice `dev`: nothing here, it stays;
 *  - a level crossing the samples but not the corners - a contour hidden inside the cell, as a
 *    small loop round a peak is: split;
 *  - `dev` over the local gradient is how far a straight-line contour could be out (angstroms):
 *    over `positionTolerance`, split.
 *
 * Cells stop at `maxDepth` splits. The field is sampled on a lattice so fine that every cell's
 * corners, centre and midpoints lie on it, and each sample is taken once.
 *
 * Each final cell is then cut into triangles fanning from its centre to every lattice point that
 * has been sampled on its edges - its own corners and also its smaller neighbours' corners where
 * they meet it (the "hanging" points). Two cells meeting along an edge therefore cut it at the same
 * points, and contour lines cross that edge at the same places from both sides: no cracks where a
 * fine cell meets a coarse one. Contouring a triangle is unambiguous (no saddle cases), and where
 * a line crosses an edge it is found on the field itself, not by straight-line interpolation (two
 * steps of regula falsi between the edge's ends, always taken from the same end), so the lines
 * follow the field's curvature even across the larger cells.
 *
 * The field is a function of (s, t), the coordinates across the square; this knows nothing of
 * maps or planes (mapSlice.ts places it).
 */

export interface SliceContourOptions {
    /** The square is s and t from -halfSize to halfSize (angstroms). */
    halfSize: number;
    /** The coarsest cell size (angstroms): the map's grid spacing is the natural choice. */
    baseSpacing: number;
    /** How many times a cell may be split in four. */
    maxDepth?: number;
    /** How far (angstroms) a contour may be from where the field puts it before a cell is split. */
    positionTolerance?: number;
    /** The contour levels. */
    levels: readonly number[];
    /**
     * Where a level of zero is contoured, if one is given: only in the starting cells whose samples
     * reach this magnitude somewhere, and the cells split from them. A field's zero contour - an
     * orbital's nodes - runs on through the empty space round it, where the field is zero give or
     * take rounding and crosses zero anywhere; there it would be noise, and would have the cells
     * split to the finest to follow it. Without this, zero is a level like any other.
     */
    zeroLevelMinMagnitude?: number;
}

export interface SliceContours {
    /** For each level, in the order given, its line segments: s0, t0, s1, t1 for each. */
    segments: Float32Array[];
    /** Field values sampled, for tests and timing. */
    samples: number;
    /** Cells contoured once splitting stopped. */
    cells: number;
}

export const DEFAULT_MAX_DEPTH = 5;
export const DEFAULT_POSITION_TOLERANCE = 0.01;

/** Two steps of regula falsi: where the field crosses `level` between two points straddling it. */
const REFINE_STEPS = 2;

export function contourSlice(field: (s: number, t: number) => number, options: SliceContourOptions): SliceContours {
    const { halfSize, levels } = options;
    const maxDepth = Math.max(0, Math.floor(options.maxDepth ?? DEFAULT_MAX_DEPTH));
    const tolerance = options.positionTolerance ?? DEFAULT_POSITION_TOLERANCE;
    const segments = levels.map(() => [] as number[]);
    if (!(halfSize > 0) || !(options.baseSpacing > 0) || levels.length === 0) {
        return { segments: segments.map(s => new Float32Array(s)), samples: 0, cells: 0 };
    }

    const nBase = Math.max(1, Math.ceil((2 * halfSize) / options.baseSpacing));
    // Lattice points per base cell: the finest cell is two apart, so that it has a centre on the
    // lattice too.
    const perBase = 2 ** (maxDepth + 1);
    const n = nBase * perBase;
    const step = (2 * halfSize) / n;
    const stride = n + 1;
    const coordinate = (i: number) => -halfSize + i * step;

    const values = new Map<number, number>();
    let samples = 0;
    const at = (i: number, j: number): number => {
        const key = i * stride + j;
        let value = values.get(key);
        if (value === undefined) {
            value = field(coordinate(i), coordinate(j));
            samples++;
            values.set(key, value);
        }
        return value;
    };

    const zeroMin = options.zeroLevelMinMagnitude;
    const sortedAll = [...levels].sort((a, b) => a - b);
    // The levels of a cell where zero is not contoured.
    const sortedNoZero = zeroMin === undefined ? sortedAll : sortedAll.filter(level => level !== 0);
    const anyLevelIn = (sorted: number[], lo: number, hi: number) => sorted.some(level => level >= lo && level <= hi);

    // Pass 1: split cells while they need it, keeping the ones left as [i, j, size, whether zero
    // is contoured in it].
    const cells: number[] = [];
    const refine = (i0: number, j0: number, size: number, depth: number, zeroHere: boolean) => {
        if (depth === 0 && zeroMin !== undefined) {
            // Decided once, for a starting cell, and kept by the cells split from it: in a small
            // cell next to a node the field is small however big the orbital.
            const h0 = size / 2;
            zeroHere = Math.max(
                Math.abs(at(i0, j0)), Math.abs(at(i0 + size, j0)), Math.abs(at(i0, j0 + size)), Math.abs(at(i0 + size, j0 + size)),
                Math.abs(at(i0 + h0, j0 + h0)), Math.abs(at(i0 + h0, j0)), Math.abs(at(i0 + h0, j0 + size)),
                Math.abs(at(i0, j0 + h0)), Math.abs(at(i0 + size, j0 + h0)),
            ) >= zeroMin;
        }
        const sorted = zeroHere ? sortedAll : sortedNoZero;
        if (depth >= maxDepth) {
            cells.push(i0, j0, size, zeroHere ? 1 : 0);
            return;
        }
        const h = size / 2;
        const c00 = at(i0, j0), c10 = at(i0 + size, j0), c01 = at(i0, j0 + size), c11 = at(i0 + size, j0 + size);
        const cc = at(i0 + h, j0 + h);
        const mb = at(i0 + h, j0), mt = at(i0 + h, j0 + size), ml = at(i0, j0 + h), mr = at(i0 + size, j0 + h);
        const dev = Math.max(
            Math.abs(cc - (c00 + c10 + c01 + c11) / 4),
            Math.abs(mb - (c00 + c10) / 2), Math.abs(mt - (c01 + c11) / 2),
            Math.abs(ml - (c00 + c01) / 2), Math.abs(mr - (c10 + c11) / 2),
        );
        const lo = Math.min(c00, c10, c01, c11, cc, mb, mt, ml, mr), hi = Math.max(c00, c10, c01, c11, cc, mb, mt, ml, mr);
        // Twice the curvature either side: the field between samples can go further than the
        // samples show, by about as much as it bends - more for a sharp peak.
        if (!anyLevelIn(sorted, lo - 2 * dev, hi + 2 * dev)) {
            cells.push(i0, j0, size, zeroHere ? 1 : 0);
            return;
        }
        const cornerLo = Math.min(c00, c10, c01, c11), cornerHi = Math.max(c00, c10, c01, c11);
        // A level the samples cross but the corners do not: a contour inside, unseen from them.
        const hidden = sorted.some(level =>
            (cornerHi < level && hi >= level) || (cornerLo >= level && lo < level));
        const width = size * step;
        const gradient = Math.max(
            Math.hypot((c10 - c00 + c11 - c01) / (2 * width), (c01 - c00 + c11 - c10) / (2 * width)),
            Math.hypot((mr - ml) / width, (mt - mb) / width),
        );
        const positionError = gradient > 0 ? dev / gradient : Infinity;
        if (hidden || positionError > tolerance) {
            refine(i0, j0, h, depth + 1, zeroHere);
            refine(i0 + h, j0, h, depth + 1, zeroHere);
            refine(i0, j0 + h, h, depth + 1, zeroHere);
            refine(i0 + h, j0 + h, h, depth + 1, zeroHere);
        } else {
            cells.push(i0, j0, size, zeroHere ? 1 : 0);
        }
    };
    for (let bi = 0; bi < nBase; bi++) {
        for (let bj = 0; bj < nBase; bj++) refine(bi * perBase, bj * perBase, perBase, 0, true);
    }

    // Every cell's corners and centre, before any cell looks for its neighbours' points on its
    // edges: a cell must find the same points on an edge as the cell across it does.
    for (let c = 0; c < cells.length; c += 4) {
        const i0 = cells[c], j0 = cells[c + 1], size = cells[c + 2];
        at(i0, j0); at(i0 + size, j0); at(i0, j0 + size); at(i0 + size, j0 + size);
        at(i0 + size / 2, j0 + size / 2);
    }

    // Where a contour crosses the edge between two lattice points, refined on the field itself.
    // Always worked from the lower-keyed end, so that both triangles sharing the edge agree.
    const crossing = (ia: number, ja: number, va: number, ib: number, jb: number, vb: number, level: number, out: number[]) => {
        if (ia * stride + ja > ib * stride + jb) {
            [ia, ja, va, ib, jb, vb] = [ib, jb, vb, ia, ja, va];
        }
        const sa = coordinate(ia), ta = coordinate(ja), ds = coordinate(ib) - sa, dt = coordinate(jb) - ta;
        let a = 0, fa = va - level, b = 1, fb = vb - level;
        for (let k = 0; k < REFINE_STEPS && fb !== fa; k++) {
            const u = a - (fa * (b - a)) / (fb - fa);
            const fu = field(sa + u * ds, ta + u * dt) - level;
            samples++;
            if ((fu >= 0) === (fa >= 0)) { a = u; fa = fu; } else { b = u; fb = fu; }
        }
        const u = fb !== fa ? a - (fa * (b - a)) / (fb - fa) : 0.5;
        out.push(sa + u * ds, ta + u * dt);
    };

    // Pass 2: each cell as a fan of triangles from its centre to the points on its edges.
    const ring: number[] = [];
    const corner = (i: number, j: number) => ring.push(i, j, values.get(i * stride + j));
    // The sampled points strictly between two corners along an edge, in order. A point there is a
    // corner of a smaller cell beside the edge, or the midpoint of one tested and not split; either
    // way the cell that size, and every larger one along the edge, sampled its own midpoint first
    // - cells are split in quarters, and a cell's midpoints are sampled before it is split. So
    // where an interval's midpoint is missing, nothing lies in it, and the edge is found by halving
    // rather than by looking at every lattice point along it (most cells are large ones, where
    // nothing is). Intervals of 2 have no point to find: no cell has a corner or midpoint at an odd
    // offset.
    const between = (ai: number, aj: number, bi: number, bj: number) => {
        const di = bi - ai, dj = bj - aj;
        if (Math.abs(di) + Math.abs(dj) < 4) return;
        const mi = ai + di / 2, mj = aj + dj / 2;
        const value = values.get(mi * stride + mj);
        if (value === undefined) return;
        between(ai, aj, mi, mj);
        ring.push(mi, mj, value);
        between(mi, mj, bi, bj);
    };
    for (let c = 0; c < cells.length; c += 4) {
        const i0 = cells[c], j0 = cells[c + 1], size = cells[c + 2], zeroHere = cells[c + 3] === 1;
        const i1 = i0 + size, j1 = j0 + size;
        const ci = i0 + size / 2, cj = j0 + size / 2, cv = at(ci, cj);
        ring.length = 0;
        // Anticlockwise from the bottom left.
        corner(i0, j0); between(i0, j0, i1, j0);
        corner(i1, j0); between(i1, j0, i1, j1);
        corner(i1, j1); between(i1, j1, i0, j1);
        corner(i0, j1); between(i0, j1, i0, j0);

        let lo = cv, hi = cv;
        for (let r = 2; r < ring.length; r += 3) { lo = Math.min(lo, ring[r]); hi = Math.max(hi, ring[r]); }
        for (let l = 0; l < levels.length; l++) {
            const level = levels[l];
            if (level < lo || level > hi || (level === 0 && !zeroHere)) continue;
            const out = segments[l];
            const count = ring.length / 3;
            for (let r = 0; r < count; r++) {
                const q = ((r + 1) % count) * 3;
                const ai = ring[r * 3], aj = ring[r * 3 + 1], av = ring[r * 3 + 2];
                const bi = ring[q], bj = ring[q + 1], bv = ring[q + 2];
                const inC = cv >= level, inA = av >= level, inB = bv >= level;
                if (inC === inA && inA === inB) continue;
                // The two edges the line crosses: the one opposite the odd vertex out is not.
                if (inA === inB) {
                    crossing(ci, cj, cv, ai, aj, av, level, out);
                    crossing(ci, cj, cv, bi, bj, bv, level, out);
                } else if (inC === inA) {
                    crossing(ai, aj, av, bi, bj, bv, level, out);
                    crossing(ci, cj, cv, bi, bj, bv, level, out);
                } else {
                    crossing(ci, cj, cv, ai, aj, av, level, out);
                    crossing(ai, aj, av, bi, bj, bv, level, out);
                }
            }
        }
    }

    return { segments: segments.map(s => new Float32Array(s)), samples, cells: cells.length / 4 };
}
