/**
 * Text labels for the WebGPU renderer, drawn from the WebGL renderer's own glyph atlases.
 *
 * MGWebGL keeps three TextCanvasTextures: measurements and clicked-atom labels, the label buffers
 * of representations (environment distances, say), and the 2D overlays (legends, the FPS text,
 * on-screen measurements). Each is a canvas the glyphs are drawn into and, rebuilt every frame,
 * one instance per label: where it is, its size, its place in the atlas and any screen offset.
 * This reads exactly those, copies the canvas into a texture when its revision moves, and draws
 * the same quads as text-vertex-shader.js, so the two renderers show the same labels.
 *
 * The WebGL renderer still owns the TextCanvasTextures (it handles input, and draws when WebGPU
 * cannot); while WebGPU draws, their GL uploads wait (webGLUploads.ts) and only the CPU half -
 * the atlas and the instances - is read here.
 */
import { BufferUsage, ShaderStage, TextureUsage } from './gpu';
import { TEXT_WGSL } from './previewShaders';

/** What is read of a TextCanvasTexture. */
export interface TextAtlasSource {
    canvasBig: OffscreenCanvas | HTMLCanvasElement;
    nBigTextures: number;
    bigTextureTexOrigins: number[][];
    bigTextureTexOffsets: number[][];
    bigTextureScalings: number[][];
    bigTextureScreenOffsets: number[][];
    /** Goes up when the atlas's pixels change; without it the atlas is copied every frame. */
    revision?: number;
}

/** One atlas's labels: over everything, or depth-tested against the scene (atomLabelDepthMode). */
export interface TextBatch {
    atlas: TextAtlasSource;
    onTop: boolean;
}

/** Floats per label instance: origin (3), size (3), atlas offsets (4), screen offset (4). */
export const TEXT_INSTANCE_FLOATS = 14;
const UNIFORM_STRIDE = 256;

/**
 * The atlas's labels as instance data, as recreateBigTextureBuffers flattens them: removed
 * labels leave empty entries, which flatten away, and nBigTextures of what is left are drawn.
 */
export function packTextInstances(atlas: TextAtlasSource): { data: Float32Array; count: number } {
    const live = (rows: number[][], size: number) => rows.filter(row => row && row.length === size);
    const origins = live(atlas.bigTextureTexOrigins ?? [], 3);
    const sizes = live(atlas.bigTextureScalings ?? [], 3);
    const offsets = live(atlas.bigTextureTexOffsets ?? [], 4);
    const screen = live(atlas.bigTextureScreenOffsets ?? [], 4);
    const count = Math.max(0, Math.min(atlas.nBigTextures ?? 0, origins.length, sizes.length, offsets.length, screen.length));
    const data = new Float32Array(count * TEXT_INSTANCE_FLOATS);
    for (let i = 0; i < count; i++) {
        data.set(origins[i], i * TEXT_INSTANCE_FLOATS);
        data.set(sizes[i], i * TEXT_INSTANCE_FLOATS + 3);
        data.set(offsets[i], i * TEXT_INSTANCE_FLOATS + 6);
        data.set(screen[i], i * TEXT_INSTANCE_FLOATS + 10);
    }
    return { data, count };
}

interface AtlasResources {
    texture: GPUTexture;
    revision: number | undefined;
    uniform: GPUBuffer;
    bindGroup: GPUBindGroup;
    instances: GPUBuffer | null;
}

export class TextLayer {
    private readonly device: GPUDevice;
    private readonly module: GPUShaderModule;
    private readonly layout: GPUBindGroupLayout;
    private readonly pipelineLayout: GPUPipelineLayout;
    private readonly sampler: GPUSampler;
    private readonly pipelines = new Map<boolean, GPURenderPipeline>();
    private readonly atlases = new Map<TextAtlasSource, AtlasResources>();

    constructor(device: GPUDevice, private readonly format: GPUTextureFormat, frameLayout: GPUBindGroupLayout,
                private readonly sampleCount: number, private readonly depthFormat: GPUTextureFormat) {
        this.device = device;
        this.module = device.createShaderModule({ label: "text", code: TEXT_WGSL });
        this.layout = device.createBindGroupLayout({
            label: "text atlas",
            entries: [
                { binding: 0, visibility: ShaderStage.VERTEX, buffer: { type: "uniform" } },
                { binding: 1, visibility: ShaderStage.FRAGMENT, texture: { sampleType: "float" } },
                { binding: 2, visibility: ShaderStage.FRAGMENT, sampler: { type: "filtering" } },
            ],
        });
        this.pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [frameLayout, this.layout] });
        // TextCanvasTexture's: linear, clamped, no mipmaps.
        this.sampler = device.createSampler({ magFilter: "linear", minFilter: "linear", addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge" });
    }

    /**
     * Draw the batches into `pass`, whose group 0 is already the frame. `imageHeight` is the
     * height of the whole image in pixels (not of a tile): a label is as many pixels tall as its
     * glyphs are in the atlas, as drawCore has it with the canvas height. Atlases not in `keep`
     * (by default, the batches drawn) are let go: a frame drawn in several passes, each with some
     * of its batches, keeps them all.
     */
    draw(pass: GPURenderPassEncoder, batches: readonly TextBatch[], zoom: number, imageHeight: number,
         keep: readonly TextBatch[] = batches): number {
        let drawn = 0;
        const present = new Set(keep.map(b => b.atlas));
        for (const [atlas, resources] of this.atlases) {
            if (!present.has(atlas)) {
                this.release(resources);
                this.atlases.delete(atlas);
            }
        }
        for (const batch of batches) {
            const { data, count } = packTextInstances(batch.atlas);
            if (count === 0) continue;
            const resources = this.prepare(batch.atlas);
            if (!resources) continue;
            if (!resources.instances || resources.instances.size < data.byteLength) {
                resources.instances?.destroy();
                resources.instances = this.device.createBuffer({
                    label: "text instances", size: Math.max(256, data.byteLength * 2), usage: BufferUsage.VERTEX | BufferUsage.COPY_DST,
                });
            }
            this.device.queue.writeBuffer(resources.instances, 0, data);
            const pixelZoom = zoom * batch.atlas.canvasBig.height / Math.max(1, imageHeight);
            this.device.queue.writeBuffer(resources.uniform, 0, new Float32Array([pixelZoom, 0, 0, 0]));
            pass.setPipeline(this.pipeline(batch.onTop));
            pass.setBindGroup(1, resources.bindGroup);
            pass.setVertexBuffer(0, resources.instances);
            pass.draw(6, count);
            drawn += count;
        }
        return drawn;
    }

    destroy(): void {
        this.atlases.forEach(resources => this.release(resources));
        this.atlases.clear();
    }

    private release(resources: AtlasResources): void {
        resources.texture.destroy();
        resources.uniform.destroy();
        resources.instances?.destroy();
    }

    /** The atlas's texture, copied again if its pixels have changed (or it has been resized). */
    private prepare(atlas: TextAtlasSource): AtlasResources | null {
        const canvas = atlas.canvasBig;
        if (!canvas || canvas.width === 0 || canvas.height === 0) return null;
        let resources = this.atlases.get(atlas);
        if (resources && (resources.texture.width !== canvas.width || resources.texture.height !== canvas.height)) {
            this.release(resources);
            this.atlases.delete(atlas);
            resources = undefined;
        }
        if (!resources) {
            const texture = this.device.createTexture({
                label: "text atlas", size: [canvas.width, canvas.height], format: "rgba8unorm",
                usage: TextureUsage.TEXTURE_BINDING | TextureUsage.COPY_DST | TextureUsage.RENDER_ATTACHMENT,
            });
            const uniform = this.device.createBuffer({ label: "text uniforms", size: UNIFORM_STRIDE, usage: BufferUsage.UNIFORM | BufferUsage.COPY_DST });
            const bindGroup = this.device.createBindGroup({
                label: "text atlas",
                layout: this.layout,
                entries: [
                    { binding: 0, resource: { buffer: uniform } },
                    { binding: 1, resource: texture.createView() },
                    { binding: 2, resource: this.sampler },
                ],
            });
            // NaN never equals anything, so the first frame copies.
            resources = { texture, revision: Number.NaN, uniform, bindGroup, instances: null };
            this.atlases.set(atlas, resources);
        }
        if (atlas.revision === undefined || resources.revision !== atlas.revision) {
            // Straight alpha, as WebGL uploads the canvas (UNPACK_PREMULTIPLY_ALPHA is off).
            this.device.queue.copyExternalImageToTexture({ source: canvas }, { texture: resources.texture, premultipliedAlpha: false },
                [canvas.width, canvas.height]);
            resources.revision = atlas.revision;
        }
        return resources;
    }

    private pipeline(onTop: boolean): GPURenderPipeline {
        const cached = this.pipelines.get(onTop);
        if (cached) return cached;
        const instance = (location: number, offset: number, format: GPUVertexFormat): GPUVertexAttribute =>
            ({ shaderLocation: location, offset: offset * 4, format });
        const pipeline = this.device.createRenderPipeline({
            label: `text ${onTop ? "on top" : "depth-tested"}`,
            layout: this.pipelineLayout,
            vertex: {
                module: this.module, entryPoint: "vs_text",
                buffers: [{
                    arrayStride: TEXT_INSTANCE_FLOATS * 4, stepMode: "instance",
                    attributes: [instance(0, 0, "float32x3"), instance(1, 3, "float32x3"), instance(2, 6, "float32x4"), instance(3, 10, "float32x4")],
                }],
            },
            fragment: {
                module: this.module, entryPoint: "fs_text",
                // As lifecycle.ts sets it for everything: SRC_ALPHA, ONE_MINUS_SRC_ALPHA; ONE, ONE_MINUS_SRC_ALPHA.
                targets: [{
                    format: this.format,
                    blend: {
                        color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" },
                        alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
                    },
                }],
            },
            primitive: { topology: "triangle-list", cullMode: "none" },
            // drawDistancesAndLabels and drawTextOverlays draw with depthFunc ALWAYS, unless
            // atomLabelDepthMode puts the labels in the scene (LESS). Neither needs to write depth:
            // text is drawn last.
            depthStencil: { format: this.depthFormat, depthWriteEnabled: false, depthCompare: onTop ? "always" : "less" },
            multisample: { count: this.sampleCount },
        });
        this.pipelines.set(onTop, pipeline);
        return pipeline;
    }
}

/** The parts of MGWebGL that hold text. */
export interface TextSource {
    measureTextCanvasTexture?: TextAtlasSource;
    labelsTextCanvasTexture?: TextAtlasSource;
    measureText2DCanvasTexture?: TextAtlasSource;
    atomLabelDepthMode?: boolean;
}

/**
 * The WebGL renderer's text, in the order it draws it: measurements and atom labels, then label
 * buffers (both on top, or in the scene with atomLabelDepthMode), then the 2D overlays, always on
 * top.
 */
export function textBatchesOf(source: TextSource): TextBatch[] {
    const batches: TextBatch[] = [];
    const inScene = !!source.atomLabelDepthMode;
    if (source.measureTextCanvasTexture) batches.push({ atlas: source.measureTextCanvasTexture, onTop: !inScene });
    if (source.labelsTextCanvasTexture) batches.push({ atlas: source.labelsTextCanvasTexture, onTop: !inScene });
    if (source.measureText2DCanvasTexture) batches.push({ atlas: source.measureText2DCanvasTexture, onTop: true });
    return batches;
}
