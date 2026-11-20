import { expect, test } from "@playwright/test";
import { startAndGetInstance } from "./helpers";

/**
 * "Surface each chain separately" (MoleculeRepresentation.surfaceChainsSeparate): each chain's smooth
 * surface from its own atoms, merged into one mesh - so the interfaces between chains are surfaced too, and the mesh
 * still has residue owners for every chain and can be recoloured in place. 5fjj: chains A-D, its glycans in
 * chains of their own (E-Z, a-i) surfaced with the protein chain they sit on (surfaceChainGroups).
 */
test("each chain is surfaced on its own, interfaces included", async ({ page }) => {
    // Five surfaces of 5fjj on the CPU (no WebGPU adapter here): the complex, then four chains.
    test.setTimeout(180_000);
    const moorhen = await startAndGetInstance(page);
    await moorhen.loadFiles([{ url: "/tests/test_data/5fjj.pdb", filename: "5fjj.pdb" }]);

    const result = await page.evaluate(async targetId => {
        const host = document.getElementById(targetId) as any;
        const instance = await host.getMoorhenInstance();
        const molecule = instance.getMoleculeList()[0];
        await molecule.show("MolecularSurface");
        const representation = molecule.representations.find((r: any) => r.style === "MolecularSurface");
        const vertices = (rep: any) => rep.smoothColouring?.vertex.atom.length ?? 0;
        const joined = vertices(representation);

        representation.surfaceChainsSeparate = true;
        await representation.redraw();
        const separate = vertices(representation);
        const buffer = representation.buffers.find((b: any) => b.triangleColours?.[0]?.length === 4 * separate);
        const chainsOwning = [...new Set((buffer?.pick_info?.pick_point_tags ?? []).map((tag: string) => tag.split("/")[2]))].sort();
        const recoloured = await representation.recolour();
        return { joined, separate, chainsOwning, recoloured, hasBuffer: !!buffer };
    }, moorhen.elementId);

    console.log(`chains: ${JSON.stringify(result)}`);
    expect(result.joined).toBeGreaterThan(1000);
    expect(result.hasBuffer).toBe(true);
    // The interfaces, now surfaced on both sides: more surface than the complex as one.
    expect(result.separate).toBeGreaterThan(result.joined);
    expect(result.chainsOwning).toEqual(expect.arrayContaining(["A", "B", "C", "D"]));
    // The glycans are surfaced too (not water or ions): more chains than the four.
    expect(result.chainsOwning.length).toBeGreaterThan(4);
    expect(result.recoloured).toBe(true);
});
