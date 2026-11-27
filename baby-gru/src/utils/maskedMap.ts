/**
 * Masked maps: most of the box set to exactly zero around the density (a map masked around a model, or cut out of a
 * larger one). Their rms over the whole box is mostly zeros, so far too small to contour by: "Map 9 masked" in a
 * session of 2026-11-27 had 99.97% zeros, a whole-map rms of 0.0017 and was contoured at 0.129 (76 of those). Over its
 * non-zero voxels it has a standard deviation of 0.087, which puts 0.129 at 1.5: an ordinary level.
 */

/** The share of a map's voxels that must be (about) zero for it to count as masked */
export const MASKED_ZERO_FRACTION = 0.5;

export type MaskedStatistics = {
    /** The share of voxels in the bin holding zero */
    zeroFraction: number;
    /** The standard deviation of the other voxels: the map's rms inside its mask */
    rmsd: number;
};

/**
 * Whether a map is masked, from its density histogram (fine bins, so that low solvent density in an ordinary map does
 * not fill the bin holding zero), and its rms inside the mask: the standard deviation of the values outside that bin,
 * from the bin centres. Null for a map that is not masked, or that has nothing but zeros.
 */
export const maskedStatistics = (
    histogram: { base: number; bin_width: number; counts: number[] },
    threshold = MASKED_ZERO_FRACTION
): MaskedStatistics | null => {
    const { base, bin_width: width, counts } = histogram;
    if (!counts?.length || !(width > 0)) return null;
    let total = 0;
    let zeros = 0;
    let n = 0;
    let sum = 0;
    let sum2 = 0;
    counts.forEach((count, i) => {
        const low = base + width * i;
        total += count;
        if (low <= 0 && low + width > 0) {
            zeros += count;
            return;
        }
        const value = low + width / 2;
        n += count;
        sum += count * value;
        sum2 += count * value * value;
    });
    if (total === 0 || zeros / total < threshold || n === 0) return null;
    const mean = sum / n;
    const variance = sum2 / n - mean * mean;
    return variance > 0 ? { zeroFraction: zeros / total, rmsd: Math.sqrt(variance) } : null;
};
