/**
 * The slab, in the renderer's terms and in the camera's.
 *
 * TWO CONVENTIONS, AND WHY THERE WERE EVER TWO
 *
 * The camera holds four offsets from the view centre: how far in front the front clip plane sits,
 * how far behind the back one does, and the same two for fog. Four numbers, one origin, one sign
 * convention.
 *
 * The renderer holds the same slab as four absolute distances measured from the eye, because that
 * is what the shaders want - `gl_fog_start` goes straight into a uniform, and the clip plane W
 * components are the planes' distances from the eye along the view axis. Those are the right values
 * *at the point of drawing* and the wrong values to keep state in, because every one of them moves
 * when the eye moves even though the slab has not.
 *
 * That is the whole reason this file exists. Translate at the boundary, keep the offsets inside.
 *
 * THE ARITHMETIC, READ OFF THE CODE IT REPLACES
 *
 *     set_clip_range(clipStart, clipEnd):
 *         gl_clipPlane0[3] = -eyeDistance - clipStart       and callers pass -clipFront
 *         gl_clipPlane1[3] =  eyeDistance + clipEnd                          clipBack
 *
 *     the fog, which was already absolute:
 *         gl_fog_start     =  eyeDistance - fogFront
 *         gl_fog_end       =  eyeDistance + fogBack
 *
 * Checked against the values MGWebGL opens with - an eye at 250, clip planes at -0.0 and 1000, fog
 * 250 to 1250 - which come back as clipFront 250, clipBack 750, fogFront 0, fogBack 1000.
 */

import type { CameraState } from "./cameraController";

/** The slab as the renderer and its shaders want it: absolute distances from the eye. */
export interface RendererSlab {
    /** gl_clipPlane0[3] - the front plane, negated, as the shader's plane equation wants it. */
    clipPlane0W: number;
    /** gl_clipPlane1[3] - the back plane. */
    clipPlane1W: number;
    /** gl_fog_start. */
    fogStart: number;
    /** gl_fog_end. */
    fogEnd: number;
}

/** Just the parts of the camera the slab depends on. */
export type SlabSource = Pick<CameraState, "eyeDistance" | "clipFront" | "clipBack" | "fogFront" | "fogBack">;

/** What the renderer should be holding, given where the camera is. */
export function slabFromCamera(camera: SlabSource): RendererSlab {
    return {
        clipPlane0W: -camera.eyeDistance + camera.clipFront,
        clipPlane1W: camera.eyeDistance + camera.clipBack,
        fogStart: camera.eyeDistance - camera.fogFront,
        fogEnd: camera.eyeDistance + camera.fogBack,
    };
}

/**
 * The inverse, for the setters that still speak the old language.
 *
 * `set_clip_range` takes the front distance negated, which is how it has always been called - the
 * session format stores it negated too, and the two negations cancelled, which is why nobody
 * noticed. Here it is undone once, in the open.
 */
export function clipOffsets(clipStart: number, clipEnd: number): Pick<CameraState, "clipFront" | "clipBack"> {
    return { clipFront: -clipStart, clipBack: clipEnd };
}

/** The inverse for fog, which the renderer measures from the eye. */
export function fogOffsets(eyeDistance: number, fogStart: number, fogEnd: number): Pick<CameraState, "fogFront" | "fogBack"> {
    return { fogFront: eyeDistance - fogStart, fogBack: fogEnd - eyeDistance };
}
