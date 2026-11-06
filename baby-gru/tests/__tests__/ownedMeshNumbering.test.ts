/**
 * Owner codes from a shared numbering (ownedMeshPick.ts): meshes that light together - a nucleic
 * acid's backbone and base sticks - must give the same residue the same code, whatever residues
 * each happens to have and in whatever order.
 */
import { describe, expect, it } from "@jest/globals";
import { newOwnerNumbering, ownedMeshPickInfo, residueKey } from "../../src/WebGLgComponents/ownedMeshPick";
import { encodeOwner } from "../../src/utils/pickLevel";

/** A mesh of one vertex per owner. */
const mesh = (owners: string[], numbering = newOwnerNumbering()) => ownedMeshPickInfo(
    owners.flatMap((_, i) => [i, 0, 0]), owners.map((_, i) => i), owners, undefined, undefined, numbering);

describe("owner numbering", () => {
    it("reads model, chain and residue from a CID, without the residue's name", () => {
        expect(residueKey("/1/A/23(ALA)")).toEqual({ model: "1", chain: "A", residue: "23" });
        expect(residueKey("/1/B/622")).toEqual({ model: "1", chain: "B", residue: "622" });
        // Coot puts an insertion code after the name.
        expect(residueKey("/1/A/23(ALA).B")).toEqual({ model: "1", chain: "A", residue: "23.B" });
    });

    it("numbers one mesh as before: chains as first seen, residues within each", () => {
        expect(Array.from(mesh(["/1/A/1(G)", "/1/A/2(C)", "/1/B/5(A)"])!.owner_codes))
            .toEqual([encodeOwner(0, 0), encodeOwner(0, 1), encodeOwner(1, 0)]);
    });

    it("gives the same residue the same code in meshes sharing a numbering", () => {
        const numbering = newOwnerNumbering();
        // The backbone has a protein chain too; the bases only the nucleotides, in another order.
        const backbone = mesh(["/1/P/10(LYS)", "/1/A/1(G)", "/1/A/2(C)", "/1/A/3(U)"], numbering)!;
        const bases = mesh(["/1/A/3(U)", "/1/A/1(G)"], numbering)!;
        expect(bases.owner_codes[0]).toBe(backbone.owner_codes[3]);
        expect(bases.owner_codes[1]).toBe(backbone.owner_codes[1]);
        // Unshared, the bases would have numbered chain A from 0.
        expect(mesh(["/1/A/3(U)", "/1/A/1(G)"])!.owner_codes[0]).not.toBe(backbone.owner_codes[3]);
    });

    it("keeps the same residue of two models apart, in one chain", () => {
        const codes = mesh(["/1/A/1(G)", "/2/A/1(G)"])!.owner_codes;
        expect(codes[0]).not.toBe(codes[1]);
        expect(codes[0] >>> 16).toBe(codes[1] >>> 16);
    });
});
