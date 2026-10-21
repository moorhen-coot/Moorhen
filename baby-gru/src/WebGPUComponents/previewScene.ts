/**
 * The parts of the WebGPU preview that do not need a GPU: deciding what in the scene it can draw,
 * and packing the per-frame uniforms.
 *
 * The preview reads the same DisplayBuffers the WebGL renderer does, from the store, and the same
 * camera, from the WebGL renderer's fields. It draws TRIANGLES sub-buffers only, instanced or not,
 * lit and fogged the way triangle-fragment-shader.js does it. Everything else is counted and
 * reported rather than silently missing, so a gap in the picture reads as "not done yet".
 */
import * as mat4 from 'gl-matrix/mat4';
import * as vec3 from 'gl-matrix/vec3';
import { quatToMat4, quat4Inverse } from '../WebGLgComponents/quatToMat4.js';
import { CameraFrame, viewProjection } from '../WebGLgComponents/mgWebGLParts/projection';
import { isFaded, shouldDraw } from '../WebGLgComponents/objectFade';
import type { DisplayBuffer } from '../WebGLgComponents/displayBuffer';

/**
 * What the preview reads off the WebGL renderer each frame. MGWebGL has all of these; tests pass
 * plain objects.
 */
export interface PreviewCameraSource {
    myQuat: ArrayLike<number>;
    origin: ArrayLike<number>;
    zoom: number;
    fogClipOffset: number;
    gl_clipPlane0: ArrayLike<number>;
    gl_clipPlane1: ArrayLike<number>;
    gl_fog_start: number | null;
    gl_fog_end: number;
    doPerspectiveProjection: boolean;
    light_positions: ArrayLike<number>;
    light_colours_ambient: ArrayLike<number>;
    light_colours_diffuse: ArrayLike<number>;
    light_colours_specular: ArrayLike<number>;
    specularPower: number;
    background_colour: ArrayLike<number>;
}

/** Where a sub-buffer's colour comes from. Decides the pipeline. */
export type ColourSource = "vertex" | "instance" | "uniform";

/** One sub-buffer the preview will draw. */
export interface PreviewDraw {
    buffer: DisplayBuffer;
    /** Sub-buffer index. */
    index: number;
    instanced: boolean;
    colourSource: ColourSource;
    /** Drawn after the opaque pass, blended, without writing depth. */
    transparent: boolean;
    vertexCount: number;
    indexCount: number;
    instanceCount: number;
}

export interface PreviewPlan {
    draws: PreviewDraw[];
    /** Why things were left out, with counts of sub-buffers. Keys are human-readable. */
    skipped: Record<string, number>;
    /** Triangles that will be drawn, instances included. */
    triangles: number;
}

const skip = (skipped: Record<string, number>, why: string) => {
    skipped[why] = (skipped[why] ?? 0) + 1;
};

const lengthOf = (data: ArrayLike<number> | undefined | null): number => data ? data.length : 0;

/**
 * Pick out what the preview can draw, in the order the WebGL renderer would meet it.
 *
 * The colour rules follow drawTriangles and drawBuffer: a non-instanced mesh uses its customColour
 * if it has one and its vertex colours otherwise; an instanced one uses per-instance colours when
 * instance_use_colors says so - which wins even over customColour, since drawBuffer binds them
 * after the custom colour is set - then customColour, then vertex colours.
 */
export function planPreview(displayBuffers: readonly DisplayBuffer[]): PreviewPlan {
    const draws: PreviewDraw[] = [];
    const skipped: Record<string, number> = {};
    let triangles = 0;

    for (const buffer of displayBuffers) {
        if (!buffer || !shouldDraw(buffer.visible, buffer.alphaMultiplier ?? 1)) continue;
        const types = buffer.bufferTypes ?? [];
        for (let j = 0; j < types.length; j++) {
            if (types[j] !== "TRIANGLES") {
                skip(skipped, types[j] ?? "unknown");
                continue;
            }
            if (buffer.transformMatrix || buffer.transformMatrixInteractive) {
                skip(skipped, "TRIANGLES with a transform matrix");
                continue;
            }

            const vertexCount = lengthOf(buffer.triangleVertices?.[j]) / 3;
            const indexCount = lengthOf(buffer.triangleIndexs?.[j]);
            if (!(vertexCount > 0) || !(indexCount > 0)) continue;
            if (lengthOf(buffer.triangleNormals?.[j]) !== vertexCount * 3) {
                skip(skipped, "TRIANGLES without one normal per vertex");
                continue;
            }

            const instanced = lengthOf(buffer.triangleInstanceOrigins?.[j]) > 0;
            const instanceCount = instanced ? lengthOf(buffer.triangleInstanceOrigins[j]) / 3 : 1;
            const hasCustom = !!buffer.customColour && buffer.customColour.length === 4;
            const colours = lengthOf(buffer.triangleColours?.[j]);

            let colourSource: ColourSource;
            if (instanced && buffer.supplementary?.["instance_use_colors"]?.[j]) {
                colourSource = "instance";
                if (colours < instanceCount * 4) {
                    skip(skipped, "instanced TRIANGLES with too few instance colours");
                    continue;
                }
            } else if (hasCustom) {
                colourSource = "uniform";
            } else {
                colourSource = "vertex";
                if (colours !== vertexCount * 4) {
                    skip(skipped, "TRIANGLES without one colour per vertex");
                    continue;
                }
            }

            if (buffer.symmetryMatrices?.length > 0) skip(skipped, "symmetry copies (original drawn)");

            draws.push({
                buffer, index: j, instanced, colourSource,
                transparent: !!buffer.transparent || isFaded(buffer.alphaMultiplier ?? 1),
                vertexCount, indexCount, instanceCount,
            });
            triangles += (indexCount / 3) * instanceCount;
        }
    }
    return { draws, skipped, triangles };
}

/** Floats in the per-frame uniform block; see Frame in previewShaders.ts. */
export const FRAME_FLOATS = 60;

/**
 * The camera for the preview's own canvas.
 *
 * The same camera as the main view, framed for a different shape: the visible height matches
 * and the width follows the preview's aspect, which is what the main view does when its window
 * is resized.
 */
export function previewCameraFrame(source: PreviewCameraSource, width: number, height: number): CameraFrame {
    return {
        quat: source.myQuat,
        origin: source.origin,
        zoom: source.zoom,
        eyeDistance: source.fogClipOffset,
        clipPlane0W: source.gl_clipPlane0[3],
        clipPlane1W: source.gl_clipPlane1[3],
        fogEnd: source.gl_fog_end,
        perspective: !!source.doPerspectiveProjection,
        viewport: [0, 0, width, height],
        aspect: height > 0 ? width / height : 1,
    };
}

/**
 * Pack everything the shaders need for one frame.
 *
 * Lighting is done in model space, as the WebGL triangle shader does it: normals arrive
 * untransformed, and the light and eye directions are rotated back by the inverse view rotation.
 * That is what setLightUniforms and screenZ do.
 */
export function frameUniforms(source: PreviewCameraSource, width: number, height: number, out = new Float32Array(FRAME_FLOATS)): Float32Array {
    const { projection, view } = viewProjection(previewCameraFrame(source, width, height), "zeroToOne");
    out.set(projection, 0);
    out.set(view, 16);

    const invQuat = quat4Inverse(source.myQuat, [0, 0, 0, 1]);
    const invRotation = quatToMat4(invQuat) as mat4.mat4;

    const light = vec3.transformMat4(vec3.create(),
        [source.light_positions[0], source.light_positions[1], source.light_positions[2]], invRotation);
    vec3.normalize(light, light);
    out.set([light[0], light[1], light[2], 0], 32);

    const eye = vec3.transformMat4(vec3.create(), [0, 0, 1], invRotation);
    out.set([eye[0], eye[1], eye[2], 0], 36);

    out.set(Array.from(source.light_colours_ambient).slice(0, 4), 40);
    out.set(Array.from(source.light_colours_diffuse).slice(0, 4), 44);
    // Only rgb matters: the WebGL shader overwrites the lit colour's alpha with the vertex alpha.
    out.set(Array.from(source.light_colours_specular).slice(0, 4), 48);
    out.set(Array.from(source.background_colour).slice(0, 4), 52);

    const fogStart = source.gl_fog_start ?? 0;
    // A zero-width fog range would divide by zero in the shader; WebGL has the same hazard and
    // the slab code never produces it, but a preview should not go black over it.
    const fogEnd = source.gl_fog_end > fogStart ? source.gl_fog_end : fogStart + 1e-3;
    out.set([fogStart, fogEnd, source.specularPower, 0], 56);
    return out;
}

/** "PERFECT_SPHERES ×12, LINES ×2", or "" when nothing was skipped. */
export function describeSkipped(skipped: Record<string, number>): string {
    return Object.entries(skipped)
        .sort((a, b) => b[1] - a[1])
        .map(([why, n]) => `${why} ×${n}`)
        .join(", ");
}
