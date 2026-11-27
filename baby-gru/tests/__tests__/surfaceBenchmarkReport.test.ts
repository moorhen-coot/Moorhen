/**
 * The smooth surface benchmark's report (src/utils/surfaceBenchmarkReport.ts): the text a tester
 * pastes back after the Dev menu's "Surface benchmark".
 */
import { describe, expect, it } from "@jest/globals";
import { caseCost, formatSurfaceBenchmark, type SurfaceBenchmarkCase, type SurfaceBenchmarkFacts } from "../../src/utils/surfaceBenchmarkReport";

const timing = (gpuMs: number | null, idleMs: number | null = 5) => ({
    count: 40, medianMs: 16.7, worstMs: 18.2, cpuMs: 0.4, gpuMs, slow: 0, idleCount: 15, idleMs,
});

const surfaceCase = (over: Partial<SurfaceBenchmarkCase>): SurfaceBenchmarkCase => ({
    mode: "per vertex", view: "whole", opacity: 1, applied: { pixelNormals: true, pixelColour: true },
    triangles: 574_672, peelLayers: 0, timing: timing(2), ...over,
});

const facts = (cases: SurfaceBenchmarkCase[]): SurfaceBenchmarkFacts => ({
    machine: "Moorhen 1.2.0 | Chrome 142 on Linux | WebGPU: amd rdna-4",
    molecules: [{ name: "3j2w", atoms: 30928 }],
    surfaces: 1,
    surfaceAdded: true,
    canvas: { width: 1920, height: 1080 },
    cases,
    seconds: 61.4,
});

const row = (text: string, start: string) => text.split("\n").find(line => line.startsWith(start)) ?? "";

describe("formatSurfaceBenchmark", () => {
    it("says what was measured, on what", () => {
        const text = formatSurfaceBenchmark(facts([surfaceCase({})]));
        expect(text).toContain("Chrome 142 on Linux");
        expect(text).toContain("3j2w (30928 atoms); 1 surface (shown for the run); canvas 1920x1080; 61 s");
    });

    it("gives each case a row, its cost against per vertex in the same view and opacity", () => {
        const text = formatSurfaceBenchmark(facts([
            surfaceCase({}),
            surfaceCase({ mode: "pixel normals", triangles: 143_668, timing: timing(3) }),
            surfaceCase({ mode: "pixel normals+colour", triangles: 143_668, timing: timing(5) }),
            surfaceCase({ opacity: 0.5, peelLayers: 3, timing: timing(8) }),
            surfaceCase({ mode: "pixel normals+colour", opacity: 0.5, peelLayers: 3, timing: timing(24) }),
        ]));
        const vertex = row(text, "per vertex  ");
        expect(vertex).toMatch(/whole\s+opaque\s+575k\s+0\s+16\.7\s+18\.2\s+2\.0\s+5\.0\s+1x$/);
        expect(row(text, "pixel normals  ")).toMatch(/144k\s+0\s+16\.7\s+18\.2\s+3\.0\s+5\.0\s+1\.5x$/);
        expect(row(text, "pixel normals+colour")).toMatch(/opaque.*2\.5x$/);
        // Half transparent: against per vertex half transparent, not opaque.
        expect(text.split("\n").filter(line => line.startsWith("pixel normals+colour"))[1]).toMatch(/0\.5\s+575k\s+3 .*3\.0x$/);
    });

    it("falls back to the time to idle where the GPU was not timed", () => {
        const base = surfaceCase({ timing: timing(null, 4) });
        const pixel = surfaceCase({ mode: "pixel normals", timing: timing(null, 10) });
        expect(caseCost(pixel)).toBe(10);
        const text = formatSurfaceBenchmark(facts([base, pixel]));
        expect(row(text, "pixel normals ")).toMatch(/-\s+10\.0\s+2\.5x$/);
    });

    it("marks a case not drawn the way it says, and says why", () => {
        const text = formatSurfaceBenchmark(facts([
            surfaceCase({}),
            surfaceCase({ mode: "pixel normals", applied: { pixelNormals: false, pixelColour: false } }),
        ]));
        expect(row(text, "pixel normals*")).not.toBe("");
        expect(text).toContain("* not drawn that way here");
    });
});
