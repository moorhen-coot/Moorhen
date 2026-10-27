/**
 * Anaglyph stereo in the WebGPU renderer: the two eyes' frames, each drawn whole on nothing
 * (premultiplied, the fog fading them as in a transparent screenshot), put together into one
 * picture, each eye in the colour channels its filter passes (../WebGLgComponents/anaglyph.ts).
 *
 * As WebGL draws it: each eye grey, in its own channels, on the background, which the channels
 * neither eye has keep. WebGL greys an eye by drawing everything white; here an eye's grey is its
 * picture's brightest channel, which for a lit colour is the lit white scaled by the colour's
 * brightest part - so pure colours come out as WebGL's white, and molecules stay bright.
 */
import { anaglyphChannels } from '../WebGLgComponents/anaglyph';
import { BufferUsage, ShaderStage, TextureUsage } from './gpu';

const ANAGLYPH_WGSL = /* wgsl */ `
struct Anaglyph {
    left: vec4f,        // 1 in the channels the left eye's picture goes into
    right: vec4f,       // and the right's
    background: vec4f,
    params: vec4f,      // x: 1 for a picture on nothing (premultiplied), 0 on the background
};
@group(0) @binding(0) var<uniform> u: Anaglyph;
@group(0) @binding(1) var leftEye: texture_2d<f32>;
@group(0) @binding(2) var rightEye: texture_2d<f32>;

@vertex
fn vs_full(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
    let p = vec2f(f32((i << 1u) & 2u), f32(i & 2u));
    return vec4f(p * 2.0 - 1.0, 0.0, 1.0);
}

// Premultiplied, so the grey is too.
fn grey(c: vec4f) -> f32 {
    return max(c.r, max(c.g, c.b));
}

@fragment
fn fs_anaglyph(@builtin(position) position: vec4f) -> @location(0) vec4f {
    let xy = vec2i(position.xy);
    let l = textureLoad(leftEye, xy, 0);
    let r = textureLoad(rightEye, xy, 0);
    if (u.params.x > 0.5) {
        return vec4f(u.left.rgb * grey(l) + u.right.rgb * grey(r), max(l.a, r.a));
    }
    let fromLeft = vec3f(grey(l)) + u.background.rgb * (1.0 - l.a);
    let fromRight = vec3f(grey(r)) + u.background.rgb * (1.0 - r.a);
    let rgb = select(select(u.background.rgb, fromRight, u.right.rgb > vec3f(0.5)), fromLeft, u.left.rgb > vec3f(0.5));
    return vec4f(rgb, 1.0);
}
`;

/** The combine's uniforms: the channel masks, the background, and whether on nothing. */
export function anaglyphUniforms(colours: string | undefined | null, background: ArrayLike<number>, transparent: boolean): Float32Array {
    const channels = anaglyphChannels(colours);
    const mask = (on: boolean[]) => on.map(c => (c ? 1 : 0));
    return new Float32Array([
        ...mask(channels.left), 0,
        ...mask(channels.right), 0,
        background[0], background[1], background[2], 1,
        transparent ? 1 : 0, 0, 0, 0,
    ]);
}

/** The two eyes' pictures and the pass that puts them together. */
export class AnaglyphCombine {
    private readonly device: GPUDevice;
    private readonly format: GPUTextureFormat;
    private readonly layout: GPUBindGroupLayout;
    private readonly pipeline: GPURenderPipeline;
    private readonly uniforms: GPUBuffer;
    private eyes: GPUTexture[] = [];
    private bindGroup: GPUBindGroup | null = null;

    constructor(device: GPUDevice, format: GPUTextureFormat) {
        this.device = device;
        this.format = format;
        const module = device.createShaderModule({ label: "anaglyph", code: ANAGLYPH_WGSL });
        const fragment = ShaderStage.FRAGMENT;
        this.layout = device.createBindGroupLayout({
            label: "anaglyph",
            entries: [
                { binding: 0, visibility: fragment, buffer: { type: "uniform" } },
                { binding: 1, visibility: fragment, texture: { sampleType: "unfilterable-float" } },
                { binding: 2, visibility: fragment, texture: { sampleType: "unfilterable-float" } },
            ],
        });
        this.pipeline = device.createRenderPipeline({
            label: "anaglyph",
            layout: device.createPipelineLayout({ bindGroupLayouts: [this.layout] }),
            vertex: { module, entryPoint: "vs_full" },
            fragment: { module, entryPoint: "fs_anaglyph", targets: [{ format }] },
            primitive: { topology: "triangle-list" },
        });
        this.uniforms = device.createBuffer({ label: "anaglyph", size: 64, usage: BufferUsage.UNIFORM | BufferUsage.COPY_DST });
    }

    /** The views to resolve each eye's frame into, `width` x `height`, kept while the size is. */
    eyeViews(width: number, height: number): GPUTextureView[] {
        if (this.eyes.length !== 2 || this.eyes[0].width !== width || this.eyes[0].height !== height) {
            this.eyes.forEach(texture => texture.destroy());
            this.eyes = ["left", "right"].map(eye => this.device.createTexture({
                label: `anaglyph ${eye} eye`, size: [width, height], format: this.format,
                usage: TextureUsage.RENDER_ATTACHMENT | TextureUsage.TEXTURE_BINDING,
            }));
            this.bindGroup = this.device.createBindGroup({
                label: "anaglyph",
                layout: this.layout,
                entries: [
                    { binding: 0, resource: { buffer: this.uniforms } },
                    { binding: 1, resource: this.eyes[0].createView() },
                    { binding: 2, resource: this.eyes[1].createView() },
                ],
            });
        }
        return this.eyes.map(texture => texture.createView());
    }

    /** The eyes, after eyeViews and their frames, put together into `resolve`, and submitted. */
    combine(resolve: GPUTextureView, uniforms: Float32Array): void {
        if (!this.bindGroup) return;
        this.device.queue.writeBuffer(this.uniforms, 0, uniforms);
        const encoder = this.device.createCommandEncoder({ label: "anaglyph" });
        const pass = encoder.beginRenderPass({
            label: "anaglyph",
            colorAttachments: [{ view: resolve, clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: "clear", storeOp: "store" }],
        });
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, this.bindGroup);
        pass.draw(3);
        pass.end();
        this.device.queue.submit([encoder.finish()]);
    }

    destroy(): void {
        this.eyes.forEach(texture => texture.destroy());
        this.eyes = [];
        this.bindGroup = null;
        this.uniforms.destroy();
    }
}
