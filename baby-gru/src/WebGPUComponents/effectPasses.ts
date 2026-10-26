/**
 * The screen-space effects of the WebGPU renderer: ambient occlusion and edge detection, as
 * drawScene does them in WebGL, from a g-buffer of eye-space normals and depth.
 *
 * Each frame that wants either:
 *   1. the scene is drawn into the g-buffer (the renderer does that, with its fs_gbuffer pipelines:
 *      an rgba16float eye-space normal, w = 1 where drawn, and a depth32float depth), at the size
 *      of the image, single-sampled;
 *   2. ambient occlusion: ssao-fragment-shader.js's hemisphere test, 32 samples, at half the
 *      image's size, then blurred with blur_x/y_simple's 7-tap Gaussian;
 *   3. edges: edge-detect-fragment-shader.js's Sobel on depth (in A) and normals, at full size;
 *   4. the main pass reads both maps at its pixel (occlusionAt and edgeAt in previewShaders.ts).
 *
 * Where WebGL differs: its g-buffer is a 2048 square stretched over the canvas, and its occlusion a
 * 1024 square, whatever the canvas; here the maps follow the image (so a big snapshot has big
 * maps). Positions are rebuilt from depth rather than stored. Samples landing outside the image
 * count as open sky. In a tiled snapshot each tile has its own maps, so occlusion can show a seam
 * at tile edges where a sample would have reached into the next tile.
 *
 * The kernel and noise are made once from a seeded generator, so pictures repeat; WebGL draws
 * them from Math.random at start-up. The lengths follow the same ssaoSampleLength.
 */
import * as mat4 from 'gl-matrix/mat4';
import { BufferUsage, ShaderStage, TextureUsage } from './gpu';
import type { EffectSettings } from './previewScene';
import { ssaoSampleLength } from '../WebGLgComponents/mgWebGLParts/postProcessUniformBuffers';
import { gaussianBlurs } from '../WebGLgComponents/gaussianBlurs';

export const GBUFFER_NORMAL_FORMAT: GPUTextureFormat = "rgba16float";
export const GBUFFER_DEPTH_FORMAT: GPUTextureFormat = "depth32float";
const MAP_FORMAT: GPUTextureFormat = "rgba8unorm";
const KERNEL_SIZE = 32;

export const EFFECTS_WGSL = /* wgsl */ `
struct FullOut {
    @builtin(position) position: vec4f,
};

// One triangle over the whole target.
@vertex
fn vs_full(@builtin(vertex_index) vertex: u32) -> FullOut {
    let xy = vec2f(f32((vertex << 1u) & 2u), f32(vertex & 2u));
    var out: FullOut;
    out.position = vec4f(xy * 2.0 - 1.0, 0.0, 1.0);
    return out;
}

struct Ssao {
    projection: mat4x4f,
    inverseProjection: mat4x4f,
    params: vec4f,       // radius (A), strength (an exponent on visibility), target width, height
    origin: vec4f,       // where the target's first texel is in the whole image's (a tile's), unused x2
    samples: array<vec4f, 32>,
    noise: array<vec4f, 16>,
};

@group(0) @binding(0) var<uniform> ssao: Ssao;
@group(0) @binding(1) var gDepth: texture_depth_2d;
@group(0) @binding(2) var gNormal: texture_2d<f32>;

// The eye-space point drawn at a g-buffer texel, from its depth through the projection's inverse.
fn eyeAt(texel: vec2i, inverseProjection: mat4x4f) -> vec3f {
    let size = vec2f(textureDimensions(gDepth));
    let uv = (vec2f(texel) + 0.5) / size;
    let ndc = vec4f(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0, textureLoad(gDepth, texel, 0), 1.0);
    let eye = inverseProjection * ndc;
    return eye.xyz / eye.w;
}

fn texelOf(uv: vec2f) -> vec2i {
    let size = vec2i(textureDimensions(gNormal));
    return clamp(vec2i(uv * vec2f(size)), vec2i(0), size - 1);
}

// ssao-fragment-shader.js, in the same terms: a hemisphere of radius A about the outward normal,
// occluded where drawn geometry sits in front of a sample point by more than 0.05 A, weighted by
// a range check, visibility raised to the strength.
@fragment
fn fs_ssao(in: FullOut) -> @location(0) vec4f {
    // Each occlusion texel stands for the 2 x 2 g-buffer pixels from twice its own; the first of
    // them is the one tested, so the grid is the same whatever the image's size.
    let gsize = vec2i(textureDimensions(gNormal));
    let texel = min(vec2i(in.position.xy) * 2, gsize - 1);
    let normalAll = textureLoad(gNormal, texel, 0);
    if (normalAll.a < 0.5) { return vec4f(1.0); }
    let normal = normalize(normalAll.xyz);
    let fragPos = eyeAt(texel, ssao.inverseProjection);
    // The noise repeats every 4 texels of the whole image, whichever tile this is.
    let noiseAt = (vec2u(in.position.xy) + vec2u(ssao.origin.xy)) % vec2u(4u);
    let randomVec = ssao.noise[noiseAt.x + 4u * noiseAt.y].xyz;
    let tangent = normalize(randomVec - normal * dot(randomVec, normal));
    let bitangent = cross(normal, tangent);
    let TBN = mat3x3f(tangent, bitangent, normal);
    let radius = ssao.params.x;

    var occlusion = 0.0;
    for (var i = 0u; i < 32u; i++) {
        let samplePos = fragPos + (TBN * ssao.samples[i].xyz) * radius;
        let clip = ssao.projection * vec4f(samplePos, 1.0);
        let ndc = clip.xy / clip.w;
        let sampleUV = vec2f(ndc.x * 0.5 + 0.5, 0.5 - ndc.y * 0.5);
        // Off the image is open sky.
        if (any(sampleUV < vec2f(0.0)) || any(sampleUV >= vec2f(1.0))) { continue; }
        let at = texelOf(sampleUV);
        if (textureLoad(gNormal, at, 0).a < 0.5) { continue; }
        let sampleEye = eyeAt(at, ssao.inverseProjection);
        let occluded = sampleEye.z >= samplePos.z + 0.05;
        let rangeCheck = smoothstep(0.0, 1.0, radius / max(abs(fragPos.z - sampleEye.z), 1e-4));
        occlusion += select(0.0, 1.0, occluded) * rangeCheck;
    }
    occlusion /= 32.0;
    let ao = pow(clamp(1.0 - occlusion, 0.0, 1.0), ssao.params.y);
    return vec4f(ao, ao, ao, 1.0);
}

struct Blur {
    step: vec4f,         // one tap's offset (uv), unused x2
    weights: array<vec4f, 2>,
};

@group(0) @binding(0) var<uniform> blur: Blur;
@group(0) @binding(1) var blurSource: texture_2d<f32>;
@group(0) @binding(2) var blurSampler: sampler;

// blur_x/y_simple-fragment-shader.js with gaussianBlurs[3]: seven taps, a texel and a half apart.
@fragment
fn fs_blur(in: FullOut) -> @location(0) vec4f {
    let size = vec2f(textureDimensions(blurSource));
    let uv = in.position.xy / size;
    var sum = vec4f(0.0);
    for (var i = 0u; i < 7u; i++) {
        let w = blur.weights[i / 4u][i % 4u];
        sum += w * textureSampleLevel(blurSource, blurSampler, uv + blur.step.xy * (f32(i) - 3.0), 0.0);
    }
    return sum;
}

struct Edge {
    inverseProjection: mat4x4f,
    params: vec4f,       // depth threshold (A), normal threshold, depth step, normal step (pixels)
};

@group(0) @binding(0) var<uniform> edge: Edge;
@group(0) @binding(1) var eDepth: texture_depth_2d;
@group(0) @binding(2) var eNormal: texture_2d<f32>;

fn distanceAt(texel: vec2i) -> f32 {
    let size = vec2i(textureDimensions(eDepth));
    let t = clamp(texel, vec2i(0), size - 1);
    let uv = (vec2f(t) + 0.5) / vec2f(size);
    let ndc = vec4f(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0, textureLoad(eDepth, t, 0), 1.0);
    let eye = edge.inverseProjection * ndc;
    return -eye.z / eye.w;
}

fn normalAt(texel: vec2i) -> vec3f {
    let size = vec2i(textureDimensions(eNormal));
    let n = textureLoad(eNormal, clamp(texel, vec2i(0), size - 1), 0);
    // The background has no normal: zero, so it differs from every drawn one.
    return select(vec3f(0.0), normalize(n.xyz), n.a > 0.5);
}

// edge-detect-fragment-shader.js: Sobel on the eye distance, a step of more than the threshold
// (in A, the Sobel's 4 divided out) is an edge; Sobel on how far the neighbours' normals turn from
// this one's, likewise. 0 on an edge, 1 elsewhere.
@fragment
fn fs_edge(in: FullOut) -> @location(0) vec4f {
    let p = vec2i(in.position.xy);
    let ds = i32(edge.params.z);
    let ns = i32(edge.params.w);

    let tl = distanceAt(p + vec2i(-ds, -ds));
    let t = distanceAt(p + vec2i(0, -ds));
    let tr = distanceAt(p + vec2i(ds, -ds));
    let l = distanceAt(p + vec2i(-ds, 0));
    let r = distanceAt(p + vec2i(ds, 0));
    let bl = distanceAt(p + vec2i(-ds, ds));
    let b = distanceAt(p + vec2i(0, ds));
    let br = distanceAt(p + vec2i(ds, ds));
    let gx = (tr + 2.0 * r + br) - (tl + 2.0 * l + bl);
    let gy = (bl + 2.0 * b + br) - (tl + 2.0 * t + tr);
    let depthEdge = sqrt(gx * gx + gy * gy) * 0.25 > edge.params.x;

    var normalEdge = false;
    if (ns > 0) {
        let n = normalAt(p);
        let ntl = dot(n, normalAt(p + vec2i(-ns, -ns)));
        let nt = dot(n, normalAt(p + vec2i(0, -ns)));
        let ntr = dot(n, normalAt(p + vec2i(ns, -ns)));
        let nl = dot(n, normalAt(p + vec2i(-ns, 0)));
        let nr = dot(n, normalAt(p + vec2i(ns, 0)));
        let nbl = dot(n, normalAt(p + vec2i(-ns, ns)));
        let nb = dot(n, normalAt(p + vec2i(0, ns)));
        let nbr = dot(n, normalAt(p + vec2i(ns, ns)));
        let ngx = (ntr + 2.0 * nr + nbr) - (ntl + 2.0 * nl + nbl);
        let ngy = (nbl + 2.0 * nb + nbr) - (ntl + 2.0 * nt + ntr);
        normalEdge = sqrt(ngx * ngx + ngy * ngy) > edge.params.y;
    }
    let value = select(1.0, 0.0, depthEdge || normalEdge);
    return vec4f(value, value, value, 1.0);
}
`;

/** A small, seeded generator (mulberry32), so the kernel and noise are the same every time. */
function seeded(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * The occlusion kernel and noise, as initializeSSAOBuffers makes them: points in the +z hemisphere,
 * their lengths stratified by ssaoSampleLength; 16 random in-plane vectors to turn it by.
 */
export function ssaoKernel(seed = 1): { samples: Float32Array; noise: Float32Array } {
    const random = seeded(seed);
    const samples = new Float32Array(KERNEL_SIZE * 4);
    for (let i = 0; i < KERNEL_SIZE; i++) {
        const v = [random() * 2 - 1, random() * 2 - 1, random()];
        const length = Math.hypot(v[0], v[1], v[2]) || 1;
        const scale = ssaoSampleLength(i, KERNEL_SIZE) / length;
        samples.set([v[0] * scale, v[1] * scale, v[2] * scale, 1], 4 * i);
    }
    const noise = new Float32Array(16 * 4);
    for (let i = 0; i < 16; i++) noise.set([random() * 2 - 1, random() * 2 - 1, 0, 0], 4 * i);
    return { samples, noise };
}

const SSAO_FLOATS = 16 + 16 + 4 + 4 + KERNEL_SIZE * 4 + 16 * 4;
const EDGE_FLOATS = 16 + 4;

interface Targets {
    width: number;
    height: number;
    normal: GPUTexture;
    depth: GPUTexture;
    /** Half size: the raw occlusion, then (ping-pong) the blurred. */
    ao: GPUTexture;
    aoBlur: GPUTexture;
    edge: GPUTexture;
    views: {
        normal: GPUTextureView; depth: GPUTextureView; ao: GPUTextureView; aoBlur: GPUTextureView; edge: GPUTextureView;
    };
    bindGroups: { ssao: GPUBindGroup; blurX: GPUBindGroup; blurY: GPUBindGroup; edge: GPUBindGroup };
}

/**
 * How far past a tile's edge its effects must be worked out for it to join its neighbours: the
 * occlusion radius in pixels (half again, for perspective's nearer things), and the blur's,
 * FXAA's and the Sobel's reach. `pixelsPerAngstrom` at the view centre.
 */
export function effectMargin(settings: EffectSettings, pixelsPerAngstrom: number): number {
    if (!settings.ssao && !settings.edges) return 0;
    const reach = 24 + 2 * Math.max(settings.edges?.depthStep ?? 0, settings.edges?.normalStep ?? 0);
    const radius = settings.ssao ? Math.ceil(settings.ssao.radius * pixelsPerAngstrom * 1.5) : 0;
    return Math.min(512, reach + radius);
}

/** What the main pass reads: the maps made this frame, or white where an effect is off. */
export interface EffectMaps {
    ao: GPUTextureView;
    edge: GPUTextureView;
    /** frame.effects.x and .y. */
    flags: [number, number];
}

export class EffectPasses {
    private readonly module: GPUShaderModule;
    private readonly ssaoLayout: GPUBindGroupLayout;
    private readonly blurLayout: GPUBindGroupLayout;
    private readonly ssaoPipeline: GPURenderPipeline;
    private readonly blurPipeline: GPURenderPipeline;
    private readonly edgePipeline: GPURenderPipeline;
    private readonly ssaoUniform: GPUBuffer;
    private readonly blurUniforms: GPUBuffer[];
    private readonly edgeUniform: GPUBuffer;
    private readonly linear: GPUSampler;
    private readonly white: GPUTexture;
    readonly whiteView: GPUTextureView;
    private targets: Targets | null = null;
    private readonly kernel = ssaoKernel();

    constructor(private readonly device: GPUDevice) {
        this.module = device.createShaderModule({ label: "effects", code: EFFECTS_WGSL });
        const fragment = ShaderStage.FRAGMENT;
        // The occlusion and edge passes read the same things: a uniform, depth and normals.
        this.ssaoLayout = device.createBindGroupLayout({
            label: "g-buffer reader",
            entries: [
                { binding: 0, visibility: fragment, buffer: { type: "uniform" } },
                { binding: 1, visibility: fragment, texture: { sampleType: "depth" } },
                { binding: 2, visibility: fragment, texture: { sampleType: "unfilterable-float" } },
            ],
        });
        this.blurLayout = device.createBindGroupLayout({
            label: "blur",
            entries: [
                { binding: 0, visibility: fragment, buffer: { type: "uniform" } },
                { binding: 1, visibility: fragment, texture: { sampleType: "float" } },
                { binding: 2, visibility: fragment, sampler: { type: "filtering" } },
            ],
        });
        const pipeline = (label: string, layout: GPUBindGroupLayout, entryPoint: string) => device.createRenderPipeline({
            label,
            layout: device.createPipelineLayout({ bindGroupLayouts: [layout] }),
            vertex: { module: this.module, entryPoint: "vs_full" },
            fragment: { module: this.module, entryPoint, targets: [{ format: MAP_FORMAT }] },
            primitive: { topology: "triangle-list" },
        });
        this.ssaoPipeline = pipeline("ambient occlusion", this.ssaoLayout, "fs_ssao");
        this.blurPipeline = pipeline("occlusion blur", this.blurLayout, "fs_blur");
        this.edgePipeline = pipeline("edges", this.ssaoLayout, "fs_edge");
        const uniform = (label: string, floats: number) => device.createBuffer({
            label, size: floats * 4, usage: BufferUsage.UNIFORM | BufferUsage.COPY_DST,
        });
        this.ssaoUniform = uniform("ambient occlusion", SSAO_FLOATS);
        this.blurUniforms = [uniform("blur x", 12), uniform("blur y", 12)];
        this.edgeUniform = uniform("edges", EDGE_FLOATS);
        this.linear = device.createSampler({
            label: "effects", magFilter: "linear", minFilter: "linear", addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge",
        });
        this.white = device.createTexture({
            label: "effects stand-in", size: [1, 1], format: MAP_FORMAT, usage: TextureUsage.TEXTURE_BINDING | TextureUsage.COPY_DST,
        });
        device.queue.writeTexture({ texture: this.white }, new Uint8Array([255, 255, 255, 255]), { bytesPerRow: 4 }, [1, 1]);
        this.whiteView = this.white.createView();
    }

    /** The sampler the main pass reads the maps with. */
    get sampler(): GPUSampler {
        return this.linear;
    }

    /** Whether the settings ask for anything, and so for a g-buffer pass. */
    static wanted(settings: EffectSettings): boolean {
        return !!settings.ssao || !!settings.edges;
    }

    /** The g-buffer pass's attachments, at this size: begin it with this, draw with fs_gbuffer pipelines. */
    gbufferPass(width: number, height: number): GPURenderPassDescriptor {
        const t = this.ensure(width, height);
        return {
            label: "g-buffer",
            colorAttachments: [{ view: t.views.normal, clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: "clear", storeOp: "store" }],
            depthStencilAttachment: { view: t.views.depth, depthClearValue: 1, depthLoadOp: "clear", depthStoreOp: "store" },
        };
    }

    /**
     * Make the maps the settings ask for from the g-buffer (drawn already this frame, with the
     * same projection), and say what the main pass should read. `origin`: where the g-buffer's
     * first pixel is in the whole image, for a tile.
     */
    encode(encoder: GPUCommandEncoder, settings: EffectSettings, projection: ArrayLike<number>, origin: [number, number] = [0, 0]): EffectMaps {
        const t = this.targets;
        const maps: EffectMaps = { ao: this.whiteView, edge: this.whiteView, flags: [0, 0] };
        if (!t || !EffectPasses.wanted(settings)) return maps;
        const inverse = mat4.invert(mat4.create(), Array.from(projection).slice(0, 16) as unknown as mat4.mat4) ?? mat4.create();

        if (settings.ssao) {
            const data = new Float32Array(SSAO_FLOATS);
            data.set(Array.from(projection).slice(0, 16), 0);
            data.set(inverse as Float32Array, 16);
            data.set([settings.ssao.radius, settings.ssao.strength, t.ao.width, t.ao.height], 32);
            data.set([Math.floor(origin[0] / 2), Math.floor(origin[1] / 2), 0, 0], 36);
            data.set(this.kernel.samples, 40);
            data.set(this.kernel.noise, 40 + KERNEL_SIZE * 4);
            this.device.queue.writeBuffer(this.ssaoUniform, 0, data);
            const weights = gaussianBlurs[3];
            const blurData = (dx: number, dy: number) => {
                const d = new Float32Array(12);
                d.set([dx, dy, 0, 0], 0);
                d.set(weights.slice(0, 7), 4);
                return d;
            };
            // A tap a texel and a half apart, as blurSize * 0.5 with blurSize 3 / size.
            this.device.queue.writeBuffer(this.blurUniforms[0], 0, blurData(1.5 / t.ao.width, 0));
            this.device.queue.writeBuffer(this.blurUniforms[1], 0, blurData(0, 1.5 / t.ao.height));
            this.fullscreen(encoder, "ambient occlusion", t.views.ao, this.ssaoPipeline, t.bindGroups.ssao);
            this.fullscreen(encoder, "occlusion blur x", t.views.aoBlur, this.blurPipeline, t.bindGroups.blurX);
            this.fullscreen(encoder, "occlusion blur y", t.views.ao, this.blurPipeline, t.bindGroups.blurY);
            maps.ao = t.views.ao;
            maps.flags[0] = 1;
        }
        if (settings.edges) {
            const data = new Float32Array(EDGE_FLOATS);
            data.set(inverse as Float32Array, 0);
            const e = settings.edges;
            data.set([e.depthThreshold, e.normalThreshold, e.depthStep, e.normalStep], 16);
            this.device.queue.writeBuffer(this.edgeUniform, 0, data);
            this.fullscreen(encoder, "edges", t.views.edge, this.edgePipeline, t.bindGroups.edge);
            maps.edge = t.views.edge;
            maps.flags[1] = 1;
        }
        return maps;
    }

    destroy(): void {
        this.releaseTargets();
        this.ssaoUniform.destroy();
        this.blurUniforms.forEach(b => b.destroy());
        this.edgeUniform.destroy();
        this.white.destroy();
    }

    private fullscreen(encoder: GPUCommandEncoder, label: string, view: GPUTextureView, pipeline: GPURenderPipeline, bindGroup: GPUBindGroup): void {
        const pass = encoder.beginRenderPass({
            label,
            colorAttachments: [{ view, clearValue: { r: 1, g: 1, b: 1, a: 1 }, loadOp: "clear", storeOp: "store" }],
        });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(3);
        pass.end();
    }

    private releaseTargets(): void {
        const t = this.targets;
        if (!t) return;
        [t.normal, t.depth, t.ao, t.aoBlur, t.edge].forEach(texture => texture.destroy());
        this.targets = null;
    }

    private ensure(width: number, height: number): Targets {
        if (this.targets && this.targets.width === width && this.targets.height === height) return this.targets;
        this.releaseTargets();
        const usage = TextureUsage.RENDER_ATTACHMENT | TextureUsage.TEXTURE_BINDING;
        const texture = (label: string, format: GPUTextureFormat, w: number, h: number) =>
            this.device.createTexture({ label, size: [w, h], format, usage });
        const half = [Math.max(1, Math.ceil(width / 2)), Math.max(1, Math.ceil(height / 2))];
        const normal = texture("g-buffer normals", GBUFFER_NORMAL_FORMAT, width, height);
        const depth = texture("g-buffer depth", GBUFFER_DEPTH_FORMAT, width, height);
        const ao = texture("ambient occlusion", MAP_FORMAT, half[0], half[1]);
        const aoBlur = texture("ambient occlusion (blur)", MAP_FORMAT, half[0], half[1]);
        const edge = texture("edges", MAP_FORMAT, width, height);
        const views = { normal: normal.createView(), depth: depth.createView(), ao: ao.createView(), aoBlur: aoBlur.createView(), edge: edge.createView() };
        const reader = (buffer: GPUBuffer) => this.device.createBindGroup({
            layout: this.ssaoLayout,
            entries: [
                { binding: 0, resource: { buffer } },
                { binding: 1, resource: views.depth },
                { binding: 2, resource: views.normal },
            ],
        });
        const blur = (buffer: GPUBuffer, source: GPUTextureView) => this.device.createBindGroup({
            layout: this.blurLayout,
            entries: [
                { binding: 0, resource: { buffer } },
                { binding: 1, resource: source },
                { binding: 2, resource: this.linear },
            ],
        });
        this.targets = {
            width, height, normal, depth, ao, aoBlur, edge, views,
            bindGroups: {
                ssao: reader(this.ssaoUniform),
                blurX: blur(this.blurUniforms[0], views.ao),
                blurY: blur(this.blurUniforms[1], views.aoBlur),
                edge: reader(this.edgeUniform),
            },
        };
        return this.targets;
    }
}
