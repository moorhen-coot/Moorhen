/**
 * Depth peeling in the WebGPU renderer: order-independent transparency as drawPeel does it in
 * WebGL, without the white rim.
 *
 * WebGL, with peelOpaqueSeparately (its default), draws the opaque scene into one layer -
 * multisampled, then resolved - and peels the transparent geometry into the others: the nearest
 * transparent fragment in front of the opaque depth, then the next nearest behind that, and so on,
 * one layer a pass, with blending off. It then blends the layers over the opaque one, back to
 * front. depthPeelLayers counts the opaque layer, so its default 4 peels 3 transparent ones; a
 * fragment further back than the last is not drawn.
 *
 * The rim (transparency-antialiasing-notes.md): at an opaque silhouette WebGL has resolved the
 * opaque depth to one value a pixel, and a transparent fragment behind it is dropped from the
 * whole pixel - so the uncovered part of the pixel shows the background. Here the opaque depth
 * stays multisampled, as it was drawn:
 *   1. the opaque scene is drawn 4x multisampled into the frame's colour target and a depth
 *      texture that can be read (`opaqueDepth`), and kept;
 *   2. the transparent geometry is peeled into single-sampled layers through the *_peel entry
 *      points (previewShaders.ts): a fragment is dropped only if it is behind the opaque depth at
 *      every sample, so a fragment at a silhouette is kept;
 *   3. the layers are blended over the opaque picture in one full-screen pass that runs once a
 *      sample (fs_composite), each layer counting only at the samples whose opaque depth it is
 *      in front of. So the samples the opaque geometry does not cover show what is behind it.
 * Then the frame's overlays and text, and the resolve.
 *
 * Unlike WebGL's composite, the layers are not passed through FXAA: a layer holding only
 * transparent geometry is mostly empty, and FXAA averaged its cleared colour into every edge
 * (the notes, section 3, and WebGL's own fix for it).
 */
import { ShaderStage, TextureUsage } from './gpu';

/** A peel layer's colour: straight colour and alpha, as WebGL's layers hold them. */
export const PEEL_COLOUR_FORMAT: GPUTextureFormat = "rgba8unorm";
export const PEEL_DEPTH_FORMAT: GPUTextureFormat = "depth32float";

/**
 * How many transparent layers to peel: depthPeelLayers less the opaque layer, as WebGL counts
 * them, at least one. 0 when nothing calls for peeling - order-independent transparency off, or
 * nothing transparent in view but hover highlights, which never switch it on in WebGL either.
 */
export function transparentLayers(source: { doOrderIndependentTransparency?: boolean; store?: { getState(): { sceneSettings?: { depthPeelLayers?: number } } } },
                                  anyTransparent: boolean): number {
    if (!anyTransparent || source.doOrderIndependentTransparency === false) return 0;
    const layers = source.store?.getState().sceneSettings?.depthPeelLayers ?? 4;
    return Math.max(1, Math.round(layers) - 1);
}

export const PEEL_COMPOSITE_WGSL = /* wgsl */ `
@group(0) @binding(0) var opaqueDepth: texture_depth_multisampled_2d;
@group(0) @binding(1) var layerColour: texture_2d_array<f32>;
// One more layer than the colour: the first is the cleared one the first peel compares against.
@group(0) @binding(2) var layerDepth: texture_depth_2d_array;

@vertex
fn vs_full(@builtin(vertex_index) vertex: u32) -> @builtin(position) vec4f {
    let xy = vec2f(f32((vertex << 1u) & 2u), f32(vertex & 2u));
    return vec4f(xy * 2.0 - 1.0, 0.0, 1.0);
}

// Once a sample: the layers in front of this sample's opaque depth, furthest first, each over the
// ones behind it - the blend drawPeel's composite does layer by layer - as one premultiplied colour
// for the pipeline to blend over the opaque picture.
@fragment
fn fs_composite(@builtin(position) position: vec4f, @builtin(sample_index) sample: u32) -> @location(0) vec4f {
    let p = vec2i(position.xy);
    let opaque = textureLoad(opaqueDepth, p, sample);
    var colour = vec4f(0.0);
    for (var k = i32(textureNumLayers(layerColour)) - 1; k >= 0; k--) {
        let depth = textureLoad(layerDepth, p, k + 1, 0);
        // Nothing drawn in this layer here (cleared to 1), or behind the opaque scene at this sample.
        if (depth >= 1.0 || depth >= opaque) { continue; }
        let c = textureLoad(layerColour, p, k, 0);
        colour = vec4f(c.rgb * c.a + colour.rgb * (1.0 - c.a), c.a + colour.a * (1.0 - c.a));
    }
    return colour;
}
`;

/** One frame's (or tile's) peeling targets: the readable opaque depth and the layers. */
export interface PeelTargets {
    width: number;
    height: number;
    layers: number;
    opaqueDepth: GPUTexture;
    opaqueDepthView: GPUTextureView;
    colour: GPUTexture;
    depth: GPUTexture;
    /** Each transparent layer's attachments, and the depth of the layer before it to read. */
    colourViews: GPUTextureView[];
    depthViews: GPUTextureView[];
    previousViews: GPUTextureView[];
    /** The cleared layer the first peel compares against. */
    zeroView: GPUTextureView;
    composite: GPUBindGroup;
}

export class DepthPeel {
    private readonly module: GPUShaderModule;
    private readonly layout: GPUBindGroupLayout;
    private readonly compositePipeline: GPURenderPipeline;
    private targets: PeelTargets | null = null;

    /**
     * `format` and `sampleCount`: the frame's multisampled colour target, which the composite
     * blends into. `depthFormat`: the opaque depth's, which the frame's other passes draw with.
     */
    constructor(private readonly device: GPUDevice, format: GPUTextureFormat, private readonly sampleCount: number,
                private readonly depthFormat: GPUTextureFormat) {
        this.module = device.createShaderModule({ label: "depth peel composite", code: PEEL_COMPOSITE_WGSL });
        this.layout = device.createBindGroupLayout({
            label: "depth peel composite",
            entries: [
                { binding: 0, visibility: ShaderStage.FRAGMENT, texture: { sampleType: "depth", multisampled: true } },
                { binding: 1, visibility: ShaderStage.FRAGMENT, texture: { sampleType: "unfilterable-float", viewDimension: "2d-array" } },
                { binding: 2, visibility: ShaderStage.FRAGMENT, texture: { sampleType: "depth", viewDimension: "2d-array" } },
            ],
        });
        this.compositePipeline = device.createRenderPipeline({
            label: "depth peel composite",
            layout: device.createPipelineLayout({ bindGroupLayouts: [this.layout] }),
            vertex: { module: this.module, entryPoint: "vs_full" },
            fragment: {
                module: this.module, entryPoint: "fs_composite",
                // Premultiplied over: the straight-alpha blends of drawPeel's composite, folded.
                targets: [{
                    format,
                    blend: {
                        color: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
                        alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
                    },
                }],
            },
            primitive: { topology: "triangle-list" },
            multisample: { count: sampleCount },
        });
    }

    /** The targets for an image of this size and `layers` transparent layers, made if need be. */
    ensure(width: number, height: number, layers: number): PeelTargets {
        const held = this.targets;
        if (held && held.width === width && held.height === height && held.layers === layers) return held;
        this.release();
        const opaqueDepth = this.device.createTexture({
            label: "opaque depth (multisampled, readable)", size: [width, height], format: this.depthFormat,
            sampleCount: this.sampleCount, usage: TextureUsage.RENDER_ATTACHMENT | TextureUsage.TEXTURE_BINDING,
        });
        const usage = TextureUsage.RENDER_ATTACHMENT | TextureUsage.TEXTURE_BINDING;
        const colour = this.device.createTexture({
            label: "peel layers' colour", size: [width, height, layers], format: PEEL_COLOUR_FORMAT, usage,
        });
        const depth = this.device.createTexture({
            label: "peel layers' depth", size: [width, height, layers + 1], format: PEEL_DEPTH_FORMAT, usage,
        });
        const layer = (texture: GPUTexture, index: number) =>
            texture.createView({ dimension: "2d", baseArrayLayer: index, arrayLayerCount: 1 });
        const colourViews = Array.from({ length: layers }, (_, k) => layer(colour, k));
        const depthViews = Array.from({ length: layers }, (_, k) => layer(depth, k + 1));
        const previousViews = Array.from({ length: layers }, (_, k) => layer(depth, k));
        const opaqueDepthView = opaqueDepth.createView();
        const composite = this.device.createBindGroup({
            label: "depth peel composite",
            layout: this.layout,
            entries: [
                { binding: 0, resource: opaqueDepthView },
                { binding: 1, resource: colour.createView({ dimension: "2d-array" }) },
                { binding: 2, resource: depth.createView({ dimension: "2d-array" }) },
            ],
        });
        this.targets = {
            width, height, layers, opaqueDepth, opaqueDepthView, colour, depth,
            colourViews, depthViews, previousViews, zeroView: previousViews[0], composite,
        };
        return this.targets;
    }

    /** Clear the layer the first peel compares against to 0, so that it keeps everything. */
    clearZeroLayer(encoder: GPUCommandEncoder, t: PeelTargets): void {
        encoder.beginRenderPass({
            label: "peel: cleared first layer",
            colorAttachments: [],
            depthStencilAttachment: { view: t.zeroView, depthClearValue: 0, depthLoadOp: "clear", depthStoreOp: "store" },
        }).end();
    }

    /**
     * Transparent layer `k`'s pass (0 nearest): its colour cleared to nothing, its depth to 1 - or,
     * for the second and later views of a divided canvas (`clear` false), kept, as each view peels
     * only its own part of the layer and the views' parts are blurred and composited together.
     */
    layerPass(t: PeelTargets, k: number, clear = true): GPURenderPassDescriptor {
        const loadOp: GPULoadOp = clear ? "clear" : "load";
        return {
            label: `peel layer ${k + 1}`,
            colorAttachments: [{ view: t.colourViews[k], clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp, storeOp: "store" }],
            depthStencilAttachment: { view: t.depthViews[k], depthClearValue: 1, depthLoadOp: loadOp, depthStoreOp: "store" },
        };
    }

    /** Blend the layers over the opaque picture, in a pass on the frame's colour target. */
    composite(pass: GPURenderPassEncoder, t: PeelTargets): void {
        pass.setPipeline(this.compositePipeline);
        pass.setBindGroup(0, t.composite);
        pass.draw(3);
    }

    destroy(): void {
        this.release();
    }

    private release(): void {
        const t = this.targets;
        if (!t) return;
        t.opaqueDepth.destroy();
        t.colour.destroy();
        t.depth.destroy();
        this.targets = null;
    }
}
