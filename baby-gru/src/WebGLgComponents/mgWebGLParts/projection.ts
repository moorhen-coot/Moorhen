/**
 * Turning the view slab into projection near and far planes.
 *
 * Moorhen's front and back clipping is a depth slab, expressed as two view-aligned planes
 * (0,0,-1,d0) and (0,0,1,d1) in eye space. A fragment is kept when
 *
 *     dot(eyePos, clipPlane0) >= 0   i.e.   z <= d0
 *     dot(eyePos, clipPlane1) >= 0   i.e.   z >= -d1
 *
 * which is simply the range -d1 <= z <= d0. gl-matrix's ortho and perspective both make eye z
 * visible over [-far, -near], so that range is near = -d0, far = d1 - the slab IS the near and
 * far planes, and nothing in a fragment shader needs to re-derive it.
 *
 * The orthographic path has always done this. The perspective path did not: it used a fixed
 * near 100 / far 1270 and left the slab entirely to per-fragment discards, which cost the whole
 * program its early depth rejection and gave the depth buffer a range ten times wider than the
 * geometry needed.
 *
 * The one real difference between the two is that a perspective near plane must be strictly
 * positive - the projection divides by it - while an orthographic one may sit anywhere,
 * including behind the eye. So perspective can be forced to clamp, and when it does the
 * projection no longer describes the slab and the shader discards become load-bearing again.
 * That is what `exact` reports: callers use it to decide whether the discard-free shaders are
 * safe, rather than assuming they always are.
 */

/**
 * Smallest perspective near plane we will ask for.
 *
 * Only reached when the user pulls the front clip to or behind the eye point, which is a
 * degenerate view rather than a normal one. Depth precision in a perspective projection is
 * governed by the near plane, so a very small value here would spend most of the depth buffer
 * on the first few units; it is a floor to keep the matrix valid, not a value to aim for, and
 * reaching it sets `exact` to false.
 */
export const MIN_PERSPECTIVE_NEAR = 1.0;

export interface SlabRange {
    near: number;
    far: number;
    /**
     * Whether near and far describe the slab exactly.
     *
     * False when the values had to be adjusted to keep the projection valid. The picture is
     * still correct in that case - the shader discards enforce the slab - but it is no longer
     * true that the hardware alone clips it, so the discard-free shader variants must not be
     * used.
     */
    exact: boolean;
}

/**
 * Near and far for the current slab.
 *
 * @param clipPlane0W  the w component of the front plane, (0,0,-1,w)
 * @param clipPlane1W  the w component of the back plane, (0,0,1,w)
 * @param fogEnd       fog cuts geometry off no later than the back plane does, and the
 *                     orthographic path has always taken the nearer of the two
 * @param perspective  whether the projection divides by the near plane
 */
export const slabNearFar = (
    clipPlane0W: number,
    clipPlane1W: number,
    fogEnd: number,
    perspective: boolean,
): SlabRange => {
    const wantedNear = -clipPlane0W;
    const wantedFar = Math.min(clipPlane1W, fogEnd);

    if (!perspective) {
        // Orthographic takes the slab as it stands. A near behind the eye, or a far nearer than
        // the near, are both representable; the latter produces an empty view, which is the
        // honest rendering of a slab with nothing in it.
        return { near: wantedNear, far: wantedFar, exact: true };
    }

    const near = Math.max(MIN_PERSPECTIVE_NEAR, wantedNear);
    // A far at or behind the near would make the projection singular. Keeping it strictly
    // greater costs nothing: the slab is empty either way, and the alternative is a matrix full
    // of infinities that takes the whole scene with it.
    const far = Math.max(near + MIN_PERSPECTIVE_NEAR, wantedFar);
    return { near, far, exact: near === wantedNear && far === wantedFar };
};

/** Half the orthographic view height at zoom 1, in world units. Matches the mat4.ortho extents. */
export const ORTHO_HALF_HEIGHT = 24.0;

/** The perspective field of view Moorhen uses, in radians. */
export const PERSPECTIVE_FOV = 1.0;

/**
 * The divisor applied to the perspective projection's x and y scale.
 *
 * Long carried as an unexplained 5.7, with a comment asking what justified it. It is the
 * constant that makes a perspective view frame the same thing an orthographic one does at the
 * view centre: at a distance of fogClipOffset (250),
 *
 *     250 * tan(PERSPECTIVE_FOV / 2) / ORTHO_HALF_HEIGHT  =  5.690
 *
 * so the two agree where the molecule sits and diverge either side of it, which is exactly what
 * switching projection should look like. Kept at the value the renderer has always used rather
 * than sharpened to the derived one, since changing it would move every perspective view very
 * slightly for no benefit.
 */
export const PERSPECTIVE_SCALE = 5.7;

/**
 * Half the view extents at a given depth, for turning a cursor position into a world ray.
 *
 * Orthographic extents do not depend on depth, which is why the picking code could get away with
 * a single pair of numbers for years. Perspective extents grow with distance from the eye, so a
 * ray built from one pair is wrong everywhere except the depth that pair happened to describe -
 * and picking, hover, measurement and gizmo dragging all build their ray this way.
 *
 * @param depth  distance in front of the eye, i.e. fogClipOffset plus the slab offset
 */
export const pickHalfExtents = (
    depth: number,
    zoom: number,
    aspect: number,
    perspective: boolean,
): { halfWidth: number, halfHeight: number } => {
    const halfHeight = perspective
        ? depth * Math.tan(PERSPECTIVE_FOV / 2) * zoom / PERSPECTIVE_SCALE
        : ORTHO_HALF_HEIGHT * zoom;
    return { halfWidth: halfHeight * aspect, halfHeight };
};

/**
 * The aspect ratio a projection should use, from the viewport it will actually draw into.
 *
 * Not the canvas. In side-by-side stereo each eye draws into half the width, and in three-way
 * or multiview into a tile, so a projection built from the canvas is stretched by exactly the
 * factor the viewport was divided by. The orthographic path got this right by folding
 * `ratioMult` into its extents; the perspective path used `gl.viewportWidth / gl.viewportHeight`
 * and so was wrong in every mode except plain single-view.
 *
 * @param viewport  as GL takes it: [x, y, width, height]
 */
export const viewportAspect = (viewport: ArrayLike<number> | null | undefined): number => {
    const width = viewport?.[2] ?? 0;
    const height = viewport?.[3] ?? 0;
    // A zero-height viewport happens while a pane is being dragged closed. Returning 1 keeps the
    // matrix finite for the frame or two before the layout settles.
    if (!(width > 0) || !(height > 0)) return 1.0;
    return width / height;
};

/**
 * The clip slab expressed as offsets from the view centre, negative towards the viewer.
 *
 * slabNearFar returns distances from the eye, which is what a projection matrix wants. Anything
 * positioned relative to what the user is looking at - the focal plane, the side-on widget's
 * handles - wants them relative to the centre of the view instead. Both ends are the same
 * subtraction; neither is negated.
 *
 * The negation is worth warning about, because the obvious reading of the code says otherwise.
 * set_clip_range stores `gl_clipPlane0[3] = -fogClipOffset - clipStart`, which looks as though a
 * larger clipStart pushes the near plane further away. It does not: MoorhenWebMG calls it as
 * `set_clip_range(-clipStart, clipEnd)`, negating the near distance on the way in. So the stored w
 * is `-fogClipOffset + clipStart`, slabNearFar's near is `fogClipOffset - clipStart`, and the near
 * plane sits clipStart *in front of* the centre - which is what the side-on widget has always
 * drawn and what execAutoClipFogByZoom means by setting clip and fog from one fieldDepthFront.
 */
export const slabOffsets = (near: number, far: number, fogClipOffset: number): {
    nearOffset: number;
    farOffset: number;
} => ({ nearOffset: near - fogClipOffset, farOffset: far - fogClipOffset });

/**
 * Where a focal plane given in angstroms falls as a fraction of the slab, 0 at the near plane and
 * 1 at the far one.
 *
 * This is the one conversion the depth blur needs, and it runs in a single direction: the stored
 * setting is a distance, and the shaders want a depth-buffer value, so the renderer converts.
 *
 * The setting is a distance rather than a fraction because a fraction needs something to be a
 * fraction of, and nothing on offer is stable. It was once a fraction of the side-on widget's
 * plot, which moved whenever that widget's scale did. Making it a fraction of the slab instead
 * only moved the problem: switching Clip off sets the slab to 1.5 * the scene span in each
 * direction, so the whole useful range of the control collapsed into a few percent near the
 * middle, and a value saved with Clip on meant something else entirely with Clip off.
 *
 * An angstrom is an angstrom under every one of those.
 */
export const focalPlaneFraction = (
    offset: number,
    nearOffset: number,
    farOffset: number,
): number => {
    const span = farOffset - nearOffset;
    // A slab of no depth has no meaningful fraction; the middle keeps the blur from flipping to
    // all-or-nothing on a degenerate frame.
    if (Math.abs(span) < 1e-9) return 0.5;
    return Math.min(1.0, Math.max(0.0, (offset - nearOffset) / span));
};
