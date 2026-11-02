/**
 * Depth blur in the WebGPU renderer, as drawCore's depthBlur does it in WebGL (the scene setting
 * useOffScreenBuffers - "depth blur" - with depthBlurRadius and depthBlurDepth).
 *
 * WebGL draws the scene into an offscreen buffer, resolves it, and then:
 *   1. blurs it across (blur_x-fragment-shader.js) and then down (blur_y-fragment-shader.js), with
 *      the Gaussian of gaussianBlurs[blurSize]: 2 blurSize + 1 taps, blurSize / 2 pixels apart.
 *      A tap counts with its own colour where what is there is beyond the focal plane - the
 *      empty background included; anywhere else (in front of the plane) it counts with the
 *      centre's colour. So what is in focus does not spread, and what is out of focus softens
 *      into what is behind it, both ways, as through a lens;
 *   2. mixes the sharp and the blurred pictures by the depth at each pixel
 *      (render-framebuffer-fragment-shader.js): sharp in front of the focal plane, then blurred,
 *      quickly, behind it - frac / (0.01 + frac) of the way, frac being how far behind it the
 *      pixel is as a share of the depth beyond it;
 *   3. draws labels, measuring lines and overlay text over that, sharp.
 * The depth is the opaque scene's, or under depth peeling, where nothing opaque was drawn, the
 * nearest transparent layer's.
 *
 * Here the same, after the scene's passes (which resolve into `sharp` instead of the frame's
 * image, keeping their depth): the two blur passes, then the mix written into the frame's
 * multisampled colour, and then the overlays and the resolve as usual. A pixel's depth is the
 * nearest of its samples (WebGL's NEAREST blit reads one): so the antialiased edge of something
 * in focus counts as in focus, neither blurred nor spread, though some of its samples show the
 * background behind.
 *
 * Where it differs: the FPS meter, and labels drawn depth-tested (atomLabelDepthMode), are not
 * blurred here in a single view (divided views draw such labels with the scene, as WebGL does);
 * WebGL draws both into the picture it blurs. WebGL's screenshot path for depth blur
 * is marked as not working; here a snapshot bigger than the canvas blurs as far, as a share of the
 * picture, as the canvas does:
 *   - the taps are as far apart in the picture, and each is split into as many sub-taps as the
 *     picture is times the canvas across, evenly over the gap to the next, so that the bigger
 *     gaps are filled rather than skipped (skipped, they show as ghost copies of every edge);
 *   - with a transparent background the picture is premultiplied (the renderer clears to nothing
 *     for one, and straightens the colours as it reads the picture back), so the background's
 *     colour, which has no alpha, cannot bleed into the blur as a halo, as it would blurring
 *     straight colours over a background cleared to its colour.
 * On the canvas (one sub-tap, everything opaque) these come to WebGL's sums, but for two
 * things: a tap takes the colour of the texel whose depth it read, where WebGL's filters in its
 * neighbours' (so something in focus spread a little onto the background beside it), and a
 * pixel's depth is the nearest of its samples. A tiled snapshot draws each tile with a margin as
 * wide as the blur reaches, so that tiles join.
 *
 * And one change everywhere: the two passes add up to one round blur (fs_depth_blur_across). In
 * WebGL's, what blur_x spread onto pixels that do not blur themselves (the background round a
 * blurred piece) was dropped by blur_y, so a small blurred piece glowed in a cross, along its rows
 * and down its columns. Here it glows round, as a real defocus does, and its glow fades out the
 * same way in every direction.
 */
import { BufferUsage, ShaderStage, TextureUsage } from './gpu';
import { gaussianBlurs } from '../WebGLgComponents/gaussianBlurs';

/** WebGL's coefficient block holds 36 weights: nine vec4s. */
const MAX_WEIGHTS = 36;
/** Floats in the uniform block: the weights, then params and flags. */
const BLUR_FLOATS = MAX_WEIGHTS + 8;

/** What the frame's depth blur does, from the source's settings (previewScene effectSettings). */
export interface DepthBlurSettings {
    /** Taps each side of the centre: WebGL's blurSize, the depthBlurRadius setting. */
    taps: number;
    /** The 2 taps + 1 Gaussian weights. */
    weights: number[];
    /** Pixels between taps on the canvas: blurSize / 2, as WebGL's shaders step. */
    step: number;
    /** The focal plane, as a value in the depth buffer (focalPlaneDepth). */
    focus: number;
}

/**
 * The blur for a depthBlurRadius: WebGL's own table, gaussianBlurs, which has radii 2 to 16 (a
 * radius it does not have is taken to the nearest it has).
 */
export function depthBlurKernel(radius: number): { taps: number; weights: number[] } {
    const radii = Object.keys(gaussianBlurs).map(Number).sort((a, b) => a - b);
    const wanted = Math.round(radius);
    const taps = radii.reduce((best, r) => (Math.abs(r - wanted) < Math.abs(best - wanted) ? r : best), radii[0]);
    const weights = (gaussianBlurs as Record<number, number[]>)[taps].slice(0, MAX_WEIGHTS);
    return { taps, weights };
}

/** How far the blur reaches, in pixels of an image `scale` times the canvas across: both passes. */
export function depthBlurMargin(settings: DepthBlurSettings | null, scale: number): number {
    if (!settings) return 0;
    // Each pass reaches taps x step (and its sub-taps half a step more), and the bilinear
    // lookups a pixel more.
    return Math.ceil(2 * (settings.taps + 0.5) * settings.step * scale) + 2;
}

/**
 * Sub-taps a tap, for an image `scale` times the canvas across: as many as it takes to keep them
 * no further apart than WebGL's taps are on the canvas. 1 on the canvas, and in anything smaller.
 */
export function depthBlurSubTaps(scale: number): number {
    return Math.max(1, Math.ceil(scale - 1e-6));
}

export const DEPTH_BLUR_WGSL = /* wgsl */ `
struct Blur {
    weights: array<vec4f, 9>,
    params: vec4f,  // step in pixels across, down; the focal plane's depth; taps each side
    flags: vec4f,   // x: a transparent layer's depth to fall back on; z: sub-taps a tap
};

@group(0) @binding(0) var<uniform> blur: Blur;
// What the pass reads: across, the sharp picture; down, the across pass's; the composite, sharp.
@group(0) @binding(1) var picture: texture_2d<f32>;
@group(0) @binding(2) var linear: sampler;
@group(0) @binding(3) var depth: texture_depth_multisampled_2d;
@group(0) @binding(4) var depth2: texture_depth_2d;
// Down, the sharp picture; the composite, the blurred one.
@group(0) @binding(5) var second: texture_2d<f32>;
// Down, the across pass's share: the weight of its taps that blurred.
@group(0) @binding(6) var spread: texture_2d<f32>;

@vertex
fn vs_full(@builtin(vertex_index) vertex: u32) -> @builtin(position) vec4f {
    let xy = vec2f(f32((vertex << 1u) & 2u), f32(vertex & 2u));
    return vec4f(xy * 2.0 - 1.0, 0.0, 1.0);
}

// Where nothing was drawn the depth is still its cleared 1.
const DRAWN_DEPTH = 0.9999;

// The depth of the nearest thing drawn at this point, as the blur shaders' sceneDepth: the opaque
// scene's, or where it has nothing, the nearest transparent layer's. At the texel the point is in,
// as WebGL's NEAREST lookup, and the nearest of its samples: the antialiased edge of something in
// focus is in focus, though some of its samples are on the background.
fn sceneDepth(p: vec2f) -> f32 {
    let size = vec2i(textureDimensions(depth));
    let texel = clamp(vec2i(floor(p)), vec2i(0), size - 1);
    var d = 1.0;
    for (var s = 0; s < i32(textureNumSamples(depth)); s++) { d = min(d, textureLoad(depth, texel, s)); }
    if (blur.flags.x > 0.5 && d >= DRAWN_DEPTH) { d = min(textureLoad(depth2, texel, 0), 1.0); }
    return d;
}

// Whether a tap spreads its own colour: what is there is beyond the focal plane - the empty
// background too, so that out-of-focus geometry softens into it, not only spreads out over it.
// (Leaving the background out, as WebGL's shaders did for a while, left a blurred structure merely
// fuzzy round its edges.)
fn blurs(p: vec2f) -> bool {
    return sceneDepth(p) > blur.params.z;
}

fn weight(i: i32) -> f32 {
    return blur.weights[i / 4][i % 4];
}

fn at(t: texture_2d<f32>, p: vec2f, size: vec2f) -> vec4f {
    return textureSampleLevel(t, linear, p / size, 0.0);
}

// The colour of the texel the point is in: the one whose depth decided whether the tap blurs.
// (Filtered, a tap on the background beside something in focus would take in some of its colour,
// and spread it.)
fn texelAt(t: texture_2d<f32>, p: vec2f) -> vec4f {
    let size = vec2i(textureDimensions(t));
    return textureLoad(t, clamp(vec2i(floor(p)), vec2i(0), size - 1), 0);
}

// Where tap i's sub-tap j falls: each tap is flags.z sub-taps spread evenly over its share of the
// line, each with its share of the weight - one, exactly WebGL's tap, on the canvas.
fn tapOffset(i: i32, j: i32, taps: i32, sub: i32) -> f32 {
    return f32(i - taps) + (f32(j) + 0.5) / f32(sub) - 0.5;
}

struct Across {
    @location(0) spread: vec4f,
    @location(1) share: vec4f,
};

// The blur of WebGL's two passes, taken as the one round blur they stand for. blur_x sums, at each
// pixel, the taps that blur with their own colour, and stands the centre's colour in for the rest
// (those in front of the focal plane); blur_y does the same again down. Summing down
// the across pass's whole result, though, a tap that does not blur gives the centre's colour in
// place of what the across pass spread onto it - so a small blurred piece glows along its rows and
// down its columns, in a cross, and not between them.
//
// Here the rule is the same, in two dimensions: every tap of the round kernel that blurs counts
// with its own colour, and the centre's colour stands in for the weight of all the rest. Across,
// the blurring taps' sum and their share of the weight are kept apart; down, both are summed again,
// and the centre's sharp colour takes the share still left. Along one line it is blur_x exactly.
@fragment
fn fs_depth_blur_across(@builtin(position) position: vec4f) -> Across {
    let taps = i32(blur.params.w);
    let sub = max(1, i32(blur.flags.z));
    var sum = vec4f(0.0);
    var share = 0.0;
    for (var i = 0; i <= 2 * taps; i++) {
        let w = weight(i) / f32(sub);
        for (var j = 0; j < sub; j++) {
            let p = position.xy + blur.params.xy * tapOffset(i, j, taps, sub);
            if (blurs(p)) {
                sum += w * texelAt(picture, p);
                share += w;
            }
        }
    }
    var out: Across;
    out.spread = sum;
    out.share = vec4f(share, 0.0, 0.0, 0.0);
    return out;
}

@fragment
fn fs_depth_blur_down(@builtin(position) position: vec4f) -> @location(0) vec4f {
    let size = vec2f(textureDimensions(picture));
    let taps = i32(blur.params.w);
    let sub = max(1, i32(blur.flags.z));
    var sum = vec4f(0.0);
    var share = 0.0;
    for (var i = 0; i <= 2 * taps; i++) {
        let w = weight(i) / f32(sub);
        for (var j = 0; j < sub; j++) {
            let p = position.xy + blur.params.xy * tapOffset(i, j, taps, sub);
            sum += w * at(picture, p, size);
            share += w * at(spread, p, size).x;
        }
    }
    return sum + max(0.0, 1.0 - share) * at(second, position.xy, size);
}

// The sharp picture and the blurred one mixed by depth, as render-framebuffer-fragment-shader.js.
@fragment
fn fs_depth_blur_composite(@builtin(position) position: vec4f) -> @location(0) vec4f {
    let texel = vec2i(position.xy);
    let sharp = textureLoad(picture, texel, 0);
    let d = sceneDepth(position.xy);
    let focus = blur.params.z;
    if (d > focus) {
        let soft = textureLoad(second, texel, 0);
        var frac = (d - focus) / (1.0 - focus);
        frac = frac / (0.01 + frac);
        return frac * soft + (1.0 - frac) * sharp;
    }
    return sharp;
}
`;

/** One frame's (or tile's) pictures: sharp, blurred across, blurred both ways. */
export interface DepthBlurTargets {
    width: number;
    height: number;
    sharp: GPUTexture;
    /** Across: the sum of the taps that blurred, in half floats, for the down pass to sum again. */
    across: GPUTexture;
    /** Across: those taps' share of the weight. */
    spread: GPUTexture;
    both: GPUTexture;
    sharpView: GPUTextureView;
    acrossView: GPUTextureView;
    spreadView: GPUTextureView;
    bothView: GPUTextureView;
}

const ACROSS_FORMAT: GPUTextureFormat = "rgba16float";
const SPREAD_FORMAT: GPUTextureFormat = "r16float";

export class DepthBlur {
    private readonly module: GPUShaderModule;
    private readonly layout: GPUBindGroupLayout;
    private readonly acrossPipeline: GPURenderPipeline;
    private readonly downPipeline: GPURenderPipeline;
    private readonly compositePipeline: GPURenderPipeline;
    private readonly uniforms: [GPUBuffer, GPUBuffer];
    private readonly data = new Float32Array(BLUR_FLOATS);
    private targets: DepthBlurTargets | null = null;

    /**
     * `format`: the frame's, which the pictures are kept in too. `sampleCount`: the frame's
     * multisampled colour, which the composite writes.
     */
    constructor(private readonly device: GPUDevice, private readonly format: GPUTextureFormat, sampleCount: number,
                private readonly sampler: GPUSampler) {
        this.module = device.createShaderModule({ label: "depth blur", code: DEPTH_BLUR_WGSL });
        const fragment = ShaderStage.FRAGMENT;
        this.layout = device.createBindGroupLayout({
            label: "depth blur",
            entries: [
                { binding: 0, visibility: fragment, buffer: { type: "uniform" } },
                { binding: 1, visibility: fragment, texture: { sampleType: "float" } },
                { binding: 2, visibility: fragment, sampler: { type: "filtering" } },
                { binding: 3, visibility: fragment, texture: { sampleType: "depth", multisampled: true } },
                { binding: 4, visibility: fragment, texture: { sampleType: "depth" } },
                { binding: 5, visibility: fragment, texture: { sampleType: "float" } },
                { binding: 6, visibility: fragment, texture: { sampleType: "float" } },
            ],
        });
        const layout = device.createPipelineLayout({ bindGroupLayouts: [this.layout] });
        this.acrossPipeline = device.createRenderPipeline({
            label: "depth blur across", layout,
            vertex: { module: this.module, entryPoint: "vs_full" },
            fragment: { module: this.module, entryPoint: "fs_depth_blur_across", targets: [{ format: ACROSS_FORMAT }, { format: SPREAD_FORMAT }] },
            primitive: { topology: "triangle-list" },
        });
        this.downPipeline = device.createRenderPipeline({
            label: "depth blur down", layout,
            vertex: { module: this.module, entryPoint: "vs_full" },
            fragment: { module: this.module, entryPoint: "fs_depth_blur_down", targets: [{ format }] },
            primitive: { topology: "triangle-list" },
        });
        this.compositePipeline = device.createRenderPipeline({
            label: "depth blur composite", layout,
            vertex: { module: this.module, entryPoint: "vs_full" },
            fragment: { module: this.module, entryPoint: "fs_depth_blur_composite", targets: [{ format }] },
            primitive: { topology: "triangle-list" },
            multisample: { count: sampleCount },
        });
        const uniform = (label: string) => device.createBuffer({ label, size: BLUR_FLOATS * 4, usage: BufferUsage.UNIFORM | BufferUsage.COPY_DST });
        this.uniforms = [uniform("depth blur across"), uniform("depth blur down")];
    }

    /** The pictures for an image of this size, made if need be. */
    ensure(width: number, height: number): DepthBlurTargets {
        const held = this.targets;
        if (held && held.width === width && held.height === height) return held;
        this.release();
        const picture = (label: string, format = this.format) => this.device.createTexture({
            label, size: [width, height], format,
            usage: TextureUsage.RENDER_ATTACHMENT | TextureUsage.TEXTURE_BINDING,
        });
        const sharp = picture("depth blur: sharp");
        const across = picture("depth blur: across", ACROSS_FORMAT);
        const spread = picture("depth blur: spread across", SPREAD_FORMAT);
        const both = picture("depth blur: both ways");
        this.targets = {
            width, height, sharp, across, spread, both,
            sharpView: sharp.createView(), acrossView: across.createView(), spreadView: spread.createView(), bothView: both.createView(),
        };
        return this.targets;
    }

    /**
     * Blur `t.sharp` across and then down, and write the mix into `colour` (the frame's
     * multisampled colour, whose contents it replaces). `depth`: the scene's multisampled depth;
     * `depth2`: the nearest transparent layer's, or null when there is none. `scale`: the image's
     * pixels to the canvas's, which the taps' spacing follows.
     */
    encode(encoder: GPUCommandEncoder, t: DepthBlurTargets, settings: DepthBlurSettings, scale: number,
           depth: GPUTextureView, depth2: GPUTextureView | null, depth2StandIn: GPUTextureView, colour: GPUTextureView): void {
        const step = settings.step * scale;
        const sub = depthBlurSubTaps(scale);
        const write = (buffer: GPUBuffer, dx: number, dy: number) => {
            this.data.fill(0);
            this.data.set(settings.weights.slice(0, MAX_WEIGHTS), 0);
            this.data.set([dx, dy, settings.focus, settings.taps], MAX_WEIGHTS);
            this.data.set([depth2 ? 1 : 0, 0, sub, 0], MAX_WEIGHTS + 4);
            this.device.queue.writeBuffer(buffer, 0, this.data);
        };
        // The composite reads the across pass's: the focal plane and the depth fallback.
        write(this.uniforms[0], step, 0);
        write(this.uniforms[1], 0, step);
        const group = (buffer: GPUBuffer, picture: GPUTextureView, second: GPUTextureView, spread: GPUTextureView) => this.device.createBindGroup({
            label: "depth blur",
            layout: this.layout,
            entries: [
                { binding: 0, resource: { buffer } },
                { binding: 1, resource: picture },
                { binding: 2, resource: this.sampler },
                { binding: 3, resource: depth },
                { binding: 4, resource: depth2 ?? depth2StandIn },
                { binding: 5, resource: second },
                { binding: 6, resource: spread },
            ],
        });
        const run = (label: string, views: GPUTextureView[], pipeline: GPURenderPipeline, bindGroup: GPUBindGroup) => {
            const pass = encoder.beginRenderPass({
                label,
                colorAttachments: views.map(view => ({ view, clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: "clear" as const, storeOp: "store" as const })),
            });
            pass.setPipeline(pipeline);
            pass.setBindGroup(0, bindGroup);
            pass.draw(3);
            pass.end();
        };
        // Bindings a pass does not read take any picture that is not its target.
        run("depth blur across", [t.acrossView, t.spreadView], this.acrossPipeline, group(this.uniforms[0], t.sharpView, t.bothView, t.bothView));
        run("depth blur down", [t.bothView], this.downPipeline, group(this.uniforms[1], t.acrossView, t.sharpView, t.spreadView));
        run("depth blur composite", [colour], this.compositePipeline, group(this.uniforms[0], t.sharpView, t.bothView, t.spreadView));
    }

    destroy(): void {
        this.release();
        this.uniforms.forEach(buffer => buffer.destroy());
    }

    private release(): void {
        const t = this.targets;
        if (!t) return;
        t.sharp.destroy();
        t.across.destroy();
        t.spread.destroy();
        t.both.destroy();
        this.targets = null;
    }
}
