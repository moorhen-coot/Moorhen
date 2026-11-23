import { expect, test } from "@playwright/test";
import { readFileSync } from "fs";
import { join } from "path";
import { resultOrSkip, runGpuCase } from "./helpers/gpuPage";
import type { MetaBallsArgs, MetaBallsReport } from "./cases/metaballs.case";

test("GPU MetaBalls match the C++ vertex for vertex (first 16 atoms of 1df7)", async ({ page }) => {
    const pdbLines = readFileSync(join(__dirname, "../test_data/1df7.pdb"), "utf8").split("\n")
        .filter(line => /^(ATOM|HETATM)/.test(line) && line.slice(17, 20) !== "HOH")
        .slice(0, 16);
    const args: MetaBallsArgs = { pdbLines, reference: "/data/metaballs-1df7-first16.cpp.bin.gz" };
    const r = resultOrSkip(await runGpuCase<MetaBallsReport>(page, "metaballs.case.ts", args));
    expect(r.cppVertices).toBe(4372);
    expect(r.gpuVertices).toBe(r.cppVertices);
    expect(r.gpuTriangles).toBe(r.cppTriangles);
    expect(r.unmatchedVertices).toBe(0);
    expect(r.sameTriangles).toBe(r.cppTriangles);
    // float32 on the GPU against the C++'s own float32, summed in another order.
    expect(r.maxPositionError).toBeLessThan(1e-3);
    expect(r.maxNormalDegrees).toBeLessThan(0.1);
    expect(r.maxColourError).toBeLessThan(1e-4);
    // A weight right at the 0.005 cut can land either side.
    expect(r.influenceSetsDiffer).toBeLessThanOrEqual(2);
    expect(r.maxInfluenceWeightError).toBeLessThan(1e-4);
});
