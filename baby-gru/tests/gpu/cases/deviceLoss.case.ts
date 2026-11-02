/**
 * A lost device, and a new one (MoorhenWebGPUMainView's recovery, on the renderer it uses).
 *
 * What should happen: the loss is reported to onDeviceLost, not onError; the shared context
 * forgets the lost device (gpu/context.ts), so a renderer made after it, on the same canvas, is on
 * a new device; and that renderer draws the scene, from the same DisplayBuffers, exactly as the
 * first one did.
 */
import { WebGPUPreviewRenderer } from "../../../src/WebGPUComponents/previewRenderer";
import type { PreviewCameraSource } from "../../../src/WebGPUComponents/previewScene";
import type { DisplayBuffer } from "../../../src/WebGLgComponents/displayBuffer";
import { type Quad, emptyQuad, rectangle } from "../reference/surfaceLighting";
import { defineCase } from "../helpers/browserCase";

const WIDTH = 160, HEIGHT = 120;

const camera: PreviewCameraSource = {
    myQuat: [0, 0, 0, 1], origin: [0, 0, 0], zoom: 0.35, fogClipOffset: 250,
    gl_clipPlane0: [0, 0, -1, -230], gl_clipPlane1: [0, 0, 1, 270], gl_fog_start: 280, gl_fog_end: 290,
    doPerspectiveProjection: false,
    light_positions: [25, 25, 50, 1], light_colours_ambient: [0.2, 0.2, 0.2, 1], light_colours_diffuse: [0.6, 0.6, 0.6, 1],
    light_colours_specular: [0.4, 0.4, 0.4, 1], specularPower: 32, background_colour: [0.1, 0.1, 0.1, 1],
    canvas: { width: WIDTH, height: HEIGHT },
};

const square = (): DisplayBuffer => {
    const q: Quad = emptyQuad();
    rectangle(q, -4, -3, 4, 3, [0, 0, 1], [0.9, 0.3, 0.2, 1]);
    return {
        visible: true, alphaMultiplier: 1, dataVersion: 1, bufferTypes: ["TRIANGLES"], transparent: false, isHoverBuffer: false,
        triangleVertices: [new Float32Array(q.positions)], triangleNormals: [new Float32Array(q.normals)],
        triangleColours: [new Float32Array(q.colours)], triangleIndexs: [new Uint32Array(q.indices)], symmetryMatrices: [],
    } as unknown as DisplayBuffer;
};

export interface DeviceLossReport {
    /** Reports to onDeviceLost and to onError. */
    lost: string[];
    errors: string[];
    /** The second renderer is on another device. */
    newDevice: boolean;
    /** Pixels the square covers, before and after; the most any level differs between them. */
    drawnBefore: number;
    drawnAfter: number;
    worst: number;
}

export default defineCase(async (device: GPUDevice): Promise<DeviceLossReport> => {
    const canvas = document.createElement("canvas");
    const lost: string[] = [];
    const errors: string[] = [];
    const scene = [square()];
    const drawn = (data: Uint8ClampedArray) => {
        let n = 0;
        for (let i = 0; i < data.length; i += 4) if (Math.abs(data[i] - data[0]) > 30) n++;
        return n;
    };

    const first = await WebGPUPreviewRenderer.create(canvas, message => errors.push(message), { onDeviceLost: message => lost.push(message) });
    const before = (await first.snapshot(scene, camera, [], WIDTH, HEIGHT)).data;
    device.destroy();
    await device.lost;
    // The renderer's own handler runs after this one's turn.
    await new Promise(resolve => setTimeout(resolve, 0));
    first.destroy();

    const second = await WebGPUPreviewRenderer.create(canvas, message => errors.push(message), { onDeviceLost: message => lost.push(message) });
    try {
        const after = (await second.snapshot(scene, camera, [], WIDTH, HEIGHT)).data;
        let worst = 0;
        for (let i = 0; i < before.length; i++) worst = Math.max(worst, Math.abs(before[i] - after[i]));
        return { lost, errors, newDevice: second.gpuDevice !== device, drawnBefore: drawn(before), drawnAfter: drawn(after), worst };
    } finally {
        second.destroy();
    }
});
