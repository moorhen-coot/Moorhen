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
