/**
 * Textured shapes in the WebGPU renderer: planes of values from Coot (TexturedShape, made by
 * appendOtherData from a texture-as-floats result) coloured through a ramp, as drawTexturedShapes
 * draws them in WebGL. The values and ramp come from the TexturedShape's own arrays; they are made
 * into textures here, and again when its revision moves (a new colour ramp).
 */
import { BufferUsage, ShaderStage, TextureUsage } from './gpu';
import { TEXTURED_WGSL } from './previewShaders';

/** What is read of a TexturedShape. */
export interface TexturedShapeSource {
    width: number;
    height: number;
    x_size: number;
    y_size: number;
    z_position: number;
    imageData?: Float32Array;
    colourRamp?: Float32Array;
    revision?: number;
}

interface ShapeResources {
    values: GPUTexture;
    ramp: GPUTexture;
    uniform: GPUBuffer;
    bindGroup: GPUBindGroup;
    revision: number | undefined;
}

export class TexturedShapeLayer {
    private readonly module: GPUShaderModule;
    private readonly layout: GPUBindGroupLayout;
    private readonly pipeline: GPURenderPipeline;
    private readonly shapes = new Map<TexturedShapeSource, ShapeResources>();

    constructor(private readonly device: GPUDevice, format: GPUTextureFormat, frameLayout: GPUBindGroupLayout,
                sampleCount: number, depthFormat: GPUTextureFormat) {
        this.module = device.createShaderModule({ label: "textured shapes", code: TEXTURED_WGSL });
        this.layout = device.createBindGroupLayout({
            label: "textured shape",
            entries: [
                { binding: 0, visibility: ShaderStage.VERTEX, buffer: { type: "uniform" } },
                { binding: 1, visibility: ShaderStage.FRAGMENT, texture: { sampleType: "unfilterable-float" } },
                { binding: 2, visibility: ShaderStage.FRAGMENT, texture: { sampleType: "unfilterable-float" } },
            ],
        });
        this.pipeline = device.createRenderPipeline({
            label: "textured shapes",
            layout: device.createPipelineLayout({ bindGroupLayouts: [frameLayout, this.layout] }),
            vertex: { module: this.module, entryPoint: "vs_shape", buffers: [] },
            fragment: {
                module: this.module, entryPoint: "fs_shape",
                targets: [{
                    format,
                    blend: {
                        color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" },
                        alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
                    },
                }],
            },
            primitive: { topology: "triangle-list", cullMode: "none" },
            depthStencil: { format: depthFormat, depthWriteEnabled: true, depthCompare: "less" },
            multisample: { count: sampleCount },
        });
    }

    /** Draw the shapes into `pass`, whose group 0 is the frame; returns how many were drawn. */
    draw(pass: GPURenderPassEncoder, shapes: readonly TexturedShapeSource[]): number {
        const present = new Set(shapes);
        for (const [shape, resources] of this.shapes) {
            if (!present.has(shape)) {
                this.release(resources);
                this.shapes.delete(shape);
            }
        }
        let drawn = 0;
        for (const shape of shapes) {
            const resources = this.prepare(shape);
            if (!resources) continue;
            pass.setPipeline(this.pipeline);
            pass.setBindGroup(1, resources.bindGroup);
            pass.draw(6);
            drawn++;
        }
        return drawn;
    }

    destroy(): void {
        this.shapes.forEach(resources => this.release(resources));
        this.shapes.clear();
    }

    private release(resources: ShapeResources): void {
        resources.values.destroy();
        resources.ramp.destroy();
        resources.uniform.destroy();
    }

    private prepare(shape: TexturedShapeSource): ShapeResources | null {
        const { width, height, imageData, colourRamp } = shape;
        if (!(width > 0 && height > 0) || !imageData || imageData.length < width * height || !colourRamp || colourRamp.length < 4) return null;
        let resources = this.shapes.get(shape);
        if (resources && (resources.revision !== shape.revision || shape.revision === undefined)) {
            this.release(resources);
            this.shapes.delete(shape);
            resources = undefined;
        }
        if (resources) return resources;

        const usage = TextureUsage.TEXTURE_BINDING | TextureUsage.COPY_DST;
        const values = this.device.createTexture({ label: "textured shape values", size: [width, height], format: "r32float", usage });
        this.device.queue.writeTexture({ texture: values }, imageData, { bytesPerRow: width * 4, rowsPerImage: height }, [width, height]);
        const rampWidth = Math.floor(colourRamp.length / 4);
        const ramp = this.device.createTexture({ label: "textured shape ramp", size: [rampWidth, 1], format: "rgba32float", usage });
        this.device.queue.writeTexture({ texture: ramp }, colourRamp, { bytesPerRow: rampWidth * 16 }, [rampWidth, 1]);
        const uniform = this.device.createBuffer({ label: "textured shape", size: 16, usage: BufferUsage.UNIFORM | BufferUsage.COPY_DST });
        this.device.queue.writeBuffer(uniform, 0, new Float32Array([shape.x_size, shape.y_size, shape.z_position, 0]));
        const bindGroup = this.device.createBindGroup({
            label: "textured shape",
            layout: this.layout,
            entries: [
                { binding: 0, resource: { buffer: uniform } },
                { binding: 1, resource: values.createView() },
                { binding: 2, resource: ramp.createView() },
            ],
        });
        resources = { values, ramp, uniform, bindGroup, revision: shape.revision };
        this.shapes.set(shape, resources);
        return resources;
    }
}
