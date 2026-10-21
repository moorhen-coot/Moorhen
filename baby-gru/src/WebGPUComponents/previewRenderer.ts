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
    ColourSource, FRAME_FLOATS, PreviewCameraSource, PreviewDraw, PreviewPlan, frameUniforms, planPreview,
} from './previewScene';

// The WebGPU flag constants, by their values in the specification. TypeScript's DOM library has
// the WebGPU interfaces but not these globals, and they are fixed by the spec, so spelling them
// out is simpler than adding @webgpu/types for three objects.
const BufferUsage = { COPY_DST: 0x0008, INDEX: 0x0010, VERTEX: 0x0020, UNIFORM: 0x0040 } as const;
const TextureUsage = { RENDER_ATTACHMENT: 0x10 } as const;
const ShaderStage = { VERTEX: 0x1, FRAGMENT: 0x2 } as const;

const SAMPLE_COUNT = 4;
const DEPTH_FORMAT: GPUTextureFormat = "depth24plus";

export interface PreviewFrameReport {
    plan: PreviewPlan;
    /** GPU buffers created this frame because a DisplayBuffer was new or had changed. */
    uploads: number;
    /** CPU time spent building and submitting the frame, ms. */
    cpuMs: number;
}

/** The GPU side of one sub-buffer. */
interface SubBufferResources {
    dataVersion: number;
    /** The arrays these were uploaded from, so that a replaced array is noticed too. */
    sources: unknown[];
    buffers: GPUBuffer[];
    position: GPUBuffer;
    normal: GPUBuffer;
    colour: GPUBuffer | null;
    index: GPUBuffer;
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
    private readonly pipelines = new Map<string, GPURenderPipeline>();
    private readonly resources = new Map<DisplayBuffer, (SubBufferResources | undefined)[]>();
    private readonly frameData = new Float32Array(FRAME_FLOATS);
    private colourTarget: GPUTexture | null = null;
    private depthTarget: GPUTexture | null = null;
    private destroyed = false;

    /**
     * Ask for an adapter and device and configure the canvas. Rejects with a readable message if
     * any step fails, so the caller can show it as it stands.
     */
    static async create(canvas: HTMLCanvasElement, onError: (message: string) => void): Promise<WebGPUPreviewRenderer> {
        const unavailable = webGPUUnavailableReason();
        if (unavailable) throw new Error(unavailable);
        const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
        if (!adapter) throw new Error("WebGPU is present but no adapter was offered (blocklisted GPU or driver?).");
        const device = await adapter.requestDevice();
        // The DOM library's getContext overloads do not include "webgpu" yet.
        const context = canvas.getContext("webgpu") as unknown as GPUCanvasContext | null;
        if (!context) throw new Error("The canvas would not give a WebGPU context.");
        const info = adapter.info;
        const description = info ? [info.vendor, info.architecture, info.description].filter(Boolean).join(" ") : "";
        return new WebGPUPreviewRenderer(device, context, description || "unknown adapter", onError);
    }

    private constructor(device: GPUDevice, context: GPUCanvasContext, adapterDescription: string, onError: (message: string) => void) {
        this.device = device;
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
    render(displayBuffers: readonly DisplayBuffer[], camera: PreviewCameraSource): PreviewFrameReport {
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
        }
        pass.end();
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
        let slot = 0;
        pass.setVertexBuffer(slot++, sub.position);
        pass.setVertexBuffer(slot++, sub.normal);
        if (item.colourSource !== "uniform") pass.setVertexBuffer(slot++, sub.colour);
        if (item.instanced) {
            pass.setVertexBuffer(slot++, sub.instanceOrigin);
            pass.setVertexBuffer(slot++, sub.instanceSize);
            pass.setVertexBuffer(slot++, sub.instanceOrientation);
        }
        pass.setIndexBuffer(sub.index, "uint32");
        pass.drawIndexed(item.indexCount, item.instanceCount);
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

        const position = this.vertexBuffer("position", asFloat32(b.triangleVertices[j]), VERTEX, created);
        const normal = this.vertexBuffer("normal", asFloat32(b.triangleNormals[j]), VERTEX, created);
        const colour = item.colourSource === "uniform" ? null
            : this.vertexBuffer("colour", asFloat32(b.triangleColours[j]), VERTEX, created);
        const index = this.vertexBuffer("index", asUint32(b.triangleIndexs[j]), BufferUsage.INDEX, created);

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
            position, normal, colour, index, instanceOrigin, instanceSize, instanceOrientation,
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
                targets: [{
                    format: this.format,
                    blend: transparent ? {
                        color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" },
                        alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
                    } : undefined,
                }],
            },
            // The WebGL view draws with face culling off, back faces flat-shaded.
            primitive: { topology: "triangle-list", cullMode: "none", frontFace: "ccw" },
            depthStencil: { format: DEPTH_FORMAT, depthWriteEnabled: !transparent, depthCompare: "less" },
            multisample: { count: SAMPLE_COUNT },
        });
        this.pipelines.set(key, pipeline);
        return pipeline;
    }
}
