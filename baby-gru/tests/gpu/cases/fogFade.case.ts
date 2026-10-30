/**
 * Transparent snapshots fade with distance rather than fogging into the background's colour
 * (fogged in previewShaders.ts), on a scene made to show it: seen from above, on white, a red
 * square 5 A in front of the view centre, a green one 5 A behind it, and a blue one at the centre,
 * half transparent - with fog from 10 A in front of the centre to 10 A behind it, so a quarter, three
 * quarters and half of the way.
 *
 * What should happen: each square's colour is its own, unfogged, and its alpha is taken down by its
 * fog - so that the transparent picture laid over the background colour is the ordinary, fogged
 * picture again, to the level, whether the half-transparent square is peeled or blended, and with
 * depth blur on too.
 */
import { WebGPUPreviewRenderer } from "../../../src/WebGPUComponents/previewRenderer";
import type { PreviewCameraSource } from "../../../src/WebGPUComponents/previewScene";
import type { DisplayBuffer } from "../../../src/WebGLgComponents/displayBuffer";
import { type Quad, emptyQuad, rectangle } from "../reference/surfaceLighting";
import { defineCase } from "../helpers/browserCase";

const WIDTH = 240, HEIGHT = 160;

const base: PreviewCameraSource = {
    myQuat: [0, 0, 0, 1], origin: [0, 0, 0], zoom: 0.35, fogClipOffset: 250,
    gl_clipPlane0: [0, 0, -1, -230], gl_clipPlane1: [0, 0, 1, 270], gl_fog_start: 240, gl_fog_end: 260,
    doPerspectiveProjection: false,
    light_positions: [0, 0, 50, 1], light_colours_ambient: [0.2, 0.2, 0.2, 1], light_colours_diffuse: [0.6, 0.6, 0.6, 1],
    light_colours_specular: [0, 0, 0, 1], specularPower: 32, background_colour: [1, 1, 1, 1],
};

const NEAR = { x0: 1, x1: 6, y0: -3, y1: 3, z: 5 };
const FAR = { x0: -8, x1: -2, y0: -3, y1: 3, z: -5 };
const MIDDLE = { x0: -1.5, x1: 0.5, y0: -5, y1: 5, z: 0 };

const square = (s: typeof NEAR, colour: number[], transparent = false): DisplayBuffer => {
    const q: Quad = emptyQuad();
    rectangle(q, s.x0, s.y0, s.x1, s.y1, [0, 0, 1], colour);
    for (let i = 2; i < q.positions.length; i += 3) q.positions[i] = s.z;
    return {
        visible: true, alphaMultiplier: 1, dataVersion: 1, bufferTypes: ["TRIANGLES"], transparent,
        triangleVertices: [new Float32Array(q.positions)], triangleNormals: [new Float32Array(q.normals)],
        triangleColours: [new Float32Array(q.colours)], triangleIndexs: [new Uint32Array(q.indices)], symmetryMatrices: [],
    } as unknown as DisplayBuffer;
};

const PPA = HEIGHT / (48 * base.zoom);
const column = (x: number) => Math.floor(WIDTH / 2 + x * PPA);
const row = (y: number) => Math.floor(HEIGHT / 2 - y * PPA);

/** The transparent picture over white, against the ordinary one: the most any level differs. */
const overWhite = (clear: Uint8ClampedArray, ordinary: Uint8ClampedArray): number => {
    let worst = 0;
    for (let i = 0; i < clear.length; i += 4) {
        const a = clear[i + 3] / 255;
        for (let c = 0; c < 3; c++) {
            worst = Math.max(worst, Math.abs(clear[i + c] * a + 255 * (1 - a) - ordinary[i + c]));
        }
    }
    return worst;
};

export interface FogFadeReport {
    /** Each square's middle in the transparent picture: its colour and alpha. */
    near: number[];
    far: number[];
    middle: number[];
    /** The transparent picture over white against the ordinary one, the most any level differs. */
    peeled: number;
    blended: number;
    blurred: number;
    rendererErrors: string[];
}

export default defineCase(async (_device: GPUDevice): Promise<FogFadeReport> => {
    const rendererErrors: string[] = [];
    const renderer = await WebGPUPreviewRenderer.create(document.createElement("canvas"), message => rendererErrors.push(message));
    const buffers = [square(NEAR, [1, 0, 0, 1]), square(FAR, [0, 1, 0, 1]), square(MIDDLE, [0, 0, 1, 0.5], true)];
    const pair = async (over: Partial<PreviewCameraSource>) => {
        const camera = { ...base, ...over };
        const ordinary = (await renderer.snapshot(buffers, camera, [], WIDTH, HEIGHT)).data;
        const clear = (await renderer.snapshot(buffers, camera, [], WIDTH, HEIGHT, { transparentBackground: true })).data;
        return { ordinary, clear };
    };
    try {
        const peeled = await pair({});
        const at = (data: Uint8ClampedArray, s: typeof NEAR) => {
            const i = (row((s.y0 + s.y1) / 2) * WIDTH + column((s.x0 + s.x1) / 2)) * 4;
            return Array.from(data.slice(i, i + 4));
        };
        const blended = await pair({ doOrderIndependentTransparency: false });
        const blurred = await pair({ useOffScreenBuffers: true, blurSize: 3, blurDepth: 0 });
        return {
            near: at(peeled.clear, NEAR),
            far: at(peeled.clear, FAR),
            middle: at(peeled.clear, MIDDLE),
            peeled: overWhite(peeled.clear, peeled.ordinary),
            blended: overWhite(blended.clear, blended.ordinary),
            blurred: overWhite(blurred.clear, blurred.ordinary),
            rendererErrors,
        };
    } finally {
        renderer.destroy();
    }
});
