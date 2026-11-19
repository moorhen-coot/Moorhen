/**
 * Colour rule CIDs reach every alternate conformation (MoorhenColourRule.ts, withAllAltConfs).
 *
 * Coot selects with mmdb, where a CID with an atom part matches only atoms with no altloc unless it
 * names one: checked against Coot on 5fjj, Gln A54 (N, C, O without an altloc, the rest A and B) -
 * `/1/A/54(GLN)/*` coloured 1040 of its 4179 VdW-surface vertices, `/1/A/54(GLN)/*:*` and `//A/54`
 * all of them.
 */
import { describe, expect, it } from "@jest/globals";
import { ColourRule, withAllAltConfs } from "../../src/utils/MoorhenColourRule";

describe("colour rule CIDs and alternate conformations", () => {
    it("widens a CID that names atoms but no altloc", () => {
        expect(withAllAltConfs("/1/A/54(GLN)/*")).toBe("/1/A/54(GLN)/*:*");
        expect(withAllAltConfs("/*/*/*/*")).toBe("/*/*/*/*:*");
        expect(withAllAltConfs("/1/A/54/CA[C]")).toBe("/1/A/54/CA[C]:*");
    });

    it("leaves alone a CID that stops at the residue, or already names an altloc", () => {
        for (const cid of ["//A", "//A/10-20", "/1/A/54", "//A/54(GLN)/", "/*/*/*/*:*", "/1/A/54/CA:A", "A/54"]) {
            expect(withAllAltConfs(cid)).toBe(cid);
        }
    });

    it("treats each part of a || list on its own", () => {
        expect(withAllAltConfs("//A/10-20||/1/B/5/*")).toBe("//A/10-20||/1/B/5/*:*");
    });
});

describe("editing a colour rule's selection", () => {
    it("changes the CID, and the label with it unless the rule has a name", () => {
        const plain = new ColourRule("cid", "//A", "#ff0000", null, false);
        plain.setCid("//B/1-10");
        expect(plain.cid).toBe("//B/1-10");
        expect(plain.label).toBe("//B/1-10");
        const named = new ColourRule("cid", "//A", "#ff0000", null, false);
        named.setLabel("Active site");
        named.setCid("//A/50/*");
        expect(named.label).toBe("Active site");
        // Both ways to Coot send the CID, widened to every conformation - never the name.
        expect(named.getCootColourRuleArgs()).toEqual(["//A/50/*:*", "#ff0000"]);
        expect(named.getUserDefinedColours()[0].cid).toBe("//A/50/*:*");
    });
});
