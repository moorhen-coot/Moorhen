/**
 * Two things from drawCore: what is being dragged (transformMatrixInteractive) is drawn where the
 * drag has put it - meshes, perfect spheres and lines, each against the same thing moved there on
 * the CPU - and textured shapes are drawn as planes of values coloured, nearest texel, through
 * their ramp.
 */
import { WebGPUPreviewRenderer } from "../../../src/WebGPUComponents/previewRenderer";
import type { PreviewCameraSource } from "../../../src/WebGPUComponents/previewScene";
import { interactiveModel } from "../../../src/WebGPUComponents/previewScene";
import type { TexturedShapeSource } from "../../../src/WebGPUComponents/texturedShapes";
import type { DisplayBuffer } from "../../../src/WebGLgComponents/displayBuffer";
import { defineCase } from "../helpers/browserCase";

const WIDTH = 240, HEIGHT = 160;

const camera = (over: Partial<PreviewCameraSource> = {}): PreviewCameraSource => ({
    myQuat: [0.2, 0.3, 0, Math.sqrt(1 - 0.13)], origin: [-1, 0, 0], zoom: 0.35, fogClipOffset: 250,
    gl_clipPlane0: [0, 0, -1, -230], gl_clipPlane1: [0, 0, 1, 270], gl_fog_start: 250, gl_fog_end: 290,
    doPerspectiveProjection: false,
    light_positions: [25, 25, 50, 1], light_colours_ambient: [0.2, 0.2, 0.2, 1], light_colours_diffuse: [0.6, 0.6, 0.6, 1],
    light_colours_specular: [0.4, 0.4, 0.4, 1], specularPower: 32, background_colour: [0, 0, 0, 1],
    mapLineWidth: 2,
    ...over,
});

/** A quarter turn about z and a shift, about the fragment's centre (world (3, 1, 0) with the view origin (-1, 0, 0)). */
const DRAG = [0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 4, -2, 1, 1];
const CENTRE = [2, 1, 0];

const apply = (m: ArrayLike<number>, p: number[], w = 1): number[] =>
    [0, 1, 2].map(r => m[r] * p[0] + m[4 + r] * p[1] + m[8 + r] * p[2] + m[12 + r] * w);

function octahedron(model: ArrayLike<number> | null): DisplayBuffer {
    const r = 3, c = [3, 1, 0];
    const corners = [[r, 0, 0], [-r, 0, 0], [0, r, 0], [0, -r, 0], [0, 0, r], [0, 0, -r]];
    const faces = [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]];
    const positions: number[] = [], normals: number[] = [], colours: number[] = [], indices: number[] = [];
    faces.forEach((face, f) => {
        face.map(i => corners[i]).forEach(v => {
            const p = [c[0] + v[0], c[1] + v[1], c[2] + v[2]];
            positions.push(...(model ? apply(model, p) : p));
            normals.push(0, 0, 1);
            colours.push(0.9, 0.5, 0.2, 1);
        });
        indices.push(3 * f, 3 * f + 1, 3 * f + 2);
    });
    return {
        visible: true, alphaMultiplier: 1, dataVersion: 1, bufferTypes: ["TRIANGLES"],
        triangleVertices: [new Float32Array(positions)], triangleNormals: [new Float32Array(normals)],
        triangleColours: [new Float32Array(colours)], triangleIndexs: [new Uint32Array(indices)], symmetryMatrices: [],
    } as unknown as DisplayBuffer;
}

function spheres(model: ArrayLike<number> | null): DisplayBuffer {
    const centres = [[3, 1, 0], [5, 1, 0], [3, 4, 0]];
    return {
        visible: true, alphaMultiplier: 1, dataVersion: 1, bufferTypes: ["PERFECT_SPHERES"],
        triangleInstanceOrigins: [new Float32Array(centres.flatMap(p => (model ? apply(model, p) : p)))],
        triangleInstanceSizes: [new Float32Array(centres.flatMap(() => [1, 1, 1]))],
        triangleColours: [new Float32Array(centres.flatMap(() => [0.2, 0.8, 0.3, 1]))], symmetryMatrices: [],
    } as unknown as DisplayBuffer;
}

function lines(model: ArrayLike<number> | null): DisplayBuffer {
    const ends = [[0, 0, 0], [6, 2, 0], [6, 2, 0], [2, 5, 0]];
    const placed = ends.flatMap(p => (model ? apply(model, p) : p));
    return {
        visible: true, alphaMultiplier: 1, dataVersion: 1, bufferTypes: ["LINES"],
        triangleVertices: [new Float32Array(placed)], triangleColours: [new Float32Array(ends.flatMap(() => [1, 1, 0, 1]))],
        triangleIndexs: [new Uint32Array([])], supplementary: { useIndices: [false] }, symmetryMatrices: [],
    } as unknown as DisplayBuffer;
}

/** Pixels drawn in one and not the other (the dragged meshes glow, so colours differ; shapes must not). */
function maskDiffer(a: Uint8ClampedArray, b: Uint8ClampedArray): { drawn: number; differ: number } {
    let drawn = 0, differ = 0;
    for (let i = 0; i < a.length; i += 4) {
        const inA = a[i] + a[i + 1] + a[i + 2] > 0, inB = b[i] + b[i + 1] + b[i + 2] > 0;
        if (inA) drawn++;
        if (inA !== inB) differ++;
    }
    return { drawn, differ };
}

export interface DragAndShapesReport {
    mesh: { drawn: number; differ: number };
    spheres: { drawn: number; differ: number };
    lines: { drawn: number; differ: number };
    /** And it really moved: the undragged picture differs. */
    meshMoved: number;
    /** Grey levels at the centres of the shape's 4 x 2 texels, and what the ramp gives. */
    shape: { got: number[]; expected: number[]; drawn: number };
    rendererErrors: string[];
}

export default defineCase(async (_device: GPUDevice): Promise<DragAndShapesReport> => {
    const rendererErrors: string[] = [];
    const renderer = await WebGPUPreviewRenderer.create(document.createElement("canvas"), message => rendererErrors.push(message));
    const shot = async (buffers: DisplayBuffer[], source = camera()) => (await renderer.snapshot(buffers, source, [], WIDTH, HEIGHT)).data;
    const dragged = <T extends DisplayBuffer>(buffer: T): T => {
        buffer.transformMatrixInteractive = DRAG;
        buffer.transformOriginInteractive = CENTRE.map((x, i) => x + camera().origin[i]);
        return buffer;
    };
    try {
        const model = interactiveModel(DRAG, CENTRE.map((x, i) => x + camera().origin[i]), camera().origin);
        const meshDragged = await shot([dragged(octahedron(null))]);
        const meshMovedOnCpu = await shot([octahedron(model)]);
        const meshStill = await shot([octahedron(null)]);
        const spheresDragged = await shot([dragged(spheres(null))]);
        const spheresMovedOnCpu = await shot([spheres(model)]);
        const linesDragged = await shot([dragged(lines(null))]);
        const linesMovedOnCpu = await shot([lines(model)]);

        // A 4 x 2 plane of values, 8 x 4 A, centred in an unturned view; ramp black to white in 256.
        const values = new Float32Array([0.1, 0.3, 0.5, 0.7, 0.9, 0.2, 0.4, 0.6]);
        const ramp = new Float32Array(256 * 4);
        for (let i = 0; i < 256; i++) ramp.set([i / 256, i / 256, i / 256, 1], 4 * i);
        const shapeSource: TexturedShapeSource = {
            width: 4, height: 2, x_size: 8, y_size: 4, z_position: 0, imageData: values, colourRamp: ramp, revision: 1,
        };
        const flat = camera({ myQuat: [0, 0, 0, 1], origin: [-4, -2, 0], store: { getState: () => ({ glRef: { texturedShapes: [shapeSource] } }) } });
        const shape = await renderer.snapshot([], flat, [], WIDTH, HEIGHT);
        // Texel centres: (x + 0.5) A of 8 across, (y + 0.5) of 4 up; 1 A = HEIGHT / (48 x zoom) pixels.
        const ppa = HEIGHT / (48 * 0.35);
        const got: number[] = [], expected: number[] = [];
        for (let ty = 0; ty < 2; ty++) for (let tx = 0; tx < 4; tx++) {
            const px = Math.floor(WIDTH / 2 + ((tx + 0.5) * 2 - 4) * ppa);
            const py = Math.floor(HEIGHT / 2 - ((ty + 0.5) * 2 - 2) * ppa);
            got.push(shape.data[(py * WIDTH + px) * 4]);
            expected.push(Math.round(255 * Math.floor(values[ty * 4 + tx] * 256) / 256));
        }

        return {
            mesh: maskDiffer(meshDragged, meshMovedOnCpu),
            spheres: maskDiffer(spheresDragged, spheresMovedOnCpu),
            lines: maskDiffer(linesDragged, linesMovedOnCpu),
            meshMoved: maskDiffer(meshDragged, meshStill).differ,
            shape: { got, expected, drawn: shape.report.shapes },
            rendererErrors,
        };
    } finally {
        renderer.destroy();
    }
});
