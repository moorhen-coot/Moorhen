import { expect, test } from "@playwright/test";
import { resultOrSkip, runGpuCase } from "./helpers/gpuPage";
import type { Comparison, HoverReport } from "./cases/hover.case";

/** Most of the region lit as expected (its rim is shared with the background or a neighbour), and nothing outside it changed. */
function litExactlyThere(c: Comparison): void {
    expect(c.inside).toBeGreaterThan(300);
    expect(c.insideLit).toBeGreaterThanOrEqual(c.inside * 0.85);
    expect(c.outsideChanged).toBe(0);
}

test("the hover lights sections, instances and smooth meshes as WebGL does", async ({ page }) => {
    const r = resultOrSkip(await runGpuCase<HoverReport>(page, "hover.case.ts"));
    expect(r.rendererErrors).toEqual([]);
    // A ribbon's section: by the pointer, by the sequence viewer, two at the coarser grain.
    litExactlyThere(r.sectionByPointer);
    litExactlyThere(r.sectionBySequence);
    litExactlyThere(r.sectionsAtCoarserGrain);
    // Drawn in chunks, each starting part-way through the mesh: the same picture.
    expect(r.sectionChunkedDiffer).toBe(0);
    // One instance of three.
    litExactlyThere(r.instance);
    // The smooth mesh overlay: one point, a chain, a whole mesh, asked for by the sequence viewer.
    litExactlyThere(r.overlayPoint);
    litExactlyThere(r.overlayChain);
    litExactlyThere(r.overlayWhole);
    litExactlyThere(r.overlayBySequence);
    expect(r.overlayChunkedDiffer).toBe(0);
    // Over a transparent mesh, peeled or blended: on top, as opaque as the share.
    litExactlyThere(r.overlayOverTransparentPeeled);
    litExactlyThere(r.overlayOverTransparentBlended);
    // A stale hover lights nothing.
    expect(r.nothingHoveredDiffer).toBe(0);
});
