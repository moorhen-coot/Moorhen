/**
 * The WebGPU preview renderer draws: a DisplayBuffer mesh (whole, and in chunks as a too-big
 * mesh would be), and a GPU-resident map contour as a surface, thick lines and lit lines. Each is
 * drawn into a small canvas and the pixels of its colour counted; the test checks that something
 * of the right colour appeared and that WebGPU reported no errors.
 *
 * Not a picture comparison: that belongs with the WebGL-against-WebGPU tests, when there are
 * enough primitives to compare whole scenes.
 */
import { WebGPUPreviewRenderer } from "../../../src/WebGPUComponents/previewRenderer";
import type { PreviewGpuDraw } from "../../../src/WebGPUComponents/previewRenderer";
import type { PreviewCameraSource } from "../../../src/WebGPUComponents/previewScene";
import type { DisplayBuffer } from "../../../src/WebGLgComponents/displayBuffer";
import { GpuIsosurface, GpuMapGrid, MapContourKernels } from "../../../src/WebGPUComponents/mapContour/gpuMapContour";
import { defineCase } from "../helpers/browserCase";

const SIZE = 192;

const camera: PreviewCameraSource = {
    myQuat: [0.2, 0.3, 0, Math.sqrt(1 - 0.13)], origin: [-12, -12, -12], zoom: 0.4, fogClipOffset: 250,
    gl_clipPlane0: [0, 0, -1, -230], gl_clipPlane1: [0, 0, 1, 270], gl_fog_start: 250, gl_fog_end: 290,
    doPerspectiveProjection: false,
    light_positions: [10, 10, 60, 1], light_colours_ambient: [0.2, 0.2, 0.2, 1], light_colours_diffuse: [0.6, 0.6, 0.6, 1],
    light_colours_specular: [0.4, 0.4, 0.4, 1], specularPower: 64, background_colour: [0, 0, 0, 1],
};

/** A closed octahedron around (12, 12, 12), 8 A across, red, as a DisplayBuffer holds one. */
function octahedronBuffer(): DisplayBuffer {
    const c = 12, r = 4;
    const corners = [[r, 0, 0], [-r, 0, 0], [0, r, 0], [0, -r, 0], [0, 0, r], [0, 0, -r]];
    const faces = [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]];
    const positions: number[] = [], normals: number[] = [], colours: number[] = [], indices: number[] = [];
    faces.forEach((face, f) => {
        const p = face.map(i => corners[i]);
        const n = [0, 1, 2].map(k => (p[0][k] + p[1][k] + p[2][k]) / 3);
        const length = Math.hypot(...n);
        p.forEach(v => {
            positions.push(c + v[0], c + v[1], c + v[2]);
            normals.push(n[0] / length, n[1] / length, n[2] / length);
            colours.push(1, 0, 0, 1);
        });
        indices.push(3 * f, 3 * f + 1, 3 * f + 2);
    });
    return {
        visible: true, alphaMultiplier: 1, dataVersion: 1, bufferTypes: ["TRIANGLES"],
        triangleVertices: [new Float32Array(positions)], triangleNormals: [new Float32Array(normals)],
        triangleColours: [new Float32Array(colours)], triangleIndexs: [new Uint32Array(indices)],
    } as unknown as DisplayBuffer;
}

/** Pixels of the canvas, as drawn by the last render (read in the same task). */
function pixels(canvas: HTMLCanvasElement): Uint8ClampedArray {
    const copy = document.createElement("canvas");
    copy.width = canvas.width;
    copy.height = canvas.height;
    const context = copy.getContext("2d");
    context.drawImage(canvas, 0, 0);
    return context.getImageData(0, 0, canvas.width, canvas.height).data;
}

/** Pixels whose colour leans to `channel` (0 red, 2 blue) and is not background. */
function countLeaning(data: Uint8ClampedArray, channel: number): number {
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
        const v = [data[i], data[i + 1], data[i + 2]];
        if (v[channel] > 40 && v[channel] > 1.3 * Math.max(...v.filter((_, k) => k !== channel))) count++;
    }
    return count;
}

export interface PreviewReport {
    mesh: number;
    meshChunked: number;
    chunkedMeshDrawn: boolean;
    surface: number;
    lines: number;
    thinLines: number;
    litLines: number;
    background: number;
    rendererErrors: string[];
    /**
     * Two renderers on one canvas, the first destroyed after the second was made - as React's
     * StrictMode mounts the preview twice in development. The second must still draw.
     */
    overlapError: string | null;
    overlapMesh: number;
}

export default defineCase(async (device: GPUDevice): Promise<PreviewReport> => {
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    document.body.appendChild(canvas);
    const rendererErrors: string[] = [];
    const onError = (message: string) => rendererErrors.push(message);

    // A mesh from a DisplayBuffer, whole; then again with buffers limited to 64 bytes, so that
    // its 24 vertices and 24 indices go in several chunks.
    const mesh = octahedronBuffer();
    let renderer = await WebGPUPreviewRenderer.create(canvas, onError);
    renderer.render([], camera);
    const background = countLeaning(pixels(canvas), 0);
    renderer.render([mesh], camera);
    const meshPixels = countLeaning(pixels(canvas), 0);
    renderer.destroy();
    renderer = await WebGPUPreviewRenderer.create(canvas, onError, { maxBufferBytes: 64 });
    const report = renderer.render([mesh], camera);
    const meshChunked = countLeaning(pixels(canvas), 0);
    renderer.destroy();

    const first = await WebGPUPreviewRenderer.create(canvas, onError);
    const second = await WebGPUPreviewRenderer.create(canvas, onError);
    first.destroy();
    let overlapError: string | null = null;
    let overlapMesh = 0;
    try {
        second.render([mesh], camera);
        overlapMesh = countLeaning(pixels(canvas), 0);
    } catch (err) {
        overlapError = err instanceof Error ? err.message : String(err);
    }
    second.destroy();

    // A map contour made on the GPU, drawn from its own buffers in each style.
    renderer = await WebGPUPreviewRenderer.create(canvas, onError);
    const kernels = await MapContourKernels.create(device);
    const n = 48, data = new Float32Array(n * n * n);
    for (let w = 0; w < n; w++) for (let v = 0; v < n; v++) for (let u = 0; u < n; u++) {
        const d = [u / n - 0.5, v / n - 0.5, w / n - 0.5].map(x => x * 24);
        data[(w * n + v) * n + u] = Math.exp(-(d[0] ** 2 + d[1] ** 2 + d[2] ** 2) / 12);
    }
    const grid = new GpuMapGrid(kernels, { nu: n, nv: n, nw: n, orth: [24, 0, 0, 0, 24, 0, 0, 0, 24], isEM: false, data });
    const surface = new GpuIsosurface(kernels, grid, () => {});
    surface.update({ centre: [12, 12, 12], radius: 10, level: 0.3 });
    const b = surface.buffers;
    const draw = (style: PreviewGpuDraw["style"], lineWidth = 1.5): number => {
        renderer.render([], camera, [{
            key: "map", position: b.position, normal: b.normal, index: b.triangles, drawArgs: b.drawArgs,
            drawArgsOffset: style === "triangles" ? 0 : 32, style, lineWidth,
            colour: [0.2, 0.3, 1, 1], transparent: false,
        }]);
        return countLeaning(pixels(canvas), 2);
    };
    const result: PreviewReport = {
        mesh: meshPixels,
        meshChunked,
        chunkedMeshDrawn: report.plan.draws.length === 1,
        surface: draw("triangles"),
        lines: draw("lines"),
        thinLines: draw("lines", 0.5),
        litLines: draw("lit-lines"),
        background,
        rendererErrors,
        overlapError,
        overlapMesh,
    };
    surface.destroy();
    grid.destroy();
    kernels.destroy();
    renderer.destroy();
    canvas.remove();
    return result;
});
