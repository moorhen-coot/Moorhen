/**
 * Where centring on a mesh goes (meshCentre.ts): zoomed out, the middle of what the hover lights
 * (the chain, the molecule), ahead of any atom the pick also found; at the residue grain, nothing,
 * so the atom keeps its precedence.
 */
import { describe, expect, it } from "@jest/globals";
import { coarseSectionPosition, pickedMeshPosition, type MeshPickSource } from "../../src/WebGLgComponents/meshCentre";

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
});
