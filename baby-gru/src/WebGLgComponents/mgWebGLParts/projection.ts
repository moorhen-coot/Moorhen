import * as mat4 from 'gl-matrix/mat4';
import { quatToMat4 } from '../quatToMat4.js';

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

/** How close and how far the eye may be placed from the view centre, in angstroms. */
export const MIN_EYE_DISTANCE = 50.0;
export const MAX_EYE_DISTANCE = 1000.0;

/**
 * The divisor applied to the perspective projection's x and y scale.
 *
 * Long carried as an unexplained 5.7. It is the number that makes a perspective view frame the
 * same thing an orthographic one does at the view centre:
 *
 *     eyeDistance * tan(PERSPECTIVE_FOV / 2) / ORTHO_HALF_HEIGHT
 *
 * which at the historical eye distance of 250 gives 5.690.
 *
 * It takes the eye distance rather than a constant because that distance is what sets how strongly
 * a perspective view converges, and it is adjustable. Deriving the divisor from it holds the
 * framing still at the view centre while the convergence changes - a dolly zoom. With the divisor
 * fixed instead, moving the eye would simply rescale the picture.
 *
 * Note what this is *not*: a field-of-view control. At a fixed eye distance with the framing held,
 * the field of view cancels out of the projection entirely - the tan in mat4.perspective against
 * the tan here - and changing it does nothing whatsoever. Only the eye distance moves the
 * geometry, which is why PERSPECTIVE_FOV stays a constant.
 */
export const perspectiveScale = (eyeDistance: number): number =>
    eyeDistance * Math.tan(PERSPECTIVE_FOV / 2) / ORTHO_HALF_HEIGHT;

/** What perspectiveScale was fixed at before the field of view could be changed. */
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
 * @param eyeDistance  the distance the two projections are made to agree at
 */
export const pickHalfExtents = (
    depth: number,
    zoom: number,
    aspect: number,
    perspective: boolean,
    eyeDistance: number = 250,
): { halfWidth: number, halfHeight: number } => {
    const halfHeight = perspective
        ? depth * Math.tan(PERSPECTIVE_FOV / 2) * zoom / perspectiveScale(eyeDistance)
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
 * The clip plane w values after the eye has moved by `delta` towards or away from the scene.
 *
 * set_clip_range stores the planes as absolute distances from the eye, so moving the eye without
 * moving them leaves the slab behind and slices the molecule open. Shifting both by the same amount
 * keeps the slab where it was relative to the view centre, which is where the user put it.
 */
export const clipPlanesAfterEyeMove = (
    clipPlane0W: number,
    clipPlane1W: number,
    delta: number,
): { clipPlane0W: number; clipPlane1W: number } =>
    ({ clipPlane0W: clipPlane0W - delta, clipPlane1W: clipPlane1W + delta });

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

/**
 * The depth-buffer value a focal plane given in angstroms corresponds to.
 *
 * The blur shaders sample the depth buffer and compare against this, so it has to be in the
 * buffer's own terms - and those differ between the two projections.
 *
 * Orthographic writes depth linearly across the slab, so the fraction of the distance is the
 * answer. Perspective divides by distance, so equal steps in angstroms are not equal steps in the
 * buffer: it spends most of its range close to the near plane. The exact relation for the matrix
 * gl-matrix builds is
 *
 *     z = far * (d - near) / (d * (far - near))
 *
 * which is 0 at the near plane and 1 at the far one, as the linear form is, but bows between them.
 * Sending the linear fraction under perspective put the plane a few angstroms nearer the viewer
 * than asked - about 3 angstroms out of a 60 angstrom slab, worst around the middle where people
 * actually put it.
 *
 * `offset` is measured from the view centre, which sits at fogClipOffset from the eye because the
 * modelview matrix is translated by -fogClipOffset before anything is drawn.
 */
export const focalPlaneDepth = (
    offset: number,
    near: number,
    far: number,
    fogClipOffset: number,
    perspective: boolean,
): number => {
    const span = far - near;
    if (Math.abs(span) < 1e-9) return 0.5;

    const distance = fogClipOffset + offset;
    if (!perspective) return Math.min(1.0, Math.max(0.0, (distance - near) / span));

    // Behind the eye, or on it, has no perspective depth. Everything drawn is in front of the
    // near plane anyway, so the front of the buffer is the honest answer.
    if (!(distance > 1e-6)) return 0.0;
    return Math.min(1.0, Math.max(0.0, (far * (distance - near)) / (distance * span)));
};

/**
 * Everything the camera matrices for one view depend on, as plain values.
 *
 * GLrender used to build its projection and modelview inline, reading all of this off the
 * renderer and interleaved with framebuffer and shader setup. Gathering it here means a second
 * renderer (a WebGPU canvas, say) can produce exactly the matrices WebGL does from the same
 * camera, without an MGWebGL to read them from - and drawCore's cameraFrame() is the one place
 * that says how the WebGL renderer's fields map onto it.
 */
export interface CameraFrame {
    /** The view rotation, as MGWebGL.myQuat. Turned into a matrix by quatToMat4, the transpose of mat4.fromQuat. */
    quat: ArrayLike<number>;
    /** The translation applied to the modelview, as MGWebGL.origin. The view centre is its negation. */
    origin: ArrayLike<number>;
    zoom: number;
    /** Eye to view centre, in angstroms. MGWebGL.fogClipOffset. */
    eyeDistance: number;
    /** w of the front clip plane (0,0,-1,w). MGWebGL.gl_clipPlane0[3]. */
    clipPlane0W: number;
    /** w of the back clip plane (0,0,1,w). MGWebGL.gl_clipPlane1[3]. */
    clipPlane1W: number;
    /** MGWebGL.gl_fog_end. Fog cuts geometry off no later than the back plane does. */
    fogEnd: number;
    perspective: boolean;
    /** The viewport this view draws into, [x, y, width, height]. MGWebGL.currentViewport. */
    viewport: ArrayLike<number>;
    /**
     * Width over height of the whole drawing area, times any multi-view ratioMult: GLrender's
     * `ratio`. The orthographic path frames with this; the perspective path uses the viewport.
     */
    aspect: number;
    /**
     * Set when rendering to an offscreen capture buffer (MGWebGL.renderToTexture). That path
     * renders into a square buffer and takeScreenShot crops an aspect-correct band out of it
     * afterwards, so it frames differently and the two halves only make sense together.
     */
    offscreen?: {
        /** gl.viewportWidth > gl.viewportHeight */
        canvasLandscape: boolean;
        /** Side-by-side or cross-eyed stereo, three-way or multiview: the canvas is divided. */
        dividedView: boolean;
    };
}

/**
 * The projection for a frame before the zoom is applied: a fixed half-height of 24 at zoom 1,
 * with the slab as its near and far planes. Written into `out`, which is returned.
 *
 * Moved from GLrender without change. The comments that went with each branch came too.
 */
export function baseProjection(out: mat4.mat4, frame: CameraFrame): mat4.mat4 {
    const { clipPlane0W, clipPlane1W, fogEnd, perspective, viewport, aspect: ratio } = frame;
    if (frame.offscreen) {
        //FIXME - drawingGBuffers stanza?
        //
        // The square extents below are deliberate and are half of a pair: this renders
        // into a square buffer and takeScreenShot afterwards crops an aspect-correct band
        // out of it. Neither half makes sense alone - give this projection a non-square
        // buffer and the picture comes out stretched.
        if (perspective) {
            // Aspect stays at 1.0. Measured, not derived: it is right on screen for both
            // plain and side-by-side capture, and deriving the aspect from the capture
            // viewport instead - (viewport * framebuffer / canvas), which gives 0.5 per
            // eye - visibly stretched the stereo screenshot. The arithmetic for that
            // viewport is not in dispute, so something downstream is already accounting
            // for it - the perspMult zoom applied to this matrix by zoomScaleFor. Captures
            // were checked by eye afterwards, plain and side-by-side stereo, and both
            // frame correctly as they stand. The pair works; leave it alone.
            //
            // The near and far are a separate matter and do come from the slab: they
            // clip, they do not frame, so they cannot affect any of the above.
            const slab = slabNearFar(clipPlane0W, clipPlane1W, fogEnd, true);
            return mat4.perspective(out, PERSPECTIVE_FOV, 1.0, slab.near, slab.far);
        }
        const { near, far } = slabNearFar(clipPlane0W, clipPlane1W, fogEnd, false);
        const divided = frame.offscreen.dividedView;
        if (viewport[2] > viewport[3]) {
            if (divided) {
                return mat4.ortho(out, -24 * ratio, 24 * ratio, -24, 24, near, far);
            }
            return mat4.ortho(out, -24 * ratio, 24 * ratio, -24 * ratio, 24 * ratio, near, far);
        }
        const fbScale = divided ? viewport[2] / viewport[3] : 1.0;
        return mat4.ortho(out, -24 * fbScale, 24 * fbScale, -24, 24, near, far);
    }
    if (perspective) {
        // Two fixes in one line. The aspect came from the canvas rather than the
        // viewport, so every mode that divides the canvas - side-by-side and
        // cross-eyed stereo, three-way, multiview - was drawn stretched by exactly
        // the factor the viewport had been divided by. And the near and far were
        // fixed at 100 and 1270, so the slab was enforced only by the fragment
        // discards, which cost the program its early depth rejection and spread the
        // depth buffer over ten times the range the geometry occupies.
        const slab = slabNearFar(clipPlane0W, clipPlane1W, fogEnd, true);
        return mat4.perspective(out, PERSPECTIVE_FOV, viewportAspect(viewport), slab.near, slab.far);
    }
    const slab = slabNearFar(clipPlane0W, clipPlane1W, fogEnd, false);
    return mat4.ortho(out, -24 * ratio, 24 * ratio, -24, 24, slab.near, slab.far);
}

/**
 * The x and y scale applied to the projection after baseProjection, which is what the zoom does.
 *
 * The 1/aspect for landscape offscreen capture pairs with the aspect of 1.0 that path uses. The
 * perspective factor is derived from the eye distance rather than fixed at 5.7, so moving the eye
 * changes how strongly the view converges while the framing stays put - see perspectiveScale.
 *
 * Note for merging shadow_fix: its drawCore helper projectionZoomScale(self, ratio) computes the
 * same number and can become zoomScaleFor(cameraFrame(self, ratio)).
 */
export function zoomScaleFor(frame: CameraFrame): number {
    if (frame.perspective) {
        const perspMult = frame.offscreen?.canvasLandscape ? 1.0 / frame.aspect : 1.0;
        return perspMult * perspectiveScale(frame.eyeDistance) / frame.zoom;
    }
    return 1.0 / frame.zoom;
}

/**
 * Takes a projection from the [-1, 1] clip depth WebGL uses to the [0, 1] that WebGPU (and Metal,
 * D3D and Vulkan) use. x, y and w are untouched, so the framing is identical.
 */
export const DEPTH_MINUS_ONE_TO_ZERO_ONE: mat4.mat4 = mat4.fromValues(
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 0.5, 0,
    0, 0, 0.5, 1,
);

export type ClipDepthRange = "minusOneToOne" | "zeroToOne";

/**
 * The complete camera for a frame: the projection, and the modelview that takes world
 * coordinates to eye space.
 *
 * This is what GLrender ends up with for an ordinary (non-shadow) view, composed in the same
 * order: view = T(0,0,-eyeDistance) . R(quat) . T(origin), and projection = baseProjection scaled
 * in x and y by zoomScaleFor. GLrender still composes the view step by step, because the shadow
 * pass shares that tail with its own frustum and light rotation; it calls baseProjection and
 * zoomScaleFor for the parts that are not shadow-specific. A change to the order there must be
 * made here too.
 *
 * @param depthRange  "zeroToOne" for a WebGPU renderer. The default matches WebGL.
 */
export function viewProjection(
    frame: CameraFrame,
    depthRange: ClipDepthRange = "minusOneToOne",
): { projection: mat4.mat4; view: mat4.mat4 } {
    const projection = baseProjection(mat4.create(), frame);
    const s = zoomScaleFor(frame);
    mat4.scale(projection, projection, [s, s, 1.0]);
    if (depthRange === "zeroToOne") {
        mat4.multiply(projection, DEPTH_MINUS_ONE_TO_ZERO_ONE, projection);
    }

    const view = mat4.create();
    mat4.translate(view, view, [0, 0, -frame.eyeDistance]);
    mat4.multiply(view, view, quatToMat4(frame.quat));
    mat4.translate(view, view, [frame.origin[0], frame.origin[1], frame.origin[2]]);
    return { projection, view };
}
