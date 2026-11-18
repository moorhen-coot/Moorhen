import { expect, test } from "@playwright/test";
import { startAndGetInstance } from "./helpers";
import { checkDefaultSmoothSurface } from "./helpers/smoothSurface";

/**
 * The smooth surface is made in the Coot worker (shim_smooth_molecular_representation_mesh in
 * CootWorker.ts, with the code from SmoothSurface.js, bundled from src/utils/smoothSurface.ts):
 * the worker makes the M2T surface, smooths it and posts only the smoothed mesh back. The main
 * thread must stay free meanwhile, and the mesh must arrive whole: positions, normals, colours and
 * per-vertex owners all for the same vertices.
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
            const selection = "(ALA,CYS,ASP,GLU,PHE,GLY,HIS,ILE,LYS,LEU,MET,MSE,ASN,PRO,GLN,ARG,SER,THR,VAL,TRP,TYR)";
            const m2tArgs = [molecule.molNo, selection, "", "MolecularSurface", 2];

            const atoms = (await molecule.gemmiAtomsForCid("/*/*/*/*")).filter((a: any) => a.res_name !== "HOH");
            const packed = new Float32Array(4 * atoms.length);
            atoms.forEach((a: any, i: number) => packed.set([a.x, a.y, a.z, 1.8], 4 * i));

            // The longest the main thread went without running a 10 ms timer while the worker worked.
            let last = performance.now();
            let longestGap = 0;
            const ticker = setInterval(() => {
                const now = performance.now();
                longestGap = Math.max(longestGap, now - last);
                last = now;
            }, 10);
            const started = performance.now();
            const smoothed = await commandCentre.cootCommand({
                returnType: "smoothed_mesh",
                command: "shim_smooth_molecular_representation_mesh",
                commandArgs: [...m2tArgs, packed, 1.4, { spacing: 0.5, sigma: 0.5, maxShift: 0.3 }],
            }, false);
            const smoothMs = performance.now() - started;
            clearInterval(ticker);

            const plain = await commandCentre.cootCommand({
                returnType: "mesh", command: "get_molecular_representation_mesh", commandArgs: m2tArgs,
            }, false);

            const mesh = smoothed.data.result.result;
            const vertices = mesh?.vert_tri?.[0]?.[0];
            const count = vertices ? vertices.length / 3 : 0;
            const indices = mesh?.idx_tri?.[0]?.[0];
            let maxIndex = -1;
            if (indices) for (let i = 0; i < indices.length; i++) maxIndex = Math.max(maxIndex, indices[i]);
            return {
                status: smoothed.data.result.status,
                smoothMs,
                longestGap,
                vertexCount: count,
                typed: vertices instanceof Float32Array,
                normals: mesh?.norm_tri?.[0]?.[0]?.length / 3,
                colours: mesh?.col_tri?.[0]?.[0]?.length / 4,
                owners: mesh?.vertex_owners?.length,
                ownerTable: mesh?.owners?.length,
                maxIndex,
                plainVertexCount: plain.data.result.result.vert_tri[0][0].length / 3,
            };
        }, moorhen.elementId);

        console.log(`smooth surface in the worker: ${JSON.stringify(report)}`);
        expect(report.status).toBe("Completed");
        expect(report.typed, "the mesh arrives as typed arrays").toBe(true);
        expect(report.vertexCount).toBeGreaterThan(1000);
        expect(report.vertexCount, "the smoothed mesh, not the M2T one").not.toBe(report.plainVertexCount);
        expect(report.normals).toBe(report.vertexCount);
        expect(report.colours).toBe(report.vertexCount);
        expect(report.owners, "per-vertex residue owners carried over").toBe(report.vertexCount);
        expect(report.ownerTable).toBeGreaterThan(0);
        expect(report.maxIndex).toBeLessThan(report.vertexCount);
        // The main thread kept running while the worker made the surface. Generous: a loaded CI
        // machine still runs a 10 ms timer far more often than this.
        expect(report.longestGap).toBeLessThan(250);
    });

    test("is drawn by default, contoured on the CPU in the worker when there is no WebGPU", async ({ page }) => {
        test.setTimeout(240_000);
        await checkDefaultSmoothSurface(page);
    });
});
