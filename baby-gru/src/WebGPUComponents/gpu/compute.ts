/**
 * Small helpers for compute work, so that a new kernel needs only its WGSL and a few lines here.
 * See ../README.md for how they fit together, and ../mapContour for a module built on them.
 *
 * - ComputeKernel: one compiled entry point; binds buffers by position and dispatches one thread
 *   per item, folding the workgroups into rows when there are more than one dimension allows.
 * - itemIndexWgsl: the matching WGSL for a thread's item number, to paste into a shader.
 * - createBuffer / readBuffer: make (and fill) a buffer; copy one back to the CPU.
 */
import { BufferUsage, MAX_WORKGROUPS_PER_DIMENSION, MapMode } from "./constants";

/**
 * Workgroup counts (x, y) for `groups` workgroups: all in x when they fit, otherwise folded into
 * rows of the most x allows. A folded dispatch can have up to x - 1 workgroups more than asked
 * for, so a kernel must check its item number (itemIndexWgsl) against the item count.
 */
export function dispatchSize(groups: number): [number, number] {
    if (groups <= MAX_WORKGROUPS_PER_DIMENSION) return [Math.max(1, groups), 1];
    return [MAX_WORKGROUPS_PER_DIMENSION, Math.ceil(groups / MAX_WORKGROUPS_PER_DIMENSION)];
}

/**
 * WGSL for a thread's item number in a dispatch made by ComputeKernel.dispatch (or dispatchSize):
 * `fn itemIndex(lid: vec3u, wid: vec3u, nwg: vec3u) -> u32`, from the local invocation id,
 * workgroup id and number of workgroups. Items beyond the count must be skipped by the kernel.
 */
export function itemIndexWgsl(workgroupSize: number): string {
    return /* wgsl */ `
fn itemIndex(lid: vec3u, wid: vec3u, nwg: vec3u) -> u32 {
    return (wid.y * nwg.x + wid.x) * ${workgroupSize}u + lid.x;
}
`;
}

/** What a bind group can be made from: buffers in binding order (0, 1, ...), or a group made already. */
export type Bindings = readonly (GPUBuffer | GPUBufferBinding)[] | GPUBindGroup;

export interface KernelSource {
    /** Shown in WebGPU's error messages and in GPU debuggers. */
    label: string;
    code: string;
    /** Default "main". */
    entryPoint?: string;
    /** The entry point's @workgroup_size (x only); used to turn items into workgroups. */
    workgroupSize: number;
}

/** One compute entry point, compiled, with its bind group layouts made from the shader ("auto"). */
export class ComputeKernel {
    private constructor(
        readonly device: GPUDevice,
        readonly label: string,
        readonly pipeline: GPUComputePipeline,
        readonly workgroupSize: number,
    ) {}

    /**
     * Compile asynchronously, so that the cost is not paid in the middle of the first frame that
     * needs the kernel. Rejects with the compiler's messages if the WGSL does not compile.
     */
    static async create(device: GPUDevice, source: KernelSource): Promise<ComputeKernel> {
        const module = device.createShaderModule({ label: source.label, code: source.code });
        const pipeline = await device.createComputePipelineAsync({
            label: source.label,
            layout: "auto",
            compute: { module, entryPoint: source.entryPoint ?? "main" },
        }).catch(async (err: unknown) => {
            // The pipeline error says little; the compilation messages say where.
            const info = await module.getCompilationInfo();
            const messages = info.messages.map(m => `${m.type} ${m.lineNum}:${m.linePos} ${m.message}`).join("\n");
            throw new Error(`${source.label}: ${err instanceof Error ? err.message : String(err)}${messages ? `\n${messages}` : ""}`);
        });
        return new ComputeKernel(device, source.label, pipeline, source.workgroupSize);
    }

    /**
     * A bind group for `group` of this kernel, from buffers in binding order. Groups made by
     * "auto" layouts hold only the bindings the entry point uses, so the buffers given must be
     * exactly those, in order.
     */
    bindGroup(group: number, buffers: readonly (GPUBuffer | GPUBufferBinding)[]): GPUBindGroup {
        return this.device.createBindGroup({
            label: `${this.label} group ${group}`,
            layout: this.pipeline.getBindGroupLayout(group),
            entries: buffers.map((b, binding) => ({ binding, resource: "buffer" in b ? b : { buffer: b } })),
        });
    }

    /**
     * Record one compute pass running this kernel: one thread per item (0 items records nothing),
     * or exactly `workgroups` workgroups if given (for kernels that loop over their own items).
     * `groups[i]` is bind group i.
     */
    dispatch(encoder: GPUCommandEncoder, options: {
        groups: readonly Bindings[];
        items?: number;
        workgroups?: number;
        timestampWrites?: GPUComputePassTimestampWrites;
    }): void {
        const { items, workgroups } = options;
        if (workgroups === undefined && !(items > 0)) return;
        const pass = encoder.beginComputePass({ label: this.label, timestampWrites: options.timestampWrites });
        pass.setPipeline(this.pipeline);
        options.groups.forEach((bindings, group) => {
            pass.setBindGroup(group, isBindGroup(bindings) ? bindings : this.bindGroup(group, bindings));
        });
        const [x, y] = dispatchSize(workgroups ?? Math.ceil(items / this.workgroupSize));
        pass.dispatchWorkgroups(x, y);
        pass.end();
    }
}

function isBindGroup(bindings: Bindings): bindings is GPUBindGroup {
    return !Array.isArray(bindings);
}

/**
 * A buffer of at least `bytes` (rounded up to 4, and at least 16), with COPY_DST added when it is
 * filled from `data`.
 */
export function createBuffer(device: GPUDevice, label: string, bytes: number, usage: number, data?: ArrayBufferView): GPUBuffer {
    const size = Math.max(16, Math.ceil(Math.max(bytes, data?.byteLength ?? 0) / 4) * 4);
    const buffer = device.createBuffer({ label, size, usage: data ? usage | BufferUsage.COPY_DST : usage });
    if (data) device.queue.writeBuffer(buffer, 0, data.buffer, data.byteOffset, data.byteLength);
    return buffer;
}

/**
 * Copy `bytes` of `source` (which needs COPY_SRC) from `offset` back to the CPU. For tests and
 * occasional checks: it waits for the GPU, which in Firefox can take 100 ms. Never call it once
 * per frame, or between the steps of one piece of work (see ../README.md, "Do not wait").
 */
export async function readBuffer(device: GPUDevice, source: GPUBuffer, bytes: number, offset = 0): Promise<ArrayBuffer> {
    const size = Math.max(4, Math.ceil(bytes / 4) * 4);
    const staging = device.createBuffer({ label: `read back ${source.label}`, size, usage: BufferUsage.MAP_READ | BufferUsage.COPY_DST });
    const encoder = device.createCommandEncoder({ label: `read back ${source.label}` });
    encoder.copyBufferToBuffer(source, offset, staging, 0, size);
    device.queue.submit([encoder.finish()]);
    try {
        await staging.mapAsync(MapMode.READ);
        return staging.getMappedRange().slice(0, bytes);
    } finally {
        staging.destroy();
    }
}
