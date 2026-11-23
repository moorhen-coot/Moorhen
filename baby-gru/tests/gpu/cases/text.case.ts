/**
 * Text labels in the WebGPU renderer, from an atlas built as TextCanvasTexture builds one: a
 * label is as many pixels on screen as its glyphs are in the atlas, its bottom-left corner on its
 * point; labels with a screen offset sit beside their vector; labels are over everything unless
 * atomLabelDepthMode puts them in the scene; and the atlas is copied again when, and only when,
 * its revision moves. And the line overlays drawn with them: the FPS meter, in its own square
 * frame at the bottom left, and the on-screen measuring lines.
 */
import { WebGPUPreviewRenderer } from "../../../src/WebGPUComponents/previewRenderer";
import type { PreviewCameraSource } from "../../../src/WebGPUComponents/previewScene";
import type { TextAtlasSource } from "../../../src/WebGPUComponents/textLayer";
import type { DisplayBuffer } from "../../../src/WebGLgComponents/displayBuffer";
import { defineCase } from "../helpers/browserCase";

const WIDTH = 240, HEIGHT = 160;
const ATLAS_W = 256, ATLAS_H = 128;
/** The "glyphs": a 40 x 20 block at (16, 8) in the atlas. */
const BLOCK = { x: 16, y: 8, w: 40, h: 20 };

function atlas(colour: string, screenOffset: number[] = [0, 0, 0, 0]): TextAtlasSource & { context: OffscreenCanvasRenderingContext2D } {
    const canvasBig = new OffscreenCanvas(ATLAS_W, ATLAS_H);
    const context = canvasBig.getContext("2d");
    context.fillStyle = colour;
    context.fillRect(BLOCK.x, BLOCK.y, BLOCK.w, BLOCK.h);
    // As addBigTextureTextImage: texture coordinates, then size from them.
    const t = [BLOCK.x / ATLAS_W, BLOCK.y / ATLAS_H, (BLOCK.x + BLOCK.w) / ATLAS_W, (BLOCK.y + BLOCK.h) / ATLAS_H];
    return {
        canvasBig, context, nBigTextures: 1, revision: 1,
        bigTextureTexOrigins: [[0, 0, 0]],
        bigTextureTexOffsets: [[t[0], t[2] - t[0], t[1], t[3] - t[1]]],
        bigTextureScalings: [[48 * (t[2] - t[0]) * (ATLAS_W / ATLAS_H), 48 * (t[3] - t[1]), 1]],
        bigTextureScreenOffsets: [screenOffset],
    };
}

const camera = (over: Partial<PreviewCameraSource> = {}): PreviewCameraSource => ({
    myQuat: [0, 0, 0, 1], origin: [0, 0, 0], zoom: 0.5, fogClipOffset: 250,
    gl_clipPlane0: [0, 0, -1, -230], gl_clipPlane1: [0, 0, 1, 270], gl_fog_start: 250, gl_fog_end: 290,
    doPerspectiveProjection: false,
    light_positions: [25, 25, 50, 1], light_colours_ambient: [0.2, 0.2, 0.2, 1], light_colours_diffuse: [0.6, 0.6, 0.6, 1],
    light_colours_specular: [0.4, 0.4, 0.4, 1], specularPower: 32, background_colour: [0, 0, 0, 1],
    ...over,
});

/** A grey square in front of the view centre, covering it. */
function wall(): DisplayBuffer {
    const z = 5, r = 6;
    return {
        visible: true, alphaMultiplier: 1, dataVersion: 1, bufferTypes: ["TRIANGLES"],
        triangleVertices: [new Float32Array([-r, -r, z, r, -r, z, r, r, z, -r, r, z])],
        triangleNormals: [new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1])],
        triangleColours: [new Float32Array([0.5, 0.5, 0.5, 1, 0.5, 0.5, 0.5, 1, 0.5, 0.5, 0.5, 1, 0.5, 0.5, 0.5, 1])],
        triangleIndexs: [new Uint32Array([0, 1, 2, 0, 2, 3])],
        symmetryMatrices: [],
    } as unknown as DisplayBuffer;
}

interface Box { left: number; right: number; top: number; bottom: number; count: number }

/** The box of pixels of `channel` (0 red, 1 green), right and bottom exclusive. */
function box(data: Uint8ClampedArray, channel: number): Box {
    let left = WIDTH, right = 0, top = HEIGHT, bottom = 0, count = 0;
    for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) {
        const i = (y * WIDTH + x) * 4;
        const others = [0, 1, 2].filter(c => c !== channel).map(c => data[i + c]);
        if (data[i + channel] > 200 && Math.max(...others) < 60) {
            left = Math.min(left, x); right = Math.max(right, x + 1);
            top = Math.min(top, y); bottom = Math.max(bottom, y + 1);
            count++;
        }
    }
    return { left, right, top, bottom, count };
}

/** The box of pixels unlike `background`. */
function anyBox(data: Uint8ClampedArray, background: number[]): Box {
    let left = WIDTH, right = 0, top = HEIGHT, bottom = 0, count = 0;
    for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) {
        const i = (y * WIDTH + x) * 4;
        if (Math.abs(data[i] - background[0]) + Math.abs(data[i + 1] - background[1]) + Math.abs(data[i + 2] - background[2]) > 30) {
            left = Math.min(left, x); right = Math.max(right, x + 1);
            top = Math.min(top, y); bottom = Math.max(bottom, y + 1);
            count++;
        }
    }
    return { left, right, top, bottom, count };
}

export interface TextReport {
    width: number;
    height: number;
    plain: Box;
    labels: number;
    offset: Box;
    overWall: Box;
    behindWall: Box;
    staleRevision: { red: number; green: number };
    newRevision: { red: number; green: number };
    /** The FPS meter's pixels (anything not background), and how many overlay segments were drawn. */
    fps: Box & { segments: number };
    /** Measuring lines: two points, joined, each with its little box. */
    measure: Box & { segments: number };
    rendererErrors: string[];
}

export default defineCase(async (_device: GPUDevice): Promise<TextReport> => {
    const rendererErrors: string[] = [];
    const renderer = await WebGPUPreviewRenderer.create(document.createElement("canvas"), message => rendererErrors.push(message));
    const shot = (buffers: DisplayBuffer[], source: PreviewCameraSource) => renderer.snapshot(buffers, source, [], WIDTH, HEIGHT);
    try {
        const labelled = atlas("#ff0000");
        const plain = await shot([], camera({ measureTextCanvasTexture: labelled }));
        // Beside the vector (1, 0, 0) - across it on the screen is up - 3 units away.
        const offset = (await shot([], camera({ labelsTextCanvasTexture: atlas("#ff0000", [1, 0, 0, 3]) }))).data;
        const overWall = (await shot([wall()], camera({ measureTextCanvasTexture: labelled }))).data;
        const behindWall = (await shot([wall()], camera({ measureTextCanvasTexture: labelled, atomLabelDepthMode: true }))).data;

        // Repainted without a new revision: the old copy is drawn. Then with one: the new.
        labelled.context.fillStyle = "#00ff00";
        labelled.context.fillRect(BLOCK.x, BLOCK.y, BLOCK.w, BLOCK.h);
        const stale = (await shot([], camera({ measureTextCanvasTexture: labelled }))).data;
        labelled.revision = 2;
        const fresh = (await shot([], camera({ measureTextCanvasTexture: labelled }))).data;

        const mspfArray = Array.from({ length: 60 }, (_, i) => 10 + i * 2);
        const fps = await shot([], camera({ showFPS: true, mspfArray, background_colour: [1, 1, 1, 1] }));
        // Points in the 48-unit screen frame, y down: from left of centre to right and up.
        const measure = await shot([], camera({ measurePointsArray: [{ x: -10, y: 0 }, { x: 10, y: -8 }] }));

        return {
            width: WIDTH, height: HEIGHT,
            fps: { ...anyBox(fps.data, [255, 255, 255]), segments: fps.report.overlaySegments },
            measure: { ...anyBox(measure.data, [0, 0, 0]), segments: measure.report.overlaySegments },
            plain: box(plain.data, 0), labels: plain.report.labels,
            offset: box(offset, 0),
            overWall: box(overWall, 0), behindWall: box(behindWall, 0),
            staleRevision: { red: box(stale, 0).count, green: box(stale, 1).count },
            newRevision: { red: box(fresh, 0).count, green: box(fresh, 1).count },
            rendererErrors,
        };
    } finally {
        renderer.destroy();
    }
});
