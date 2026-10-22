/**
 * How much of a sectioned mesh one hover, click or centre acts on, as a function of how far in
 * the view is zoomed.
 *
 * Close up, the useful unit is the smallest one the mesh offers - for a backbone trace, a single
 * residue. Pulled back far enough that a whole chain is a few pixels wide, picking a residue is
 * neither possible nor what anyone means; the chain is. Further out still, the object as a whole
 * is the only thing worth naming. So the same mesh answers at three grains and the view decides
 * which, without anything being rebuilt.
 *
 * Pure arithmetic, kept out of the renderer so it can be reasoned about and tested on its own.
 */

/** World units spanned vertically by the view, per unit of zoom. */
const HEIGHT_PER_ZOOM = 48;

/**
 * The world height of the view, in the same units as the scene - angstroms, for a molecule.
 *
 * Height rather than width, although the levels below are about how much you can see. Width is
 * -24 * ratio * zoom to +24 * ratio * zoom, so it moves when the window is made wider, while
 * height is -24 * zoom to +24 * zoom and moves only when the zoom does. Choosing width meant
 * dragging the edge of the window silently changed which grain was in use, with nothing on
 * screen looking any different - so height is the honest measure of how far out the view is.
 *
 * Being exactly proportional to zoom, this is the same thing as setting the thresholds in zoom
 * units, kept in angstroms because that is the unit the scene is in and the one worth reasoning
 * about. Taken from getFrontAndBackPos, the mapping the pick test itself uses: if the two ever
 * disagree, it is picking that is right and this that is wrong.
 */
export const visibleHeight = (zoom: number): number => HEIGHT_PER_ZOOM * zoom;

/**
 * The view heights at which the grain changes, in angstroms, smallest first.
 *
 * Level 0 below the first, level 1 between them, level 2 above the last - so there is always one
 * more level than there are boundaries.
 */
export const LEVEL_BOUNDARIES = [70, 200];

/**
 * How far past a boundary the view has to go before the grain actually changes.
 *
 * Without this, a view sitting exactly on a boundary flips grain on the smallest scroll, and
 * what a stationary pointer highlights changes under it. The band means going up and coming back
 * down happen at different heights, so nothing oscillates: at ten percent, the grain coarsens at
 * 55 A and only returns to fine at 45.
 */
export const LEVEL_BAND = 0.1;

/**
 * The grain to use, given the view height and the grain in use until now.
 *
 * Stateful by design - that is what hysteresis is - but the state is the caller's, passed in and
 * returned, so this stays a function of its arguments.
 */
/**
 * How a mesh that names its vertices packs a chain and a residue into one owner id, so that
 * one comparison in the shader can light either.
 *
 * The chain goes in the high half and the residue within that chain in the low half. Masking
 * off the low half then matches every residue of a chain, and a mask of nothing at all matches
 * every point there is - which is the whole-object grain, for free.
 *
 * Sixteen bits each: no structure has 65536 chains, and a chain with 65536 residues would have
 * defeated the rest of this long before. `encodeOwner` says what happens if one ever does.
 */
export const OWNER_CHAIN_SHIFT = 16;
export const OWNER_RESIDUE_MASK = 0xFFFF;

/** Masks for the three grains, indexed by level: residue, chain, whole object. */
export const LEVEL_OWNER_MASKS = [0xFFFFFFFF, 0xFFFF0000, 0x00000000];

/**
 * The mask for a grain, clamped so an unexpected level can only be coarser than intended and
 * never accidentally zero - which would light everything.
 */
export const ownerMaskForLevel = (level: number): number => {
    if (!Number.isFinite(level) || level <= 0) return LEVEL_OWNER_MASKS[0];
    const index = Math.min(Math.round(level), LEVEL_OWNER_MASKS.length - 1);
    return LEVEL_OWNER_MASKS[index];
};

/**
 * One owner id from a chain and a residue within it.
 *
 * Both are clamped rather than allowed to overflow into each other's half: a residue index
 * that ran past its 16 bits would otherwise land in a neighbouring chain and light the wrong
 * part of the molecule, which is far worse than two residues at the end of an impossibly long
 * chain sharing an id and lighting together.
 */
export const encodeOwner = (chainIndex: number, residueIndex: number): number => {
    const chain = Math.min(Math.max(chainIndex, 0), OWNER_RESIDUE_MASK);
    const residue = Math.min(Math.max(residueIndex, 0), OWNER_RESIDUE_MASK);
    // >>> 0 to keep it an unsigned 32-bit value: a chain index of 0x8000 or more would
    // otherwise make the shift negative.
    return ((chain << OWNER_CHAIN_SHIFT) | residue) >>> 0;
};

export const levelForHeight = (height: number, previous: number): number => {
    // Tolerate a previous level from an older set of boundaries, or no previous level at all.
    let level = Number.isFinite(previous)
        ? Math.min(Math.max(Math.round(previous), 0), LEVEL_BOUNDARIES.length)
        : 0;
    if (!Number.isFinite(height) || height <= 0) return level;

    // Loops rather than single steps, so that a jump of several boundaries at once - fitting a
    // whole ribosome into a view that was showing one residue - arrives where it should instead
    // of creeping one level per frame.
    while (level < LEVEL_BOUNDARIES.length && height > LEVEL_BOUNDARIES[level] * (1 + LEVEL_BAND)) {
        level++;
    }
    while (level > 0 && height < LEVEL_BOUNDARIES[level - 1] * (1 - LEVEL_BAND)) {
        level--;
    }
    return level;
};
