/**
 * The radii of Coot's worm (the "Worm" style): from B-factors, uniform or given, in angstroms, and
 * as the residue properties Coot's set_residue_properties takes (multiples of the coil thickness).
 */
import { describe, expect, it } from "@jest/globals";
import {
    MIN_WORM_RADIUS,
    defaultWormOptions,
    parseResidueCid,
    wormM2tIntParameters,
    wormResidueProperties,
    wormResidueRadii,
} from "../../src/utils/Representation/wormRadii";

// As MoorhenMolecule.getResidueBFactors names residues (gemmi's get_structure_bfactors).
const bFactors = [
    { cid: "/1/A/10(ALA)/*", bFactor: 20 },
    { cid: "/1/A/11A(GLY)/*", bFactor: 60 },
    { cid: "/1/B/-3(SER)/*", bFactor: 0 },
    { cid: "/2/A/10(ALA)/*", bFactor: 99 },
];

describe("worm radii", () => {
    it("reads a residue's chain, number and insertion code from its CID", () => {
        expect(parseResidueCid("/1/A/11A(GLY)/*")).toEqual({ model: "1", chainId: "A", resNo: 11, insCode: "A" });
        expect(parseResidueCid("/1/B/-3(SER)/*")).toEqual({ model: "1", chainId: "B", resNo: -3, insCode: "" });
        expect(parseResidueCid("not a cid")).toBeNull();
    });

    it("scales by B-factor as CCP4MG did, 0.05 A per A^2 by default, first model only", () => {
        const radii = wormResidueRadii(defaultWormOptions(), bFactors);
        expect(radii).toHaveLength(3);
        expect(radii[0]).toEqual({ chainId: "A", resNo: 10, insCode: "", radius: 1 });
        expect(radii[1].radius).toBeCloseTo(3, 6);
        expect(radii[1].insCode).toBe("A");
        // B = 0 is the thinnest, not ignored (Coot ignores a radius of zero)
        expect(radii[2].radius).toBe(MIN_WORM_RADIUS);
    });

    it("can be uniform", () => {
        const radii = wormResidueRadii({ ...defaultWormOptions(), radiusSource: "uniform", uniformRadius: 1.5 }, bFactors);
        expect(radii.map(r => r.radius)).toEqual([1.5, 1.5, 1.5]);
    });

    it("can be given, and falls back to B-factors when none are", () => {
        const residueRadii = [{ chainId: "C", resNo: 5, radiusAniso: [1, 2, 3] as [number, number, number] }];
        expect(wormResidueRadii({ ...defaultWormOptions(), radiusSource: "custom", residueRadii }, bFactors)).toBe(residueRadii);
        expect(wormResidueRadii({ ...defaultWormOptions(), radiusSource: "custom", residueRadii: null }, bFactors)).toHaveLength(3);
    });

    it("is drawn more finely around than a ribbon's coil, unless told otherwise", () => {
        expect(wormM2tIntParameters(defaultWormOptions())).toEqual({ ribbonStyleAxialSampling: 6, cylindersStyleAngularSampling: 12 });
        expect(wormM2tIntParameters({ ...defaultWormOptions(), axialSampling: 10, angularSampling: 20.4 }))
            .toEqual({ ribbonStyleAxialSampling: 10, cylindersStyleAngularSampling: 20 });
        // as from a session written before these were saved
        expect(wormM2tIntParameters({ ...defaultWormOptions(), axialSampling: undefined, angularSampling: 0 }))
            .toEqual({ ribbonStyleAxialSampling: 6, cylindersStyleAngularSampling: 12 });
    });

    it("hands Coot multiples of the coil thickness, as JSON", () => {
        const json = wormResidueProperties(
            [
                { chainId: "A", resNo: 10, insCode: "", radius: 0.6 },
                { chainId: "A", resNo: 11, radiusAniso: [0.3, 0.6, 0.9] },
                { chainId: "A", resNo: 12, radius: 0 },
            ],
            0.3
        );
        const properties = JSON.parse(json);
        expect(properties).toHaveLength(2);
        expect(properties[0]).toEqual({ "chain-id": "A", "res-no": 10, "ins-code": "", "worm-radius": expect.any(Number) });
        expect(properties[0]["worm-radius"]).toBeCloseTo(2, 6);
        expect(properties[1]["ins-code"]).toBe("");
        expect(properties[1]["worm-radius-aniso"].map((v: number) => Math.round(v * 1e6) / 1e6)).toEqual([1, 2, 3]);
    });
});
