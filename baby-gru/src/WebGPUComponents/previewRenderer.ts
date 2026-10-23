/**
 * A WebGPU renderer for the scene's TRIANGLES sub-buffers, drawing into its own canvas.
 *
 * Nothing is shared with the WebGL context. It reads the same DisplayBuffers (their CPU-side
 * typed arrays) and the same camera, uploads what it needs into its own GPU buffers, and keeps
 * those until the DisplayBuffer's data changes or the buffer leaves the scene.
 *
 * What it does not do yet is listed in planPreview; what it does is triangles lit and fogged as the
 * WebGL triangle shader has them, perfect spheres as impostors, GPU-resident meshes (map contours)
 * as surfaces or thick lines, 4x multisampling, and a second, blended pass for transparent
 * geometry - unsorted and without depth peeling, so overlapping transparent surfaces can differ
 * from the WebGL view.
 */
import type { DisplayBuffer } from '../WebGLgComponents/displayBuffer';
import type * as mat4 from 'gl-matrix/mat4';
import { BufferUsage, GpuSpanTimer, MapMode, ShaderStage, TextureUsage, getGpuContext } from './gpu';
import { SnapshotTile, narrowToTile, planTiles } from './snapshotTiles';
import { PREVIEW_WGSL } from './previewShaders';
import { TextLayer, textBatchesOf } from './textLayer';
import { OverlayLines, overlayLineBatchesOf } from './overlayLines';
import { TexturedShapeLayer } from './texturedShapes';
import {
    ColourSource, FRAME_FLOATS, MeshChunk, PreviewCameraSource, PreviewDraw, PreviewPlan, frameUniforms, hoverSphereRadius, interactiveGlow, interactiveModel, planMeshChunks, planPreview, symmetryCopyGrey,
} from './previewScene';


/**
 * WebGL's thick lines are 2 × pixelZoom × size² Å wide, pixelZoom being 0.04 × zoom when the
 * buffer has no primitive sizes (map contours have none) and size the map line width:
 * drawCore.ts sets pixelZoom; linesToThickLinesWithIndices makes the "normals" size long, and
 * thick-lines-vertex-shader.js offsets by pixelZoom times their length squared, each way.
 */
export const thickLineHalfWidth = (lineWidth: number, zoom: number): number => 0.04 * zoom * lineWidth * lineWidth;

const SAMPLE_COUNT = 4;
/** Floats in a Draw uniform block (previewShaders.ts): colour, params, copyColour, model, ambient. */
const DRAW_FLOATS = 32;
/** Bytes between one copy's Draw block and the next: the uniform offset alignment WebGPU guarantees. */
const DRAW_STRIDE = 256;
const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

/**
 * The Draw block for one copy of a draw. `copyColour` is set for symmetry copies drawn in one
 * grey; `model` places the copy (identity for the original).
 */
function drawBlock(colour: ArrayLike<number>, alpha: number, halfWidth: number, copyColour: number[] | null,
                   model: ArrayLike<number>, out: Float32Array, offset = 0, segmentColours = 0, ambient: number | null = null): void {
    out.set([colour[0], colour[1], colour[2], colour[3], alpha, halfWidth, copyColour ? 1 : 0, segmentColours], offset);
    out.set(copyColour ?? [0, 0, 0, 0], offset + 8);
    out.set(Array.from(model).slice(0, 16), offset + 12);
    out.set(ambient === null ? [0, 0, 0, 0] : [ambient, ambient, ambient, 1], offset + 28);
}

const DEPTH_FORMAT: GPUTextureFormat = "depth24plus";
/**
 * The largest tile a snapshot is drawn in. Multisampled colour and depth take 32 bytes a pixel,
 * so a 2048 x 2048 tile needs 128 MB on top of the image; bigger images are drawn in tiles.
 */
const MAX_SNAPSHOT_TILE = 2048;

/** An image rendered offscreen: RGBA, 8 bits a channel, top row first. */
export interface PreviewSnapshot {
    width: number;
    height: number;
    data: Uint8ClampedArray;
    /** What was drawn (the last tile's report: every tile draws the same things). */
    report: PreviewFrameReport;
    tiles: number;
}

/** Where one frame goes: the multisampled targets it is drawn into, and what they resolve to. */
interface FrameTarget {
    /** The whole image's size, which the camera frames. */
    width: number;
    height: number;
    /** The part of it this frame draws, or null for all of it. */
    tile: SnapshotTile | null;
    colour: GPUTexture;
    depth: GPUTexture;
    resolve: GPUTextureView;
    /** Whether to time the frame (canvas frames only, for the status line). */
    timed: boolean;
}

/**
 * A triangle mesh drawn straight from GPU buffers made on this renderer's device, with the draw's
 * size in a buffer too: map contours made on the GPU (../mapContour).
 *
 * As a surface ("triangles": drawIndexedIndirect, lit as the other meshes are) or as the edges of
 * its triangles, `lineWidth` wide in the units of the map line width setting ("lines", unlit, and
 * "lit-lines": WebGL's LINES and NORMALLINES). The lines are quads built in the vertex shader,
 * from the position, normal and index buffers bound as storage, so those need STORAGE usage too,
 * and their drawIndirect arguments have 18 vertices per triangle.
 */
export interface PreviewGpuDraw {
    /** The same from frame to frame for the same thing, so its uniforms can be kept. */
    key: string;
    position: GPUBuffer;
    normal: GPUBuffer;
    /** uint32 triangle indices. */
    index: GPUBuffer;
    /** drawIndexedIndirect's arguments for "triangles", drawIndirect's for the line styles. */
    drawArgs: GPUBuffer;
    drawArgsOffset: number;
    style: "triangles" | "lines" | "lit-lines";
    /** For the line styles: as mapContourSettings.mapLineWidth. */
    lineWidth: number;
    colour: [number, number, number, number];
    transparent: boolean;
}

export interface PreviewFrameReport {
    plan: PreviewPlan;
    /** GPU buffers created this frame because a DisplayBuffer was new or had changed. */
    uploads: number;
    /** CPU time spent building and submitting the frame, ms. */
    cpuMs: number;
    /** Text labels drawn (all atlases). */
    labels: number;
    /** Segments of the line overlays (FPS meter, measuring lines) drawn. */
    overlaySegments: number;
    /** Textured shapes drawn. */
    shapes: number;
}

/** One drawable piece of a sub-buffer: the whole of it, unless it is too big for one GPU buffer. */
interface ChunkResources {
    position: GPUBuffer;
    normal: GPUBuffer;
    /** Per-vertex colours; null when colours are per instance or uniform. */
    colour: GPUBuffer | null;
    index: GPUBuffer;
    indexCount: number;
    /** Added to each index: minus the first vertex of a window onto the mesh (see MeshChunk). */
    baseVertex: number;
}

/** Some of a PERFECT_SPHERES sub-buffer's spheres: all of them, unless too many for one buffer. */
interface SphereChunk {
    origin: GPUBuffer;
    size: GPUBuffer;
    colour: GPUBuffer;
    count: number;
}

/** The GPU side of one sub-buffer. */
interface SubBufferResources {
    dataVersion: number;
    /** The arrays these were uploaded from, so that a replaced array is noticed too. */
    sources: unknown[];
    buffers: GPUBuffer[];
    chunks: ChunkResources[];
    /** Per-instance colours (colour source "instance"), shared by every chunk. */
    instanceColour: GPUBuffer | null;
    instanceOrigin: GPUBuffer | null;
    instanceSize: GPUBuffer | null;
    instanceOrientation: GPUBuffer | null;
    /** For PERFECT_SPHERES, in place of chunks and the instance buffers. */
    spheres: SphereChunk[];
    /** For LINES and NORMALLINES: their arrays bound as storage, and how many segments. */
    segments: { bindGroup: GPUBindGroup; count: number } | null;
    /** A Draw block per copy, original first, DRAW_STRIDE apart; remade when the copies grow. */
    drawUniforms: GPUBuffer;
    /** One per block. */
    bindGroups: GPUBindGroup[];
}

type PipelineKind = "mesh-vertex" | "mesh-uniform" | "instanced-vertex" | "instanced-instance" | "instanced-uniform" | "spheres";

const pipelineKind = (instanced: boolean, colour: ColourSource): PipelineKind =>
    instanced
        ? (colour === "vertex" ? "instanced-vertex" : colour === "instance" ? "instanced-instance" : "instanced-uniform")
        : (colour === "uniform" ? "mesh-uniform" : "mesh-vertex");

const asFloat32 = (data: ArrayLike<number>): Float32Array =>
    data instanceof Float32Array ? data : Float32Array.from(data);

const asUint32 = (data: ArrayLike<number>): Uint32Array =>
    data instanceof Uint32Array ? data : Uint32Array.from(data);

// Where it always was, for the modal; it lives with the shared device now.
export { webGPUUnavailableReason } from './gpu';

/**
 * Which renderer configured each canvas context last. A canvas has one WebGPU context however
 * often getContext is called, so two renderers on one canvas share it - as when React's
 * StrictMode mounts the preview twice in development, and the first renderer is destroyed after
 * the second has configured the context. Only the last to configure may unconfigure.
 */
const canvasOwners = new WeakMap<GPUCanvasContext, WebGPUPreviewRenderer>();

export class WebGPUPreviewRenderer {
    readonly adapterDescription: string;
    private readonly device: GPUDevice;
    private readonly context: GPUCanvasContext;
    private readonly format: GPUTextureFormat;
    private readonly module: GPUShaderModule;
    private readonly frameBuffer: GPUBuffer;
    private readonly frameBindGroup: GPUBindGroup;
    private readonly frameLayout: GPUBindGroupLayout;
    private readonly drawLayout: GPUBindGroupLayout;
    private readonly pipelineLayout: GPUPipelineLayout;
    /** Thick lines: the mesh's buffers as storage, at group 2. */
    private readonly lineLayout: GPUBindGroupLayout;
    private readonly linePipelineLayout: GPUPipelineLayout;
    /** LINES and NORMALLINES from DisplayBuffers: positions, normals, colours, segments, at group 2. */
    private readonly segmentLayout: GPUBindGroupLayout;
    private readonly segmentPipelineLayout: GPUPipelineLayout;
    private readonly pipelines = new Map<string, GPURenderPipeline>();
    private readonly resources = new Map<DisplayBuffer, (SubBufferResources | undefined)[]>();
    private readonly frameData = new Float32Array(FRAME_FLOATS);
    private colourTarget: GPUTexture | null = null;
    private depthTarget: GPUTexture | null = null;
    private destroyed = false;
    private readonly gpuDrawUniforms = new Map<string, {
        buffer: GPUBuffer;
        bindGroup: GPUBindGroup;
        /** The thick lines' storage bindings, and the buffers they were made for. */
        lines?: { sources: GPUBuffer[]; bindGroup: GPUBindGroup };
    }>();
    /** The largest GPU buffer this renderer makes; bigger meshes are drawn in chunks. */
    private readonly maxBufferBytes: number;
    /** GPU time of each frame's render pass, where the device can time. */
    private readonly frameTimer: GpuSpanTimer | null;
    /** Labels, from the WebGL renderer's glyph atlases; drawn last. */
    private readonly textLayer: TextLayer;
    /** The FPS meter and the measuring lines; drawn over the scene, before the text. */
    private readonly overlayLines: OverlayLines;
    /** Planes of values coloured through a ramp (glRef.texturedShapes); after the meshes. */
    private readonly texturedShapes: TexturedShapeLayer;
    /** On the shared device: removed again by destroy(), which must not destroy the device. */
    private readonly errorListener: (event: GPUUncapturedErrorEvent) => void;

    /**
     * Configure the canvas on the shared device (../gpu: the adapter's largest buffers and
     * storage bindings, and timestamps where offered). Rejects with a readable message if any
     * step fails, so the caller can show it as it stands.
     */
    static async create(canvas: HTMLCanvasElement, onError: (message: string) => void,
                        options: { maxBufferBytes?: number } = {}): Promise<WebGPUPreviewRenderer> {
        const { device, adapterDescription } = await getGpuContext();
        // The DOM library's getContext overloads do not include "webgpu" yet.
        const context = canvas.getContext("webgpu") as unknown as GPUCanvasContext | null;
        if (!context) throw new Error("The canvas would not give a WebGPU context.");
        // Meshes bigger than the largest buffer are drawn in chunks. For tests: a smaller limit
        // than the device's, to exercise the chunking.
        const maxBufferBytes = Math.min(device.limits.maxBufferSize, options.maxBufferBytes ?? Infinity);
        return new WebGPUPreviewRenderer(device, context, adapterDescription, onError, maxBufferBytes);
    }

    private constructor(device: GPUDevice, context: GPUCanvasContext, adapterDescription: string, onError: (message: string) => void,
                        maxBufferBytes: number) {
        this.device = device;
        this.maxBufferBytes = maxBufferBytes;
        this.context = context;
        this.adapterDescription = adapterDescription;
        this.format = navigator.gpu.getPreferredCanvasFormat();
        context.configure({ device, format: this.format, alphaMode: "opaque" });
        canvasOwners.set(context, this);

        // Any error outside an error scope on the shared device, whoever caused it: the device
        // logs them too (../gpu/context.ts).
        this.errorListener = (event: GPUUncapturedErrorEvent) => onError(event.error.message);
        device.addEventListener("uncapturederror", this.errorListener);
        device.lost.then(info => {
            if (!this.destroyed) onError(`WebGPU device lost: ${info.message || info.reason}`);
        });

        this.module = device.createShaderModule({ label: "preview", code: PREVIEW_WGSL });
        this.frameLayout = device.createBindGroupLayout({
            label: "preview frame",
            entries: [{ binding: 0, visibility: ShaderStage.VERTEX | ShaderStage.FRAGMENT, buffer: { type: "uniform" } }],
        });
        this.drawLayout = device.createBindGroupLayout({
            label: "preview draw",
            entries: [{ binding: 0, visibility: ShaderStage.VERTEX | ShaderStage.FRAGMENT, buffer: { type: "uniform" } }],
        });
        this.pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [this.frameLayout, this.drawLayout] });
        this.lineLayout = device.createBindGroupLayout({
            label: "preview thick lines",
            entries: [0, 1, 2].map(binding => ({ binding, visibility: ShaderStage.VERTEX, buffer: { type: "read-only-storage" as const } })),
        });
        this.linePipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [this.frameLayout, this.drawLayout, this.lineLayout] });
        this.segmentLayout = device.createBindGroupLayout({
            label: "preview segments",
            entries: [3, 4, 5, 6].map(binding => ({ binding, visibility: ShaderStage.VERTEX, buffer: { type: "read-only-storage" as const } })),
        });
        this.segmentPipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [this.frameLayout, this.drawLayout, this.segmentLayout] });
        this.frameBuffer = device.createBuffer({
            label: "preview frame uniforms",
            size: FRAME_FLOATS * 4,
            usage: BufferUsage.UNIFORM | BufferUsage.COPY_DST,
        });
        this.frameBindGroup = device.createBindGroup({
            layout: this.frameLayout,
            entries: [{ binding: 0, resource: { buffer: this.frameBuffer } }],
        });
        this.frameTimer = GpuSpanTimer.create(device, "preview frame");
        this.textLayer = new TextLayer(device, this.format, this.frameLayout, SAMPLE_COUNT, DEPTH_FORMAT);
        this.overlayLines = new OverlayLines(device, this.format, this.frameLayout, SAMPLE_COUNT, DEPTH_FORMAT);
        this.texturedShapes = new TexturedShapeLayer(device, this.format, this.frameLayout, SAMPLE_COUNT, DEPTH_FORMAT);
    }

    /**
     * The render passes' GPU time since the last call (mean and largest, ms, of the frames that
     * were timed), or null if the device cannot time.
     */
    takeFrameGpuTime(): { meanMs: number; maxMs: number; count: number } | null {
        return this.frameTimer?.take() ?? null;
    }

    /** The device everything is drawn with: GPU buffers for gpuDraws must be made on it. */
    get gpuDevice(): GPUDevice {
        return this.device;
    }

    /**
     * Draw one frame of `displayBuffers` as seen by `camera`, at the canvas's current size.
     *
     * The canvas's width and height are the caller's business (device pixels); this only follows
     * them.
     */
    render(displayBuffers: readonly DisplayBuffer[], camera: PreviewCameraSource, gpuDraws: readonly PreviewGpuDraw[] = []): PreviewFrameReport {
        const canvas = this.context.canvas as HTMLCanvasElement;
        const width = Math.max(1, canvas.width);
        const height = Math.max(1, canvas.height);
        this.ensureTargets(width, height);
        return this.drawFrame(displayBuffers, camera, gpuDraws, {
            width, height, tile: null, colour: this.colourTarget, depth: this.depthTarget,
            resolve: this.context.getCurrentTexture().createView(), timed: true,
        });
    }

    /**
     * Render `width` x `height` pixels of the scene offscreen, as `render` would draw it on a
     * canvas of that size, and read them back. Any size: images bigger than a tile (2048, or
     * `maxTile`, or the device's largest texture) are drawn in tiles, each with the whole image's
     * camera narrowed to the tile, so they join without seams.
     *
     * This waits for the GPU (it has to, to read the image), so it is for screenshots and tests,
     * not for every frame.
     */
    async snapshot(displayBuffers: readonly DisplayBuffer[], camera: PreviewCameraSource, gpuDraws: readonly PreviewGpuDraw[],
                   width: number, height: number, options: { maxTile?: number } = {}): Promise<PreviewSnapshot> {
        width = Math.round(width);
        height = Math.round(height);
        const maxTile = Math.min(options.maxTile ?? MAX_SNAPSHOT_TILE, this.device.limits.maxTextureDimension2D);
        const tiles = planTiles(width, height, maxTile);
        const data = new Uint8ClampedArray(width * height * 4);
        // The canvas format, so that the pipelines are shared; on some systems it is BGRA.
        const bgra = this.format === "bgra8unorm";
        let report: PreviewFrameReport;
        let targets: { colour: GPUTexture; depth: GPUTexture } | null = null;
        try {
            for (const tile of tiles) {
                if (!targets || targets.colour.width !== tile.width || targets.colour.height !== tile.height) {
                    targets?.colour.destroy();
                    targets?.depth.destroy();
                    targets = this.multisampledTargets(tile.width, tile.height, "snapshot");
                }
                const image = this.device.createTexture({
                    label: "snapshot tile", size: [tile.width, tile.height], format: this.format,
                    usage: TextureUsage.RENDER_ATTACHMENT | TextureUsage.COPY_SRC,
                });
                // Rows of a texture copy are padded to 256 bytes.
                const bytesPerRow = Math.ceil(tile.width * 4 / 256) * 256;
                const readback = this.device.createBuffer({
                    label: "snapshot tile read back", size: bytesPerRow * tile.height,
                    usage: BufferUsage.MAP_READ | BufferUsage.COPY_DST,
                });
                try {
                    report = this.drawFrame(displayBuffers, camera, gpuDraws, {
                        width, height, tile, colour: targets.colour, depth: targets.depth, resolve: image.createView(), timed: false,
                    });
                    const encoder = this.device.createCommandEncoder({ label: "snapshot copy" });
                    encoder.copyTextureToBuffer({ texture: image }, { buffer: readback, bytesPerRow }, [tile.width, tile.height]);
                    this.device.queue.submit([encoder.finish()]);
                    await readback.mapAsync(MapMode.READ);
                    const rows = new Uint8Array(readback.getMappedRange());
                    for (let row = 0; row < tile.height; row++) {
                        const from = row * bytesPerRow;
                        const to = ((tile.y + row) * width + tile.x) * 4;
                        if (bgra) {
                            for (let i = 0; i < tile.width * 4; i += 4) {
                                data[to + i] = rows[from + i + 2];
                                data[to + i + 1] = rows[from + i + 1];
                                data[to + i + 2] = rows[from + i];
                                data[to + i + 3] = rows[from + i + 3];
                            }
                        } else {
                            data.set(rows.subarray(from, from + tile.width * 4), to);
                        }
                    }
                } finally {
                    image.destroy();
                    readback.destroy();
                }
            }
        } finally {
            targets?.colour.destroy();
            targets?.depth.destroy();
        }
        return { width, height, data, report, tiles: tiles.length };
    }

    private drawFrame(displayBuffers: readonly DisplayBuffer[], camera: PreviewCameraSource, gpuDraws: readonly PreviewGpuDraw[],
                      target: FrameTarget): PreviewFrameReport {
        const started = performance.now();
        const plan = planPreview(displayBuffers);
        const uploads = this.syncResources(displayBuffers, plan.draws);

        const uniforms = frameUniforms(camera, target.width, target.height, this.frameData);
        // The projection is the frame's first 16 floats (Frame in previewShaders.ts).
        if (target.tile) narrowToTile(uniforms, target.tile, target.width, target.height);
        this.device.queue.writeBuffer(this.frameBuffer, 0, uniforms);

        const background = camera.background_colour;
        const encoder = this.device.createCommandEncoder({ label: "preview frame" });
        const timing = target.timed ? this.frameTimer?.writes() ?? null : null;
        const pass = encoder.beginRenderPass({
            timestampWrites: timing ? timing(0, 1) : undefined,
            colorAttachments: [{
                view: target.colour.createView(),
                resolveTarget: target.resolve,
                clearValue: { r: background[0], g: background[1], b: background[2], a: 1 },
                loadOp: "clear",
                storeOp: "discard",
            }],
            depthStencilAttachment: {
                view: target.depth.createView(),
                depthClearValue: 1.0,
                depthLoadOp: "clear",
                depthStoreOp: "discard",
            },
        });
        pass.setBindGroup(0, this.frameBindGroup);

        // Opaque first, then transparent over it, as the WebGL renderer orders them.
        for (const transparent of [false, true]) {
            for (const item of plan.draws) {
                if (item.transparent !== transparent) continue;
                this.drawOne(pass, item, camera);
            }
            for (const item of gpuDraws) {
                if (item.transparent === transparent) this.drawGpu(pass, item, camera.zoom);
            }
        }
        // Textured shapes after the meshes, as GLrender draws them after drawTriangles.
        const shapes = this.texturedShapes.draw(pass, camera.store?.getState().glRef?.texturedShapes ?? []);
        // Then the overlays, as drawCore ends its frame: the FPS meter and measuring lines, over
        // everything, then text - over everything, or (atomLabelDepthMode) depth-tested.
        const view = uniforms.slice(16, 32) as unknown as mat4.mat4;
        const overlaySegments = this.overlayLines.draw(pass, overlayLineBatchesOf(camera, view, target.width, target.height, target.tile));
        const labels = this.textLayer.draw(pass, textBatchesOf(camera), camera.zoom, target.height);
        pass.end();
        for (const [key, uniforms] of this.gpuDrawUniforms) {
            if (!gpuDraws.some(item => item.key === key)) {
                uniforms.buffer.destroy();
                this.gpuDrawUniforms.delete(key);
            }
        }
        if (timing) this.frameTimer.resolve(encoder);
        this.device.queue.submit([encoder.finish()]);
        if (timing) this.frameTimer.collect();

        return { plan, uploads, cpuMs: performance.now() - started, labels, overlaySegments, shapes };
    }

    /** Release every GPU resource it made (not the shared device). It cannot be used afterwards. */
    destroy(): void {
        this.destroyed = true;
        for (const subs of this.resources.values()) subs.forEach(sub => sub?.buffers.forEach(b => b.destroy()));
        this.resources.clear();
        this.colourTarget?.destroy();
        this.depthTarget?.destroy();
        this.frameBuffer.destroy();
        this.gpuDrawUniforms.forEach(u => u.buffer.destroy());
        this.gpuDrawUniforms.clear();
        this.frameTimer?.destroy();
        this.textLayer.destroy();
        this.overlayLines.destroy();
        this.texturedShapes.destroy();
        if (canvasOwners.get(this.context) === this) {
            this.context.unconfigure();
            canvasOwners.delete(this.context);
        }
        // The device is shared (../gpu), so it stays.
        this.device.removeEventListener("uncapturederror", this.errorListener);
    }

    /** The canvas's multisampled targets, remade when the canvas changes size. */
    private ensureTargets(width: number, height: number): void {
        if (this.colourTarget && this.colourTarget.width === width && this.colourTarget.height === height) return;
        this.colourTarget?.destroy();
        this.depthTarget?.destroy();
        const targets = this.multisampledTargets(width, height, "preview");
        this.colourTarget = targets.colour;
        this.depthTarget = targets.depth;
    }

    private multisampledTargets(width: number, height: number, label: string): { colour: GPUTexture; depth: GPUTexture } {
        return {
            colour: this.device.createTexture({
                label: `${label} colour (multisampled)`, size: [width, height], format: this.format,
                sampleCount: SAMPLE_COUNT, usage: TextureUsage.RENDER_ATTACHMENT,
            }),
            depth: this.device.createTexture({
                label: `${label} depth`, size: [width, height], format: DEPTH_FORMAT,
                sampleCount: SAMPLE_COUNT, usage: TextureUsage.RENDER_ATTACHMENT,
            }),
        };
    }

    /**
     * The sub-buffer's Draw blocks for this frame: the original's, then one per symmetry copy, with
     * room made for more copies than last time.
     */
    private writeDrawBlocks(sub: SubBufferResources, item: PreviewDraw, camera: PreviewCameraSource,
                            halfWidth = 0, segmentColours = 0): void {
        const background = camera.background_colour;
        const count = 1 + item.copies.length;
        if (sub.bindGroups.length < count) {
            const old = sub.drawUniforms;
            sub.drawUniforms = this.device.createBuffer({
                label: "draw uniforms", size: count * DRAW_STRIDE, usage: BufferUsage.UNIFORM | BufferUsage.COPY_DST,
            });
            sub.buffers[sub.buffers.indexOf(old)] = sub.drawUniforms;
            old.destroy();
            sub.bindGroups = Array.from({ length: count }, (_, n) => this.device.createBindGroup({
                layout: this.drawLayout,
                entries: [{ binding: 0, resource: { buffer: sub.drawUniforms, offset: n * DRAW_STRIDE, size: DRAW_FLOATS * 4 } }],
            }));
        }
        const custom = item.buffer.customColour ?? [1, 1, 1, 1];
        const alpha = item.buffer.alphaMultiplier ?? 1;
        const grey = item.greyCopies ? symmetryCopyGrey(background) : null;
        const data = new Float32Array(count * DRAW_STRIDE / 4);
        // The original: where it is, or - being dragged - where the drag has it, pulsing.
        const b = item.buffer;
        const model = item.moving ? interactiveModel(b.transformMatrixInteractive, b.transformOriginInteractive, camera.origin) : IDENTITY;
        const glow = item.glow ? interactiveGlow(Date.now()) : null;
        drawBlock(custom, alpha, halfWidth, null, model, data, 0, segmentColours, glow);
        item.copies.forEach((model, n) => drawBlock(custom, alpha, halfWidth, grey, model, data, (n + 1) * DRAW_STRIDE / 4, segmentColours));
        this.device.queue.writeBuffer(sub.drawUniforms, 0, data);
    }

    private drawOne(pass: GPURenderPassEncoder, item: PreviewDraw, camera: PreviewCameraSource): void {
        const sub = this.resources.get(item.buffer)?.[item.index];
        if (!sub) return;

        if (sub.segments) {
            // drawCore's pixelZoom (0.04 x zoom, times the buffer's primitive size if it has one)
            // and buildBuffers' line size (the map line width) together give the half width.
            const primitiveSize = item.buffer.primitiveSizes?.[item.index]?.[0] ?? 1;
            const halfWidth = primitiveSize * thickLineHalfWidth(camera.mapLineWidth ?? 1, camera.zoom);
            const colours = item.colourSource === "uniform" ? 2 : item.indexCount > 0 ? 0 : 1;
            this.writeDrawBlocks(sub, item, camera, halfWidth, colours);
            pass.setPipeline(this.segmentPipeline(item.primitive === "lit-lines", item.transparent));
            pass.setBindGroup(1, sub.bindGroups[0]);
            pass.setBindGroup(2, sub.segments.bindGroup);
            pass.draw(6 * sub.segments.count);
            return;
        }

        // A hover highlight's spheres all take the hover size (drawCore), through the half-width slot.
        const hoverRadius = item.primitive === "spheres" && item.buffer.isHoverBuffer ? hoverSphereRadius(camera) ?? 0 : 0;
        this.writeDrawBlocks(sub, item, camera, hoverRadius);
        const copies = 1 + item.copies.length;

        if (item.primitive === "spheres") {
            pass.setPipeline(this.pipeline("spheres", item.transparent));
            for (let copy = 0; copy < copies; copy++) {
                pass.setBindGroup(1, sub.bindGroups[copy]);
                for (const chunk of sub.spheres) {
                    pass.setVertexBuffer(0, chunk.origin);
                    pass.setVertexBuffer(1, chunk.size);
                    pass.setVertexBuffer(2, chunk.colour);
                    pass.draw(6, chunk.count);
                }
            }
            return;
        }

        pass.setPipeline(this.pipeline(pipelineKind(item.instanced, item.colourSource), item.transparent));
        const colourSlot = item.colourSource !== "uniform";
        if (item.colourSource === "instance") pass.setVertexBuffer(2, sub.instanceColour);
        if (item.instanced) {
            let slot = colourSlot ? 3 : 2;
            pass.setVertexBuffer(slot++, sub.instanceOrigin);
            pass.setVertexBuffer(slot++, sub.instanceSize);
            pass.setVertexBuffer(slot++, sub.instanceOrientation);
        }
        for (let copy = 0; copy < copies; copy++) {
            pass.setBindGroup(1, sub.bindGroups[copy]);
            for (const chunk of sub.chunks) {
                pass.setVertexBuffer(0, chunk.position);
                pass.setVertexBuffer(1, chunk.normal);
                if (chunk.colour) pass.setVertexBuffer(2, chunk.colour);
                pass.setIndexBuffer(chunk.index, "uint32");
                pass.drawIndexed(chunk.indexCount, item.instanceCount, 0, chunk.baseVertex);
            }
        }
    }

    private drawGpu(pass: GPURenderPassEncoder, item: PreviewGpuDraw, zoom: number): void {
        let uniforms = this.gpuDrawUniforms.get(item.key);
        if (!uniforms) {
            const buffer = this.device.createBuffer({ label: `draw uniforms ${item.key}`, size: DRAW_FLOATS * 4, usage: BufferUsage.UNIFORM | BufferUsage.COPY_DST });
            const bindGroup = this.device.createBindGroup({ layout: this.drawLayout, entries: [{ binding: 0, resource: { buffer } }] });
            uniforms = { buffer, bindGroup };
            this.gpuDrawUniforms.set(item.key, uniforms);
        }
        const halfWidth = item.style === "triangles" ? 0 : thickLineHalfWidth(item.lineWidth, zoom);
        const block = new Float32Array(DRAW_FLOATS);
        drawBlock(item.colour, 1, halfWidth, null, IDENTITY, block);
        this.device.queue.writeBuffer(uniforms.buffer, 0, block);
        pass.setBindGroup(1, uniforms.bindGroup);
        if (item.style === "triangles") {
            pass.setPipeline(this.pipeline("mesh-uniform", item.transparent));
            pass.setVertexBuffer(0, item.position);
            pass.setVertexBuffer(1, item.normal);
            pass.setIndexBuffer(item.index, "uint32");
            pass.drawIndexedIndirect(item.drawArgs, item.drawArgsOffset);
            return;
        }
        // The contour's buffers are remade when they grow, so the bindings follow them.
        const sources = [item.position, item.normal, item.index];
        if (!uniforms.lines || uniforms.lines.sources.some((b, i) => b !== sources[i])) {
            uniforms.lines = {
                sources,
                bindGroup: this.device.createBindGroup({
                    label: `thick lines ${item.key}`,
                    layout: this.lineLayout,
                    entries: sources.map((buffer, binding) => ({ binding, resource: { buffer } })),
                }),
            };
        }
        pass.setPipeline(this.linePipeline(item.style === "lit-lines", item.transparent));
        pass.setBindGroup(2, uniforms.lines.bindGroup);
        pass.drawIndirect(item.drawArgs, item.drawArgsOffset);
    }

    /**
     * Make the GPU copies match the scene: upload what is new or changed, free what has gone.
     * Returns the number of sub-buffers uploaded.
     */
    private syncResources(displayBuffers: readonly DisplayBuffer[], draws: PreviewDraw[]): number {
        const present = new Set(displayBuffers);
        for (const [buffer, subs] of this.resources) {
            if (!present.has(buffer)) {
                subs.forEach(sub => sub?.buffers.forEach(b => b.destroy()));
                this.resources.delete(buffer);
            }
        }

        let uploads = 0;
        for (const item of draws) {
            let subs = this.resources.get(item.buffer);
            if (!subs) {
                subs = [];
                this.resources.set(item.buffer, subs);
            }
            const existing = subs[item.index];
            const sources = this.sourcesOf(item);
            if (existing && existing.dataVersion === item.buffer.dataVersion
                && existing.sources.every((s, i) => s === sources[i])) continue;
            existing?.buffers.forEach(b => b.destroy());
            subs[item.index] = this.upload(item, sources);
            uploads++;
        }
        return uploads;
    }

    private sourcesOf(item: PreviewDraw): unknown[] {
        const b = item.buffer, j = item.index;
        if (item.primitive === "spheres") {
            return [b.triangleInstanceOrigins[j], b.triangleInstanceSizes[j], b.triangleColours[j], item.primitive];
        }
        if (item.primitive === "lines" || item.primitive === "lit-lines") {
            return [b.triangleVertices[j], b.triangleNormals?.[j], b.triangleColours?.[j], b.triangleIndexs?.[j], item.primitive, item.colourSource, item.indexCount];
        }
        return [
            b.triangleVertices[j], b.triangleNormals[j], b.triangleColours?.[j], b.triangleIndexs[j],
            b.triangleInstanceOrigins?.[j], b.triangleInstanceSizes?.[j], b.triangleInstanceOrientations?.[j],
            item.colourSource,
        ];
    }

    /**
     * The sub-buffer's vertex and index buffers, in as many pieces as the buffer size limit
     * needs: usually one. A colour has the widest vertex (16 bytes), so it sets the vertex limit.
     * Only per-vertex colours are split with the vertices; per-instance ones are not vertex data.
     */
    private meshChunks(item: PreviewDraw, created: GPUBuffer[]): ChunkResources[] {
        const b = item.buffer, j = item.index;
        const positions = asFloat32(b.triangleVertices[j]);
        const normals = asFloat32(b.triangleNormals[j]);
        const colours = item.colourSource === "vertex" ? asFloat32(b.triangleColours[j]) : null;
        const indices = asUint32(b.triangleIndexs[j]);
        const VERTEX = BufferUsage.VERTEX;
        const plan: MeshChunk[] = planMeshChunks(indices, positions.length / 3,
            Math.floor(this.maxBufferBytes / 4), Math.floor(this.maxBufferBytes / 16));
        return plan.map((chunk, n) => {
            const label = plan.length > 1 ? ` ${n + 1}/${plan.length}` : "";
            if (chunk.remap) {
                const { vertices, indices: local } = chunk.remap;
                const gather = (source: Float32Array, size: number): Float32Array => {
                    const out = new Float32Array(vertices.length * size);
                    vertices.forEach((v, i) => out.set(source.subarray(v * size, v * size + size), i * size));
                    return out;
                };
                return {
                    position: this.vertexBuffer(`position${label}`, gather(positions, 3), VERTEX, created),
                    normal: this.vertexBuffer(`normal${label}`, gather(normals, 3), VERTEX, created),
                    colour: colours ? this.vertexBuffer(`colour${label}`, gather(colours, 4), VERTEX, created) : null,
                    index: this.vertexBuffer(`index${label}`, local, BufferUsage.INDEX, created),
                    indexCount: chunk.indexCount,
                    baseVertex: 0,
                };
            }
            const v0 = chunk.firstVertex, v1 = chunk.firstVertex + chunk.vertexCount;
            return {
                position: this.vertexBuffer(`position${label}`, positions.subarray(3 * v0, 3 * v1), VERTEX, created),
                normal: this.vertexBuffer(`normal${label}`, normals.subarray(3 * v0, 3 * v1), VERTEX, created),
                colour: colours ? this.vertexBuffer(`colour${label}`, colours.subarray(4 * v0, 4 * v1), VERTEX, created) : null,
                index: this.vertexBuffer(`index${label}`, indices.subarray(chunk.firstIndex, chunk.firstIndex + chunk.indexCount),
                    BufferUsage.INDEX, created),
                indexCount: chunk.indexCount,
                baseVertex: -v0,
            };
        });
    }

    /**
     * A LINES or NORMALLINES sub-buffer's arrays as storage, for vs_segment: positions, normals
     * (lit only), colours (per vertex only), and segment index pairs - made up, 0 1 2 3 ..., when
     * the buffer pairs its vertices in order. Unused bindings get the positions as a stand-in.
     */
    private segmentBindings(item: PreviewDraw, created: GPUBuffer[]): { bindGroup: GPUBindGroup; count: number } {
        const b = item.buffer, j = item.index;
        const STORAGE = BufferUsage.STORAGE;
        const positions = this.vertexBuffer("segment positions", asFloat32(b.triangleVertices[j]), STORAGE, created);
        const normals = item.primitive === "lit-lines" ? this.vertexBuffer("segment normals", asFloat32(b.triangleNormals[j]), STORAGE, created) : positions;
        const colours = item.colourSource === "vertex" ? this.vertexBuffer("segment colours", asFloat32(b.triangleColours[j]), STORAGE, created) : positions;
        const pairs = item.indexCount > 0
            ? asUint32(b.triangleIndexs[j]).subarray(0, item.indexCount)
            : Uint32Array.from({ length: item.vertexCount }, (_, i) => i);
        const segments = this.vertexBuffer("segments", pairs, STORAGE, created);
        const bindGroup = this.device.createBindGroup({
            label: "segments",
            layout: this.segmentLayout,
            entries: [positions, normals, colours, segments].map((buffer, n) => ({ binding: 3 + n, resource: { buffer } })),
        });
        return { bindGroup, count: pairs.length / 2 };
    }

    /** The spheres' origins, sizes and colours, in as many pieces as the buffer size limit needs. */
    private sphereChunks(item: PreviewDraw, created: GPUBuffer[]): SphereChunk[] {
        const b = item.buffer, j = item.index;
        const n = item.instanceCount;
        const origins = asFloat32(b.triangleInstanceOrigins[j]);
        const sizes = asFloat32(b.triangleInstanceSizes[j]);
        const colours = asFloat32(b.triangleColours[j]);
        // A colour, 16 bytes a sphere, is the widest.
        const perChunk = Math.max(1, Math.floor(this.maxBufferBytes / 16));
        const chunks: SphereChunk[] = [];
        for (let first = 0; first < n; first += perChunk) {
            const count = Math.min(perChunk, n - first);
            const label = n > perChunk ? ` ${first / perChunk + 1}/${Math.ceil(n / perChunk)}` : "";
            chunks.push({
                origin: this.vertexBuffer(`sphere origin${label}`, origins.subarray(3 * first, 3 * (first + count)), BufferUsage.VERTEX, created),
                size: this.vertexBuffer(`sphere size${label}`, sizes.subarray(3 * first, 3 * (first + count)), BufferUsage.VERTEX, created),
                colour: this.vertexBuffer(`sphere colour${label}`, colours.subarray(4 * first, 4 * (first + count)), BufferUsage.VERTEX, created),
                count,
            });
        }
        return chunks;
    }

    private vertexBuffer(label: string, data: Float32Array | Uint32Array, usage: number, created: GPUBuffer[]): GPUBuffer {
        const buffer = this.device.createBuffer({
            label,
            size: Math.max(4, data.byteLength),
            usage: usage | BufferUsage.COPY_DST,
        });
        this.device.queue.writeBuffer(buffer, 0, data.buffer, data.byteOffset, data.byteLength);
        created.push(buffer);
        return buffer;
    }

    private upload(item: PreviewDraw, sources: unknown[]): SubBufferResources {
        const b = item.buffer, j = item.index;
        const created: GPUBuffer[] = [];
        const VERTEX = BufferUsage.VERTEX;

        const isLines = item.primitive === "lines" || item.primitive === "lit-lines";
        const segments = isLines ? this.segmentBindings(item, created) : null;
        const spheres = item.primitive === "spheres" ? this.sphereChunks(item, created) : [];
        const chunks = item.primitive === "spheres" || isLines ? [] : this.meshChunks(item, created);
        const instanceColour = item.colourSource === "instance" && item.primitive !== "spheres"
            ? this.vertexBuffer("instance colour", asFloat32(b.triangleColours[j]), VERTEX, created)
            : null;

        let instanceOrigin: GPUBuffer | null = null;
        let instanceSize: GPUBuffer | null = null;
        let instanceOrientation: GPUBuffer | null = null;
        if (item.instanced && item.primitive !== "spheres") {
            const n = item.instanceCount;
            instanceOrigin = this.vertexBuffer("instance origin", asFloat32(b.triangleInstanceOrigins[j]), VERTEX, created);
            // WebGL leaves a missing size or orientation to the attribute's default value, which
            // collapses the instance to a point. Unit size and identity are what was meant.
            const sizes = b.triangleInstanceSizes?.[j];
            instanceSize = this.vertexBuffer("instance size",
                sizes && sizes.length >= n * 3 ? asFloat32(sizes) : new Float32Array(n * 3).fill(1), VERTEX, created);
            const orientations = b.triangleInstanceOrientations?.[j];
            let orientationData: Float32Array;
            if (orientations && orientations.length >= n * 16) {
                orientationData = asFloat32(orientations);
            } else {
                orientationData = new Float32Array(n * 16);
                for (let i = 0; i < n; i++) orientationData.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], i * 16);
            }
            instanceOrientation = this.vertexBuffer("instance orientation", orientationData, VERTEX, created);
        }

        // The original's block; writeDrawBlocks makes room for symmetry copies when there are any.
        const drawUniforms = this.device.createBuffer({
            label: "draw uniforms",
            size: DRAW_STRIDE,
            usage: BufferUsage.UNIFORM | BufferUsage.COPY_DST,
        });
        created.push(drawUniforms);
        const bindGroup = this.device.createBindGroup({
            layout: this.drawLayout,
            entries: [{ binding: 0, resource: { buffer: drawUniforms, offset: 0, size: DRAW_FLOATS * 4 } }],
        });

        return {
            dataVersion: b.dataVersion, sources, buffers: created,
            chunks, instanceColour, instanceOrigin, instanceSize, instanceOrientation, spheres, segments,
            drawUniforms, bindGroups: [bindGroup],
        };
    }

    private pipeline(kind: PipelineKind, transparent: boolean): GPURenderPipeline {
        const key = `${kind}|${transparent}`;
        const cached = this.pipelines.get(key);
        if (cached) return cached;

        const vec3 = (location: number, stepMode: GPUVertexStepMode = "vertex"): GPUVertexBufferLayout =>
            ({ arrayStride: 12, stepMode, attributes: [{ shaderLocation: location, offset: 0, format: "float32x3" }] });
        const vec4 = (location: number, stepMode: GPUVertexStepMode): GPUVertexBufferLayout =>
            ({ arrayStride: 16, stepMode, attributes: [{ shaderLocation: location, offset: 0, format: "float32x4" }] });
        const orientation: GPUVertexBufferLayout = {
            arrayStride: 64, stepMode: "instance",
            attributes: [0, 1, 2, 3].map(i => ({ shaderLocation: 5 + i, offset: 16 * i, format: "float32x4" as GPUVertexFormat })),
        };

        if (kind === "spheres") {
            const pipeline = this.device.createRenderPipeline({
                label: `preview ${key}`,
                layout: this.pipelineLayout,
                vertex: {
                    module: this.module, entryPoint: "vs_sphere",
                    buffers: [vec3(0, "instance"), vec3(1, "instance"), vec4(2, "instance")],
                },
                fragment: { module: this.module, entryPoint: "fs_sphere", targets: [this.colourTargetState(transparent)] },
                primitive: { topology: "triangle-list", cullMode: "none" },
                depthStencil: { format: DEPTH_FORMAT, depthWriteEnabled: !transparent, depthCompare: "less" },
                multisample: { count: SAMPLE_COUNT },
            });
            this.pipelines.set(key, pipeline);
            return pipeline;
        }

        const buffers: GPUVertexBufferLayout[] = [vec3(0), vec3(1)];
        let entryPoint: string;
        switch (kind) {
            case "mesh-vertex": buffers.push(vec4(2, "vertex")); entryPoint = "vs_mesh_vertex_colour"; break;
            case "mesh-uniform": entryPoint = "vs_mesh_uniform_colour"; break;
            case "instanced-vertex": buffers.push(vec4(2, "vertex")); entryPoint = "vs_instanced_attribute_colour"; break;
            case "instanced-instance": buffers.push(vec4(2, "instance")); entryPoint = "vs_instanced_attribute_colour"; break;
            case "instanced-uniform": entryPoint = "vs_instanced_uniform_colour"; break;
        }
        if (kind.startsWith("instanced")) buffers.push(vec3(3, "instance"), vec3(4, "instance"), orientation);

        const pipeline = this.device.createRenderPipeline({
            label: `preview ${key}`,
            layout: this.pipelineLayout,
            vertex: { module: this.module, entryPoint, buffers },
            fragment: {
                module: this.module,
                entryPoint: "fs_main",
                targets: [this.colourTargetState(transparent)],
            },
            // The WebGL view draws with face culling off, back faces flat-shaded.
            primitive: { topology: "triangle-list", cullMode: "none", frontFace: "ccw" },
            depthStencil: { format: DEPTH_FORMAT, depthWriteEnabled: !transparent, depthCompare: "less" },
            multisample: { count: SAMPLE_COUNT },
        });
        this.pipelines.set(key, pipeline);
        return pipeline;
    }

    /** Thick lines, unlit or lit; no vertex buffers, as the vertex shader reads storage. */
    private linePipeline(lit: boolean, transparent: boolean): GPURenderPipeline {
        const key = `thick-line|${lit}|${transparent}`;
        const cached = this.pipelines.get(key);
        if (cached) return cached;
        const pipeline = this.device.createRenderPipeline({
            label: `preview ${key}`,
            layout: this.linePipelineLayout,
            vertex: { module: this.module, entryPoint: "vs_thick_line", buffers: [] },
            fragment: { module: this.module, entryPoint: lit ? "fs_lit_line" : "fs_line", targets: [this.colourTargetState(transparent)] },
            primitive: { topology: "triangle-list", cullMode: "none" },
            depthStencil: { format: DEPTH_FORMAT, depthWriteEnabled: !transparent, depthCompare: "less" },
            multisample: { count: SAMPLE_COUNT },
        });
        this.pipelines.set(key, pipeline);
        return pipeline;
    }

    /** LINES (unlit) and NORMALLINES (lit) from DisplayBuffers; storage, no vertex buffers. */
    private segmentPipeline(lit: boolean, transparent: boolean): GPURenderPipeline {
        const key = `segments|${lit}|${transparent}`;
        const cached = this.pipelines.get(key);
        if (cached) return cached;
        const pipeline = this.device.createRenderPipeline({
            label: `preview ${key}`,
            layout: this.segmentPipelineLayout,
            vertex: { module: this.module, entryPoint: lit ? "vs_lit_segment" : "vs_segment", buffers: [] },
            fragment: { module: this.module, entryPoint: lit ? "fs_lit_line" : "fs_line", targets: [this.colourTargetState(transparent)] },
            primitive: { topology: "triangle-list", cullMode: "none" },
            depthStencil: { format: DEPTH_FORMAT, depthWriteEnabled: !transparent, depthCompare: "less" },
            multisample: { count: SAMPLE_COUNT },
        });
        this.pipelines.set(key, pipeline);
        return pipeline;
    }

    private colourTargetState(transparent: boolean): GPUColorTargetState {
        return {
            format: this.format,
            blend: transparent ? {
                color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" },
                alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
            } : undefined,
        };
    }
}
