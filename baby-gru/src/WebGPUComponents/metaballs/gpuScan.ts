/**
 * Exclusive prefix sum of a u32 array on the GPU, for turning per-item counts into output
 * offsets. Sums wrap modulo 2^32.
 *
 * Reduce, then scan: each 256-thread workgroup takes a block of 2048 elements. One pass sums each
 * block; the block sums are scanned in turn, recursively; a second pass scans each block from its
 * offset. That reads the input twice and writes the output once, and three levels cover 8.6
 * billion elements.
 *
 * At most MAX_WORKGROUPS workgroups are started, each looping over blocks. WebGPU zeroes
 * workgroup memory whenever a workgroup starts, and some implementations (Firefox's) do that with
 * one thread; starting a workgroup per block made that the larger part of the work there.
 */

const THREADS = 256;
const PER_THREAD = 8;
const BLOCK = THREADS * PER_THREAD;
const MAX_WORKGROUPS = 1024;

const SCAN_WGSL = /* wgsl */ `
struct ScanParams { n: u32, withOffsets: u32 };
@group(0) @binding(0) var<uniform> S: ScanParams;
@group(0) @binding(1) var<storage, read> input: array<u32>;
@group(0) @binding(2) var<storage, read_write> output: array<u32>;
// reduceBlocks writes each block's sum here; scanBlocks reads each block's offset from it.
@group(0) @binding(3) var<storage, read_write> blockSums: array<u32>;

const THREADS = ${THREADS}u;
const PER = ${PER_THREAD}u;
const BLOCK = ${BLOCK}u;
// One padding word every 32, so that a thread's PER neighbours do not share memory banks with
// the next threads'.
var<workgroup> values: array<u32, ${BLOCK + BLOCK / 32}>;
var<workgroup> part: array<u32, THREADS>;

fn padded(j: u32) -> u32 { return j + (j >> 5u); }

@compute @workgroup_size(${THREADS})
fn reduceBlocks(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u,
                @builtin(num_workgroups) nwg: vec3u) {
    let blocks = (S.n + BLOCK - 1u) / BLOCK;
    for (var block = wid.x; block < blocks; block += nwg.x) {
        let base = block * BLOCK;
        var s = 0u;
        for (var k = 0u; k < PER; k++) {
            let i = base + k * THREADS + lid.x;
            if (i < S.n) { s += input[i]; }
        }
        workgroupBarrier();
        part[lid.x] = s;
        for (var half = THREADS / 2u; half > 0u; half = half >> 1u) {
            workgroupBarrier();
            if (lid.x < half) { part[lid.x] = part[lid.x] + part[lid.x + half]; }
        }
        workgroupBarrier();
        if (lid.x == 0u) { blockSums[block] = part[0]; }
    }
}

@compute @workgroup_size(${THREADS})
fn scanBlocks(@builtin(local_invocation_id) lid: vec3u, @builtin(workgroup_id) wid: vec3u,
              @builtin(num_workgroups) nwg: vec3u) {
    let blocks = (S.n + BLOCK - 1u) / BLOCK;
    for (var block = wid.x; block < blocks; block += nwg.x) {
        scanBlock(lid.x, block);
    }
}

fn scanBlock(lane: u32, block: u32) {
    let base = block * BLOCK;
    // The previous block's last reads of values and part are done.
    workgroupBarrier();
    // In coalesced; then each thread scans its PER neighbours.
    for (var k = 0u; k < PER; k++) {
        let j = k * THREADS + lane;
        var v = 0u;
        if (base + j < S.n) { v = input[base + j]; }
        values[padded(j)] = v;
    }
    workgroupBarrier();
    var own: array<u32, ${PER_THREAD}>;
    var s = 0u;
    for (var k = 0u; k < PER; k++) {
        own[k] = s;
        s += values[padded(lane * PER + k)];
    }
    // Inclusive scan of the threads' totals.
    part[lane] = s;
    for (var step = 1u; step < THREADS; step = step << 1u) {
        workgroupBarrier();
        var v = part[lane];
        if (lane >= step) { v += part[lane - step]; }
        workgroupBarrier();
        part[lane] = v;
    }
    workgroupBarrier();
    var before = 0u;
    if (S.withOffsets != 0u) { before = blockSums[block]; }
    if (lane > 0u) { before += part[lane - 1u]; }
    for (var k = 0u; k < PER; k++) { values[padded(lane * PER + k)] = before + own[k]; }
    workgroupBarrier();
    for (var k = 0u; k < PER; k++) {
        let j = k * THREADS + lane;
        if (base + j < S.n) { output[base + j] = values[padded(j)]; }
    }
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
    private readonly reducePipeline: GPUComputePipeline;
    /** Scratch buffers per level, grown as needed: [block sums, scanned block sums]. */
    private readonly levels: { sums: GPUBuffer; scanned: GPUBuffer; capacity: number }[] = [];
    /** Buffers made for one scan that can go once its commands have run. */
    private transient: GPUBuffer[] = [];

    /** Compile the pipelines first, so that their cost is not paid inside the first scan. */
    static async create(device: GPUDevice): Promise<GpuScan> {
        const module = device.createShaderModule({ label: "exclusive scan", code: SCAN_WGSL });
        const [scan, reduce] = await Promise.all([
            device.createComputePipelineAsync({ label: "scan blocks", layout: "auto", compute: { module, entryPoint: "scanBlocks" } }),
            device.createComputePipelineAsync({ label: "reduce blocks", layout: "auto", compute: { module, entryPoint: "reduceBlocks" } }),
        ]);
        return new GpuScan(device, scan, reduce);
    }

    private constructor(device: GPUDevice, scanPipeline: GPUComputePipeline, reducePipeline: GPUComputePipeline) {
        this.device = device;
        this.scanPipeline = scanPipeline;
        this.reducePipeline = reducePipeline;
    }

    /** Record an exclusive scan of input[0..n) into output[0..n). */
    encode(encoder: GPUCommandEncoder, input: GPUBuffer, output: GPUBuffer, n: number, level = 0,
           timestamps?: (label: string) => GPUComputePassTimestampWrites | undefined): void {
        if (n === 0) return;
        const blocks = Math.ceil(n / BLOCK);
        const scratch = this.level(level, blocks);
        const withOffsets = blocks > 1;
        const params = this.device.createBuffer({ size: 16, usage: UNIFORM | COPY_DST });
        this.device.queue.writeBuffer(params, 0, new Uint32Array([n, withOffsets ? 1 : 0, 0, 0]));
        this.transient.push(params);
        const workgroups = Math.min(blocks, MAX_WORKGROUPS);

        if (withOffsets) {
            const reduce = encoder.beginComputePass({ label: `reduce level ${level}`, timestampWrites: timestamps?.("scan") });
            reduce.setPipeline(this.reducePipeline);
            reduce.setBindGroup(0, this.device.createBindGroup({
                layout: this.reducePipeline.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: { buffer: params } },
                    { binding: 1, resource: { buffer: input } },
                    { binding: 3, resource: { buffer: scratch.sums } },
                ],
            }));
            reduce.dispatchWorkgroups(workgroups);
            reduce.end();
            this.encode(encoder, scratch.sums, scratch.scanned, blocks, level + 1, timestamps);
        }

        const pass = encoder.beginComputePass({ label: `scan level ${level}`, timestampWrites: timestamps?.("scan") });
        pass.setPipeline(this.scanPipeline);
        pass.setBindGroup(0, this.device.createBindGroup({
            layout: this.scanPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: params } },
                { binding: 1, resource: { buffer: input } },
                { binding: 2, resource: { buffer: output } },
                { binding: 3, resource: { buffer: scratch.scanned } },
            ],
        }));
        pass.dispatchWorkgroups(workgroups);
        pass.end();
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
