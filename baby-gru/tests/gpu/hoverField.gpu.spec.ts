import { expect, test } from "@playwright/test";
import { resultOrSkip, runGpuCase } from "./helpers/gpuPage";
import type { HoverFieldReport, Match } from "./cases/hoverField.case";

/** Nearly every pixel of the part looked at as expected. */
function all(m: Match): void {
    expect(m.pixels).toBeGreaterThan(500);
    expect(m.matched).toBeGreaterThanOrEqual(m.pixels * 0.98);
}

/** The hover overlay on a surface shaded per pixel from its field: see cases/hoverField.case.ts. */
test("the hover overlay on a field-shaded surface is lit by the field and edged per pixel", async ({ page }) => {
    const r = resultOrSkip(await runGpuCase<HoverFieldReport>(page, "hoverField.case.ts", null));
    console.log(`Hover field: ${JSON.stringify(r)}`);
    expect(r.rendererErrors).toEqual([]);
    // The tilted vertex normals light it differently from the field: the comparisons below can tell.
    expect(r.fieldVersusVertexDiffer).toBeGreaterThan(1000);
    // Residue 0's own pixels orange, lit as the field-shaded orange strip; residue 1's untouched.
    all(r.pixelLeft);
    all(r.pixelRight);
    all(r.glassLeft);
    all(r.glassRight);
    // Without the atoms' residues, the vertices' ramp lights some of residue 1's side.
    expect(r.rampRightChanged).toBeGreaterThan(100);
    // fieldShading read at draw time: off, per vertex; a snapshot with bestSurfaces, per pixel anyway.
    expect(r.settingOffDiffersFromField).toBeGreaterThan(1000);
    expect(r.bestSurfacesDiffersFromField).toBe(0);
});
