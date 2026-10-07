/**
 * The geometry behind the side-on clip/fog/blur widget: where each handle sits, which one a click
 * picks up, and how far a drag is allowed to move it.
 *
 * This used to live inline in the component, and all three jobs were done with the *clamped*
 * drawing position:
 *
 *     const clipStartPos = Math.min(plotWidth-2, Math.max(plotWidth*.5 - clipStart/scale*plotWidth*.5, 1))
 *
 * The clamp is a drawing decision - it keeps a handle visible when its value is off the plot - but
 * it was also used to hit-test the grab and to guard the drag, and that is what locked the widget
 * up. Two handles whose values are both off the same end clamp to the same pixel, and since the
 * grab took the first match from a fixed list, the later one could never be picked up again. Worse,
 * the drag guards read "if (x < clipEndPos)", so a partner clamped to pixel 1 made the condition
 * unsatisfiable and froze the handle where it stood.
 *
 * Here the plot's range grows to contain whatever the handles are worth, so nothing is ever off the
 * plot and nothing is ever clamped. Positions are a plain linear map, the hit test takes the
 * nearest visible handle rather than the first, and the drag constraint is expressed in angstroms,
 * where it can always be satisfied.
 */

/** The draggable handles, in the order they are drawn. */
export type HandleId = "clipStart" | "clipEnd" | "fogStart" | "fogEnd" | "blurDepth";

/**
 * A handle, as this module sees it.
 *
 * `offset` is signed and measured from the view centre in angstroms: negative towards the viewer,
 * positive away from it. The component converts its four differently-shaped values into this one
 * convention, which is what lets the hit test and the range fit treat them uniformly.
 *
 * Depth blur is stored as a fraction of the clip slab rather than as a distance, so the component
 * converts it with blurOffset below before building its handle. Every handle therefore reaches
 * this module in the same terms, and none of them is a special case.
 */
export interface Handle {
    id: HandleId;
    offset: number;
    visible: boolean;
}

/** How close a click has to be, in pixels, to pick a handle up. */
export const GRAB_TOLERANCE_PX = 5;

/**
 * How much room to leave beyond the outermost handle.
 *
 * Without it a handle at the extreme sits exactly on the plot's edge, where half its grab tolerance
 * is off the canvas and it becomes awkward to catch.
 */
export const PLOT_MARGIN = 1.08;

/** The smallest half-range the plot will use, so an empty scene still has a usable scale. */
export const MIN_HALF_RANGE = 1.0;

/**
 * How far the plot has to reach, in angstroms, to show the scene and every visible handle.
 *
 * Hidden handles are excluded deliberately. Switching fog off writes a start of 998 and an end of
 * 999, which as offsets are hundreds of angstroms out; if those counted, turning fog off would
 * rescale the plot until the molecule was a speck.
 */
export function plotHalfRange(sceneHalfRange: number, handles: Handle[]): number {
    let needed = Math.abs(sceneHalfRange);
    for (const handle of handles) {
        if (handle.visible) {
            needed = Math.max(needed, Math.abs(handle.offset));
        }
    }
    return Math.max(needed * PLOT_MARGIN, MIN_HALF_RANGE);
}

/** Where an offset falls on the plot, in pixels from its left edge. */
export function pixelOfOffset(offset: number, halfRange: number, width: number): number {
    return width * 0.5 * (1.0 + offset / halfRange);
}

/** What offset a pixel corresponds to. The exact inverse of pixelOfOffset. */
export function offsetOfPixel(pixel: number, halfRange: number, width: number): number {
    return (pixel / (width * 0.5) - 1.0) * halfRange;
}

/** Where a handle is drawn. */
export function pixelOfHandle(handle: Handle, halfRange: number, width: number): number {
    return pixelOfOffset(handle.offset, halfRange, width);
}

/**
 * Which handle a click at this pixel picks up, or null.
 *
 * The nearest one within tolerance, not the first within tolerance. Order used to decide it, so
 * when two handles landed on the same pixel the one later in the list was unreachable for good.
 * Ties still have to break somehow and they break on order, but ties are now only reachable when
 * two handles genuinely hold the same value rather than merely both being off the plot.
 */
export function handleAtPixel(
    pixel: number,
    handles: Handle[],
    halfRange: number,
    width: number,
    tolerance: number = GRAB_TOLERANCE_PX,
): HandleId | null {
    let best: HandleId | null = null;
    let bestDistance = Infinity;

    for (const handle of handles) {
        if (!handle.visible) continue;
        const distance = Math.abs(pixel - pixelOfHandle(handle, halfRange, width));
        if (distance <= tolerance && distance < bestDistance) {
            best = handle.id;
            bestDistance = distance;
        }
    }

    return best;
}

/** Whether a handle is held at the near side of its pair, and so must stay left of its partner. */
export function isNearHandle(id: HandleId): boolean {
    return id === "clipStart" || id === "fogStart";
}

/** The handle a given one must not cross. Depth blur has no partner. */
export function partnerOf(id: HandleId): HandleId | null {
    switch (id) {
        case "clipStart": return "clipEnd";
        case "clipEnd": return "clipStart";
        case "fogStart": return "fogEnd";
        case "fogEnd": return "fogStart";
        default: return null;
    }
}

/**
 * Keep a dragged handle on its own side of its partner.
 *
 * Expressed as a limit on the value rather than as a test on the mouse position. The old guards
 * were "only dispatch if the pointer is past the partner's pixel", which silently did nothing when
 * the partner's pixel was unreachable - the handle appeared grabbable but would not move. A limit
 * always yields a position the handle can take, so a drag always does something, even if that
 * something is to sit against its partner.
 */
export function constrainOffset(
    id: HandleId,
    proposed: number,
    partnerOffset: number,
    halfRange: number,
    width: number,
    minGapPx: number = 2 * GRAB_TOLERANCE_PX,
): number {
    const gap = minGapPx * halfRange / (width * 0.5);
    return isNearHandle(id)
        ? Math.min(proposed, partnerOffset - gap)
        : Math.max(proposed, partnerOffset + gap);
}
