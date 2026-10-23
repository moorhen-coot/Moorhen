/**
 * WebGPUPreviewRenderer.snapshot: the same image as the canvas shows at the same size, and the
 * same image whether drawn whole or in tiles (orthographic and perspective). The scene has a
 * DisplayBuffer mesh and a GPU-resident map contour drawn as a surface and as thick lines, so every
 * kind of draw goes through the narrowed tile cameras.
 */
import { WebGPUPreviewRenderer } from "../../../src/WebGPUComponents/previewRenderer";
import type { PreviewGpuDraw } from "../../../src/WebGPUComponents/previewRenderer";
import type { PreviewCameraSource } from "../../../src/WebGPUComponents/previewScene";
import type { DisplayBuffer } from "../../../src/WebGLgComponents/displayBuffer";
import { GpuIsosurface, GpuMapGrid, MapContourKernels } from "../../../src/WebGPUComponents/mapContour/gpuMapContour";
import { defineCase } from "../helpers/browserCase";

const WIDTH = 300, HEIGHT = 200;

function camera(perspective: boolean): PreviewCameraSource {
    return {
        myQuat: [0.2, 0.3, 0, Math.sqrt(1 - 0.13)], origin: [-12, -12, -12], zoom: 0.4, fogClipOffset: 250,
        gl_clipPlane0: [0, 0, -1, -230], gl_clipPlane1: [0, 0, 1, 270], gl_fog_start: 250, gl_fog_end: 290,
        doPerspectiveProjection: perspective,
        light_positions: [10, 10, 60, 1], light_colours_ambient: [0.2, 0.2, 0.2, 1], light_colours_diffuse: [0.6, 0.6, 0.6, 1],
        light_colours_specular: [0.4, 0.4, 0.4, 1], specularPower: 64, background_colour: [0.05, 0.05, 0.05, 1],
    };
}

/** A red octahedron beside the map's blob, so the image has both kinds of draw. */
function octahedron(): DisplayBuffer {
    const c = [6, 8, 12], r = 3;
    const corners = [[r, 0, 0], [-r, 0, 0], [0, r, 0], [0, -r, 0], [0, 0, r], [0, 0, -r]];
    const faces = [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]];
    const positions: number[] = [], normals: number[] = [], colours: number[] = [], indices: number[] = [];
    faces.forEach((face, f) => {
        const p = face.map(i => corners[i]);
        const n = [0, 1, 2].map(k => (p[0][k] + p[1][k] + p[2][k]) / 3);
        const length = Math.hypot(...n);
        p.forEach(v => {
            positions.push(c[0] + v[0], c[1] + v[1], c[2] + v[2]);
            normals.push(n[0] / length, n[1] / length, n[2] / length);
            colours.push(1, 0.1, 0.1, 1);
        });
        indices.push(3 * f, 3 * f + 1, 3 * f + 2);
    });
    return {
        visible: true, alphaMultiplier: 1, dataVersion: 1, bufferTypes: ["TRIANGLES"],
        triangleVertices: [new Float32Array(positions)], triangleNormals: [new Float32Array(normals)],
        triangleColours: [new Float32Array(colours)], triangleIndexs: [new Uint32Array(indices)],
    } as unknown as DisplayBuffer;
}

/** Pixels differing by more than `tolerance` in any channel, and how many are not background. */
function compare(a: Uint8ClampedArray, b: Uint8ClampedArray, tolerance = 2): { differ: number; worst: number } {
    let differ = 0, worst = 0;
    for (let i = 0; i < a.length; i += 4) {
        const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
        worst = Math.max(worst, d);
        if (d > tolerance) differ++;
    }
    return { differ, worst };
}

function drawn(data: Uint8ClampedArray): number {
    let count = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i] > 30 || data[i + 1] > 30 || data[i + 2] > 30) count++;
    return count;
}

export interface SnapshotReport {
    pixels: number;
    drawn: number;
    canvasVsSnapshot: { differ: number; worst: number };
    tiledVsWhole: { differ: number; worst: number; tiles: number };
    perspectiveDrawn: number;
    perspectiveTiledVsWhole: { differ: number; worst: number; tiles: number };
    oddTiles: { differ: number; worst: number; tiles: number };
}

export default defineCase(async (device: GPUDevice): Promise<SnapshotReport> => {
    const canvas = document.createElement("canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    document.body.appendChild(canvas);
    const errors: string[] = [];
    const renderer = await WebGPUPreviewRenderer.create(canvas, message => errors.push(message));

    const kernels = await MapContourKernels.create(device);
    const n = 48, values = new Float32Array(n * n * n);
    for (let w = 0; w < n; w++) for (let v = 0; v < n; v++) for (let u = 0; u < n; u++) {
        const d = [u / n - 0.55, v / n - 0.5, w / n - 0.5].map(x => x * 24);
        values[(w * n + v) * n + u] = Math.exp(-(d[0] ** 2 + d[1] ** 2 + d[2] ** 2) / 12);
    }
    const grid = new GpuMapGrid(kernels, { nu: n, nv: n, nw: n, orth: [24, 0, 0, 0, 24, 0, 0, 0, 24], isEM: false, data: values });
    const surface = new GpuIsosurface(kernels, grid, () => {});
    surface.update({ centre: [13, 12, 12], radius: 9, level: 0.3 });
    const b = surface.buffers;
    const draw = (style: PreviewGpuDraw["style"], key: string): PreviewGpuDraw => ({
        key, position: b.position, normal: b.normal, index: b.triangles, drawArgs: b.drawArgs,
        drawArgsOffset: style === "triangles" ? 0 : 32, style, lineWidth: 1.2, colour: [0.2, 0.3, 1, 1], transparent: false,
    });
    const scene = [octahedron()];
    const gpuDraws = [draw("triangles", "surface"), draw("lines", "lines")];

    try {
        // What the canvas shows, read in the same task as the frame.
        renderer.render(scene, camera(false), gpuDraws);
        const copy = document.createElement("canvas");
        copy.width = WIDTH;
        copy.height = HEIGHT;
        const context = copy.getContext("2d");
        context.drawImage(canvas, 0, 0);
        const shown = context.getImageData(0, 0, WIDTH, HEIGHT).data;

        const whole = await renderer.snapshot(scene, camera(false), gpuDraws, WIDTH, HEIGHT);
        const tiled = await renderer.snapshot(scene, camera(false), gpuDraws, WIDTH, HEIGHT, { maxTile: 64 });
        const perspective = await renderer.snapshot(scene, camera(true), gpuDraws, WIDTH, HEIGHT);
        const perspectiveTiled = await renderer.snapshot(scene, camera(true), gpuDraws, WIDTH, HEIGHT, { maxTile: 64 });
        // Tiles of a size that does not divide the image, and a last row and column of slivers.
        const odd = await renderer.snapshot(scene, camera(false), gpuDraws, WIDTH, HEIGHT, { maxTile: 97 });

        if (errors.length) throw new Error(errors.join("\n"));
        return {
            pixels: WIDTH * HEIGHT,
            drawn: drawn(whole.data),
            canvasVsSnapshot: compare(shown, whole.data),
            tiledVsWhole: { ...compare(tiled.data, whole.data), tiles: tiled.tiles },
            perspectiveDrawn: drawn(perspective.data),
            perspectiveTiledVsWhole: { ...compare(perspectiveTiled.data, perspective.data), tiles: perspectiveTiled.tiles },
            oddTiles: { ...compare(odd.data, whole.data), tiles: odd.tiles },
        };
    } finally {
        surface.destroy();
        grid.destroy();
        kernels.destroy();
        renderer.destroy();
        canvas.remove();
    }
});
