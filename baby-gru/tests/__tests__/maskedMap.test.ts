/**
 * Masked maps (src/utils/maskedMap.ts): told from their density histogram (most voxels in the bin holding zero), and
 * measured by the spread of the other voxels, the rms inside the mask, which their σ, load level and map wizard use.
 */
import { describe, expect, it } from "@jest/globals";
import { maskedStatistics } from "../../src/utils/maskedMap";

/** A histogram of `values` (a list of [value, count]) in bins of 0.01 from -1 */
const histogramOf = (values: [number, number][]) => {
    const counts = new Array(200).fill(0);
    values.forEach(([value, count]) => {
        counts[Math.floor((value + 1) / 0.01 + 1e-9)] += count;
    });
    return { base: -1, bin_width: 0.01, counts };
};

describe("a masked map", () => {
    it("is one whose voxels are mostly zero, measured by the spread of the others", () => {
        // 99% zeros; inside the mask half at 0.105 and half at 0.305 (bin centres): spread 0.1
        const stats = maskedStatistics(histogramOf([[0, 9900], [0.1, 50], [0.3, 50]]));
        expect(stats.zeroFraction).toBeCloseTo(0.99, 6);
        expect(stats.rmsd).toBeCloseTo(0.1, 6);
    });

    it("is not an ordinary map, whose density spreads around zero", () => {
        expect(maskedStatistics(histogramOf([[-0.2, 300], [0, 200], [0.2, 300], [0.5, 200]]))).toBeNull();
    });

    it("has something besides zeros", () => {
        expect(maskedStatistics(histogramOf([[0, 1000]]))).toBeNull();
        expect(maskedStatistics({ base: 0, bin_width: 0, counts: [] })).toBeNull();
    });
});
