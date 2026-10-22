/**
 * A WebGPU renderer for the scene's TRIANGLES sub-buffers, drawing into its own canvas.
 *
 * Nothing is shared with the WebGL context. It reads the same DisplayBuffers (their CPU-side
 * typed arrays) and the same camera, uploads what it needs into its own GPU buffers, and keeps
 * those until the DisplayBuffer's data changes or the buffer leaves the scene.
 *
 * What it does not do yet is listed in planPreview; what it does is lighting and fog as the
 * WebGL triangle shader has them, 4x multisampling, and a second, blended pass for transparent
 * geometry - unsorted and without depth peeling, so overlapping transparent surfaces can differ
 * from the WebGL view.
 */
import type { DisplayBuffer } from '../WebGLgComponents/displayBuffer';
import { PREVIEW_WGSL } from './previewShaders';
import {
    ColourSource, FRAME_FLOATS, MeshChunk, PreviewCameraSource, PreviewDraw, PreviewPlan, frameUniforms, planMeshChunks, planPreview,
} from './previewScene';

// The WebGPU flag constants, by their values in the specification. TypeScript's DOM library has
// the WebGPU interfaces but not these globals, and they are fixed by the spec, so spelling them
// out is simpler than adding @webgpu/types for three objects.
const BufferUsage = { COPY_DST: 0x0008, INDEX: 0x0010, VERTEX: 0x0020, UNIFORM: 0x0040 } as const;
const TextureUsage = { RENDER_ATTACHMENT: 0x10 } as const;
const ShaderStage = { VERTEX: 0x1, FRAGMENT: 0x2 } as const;

/**
 * WebGL's thick lines are 2 × pixelZoom × size² Å wide, pixelZoom being 0.04 × zoom when the
 * buffer has no primitive sizes (map contours have none) and size the map line width:
 * drawCore.ts sets pixelZoom; linesToThickLinesWithIndices makes the "normals" size long, and
 * thick-lines-vertex-shader.js offsets by pixelZoom times their length squared, each way.
 */
export const thickLineHalfWidth = (lineWidth: number, zoom: number): number => 0.04 * zoom * lineWidth * lineWidth;

const SAMPLE_COUNT = 4;
const DEPTH_FORMAT: GPUTextureFormat = "depth24plus";

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
    drawUniforms: GPUBuffer;
    bindGroup: GPUBindGroup;
}

type PipelineKind = "mesh-vertex" | "mesh-uniform" | "instanced-vertex" | "instanced-instance" | "instanced-uniform";

const pipelineKind = (instanced: boolean, colour: ColourSource): PipelineKind =>
    instanced
        ? (colour === "vertex" ? "instanced-vertex" : colour === "instance" ? "instanced-instance" : "instanced-uniform")
        : (colour === "uniform" ? "mesh-uniform" : "mesh-vertex");

const asFloat32 = (data: ArrayLike<number>): Float32Array =>
    data instanceof Float32Array ? data : Float32Array.from(data);

const asUint32 = (data: ArrayLike<number>): Uint32Array =>
    data instanceof Uint32Array ? data : Uint32Array.from(data);

/** Why WebGPU cannot be used here, or null if it can. Cheap; does not create a device. */
export function webGPUUnavailableReason(): string | null {
    if (typeof navigator === "undefined" || !("gpu" in navigator) || !navigator.gpu) {
        return "This browser does not offer WebGPU (navigator.gpu is missing). Chrome and Edge have it " +
            "on Windows, macOS and ChromeOS, Safari from version 26, and Firefox from 141 on Windows; " +
            "on Linux it usually needs enabling by hand.";
    }
    return null;
}

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

    /**
     * Ask for an adapter and device and configure the canvas. Rejects with a readable message if
     * any step fails, so the caller can show it as it stands.
     */
    static async create(canvas: HTMLCanvasElement, onError: (message: string) => void,
                        options: { maxBufferBytes?: number } = {}): Promise<WebGPUPreviewRenderer> {
        const unavailable = webGPUUnavailableReason();
        if (unavailable) throw new Error(unavailable);
        const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
        if (!adapter) throw new Error("WebGPU is present but no adapter was offered (blocklisted GPU or driver?).");
        // The default limit is 256 MB per buffer, which a big surface passes (1ibm's MetaBalls
        // have 341 MB of indices). Ask for what the adapter can do; meshes bigger than even that
        // are drawn in chunks.
        // The storage binding limit likewise, for a map's whole unit cell (GPU map contours).
        const device = await adapter.requestDevice({
            requiredLimits: {
                maxBufferSize: adapter.limits.maxBufferSize,
                maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
            },
        });
        // The DOM library's getContext overloads do not include "webgpu" yet.
        const context = canvas.getContext("webgpu") as unknown as GPUCanvasContext | null;
        if (!context) throw new Error("The canvas would not give a WebGPU context.");
        const info = adapter.info;
        const description = info ? [info.vendor, info.architecture, info.description].filter(Boolean).join(" ") : "";
        // For tests: a smaller limit than the device's, to exercise the chunking.
        const maxBufferBytes = Math.min(device.limits.maxBufferSize, options.maxBufferBytes ?? Infinity);
        return new WebGPUPreviewRenderer(device, context, description || "unknown adapter", onError, maxBufferBytes);
    }

    private constructor(device: GPUDevice, context: GPUCanvasContext, adapterDescription: string, onError: (message: string) => void,
                        maxBufferBytes: number) {
        this.device = device;
        this.maxBufferBytes = maxBufferBytes;
        this.context = context;
        this.adapterDescription = adapterDescription;
        this.format = navigator.gpu.getPreferredCanvasFormat();
        context.configure({ device, format: this.format, alphaMode: "opaque" });

        device.addEventListener("uncapturederror", (event: GPUUncapturedErrorEvent) => {
            console.error("WebGPU preview:", event.error.message);
            onError(event.error.message);
        });
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
        this.frameBuffer = device.createBuffer({
            label: "preview frame uniforms",
            size: FRAME_FLOATS * 4,
            usage: BufferUsage.UNIFORM | BufferUsage.COPY_DST,
        });
        this.frameBindGroup = device.createBindGroup({
            layout: this.frameLayout,
            entries: [{ binding: 0, resource: { buffer: this.frameBuffer } }],
        });
    }

    /**
     * Draw one frame of `displayBuffers` as seen by `camera`, at the canvas's current size.
     *
     * The canvas's width and height are the caller's business (device pixels); this only follows
     * them.
     */
    /** The device everything is drawn with: GPU buffers for gpuDraws must be made on it. */
    get gpuDevice(): GPUDevice {
        return this.device;
    }

    render(displayBuffers: readonly DisplayBuffer[], camera: PreviewCameraSource, gpuDraws: readonly PreviewGpuDraw[] = []): PreviewFrameReport {
        const started = performance.now();
        const canvas = this.context.canvas as HTMLCanvasElement;
        const width = Math.max(1, canvas.width);
        const height = Math.max(1, canvas.height);
        this.ensureTargets(width, height);

        const plan = planPreview(displayBuffers);
        const uploads = this.syncResources(displayBuffers, plan.draws);

        this.device.queue.writeBuffer(this.frameBuffer, 0, frameUniforms(camera, width, height, this.frameData));

        const background = camera.background_colour;
        const encoder = this.device.createCommandEncoder({ label: "preview frame" });
        const pass = encoder.beginRenderPass({
            colorAttachments: [{
                view: this.colourTarget.createView(),
                resolveTarget: this.context.getCurrentTexture().createView(),
                clearValue: { r: background[0], g: background[1], b: background[2], a: 1 },
                loadOp: "clear",
                storeOp: "discard",
            }],
            depthStencilAttachment: {
                view: this.depthTarget.createView(),
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
                this.drawOne(pass, item);
            }
            for (const item of gpuDraws) {
                if (item.transparent === transparent) this.drawGpu(pass, item, camera.zoom);
            }
        }
        pass.end();
        for (const [key, uniforms] of this.gpuDrawUniforms) {
            if (!gpuDraws.some(item => item.key === key)) {
                uniforms.buffer.destroy();
                this.gpuDrawUniforms.delete(key);
            }
        }
        this.device.queue.submit([encoder.finish()]);

        return { plan, uploads, cpuMs: performance.now() - started };
    }

    /** Release every GPU resource. The renderer cannot be used afterwards. */
    destroy(): void {
        this.destroyed = true;
        for (const subs of this.resources.values()) subs.forEach(sub => sub?.buffers.forEach(b => b.destroy()));
        this.resources.clear();
        this.colourTarget?.destroy();
        this.depthTarget?.destroy();
        this.frameBuffer.destroy();
        this.gpuDrawUniforms.forEach(u => u.buffer.destroy());
        this.gpuDrawUniforms.clear();
        this.context.unconfigure();
        this.device.destroy();
    }

    private ensureTargets(width: number, height: number): void {
        if (this.colourTarget && this.colourTarget.width === width && this.colourTarget.height === height) return;
        this.colourTarget?.destroy();
        this.depthTarget?.destroy();
        this.colourTarget = this.device.createTexture({
            label: "preview colour (multisampled)",
            size: [width, height],
            format: this.format,
            sampleCount: SAMPLE_COUNT,
            usage: TextureUsage.RENDER_ATTACHMENT,
        });
        this.depthTarget = this.device.createTexture({
            label: "preview depth",
            size: [width, height],
            format: DEPTH_FORMAT,
            sampleCount: SAMPLE_COUNT,
            usage: TextureUsage.RENDER_ATTACHMENT,
        });
    }

    private drawOne(pass: GPURenderPassEncoder, item: PreviewDraw): void {
        const sub = this.resources.get(item.buffer)?.[item.index];
        if (!sub) return;

        const custom = item.buffer.customColour ?? [1, 1, 1, 1];
        this.device.queue.writeBuffer(sub.drawUniforms, 0, new Float32Array([
            custom[0], custom[1], custom[2], custom[3],
            item.buffer.alphaMultiplier ?? 1, 0, 0, 0,
        ]));

        pass.setPipeline(this.pipeline(pipelineKind(item.instanced, item.colourSource), item.transparent));
        pass.setBindGroup(1, sub.bindGroup);
        const colourSlot = item.colourSource !== "uniform";
        if (item.colourSource === "instance") pass.setVertexBuffer(2, sub.instanceColour);
        if (item.instanced) {
            let slot = colourSlot ? 3 : 2;
            pass.setVertexBuffer(slot++, sub.instanceOrigin);
            pass.setVertexBuffer(slot++, sub.instanceSize);
            pass.setVertexBuffer(slot++, sub.instanceOrientation);
        }
        for (const chunk of sub.chunks) {
            pass.setVertexBuffer(0, chunk.position);
            pass.setVertexBuffer(1, chunk.normal);
            if (chunk.colour) pass.setVertexBuffer(2, chunk.colour);
            pass.setIndexBuffer(chunk.index, "uint32");
            pass.drawIndexed(chunk.indexCount, item.instanceCount, 0, chunk.baseVertex);
        }
    }

    private drawGpu(pass: GPURenderPassEncoder, item: PreviewGpuDraw, zoom: number): void {
        let uniforms = this.gpuDrawUniforms.get(item.key);
        if (!uniforms) {
            const buffer = this.device.createBuffer({ label: `draw uniforms ${item.key}`, size: 32, usage: BufferUsage.UNIFORM | BufferUsage.COPY_DST });
            const bindGroup = this.device.createBindGroup({ layout: this.drawLayout, entries: [{ binding: 0, resource: { buffer } }] });
            uniforms = { buffer, bindGroup };
            this.gpuDrawUniforms.set(item.key, uniforms);
        }
        const halfWidth = item.style === "triangles" ? 0 : thickLineHalfWidth(item.lineWidth, zoom);
        this.device.queue.writeBuffer(uniforms.buffer, 0, new Float32Array([...item.colour, 1, halfWidth, 0, 0]));
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

        const chunks = this.meshChunks(item, created);
        const instanceColour = item.colourSource === "instance"
            ? this.vertexBuffer("instance colour", asFloat32(b.triangleColours[j]), VERTEX, created)
            : null;

        let instanceOrigin: GPUBuffer | null = null;
        let instanceSize: GPUBuffer | null = null;
        let instanceOrientation: GPUBuffer | null = null;
        if (item.instanced) {
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

        const drawUniforms = this.device.createBuffer({
            label: "draw uniforms",
            size: 32,
            usage: BufferUsage.UNIFORM | BufferUsage.COPY_DST,
        });
        created.push(drawUniforms);
        const bindGroup = this.device.createBindGroup({
            layout: this.drawLayout,
            entries: [{ binding: 0, resource: { buffer: drawUniforms } }],
        });

        return {
            dataVersion: b.dataVersion, sources, buffers: created,
            chunks, instanceColour, instanceOrigin, instanceSize, instanceOrientation,
            drawUniforms, bindGroup,
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
