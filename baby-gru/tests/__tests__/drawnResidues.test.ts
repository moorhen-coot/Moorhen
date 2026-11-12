/**
 * Whether a hovered residue is drawn as atoms (drawnResidues.ts): the hover balls go only where
 * the residue's atoms are on screen, residue by residue, not wherever the molecule has some.
 */
import { describe, expect, it } from "@jest/globals";
import { residueDrawnAsAtoms, residueKeyOf, residueKeyOfCid, residuesOf } from "../../src/utils/drawnResidues";

const STYLES = ["CBs", "CAs", "VdwSpheres", "ligands"];
const atom = (chain_id: string, res_no: string) => ({ chain_id, res_no });

describe("residues drawn as atoms", () => {
    it("reads one residue key from atoms and from every CID form in use", () => {
        expect(residueKeyOf("A", "23")).toBe("A/23");
        expect(residueKeyOf("A", "23A")).toBe("A/23A");
        expect(residueKeyOfCid("/1/A/23(ALA)/CA")).toBe("A/23");
        expect(residueKeyOfCid("/1/A/23A(ALA)/CA:B")).toBe("A/23A");
        // Coot's mesh owners put the insertion code after the name.
        expect(residueKeyOfCid("/1/A/23(ALA).A")).toBe("A/23A");
        expect(residueKeyOfCid("/1/A/-3(ALA)")).toBe("A/-3");
        expect(residueKeyOfCid(null)).toBeNull();
        expect(residueKeyOfCid("/1/A")).toBeNull();
    });

    it("draws balls on a residue an atom-level representation draws, and not on one it does not", () => {
        // Bonds for the ligands only, and a ribbon over everything.
        const ligands = { visible: true, style: "ligands", buffers: [{ atoms: [atom("A", "501"), atom("A", "502")] }] };
        const ribbon = { visible: true, style: "CRs", buffers: [{ atoms: [atom("A", "142"), atom("A", "501")] }] };
        expect(residueDrawnAsAtoms([ligands, ribbon], STYLES, "/1/A/501(NAG)/C1")).toBe(true);
        // The protein residue is under the ribbon and in its atoms, but no atom-level style draws it.
        expect(residueDrawnAsAtoms([ligands, ribbon], STYLES, "/1/A/142(GLY)")).toBe(false);
        // Hidden, it draws nothing.
        expect(residueDrawnAsAtoms([{ ...ligands, visible: false }], STYLES, "/1/A/501(NAG)/C1")).toBe(false);
    });

    it("counts a representation whose atoms are not known yet as drawing everything, as before", () => {
        expect(residueDrawnAsAtoms([{ visible: true, style: "CBs", buffers: [] }], STYLES, "/1/A/1(ALA)/CA")).toBe(true);
    });

    it("indexes an atom list once", () => {
        const atoms = [atom("B", "7")];
        expect(residuesOf(atoms)).toBe(residuesOf(atoms));
        expect(residuesOf(atoms).has("B/7")).toBe(true);
    });
});
