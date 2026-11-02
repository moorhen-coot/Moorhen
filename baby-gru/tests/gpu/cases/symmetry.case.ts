/**
 * Symmetry copies (DisplayBuffer.symmetryMatrices) in the WebGPU renderer. A copy drawn through a
 * symmetry operator must look exactly like the same mesh moved there on the CPU - positions and
 * normals both, so it is lit as the moved mesh would be - for meshes and for perfect spheres;
 * and copies of a buffer with changeColourWithSymmetry are drawn in drawBuffer's grey.
 */
import { WebGPUPreviewRenderer } from "../../../src/WebGPUComponents/previewRenderer";
import type { PreviewCameraSource } from "../../../src/WebGPUComponents/previewScene";
import type { DisplayBuffer } from "../../../src/WebGLgComponents/displayBuffer";
import { defineCase } from "../helpers/browserCase";

const WIDTH = 240, HEIGHT = 160;

const camera: PreviewCameraSource = {
    myQuat: [0.2, 0.3, 0, Math.sqrt(1 - 0.13)], origin: [-4, 0, 0], zoom: 0.35, fogClipOffset: 250,
    gl_clipPlane0: [0, 0, -1, -230], gl_clipPlane1: [0, 0, 1, 270], gl_fog_start: 250, gl_fog_end: 290,
    doPerspectiveProjection: false,
    light_positions: [25, 25, 50, 1], light_colours_ambient: [0.2, 0.2, 0.2, 1], light_colours_diffuse: [0.6, 0.6, 0.6, 1],
    light_colours_specular: [0.4, 0.4, 0.4, 1], specularPower: 32, background_colour: [0, 0, 0, 1],
};

/** A quarter turn about z and a shift: an operator that moves and turns. Column-major. */
const OPERATOR = [0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 9, 2, 0, 1];

const apply = (m: number[], p: number[], w: number): number[] =>
    [0, 1, 2].map(r => m[r] * p[0] + m[4 + r] * p[1] + m[8 + r] * p[2] + m[12 + r] * w);

/** An octahedron with flat faces, coloured by face so that a wrong turn shows. */
function octahedron(transform: number[] | null, symmetry: number[][] = [], grey = false): DisplayBuffer {
    const r = 3;
    const corners = [[r, 0, 0], [-r, 0, 0], [0, r, 0], [0, -r, 0], [0, 0, r], [0, 0, -r]];
    const faces = [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]];
    const positions: number[] = [], normals: number[] = [], colours: number[] = [], indices: number[] = [];
    faces.forEach((face, f) => {
        const p = face.map(i => corners[i]);
        const n = [0, 1, 2].map(k => (p[0][k] + p[1][k] + p[2][k]) / 3);
        p.forEach(v => {
            positions.push(...(transform ? apply(transform, v, 1) : v));
            normals.push(...(transform ? apply(transform, n, 0) : n));
            colours.push(0.3 + 0.08 * f, 0.9 - 0.1 * f, 0.4, 1);
        });
        indices.push(3 * f, 3 * f + 1, 3 * f + 2);
    });
    return {
        visible: true, alphaMultiplier: 1, dataVersion: 1, bufferTypes: ["TRIANGLES"],
        triangleVertices: [new Float32Array(positions)], triangleNormals: [new Float32Array(normals)],
        triangleColours: [new Float32Array(colours)], triangleIndexs: [new Uint32Array(indices)],
        symmetryMatrices: symmetry, changeColourWithSymmetry: grey,
    } as unknown as DisplayBuffer;
}

function spheres(transform: number[] | null, symmetry: number[][] = []): DisplayBuffer {
    const centres = [[0, 0, 0], [2.5, 1, 0], [-1, -2.5, 1]];
    const placed = centres.flatMap(c => (transform ? apply(transform, c, 1) : c));
    return {
        visible: true, alphaMultiplier: 1, dataVersion: 1, bufferTypes: ["PERFECT_SPHERES"],
        triangleInstanceOrigins: [new Float32Array(placed)],
        triangleInstanceSizes: [new Float32Array(centres.flatMap(() => [1.4, 1.4, 1.4]))],
        triangleColours: [new Float32Array([0.9, 0.3, 0.2, 1, 0.2, 0.8, 0.3, 1, 0.3, 0.3, 0.9, 1])],
        symmetryMatrices: symmetry, changeColourWithSymmetry: false,
    } as unknown as DisplayBuffer;
}

function differ(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
    let n = 0;
    for (let i = 0; i < a.length; i += 4) {
        if (Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])) > 2) n++;
    }
    return n;
}

function drawn(data: Uint8ClampedArray): number {
    let n = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i] + data[i + 1] + data[i + 2] > 0) n++;
    return n;
}

/** Pixels that are exactly one grey (within a level), apart from shading. */
function greyPixels(data: Uint8ClampedArray): number {
    let n = 0;
    for (let i = 0; i < data.length; i += 4) {
        const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
        if (r > 0 && Math.abs(r - g) <= 1 && Math.abs(g - b) <= 1) n++;
    }
    return n;
}

export interface SymmetryReport {
    meshDrawn: number;
    meshDiffer: number;
    spheresDrawn: number;
    spheresDiffer: number;
    /** With grey copies: the copy's pixels are grey, the original's not. */
    greyCopy: number;
    greyOriginal: number;
    rendererErrors: string[];
}

export default defineCase(async (_device: GPUDevice): Promise<SymmetryReport> => {
    const rendererErrors: string[] = [];
    const renderer = await WebGPUPreviewRenderer.create(document.createElement("canvas"), message => rendererErrors.push(message));
    const shot = async (buffers: DisplayBuffer[]) => (await renderer.snapshot(buffers, camera, [], WIDTH, HEIGHT)).data;
    try {
        const viaSymmetry = await shot([octahedron(null, [OPERATOR])]);
        const moved = await shot([octahedron(null), octahedron(OPERATOR)]);
        const spheresViaSymmetry = await shot([spheres(null, [OPERATOR])]);
        const spheresMoved = await shot([spheres(null), spheres(OPERATOR)]);
        const greyBoth = await shot([octahedron(null, [OPERATOR], true)]);
        const original = await shot([octahedron(null)]);
        return {
            meshDrawn: drawn(viaSymmetry), meshDiffer: differ(viaSymmetry, moved),
            spheresDrawn: drawn(spheresViaSymmetry), spheresDiffer: differ(spheresViaSymmetry, spheresMoved),
            greyCopy: greyPixels(greyBoth) - greyPixels(original),
            greyOriginal: greyPixels(original),
            rendererErrors,
        };
    } finally {
        renderer.destroy();
    }
});
