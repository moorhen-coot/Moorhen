/**
 * Anaglyph stereo in the WebGPU renderer (drawAnaglyph, anaglyphCombine.ts), and labels in every
 * view of a divided canvas (drawViews).
 *
 * What should happen: an anaglyph picture is each eye's picture - the frame drawn with that eye's
 * turn, on nothing, the fog fading it - made grey (its brightest channel) and put in the channels
 * of its filter, over the background; the channels neither eye has are the background. On
 * nothing (a transparent screenshot), the same without the background, as opaque as the more
 * opaque eye. And labels, over everything or depth-tested, show in each view of a side-by-side
 * picture, not only the first.
 */
import { WebGPUPreviewRenderer } from "../../../src/WebGPUComponents/previewRenderer";
import type { PreviewCameraSource } from "../../../src/WebGPUComponents/previewScene";
import type { TextAtlasSource } from "../../../src/WebGPUComponents/textLayer";
import type { DisplayBuffer } from "../../../src/WebGLgComponents/displayBuffer";
import { ANAGLYPH_COLOURS, type AnaglyphColours } from "../../../src/WebGLgComponents/anaglyph";
import { type Quad, emptyQuad, rectangle } from "../reference/surfaceLighting";
import { defineCase } from "../helpers/browserCase";

const WIDTH = 240, HEIGHT = 160;
const BACKGROUND = [0.1, 0.2, 0.3, 1];

const base: PreviewCameraSource = {
    myQuat: [0, 0, 0, 1], origin: [0, 0, 0], zoom: 0.35, fogClipOffset: 250,
    gl_clipPlane0: [0, 0, -1, -230], gl_clipPlane1: [0, 0, 1, 270], gl_fog_start: 245, gl_fog_end: 262,
    doPerspectiveProjection: false,
    light_positions: [25, 25, 50, 1], light_colours_ambient: [0.2, 0.2, 0.2, 1], light_colours_diffuse: [0.6, 0.6, 0.6, 1],
    light_colours_specular: [0.4, 0.4, 0.4, 1], specularPower: 32, background_colour: BACKGROUND,
    canvas: { width: WIDTH, height: HEIGHT },
};

const square = (x0: number, y0: number, x1: number, y1: number, z: number, colour: number[]): DisplayBuffer => {
    const q: Quad = emptyQuad();
    rectangle(q, x0, y0, x1, y1, [0, 0, 1], colour);
    for (let i = 2; i < q.positions.length; i += 3) q.positions[i] = z;
    return {
        visible: true, alphaMultiplier: 1, dataVersion: 1, bufferTypes: ["TRIANGLES"], transparent: false, isHoverBuffer: false,
        triangleVertices: [new Float32Array(q.positions)], triangleNormals: [new Float32Array(q.normals)],
        triangleColours: [new Float32Array(q.colours)], triangleIndexs: [new Uint32Array(q.indices)], symmetryMatrices: [],
    } as unknown as DisplayBuffer;
};

const sphere = (): DisplayBuffer => ({
    visible: true, alphaMultiplier: 1, dataVersion: 1, bufferTypes: ["PERFECT_SPHERES"], isHoverBuffer: false,
    triangleInstanceOrigins: [new Float32Array([-3, 1, 4])],
    triangleInstanceSizes: [new Float32Array([1.5, 1.5, 1.5])],
    triangleColours: [new Float32Array([0.3, 0.4, 0.9, 1])], symmetryMatrices: [],
} as unknown as DisplayBuffer);

/** A green square far back (half faded by the fog), a red one in front, a blue sphere. */
const scene = (): DisplayBuffer[] => [
    square(-6, -4, 6, 4, -3, [0.3, 0.8, 0.3, 1]),
    square(-2, -2, 4, 3, 2, [0.9, 0.2, 0.2, 1]),
    sphere(),
];

const turnY = (angle: number) => [0, Math.sin(angle / 2), 0, Math.cos(angle / 2)];
const EYES = [turnY(0.12), turnY(-0.12)];

/** A label atlas as TextCanvasTexture builds one: one label, a pure green block, at the origin. */
function labelAtlas(): TextAtlasSource {
    const w = 256, h = 128;
    const canvasBig = new OffscreenCanvas(w, h);
    const context = canvasBig.getContext("2d");
    context.fillStyle = "#00ff00";
    context.fillRect(16, 8, 40, 20);
    const t = [16 / w, 8 / h, 56 / w, 28 / h];
    return {
        canvasBig, nBigTextures: 1, revision: 1,
        bigTextureTexOrigins: [[0, 0, 0]],
        bigTextureTexOffsets: [[t[0], t[2] - t[0], t[1], t[3] - t[1]]],
        bigTextureScalings: [[48 * (t[2] - t[0]) * (w / h), 48 * (t[3] - t[1]), 1]],
        bigTextureScreenOffsets: [[0, 0, 0, 0]],
    } as TextAtlasSource;
}

export interface AnaglyphReport {
    /**
     * Per pair of colours: the most a level differs from the eyes' pictures put together, how much
     * the eyes drew, and where each is much the brighter.
     */
    pairs: { colours: string; worst: number; drawn: number; leftOnly: number; rightOnly: number }[];
    /** On nothing: the most a premultiplied level differs, and the alpha where neither eye drew. */
    transparent: { worst: number; emptyAlpha: number; drawn: number };
    /** The eyes differ (the turns are applied). */
    eyesDiffer: number;
    /** Green label pixels in each half of a side-by-side picture, labels over everything and depth-tested. */
    labelsOnTop: number[];
    labelsInScene: number[];
    rendererErrors: string[];
}

export default defineCase(async (_device: GPUDevice): Promise<AnaglyphReport> => {
    const rendererErrors: string[] = [];
    const renderer = await WebGPUPreviewRenderer.create(document.createElement("canvas"), message => rendererErrors.push(message));
    const shot = async (buffers: DisplayBuffer[], over: Partial<PreviewCameraSource>, transparentBackground = false) =>
        (await renderer.snapshot(buffers, { ...base, ...over }, [], WIDTH, HEIGHT, { transparentBackground })).data;
    try {
        // Each eye on nothing, premultiplied again (snapshot straightens it).
        const eyes = await Promise.all(EYES.map(async eye => {
            const data = await shot(scene(), { myQuat: eye }, true);
            const premultiplied = new Float32Array(data.length);
            for (let i = 0; i < data.length; i += 4) {
                const a = data[i + 3] / 255;
                for (let c = 0; c < 3; c++) premultiplied[i + c] = data[i + c] * a;
                premultiplied[i + 3] = data[i + 3];
            }
            return premultiplied;
        }));
        const grey = (eye: Float32Array, i: number) => Math.max(eye[i], eye[i + 1], eye[i + 2]);
        let eyesDiffer = 0;
        for (let i = 0; i < eyes[0].length; i++) eyesDiffer = Math.max(eyesDiffer, Math.abs(eyes[0][i] - eyes[1][i]));

        const anaglyph = { doAnaglyphStereo: true, stereoQuats: EYES };
        const pairs: AnaglyphReport["pairs"] = [];
        for (const colours of ["red-green", "red-cyan", "green-magenta"] as AnaglyphColours[]) {
            const data = await shot(scene(), { ...anaglyph, anaglyphColours: colours });
            const { left, right } = ANAGLYPH_COLOURS[colours];
            let worst = 0, drawn = 0, leftOnly = 0, rightOnly = 0;
            for (let i = 0; i < data.length; i += 4) {
                const [l, r] = eyes;
                if (l[i + 3] > 128 || r[i + 3] > 128) drawn++;
                if (grey(l, i) - grey(r, i) > 60) leftOnly++;
                if (grey(r, i) - grey(l, i) > 60) rightOnly++;
                for (let c = 0; c < 3; c++) {
                    const bg = BACKGROUND[c] * 255;
                    const expected = left[c] ? grey(l, i) + bg * (1 - l[i + 3] / 255)
                        : right[c] ? grey(r, i) + bg * (1 - r[i + 3] / 255) : bg;
                    worst = Math.max(worst, Math.abs(data[i + c] - expected));
                }
            }
            pairs.push({ colours, worst, drawn, leftOnly, rightOnly });
        }

        // On nothing, red and green.
        const onNothing = await shot(scene(), anaglyph, true);
        let worst = 0, emptyAlpha = 0, drawn = 0;
        for (let i = 0; i < onNothing.length; i += 4) {
            const [l, r] = eyes;
            const a = onNothing[i + 3];
            worst = Math.max(worst, Math.abs(a - Math.max(l[i + 3], r[i + 3])));
            const expected = [grey(l, i), grey(r, i), 0];
            for (let c = 0; c < 3; c++) worst = Math.max(worst, Math.abs(onNothing[i + c] * a / 255 - expected[c]));
            if (l[i + 3] === 0 && r[i + 3] === 0) emptyAlpha = Math.max(emptyAlpha, a);
            if (a > 128) drawn++;
        }

        // Labels in each half of a side-by-side picture, on a black background with nothing else.
        const labels = async (atomLabelDepthMode: boolean) => {
            const data = await shot([], {
                background_colour: [0, 0, 0, 1], labelsTextCanvasTexture: labelAtlas(), atomLabelDepthMode,
                doSideBySideStereo: true, stereoQuats: EYES,
                stereoViewports: [[0, 0, WIDTH / 2, HEIGHT], [WIDTH / 2, 0, WIDTH / 2, HEIGHT]],
            } as Partial<PreviewCameraSource>);
            const counts = [0, 0];
            for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) {
                const i = (y * WIDTH + x) * 4;
                if (data[i + 1] > 200 && data[i] < 60 && data[i + 2] < 60) counts[x < WIDTH / 2 ? 0 : 1]++;
            }
            return counts;
        };

        return {
            pairs,
            transparent: { worst, emptyAlpha, drawn },
            eyesDiffer,
            labelsOnTop: await labels(false),
            labelsInScene: await labels(true),
            rendererErrors,
        };
    } finally {
        renderer.destroy();
    }
});
