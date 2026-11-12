/**
 * Nucleic acid ribbon ownership put right (nucleotideOwners.ts): Coot's stretches, centred on each
 * C3', hand every phosphate to the residue before; the boundaries should be at the O3'-P links.
 */
import { describe, expect, it } from "@jest/globals";
import { naturalSplineSamples, ownerResidueKey, reassignNucleotideOwners } from "../../src/WebGLgComponents/nucleotideOwners";

/**
 * A straight strand along x, 6 A a nucleotide: residue r's backbone runs from its P at 6r to its
 * O3' at 6r + 5, C3' at 6r + 4. Coot's stretch for r is centred on its C3': [6r + 1, 6r + 7).
 */
const NAMES: [string, number][] = [["P", 0], ["OP1", 0.3], ["O5'", 1], ["C5'", 2], ["C4'", 3], ["O4'", 3.2], ["C3'", 4], ["O3'", 5]];
const strand = (n: number, chain = "A") => Array.from({ length: n }, (_, r) => NAMES.map(([name, at]) => ({
    name, x: 6 * r + at, y: 1, z: 0, mol_name: "1", chain_id: chain, res_no: String(r + 1),
}))).flat();
const owners = (n: number, chain = "A") => Array.from({ length: n }, (_, r) => `/1/${chain}/${r + 1}(G)`);

describe("nucleotide ribbon owners", () => {
    it("reads residue keys as Coot writes owners, insertion codes included", () => {
        expect(ownerResidueKey("/1/A/23(G)")).toBe("1/A/23");
        expect(ownerResidueKey("/1/A/23(G).B")).toBe("1/A/23B");
    });

    it("moves each phosphate's stretch of ribbon to its own residue", () => {
        // Vertices along the ribbon every 0.5 A, owned as Coot owns them.
        const xs = Array.from({ length: 30 }, (_, i) => 1 + 0.5 * i);
        const vertices = xs.flatMap(x => [x, 0, 0]);
        const coot = xs.map(x => Math.min(3, Math.floor((x - 1) / 6)));
        const fixed = Array.from(reassignNucleotideOwners(vertices, coot, owners(4), strand(4)));
        // Coot's: the second residue's P (x = 6) is in the first residue's stretch.
        expect(coot[xs.indexOf(6)]).toBe(0);
        // Now: everything from the second residue's P to its O3' is the second residue's.
        xs.forEach((x, i) => {
            if (x >= 6 && x <= 11) expect(fixed[i]).toBe(1);
            if (x >= 12 && x <= 15) expect(fixed[i]).toBe(2);
        });
    });

    it("cuts straight across the ribbon: every vertex of a cross-section goes the same way", () => {
        // Rings of 12 vertices, 1.5 A round the strand's axis, either side of the second
        // residue's boundary (the O3'-P link, x = 5.5), with the phosphate atoms well off the
        // axis on one side: the case where going by the nearest atom can split a ring.
        const atoms = strand(4).map(a => (a.name === "P" || a.name === "OP1" ? { ...a, y: 4 } : a));
        const rings = [5.3, 5.7];
        const vertices: number[] = [], coot: number[] = [];
        rings.forEach(x => {
            for (let j = 0; j < 12; j++) {
                const angle = (2 * Math.PI * j) / 12;
                vertices.push(x, 1 + 1.5 * Math.cos(angle), 1.5 * Math.sin(angle));
                coot.push(0);
            }
        });
        const fixed = Array.from(reassignNucleotideOwners(vertices, coot, owners(4), atoms));
        expect(new Set(fixed.slice(0, 12))).toEqual(new Set([0]));
        expect(new Set(fixed.slice(12))).toEqual(new Set([1]));
    });

    it("samples the natural spline through the points it was given", () => {
        const points: [number, number, number][] = [[0, 0, 0], [1, 2, 0], [3, 2, 1], [4, 0, 1]];
        const samples = naturalSplineSamples(points);
        points.forEach((p, i) => p.forEach((v, c) => expect(samples[3 * 24 * i + c]).toBeCloseTo(v, 6)));
    });

    it("leaves proteins, other chains and unowned vertices alone", () => {
        const vertices = [6, 0, 0, 6, 0, 0, 6, 0, 0];
        // A protein residue between two nucleotides of the table, a nucleotide of another chain,
        // and no owner at all.
        const table = ["/1/A/1(G)", "/1/P/5(LYS)", "/1/B/2(G)"];
        const atoms = [...strand(1), ...strand(2, "B").filter(a => a.res_no === "2")];
        const result = Array.from(reassignNucleotideOwners(vertices, [1, 2, 0xFFFFFFFF], table, atoms));
        expect(result).toEqual([1, 2, 0xFFFFFFFF]);
    });

    it("returns the owners as they were when there is no nucleic acid", () => {
        const given = [0, 0];
        expect(reassignNucleotideOwners([0, 0, 0, 1, 0, 0], given, ["/1/A/1(ALA)"], [])).toBe(given);
    });
});
