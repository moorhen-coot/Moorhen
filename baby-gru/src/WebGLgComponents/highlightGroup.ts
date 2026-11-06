/**
 * Meshes that light together when any one of them is hovered.
 *
 * A representation can be drawn as more than one mesh for reasons of its own - a nucleic acid
 * ribbon is the backbone in one buffer and the base sticks in another, because each buffer's
 * pick information describes its own vertices and merging two of them means renumbering
 * everything. To whoever is hovering it is one thing, so a hover on either lights the same
 * residues, chain or molecule in both: the buffers carry the same `highlight_group` in their
 * pick information, and owner codes from one shared numbering (ownedMeshPick.ts,
 * newOwnerNumbering), so the hovered point's code means the same residue in each.
 *
 * Without it the hover lit whichever mesh was nearest the pointer, so a small move flipped the
 * highlight between a chain's sticks and its backbone with nothing on screen to say why.
 */

/** The parts of a DisplayBuffer this reads. */
export interface GroupedBuffer {
    visible?: boolean;
    pick_info?: { highlight_group?: string | null } | null;
}

/**
 * The indices of the other buffers in `hovered`'s highlight group, visible ones only, in
 * display order; none for a buffer in no group.
 */
export function highlightSiblings(displayBuffers: readonly (GroupedBuffer | null | undefined)[], hovered: number): number[] {
    const group = displayBuffers[hovered]?.pick_info?.highlight_group;
    if (!group) return [];
    const siblings: number[] = [];
    displayBuffers.forEach((buffer, idx) => {
        if (idx !== hovered && buffer && buffer.visible !== false && buffer.pick_info?.highlight_group === group) {
            siblings.push(idx);
        }
    });
    return siblings;
}
