/**
 * How big a molecule is, for deciding how far to zoom out when it is first shown.
 *
 * This replaces a call to coot's `get_molecule_diameter`, which is not a function of the molecule
 * alone. It samples a thousand random atom pairs and returns the tenth-largest distance:
 *
 *     for (unsigned int i=0; i<1000; i++) {
 *        float f1 = coot::util::random_f();
 *        float f2 = coot::util::random_f();
 *        ...
 *     }
 *     f = s.get_ith_highest(10);
 *
 * `random_f` reads the global `random()` stream, and nothing in coot seeds it, so the answer
 * depends on how many random numbers were drawn earlier in the same wasm instance. Anything else
 * that consumes randomness first - a different startup sequence, an extra representation built on
 * open - moves it.
 *
 * That mattered because the result divided by a constant becomes the initial zoom, and with "Reset
 * clip and fog on zoom" enabled the zoom sets clipStart to zoom * 8. Measured over twelve seeds on
 * 5a3h the estimate ranged 43.1 to 44.7 angstroms, which is a front clip plane anywhere in a 0.3
 * angstrom band - enough to slice the cap off an atom in one run and not the next. It made the
 * screenshot baselines unrepeatable, and it meant two people opening the same file could get
 * different clipping, which is unwelcome in a program used to make figures.
 *
 * WHAT IS MEASURED HERE, AND WHY NOT THE MAXIMUM
 *
 * Twice the 99.5th percentile of the atoms' distance from the centroid. The strict maximum was the
 * obvious first choice and it frames too wide: a single atom on a flexible terminus pushes the
 * whole view out, and measured against real structures it comes in well above the true extent.
 *
 *                        true max pair   2 x max radius   2 x P99.5 radius   coot's estimate
 *   5a3h   2,765 atoms        54.6            58.0              54.6           43.1 - 44.7
 *   1df7   1,549 atoms        51.3            56.2              51.1           37.2 - 40.7
 *   3j2w  30,928 atoms       214.4           237.9             218.0         160.9 - 169.7
 *   5fjj  30,056 atoms       164.0           191.5             152.9         115.3 - 120.8
 *
 * The percentile tracks the real extent closely while ignoring a handful of strays. Note also how
 * far coot's estimate sits below the truth, and that the gap widens with size - 21% on 5a3h, 30% on
 * 5fjj - because a thousand pairs drawn from a hundred million possible ones almost never catch the
 * extremities. That is why the divisor alone could not be retuned to match it: the bias is not a
 * constant.
 */

/** Anything with coordinates: moorhen.AtomInfo satisfies this, as does a bare vertex. */
export interface Point3 {
    x: number;
    y: number;
    z: number;
}

/**
 * Which radius counts as the edge of the molecule.
 *
 * 100 gives the strict maximum. 99.5 discards roughly one atom in two hundred, which on these
 * structures is the difference between measuring the molecule and measuring its most excitable
 * side chain.
 */
export const DIAMETER_PERCENTILE = 99.5;

/**
 * Divides the diameter to give the initial zoom.
 *
 * Calibrated so the view frames what it used to. Against coot's zoom values this gives 1.09 vs
 * 1.08-1.12 on 5a3h, 1.02 vs 0.93-1.02 on 1df7, 4.36 vs 4.02-4.24 on 3j2w and 3.06 vs 2.88-3.02 on
 * 5fjj - within a few percent across a twentyfold range of size. It was 40 when the diameter came
 * from coot's low estimate.
 */
export const ZOOM_DIVISOR = 50;

/**
 * Bins used to find the percentile without sorting.
 *
 * A sort would be n log n and allocate an array the size of the molecule; on a few million atoms
 * that is a visible pause on every load, which rather defeats the purpose of taking a worker round
 * trip out. Binning is two linear passes and a fixed 16 kB.
 *
 * The bins divide squared distance, so they are finer in radius at the outside than the inside -
 * which is the end being measured. On a 240 angstrom structure the coarsest bin near the rim is
 * under 0.03 angstroms wide.
 */
const BINS = 4096;

/** The mean position, which is what the view is centred on. */
export const centroidOf = (atoms: ArrayLike<Point3>): [number, number, number] => {
    const n = atoms.length;
    if (n === 0) return [0, 0, 0];

    let xs = 0, ys = 0, zs = 0;
    for (let i = 0; i < n; i++) {
        const a = atoms[i];
        xs += a.x;
        ys += a.y;
        zs += a.z;
    }
    return [xs / n, ys / n, zs / n];
};

/**
 * Twice the given percentile of the atoms' distance from the centroid.
 *
 * Zero for an empty selection and for a single atom, which are degenerate rather than small: the
 * caller decides what to do about them rather than being handed an arbitrary number.
 *
 * Never underestimates by more than one bin: the upper edge of the bin the percentile falls in is
 * returned, so the result is a small overestimate rather than a small clip.
 *
 * @param atoms      the atoms to measure, in any order
 * @param centre     optional precomputed centroid, to avoid walking the list twice
 * @param percentile 0 to 100; 100 is the strict maximum
 */
export const moleculeDiameter = (
    atoms: ArrayLike<Point3>,
    centre?: [number, number, number],
    percentile: number = DIAMETER_PERCENTILE,
): number => {
    const n = atoms.length;
    if (n === 0) return 0;

    const [cx, cy, cz] = centre ?? centroidOf(atoms);

    // Pass one: the furthest atom, which sets the histogram's range. Squared throughout - the
    // ordering is the same and it saves a square root per atom.
    let furthest2 = 0;
    for (let i = 0; i < n; i++) {
        const a = atoms[i];
        const dx = a.x - cx;
        const dy = a.y - cy;
        const dz = a.z - cz;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > furthest2) furthest2 = d2;
    }

    if (!(furthest2 > 0)) return 0;
    if (percentile >= 100) return 2 * Math.sqrt(furthest2);

    // Pass two: how many atoms fall in each shell.
    const counts = new Int32Array(BINS);
    const scale = BINS / furthest2;
    for (let i = 0; i < n; i++) {
        const a = atoms[i];
        const dx = a.x - cx;
        const dy = a.y - cy;
        const dz = a.z - cz;
        const d2 = dx * dx + dy * dy + dz * dz;
        let bin = (d2 * scale) | 0;
        if (bin >= BINS) bin = BINS - 1;
        counts[bin]++;
    }

    // The first shell at or beyond which the wanted fraction of atoms lies inside.
    const wanted = Math.ceil((Math.max(0, percentile) / 100) * n);
    let seen = 0;
    for (let bin = 0; bin < BINS; bin++) {
        seen += counts[bin];
        if (seen >= wanted) {
            const upperEdge2 = ((bin + 1) / BINS) * furthest2;
            return 2 * Math.sqrt(Math.min(upperEdge2, furthest2));
        }
    }

    return 2 * Math.sqrt(furthest2);
};
