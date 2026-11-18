/**
 * Where centring on a mesh goes (alt-click or middle-click on something with no atom of its own,
 * eventHandlers.ts doMouseUp). No WebGL here: picking is done on the CPU, and these only read the
 * pick information a buffer carries.
 */

import { MOORHEN_ATOM_TAG_KIND, MOORHEN_MESH_RESIDUE_TAG_KIND } from "../utils/enums";

/**
 * Whether centring on a surface or ribbon follows the hover's grain: zoomed out, the middle of the
 * chain or molecule it lights (true), or always the residue clicked (false, the default - people
 * know their structures and want to go to the residue they clicked). A Dev menu switch.
 */
export const meshCentringSetting = { followHighlight: false };

/** The parts of a DisplayBuffer these read. */
export interface MeshPickSource {
    pick_info?: {
        pick_point_tags?: string[];
        pick_tag_kind?: string;
        pick_points?: number[][] | [];
        pick_point_sections?: number[];
        pick_point_instances?: number[];
        section_level_points?: number[][][];
        pick_exact?: boolean;
    } | null;
}

/**
 * Where on a mesh a pick landed, in scene coordinates, or null if it did not land on one.
 *
 * A buffer divided into sections gives the section that was picked, so that a trace centres on
 * the residue pointed at rather than on the middle of the whole chain. Anything else gives the
 * centre of the instance, which is the first pick point it offers - the rest are scattered over
 * its surface to make it hoverable, and centring on one of those would put the view on the
 * shape's edge.
 *
 * A position rather than an identity, because a mesh need not stand for anything at all.
 *
 * `level` says how much of a sectioned mesh counts as one thing at the current zoom: centring
 * lands on the middle of whatever is highlighted, so pulled back far enough it goes to the
 * middle of a whole chain rather than of the residue happening to be under the pointer.
 */
export function pickedMeshPosition(
    displayBuffers: readonly MeshPickSource[], bufferIndex: number, pickIndex: number, level: number = 0
): number[] | null {
    const pickInfo = bufferIndex > -1 ? displayBuffers[bufferIndex]?.pick_info : null;
    if (!pickInfo?.pick_points || pickIndex < 0) {
        return null;
    }
    // A section's aim point at this grain, when the mesh offers coarser ones.
    const section = pickInfo.pick_point_sections?.[pickIndex];
    const coarse = section !== undefined
        ? pickInfo.section_level_points?.[level]?.[section]
        : undefined;
    if (coarse) return coarse;
    let index = pickIndex;
    if (!pickInfo.pick_point_sections) {
        const instances = pickInfo.pick_point_instances;
        if (instances) {
            const first = instances.indexOf(instances[pickIndex]);
            if (first > -1) index = first;
        }
    }
    return pickInfo.pick_points[index] ?? null;
}

/**
 * Where centring goes when the view is zoomed out past the residue grain (`level` above 0) and
 * the pointer is on a mesh that stands for residues - a molecular surface, an owned-mesh ribbon:
 * the middle of what the hover lights at that grain, the chain or the whole molecule. Null at the
 * residue grain, and for anything else, so that the atom under the pointer keeps its precedence
 * there.
 *
 * Only for a mesh the ray was tested against exactly (pick_exact): the pick then means the
 * pointer is genuinely on it, not merely near one of its sample points.
 */
export function coarseSectionPosition(
    displayBuffers: readonly MeshPickSource[], bufferIndex: number, pickIndex: number, level: number
): number[] | null {
    if (!(level > 0) || bufferIndex < 0 || pickIndex < 0) return null;
    const pickInfo = displayBuffers[bufferIndex]?.pick_info;
    if (!pickInfo?.pick_exact) return null;
    const section = pickInfo.pick_point_sections?.[pickIndex];
    if (section === undefined) return null;
    return pickInfo.section_level_points?.[level]?.[section] ?? null;
}

/**
 * The residue a mesh's pick point names, as the hover reports it (MainContainer's
 * onSectionHovered): the CID itself for a mesh that names residues (a surface, a Coot ribbon), the
 * last field of "<molecule>|<chain>|<residue>|<cid>" for one whose sections stand for residues
 * (meshInstancing's paths). Null for anything else.
 */
export function meshResidueCid(displayBuffers: readonly MeshPickSource[], bufferIndex: number, pickIndex: number): string | null {
    if (bufferIndex < 0 || pickIndex < 0) return null;
    const pickInfo = displayBuffers[bufferIndex]?.pick_info;
    const tag = pickInfo?.pick_point_tags?.[pickIndex];
    if (!tag) return null;
    if (pickInfo.pick_tag_kind === MOORHEN_MESH_RESIDUE_TAG_KIND) return tag;
    if (pickInfo.pick_tag_kind === MOORHEN_ATOM_TAG_KIND) {
        const fields = tag.split("|");
        return fields.length >= 4 ? fields.slice(3).join("|") : null;
    }
    return null;
}

/**
 * Whether centring should go to the mesh rather than the atom the pick also found: when the hover
 * already says it is the mesh's residue (`hoveredCid`, the store's hoveredAtom.cid).
 *
 * The two picks are independent. The atom is the one nearest the ray within a tolerance that
 * grows with the zoom, at any depth, so behind a ribbon there is often some atom far in the
 * background nearer the ray than anything at the front. The hover decides between them by
 * molecule (a mesh beats an atom of its own molecule) and labels and lights the mesh's residue;
 * centring took the atom regardless, and went to the background while the ribbon in front stayed
 * lit. Asking what the hover settled on keeps the two in step, and leaves the atom its say where
 * the hover gave it the atom - another molecule's, say.
 */
export function centreOnMesh(displayBuffers: readonly MeshPickSource[], bufferIndex: number, pickIndex: number,
                             hoveredCid: string | null | undefined): boolean {
    const cid = meshResidueCid(displayBuffers, bufferIndex, pickIndex);
    return cid !== null && !!hoveredCid && cid === hoveredCid;
}
