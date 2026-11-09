/**
 * Fading an object in and out, cheaply.
 *
 * A movie fades a molecule by changing one number per frame. The existing way to make a
 * representation less than solid - MoorhenMoleculeRepresentation.setNonCustomOpacity - walks every
 * vertex of every buffer rewriting the alpha channel and then re-uploads them all to the GPU. That
 * is fine for a slider somebody drags now and then. Sixty times a second on a large molecule it is
 * the opposite of what this renderer is for.
 *
 * So a fade is a uniform instead: one float per buffer, multiplied into the fragment alpha. The
 * geometry never changes, nothing is re-uploaded, and the cost is a `uniform1f` per draw.
 *
 * WHAT THIS MODULE IS
 *
 * The decisions that follow from that number, kept apart from the GL calls so they can be reasoned
 * about and tested without a context. Three questions get asked of every buffer every frame, and
 * each has a wrong answer that looks like a different bug.
 */

/**
 * Above this, an object is solid.
 *
 * Not 1.0: a fade driven by interpolation arrives at 0.999999 and would otherwise be routed
 * through the transparency machinery for the rest of the movie, paying for depth peeling to
 * achieve nothing. The same threshold the vertex-colour path already uses for the same reason.
 */
export const OPAQUE_ABOVE = 0.99;

/**
 * Below this, an object is not drawn at all.
 *
 * A buffer at zero alpha still costs a full pass through the vertex shader, the rasteriser and -
 * because it counts as transparent - a depth-peeling layer, all to contribute nothing. Skipping it
 * is the difference between a movie that fades four molecules out and then runs at full speed, and
 * one that carries their cost to the end.
 */
export const INVISIBLE_BELOW = 1 / 512;

/** Anything with a fade applied, whether or not its own colours were transparent. */
export const isFaded = (alphaMultiplier: number): boolean => alphaMultiplier < OPAQUE_ABOVE;

/** Not worth drawing. */
export const isInvisible = (alphaMultiplier: number): boolean => alphaMultiplier < INVISIBLE_BELOW;

/**
 * Whether a buffer should be drawn at all in a pass that renders geometry.
 *
 * Separate from visibility, which is the user's choice about what the scene contains. This is the
 * movie's choice about what is on screen at this instant.
 */
export const shouldDraw = (visible: boolean, alphaMultiplier: number): boolean =>
    visible && !isInvisible(alphaMultiplier);

/**
 * Whether a buffer should write into the shadow map.
 *
 * Nothing see-through should, whether it is see-through because a movie is fading it or because
 * its own colours are. A half-transparent object casting a solid shadow is the most obvious way
 * to make a fade look wrong, and the same is true of a glass-like surface: light passes through
 * it, so it should not darken what is behind it.
 *
 * THIS FIXED AN OLDER BUG THAN THE FADE
 *
 * `doPeel` is decided once per frame, before the shadow pass, and is true whenever anything
 * visible is transparent. The shadow pass skipped transparent geometry only when peeling was off -
 * so the moment a transparent surface appeared anywhere in the scene, that surface was rendered
 * into the shadow map and everything inside it went into shadow. Switching on a molecular surface
 * made the ribbons underneath look like they had stopped casting shadows, when in truth they were
 * casting into a shadow that already covered them.
 */
export const shouldCastShadow = (
    visible: boolean, alphaMultiplier: number, transparent = false,
): boolean => visible && !transparent && !isFaded(alphaMultiplier);

/** Keep a fade inside the range the shader expects, whatever an interpolator produced. */
export const clampFade = (alphaMultiplier: number): number =>
    Number.isFinite(alphaMultiplier) ? Math.min(1, Math.max(0, alphaMultiplier)) : 1;
