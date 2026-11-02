/**
 * Mesh textures in the WebGPU renderer: the images in the texture registry
 * (../WebGLgComponents/textureRegistry) as GPU textures, and a bind group per material for
 * fs_textured (previewShaders.ts).
 *
 * Uploaded as glTextureFor uploads them for WebGL, so the two renderers sample the same thing:
 * RGBA8, not sRGB (texture colour is used as vertex colour is, see glTextureFor), a full chain of
 * mipmaps, trilinear filtering, clamped at the edges. WebGPU has no generateMipmap, so the levels
 * are drawn here, each from the one above it with a linear filter - a 2 x 2 box, as WebGL's is.
 *
 * A texture lives as long as its image is registered: when the registry forgets an id, or
 * registers a new image under it, the GPU copy goes at the next prune.
 */
import { BufferUsage, ShaderStage, TextureUsage } from './gpu';
import { type BufferMaterial, type TextureSource, getTextureSource } from '../WebGLgComponents/textureRegistry';

export const MIPMAP_WGSL = /* wgsl */ `
@group(0) @binding(0) var source: texture_2d<f32>;
@group(0) @binding(1) var sourceSampler: sampler;

struct MipOut {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
};

// One triangle covering the target.
@vertex
fn vs_mip(@builtin(vertex_index) vertex: u32) -> MipOut {
    let xy = vec2f(f32((vertex << 1u) & 2u), f32(vertex & 2u));
    var out: MipOut;
    out.position = vec4f(xy * 2.0 - 1.0, 0.0, 1.0);
    out.uv = vec2f(xy.x, 1.0 - xy.y);
    return out;
}

@fragment
fn fs_mip(in: MipOut) -> @location(0) vec4f {
    return textureSampleLevel(source, sourceSampler, in.uv, 0.0);
}
`;

const FORMAT: GPUTextureFormat = "rgba8unorm";

/** Floats in a Material uniform block (previewShaders.ts): flags, factors. */
const MATERIAL_FLOATS = 8;

/** The number of levels in a full mipmap chain for an image this size. */
export const mipLevelCount = (width: number, height: number): number =>
    Math.floor(Math.log2(Math.max(1, width, height))) + 1;

/** The Material block for a material whose textures resolved as `has` says. */
export function materialBlock(material: BufferMaterial, has: { base: boolean; normal: boolean; metallicRoughness: boolean }): Float32Array {
    return new Float32Array([
        has.base ? 1 : 0, has.normal ? 1 : 0, has.metallicRoughness ? 1 : 0, 0,
        material.normalScale ?? 1, material.metallicFactor ?? 1, material.roughnessFactor ?? 1, 0,
    ]);
}

interface CachedTexture {
    source: TextureSource;
    texture: GPUTexture;
}

interface CachedMaterial {
    /** The GPU textures it was made with (stand-ins included), to notice one being replaced. */
    textures: GPUTexture[];
    uniform: GPUBuffer;
    bindGroup: GPUBindGroup;
    /** Whether any of its own textures resolved; if none did, it is drawn untextured. */
    textured: boolean;
    used: boolean;
}

export class SurfaceTextures {
    /** For group 2 of the textured pipelines. */
    readonly layout: GPUBindGroupLayout;
    private readonly sampler: GPUSampler;
    private readonly mipSampler: GPUSampler;
    private readonly mipModule: GPUShaderModule;
    private readonly mipLayout: GPUBindGroupLayout;
    private mipPipeline: GPURenderPipeline | null = null;
    /** 1 x 1 stand-ins for the maps a material lacks: white, and a flat normal. */
    private readonly white: GPUTexture;
    private readonly flat: GPUTexture;
    private readonly textures = new Map<string, CachedTexture>();
    /** Sources found too short for their size: warned about once each, not every frame. */
    private readonly shortSources = new WeakSet<TextureSource>();
    private readonly materials = new Map<string, CachedMaterial>();

    constructor(private readonly device: GPUDevice) {
        this.layout = device.createBindGroupLayout({
            label: "surface material",
            entries: [
                { binding: 7, visibility: ShaderStage.FRAGMENT, buffer: { type: "uniform" } },
                { binding: 8, visibility: ShaderStage.FRAGMENT, sampler: { type: "filtering" } },
                { binding: 9, visibility: ShaderStage.FRAGMENT, texture: { sampleType: "float" } },
                { binding: 10, visibility: ShaderStage.FRAGMENT, texture: { sampleType: "float" } },
                { binding: 11, visibility: ShaderStage.FRAGMENT, texture: { sampleType: "float" } },
            ],
        });
        this.sampler = device.createSampler({
            label: "surface textures",
            magFilter: "linear", minFilter: "linear", mipmapFilter: "linear",
            addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge",
        });
        this.mipSampler = device.createSampler({ label: "mipmaps", magFilter: "linear", minFilter: "linear" });
        this.mipModule = device.createShaderModule({ label: "mipmaps", code: MIPMAP_WGSL });
        this.mipLayout = device.createBindGroupLayout({
            label: "mipmap source",
            entries: [
                { binding: 0, visibility: ShaderStage.FRAGMENT, texture: { sampleType: "float" } },
                { binding: 1, visibility: ShaderStage.FRAGMENT, sampler: { type: "filtering" } },
            ],
        });
        this.white = this.solid("white", [255, 255, 255, 255]);
        this.flat = this.solid("flat normal", [128, 128, 255, 255]);
    }

    /**
     * The bind group for a material, made (and its textures uploaded) if this is the first time,
     * or if one of its images has changed since. Null when none of its textures is registered:
     * drawn untextured then, as drawCore does.
     */
    bindGroupFor(material: BufferMaterial): GPUBindGroup | null {
        const base = this.textureFor(material.baseColourTexture);
        const normal = this.textureFor(material.normalTexture);
        const metallicRoughness = this.textureFor(material.metallicRoughnessTexture);
        const textures = [base ?? this.white, normal ?? this.flat, metallicRoughness ?? this.white];
        const key = [material.baseColourTexture, material.normalTexture, material.metallicRoughnessTexture,
            material.normalScale, material.metallicFactor, material.roughnessFactor].join("|");
        let cached = this.materials.get(key);
        if (cached && cached.textures.some((t, i) => t !== textures[i])) {
            cached.uniform.destroy();
            this.materials.delete(key);
            cached = undefined;
        }
        if (!cached) {
            const has = { base: !!base, normal: !!normal, metallicRoughness: !!metallicRoughness };
            const uniform = this.device.createBuffer({
                label: "material", size: MATERIAL_FLOATS * 4, usage: BufferUsage.UNIFORM | BufferUsage.COPY_DST,
            });
            this.device.queue.writeBuffer(uniform, 0, materialBlock(material, has));
            const bindGroup = this.device.createBindGroup({
                label: "material",
                layout: this.layout,
                entries: [
                    { binding: 7, resource: { buffer: uniform } },
                    { binding: 8, resource: this.sampler },
                    ...textures.map((texture, i) => ({ binding: 9 + i, resource: texture.createView() })),
                ],
            });
            cached = { textures, uniform, bindGroup, textured: has.base || has.normal || has.metallicRoughness, used: true };
            this.materials.set(key, cached);
        }
        cached.used = true;
        return cached.textured ? cached.bindGroup : null;
    }

    /**
     * Free the GPU copies of images the registry no longer has (or has replaced), and the
     * materials that were not asked for since the last prune. Once a frame, after drawing.
     */
    prune(): void {
        for (const [id, cached] of this.textures) {
            if (getTextureSource(id) === cached.source) continue;
            cached.texture.destroy();
            this.textures.delete(id);
        }
        for (const [key, cached] of this.materials) {
            if (cached.used) {
                cached.used = false;
                continue;
            }
            cached.uniform.destroy();
            this.materials.delete(key);
        }
    }

    destroy(): void {
        this.textures.forEach(cached => cached.texture.destroy());
        this.textures.clear();
        this.materials.forEach(cached => cached.uniform.destroy());
        this.materials.clear();
        this.white.destroy();
        this.flat.destroy();
    }

    private textureFor(id: string | undefined): GPUTexture | null {
        if (!id) return null;
        const source = getTextureSource(id);
        const cached = this.textures.get(id);
        if (cached && cached.source === source) return cached.texture;
        if (cached) {
            cached.texture.destroy();
            this.textures.delete(id);
        }
        if (!source) return null;
        if (!(source.width > 0 && source.height > 0) || source.rgba.length < source.width * source.height * 4) {
            if (!this.shortSources.has(source)) {
                this.shortSources.add(source);
                console.warn(`texture ${id} has less data than its ${source.width}x${source.height} size`);
            }
            return null;
        }
        const texture = this.upload(id, source);
        this.textures.set(id, { source, texture });
        return texture;
    }

    private upload(label: string, source: TextureSource): GPUTexture {
        const { width, height } = source;
        const levels = mipLevelCount(width, height);
        const texture = this.device.createTexture({
            label: `surface ${label}`,
            size: [width, height],
            format: FORMAT,
            mipLevelCount: levels,
            usage: TextureUsage.TEXTURE_BINDING | TextureUsage.COPY_DST | TextureUsage.RENDER_ATTACHMENT,
        });
        // Row 0 is the top of the image, and the first row written is v = 0: glTF's convention,
        // and what WebGL's texImage2D gets, so nothing is flipped.
        this.device.queue.writeTexture({ texture }, source.rgba, { bytesPerRow: width * 4, rowsPerImage: height }, [width, height]);
        if (levels > 1) this.drawMipmaps(texture, levels);
        return texture;
    }

    private drawMipmaps(texture: GPUTexture, levels: number): void {
        if (!this.mipPipeline) {
            this.mipPipeline = this.device.createRenderPipeline({
                label: "mipmaps",
                layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.mipLayout] }),
                vertex: { module: this.mipModule, entryPoint: "vs_mip" },
                fragment: { module: this.mipModule, entryPoint: "fs_mip", targets: [{ format: FORMAT }] },
                primitive: { topology: "triangle-list" },
            });
        }
        const encoder = this.device.createCommandEncoder({ label: "mipmaps" });
        for (let level = 1; level < levels; level++) {
            const bindGroup = this.device.createBindGroup({
                layout: this.mipLayout,
                entries: [
                    { binding: 0, resource: texture.createView({ baseMipLevel: level - 1, mipLevelCount: 1 }) },
                    { binding: 1, resource: this.mipSampler },
                ],
            });
            const pass = encoder.beginRenderPass({
                colorAttachments: [{
                    view: texture.createView({ baseMipLevel: level, mipLevelCount: 1 }),
                    loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 0 },
                }],
            });
            pass.setPipeline(this.mipPipeline);
            pass.setBindGroup(0, bindGroup);
            pass.draw(3);
            pass.end();
        }
        this.device.queue.submit([encoder.finish()]);
    }

    private solid(label: string, rgba: number[]): GPUTexture {
        const texture = this.device.createTexture({
            label: `surface ${label}`, size: [1, 1], format: FORMAT,
            usage: TextureUsage.TEXTURE_BINDING | TextureUsage.COPY_DST,
        });
        this.device.queue.writeTexture({ texture }, new Uint8Array(rgba), { bytesPerRow: 4 }, [1, 1]);
        return texture;
    }
}
