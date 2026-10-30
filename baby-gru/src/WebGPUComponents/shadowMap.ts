/**
 * Shadows in the WebGPU renderer: the light's camera, as GLrender works it out for the shadow
 * pass, and the frame uniforms the shadow pass draws with. Pure: no GPU.
 *
 * GLrender turns the view so the light looks down -z (newQuat = myQuat x rotX), puts the light's
 * eye eyeDistance back from the view centre, and fits an orthographic box to what can be seen
 * (fitShadowFrustum: the visible region, no bigger than the molecules casting). The lit pass then
 * reads the map through TextureMatrix: the light's projection and view, taken to texture space.
 * Same here, with WebGPU's 0..1 depth (which is what WebGL's * 0.5 + 0.5 gives too, so the 0.005
 * bias means the same) and texture rows running down.
 *
 * WebGL's shadow pass also clips with the front clip plane, moved into the light's frame
 * (setMatrixUniforms: clipPlane0 at the camera's front-clip distance in front of the view centre,
 * measured along the light). So what the camera has clipped away in front casts no shadow onto
 * what it shows - without it, helices clipped out of the slab stripe the ribbons below them. Here
 * that plane is the light's near plane, which clips the same fragments for nothing, with the bias
 * scaled so it is still the same distance in angstrom.
 */
import * as mat4 from 'gl-matrix/mat4';
import * as quat from 'gl-matrix/quat';
import { quatToMat4 } from '../WebGLgComponents/quatToMat4.js';
import { DEPTH_MINUS_ONE_TO_ZERO_ONE, slabNearFar } from '../WebGLgComponents/mgWebGLParts/projection';
import { fitShadowFrustum, lightAxes, radiusAbout } from '../WebGLgComponents/shadowFrustum';
import type { DisplayBuffer } from '../WebGLgComponents/displayBuffer';
import { FRAME_FLOATS, type PreviewCameraSource } from './previewScene';

/** The depth-test slack in the lit pass, in 0..1 depth, as triangle-fragment-shader.js's lookup. */
export const SHADOW_BIAS = 0.005;

/** Where the casters are: the atoms of the visible buffers, as shadowCasterBounds finds them. */
export interface CasterBounds {
    min: [number, number, number];
    max: [number, number, number];
}

export interface ShadowCamera {
    /** Column-major, 0..1 depth. */
    projection: Float32Array;
    view: Float32Array;
    /** The light camera's right, up and towards-the-light, in model space (for impostors and line widths). */
    rightDir: [number, number, number];
    upDir: [number, number, number];
    eyeDir: [number, number, number];
    /** Model space to the shadow map: x, y in 0..1 (rows down), z the 0..1 depth. */
    textureMatrix: Float32Array;
    /** The depth-test slack in this map's 0..1 depth: SHADOW_BIAS of WebGL's near-to-far range. */
    bias: number;
}

/**
 * The atoms' box, over visible buffers, cached on the arrays' identity as shadowCasterBounds does
 * (a rebuilt representation brings new arrays). Null when nothing visible has atoms - a map or an
 * imported mesh alone - and the frustum then fits itself to the view.
 */
export function casterBounds(buffers: readonly DisplayBuffer[], cache: { sources: unknown[]; bounds: CasterBounds | null } | null):
    { sources: unknown[]; bounds: CasterBounds | null } {
    const sources = buffers.filter(b => b?.visible && b.atoms && b.atoms.length > 0).map(b => b.atoms);
    if (cache && cache.sources.length === sources.length && cache.sources.every((s, i) => s === sources[i])) return cache;
    const min: [number, number, number] = [Infinity, Infinity, Infinity];
    const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
    for (const atoms of sources) {
        for (const atom of atoms) {
            const p = [atom.x, atom.y, atom.z];
            for (let k = 0; k < 3; k++) {
                if (p[k] < min[k]) min[k] = p[k];
                if (p[k] > max[k]) max[k] = p[k];
            }
        }
    }
    return { sources, bounds: min[0] <= max[0] ? { min, max } : null };
}

/**
 * The light's camera for a view of `aspect` (width / height), as GLrender's calculatingShadowMap
 * branch makes it.
 */
export function shadowCamera(source: PreviewCameraSource, bounds: CasterBounds | null, aspect: number): ShadowCamera {
    // rotX takes the light direction to +z, turning about their cross product.
    const light = [source.light_positions[0], source.light_positions[1], source.light_positions[2]];
    const length = Math.hypot(light[0], light[1], light[2]) || 1;
    const zprime = light.map(c => c / length);
    const dp = zprime[2];
    const rotX = quat.create();
    if (1 - dp > 1e-6) {
        // cross(zprime, (0, 0, 1))
        const axis = [zprime[1], -zprime[0], 0];
        const axisLength = Math.hypot(axis[0], axis[1]) || 1;
        const angle = -Math.acos(Math.max(-1, Math.min(1, dp)));
        const s = Math.sin(angle / 2);
        quat.set(rotX, axis[0] / axisLength * s, axis[1] / axisLength * s, 0, Math.cos(angle / 2));
    }
    const newQuat = quat.multiply(quat.create(), Array.from(source.myQuat) as unknown as quat.quat, rotX);

    const viewCentre: [number, number, number] = [-source.origin[0], -source.origin[1], -source.origin[2]];
    const casterRadius = bounds ? radiusAbout(viewCentre, bounds.min, bounds.max) : 0;
    const slab = slabNearFar(source.gl_clipPlane0[3], source.gl_clipPlane1[3], source.gl_fog_end, !!source.doPerspectiveProjection);
    const slabHalfDepth = Math.max(0, slab.far - slab.near) / 2;
    const visible = {
        halfWidth: 24 * aspect * source.zoom,
        halfHeight: 24 * source.zoom,
        halfDepth: casterRadius > 0 ? Math.min(slabHalfDepth, casterRadius) : slabHalfDepth,
    };
    const frustum = fitShadowFrustum(visible, casterRadius, lightAxes(quatToMat4(rotX) as ArrayLike<number>));

    // The front clip plane along the light, as setMatrixUniforms places it for the shadow pass:
    // fogClipOffset + gl_clipPlane0[3] in front of the view centre, which is eyeDistance from the
    // light's eye. Nearer the eye than that is clipped; never past the far plane.
    const frontClip = source.fogClipOffset + source.gl_clipPlane0[3];
    const near = Math.min(Math.max(frustum.near, frustum.eyeDistance - frontClip), frustum.far - 0.01);
    const bias = SHADOW_BIAS * (frustum.far - frustum.near) / (frustum.far - near);

    // GLrender builds its ortho box multiplied by the zoom scale it applies afterwards; the two
    // cancel, leaving this.
    const projection = mat4.ortho(mat4.create(), -frustum.halfWidth, frustum.halfWidth, -frustum.halfHeight, frustum.halfHeight,
        near, frustum.far);
    mat4.multiply(projection, DEPTH_MINUS_ONE_TO_ZERO_ONE, projection);
    const rotation = quatToMat4(newQuat) as mat4.mat4;
    const view = mat4.create();
    mat4.translate(view, view, [0, 0, -frustum.eyeDistance]);
    mat4.multiply(view, view, rotation);
    mat4.translate(view, view, [source.origin[0], source.origin[1], source.origin[2]]);

    // x, y from -1..1 to 0..1 with y down; z is already 0..1.
    const toTexture = mat4.fromValues(0.5, 0, 0, 0, 0, -0.5, 0, 0, 0, 0, 1, 0, 0.5, 0.5, 0, 1);
    const textureMatrix = mat4.multiply(mat4.create(), toTexture, mat4.multiply(mat4.create(), projection, view));
    // The rotation's rows are the light camera's axes in model space.
    const row = (i: number): [number, number, number] => [rotation[i], rotation[4 + i], rotation[8 + i]];
    return {
        projection: new Float32Array(projection), view: new Float32Array(view),
        rightDir: row(0), upDir: row(1), eyeDir: row(2),
        textureMatrix: new Float32Array(textureMatrix),
        bias,
    };
}

/**
 * The frame uniforms the shadow pass draws with (Frame in previewShaders.ts): the light's camera,
 * its axes for sphere impostors and line widths, and clip planes that clip nothing - the front
 * one is the projection's near plane (shadowCamera), and WebGL's shadow pass tests no back one.
 */
export function shadowFrameUniforms(camera: ShadowCamera, out = new Float32Array(FRAME_FLOATS)): Float32Array {
    out.fill(0);
    out.set(camera.projection, 0);
    out.set(camera.view, 16);
    out.set([...camera.eyeDir, 0], 32);
    out.set([...camera.eyeDir, 0], 36);
    out.set([...camera.rightDir, 0], 60);
    out.set([...camera.upDir, 0], 64);
    out.set([0, 0, 0, 1], 68);
    out.set([0, 0, 0, 1], 72);
    out.set([0, 0, 1, 1], 80);
    return out;
}
