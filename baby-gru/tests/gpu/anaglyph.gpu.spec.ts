import { expect, test } from "@playwright/test";
import { resultOrSkip, runGpuCase } from "./helpers/gpuPage";
import type { AnaglyphReport } from "./cases/anaglyph.case";

test("anaglyph stereo: each eye grey in its own channels, on the background; labels in every view", async ({ page }) => {
    const r = resultOrSkip(await runGpuCase<AnaglyphReport>(page, "anaglyph.case.ts"));
    expect(r.rendererErrors).toEqual([]);
    console.log(`anaglyph: ${JSON.stringify(r)}`);

    expect(r.eyesDiffer).toBeGreaterThan(50);
    for (const pair of r.pairs) {
        expect(pair.drawn).toBeGreaterThan(2000);
        // Each eye shows somewhere the other does not, so the channels are told apart.
        expect(pair.leftOnly).toBeGreaterThan(50);
        expect(pair.rightOnly).toBeGreaterThan(50);
        expect(pair.worst).toBeLessThanOrEqual(3);
    }
    expect(r.transparent.drawn).toBeGreaterThan(2000);
    expect(r.transparent.emptyAlpha).toBe(0);
    expect(r.transparent.worst).toBeLessThanOrEqual(3);

    // A label in each view, whether over everything or in the scene.
    for (const counts of [r.labelsOnTop, r.labelsInScene]) {
        expect(counts[0]).toBeGreaterThan(100);
        expect(counts[1]).toBeGreaterThan(100);
    }
});
