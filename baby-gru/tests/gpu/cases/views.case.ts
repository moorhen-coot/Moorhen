/**
 * A divided canvas in the WebGPU renderer (previewViews, drawViews): side-by-side stereo and
 * multiple views, on a scene of a red square, a green one behind it and a blue sphere.
 *
 * What should happen, as drawScene draws them: each view is a frame of its own size - its own turn,
 * and for multiple views its own origin and group of buffers - in its part of the canvas. So each
 * half of a side-by-side picture is the picture a canvas of half the width draws with that eye's
 * turn, to the level: plain, with ambient occlusion, edges and shadows (each view has maps of its
 * own), and with a half-transparent square peeled. Drawn in tiles, it is the picture drawn whole.
 * And each multiple view shows its own group, round its own origin, and what is in no group.
 */
import { WebGPUPreviewRenderer } from "../../../src/WebGPUComponents/previewRenderer";
import type { PreviewCameraSource } from "../../../src/WebGPUComponents/previewScene";
import type { DisplayBuffer } from "../../../src/WebGLgComponents/displayBuffer";
import { type Quad, emptyQuad, rectangle } from "../reference/surfaceLighting";
import { defineCase } from "../helpers/browserCase";

const WIDTH = 240, HEIGHT = 160;

const base: PreviewCameraSource = {
    myQuat: [0, 0, 0, 1], origin: [0, 0, 0], zoom: 0.35, fogClipOffset: 250,
    gl_clipPlane0: [0, 0, -1, -230], gl_clipPlane1: [0, 0, 1, 270], gl_fog_start: 280, gl_fog_end: 290,
    doPerspectiveProjection: false,
    light_positions: [25, 25, 50, 1], light_colours_ambient: [0.2, 0.2, 0.2, 1], light_colours_diffuse: [0.6, 0.6, 0.6, 1],
    light_colours_specular: [0.4, 0.4, 0.4, 1], specularPower: 32, background_colour: [0.1, 0.1, 0.1, 1],
    canvas: { width: WIDTH, height: HEIGHT },
};

const square = (x0: number, y0: number, x1: number, y1: number, z: number, colour: number[], extra: Record<string, unknown> = {}): DisplayBuffer => {
    const q: Quad = emptyQuad();
    rectangle(q, x0, y0, x1, y1, [0, 0, 1], colour);
    for (let i = 2; i < q.positions.length; i += 3) q.positions[i] = z;
    return {
        visible: true, alphaMultiplier: 1, dataVersion: 1, bufferTypes: ["TRIANGLES"], transparent: false, isHoverBuffer: false,
        triangleVertices: [new Float32Array(q.positions)], triangleNormals: [new Float32Array(q.normals)],
        triangleColours: [new Float32Array(q.colours)], triangleIndexs: [new Uint32Array(q.indices)], symmetryMatrices: [],
        ...extra,
    } as unknown as DisplayBuffer;
};

const sphere = (): DisplayBuffer => ({
    visible: true, alphaMultiplier: 1, dataVersion: 1, bufferTypes: ["PERFECT_SPHERES"], isHoverBuffer: false,
    triangleInstanceOrigins: [new Float32Array([-3, 1, 4])],
    triangleInstanceSizes: [new Float32Array([1.5, 1.5, 1.5])],
    triangleColours: [new Float32Array([0.3, 0.4, 0.9, 1])], symmetryMatrices: [],
} as unknown as DisplayBuffer);

function scene(transparent = false): DisplayBuffer[] {
    return [
        square(-6, -4, 6, 4, -3, [0.3, 0.8, 0.3, 1]),
        square(-2, -2, 4, 3, 2, transparent ? [0.9, 0.2, 0.2, 0.5] : [0.9, 0.2, 0.2, 1], { transparent }),
        sphere(),
    ];
}

const turnY = (angle: number) => [0, Math.sin(angle / 2), 0, Math.cos(angle / 2)];
const EYES = [turnY(0.12), turnY(-0.12)];
const STEREO = {
    doSideBySideStereo: true, stereoQuats: EYES,
    stereoViewports: [[0, 0, WIDTH / 2, HEIGHT], [WIDTH / 2, 0, WIDTH / 2, HEIGHT]],
};

/** How far apart a half of the divided picture is from a picture of its own, the most any level differs. */
const half = (divided: Uint8ClampedArray, own: Uint8ClampedArray, x0: number): { worst: number; drawn: number } => {
    const w = WIDTH / 2;
    let worst = 0, drawn = 0;
    for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < w; x++) {
            const i = (y * WIDTH + x0 + x) * 4, j = (y * w + x) * 4;
            for (let c = 0; c < 3; c++) worst = Math.max(worst, Math.abs(divided[i + c] - own[j + c]));
            if (Math.abs(own[j] - own[0]) + Math.abs(own[j + 1] - own[1]) + Math.abs(own[j + 2] - own[2]) > 6) drawn++;
        }
    }
    return { worst, drawn };
};

const difference = (a: Uint8ClampedArray, b: Uint8ClampedArray): number => {
    let worst = 0;
    for (let i = 0; i < a.length; i++) if (i % 4 !== 3) worst = Math.max(worst, Math.abs(a[i] - b[i]));
    return worst;
};

export interface ViewsReport {
    /** Each half of the side-by-side picture against a half-width picture with that eye's turn. */
    stereo: { worst: number; drawn: number }[];
    /** The same with occlusion, edges and shadows on. */
    effects: { worst: number; drawn: number }[];
    /** The same with the red square half transparent, so peeled. */
    peeled: { worst: number; drawn: number }[];
    peelLayers: number;
    /** The side-by-side picture with effects, drawn in tiles against drawn whole. */
    tiled: { worst: number; tiles: number };
    /** The two eyes differ (the turns are not lost); the effects change the picture. */
    eyesDiffer: number;
    effectsChange: number;
    /** Multiple views: each half against a picture of its group alone round its origin. */
    multiple: { worst: number; drawn: number }[];
    rendererErrors: string[];
}

export default defineCase(async (_device: GPUDevice): Promise<ViewsReport> => {
    const rendererErrors: string[] = [];
    const renderer = await WebGPUPreviewRenderer.create(document.createElement("canvas"), message => rendererErrors.push(message));
    const shot = async (buffers: DisplayBuffer[], over: Partial<PreviewCameraSource>, width = WIDTH, maxTile?: number) =>
        await renderer.snapshot(buffers, { ...base, ...over }, [], width, HEIGHT, maxTile ? { maxTile } : {});
    const halves = async (buffers: DisplayBuffer[], over: Partial<PreviewCameraSource>) => {
        const divided = (await shot(buffers, { ...over, ...STEREO })).data;
        const own = await Promise.all(EYES.map(async eye => (await shot(buffers, { ...over, myQuat: eye, canvas: { width: WIDTH / 2, height: HEIGHT } }, WIDTH / 2)).data));
        return { divided, own, halves: [half(divided, own[0], 0), half(divided, own[1], WIDTH / 2)] };
    };
    try {
        const plain = await halves(scene(), {});
        const effectsOn = { doSSAO: true, ssaoRadius: 2, ssaoBias: 1, doEdgeDetect: true, depthThreshold: 1.3, scaleDepth: 2, doShadow: true };
        const effects = await halves(scene(), effectsOn);
        const peeled = await halves(scene(true), {});
        const peelShot = await shot(scene(true), STEREO);
        const tiledShot = await shot(scene(), { ...effectsOn, ...STEREO }, WIDTH, 70);

        // Multiple views: a square in each group, each round its own origin, and the sphere in none.
        const a = square(-3, -3, 3, 3, 0, [0.9, 0.6, 0.2, 1], { multiViewGroup: 0, origin: [-10, 0, 0] });
        const b = square(-2, -4, 2, 4, 0, [0.2, 0.6, 0.9, 1], { multiViewGroup: 1, origin: [10, 0, 0] });
        // The squares placed round their origins: origin is the negated centre (MGWebGL.origin).
        const at = (buffer: DisplayBuffer, dx: number) => {
            const moved = { ...buffer, triangleVertices: [Float32Array.from(buffer.triangleVertices[0], (v, i) => (i % 3 === 0 ? v + dx : v))] };
            return moved as unknown as DisplayBuffer;
        };
        const ga = at(a, 10), gb = at(b, -10);
        const multipleOver = {
            doMultiView: true, multiWayQuats: [[0, 0, 0, -1], [0, 0, 0, -1]],
            multiWayViewports: [[0, 0, WIDTH / 2, HEIGHT], [WIDTH / 2, 0, WIDTH / 2, HEIGHT]], multiViewOrigins: [[-10, 0, 0], [10, 0, 0]],
        };
        const multipleShot = (await shot([ga, gb, sphere()], multipleOver)).data;
        const ownA = (await shot([ga, sphere()], { origin: [-10, 0, 0], myQuat: [0, 0, 0, -1], canvas: { width: WIDTH / 2, height: HEIGHT } }, WIDTH / 2)).data;
        const ownB = (await shot([gb, sphere()], { origin: [10, 0, 0], myQuat: [0, 0, 0, -1], canvas: { width: WIDTH / 2, height: HEIGHT } }, WIDTH / 2)).data;

        return {
            stereo: plain.halves,
            effects: effects.halves,
            peeled: peeled.halves,
            peelLayers: peelShot.report.peelLayers,
            tiled: { worst: difference(tiledShot.data, effects.divided), tiles: tiledShot.tiles },
            eyesDiffer: difference(plain.own[0], plain.own[1]),
            effectsChange: difference(effects.own[0], plain.own[0]),
            multiple: [half(multipleShot, ownA, 0), half(multipleShot, ownB, WIDTH / 2)],
            rendererErrors,
        };
    } finally {
        renderer.destroy();
    }
});
