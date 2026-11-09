/**
 * The camera of the clip, fog and blur widget's side-on view (MoorhenSlidersSettings), for the
 * WebGPU renderer: the main view's scene and lights, turned a quarter about the screen's vertical
 * so that the main view's line of sight runs across the widget (its eye on the left), framed
 * orthographically `halfWidth` angstroms either side of the view centre, as the widget's WebGL
 * picture is. Nothing is clipped or fogged and there are no effects: the widget shows the whole
 * scene, with the clip and fog it sets drawn over it.
 */
import * as quat from "gl-matrix/quat";
import type { PreviewCameraSource } from "./previewScene";
import { ORTHO_HALF_HEIGHT } from "../WebGLgComponents/mgWebGLParts/projection";

/**
 * The turn after the main view's: quatToMat4 of the product is the widget's WebGL modelview turn,
 * x to z and z to -x, times the main view's (quatToMat4(a b) = quatToMat4(b) quatToMat4(a)).
 */
export const SIDE_ON_TURN: [number, number, number, number] = [0, Math.SQRT1_2, 0, Math.SQRT1_2];

export function sideOnCamera(main: PreviewCameraSource, halfWidth: number, width: number, height: number): PreviewCameraSource {
    const turned = quat.multiply(quat.create(), Array.from(main.myQuat) as quat.quat, SIDE_ON_TURN);
    // Far enough back that the whole scene is in front of the eye, whichever way it is turned.
    const eyeDistance = Math.max(500, 4 * halfWidth);
    return {
        myQuat: Array.from(turned),
        origin: Array.from(main.origin),
        // The orthographic projection is ORTHO_HALF_HEIGHT x zoom high (and that x the aspect wide).
        zoom: (halfWidth * height) / (ORTHO_HALF_HEIGHT * Math.max(1, width)),
        fogClipOffset: eyeDistance,
        // The slab from just in front of the eye to twice the eye distance; fog beyond it.
        gl_clipPlane0: [0, 0, -1, -0.1],
        gl_clipPlane1: [0, 0, 1, 2 * eyeDistance],
        gl_fog_start: 4 * eyeDistance,
        gl_fog_end: 5 * eyeDistance,
        doPerspectiveProjection: false,
        light_positions: main.light_positions,
        light_colours_ambient: main.light_colours_ambient,
        light_colours_diffuse: main.light_colours_diffuse,
        light_colours_specular: main.light_colours_specular,
        specularPower: main.specularPower,
        background_colour: [0.5, 0.5, 0.5, 1],
        mapLineWidth: main.mapLineWidth,
        // For the hover highlight's size. No depth peeling: transparent surfaces are blended in the
        // order they come, which leaves the main view's peel layers at the main view's size.
        store: main.store,
        doOrderIndependentTransparency: false,
    };
}
