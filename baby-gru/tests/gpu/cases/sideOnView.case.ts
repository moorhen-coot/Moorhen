/**
 * The clip, fog and blur widget's side-on view, both ways it is drawn:
 *
 * - WebGL (src/WebGLgComponents/sideOnView.ts): meshes, spheres and LINES (as GL lines) where the
 *   widget's matrices put them; a sub-buffer copied once, again only when its data changes, and
 *   let go when its buffer leaves the scene;
 * - WebGPU (sideOnCamera.ts, WebGPUPreviewRenderer.renderTo): the same picture from the main
 *   view's renderer, drawn into another canvas without uploading anything the main view's frame
 *   had already uploaded.
 *
 * The scene, seen by a main view looking down -z (no turn): a red sphere 10 A towards the viewer,
 * a blue one 8 A up, and a green line 3 A away from the viewer, running up. From the side the
 * viewer is on the left: the red sphere is left of centre, the blue one above the centre, and the
 * line a little right of it, below.
 */
import * as mat4 from "gl-matrix/mat4";
import { SideOnWebGLView } from "../../../src/WebGLgComponents/sideOnView";
import { quatToMat4 } from "../../../src/WebGLgComponents/quatToMat4.js";
import { WebGPUPreviewRenderer } from "../../../src/WebGPUComponents/previewRenderer";
import type { PreviewCameraSource } from "../../../src/WebGPUComponents/previewScene";
import { sideOnCamera } from "../../../src/WebGPUComponents/sideOnCamera";
import type { DisplayBuffer } from "../../../src/WebGLgComponents/displayBuffer";
import { defineCase } from "../helpers/browserCase";

const WIDTH = 300, HEIGHT = 180, HALF = 20;

function spheres(): DisplayBuffer {
    return {
        visible: true, alphaMultiplier: 1, dataVersion: 1, bufferTypes: ["PERFECT_SPHERES"],
        triangleInstanceOrigins: [new Float32Array([0, 0, 10, 0, 8, 0])],
        triangleInstanceSizes: [new Float32Array([2, 2, 2, 2, 2, 2])],
        triangleColours: [new Float32Array([1, 0, 0, 1, 0, 0, 1, 1])],
        triangleVertices: [new Float32Array(6)], triangleNormals: [new Float32Array(6)], triangleIndexs: [new Uint32Array([0, 1])],
        symmetryMatrices: [], supplementary: {},
    } as unknown as DisplayBuffer;
}

function line(): DisplayBuffer {
    return {
        visible: true, alphaMultiplier: 1, dataVersion: 1, bufferTypes: ["LINES"],
        triangleVertices: [new Float32Array([0, -15, -3, 0, -6, -3])],
        triangleColours: [new Float32Array([0, 1, 0, 1, 0, 1, 0, 1])],
        triangleIndexs: [new Uint32Array([0, 1])],
        triangleNormals: [new Float32Array(6)],
        symmetryMatrices: [], supplementary: { useIndices: [true] },
    } as unknown as DisplayBuffer;
}

const main: PreviewCameraSource = {
    myQuat: [0, 0, 0, 1], origin: [0, 0, 0], zoom: 1, fogClipOffset: 250,
    gl_clipPlane0: [0, 0, -1, -230], gl_clipPlane1: [0, 0, 1, 270], gl_fog_start: 250, gl_fog_end: 290,
    doPerspectiveProjection: false,
    light_positions: [25, 25, 50, 1], light_colours_ambient: [0.2, 0.2, 0.2, 1], light_colours_diffuse: [0.5, 0.5, 0.5, 1],
    light_colours_specular: [0.5, 0.5, 0.5, 1], specularPower: 32, background_colour: [0, 0, 0, 1],
};

/** Where the widget's projection puts a point of the side-on eye plane (x, y in A), in pixels from the top left. */
const pixelOf = (x: number, y: number): [number, number] =>
    [Math.floor((x / HALF + 1) / 2 * WIDTH), Math.floor((1 - y / (HALF * HEIGHT / WIDTH)) / 2 * HEIGHT)];

type Rgb = [number, number, number];
const at = (data: ArrayLike<number>, [x, y]: [number, number], flipped = false): Rgb => {
    const row = flipped ? HEIGHT - 1 - y : y;
    const i = (row * WIDTH + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
};

export interface SideOnReport {
    unavailable?: string;
    /** Centre pixels of the red and blue spheres, and a point of the green line, WebGL then WebGPU. */
    webgl: { red: Rgb; blue: Rgb; green: Rgb; empty: Rgb };
    webgpu: { red: Rgb; blue: Rgb; green: Rgb; empty: Rgb };
    /** Sub-buffers copied by the WebGL view: first draw, the same again, one buffer's data changed, one buffer gone. */
    copied: number[];
    glErrors: number[];
    /** Uploads by the main view's frame, then by renderTo into another canvas. */
    uploads: { main: number; other: number };
    rendererErrors: string[];
}

export default defineCase(async (_device: GPUDevice): Promise<SideOnReport> => {
    const red: [number, number] = pixelOf(-10, 0), blue = pixelOf(0, 8), green = pixelOf(3, -10), empty = pixelOf(10, 6);

    // WebGL, with the widget's matrices (MoorhenSlidersSettings draw3D).
    const glCanvas = document.createElement("canvas");
    glCanvas.width = WIDTH;
    glCanvas.height = HEIGHT;
    const gl = glCanvas.getContext("webgl2", { preserveDrawingBuffer: true, antialias: false });
    if (!gl) return { unavailable: "no WebGL2" } as SideOnReport;
    const projection = mat4.ortho(mat4.create(), -HALF, HALF, -HALF * HEIGHT / WIDTH, HALF * HEIGHT / WIDTH, 0.1, 1000);
    const modelView = mat4.fromValues(0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, -100, 1);
    mat4.multiply(modelView, modelView, quatToMat4(main.myQuat) as mat4.mat4);
    const view = new SideOnWebGLView(gl);
    const ball = spheres(), stick = line();
    const copied: number[] = [];
    copied.push(view.draw([ball, stick], projection, modelView, WIDTH, HEIGHT, [0.5, 0.5, 0.5, 1]));
    const pixels = new Uint8Array(WIDTH * HEIGHT * 4);
    gl.readPixels(0, 0, WIDTH, HEIGHT, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    const webgl = { red: at(pixels, red, true), blue: at(pixels, blue, true), green: at(pixels, green, true), empty: at(pixels, empty, true) };
    copied.push(view.draw([ball, stick], projection, modelView, WIDTH, HEIGHT, [0.5, 0.5, 0.5, 1]));
    (ball as { dataVersion: number }).dataVersion++;
    copied.push(view.draw([ball, stick], projection, modelView, WIDTH, HEIGHT, [0.5, 0.5, 0.5, 1]));
    copied.push(view.draw([ball], projection, modelView, WIDTH, HEIGHT, [0.5, 0.5, 0.5, 1]));
    view.destroy();
    const glErrors: number[] = [];
    for (let e = gl.getError(); e !== gl.NO_ERROR; e = gl.getError()) glErrors.push(e);

    // WebGPU: the main view's frame, then the side view into another canvas, and the same side
    // view as a snapshot, to look at.
    const rendererErrors: string[] = [];
    const mainCanvas = document.createElement("canvas");
    mainCanvas.width = 200;
    mainCanvas.height = 150;
    const renderer = await WebGPUPreviewRenderer.create(mainCanvas, message => rendererErrors.push(message));
    try {
        const buffers = [spheres(), line()];
        const first = renderer.render(buffers, main);
        const otherCanvas = document.createElement("canvas");
        otherCanvas.width = WIDTH;
        otherCanvas.height = HEIGHT;
        const camera = sideOnCamera(main, HALF, WIDTH, HEIGHT);
        const other = renderer.renderTo(otherCanvas, buffers, camera);
        renderer.releaseCanvas(otherCanvas);
        const shot = await renderer.snapshot(buffers, camera, [], WIDTH, HEIGHT);
        const webgpu = { red: at(shot.data, red), blue: at(shot.data, blue), green: at(shot.data, green), empty: at(shot.data, empty) };
        return { webgl, webgpu, copied, glErrors, uploads: { main: first.uploads, other: other.uploads }, rendererErrors };
    } finally {
        renderer.destroy();
    }
});
