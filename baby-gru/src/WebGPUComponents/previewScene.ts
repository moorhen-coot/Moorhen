/**
 * The parts of the WebGPU preview that do not need a GPU: deciding what in the scene it can draw,
 * and packing the per-frame uniforms.
 *
 * The preview reads the same DisplayBuffers the WebGL renderer does, from the store, and the same
 * camera, from the WebGL renderer's fields. It draws TRIANGLES sub-buffers, instanced or not, lit
 * and fogged the way triangle-fragment-shader.js does it, and PERFECT_SPHERES as impostors, as
 * twodshapes-vertex-shader.js and perfect-sphere-fragment-shader.js do. Everything else is counted
 * and reported rather than silently missing, so a gap in the picture reads as "not done yet".
 */
import * as mat4 from 'gl-matrix/mat4';
import * as quat from 'gl-matrix/quat';
import * as vec3 from 'gl-matrix/vec3';
import { quatToMat4, quat4Inverse } from '../WebGLgComponents/quatToMat4.js';
import { CameraFrame, focalPlaneDepth, slabNearFar, viewProjection } from '../WebGLgComponents/mgWebGLParts/projection';
import { isFaded, shouldDraw } from '../WebGLgComponents/objectFade';
import type { DisplayBuffer } from '../WebGLgComponents/displayBuffer';
import { type BufferMaterial, materialTextureIds } from '../WebGLgComponents/textureRegistry';
import type { TextSource } from './textLayer';
import type { OverlayLinesSource } from './overlayLines';
import type { TexturedShapeSource } from './texturedShapes';
import { SHADOW_MAP_TEXELS, type ShadowMapQuality } from '../WebGLgComponents/shadowMapQuality';
import { type DepthBlurSettings, depthBlurKernel } from './depthBlur';

/**
 * What the preview reads off the WebGL renderer each frame. MGWebGL has all of these; tests pass
 * plain objects.
 */
export interface PreviewCameraSource extends TextSource, OverlayLinesSource {
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
    /**
     * Whether spheres cut by the front clip plane show a flat cap where they are cut, rather
     * than vanishing whole (the scene's clipCap setting; MoorhenWebMG copies it here).
     */
    clipCapPerfectSpheres?: boolean;
    /** The map line width, which buildBuffers makes every LINES and NORMALLINES buffer's size. */
    mapLineWidth?: number;
    /**
     * Where drawCore reads the hover highlight's size (glRef.hoverSize): the largest sphere under
     * the hovered atoms, so the highlight covers them. MGWebGL has its store.
     */
    store?: { getState(): {
        glRef?: { hoverSize?: number; texturedShapes?: TexturedShapeSource[] };
        sceneSettings?: { shadowMapQuality?: ShadowMapQuality; depthPeelLayers?: number };
    } };
    /**
     * Depth peeling for transparent geometry (MGWebGL's, on unless switched off), with the scene's
     * depthPeelLayers counting the opaque layer (depthPeel.ts).
     */
    doOrderIndependentTransparency?: boolean;
    /** Shadows from the light (doShadow), in a map of the scene's shadowMapQuality. */
    doShadow?: boolean;
    /** Screen-space ambient occlusion (scene settings doSSAO, ssaoRadius in A, ssaoBias the strength). */
    doSSAO?: boolean;
    ssaoRadius?: number;
    ssaoBias?: number;
    /**
     * Edge detection (doEdgeDetect): a step in depth of more than depthThreshold A, or a change of
     * normal past normalThreshold, across scaleDepth or scaleNormal of WebGL's g-buffer texels.
     */
    doEdgeDetect?: boolean;
    depthThreshold?: number;
    normalThreshold?: number;
    scaleDepth?: number;
    scaleNormal?: number;
    /**
     * Depth blur (useOffScreenBuffers, as WebGL names it): blurSize taps each side (the
     * depthBlurRadius setting), with the focal plane blurDepth A behind the view centre
     * (depthBlurDepth). The canvas the view is shown on, whose width the taps' spacing is in.
     */
    useOffScreenBuffers?: boolean;
    blurSize?: number;
    blurDepth?: number;
    canvas?: { width: number; height?: number };
    /**
     * The views the canvas is divided into (previewViews): MGWebGL's layouts, each a viewport in
     * GL pixels of the canvas (from its bottom-left corner) and a turn applied after the camera's.
     * Multiple views show a group of buffers each, round its own origin (multiViewOrigins).
     */
    doMultiView?: boolean;
    doThreeWayView?: boolean;
    doSideBySideStereo?: boolean;
    doCrossEyedStereo?: boolean;
    threeWayQuats?: ArrayLike<number>[];
    threeWayViewports?: ArrayLike<number>[];
    stereoQuats?: ArrayLike<number>[];
    stereoViewports?: ArrayLike<number>[];
    multiWayQuats?: ArrayLike<number>[];
    multiWayViewports?: ArrayLike<number>[];
    multiViewOrigins?: ArrayLike<number>[];
    /**
     * Anaglyph stereo: the eyes turned by the first two stereoQuats, each in the colour channels
     * of anaglyphColours (../WebGLgComponents/anaglyph.ts; red and green if not set).
     */
    doAnaglyphStereo?: boolean;
    anaglyphColours?: string;
}

/** What the effects passes do this frame, from the source's settings; null for an effect that is off. */
export interface EffectSettings {
    ssao: { radius: number; strength: number } | null;
    /** The shadow map's edge, in texels (SHADOW_MAP_TEXELS for the quality). */
    shadow: { texels: number } | null;
    edges: { depthThreshold: number; normalThreshold: number; depthStep: number; normalStep: number } | null;
    /** Depth blur (depthBlur.ts); absent, as null, is off. */
    depthBlur?: DepthBlurSettings | null;
}

/**
 * The effects the source asks for.
 *
 * Edge detection's steps are in pixels of the image, and may be fractions of one: WebGL's are in
 * texels of its 2048-square g-buffer, scaled by the canvas's aspect, which for an ordinary window
 * makes its default scale of 2 about half a pixel. So a quarter of the scale; 0 stays "off"
 * (normal edges are off by default, with scaleNormal 0). The edge pass works on a g-buffer finer
 * than the image to take them (effectPasses.ts), as WebGL's is.
 */
export function effectSettings(source: PreviewCameraSource): EffectSettings {
    const step = (scale: number | undefined) => (scale && scale > 0 ? scale / 4 : 0);
    return {
        ssao: source.doSSAO ? { radius: source.ssaoRadius ?? 5, strength: source.ssaoBias ?? 1 } : null,
        shadow: source.doShadow
            ? { texels: SHADOW_MAP_TEXELS[source.store?.getState().sceneSettings?.shadowMapQuality ?? "coarse"] ?? SHADOW_MAP_TEXELS.coarse }
            : null,
        edges: source.doEdgeDetect
            ? {
                depthThreshold: source.depthThreshold ?? 1.3,
                normalThreshold: source.normalThreshold ?? 0.5,
                depthStep: step(source.scaleDepth ?? 2),
                normalStep: step(source.scaleNormal ?? 0),
            }
            : null,
        depthBlur: source.useOffScreenBuffers ? depthBlurSettings(source) : null,
    };
}

/**
 * The depth blur, as drawCore's depthBlur sets it up: WebGL's Gaussian for the radius, taps half
 * the radius apart in pixels of the canvas, and the focal plane - a distance in A behind the view
 * centre - turned into a depth in the buffer for the frame's slab, as focalPlaneDepth does it.
 */
function depthBlurSettings(source: PreviewCameraSource): DepthBlurSettings {
    const { taps, weights } = depthBlurKernel(source.blurSize ?? 3);
    const perspective = !!source.doPerspectiveProjection;
    const slab = slabNearFar(source.gl_clipPlane0[3], source.gl_clipPlane1[3], source.gl_fog_end, perspective);
    const focus = focalPlaneDepth(source.blurDepth ?? 0, slab.near, slab.far, source.fogClipOffset, perspective);
    return { taps, weights, step: taps / 2, focus };
}

/** One of the views a divided canvas shows (previewViews). */
export interface PreviewView {
    /** Where it is in the image, in pixels from the image's top-left corner. */
    x: number;
    y: number;
    width: number;
    height: number;
    /** The camera's turn for this view: the camera's own, then the view's. */
    quat: number[];
    /** The view's origin (MGWebGL.origin's convention): the camera's, or a multiple view's group's. */
    origin: ArrayLike<number>;
    /** Multiple views: the group of buffers it shows; buffers in no group show in every view. */
    group: number | null;
}

/** Whether the buffer is one a multiple view keeps to its own group, as drawTriangles decides. */
function grouped(buffer: DisplayBuffer): boolean {
    return !!buffer.origin && buffer.origin.length === 3 && Object.hasOwn(buffer, "isHoverBuffer") && !buffer.isHoverBuffer;
}

/** Whether `view` shows `buffer`: drawTriangles' multiple-view test. */
export function viewShows(view: PreviewView, buffer: DisplayBuffer): boolean {
    return view.group === null || !grouped(buffer) || buffer.multiViewGroup === view.group;
}

/**
 * The views the canvas is divided into, in an image `width` x `height`, as drawScene lays them out
 * (getMultiViewInfo and the loop over its viewports): three ways, side-by-side or cross-eyed
 * stereo, or one view a multiple-view group. null for an ordinary, undivided view, and for
 * multiple views with no groups to show (WebGL then draws the one view).
 *
 * MGWebGL's viewports are in GL pixels of its canvas, from the bottom-left; here they are scaled
 * to the image and measured from its top-left, rounded so that neighbours share their edges.
 * Anaglyph stereo is not a division of the canvas, and is not here (drawAnaglyph).
 */
export function previewViews(source: PreviewCameraSource, displayBuffers: readonly DisplayBuffer[], width: number, height: number): PreviewView[] | null {
    let quats: ArrayLike<number>[] | undefined;
    let viewports: ArrayLike<number>[] | undefined;
    let groups: (number | null)[] | null = null;
    if (source.doThreeWayView) {
        quats = source.threeWayQuats;
        viewports = source.threeWayViewports;
    } else if (source.doMultiView) {
        // The groups in the order getMultiViewInfo finds them: an object's keys, so whole numbers
        // in increasing order.
        const found = new Set<number>();
        for (const buffer of displayBuffers) {
            if (buffer.multiViewGroup !== undefined && grouped(buffer)) found.add(buffer.multiViewGroup);
        }
        if (found.size === 0) return null;
        const keys = Object.keys(Object.fromEntries([...found].map(group => [group, group])));
        quats = source.multiWayQuats;
        viewports = source.multiWayViewports;
        // A cell past the last group shows only what is in no group, as WebGL's does.
        groups = (viewports ?? []).map((_, i) => (i < keys.length ? parseInt(keys[i]) : NaN));
    } else if (source.doSideBySideStereo) {
        quats = source.stereoQuats;
        viewports = source.stereoViewports;
    } else if (source.doCrossEyedStereo) {
        quats = source.stereoQuats ? [...source.stereoQuats].reverse() : undefined;
        viewports = source.stereoViewports;
    } else {
        return null;
    }
    if (!quats || !viewports || viewports.length === 0 || quats.length < viewports.length) return null;

    const canvasWidth = source.canvas?.width || width;
    const canvasHeight = source.canvas?.height || height;
    const sx = width / canvasWidth, sy = height / canvasHeight;
    return viewports.map((viewport, i) => {
        const [vx, vy, vw, vh] = [viewport[0], viewport[1], viewport[2], viewport[3]];
        const x = Math.round(vx * sx), right = Math.round((vx + vw) * sx);
        const y = Math.round((canvasHeight - vy - vh) * sy), bottom = Math.round((canvasHeight - vy) * sy);
        const turned = quat.multiply(quat.create(), Array.from(source.myQuat) as quat.quat, Array.from(quats[i]) as quat.quat);
        // The group's own origin. multiViewOrigins is indexed by group (getMultiViewInfo); drawScene
        // reads it by view, which is the same only while the groups run 0, 1, 2... - with a map
        // between two molecules they run 0, 2 and its second view kept the first view's origin.
        const group = groups ? groups[i] : null;
        const groupOrigin = group !== null && Number.isInteger(group) ? source.multiViewOrigins?.[group] : undefined;
        return {
            x, y, width: Math.max(1, right - x), height: Math.max(1, bottom - y),
            quat: Array.from(turned),
            origin: groupOrigin && groupOrigin.length === 3 ? groupOrigin : source.origin,
            group,
        };
    });
}

/**
 * The radius drawCore gives every sphere of a hover highlight, or null to keep their own: past
 * the default 0.27, the hovered spheres' size plus 0.4.
 */
export function hoverSphereRadius(source: PreviewCameraSource): number | null {
    const hoverSize = source.store?.getState().glRef?.hoverSize ?? 0;
    return hoverSize > 0.27 ? hoverSize + 0.4 : null;
}

/** Where a sub-buffer's colour comes from. Decides the pipeline. */
export type ColourSource = "vertex" | "instance" | "uniform";

/** How a sub-buffer is drawn. */
export type PreviewPrimitive = "triangles" | "spheres" | "lines" | "lit-lines";

/** One sub-buffer the preview will draw. */
export interface PreviewDraw {
    buffer: DisplayBuffer;
    /** Sub-buffer index. */
    index: number;
    /**
     * "triangles": a mesh, instanced or not. "spheres": PERFECT_SPHERES, one impostor quad per
     * instance, coloured per instance; vertexCount and indexCount are then the quad's. "lines" and
     * "lit-lines": LINES and NORMALLINES, drawn as thick lines; indexCount is two per segment, and
     * zero when the segments are the vertices taken in pairs.
     */
    primitive: PreviewPrimitive;
    instanced: boolean;
    colourSource: ColourSource;
    /** Drawn after the opaque pass, blended, without writing depth. */
    transparent: boolean;
    vertexCount: number;
    indexCount: number;
    instanceCount: number;
    /**
     * Symmetry (or biomolecule) copies to draw besides the original: each a 4x4 placement,
     * column-major as WebGL's applySymmetryMatrix reads DisplayBuffer.symmetryMatrices.
     */
    copies: ArrayLike<number>[];
    /** Copies are drawn in one grey, as drawBuffer does, rather than in their own colours. */
    greyCopies: boolean;
    /**
     * Being dragged: drawn through the buffer's transformMatrixInteractive about its
     * transformOriginInteractive (see interactiveModel), the original only, as drawCore does.
     */
    moving: boolean;
    /** And, while moving, with drawCore's pulsing ambient light (meshes and spheres, not lines). */
    glow: boolean;
    /**
     * For a mesh with textures and a texture coordinate per vertex (triangleTextureCoords): what
     * it is textured with. Null otherwise. Whether its textures are actually registered is the
     * renderer's to find out; one that is not is drawn as if it were absent, as in WebGL.
     */
    material: BufferMaterial | null;
}

export interface PreviewPlan {
    draws: PreviewDraw[];
    /** Why things were left out, with counts of sub-buffers. Keys are human-readable. */
    skipped: Record<string, number>;
    /** Triangles that will be drawn, instances included (not counting the spheres' quads). */
    triangles: number;
    /** Perfect spheres that will be drawn. */
    spheres: number;
    /** Line segments that will be drawn. */
    segments: number;
    /** Which sub-buffers `skipped` counts, for finding out what they are. */
    skippedSubBuffers: SkippedSubBuffer[];
}

/** A sub-buffer left out, or left partly drawn (symmetry copies), and why. */
export interface SkippedSubBuffer {
    buffer: DisplayBuffer;
    index: number;
    why: string;
}

interface Skips {
    counts: Record<string, number>;
    list: SkippedSubBuffer[];
}

const skip = (skips: Skips, buffer: DisplayBuffer, index: number, why: string) => {
    skips.counts[why] = (skips.counts[why] ?? 0) + 1;
    skips.list.push({ buffer, index, why });
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
    const skips: Skips = { counts: {}, list: [] };
    let triangles = 0;
    let spheres = 0;
    let segments = 0;

    for (const buffer of displayBuffers) {
        if (!buffer || !shouldDraw(buffer.visible, buffer.alphaMultiplier ?? 1)) continue;
        const types = buffer.bufferTypes ?? [];
        for (let j = 0; j < types.length; j++) {
            if (types[j] === "PERFECT_SPHERES") {
                const draw = planSpheres(buffer, j, skips);
                if (draw) {
                    draws.push(draw);
                    spheres += draw.instanceCount * (1 + draw.copies.length);
                }
                continue;
            }
            if (types[j] === "LINES" || types[j] === "NORMALLINES") {
                const draw = planLines(buffer, j, types[j] === "NORMALLINES", skips);
                if (draw) {
                    draws.push(draw);
                    segments += (draw.indexCount || draw.vertexCount) / 2;
                }
                continue;
            }
            if (types[j] !== "TRIANGLES") {
                skip(skips, buffer, j, types[j] ?? "unknown");
                continue;
            }
            // drawCore tries transformMatrix first, then transformMatrixInteractive.
            if (buffer.transformMatrix) {
                skip(skips, buffer, j, "TRIANGLES with a transform matrix");
                continue;
            }
            const moving = !!buffer.transformMatrixInteractive;

            const vertexCount = lengthOf(buffer.triangleVertices?.[j]) / 3;
            const indexCount = lengthOf(buffer.triangleIndexs?.[j]);
            if (!(vertexCount > 0) || !(indexCount > 0)) continue;
            if (lengthOf(buffer.triangleNormals?.[j]) !== vertexCount * 3) {
                skip(skips, buffer, j, "TRIANGLES without one normal per vertex");
                continue;
            }

            // Instanced when it has instance origins at all, as drawBuffer decides it. Empty ones
            // are a template with no instances - the vector and measurement cylinders and cones
            // with nothing to show - and draw nothing; they are not missing from the picture.
            const instanced = buffer.triangleInstanceOrigins?.[j] != null;
            const instanceCount = instanced ? Math.floor(lengthOf(buffer.triangleInstanceOrigins[j]) / 3) : 1;
            if (instanceCount === 0) continue;
            const hasCustom = !!buffer.customColour && buffer.customColour.length === 4;
            const colours = lengthOf(buffer.triangleColours?.[j]);

            let colourSource: ColourSource;
            if (instanced && buffer.supplementary?.["instance_use_colors"]?.[j]) {
                colourSource = "instance";
                if (colours < instanceCount * 4) {
                    skip(skips, buffer, j, "instanced TRIANGLES with too few instance colours");
                    continue;
                }
            } else if (hasCustom) {
                colourSource = "uniform";
            } else {
                colourSource = "vertex";
                // More colours than vertices is harmless (WebGL reads one per vertex); fewer is not.
                if (colours < vertexCount * 4) {
                    skip(skips, buffer, j, "TRIANGLES without one colour per vertex");
                    continue;
                }
            }


            draws.push({
                buffer, index: j, primitive: "triangles", instanced, colourSource,
                transparent: !!buffer.transparent || isFaded(buffer.alphaMultiplier ?? 1),
                vertexCount, indexCount, instanceCount,
                ...copiesOf(buffer), moving, glow: moving,
                material: materialOf(buffer, j, vertexCount),
            });
            triangles += (indexCount / 3) * instanceCount * (1 + draws[draws.length - 1].copies.length);
        }
    }
    return { draws, skipped: skips.counts, triangles, spheres, segments, skippedSubBuffers: skips.list };
}

/**
 * A mesh sub-buffer's material, if it has a texture of any kind and a texture coordinate per
 * vertex - the same test drawCore makes before binding one (a two-component coordinate buffer).
 */
function materialOf(buffer: DisplayBuffer, j: number, vertexCount: number): BufferMaterial | null {
    const material = buffer.materials?.[j];
    if (materialTextureIds(material).length === 0) return null;
    return lengthOf(buffer.triangleTextureCoords?.[j]) === vertexCount * 2 ? material : null;
}

/**
 * A PERFECT_SPHERES sub-buffer: an origin, a size (three floats, of which drawCore's shader uses
 * the first, the radius) and an RGBA colour per sphere. drawCore always takes the colours per
 * sphere, whatever customColour says, so this does too.
 */
function planSpheres(buffer: DisplayBuffer, j: number, skips: Skips): PreviewDraw | null {
    // drawCore's sphere loop knows only transformMatrixInteractive; a plain transformMatrix is
    // not applied to spheres.
    const moving = !!buffer.transformMatrixInteractive;
    const n = Math.floor(lengthOf(buffer.triangleInstanceOrigins?.[j]) / 3);
    if (n === 0) return null;
    if (lengthOf(buffer.triangleInstanceSizes?.[j]) < 3 * n) {
        skip(skips, buffer, j, "PERFECT_SPHERES without a size per sphere");
        return null;
    }
    if (lengthOf(buffer.triangleColours?.[j]) < 4 * n) {
        skip(skips, buffer, j, "PERFECT_SPHERES without a colour per sphere");
        return null;
    }
    return {
        buffer, index: j, primitive: "spheres", instanced: true, colourSource: "instance",
        transparent: !!buffer.transparent || isFaded(buffer.alphaMultiplier ?? 1),
        vertexCount: 4, indexCount: 6, instanceCount: n,
        ...copiesOf(buffer), moving, glow: moving, material: null,
    };
}

/**
 * LINES and NORMALLINES, as buildBuffers turns them into thick lines (linesToThickLines...) and
 * drawCore draws them: segments between index pairs when supplementary.useIndices says so (for
 * LINES, its first entry; NORMALLINES has no other way), otherwise between the vertices taken in
 * pairs; coloured by customColour, or per vertex. drawCore draws neither with symmetry copies.
 */
function planLines(buffer: DisplayBuffer, j: number, lit: boolean, skips: Skips): PreviewDraw | null {
    const type = lit ? "NORMALLINES" : "LINES";
    if (buffer.transformMatrix) {
        skip(skips, buffer, j, `${type} with a transform matrix`);
        return null;
    }
    // drawCore moves LINES while they are dragged, but draws NORMALLINES where they were.
    const moving = !lit && !!buffer.transformMatrixInteractive;
    const vertexCount = lengthOf(buffer.triangleVertices?.[j]) / 3;
    if (!(vertexCount > 0)) return null;
    const useIndices = lit ? !!buffer.supplementary?.["useIndices"] : !!buffer.supplementary?.["useIndices"]?.[0];
    const indexCount = useIndices ? lengthOf(buffer.triangleIndexs?.[j]) - (lengthOf(buffer.triangleIndexs?.[j]) % 2) : 0;
    if (lit && !useIndices) {
        // buildBuffers gives up on these ("RETURNING BECAUSE NO INDICES").
        skip(skips, buffer, j, "NORMALLINES without indices");
        return null;
    }
    if (useIndices ? indexCount === 0 : vertexCount < 2) return null;
    if (lit && lengthOf(buffer.triangleNormals?.[j]) < vertexCount * 3) {
        skip(skips, buffer, j, "NORMALLINES without one normal per vertex");
        return null;
    }
    const hasCustom = !!buffer.customColour && buffer.customColour.length === 4;
    if (!hasCustom && lengthOf(buffer.triangleColours?.[j]) < vertexCount * 4) {
        skip(skips, buffer, j, `${type} without one colour per vertex`);
        return null;
    }
    return {
        buffer, index: j, primitive: lit ? "lit-lines" : "lines", instanced: false,
        colourSource: hasCustom ? "uniform" : "vertex",
        transparent: !!buffer.transparent || isFaded(buffer.alphaMultiplier ?? 1),
        vertexCount: useIndices ? vertexCount : vertexCount - (vertexCount % 2), indexCount, instanceCount: 1,
        copies: [], greyCopies: false, moving, glow: false, material: null,
    };
}

/**
 * Where a dragged buffer is drawn: setupModelViewTransformMatrixInteractive's model matrix,
 * T(d) x S x T(-d), S the buffer's transformMatrixInteractive (column-major, its translation the
 * drag) and d its transformOriginInteractive less the view origin - the fragment's centre, so it
 * turns about that. Column-major.
 */
export function interactiveModel(transform: ArrayLike<number>, transformOrigin: ArrayLike<number> | null | undefined,
                                 viewOrigin: ArrayLike<number>): Float32Array {
    const o = transformOrigin ?? [0, 0, 0];
    const d = [0, 1, 2].map(i => o[i] - viewOrigin[i]);
    const model = mat4.fromTranslation(mat4.create(), d as vec3.vec3);
    mat4.multiply(model, model, mat4.clone(Array.from(transform).slice(0, 16) as unknown as mat4.mat4));
    mat4.translate(model, model, d.map(x => -x) as vec3.vec3);
    return new Float32Array(model);
}

/**
 * drawCore's pulse for something being dragged, as its ambient light: sin(pi x the distance to the
 * nearest whole second), so 0 on each second and 1 half way between.
 */
export function interactiveGlow(nowMs: number): number {
    const t = nowMs / 1000;
    const tdiff = Math.round(t) - t;
    return tdiff < 0 ? Math.sin(Math.PI + tdiff * Math.PI) : Math.sin(tdiff * Math.PI);
}

/**
 * The grey drawBuffer gives symmetry copies: darker on a light background, lighter on a dark one
 * (by the background's luma).
 */
export function symmetryCopyGrey(background: ArrayLike<number>): number[] {
    const luma = background[0] * 0.299 + background[1] * 0.587 + background[2] * 0.114;
    return luma > 0.5 ? [0.3, 0.3, 0.3, 1] : [0.5, 0.5, 0.5, 1];
}

/** A buffer's symmetry copies, as drawBuffer and drawCore's sphere loop draw them. */
function copiesOf(buffer: DisplayBuffer): { copies: ArrayLike<number>[]; greyCopies: boolean } {
    // Typed as number[] on DisplayBuffer, but drawBuffer reads it as a list of 16-number matrices.
    const matrices = (buffer.symmetryMatrices ?? []) as unknown as (ArrayLike<number> | null)[];
    const copies = matrices.filter(m => m && m.length === 16);
    return { copies, greyCopies: copies.length > 0 && buffer.changeColourWithSymmetry !== false };
}

/** Floats in the per-frame uniform block; see Frame in previewShaders.ts. */
export const FRAME_FLOATS = 108;

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
 * That is what setLightUniforms and screenZ do. The sphere shader lights in eye space with the
 * light as given; rotating both the normal and the light back gives the same dot products.
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
    out.set([fogStart, fogEnd, source.specularPower, source.clipCapPerfectSpheres ? 1 : 0], 56);

    // The screen's right and up in model space, which sphere impostors face: what drawCore gets
    // by turning its quad's corners with the same inverse rotation every frame.
    const right = vec3.transformMat4(vec3.create(), [1, 0, 0], invRotation);
    const up = vec3.transformMat4(vec3.create(), [0, 1, 0], invRotation);
    out.set([right[0], right[1], right[2], 0], 60);
    out.set([up[0], up[1], up[2], 0], 64);
    // The front and back clip planes, in eye space, which the sphere shader tests itself.
    out.set(Array.from(source.gl_clipPlane0).slice(0, 4), 68);
    out.set(Array.from(source.gl_clipPlane1).slice(0, 4), 72);
    // Which effects maps the frame has, and where in them its pixels are (the renderer sets these
    // when it has made them; for a tile the maps reach past it).
    out.set([0, 0, 0, 0], 76);
    out.set([0, 0, 1 / width, 1 / height], 80);
    // The shadow map's matrix and texel size, bias and quality (shadowMap.ts), likewise.
    out.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], 84);
    out.set([0, 0, 0, 0], 100);
    // Fog into the fog colour; the renderer sets x for a transparent snapshot's fading.
    out.set([0, 0, 0, 0], 104);
    return out;
}

/** "PERFECT_SPHERES ×12, LINES ×2", or "" when nothing was skipped. */
export function describeSkipped(skipped: Record<string, number>): string {
    return Object.entries(skipped)
        .sort((a, b) => b[1] - a[1])
        .map(([why, n]) => `${why} ×${n}`)
        .join(", ");
}

/**
 * One piece of a mesh too big for a single GPU buffer. Either a window onto the mesh - a run of
 * its triangles and the run of vertices they use, drawn with a negative base vertex so that the
 * original indices still work - or, when a run's vertices are too spread out for that, a copy
 * with its own vertices and renumbered indices.
 */
export interface MeshChunk {
    /** The chunk's triangles, as indices into the mesh: [firstIndex, firstIndex + indexCount). */
    firstIndex: number;
    indexCount: number;
    /** Window: the vertices [firstVertex, firstVertex + vertexCount) of the mesh. */
    firstVertex: number;
    vertexCount: number;
    /** Copy: the mesh vertex each chunk vertex is, and the chunk's renumbered indices. */
    remap?: { vertices: Uint32Array; indices: Uint32Array };
}

/**
 * Split a triangle mesh into chunks of at most `maxIndices` indices and `maxVertices` vertices,
 * keeping the triangles in order. A mesh within both limits is one chunk.
 *
 * Meshes made slab by slab (MetaBalls, map contours) use vertices close together in index for
 * triangles close together in order, so their chunks are windows and nothing is copied.
 */
export function planMeshChunks(indices: ArrayLike<number>, vertexCount: number, maxIndices: number, maxVertices: number): MeshChunk[] {
    const perChunk = Math.max(3, maxIndices - (maxIndices % 3));
    if (indices.length <= perChunk && vertexCount <= maxVertices) {
        return [{ firstIndex: 0, indexCount: indices.length, firstVertex: 0, vertexCount }];
    }
    const chunks: MeshChunk[] = [];
    const total = indices.length - (indices.length % 3);
    let start = 0;
    while (start < total) {
        // As many whole triangles as fit, with all their vertices inside one window.
        let low = Infinity, high = -Infinity, end = start;
        while (end < total && end - start + 3 <= perChunk) {
            const a = indices[end], b = indices[end + 1], c = indices[end + 2];
            const lo = Math.min(low, a, b, c), hi = Math.max(high, a, b, c);
            if (hi - lo + 1 > maxVertices) break;
            low = lo; high = hi; end += 3;
        }
        // Too spread out for a window to hold even an eighth of what a renumbered copy would
        // (meshes have about two triangles, six indices, per vertex): copy instead.
        if (end - start < Math.min(perChunk, total - start, 6 * maxVertices) / 8) {
            chunks.push(remapChunk(indices, start, total, perChunk, maxVertices));
            start += chunks[chunks.length - 1].indexCount;
            continue;
        }
        chunks.push({ firstIndex: start, indexCount: end - start, firstVertex: low, vertexCount: high - low + 1 });
        start = end;
    }
    return chunks;
}

function remapChunk(indices: ArrayLike<number>, start: number, total: number, perChunk: number, maxVertices: number): MeshChunk {
    const local = new Map<number, number>();
    const renumbered: number[] = [];
    let end = start;
    while (end < total && end - start + 3 <= perChunk) {
        const corners = [indices[end], indices[end + 1], indices[end + 2]];
        const fresh = corners.filter((v, i) => !local.has(v) && corners.indexOf(v) === i).length;
        // (At least one triangle, whatever the limit, so that the split always moves on.)
        if (local.size + fresh > maxVertices && end > start) break;
        for (const v of corners) {
            if (!local.has(v)) local.set(v, local.size);
            renumbered.push(local.get(v));
        }
        end += 3;
    }
    return {
        firstIndex: start, indexCount: end - start, firstVertex: 0, vertexCount: local.size,
        remap: { vertices: Uint32Array.from(local.keys()), indices: Uint32Array.from(renumbered) },
    };
}
