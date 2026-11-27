/**
 * The hover overlay on a smooth mesh (MetaBalls, molecular surfaces, cavities): the hovered mesh
 * drawn again in orange over itself, blended, each vertex as opaque as the hovered point's share
 * of it (vs_hover_overlay in previewShaders.ts; what to light comes from hoverHighlight.ts).
 *
 * WebGL packs a mesh's influence lists into three textures; here they are storage buffers, made
 * the first time the mesh is hovered and kept while it stays in the scene with the same lists.
 * A mesh whose lists are bigger than one storage binding goes without the overlay, with a warning.
 *
 * Only the mesh's nearest surface lights, as in WebGL. Drawn over a transparent mesh - whose depth
 * is in no depth buffer - the overlay alone would show every layer of the mesh at once, its back
 * faces (flat, paler) blended over its front ones in whatever order they come. So the mesh's depth
 * is laid down first, in the pass's depth buffer, and the overlay then draws only where it is
 * level with that. An opaque mesh's depth is already there, drawn with the scene, so it skips that.
 *
 * A smooth surface shaded per pixel from its field (fieldShading.ts) is lit by the field here too
 * (vs_hover_overlay_field, fs_hover_overlay_field): the orange with the same per-pixel normals as the
 * surface under it, and - where the surface's atoms are bound for its per-pixel colour - each pixel
 * as opaque as the hovered residue's share of it, as its colour is blended. Otherwise the overlay
 * showed the triangles the surface under it had shed.
 */
import type { DisplayBuffer } from '../WebGLgComponents/displayBuffer';
import type { InfluenceData } from '../WebGLgComponents/glResources';
import { BufferUsage, ShaderStage } from './gpu';
import type { HoverOverlay } from './hoverHighlight';
import { FIELD_GRID_BYTES, type SurfaceColouring, type SurfaceField, atomOwnerCodes, surfaceFieldUniform } from './smoothSurface/surfaceField';

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

/** How the overlay is drawn over its mesh. */
export interface OverlayDrawOptions {
    /** The mesh is transparent: its depth is not in the pass's depth buffer, so the overlay lays it down first. */
    transparent: boolean;
    /** The mesh is shaded per pixel from this field: the overlay is too. */
    field?: SurfaceField | null;
}

interface InfluenceBuffers {
    influence: InfluenceData;
    buffers: GPUBuffer[];
    /** Null for lists too big to bind. */
    bindGroup: GPUBindGroup | null;
}

/** A mesh's group 2 for the field overlay: its lists, its field, its atoms and their owner codes. */
interface FieldGroup {
    influence: InfluenceData | null;
    field: SurfaceField;
    colouring: SurfaceColouring | undefined;
    ownerCodes: ArrayLike<number> | undefined;
    grid: GPUBuffer;
    codes: GPUBuffer | null;
    bindGroup: GPUBindGroup;
}

const asUint32 = (data: ArrayLike<number>): Uint32Array =>
    data instanceof Uint32Array ? data : Uint32Array.from(data);

const asFloat32 = (data: ArrayLike<number>): Float32Array =>
    data instanceof Float32Array ? data : Float32Array.from(data);

export class HoverOverlayLayer {
    readonly layout: GPUBindGroupLayout;
    private readonly pipelineLayout: GPUPipelineLayout;
    /** The field overlay's group 2: the hover's (12 to 15), the field's and its atoms' (16 to 21), the atoms' codes (22). */
    private readonly fieldLayout: GPUBindGroupLayout;
    private readonly fieldPipelineLayout: GPUPipelineLayout;
    private pipeline: GPURenderPipeline | null = null;
    private fieldPipeline: GPURenderPipeline | null = null;
    private depthPipeline: GPURenderPipeline | null = null;
    private readonly uniforms: GPUBuffer;
    /** Per buffer: its lists on the GPU. */
    private readonly influences = new Map<DisplayBuffer, InfluenceBuffers>();
    /** Per buffer shaded per pixel: its field overlay's group 2. */
    private readonly fieldGroups = new Map<DisplayBuffer, FieldGroup>();
    /** For a whole mesh: one-element stand-ins, never read. */
    private wholeGroup: GPUBindGroup | null = null;
    private readonly standIns: GPUBuffer[] = [];
    /** For a field overlay's atoms and codes when there are none: bound, never read. */
    private readonly noAtoms: GPUBuffer;
    private readonly warned = new WeakSet<DisplayBuffer>();

    constructor(private readonly device: GPUDevice, private readonly module: GPUShaderModule,
                frameLayout: GPUBindGroupLayout, drawLayout: GPUBindGroupLayout,
                private readonly target: GPUColorTargetState, private readonly depthFormat: GPUTextureFormat,
                private readonly sampleCount: number, private readonly maxBufferBytes: number) {
        const visibility = ShaderStage.VERTEX | ShaderStage.FRAGMENT;
        this.layout = device.createBindGroupLayout({
            label: "hover overlay",
            entries: [
                { binding: 12, visibility, buffer: { type: "uniform" } },
                ...[13, 14, 15].map(binding => ({ binding, visibility: ShaderStage.VERTEX, buffer: { type: "read-only-storage" as const } })),
            ],
        });
        this.pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [frameLayout, drawLayout, this.layout] });
        this.fieldLayout = device.createBindGroupLayout({
            label: "hover overlay field",
            entries: [
                { binding: 12, visibility, buffer: { type: "uniform" } },
                ...[13, 14, 15].map(binding => ({ binding, visibility: ShaderStage.VERTEX, buffer: { type: "read-only-storage" as const } })),
                { binding: 16, visibility: ShaderStage.FRAGMENT, buffer: { type: "uniform" } },
                ...[17, 18, 19, 20, 21, 22].map(binding => ({ binding, visibility: ShaderStage.FRAGMENT, buffer: { type: "read-only-storage" as const } })),
            ],
        });
        this.fieldPipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [frameLayout, drawLayout, this.fieldLayout] });
        this.uniforms = device.createBuffer({ label: "hover overlay", size: 16, usage: BufferUsage.UNIFORM | BufferUsage.COPY_DST });
        this.noAtoms = device.createBuffer({ label: "hover overlay no atoms", size: 16, usage: BufferUsage.STORAGE });
    }

    /**
     * Draw the overlay of `overlay.buffer`'s first sub-buffer, whose mesh is in `chunks` and whose
     * Draw block for chunk c is `drawGroups[c]` (written for this frame by the main draw).
     */
    draw(pass: GPURenderPassEncoder, overlay: HoverOverlay, chunks: readonly OverlayChunk[], drawGroups: readonly GPUBindGroup[],
         options: OverlayDrawOptions = { transparent: true }): boolean {
        const group = overlay.whole ? this.wholeBindGroup() : this.influenceBindGroup(overlay.buffer, overlay.influence);
        if (!group) return false;
        const fieldGroup = options.field ? this.fieldBindGroup(overlay.buffer, overlay.influence, options.field) : null;
        const pixelShare = !!fieldGroup?.codes && !overlay.whole;
        this.device.queue.writeBuffer(this.uniforms, 0,
            new Uint32Array([overlay.point >>> 0, overlay.mask >>> 0, overlay.whole ? 1 : 0, pixelShare ? 1 : 0]));
        const stages: [GPURenderPipeline, GPUBindGroup][] = [];
        // The mesh's depth, if the pass has not got it, then the overlay level with it.
        if (options.transparent) stages.push([this.ensureDepthPipeline(), group]);
        stages.push(fieldGroup ? [this.ensureFieldPipeline(), fieldGroup.bindGroup] : [this.ensurePipeline(), group]);
        for (const [pipeline, bindGroup] of stages) {
            pass.setPipeline(pipeline);
            pass.setBindGroup(2, bindGroup);
            chunks.forEach((chunk, c) => {
                // A gathered chunk's vertex numbers are not the mesh's, so its lists cannot be found.
                if (chunk.firstVertex === null || !drawGroups[c]) return;
                pass.setBindGroup(1, drawGroups[c]);
                pass.setVertexBuffer(0, chunk.position);
                pass.setVertexBuffer(1, chunk.normal);
                pass.setIndexBuffer(chunk.index, "uint32");
                pass.drawIndexed(chunk.indexCount, 1, 0, chunk.baseVertex);
            });
        }
        return true;
    }

    /** Free the lists of buffers that have left the scene. */
    forget(present: ReadonlySet<DisplayBuffer>): void {
        for (const [buffer, held] of this.influences) {
            if (present.has(buffer)) continue;
            held.buffers.forEach(b => b.destroy());
            this.influences.delete(buffer);
        }
        for (const [buffer, held] of this.fieldGroups) {
            if (present.has(buffer) && !held.field.released) continue;
            this.destroyFieldGroup(held);
            this.fieldGroups.delete(buffer);
        }
    }

    destroy(): void {
        for (const held of this.influences.values()) held.buffers.forEach(b => b.destroy());
        this.influences.clear();
        for (const held of this.fieldGroups.values()) this.destroyFieldGroup(held);
        this.fieldGroups.clear();
        this.standIns.forEach(b => b.destroy());
        this.noAtoms.destroy();
        this.uniforms.destroy();
    }

    private influenceBindGroup(buffer: DisplayBuffer, influence: InfluenceData | null): GPUBindGroup | null {
        const held = this.influenceBuffers(buffer, influence);
        return held?.bindGroup ?? null;
    }

    private influenceBuffers(buffer: DisplayBuffer, influence: InfluenceData | null): InfluenceBuffers | null {
        if (!influence) return null;
        const before = this.influences.get(buffer);
        if (before?.influence === influence) return before;
        before?.buffers.forEach(b => b.destroy());

        const arrays = [asUint32(influence.index_offsets), asUint32(influence.point_indexes), asFloat32(influence.weights)];
        const limit = Math.min(this.device.limits.maxStorageBufferBindingSize, this.maxBufferBytes);
        if (arrays.some(a => a.byteLength > limit)) {
            if (!this.warned.has(buffer)) {
                this.warned.add(buffer);
                console.warn(`Hover highlight: this mesh's influence lists (${Math.max(...arrays.map(a => a.byteLength))} bytes) `
                    + `are bigger than a WebGPU storage binding (${limit} bytes), so it will not light when hovered.`);
            }
            const none = { influence, buffers: [], bindGroup: null };
            this.influences.set(buffer, none);
            return none;
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
        return held;
    }

    /**
     * The field overlay's group 2 for `buffer`, made again when its lists, field, atoms or owner codes
     * change. The grid block is written each time, so a new colour blend width shows at once. Null if
     * the mesh's lists cannot be bound (then it has no overlay at all).
     */
    private fieldBindGroup(buffer: DisplayBuffer, influence: InfluenceData | null, field: SurfaceField): FieldGroup | null {
        const lists = influence ? this.influenceBuffers(buffer, influence) : null;
        if (influence && !lists?.bindGroup) return null;
        const colouring = field.colouring;
        const ownerCodes = buffer.pick_info?.owner_codes as ArrayLike<number> | undefined;
        let held = this.fieldGroups.get(buffer);
        if (held && (held.influence !== influence || held.field !== field || held.colouring !== colouring || held.ownerCodes !== ownerCodes)) {
            this.destroyFieldGroup(held);
            this.fieldGroups.delete(buffer);
            held = undefined;
        }
        if (!held) {
            const grid = this.device.createBuffer({
                label: "hover overlay field grid", size: FIELD_GRID_BYTES, usage: BufferUsage.UNIFORM | BufferUsage.COPY_DST,
            });
            const codeArray = colouring && ownerCodes ? atomOwnerCodes(colouring, ownerCodes) : null;
            let codes: GPUBuffer | null = null;
            if (codeArray) {
                codes = this.device.createBuffer({
                    label: "hover overlay atom owner codes", size: Math.max(16, codeArray.byteLength), usage: BufferUsage.STORAGE | BufferUsage.COPY_DST,
                });
                this.device.queue.writeBuffer(codes, 0, codeArray);
            }
            if (!lists) this.wholeBindGroup();
            const listBuffers = lists?.buffers ?? this.standIns;
            const atoms = colouring ? [colouring.atoms, colouring.colours, colouring.binStart, colouring.binMembers] : [this.noAtoms, this.noAtoms, this.noAtoms, this.noAtoms];
            const bindGroup = this.device.createBindGroup({
                label: "hover overlay field",
                layout: this.fieldLayout,
                entries: [
                    { binding: 12, resource: { buffer: this.uniforms } },
                    ...listBuffers.map((b, n) => ({ binding: 13 + n, resource: { buffer: b } })),
                    { binding: 16, resource: { buffer: grid } },
                    { binding: 17, resource: { buffer: field.buffer } },
                    ...atoms.map((b, n) => ({ binding: 18 + n, resource: { buffer: b } })),
                    { binding: 22, resource: { buffer: codes ?? this.noAtoms } },
                ],
            });
            held = { influence, field, colouring, ownerCodes, grid, codes, bindGroup };
            this.fieldGroups.set(buffer, held);
        }
        // The atoms' bins, band and width only where the share can be worked out per pixel.
        this.device.queue.writeBuffer(held.grid, 0, surfaceFieldUniform(field, !!held.codes));
        return held;
    }

    private destroyFieldGroup(held: FieldGroup): void {
        held.grid.destroy();
        held.codes?.destroy();
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
        this.pipeline ??= this.makePipeline("hover overlay", this.target, false);
        return this.pipeline;
    }

    /** The same, lit by the field (fs_hover_overlay_field). */
    private ensureFieldPipeline(): GPURenderPipeline {
        this.fieldPipeline ??= this.makePipeline("hover overlay field", this.target, false, true);
        return this.fieldPipeline;
    }

    /** The mesh's depth alone, colour untouched: the same vertex shader, so the same depths. */
    private ensureDepthPipeline(): GPURenderPipeline {
        this.depthPipeline ??= this.makePipeline("hover overlay depth", { format: this.target.format, writeMask: 0 }, true);
        return this.depthPipeline;
    }

    private makePipeline(label: string, target: GPUColorTargetState, writeDepth: boolean, field = false): GPURenderPipeline {
        const vec3 = (location: number): GPUVertexBufferLayout =>
            ({ arrayStride: 12, stepMode: "vertex", attributes: [{ shaderLocation: location, offset: 0, format: "float32x3" }] });
        return this.device.createRenderPipeline({
            label,
            layout: field ? this.fieldPipelineLayout : this.pipelineLayout,
            vertex: { module: this.module, entryPoint: field ? "vs_hover_overlay_field" : "vs_hover_overlay", buffers: [vec3(0), vec3(1)] },
            fragment: { module: this.module, entryPoint: field ? "fs_hover_overlay_field" : "fs_main", targets: [target] },
            primitive: { topology: "triangle-list", cullMode: "none", frontFace: "ccw" },
            depthStencil: { format: this.depthFormat, depthWriteEnabled: writeDepth, depthCompare: "less-equal" },
            multisample: { count: this.sampleCount },
        });
    }
}
