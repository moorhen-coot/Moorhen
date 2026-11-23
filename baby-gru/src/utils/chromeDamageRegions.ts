/**
 * The largest scale_length_fac the scale bar's arithmetic can produce.
 *
 * Derived, not guessed: the factor starts in (0.1, 1], doubles when under 0.5, and is then
 * multiplied by 2.5 when still under 0.5, so the worst case is a start just below 0.25 going to
 * just below 5 x 0.25.
 */
const MAX_SCALE_LENGTH_FACTOR = 1.25

/** A rectangle to clear, in CSS pixels. */
export type DamageRegion = { x: number; y: number; w: number; h: number }

/**
 * Conservative boxes covering the chrome drawn on layer 4 - axes, scale bar, crosshair.
 *
 * These canvases are software surfaces in Firefox, so clearing one costs a full-screen CPU fill and
 * then a copy and format conversion up to the compositor. The axes have to be redrawn whenever the
 * view rotates, which during a spin is every frame, and they occupy about 80 pixels in a corner of
 * a four megapixel canvas. Clearing only where something is drawn turns that from a whole-canvas
 * operation into three small ones.
 *
 * Returns null for the stereo, three-way and multi-view layouts, where the axes are repeated at
 * positions derived from a grid. Those are perfectly boundable too, but getting one of them wrong
 * leaves smeared trails on screen, and the common case is worth having without that risk.
 *
 * The numbers mirror the drawing code above and are padded. If a box is too small the old pixels
 * are not cleared and the drawing accumulates frame on frame, so every margin here errs outward.
 */
export const chromeDamageRegions = (
    width: number,
    height: number,
    scale: number,
    opts: { drawAxes: boolean; drawScaleBar: boolean; drawCrosshairs: boolean; simpleLayout: boolean },
): DamageRegion[] | null => {

    if(!opts.simpleLayout) return null

    // Clipped to the canvas. clearRect would ignore the overhang anyway, but a box that claims
    // area outside the surface makes the regions misleading to reason about and to test - the
    // scale bar's label and the axes gizmo both run past the right edge on a narrow window.
    const regions: DamageRegion[] = []
    const add = (x: number, y: number, w: number, h: number) => {
        const left = Math.max(0, x)
        const top = Math.max(0, y)
        const right = Math.min(width, x + w)
        const bottom = Math.min(height, y + h)
        if(right > left && bottom > top) regions.push({ x: left, y: top, w: right - left, h: bottom - top })
    }

    if(opts.drawCrosshairs){
        // Arms reach 5 either way, with a 1px stroke.
        const reach = 12
        add(width*0.5 - reach, height*0.5 - reach, 2*reach, 2*reach)
    }

    if(opts.drawScaleBar){
        // The bar ends at width - 60*scale and grows leftwards by l * scale_length_fac, where
        // l = 0.21*width. The factor is not bounded by 1: it starts as scale_pow/scale_fac in
        // (0.1, 1], is doubled when below 0.5, and then multiplied by 2.5 if it is *still* below
        // 0.5 - so a starting value just under 0.25 comes out just under 1.25. Reading 0.21*width
        // off the code and stopping there left 5% of the width uncleared at some zoom levels,
        // which is exactly the trail of old tick marks it produced.
        const end = width - 60*scale
        const vpos = 30*scale
        const left = end - 0.21*width*MAX_SCALE_LENGTH_FACTOR - 16*scale
        // Rightwards to the canvas edge rather than a guess at the label's width. scale_pow is
        // multiplied by 2 and 2.5 alongside the factor, so it can print as anything from "0.2" to
        // a float with a long tail, and this costs 60*scale of extra clearing to not care.
        add(left, height - vpos - 32*scale, width - left, 64*scale)
    }

    if(opts.drawAxes){
        // base at (width*0.92, height*0.125); arrows reach 40*scale, labels 5*scale beyond that,
        // drawn in a 22*scale font.
        const baseX = width*0.92
        const baseY = height*0.125
        const reach = 40*scale + 5*scale + 30*scale
        add(baseX - reach, baseY - reach, 2*reach, 2*reach)
    }

    return regions
}

/**
 * What a partial clear has to cover: where the chrome is going, and where it was.
 *
 * Clearing only the boxes for this frame is not enough. Switch the axes off and their box simply
 * leaves the list - nothing then clears it, and the drawing code has nothing to draw over it with,
 * so the gizmo stays on screen. The same goes for any one item being turned off while others stay.
 *
 * Returns null when a full clear is needed: either side being null means the layout changed into or
 * out of stereo or multi-view, where the boxes are not known.
 */
export const regionsToClear = (
    previous: DamageRegion[] | null,
    current: DamageRegion[] | null,
): DamageRegion[] | null => {
    if(previous === null || current === null) return null
    return [...previous, ...current]
}
