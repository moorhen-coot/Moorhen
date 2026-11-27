import { expect, test } from "@playwright/test";
import { startAndGetInstance } from "./helpers";
import { checkDefaultSmoothSurface } from "./helpers/smoothSurface";

/**
 * The smooth surface is made in the Coot worker (shim_smooth_surface_from_atoms in CootWorker.ts, the
 * C++ in wasm_src/smooth-surface.cc): only the atoms go in and only the surface and each vertex's atoms
 * come back, handed over rather than copied. The main thread must stay free meanwhile, and the surface
 * must arrive whole: positions, normals and vertex atoms all for the same vertices.
 */
test.describe("smooth surface in the Coot worker", () => {
    test("is made off the main thread and arrives whole", async ({ page }) => {
        test.setTimeout(240_000);

        const moorhen = await startAndGetInstance(page);
        await moorhen.loadFiles([{ url: "https://files.rcsb.org/download/1hck.pdb", filename: "1hck.pdb" }]);

        const report = await page.evaluate(async targetId => {
            const host = document.getElementById(targetId) as any;
            const instance = await host.getMoorhenInstance();
            const commandCentre = instance.commandCentre;
            const molecule = instance.getMoleculeList()[0];

            const atoms = (await molecule.gemmiAtomsForCid("/*/*/*/*")).filter((a: any) => a.res_name !== "HOH");
            const packed = new Float32Array(4 * atoms.length);
            atoms.forEach((a: any, i: number) => packed.set([a.x, a.y, a.z, 1.8], 4 * i));
            const residueOf = Int32Array.from(atoms, (_: any, i: number) => i);

            // The longest the main thread went without running a 10 ms timer while the worker worked.
            let last = performance.now();
            let longestGap = 0;
            const ticker = setInterval(() => {
                const now = performance.now();
                longestGap = Math.max(longestGap, now - last);
                last = now;
            }, 10);
            const started = performance.now();
            const response = await commandCentre.cootCommand({
                returnType: "smoothed_surface",
                command: "shim_smooth_surface_from_atoms",
                commandArgs: [packed, residueOf, 1.4, { spacing: 0.5, sigma: 0.5, maxShift: 0.3, openRadius: 0.5, refine: true }],
            }, false);
            const smoothMs = performance.now() - started;
            clearInterval(ticker);

            const surface = response.data.result.result?.surface;
            const count = surface ? surface.positions.length / 3 : 0;
            let maxIndex = -1, maxAtom = -1;
            if (surface) {
                for (let i = 0; i < surface.indices.length; i++) maxIndex = Math.max(maxIndex, surface.indices[i]);
                for (let i = 0; i < surface.atom.length; i++) maxAtom = Math.max(maxAtom, surface.atom[i]);
            }
            return {
                status: response.data.result.status,
                smoothMs,
                longestGap,
                vertexCount: count,
                typed: surface?.positions instanceof Float32Array && surface?.indices instanceof Uint32Array,
                normals: surface?.normals.length / 3,
                vertexAtoms: surface?.atom.length,
                near: surface?.near.length / 4,
                maxIndex,
                maxAtom,
                atomCount: atoms.length,
            };
        }, moorhen.elementId);

        console.log(`smooth surface in the worker: ${JSON.stringify(report)}`);
        expect(report.status).toBe("Completed");
        expect(report.typed, "the surface arrives as typed arrays").toBe(true);
        expect(report.vertexCount).toBeGreaterThan(1000);
        expect(report.normals).toBe(report.vertexCount);
        expect(report.vertexAtoms, "an atom for every vertex").toBe(report.vertexCount);
        expect(report.near).toBe(report.vertexCount);
        expect(report.maxIndex).toBeLessThan(report.vertexCount);
        expect(report.maxAtom).toBeLessThan(report.atomCount);
        // The main thread kept running while the worker made the surface. Generous: a loaded CI
        // machine still runs a 10 ms timer far more often than this.
        expect(report.longestGap).toBeLessThan(250);
    });

    test("is drawn by default, by the C++", async ({ page }) => {
        test.setTimeout(240_000);
        await checkDefaultSmoothSurface(page);
    });
});
