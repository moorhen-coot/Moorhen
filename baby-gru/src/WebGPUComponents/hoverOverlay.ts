/**
 * The hover overlay on a smooth mesh (MetaBalls, molecular surfaces, cavities): the hovered mesh
 * drawn again in orange over itself, blended, each vertex as opaque as the hovered point's share
 * of it (vs_hover_overlay in previewShaders.ts; what to light comes from hoverHighlight.ts).
 *
 * WebGL packs a mesh's influence lists into three textures; here they are storage buffers, made
 * the first time the mesh is hovered and kept while it stays in the scene with the same lists.
 * A mesh whose lists are bigger than one storage binding goes without the overlay, with a warning.
 */
import type { DisplayBuffer } from '../WebGLgComponents/displayBuffer';
import type { InfluenceData } from '../WebGLgComponents/glResources';
import { BufferUsage, ShaderStage } from './gpu';
import type { HoverOverlay } from './hoverHighlight';

/** The parts of a mesh chunk the overlay draws with (previewRenderer's ChunkResources). */
export interface OverlayChunk {
    position: GPUBuffer;
    normal: GPUBuffer;
    index: GPUBuffer;
    indexCount: number;
    baseVertex: number;
    /** The mesh vertex the chunk's vertex 0 is; null for a chunk whose vertices were gathered. */
    firstVertex: number | null;
}

interface InfluenceBuffers {
    influence: InfluenceData;
    buffers: GPUBuffer[];
    /** Null for lists too big to bind. */
    bindGroup: GPUBindGroup | null;
}

const asUint32 = (data: ArrayLike<number>): Uint32Array =>
    data instanceof Uint32Array ? data : Uint32Array.from(data);

const asFloat32 = (data: ArrayLike<number>): Float32Array =>
    data instanceof Float32Array ? data : Float32Array.from(data);

export class HoverOverlayLayer {
    readonly layout: GPUBindGroupLayout;
    private readonly pipelineLayout: GPUPipelineLayout;
    private pipeline: GPURenderPipeline | null = null;
    private readonly uniforms: GPUBuffer;
    /** Per buffer: its lists on the GPU. */
    private readonly influences = new Map<DisplayBuffer, InfluenceBuffers>();
    /** For a whole mesh: one-element stand-ins, never read. */
    private wholeGroup: GPUBindGroup | null = null;
    private readonly standIns: GPUBuffer[] = [];
    private readonly warned = new WeakSet<DisplayBuffer>();

    constructor(private readonly device: GPUDevice, private readonly module: GPUShaderModule,
                frameLayout: GPUBindGroupLayout, drawLayout: GPUBindGroupLayout,
                private readonly target: GPUColorTargetState, private readonly depthFormat: GPUTextureFormat,
                private readonly sampleCount: number, private readonly maxBufferBytes: number) {
        this.layout = device.createBindGroupLayout({
            label: "hover overlay",
            entries: [
                { binding: 12, visibility: ShaderStage.VERTEX, buffer: { type: "uniform" } },
                ...[13, 14, 15].map(binding => ({ binding, visibility: ShaderStage.VERTEX, buffer: { type: "read-only-storage" as const } })),
            ],
        });
        this.pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [frameLayout, drawLayout, this.layout] });
        this.uniforms = device.createBuffer({ label: "hover overlay", size: 16, usage: BufferUsage.UNIFORM | BufferUsage.COPY_DST });
    }

    /**
     * Draw the overlay of `overlay.buffer`'s first sub-buffer, whose mesh is in `chunks` and whose
     * Draw block for chunk c is `drawGroups[c]` (written for this frame by the main draw).
     */
    draw(pass: GPURenderPassEncoder, overlay: HoverOverlay, chunks: readonly OverlayChunk[], drawGroups: readonly GPUBindGroup[]): boolean {
        const group = overlay.whole ? this.wholeBindGroup() : this.influenceBindGroup(overlay.buffer, overlay.influence);
        if (!group) return false;
        this.device.queue.writeBuffer(this.uniforms, 0, new Uint32Array([overlay.point >>> 0, overlay.mask >>> 0, overlay.whole ? 1 : 0, 0]));
        pass.setPipeline(this.ensurePipeline());
        pass.setBindGroup(2, group);
        chunks.forEach((chunk, c) => {
            // A gathered chunk's vertex numbers are not the mesh's, so its lists cannot be found.
            if (chunk.firstVertex === null || !drawGroups[c]) return;
            pass.setBindGroup(1, drawGroups[c]);
            pass.setVertexBuffer(0, chunk.position);
            pass.setVertexBuffer(1, chunk.normal);
            pass.setIndexBuffer(chunk.index, "uint32");
            pass.drawIndexed(chunk.indexCount, 1, 0, chunk.baseVertex);
        });
        return true;
    }

    /** Free the lists of buffers that have left the scene. */
    forget(present: ReadonlySet<DisplayBuffer>): void {
        for (const [buffer, held] of this.influences) {
            if (present.has(buffer)) continue;
            held.buffers.forEach(b => b.destroy());
            this.influences.delete(buffer);
        }
    }

    destroy(): void {
        for (const held of this.influences.values()) held.buffers.forEach(b => b.destroy());
        this.influences.clear();
        this.standIns.forEach(b => b.destroy());
        this.uniforms.destroy();
    }

    private influenceBindGroup(buffer: DisplayBuffer, influence: InfluenceData | null): GPUBindGroup | null {
        if (!influence) return null;
        const before = this.influences.get(buffer);
        if (before?.influence === influence) return before.bindGroup;
        before?.buffers.forEach(b => b.destroy());

        const arrays = [asUint32(influence.index_offsets), asUint32(influence.point_indexes), asFloat32(influence.weights)];
        const limit = Math.min(this.device.limits.maxStorageBufferBindingSize, this.maxBufferBytes);
        if (arrays.some(a => a.byteLength > limit)) {
            if (!this.warned.has(buffer)) {
                this.warned.add(buffer);
                console.warn(`Hover highlight: this mesh's influence lists (${Math.max(...arrays.map(a => a.byteLength))} bytes) `
                    + `are bigger than a WebGPU storage binding (${limit} bytes), so it will not light when hovered.`);
            }
            this.influences.set(buffer, { influence, buffers: [], bindGroup: null });
            return null;
        }
        const buffers = arrays.map((data, n) => {
            const gpu = this.device.createBuffer({
                label: ["hover influence ends", "hover influence points", "hover influence weights"][n],
                size: Math.max(4, data.byteLength), usage: BufferUsage.STORAGE | BufferUsage.COPY_DST,
            });
            this.device.queue.writeBuffer(gpu, 0, data.buffer, data.byteOffset, data.byteLength);
            return gpu;
        });
        const held = { influence, buffers, bindGroup: this.bindGroup(buffers) };
        this.influences.set(buffer, held);
        return held.bindGroup;
    }

    private wholeBindGroup(): GPUBindGroup {
        if (!this.wholeGroup) {
            for (let n = 0; n < 3; n++) {
                this.standIns.push(this.device.createBuffer({ label: "hover stand-in", size: 4, usage: BufferUsage.STORAGE }));
            }
            this.wholeGroup = this.bindGroup(this.standIns);
        }
        return this.wholeGroup;
    }

    private bindGroup(storage: GPUBuffer[]): GPUBindGroup {
        return this.device.createBindGroup({
            label: "hover overlay",
            layout: this.layout,
            entries: [
                { binding: 12, resource: { buffer: this.uniforms } },
                ...storage.map((buffer, n) => ({ binding: 13 + n, resource: { buffer } })),
            ],
        });
    }

    /**
     * Blended over the scene, depth-tested less-equal against the mesh's own depth and writing
     * none, as drawCore draws its overlay (depthFunc LEQUAL, depthMask false, blending on).
     */
    private ensurePipeline(): GPURenderPipeline {
        if (this.pipeline) return this.pipeline;
        const vec3 = (location: number): GPUVertexBufferLayout =>
            ({ arrayStride: 12, stepMode: "vertex", attributes: [{ shaderLocation: location, offset: 0, format: "float32x3" }] });
        this.pipeline = this.device.createRenderPipeline({
            label: "hover overlay",
            layout: this.pipelineLayout,
            vertex: { module: this.module, entryPoint: "vs_hover_overlay", buffers: [vec3(0), vec3(1)] },
            fragment: { module: this.module, entryPoint: "fs_main", targets: [this.target] },
            primitive: { topology: "triangle-list", cullMode: "none", frontFace: "ccw" },
            depthStencil: { format: this.depthFormat, depthWriteEnabled: false, depthCompare: "less-equal" },
            multisample: { count: this.sampleCount },
        });
        return this.pipeline;
    }
}
