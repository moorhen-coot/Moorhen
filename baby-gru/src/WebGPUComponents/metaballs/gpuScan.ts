/**
 * Exclusive prefix sum of a u32 array on the GPU, for turning per-item counts into output
 * offsets.
 *
 * A block scan (Blelloch, 512 elements per 256-thread workgroup) whose per-block totals are
 * scanned in turn, recursively, and added back. Three levels cover 134 million elements.
 */

const BLOCK = 512;

const SCAN_WGSL = /* wgsl */ `
struct ScanParams { n: u32 };
@group(0) @binding(0) var<uniform> S: ScanParams;
@group(0) @binding(1) var<storage, read> input: array<u32>;
@group(0) @binding(2) var<storage, read_write> output: array<u32>;
@group(0) @binding(3) var<storage, read_write> blockSums: array<u32>;

var<workgroup> temp: array<u32, ${BLOCK}>;

@compute @workgroup_size(${BLOCK / 2})
fn scanBlocks(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u,
              @builtin(num_workgroups) nwg: vec3u) {
    let block = wid.y * nwg.x + wid.x;
    let base = block * ${BLOCK}u;
    let a = 2u * lid.x;
    let b = a + 1u;
    var va = 0u;
    var vb = 0u;
    if (base + a < S.n) { va = input[base + a]; }
    if (base + b < S.n) { vb = input[base + b]; }
    temp[a] = va;
    temp[b] = vb;

    var offset = 1u;
    for (var d = ${BLOCK / 2}u; d > 0u; d = d >> 1u) {
        workgroupBarrier();
        if (lid.x < d) {
            let ai = offset * (2u * lid.x + 1u) - 1u;
            let bi = offset * (2u * lid.x + 2u) - 1u;
            temp[bi] = temp[bi] + temp[ai];
        }
        offset = offset << 1u;
    }
    workgroupBarrier();
    if (lid.x == 0u) {
        blockSums[block] = temp[${BLOCK - 1}u];
        temp[${BLOCK - 1}u] = 0u;
    }
    for (var d = 1u; d < ${BLOCK}u; d = d << 1u) {
        offset = offset >> 1u;
        workgroupBarrier();
        if (lid.x < d) {
            let ai = offset * (2u * lid.x + 1u) - 1u;
            let bi = offset * (2u * lid.x + 2u) - 1u;
            let t = temp[ai];
            temp[ai] = temp[bi];
            temp[bi] = temp[bi] + t;
        }
    }
    workgroupBarrier();
    if (base + a < S.n) { output[base + a] = temp[a]; }
    if (base + b < S.n) { output[base + b] = temp[b]; }
}

@compute @workgroup_size(${BLOCK / 2})
fn addBlockSums(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u,
                @builtin(num_workgroups) nwg: vec3u) {
    let block = wid.y * nwg.x + wid.x;
    let base = block * ${BLOCK}u;
    let add = blockSums[block];
    let a = base + 2u * lid.x;
    if (a < S.n) { output[a] = output[a] + add; }
    if (a + 1u < S.n) { output[a + 1u] = output[a + 1u] + add; }
}
`;

const MAX_GROUPS_X = 65535;

/** Workgroup counts for `groups` groups, folded into y when x would exceed the limit. */
export function dispatchSize(groups: number): [number, number] {
    if (groups <= MAX_GROUPS_X) return [Math.max(1, groups), 1];
    return [MAX_GROUPS_X, Math.ceil(groups / MAX_GROUPS_X)];
}

// Spec values; the DOM typings have the WebGPU interfaces but not these globals.
const STORAGE = 0x0080, COPY_DST = 0x0008, UNIFORM = 0x0040;

export class GpuScan {
    private readonly device: GPUDevice;
    private readonly scanPipeline: GPUComputePipeline;
    private readonly addPipeline: GPUComputePipeline;
    /** Scratch buffers per level, grown as needed: [block sums, scanned block sums]. */
    private readonly levels: { sums: GPUBuffer; scanned: GPUBuffer; capacity: number }[] = [];
    /** Buffers made for one scan that can go once its commands have run. */
    private transient: GPUBuffer[] = [];

    /** Compile the pipelines first, so that their cost is not paid inside the first scan. */
    static async create(device: GPUDevice): Promise<GpuScan> {
        const module = device.createShaderModule({ label: "exclusive scan", code: SCAN_WGSL });
        const [scan, add] = await Promise.all([
            device.createComputePipelineAsync({ label: "scan blocks", layout: "auto", compute: { module, entryPoint: "scanBlocks" } }),
            device.createComputePipelineAsync({ label: "add block sums", layout: "auto", compute: { module, entryPoint: "addBlockSums" } }),
        ]);
        return new GpuScan(device, scan, add);
    }

    private constructor(device: GPUDevice, scanPipeline: GPUComputePipeline, addPipeline: GPUComputePipeline) {
        this.device = device;
        this.scanPipeline = scanPipeline;
        this.addPipeline = addPipeline;
    }

    /** Record an exclusive scan of input[0..n) into output[0..n). */
    encode(encoder: GPUCommandEncoder, input: GPUBuffer, output: GPUBuffer, n: number, level = 0,
           timestamps?: (label: string) => GPUComputePassTimestampWrites | undefined): void {
        if (n === 0) return;
        const blocks = Math.ceil(n / BLOCK);
        const scratch = this.level(level, blocks);
        const params = this.device.createBuffer({ size: 16, usage: UNIFORM | COPY_DST });
        this.device.queue.writeBuffer(params, 0, new Uint32Array([n, 0, 0, 0]));
        this.transient.push(params);

        const pass = encoder.beginComputePass({ label: `scan level ${level}`, timestampWrites: timestamps?.("scan") });
        pass.setPipeline(this.scanPipeline);
        pass.setBindGroup(0, this.device.createBindGroup({
            layout: this.scanPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: params } },
                { binding: 1, resource: { buffer: input } },
                { binding: 2, resource: { buffer: output } },
                { binding: 3, resource: { buffer: scratch.sums } },
            ],
        }));
        const [gx, gy] = dispatchSize(blocks);
        pass.dispatchWorkgroups(gx, gy);
        pass.end();

        if (blocks > 1) {
            this.encode(encoder, scratch.sums, scratch.scanned, blocks, level + 1, timestamps);
            const add = encoder.beginComputePass({ label: `add block sums ${level}`, timestampWrites: timestamps?.("scan") });
            add.setPipeline(this.addPipeline);
            add.setBindGroup(0, this.device.createBindGroup({
                layout: this.addPipeline.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: { buffer: params } },
                    { binding: 2, resource: { buffer: output } },
                    { binding: 3, resource: { buffer: scratch.scanned } },
                ],
            }));
            add.dispatchWorkgroups(gx, gy);
            add.end();
        }
    }

    /** Free what the scans recorded since the last call needed. Call after they have run. */
    releaseTransient(): void {
        this.transient.forEach(b => b.destroy());
        this.transient = [];
    }

    destroy(): void {
        this.releaseTransient();
        this.levels.forEach(l => { l.sums.destroy(); l.scanned.destroy(); });
        this.levels.length = 0;
    }

    private level(level: number, blocks: number) {
        const existing = this.levels[level];
        if (existing && existing.capacity >= blocks) return existing;
        existing?.sums.destroy();
        existing?.scanned.destroy();
        const capacity = Math.max(blocks, 64);
        const make = (label: string) => this.device.createBuffer({ label, size: capacity * 4, usage: STORAGE | COPY_DST });
        this.levels[level] = { sums: make(`scan sums ${level}`), scanned: make(`scan scanned ${level}`), capacity };
        return this.levels[level];
    }
}
