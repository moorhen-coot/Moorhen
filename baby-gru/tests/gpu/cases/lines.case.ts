/**
 * LINES and NORMALLINES from DisplayBuffers in the WebGPU renderer, as buildBuffers and drawCore
 * draw them in WebGL: a quad per segment, 2 x pixelZoom x size^2 across (pixelZoom 0.04 x zoom x
 * the primitive size, size the map line width), between index pairs or between the vertices
 * taken in pairs, coloured by the segment's first vertex (indexed), by each end (not), or by
 * customColour; NORMALLINES lit.
 *
 * Orthographic, unrotated, so a segment along x is a rectangle whose size in pixels is known.
 */
import { WebGPUPreviewRenderer } from "../../../src/WebGPUComponents/previewRenderer";
import type { PreviewCameraSource } from "../../../src/WebGPUComponents/previewScene";
import { frameUniforms } from "../../../src/WebGPUComponents/previewScene";
import type { DisplayBuffer } from "../../../src/WebGLgComponents/displayBuffer";
import { defineCase } from "../helpers/browserCase";

const WIDTH = 240, HEIGHT = 160;

const camera = (mapLineWidth = 1): PreviewCameraSource => ({
    myQuat: [0, 0, 0, 1], origin: [0, 0, 0], zoom: 0.5, fogClipOffset: 250,
    gl_clipPlane0: [0, 0, -1, -230], gl_clipPlane1: [0, 0, 1, 270], gl_fog_start: 250, gl_fog_end: 290,
    doPerspectiveProjection: false,
    light_positions: [25, 25, 50, 1], light_colours_ambient: [0.2, 0.2, 0.2, 1], light_colours_diffuse: [0.6, 0.6, 0.6, 1],
    light_colours_specular: [0.4, 0.4, 0.4, 1], specularPower: 32, background_colour: [0, 0, 0, 1],
    mapLineWidth,
});

interface LineOptions {
    type?: "LINES" | "NORMALLINES";
    indexed?: boolean;
    custom?: number[];
    primitiveSize?: number;
}

const RED = [1, 0, 0, 1], BLUE = [0, 0, 1, 1];

/** One segment from (-8, 0, 0), red, to (8, 0, 0), blue. */
function segment({ type = "LINES", indexed = true, custom, primitiveSize }: LineOptions = {}): DisplayBuffer {
    // Indexed buffers list the end first, to check the pairs are followed.
    const vertices = indexed ? [8, 0, 0, -8, 0, 0] : [-8, 0, 0, 8, 0, 0];
    const colours = indexed ? [...BLUE, ...RED] : [...RED, ...BLUE];
    return {
        visible: true, alphaMultiplier: 1, dataVersion: 1, bufferTypes: [type],
        triangleVertices: [new Float32Array(vertices)],
        triangleNormals: [new Float32Array([0, 0.6, 0.8, 0, 0.6, 0.8])],
        triangleColours: [new Float32Array(colours)],
        triangleIndexs: [new Uint32Array(indexed ? [1, 0] : [])],
        supplementary: type === "LINES" ? { useIndices: [indexed] } : { useIndices: indexed ? [true] : undefined },
        customColour: custom ?? null,
        primitiveSizes: primitiveSize ? [[primitiveSize]] : undefined,
        symmetryMatrices: [],
    } as unknown as DisplayBuffer;
}

interface Measured {
    /** Rows and columns with anything drawn. */
    rows: number;
    columns: number;
    /** The colour at the left end and the right end, a little inside. */
    left: number[];
    right: number[];
}

function measure(data: Uint8ClampedArray, source: PreviewCameraSource): Measured {
    let top = HEIGHT, bottom = -1, first = WIDTH, last = -1;
    for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) {
        const i = (y * WIDTH + x) * 4;
        if (data[i] + data[i + 1] + data[i + 2] > 0) {
            top = Math.min(top, y); bottom = Math.max(bottom, y);
            first = Math.min(first, x); last = Math.max(last, x);
        }
    }
    const pixel = (x: number) => {
        const y = Math.round(HEIGHT / 2 - 0.5);
        const i = (y * WIDTH + x) * 4;
        return [data[i], data[i + 1], data[i + 2]];
    };
    void source;
    return { rows: bottom - top + 1, columns: last - first + 1, left: pixel(first + 3), right: pixel(last - 3) };
}

/** Pixels per angstrom, from the camera the renderer uses. */
function pixelsPerAngstrom(source: PreviewCameraSource): number {
    const f = frameUniforms(source, WIDTH, HEIGHT);
    return f[5] * HEIGHT / 2;
}

export interface LinesReport {
    pixelsPerAngstrom: number;
    /** Expected thickness in pixels for each width setting, and what was drawn. */
    thin: Measured & { expectedRows: number };
    thick: Measured & { expectedRows: number };
    sized: Measured & { expectedRows: number };
    expectedColumns: number;
    unindexed: Measured;
    custom: Measured;
    lit: Measured;
    rendererErrors: string[];
}

export default defineCase(async (_device: GPUDevice): Promise<LinesReport> => {
    const rendererErrors: string[] = [];
    const renderer = await WebGPUPreviewRenderer.create(document.createElement("canvas"), message => rendererErrors.push(message));
    const shot = async (buffer: DisplayBuffer, source: PreviewCameraSource) =>
        measure((await renderer.snapshot([buffer], source, [], WIDTH, HEIGHT)).data, source);
    try {
        const ppa = pixelsPerAngstrom(camera());
        // Half width 0.04 x zoom x primitive size x line width^2, each side.
        const rows = (lineWidth: number, primitiveSize = 1) => 2 * 0.04 * 0.5 * primitiveSize * lineWidth * lineWidth * ppa;
        return {
            pixelsPerAngstrom: ppa,
            thin: { ...(await shot(segment(), camera(1))), expectedRows: rows(1) },
            thick: { ...(await shot(segment(), camera(3))), expectedRows: rows(3) },
            sized: { ...(await shot(segment({ primitiveSize: 2 }), camera(2))), expectedRows: rows(2, 2) },
            expectedColumns: 16 * ppa,
            unindexed: await shot(segment({ indexed: false }), camera(3)),
            custom: await shot(segment({ custom: [0, 1, 0, 1] }), camera(3)),
            lit: await shot(segment({ type: "NORMALLINES" }), camera(3)),
            rendererErrors,
        };
    } finally {
        renderer.destroy();
    }
});
