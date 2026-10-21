/**
 * Where to point the shadow camera, and how much to cover with it.
 *
 * A shadow map is a fixed number of texels - 1024 to 4096 square here - spread over whatever area
 * the light's projection covers. Every ångström of that area the viewer cannot see is texels
 * thrown away, and the visible part gets coarser in proportion. So the only question that matters
 * is: what is the smallest box that still produces the right picture?
 *
 * WHAT WENT WRONG BEFORE
 *
 * The old extent was built from the whole structure rather than from the view:
 *
 *     const shadowExtent = Math.max(170.0, atom_span);
 *     let d = Math.min(48*self.zoom, atom_span)
 *     let excess = Math.abs(shadowExtent*tanA);
 *     d += excess;  d /= 2.0;  d = Math.max(d, 60.0)
 *
 * `d` starts out right - `48*zoom` is exactly the visible height - and is then swamped by
 * `excess`, the whole structure's span leaned over by the light angle. With the default light at
 * [25,25,50] that is 0.707 of it. A ribosome contributed about 177 Å of excess to a view perhaps
 * 25 Å across, so most of the map covered geometry nobody was looking at and the shadows in the
 * visible part came out in steps. A small structure escaped it only because the 170 floor was
 * smaller than a large structure's span - which is why the same code looked acceptable on a
 * ligand and poor on a ribosome.
 *
 * WHY THE EXCESS WAS THERE AT ALL
 *
 * It answers a real question: geometry outside the view can still cast into it, so the light must
 * see more than the camera does. The error is in which direction it reached. A caster outside the
 * view matters only if it lies between the light and something visible, so the frustum needs
 * extending **along the light axis** - the near plane pulled back. Widening it sideways, which is
 * what `excess` did, catches no caster the near plane would not, and only spends texels.
 *
 * WHY A BOX FIT IS STABLE HERE
 *
 * Fitting tightly to the visible box would normally make the frustum resize as the camera turns,
 * and a texel grid that keeps resizing under static geometry crawls. It does not happen here,
 * because Moorhen's light is defined in *eye* space - `rotX` is composed onto the view quaternion
 * rather than applied in world space - so the visible box and the light keep a fixed relative
 * orientation however the camera is turned. The fit is therefore both tight and steady.
 */

/** Half-extents of the visible region along the eye-space axes, in ångström. */
export interface VisibleRegion {
    /** Half the width of the screen in world units at the view centre. */
    halfWidth: number;
    /** Half the height. */
    halfHeight: number;
    /** Half the front-to-back thickness of the slab. */
    halfDepth: number;
}

/** The orthographic box to render the shadow map with. All distances in ångström. */
export interface ShadowFrustum {
    /** Half-extent across the shadow map's x axis. */
    halfWidth: number;
    /** Half-extent across its y axis. Kept separate from the width: padding one to match the
     *  other would only make that axis' texels coarser for nothing. */
    halfHeight: number;
    /** How far back from the view centre to put the light's eye. */
    eyeDistance: number;
    /** Near plane, far enough in front of the eye to be positive. */
    near: number;
    /** Far plane, just past the visible region. */
    far: number;
}

/**
 * The near plane's distance in front of the light's eye.
 *
 * Only has to be positive and clear of zero. Nothing is gained by making it small: the depth
 * range that matters runs from the nearest caster to the far side of the visible region, and that
 * is set by the radii, not by this.
 */
export const SHADOW_NEAR = 1.0;

/** Below this the frustum stops shrinking, so a very close view does not sharpen to nothing. */
export const MIN_HALF_EXTENT = 2.0;

/**
 * How far a box of these half-extents reaches along a unit axis.
 *
 * The support function of an axis-aligned box: the furthest corner in that direction is the one
 * whose sign matches the axis in every component, so the absolute values simply add.
 */
const extentAlong = (
    half: VisibleRegion, ax: number, ay: number, az: number,
): number =>
    Math.abs(half.halfWidth * ax)
    + Math.abs(half.halfHeight * ay)
    + Math.abs(half.halfDepth * az);

/**
 * The light-space axes, taken from the rotation that carries eye space into light space.
 *
 * Column-major, as gl-matrix stores a mat4 and as `quatToMat4` returns one. A point is mapped by
 * `p_light = R · p_eye`, so the *rows* of R are the light-space axes written in eye coordinates -
 * row i being (m[i], m[i+4], m[i+8]). Getting this transposed would give a frustum fitted to the
 * wrong axes, which is why it lives in one place with a test on it rather than inline at the call
 * site.
 */
export function lightAxes(
    rotationColumnMajor: ArrayLike<number>,
): [[number, number, number], [number, number, number], [number, number, number]] {
    const m = rotationColumnMajor;
    return [
        [m[0], m[4], m[8]],
        [m[1], m[5], m[9]],
        [m[2], m[6], m[10]],
    ];
}

/**
 * Fit the light's orthographic frustum to what is actually visible.
 *
 * @param visible - the region the camera can see, in eye-space half-extents about the view centre.
 * @param casterRadius - radius of a sphere about the **view centre** containing everything that
 *     could cast a shadow. Used only to pull the near plane back far enough to catch casters
 *     outside the view; it deliberately does not widen the box.
 * @param axes - the light-space axes in eye coordinates, from {@link lightAxes}.
 */
export function fitShadowFrustum(
    visible: VisibleRegion,
    casterRadius: number,
    axes: readonly [readonly number[], readonly number[], readonly number[]],
): ShadowFrustum {
    const half: VisibleRegion = {
        halfWidth: Math.max(0, visible.halfWidth),
        halfHeight: Math.max(0, visible.halfHeight),
        halfDepth: Math.max(0, visible.halfDepth),
    };
    const casters = Math.max(0, casterRadius);

    // How far the visible box reaches along each of the light's three axes.
    const alongX = extentAlong(half, axes[0][0], axes[0][1], axes[0][2]);
    const alongY = extentAlong(half, axes[1][0], axes[1][1], axes[1][2]);
    const alongLight = extentAlong(half, axes[2][0], axes[2][1], axes[2][2]);

    // Never cover more than there is to cover: zoomed out past the structure, the structure is
    // the limit and not the window. A scene with no casters at all falls back to the view.
    const cap = casters > 0 ? casters : Infinity;
    const clamp = (value: number) => Math.max(MIN_HALF_EXTENT, Math.min(value, cap));

    // Far enough back that everything the map has to record is in front of the near plane. Both
    // terms are needed: the casters can reach further than the view, and a scene whose casters
    // all sit near the view centre - meshes with no atoms, so no caster radius at all - would
    // otherwise put the near half of the visible slab behind the eye and clip it away.
    const eyeDistance = Math.max(casters, alongLight) + SHADOW_NEAR;

    return {
        halfWidth: clamp(alongX),
        halfHeight: clamp(alongY),
        eyeDistance,
        near: SHADOW_NEAR,
        // Only the visible region receives shadows, so there is nothing to record beyond its far
        // side. This is what takes the depth range from a fixed 1000 Å down to the scene's own.
        far: eyeDistance + Math.max(MIN_HALF_EXTENT, alongLight),
    };
}

/**
 * Radius of a sphere about `centre` containing the whole box.
 *
 * The box is the scene's bounding box and the centre is the view centre, which is usually not the
 * box's middle - you zoom in on one end of a long structure - so this is the distance to the
 * furthest corner, not half a diagonal.
 */
export function radiusAbout(
    centre: readonly [number, number, number],
    min: readonly [number, number, number],
    max: readonly [number, number, number],
): number {
    let worst = 0;
    for (const x of [min[0], max[0]]) {
        for (const y of [min[1], max[1]]) {
            for (const z of [min[2], max[2]]) {
                const dx = x - centre[0], dy = y - centre[1], dz = z - centre[2];
                worst = Math.max(worst, dx * dx + dy * dy + dz * dz);
            }
        }
    }
    return Math.sqrt(worst);
}

/** The part of the shadow map a soft shadow is rendered into, and how wide its filter is. */
export interface ShadowMapRegion {
    /** Texels used across the map's x axis, from its left edge. */
    width: number;
    /** Texels used up its y axis, from its bottom edge. */
    height: number;
    /** Filter radius in texels of the region. 0 for a hard edge. */
    radiusTexels: number;
}

/**
 * The softest shadow offered, in angstrom.
 *
 * Past this the penumbra is wider than the gaps between atoms, so it smears neighbouring shadows
 * together rather than softening any edge, and the map it calls for is coarse enough to lose
 * small casters outright. Found by eye.
 */
export const MAX_SHADOW_SOFTNESS = 1;

/** Below this a filter cannot hide the staircase of the texels it reads. */
export const MIN_SOFT_RADIUS_TEXELS = 1.5;

/**
 * How much of the shadow map a soft shadow needs, so that its filter is always the same few texels.
 *
 * A filter wide in texels costs taps; one narrow in texels shows the map's staircase through the
 * blur. But a blurred shadow has no use for detail finer than its blur, so instead of widening the
 * filter as the softness grows in texels, the map is rendered coarser until the softness is
 * `targetTexels` again. The shadow pass draws into the corner of the texture this returns, which
 * also makes it cheaper; nothing is reallocated. The texels stay square in angstrom whatever the
 * frustum's aspect, so the penumbra comes out round.
 *
 * Zoomed out, the softness can be under `targetTexels` even at the map's full size. The map then
 * stays full size and the radius goes as low as {@link MIN_SOFT_RADIUS_TEXELS} - a texel is a few
 * screen pixels at that zoom, so the edge is still smooth on screen.
 *
 * @param softness - penumbra radius in angstrom. 0 or less leaves the map whole and hard.
 * @param mapSize - texels along each side of the square shadow texture.
 * @param targetTexels - the filter radius, in texels, to aim for.
 */
export function softShadowRegion(
    frustum: Pick<ShadowFrustum, "halfWidth" | "halfHeight">,
    softness: number,
    mapSize: number,
    targetTexels: number,
): ShadowMapRegion {
    if (!(softness > 0) || !(mapSize > 0)) return { width: mapSize, height: mapSize, radiusTexels: 0 };
    const spanX = 2 * frustum.halfWidth, spanY = 2 * frustum.halfHeight;
    // Never finer than the full map allows on its coarser axis, or that axis would run out of map.
    const texel = Math.max(softness / targetTexels, Math.max(spanX, spanY) / mapSize);
    return {
        width: Math.min(mapSize, Math.max(1, Math.ceil(spanX / texel))),
        height: Math.min(mapSize, Math.max(1, Math.ceil(spanY / texel))),
        radiusTexels: Math.max(MIN_SOFT_RADIUS_TEXELS, softness / texel),
    };
}
