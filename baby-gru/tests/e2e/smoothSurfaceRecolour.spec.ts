import { expect, test } from "@playwright/test";
import { startAndGetInstance } from "./helpers";

/**
 * A smooth surface made from the atoms is coloured again without being rebuilt
 * (MoleculeRepresentation.recolour): a colour-rule change replaces its buffer's vertex colours in
 * place - the same buffer object, no worker call, no new field.
 */
test("a colour-rule change recolours the smooth surface without rebuilding it", async ({ page }) => {
    const moorhen = await startAndGetInstance(page);
    await moorhen.loadFiles([{ url: "https://files.rcsb.org/download/1hck.pdb", filename: "1hck.pdb" }]);

    const result = await page.evaluate(async targetId => {
        const host = document.getElementById(targetId) as any;
        const instance = await host.getMoorhenInstance();
        const molecule = instance.getMoleculeList()[0];
        await molecule.show("MolecularSurface");
        const representation = molecule.representations.find((r: any) => r.style === "MolecularSurface");
        const count = representation.smoothColouring?.vertex.atom.length ?? 0;
        const buffer = representation.buffers.find((b: any) => b.triangleColours?.[0]?.length === 4 * count);
        const before = Array.from(buffer.triangleColours[0].slice(0, 4));

        // One rule, everything red: a copy of the first default rule, made single-colour.
        const template = molecule.defaultColourRules[0];
        const red = Object.assign(Object.create(Object.getPrototypeOf(template)), template);
        red.isMultiColourRule = false;
        red.multiColourData = "";
        red.cid = "/*/*/*/*:*";
        red.label = red.cid;
        red.color = "#ff0000";
        molecule.defaultColourRules = [red];

        const started = performance.now();
        const recoloured = await representation.recolour();
        const recolourMs = Math.round(performance.now() - started);
        const sameBuffer = representation.buffers.includes(buffer);
        const colours = buffer.triangleColours[0];
        let red255 = 0;
        for (let v = 0; v < count; v++) if (colours[4 * v] > 0.99 && colours[4 * v + 1] < 0.01 && colours[4 * v + 2] < 0.01) red255++;
        return { count, recolourMs, before, recoloured, sameBuffer, red: red255, dirty: buffer.isDirty || buffer.dataVersion > 0 };
    }, moorhen.elementId);

    console.log(`recolour: ${JSON.stringify(result)}`);
    expect(result.count).toBeGreaterThan(1000);
    expect(result.recoloured).toBe(true);
    expect(result.sameBuffer).toBe(true);
    // Every vertex red: one rule, so blending and smoothing have nothing to mix.
    expect(result.red).toBe(result.count);
});
