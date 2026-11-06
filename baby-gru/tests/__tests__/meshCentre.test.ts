/**
 * Where centring on a mesh goes (meshCentre.ts): zoomed out, the middle of what the hover lights
 * (the chain, the molecule), ahead of any atom the pick also found; at the residue grain, nothing,
 * so the atom keeps its precedence.
 */
import { describe, expect, it } from "@jest/globals";
import { centreOnMesh, coarseSectionPosition, meshResidueCid, pickedMeshPosition, type MeshPickSource } from "../../src/WebGLgComponents/meshCentre";
import { MOORHEN_ATOM_TAG_KIND, MOORHEN_MESH_RESIDUE_TAG_KIND } from "../../src/utils/enums";

// Two residues of one chain: their own centres, the chain's, the molecule's.
const surface: MeshPickSource = {
    pick_info: {
        pick_exact: true,
        pick_points: [[1, 0, 0], [3, 0, 0]],
        pick_point_sections: [0, 1],
        section_level_points: [
            [[1, 0, 0], [3, 0, 0]],
            [[2, 0, 0], [2, 0, 0]],
            [[5, 5, 5], [5, 5, 5]],
        ],
    },
};

describe("centring on a mesh", () => {
    it("goes to the chain or the molecule when zoomed out", () => {
        expect(coarseSectionPosition([surface], 0, 1, 1)).toEqual([2, 0, 0]);
        expect(coarseSectionPosition([surface], 0, 0, 2)).toEqual([5, 5, 5]);
    });

    it("leaves the residue grain to the atom", () => {
        expect(coarseSectionPosition([surface], 0, 1, 0)).toBeNull();
        // ...and to pickedMeshPosition when there is no atom.
        expect(pickedMeshPosition([surface], 0, 1, 0)).toEqual([3, 0, 0]);
    });

    it("only for a mesh the pointer is genuinely on, with sections", () => {
        const near = { pick_info: { ...surface.pick_info, pick_exact: false } };
        expect(coarseSectionPosition([near], 0, 1, 1)).toBeNull();
        const plain = { pick_info: { pick_exact: true, pick_points: [[0, 0, 0]] } };
        expect(coarseSectionPosition([plain], 0, 0, 1)).toBeNull();
        expect(coarseSectionPosition([surface], -1, 0, 1)).toBeNull();
        expect(coarseSectionPosition([surface], 0, -1, 1)).toBeNull();
    });

    it("goes to the mesh's residue when the hover settled on it, and to the atom otherwise", () => {
        const ribbon: MeshPickSource = { pick_info: { ...surface.pick_info, pick_tag_kind: MOORHEN_MESH_RESIDUE_TAG_KIND,
            pick_point_tags: ["/1/G/138(LYS)", "/1/G/139(GLU)"] } };
        expect(meshResidueCid([ribbon], 0, 1)).toBe("/1/G/139(GLU)");
        // The hover names the ribbon's residue: centre there, not on the atom.
        expect(centreOnMesh([ribbon], 0, 1, "/1/G/139(GLU)")).toBe(true);
        // The hover took an atom (another molecule's, or one in front): leave it to the atom.
        expect(centreOnMesh([ribbon], 0, 1, "/1/A/16(A)/C8")).toBe(false);
        expect(centreOnMesh([ribbon], 0, 1, null)).toBe(false);
        // Sections that stand for residues carry "<molecule>|<chain>|<residue>|<cid>".
        const path: MeshPickSource = { pick_info: { pick_points: [[0, 0, 0]], pick_tag_kind: MOORHEN_ATOM_TAG_KIND,
            pick_point_tags: ["m1|A|5|/1/A/5(ALA)"] } };
        expect(meshResidueCid([path], 0, 0)).toBe("/1/A/5(ALA)");
        // Anything else names nothing.
        expect(meshResidueCid([{ pick_info: { pick_points: [[0, 0, 0]], pick_point_tags: ["x"], pick_tag_kind: "other" } }], 0, 0)).toBeNull();
    });
});
