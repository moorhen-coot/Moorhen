import { expect, test } from "@playwright/test";
import { startAndGetInstance } from "./helpers";

/**
 * Which ligands are covalently bound to the polymer (MoorhenMolecule.ligandBonding, from gemmi:
 * wasm_src/ligand-bonding.hh), and a smooth surface's options to leave bound or other ligands out
 * (MoleculeRepresentation.surfaceExcludeBondedLigands / FreeLigands), kept in sessions.
 *
 * 5a3h: a cellulase with its covalent intermediate, 2-fluoro-cellobiose (G2F, BGC) on Glu228.
 * 1df7: methotrexate, NADPH, glycerol, sulphate - none bound.
 */
test.describe("ligand bonding", () => {
    test("bound and free ligands, and the surface's options to leave them out", async ({ page, browserName }) => {
        test.skip(browserName !== "chromium", "Browser independent; run once");
        test.setTimeout(240_000);
        const moorhen = await startAndGetInstance(page);
        await moorhen.loadFiles([
            { url: "/tests/test_data/5a3h.pdb", filename: "5a3h.pdb" },
            { url: "/tests/test_data/1df7.pdb", filename: "1df7.pdb" },
        ]);

        const result = await page.evaluate(async targetId => {
            const host = document.getElementById(targetId) as any;
            const instance = await host.getMoorhenInstance();
            const [cellulase, dhfr] = instance.getMoleculeList();
            const { moorhensession } = await import("/src/protobuf/MoorhenSession.js");

            const bonding = (molecule: any) => molecule.ligandBonding.map((l: any) => `${l.resName}:${l.covalent ? "bound" : "free"}`).sort();
            // The residues a smooth surface of `molecule` is made from, with these options.
            const surfaced = async (molecule: any, options: Record<string, boolean>) => {
                const id = await instance.representation.create(molecule.uniqueId, { representationStyle: "MolecularSurface", ...options });
                const representation = molecule.representations.find((r: any) => r.uniqueId === id);
                const names = new Set<string>((representation.smoothColouring?.records ?? []).map((a: any) => a.res_name));
                return { id, names: ["G2F", "BGC", "MTX", "NDP", "GOL", "SO4", "GLU"].filter(n => names.has(n)) };
            };

            const defaults = await surfaced(dhfr, {});
            const all = await surfaced(cellulase, { surfaceExcludeFreeLigands: false });
            const noBound = await surfaced(cellulase, { surfaceExcludeBondedLigands: true });
            const dhfrAll = await surfaced(dhfr, { surfaceExcludeFreeLigands: false });
            const dhfrNoFree = await surfaced(dhfr, { surfaceExcludeFreeLigands: true });
            const dhfrNoBound = await surfaced(dhfr, { surfaceExcludeBondedLigands: true, surfaceExcludeFreeLigands: false });

            // The options in a session, through the protobuf and back.
            const session = await instance.getTimeCapsuleRef().current.fetchSession(true);
            const decoded = moorhensession.Session.toObject(
                moorhensession.Session.decode(moorhensession.Session.encode(moorhensession.Session.fromObject(session)).finish())
            ) as any;
            const saved = decoded.moleculeData.flatMap((m: any) => m.representations ?? [])
                .filter((r: any) => r.style === "MolecularSurface")
                .map((r: any) => `${!!r.surfaceExcludeBondedLigands}/${!!r.surfaceExcludeFreeLigands}`)
                .sort();

            return {
                cellulase: bonding(cellulase),
                dhfr: bonding(dhfr),
                anchor: cellulase.ligandBonding.find((l: any) => l.resName === "G2F")?.anchor,
                isBound: [cellulase.isCovalentlyBound("/1/B/1(G2F)"), cellulase.isCovalentlyBound("/1/B/2"),
                    dhfr.isCovalentlyBound(dhfr.ligandBonding.find((l: any) => l.resName === "MTX").cid), cellulase.isCovalentlyBound("/1/A/228(GLU)")],
                ligandListFlag: cellulase.ligands.map((l: any) => `${l.resName}:${l.covalent}`).sort(),
                defaults: defaults.names, all: all.names, noBound: noBound.names, dhfrAll: dhfrAll.names, dhfrNoFree: dhfrNoFree.names, dhfrNoBound: dhfrNoBound.names,
                saved,
            };
        }, moorhen.elementId);

        console.log(`ligand bonding: ${JSON.stringify(result)}`);
        expect(result.cellulase).toEqual(["BGC:bound", "G2F:bound"]);
        expect(result.dhfr.every((l: string) => l.endsWith(":free"))).toBe(true);
        expect(result.anchor).toBe("/1/A/228(GLU)");
        expect(result.isBound).toEqual([true, true, false, undefined]);
        expect(result.ligandListFlag).toEqual(expect.arrayContaining(["G2F:true"]));
        // By default bound ligands only: 1df7's free ones left out.
        expect(result.defaults).toEqual(["GLU"]);
        // Bound ligands left out on request, polymer kept.
        expect(result.all).toEqual(["G2F", "BGC", "GLU"]);
        expect(result.noBound).toEqual(["GLU"]);
        expect(result.dhfrAll).toEqual(expect.arrayContaining(["MTX", "NDP", "GOL", "SO4"]));
        expect(result.dhfrNoFree).toEqual(["GLU"]);
        expect(result.dhfrNoBound).toEqual(result.dhfrAll);
        // Kept in the session: the six surfaces' options, bound / free left out.
        expect(result.saved).toEqual(["false/false", "false/false", "false/true", "false/true", "true/false", "true/true"]);
    });
});
