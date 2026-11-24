import { expect, test } from "@playwright/test";
import { resultOrSkip, runGpuCase } from "./helpers/gpuPage";
import type { Comparison, ImpostorsReport } from "./cases/impostors.case";

/**
 * The impostors' picture as the fine meshes': the same pixels covered, the outline antialiased as the
 * meshes' is (each sample's own ray: fs_impostor), so even the edge pixels are covered in both; colours
 * apart only on the rims, where a mesh shades an edge pixel at its centre by a normal carried on past
 * the outline and the impostor by the surface's own normal at a covered sample.
 */
function alike(c: Comparison, name: string, colourShare = 0.035): void {
    expect(c.covered, name).toBeGreaterThan(7000);
    // Not the meshes again.
    expect(c.anyDiffers, `${name}: drawn per pixel at all`).toBeGreaterThan(100);
    expect(c.coverageDiffers, `${name}: coverage (antialiased outline)`).toBeLessThan(c.covered * 0.005);
    expect(c.colourDiffers, `${name}: colour`).toBeLessThan(c.covered * colourShare);
    expect(c.meanDifference, `${name}: mean`).toBeLessThan(3);
}

/**
 * In two passes (their depth, then their shading: drawImpostorsFirst) as in one: the same picture, but
 * for the odd pixel where two surfaces meet at the same depth.
 */
function samePicture(c: Comparison, name: string): void {
    expect(c.covered, name).toBeGreaterThan(7000);
    expect(c.taken, `${name}: passes taken, asked for two and for one`).toEqual([2, 1]);
    expect(c.coverageDiffers, `${name}: two passes, coverage`).toBeLessThan(c.covered * 0.002);
    expect(c.colourDiffers, `${name}: two passes, colour`).toBeLessThan(c.covered * 0.002);
}

/** Spheres and cylinders per pixel (impostors.ts): see cases/impostors.case.ts. */
test("instanced spheres and cylinders drawn per pixel match their meshes", async ({ page }) => {
    const r = resultOrSkip(await runGpuCase<ImpostorsReport>(page, "impostors.case.ts", null));
    const { pictures, ...facts } = r;
    console.log(`Impostors: ${JSON.stringify(facts)}`);
    for (const [name, url] of Object.entries(pictures)) {
        await test.info().attach(`${name}.png`, { body: Buffer.from(url.split(",")[1], "base64"), contentType: "image/png" });
    }
    expect(r.rendererErrors).toEqual([]);
    expect(r.shapes).toEqual({
        sphere: JSON.stringify({ kind: "sphere" }),
        cylinder: JSON.stringify({ kind: "cylinder", end: 1, startCap: false, endCap: false }),
        capped: JSON.stringify({ kind: "cylinder", end: 1, startCap: true, endCap: true }),
        coot: JSON.stringify({ kind: "cylinder", end: -1, startCap: true, endCap: true }),
        notOne: null,
    });
    alike(r.orthographic, "orthographic");
    alike(r.perspective, "perspective");
    // More edges for its size: the rims of the cuts, antialiased on the meshes.
    alike(r.cut, "cut by the front plane", 0.06);
    alike(r.effects, "shadows and occlusion");
    alike(r.capped, "capped cylinders");
    // Coot's own cylinders run the other way along z: they must be found, and placed, the same.
    alike(r.coot, "Coot's template");
    alike(r.cootCapped, "Coot's template, capped");
    for (const [name, c] of Object.entries({
        orthographic: r.orthographic, perspective: r.perspective, cut: r.cut, effects: r.effects, capped: r.capped,
        coot: r.coot, cootCapped: r.cootCapped,
    })) samePicture(c.passes!, name);
    // Deep overlaps, where the two passes save the most; a plain mesh through them, opaque or peeled;
    // a divided canvas.
    samePicture(r.spacefill, "space-filling, through a plain mesh");
    // Where a bond runs into an atom the two depths are too close to compare: whose each sample is goes
    // by id (fs_impostor_shade), so a coarse depth changes nothing.
    samePicture(r.coarse, "perspective, coarse depth");
    samePicture(r.peeled, "space-filling, behind a see-through mesh");
    samePicture(r.stereo, "side-by-side stereo");
    // 15 spheres' and cylinders' 12 triangles each, against 9216 and 192 a sphere and a cylinder.
    expect(r.impostorsPlanned).toBe(15);
    expect(r.trianglesAsImpostors).toBe(15 * 12);
    expect(r.trianglesAsMeshes).toBeGreaterThan(40000);
});
