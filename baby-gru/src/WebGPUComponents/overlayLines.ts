/**
 * The WebGL renderer's line overlays in the WebGPU renderer: the FPS meter's graph and the
 * on-screen measuring lines. Their geometry and matrices come from overlayGeometry, which the
 * WebGL renderer draws from too; this draws them, thick, over everything.
 */
import * as mat4 from 'gl-matrix/mat4';
import { quatToMat4, quat4Inverse } from '../WebGLgComponents/quatToMat4.js';
import { DEPTH_MINUS_ONE_TO_ZERO_ONE } from '../WebGLgComponents/mgWebGLParts/projection';
import {
    FPS_METER_HALF_WIDTH, fpsMeterMatrix, fpsMeterSegments, lineMeasureHalfWidth, lineMeasureMatrix, lineMeasureSegments,
} from '../WebGLgComponents/mgWebGLParts/overlayGeometry';
import { BufferUsage, ShaderStage } from './gpu';
import { OVERLAY_LINES_WGSL } from './previewShaders';
import type { SnapshotTile } from './snapshotTiles';
import { narrowToTile } from './snapshotTiles';

/** The parts of MGWebGL the line overlays come from. */
export interface OverlayLinesSource {
    showFPS?: boolean;
    mspfArray?: number[];
    measurePointsArray?: { x: number; y: number }[];
}

/** One overlay: segments as vertex pairs, a colour per vertex, and how to put them on screen. */
export interface OverlayLineBatch {
    label: string;
    vertices: ArrayLike<number>;
    colours: ArrayLike<number>;
    /** To WebGPU clip space (depth 0 to 1), narrowed to the tile if there is one. */
    clip: ArrayLike<number>;
    screenZ: ArrayLike<number>;
    halfWidth: number;
}

/** What the overlays' frames need of the camera. */
interface OverlayCamera extends OverlayLinesSource {
    myQuat: ArrayLike<number>;
    origin: ArrayLike<number>;
    zoom: number;
    background_colour: ArrayLike<number>;
}

const toWebGPUClip = (glClip: mat4.mat4, tile: SnapshotTile | null, width: number, height: number): Float32Array => {
    const clip = new Float32Array(mat4.multiply(mat4.create(), DEPTH_MINUS_ONE_TO_ZERO_ONE, glClip));
    if (tile) narrowToTile(clip, tile, width, height);
    return clip;
};

/**
 * The overlays drawCore would draw over a `width` x `height` image: the FPS meter when it is
 * shown, and the measuring lines when there are measuring points. `view` is the scene's view
 * matrix (the WebGL mvMatrix).
 */
export function overlayLineBatchesOf(source: OverlayCamera, view: mat4.mat4, width: number, height: number,
                                     tile: SnapshotTile | null): OverlayLineBatch[] {
    const batches: OverlayLineBatch[] = [];
    if (source.showFPS && source.mspfArray) {
        const { vertices, colours } = fpsMeterSegments(source.mspfArray);
        batches.push({
            label: "FPS meter", vertices, colours, clip: toWebGPUClip(fpsMeterMatrix(), tile, width, height),
            screenZ: [0, 0, 1], halfWidth: FPS_METER_HALF_WIDTH,
        });
    }
    if (source.measurePointsArray && source.measurePointsArray.length > 0) {
        const ratio = width / height;
        const invMat = quatToMat4(quat4Inverse(source.myQuat, [0, 0, 0, 1])) as mat4.mat4;
        const { vertices, colours } = lineMeasureSegments(source.measurePointsArray, source.origin, source.zoom, ratio, invMat, source.background_colour);
        // drawCore's screenZ: the viewer's z in model space.
        const screenZ = [invMat[8], invMat[9], invMat[10]];
        batches.push({
            label: "measuring lines", vertices, colours, clip: toWebGPUClip(lineMeasureMatrix(ratio, source.zoom, view), tile, width, height),
            screenZ, halfWidth: lineMeasureHalfWidth(source.zoom),
        });
    }
    return batches.filter(batch => batch.vertices.length >= 6);
}

interface Slot {
    uniform: GPUBuffer;
    positions: GPUBuffer;
    colours: GPUBuffer;
    bindGroup: GPUBindGroup;
}

export class OverlayLines {
    private readonly module: GPUShaderModule;
    private readonly layout: GPUBindGroupLayout;
    private readonly pipeline: GPURenderPipeline;
    private readonly slots: Slot[] = [];

    constructor(private readonly device: GPUDevice, format: GPUTextureFormat, frameLayout: GPUBindGroupLayout,
                sampleCount: number, depthFormat: GPUTextureFormat) {
        this.module = device.createShaderModule({ label: "overlay lines", code: OVERLAY_LINES_WGSL });
        this.layout = device.createBindGroupLayout({
            label: "overlay lines",
            entries: [
                { binding: 0, visibility: ShaderStage.VERTEX, buffer: { type: "uniform" } },
                { binding: 1, visibility: ShaderStage.VERTEX, buffer: { type: "read-only-storage" } },
                { binding: 2, visibility: ShaderStage.VERTEX, buffer: { type: "read-only-storage" } },
            ],
        });
        this.pipeline = device.createRenderPipeline({
            label: "overlay lines",
            layout: device.createPipelineLayout({ bindGroupLayouts: [frameLayout, this.layout] }),
            vertex: { module: this.module, entryPoint: "vs_overlay_line", buffers: [] },
            fragment: {
                module: this.module, entryPoint: "fs_overlay_line",
                targets: [{
                    format,
                    blend: {
                        color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" },
                        alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
                    },
                }],
            },
            primitive: { topology: "triangle-list", cullMode: "none" },
            // depthFunc ALWAYS in drawFPSMeter and drawLineMeasures.
            depthStencil: { format: depthFormat, depthWriteEnabled: false, depthCompare: "always" },
            multisample: { count: sampleCount },
        });
    }

    /** Draw the batches into `pass`; returns the segments drawn. */
    draw(pass: GPURenderPassEncoder, batches: readonly OverlayLineBatch[]): number {
        let segments = 0;
        batches.forEach((batch, n) => {
            const positions = Float32Array.from(batch.vertices);
            const colours = Float32Array.from(batch.colours);
            const slot = this.slot(n, positions.byteLength, colours.byteLength);
            const uniform = new Float32Array(24);
            uniform.set(Array.from(batch.clip).slice(0, 16), 0);
            uniform.set([batch.screenZ[0], batch.screenZ[1], batch.screenZ[2], 0], 16);
            uniform.set([batch.halfWidth, 0, 0, 0], 20);
            this.device.queue.writeBuffer(slot.uniform, 0, uniform);
            this.device.queue.writeBuffer(slot.positions, 0, positions);
            this.device.queue.writeBuffer(slot.colours, 0, colours);
            const count = Math.floor(positions.length / 6);
            pass.setPipeline(this.pipeline);
            pass.setBindGroup(1, slot.bindGroup);
            pass.draw(6 * count);
            segments += count;
        });
        return segments;
    }

    destroy(): void {
        this.slots.forEach(slot => { slot.uniform.destroy(); slot.positions.destroy(); slot.colours.destroy(); });
        this.slots.length = 0;
    }

    /** The n-th batch's buffers, grown to fit. */
    private slot(n: number, positionBytes: number, colourBytes: number): Slot {
        const existing = this.slots[n];
        if (existing && existing.positions.size >= positionBytes && existing.colours.size >= colourBytes) return existing;
        if (existing) { existing.uniform.destroy(); existing.positions.destroy(); existing.colours.destroy(); }
        const storage = (label: string, bytes: number) => this.device.createBuffer({
            label, size: Math.max(256, bytes * 2), usage: BufferUsage.STORAGE | BufferUsage.COPY_DST,
        });
        const uniform = this.device.createBuffer({ label: "overlay uniforms", size: 96, usage: BufferUsage.UNIFORM | BufferUsage.COPY_DST });
        const positions = storage("overlay positions", positionBytes);
        const colours = storage("overlay colours", colourBytes);
        const bindGroup = this.device.createBindGroup({
            label: "overlay lines",
            layout: this.layout,
            entries: [uniform, positions, colours].map((buffer, binding) => ({ binding, resource: { buffer } })),
        });
        this.slots[n] = { uniform, positions, colours, bindGroup };
        return this.slots[n];
    }
}
