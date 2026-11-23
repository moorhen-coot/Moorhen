import { expect, test } from "@playwright/test";
import { resultOrSkip, runGpuCase } from "./helpers/gpuPage";
import type { LinesReport } from "./cases/lines.case";

test("LINES and NORMALLINES: as wide, as long and coloured as WebGL's thick lines", async ({ page }) => {
    const r = resultOrSkip(await runGpuCase<LinesReport>(page, "lines.case.ts"));
    expect(r.rendererErrors).toEqual([]);

    // As long as the segment (antialiased ends may add a pixel each side), and as thick as the
    // width rule says: multisampling can add a partly covered row on each side.
    for (const m of [r.thin, r.thick, r.sized]) {
        expect(Math.abs(m.columns - r.expectedColumns)).toBeLessThanOrEqual(2);
        expect(m.rows).toBeGreaterThanOrEqual(Math.floor(m.expectedRows));
        expect(m.rows).toBeLessThanOrEqual(Math.ceil(m.expectedRows) + 2);
    }
    // Thicker with the map line width (squared) and with the primitive size.
    expect(r.thick.rows).toBeGreaterThan(r.thin.rows);
    expect(r.sized.rows).toBeGreaterThan(r.thin.rows);

    const red = (c: number[]) => c[0] > 200 && c[1] < 30 && c[2] < 30;
    const blue = (c: number[]) => c[2] > 200 && c[0] < 30 && c[1] < 30;
    // Indexed: the segment is the pair (1, 0), so its first vertex is the red one, at both ends.
    expect(red(r.thick.left) && red(r.thick.right)).toBe(true);
    // Vertices in pairs: each end its own colour.
    expect(red(r.unindexed.left) && blue(r.unindexed.right)).toBe(true);
    // customColour wins.
    expect(r.custom.left).toEqual([0, 255, 0]);
    // NORMALLINES are lit: red, but not the flat red of the unlit line.
    expect(r.lit.left[0]).toBeGreaterThan(100);
    expect(r.lit.left[0]).not.toBe(r.thick.left[0]);
    expect(r.lit.left[1]).toBeLessThan(30);
});
