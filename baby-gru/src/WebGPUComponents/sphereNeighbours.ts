/**
 * Which perfect spheres overlap which, for the lines drawn where clip caps meet (capSeam in
 * previewShaders.ts): each cap pixel looks at its own sphere's neighbours and darkens where the
 * seam with one of them, on the front plane, is within a pixel or so.
 *
 * Made on the GPU once per sub-buffer, the first time it is drawn with clip caps. The spheres are
 * linked into lists, one per cell of a grid a largest diameter wide (each sphere swaps itself in
 * as its cell's head), so that a sphere's neighbours are all in the 27 cells round its own; then
 * each sphere walks those lists. A sphere keeps up to NEIGHBOUR_SLOTS neighbours, the most
 * overlapped: in a space-filling model an atom overlaps 4 to 12 others.
 */
import { BufferUsage, ShaderStage } from "./gpu";

/** Neighbour slots a sphere: NO_NEIGHBOUR ends the list early. Must match previewShaders.ts. */
export const NEIGHBOUR_SLOTS = 16;
export const NO_NEIGHBOUR = 0xffffffff;

const WORKGROUP = 64;

const NEIGHBOURS_WGSL = /* wgsl */ `
struct Grid {
    lo: vec3f,
    cell: f32,
    dims: vec3u,
    count: u32,
};

const SLOTS = ${NEIGHBOUR_SLOTS}u;
const NO_NEIGHBOUR = ${NO_NEIGHBOUR}u;

@group(0) @binding(0) var<uniform> grid: Grid;
@group(0) @binding(1) var<storage, read> spheres: array<vec4f>;
// Each cell's first sphere plus 1 (0: none), and each sphere's next in its cell's list, plus 1.
@group(0) @binding(2) var<storage, read_write> head: array<atomic<u32>>;
@group(0) @binding(3) var<storage, read_write> next: array<u32>;
@group(0) @binding(4) var<storage, read_write> neighbours: array<u32>;

fn cellOf(p: vec3f) -> vec3i {
    return clamp(vec3i(floor((p - grid.lo) / grid.cell)), vec3i(0), vec3i(grid.dims) - 1);
}

fn cellIndex(c: vec3i) -> u32 {
    return (u32(c.z) * grid.dims.y + u32(c.y)) * grid.dims.x + u32(c.x);
}

@compute @workgroup_size(${WORKGROUP})
fn link(@builtin(global_invocation_id) id: vec3u) {
    let i = id.x;
    if (i >= grid.count) { return; }
    next[i] = atomicExchange(&head[cellIndex(cellOf(spheres[i].xyz))], i + 1u);
}

@compute @workgroup_size(${WORKGROUP})
fn gather(@builtin(global_invocation_id) id: vec3u) {
    let i = id.x;
    if (i >= grid.count) { return; }
    let s = spheres[i];
    let home = cellOf(s.xyz);
    var kept: array<u32, SLOTS>;
    var depth: array<f32, SLOTS>;
    var n = 0u;
    for (var z = -1; z <= 1; z++) {
        for (var y = -1; y <= 1; y++) {
            for (var x = -1; x <= 1; x++) {
                let c = home + vec3i(x, y, z);
                if (any(c < vec3i(0)) || any(c >= vec3i(grid.dims))) { continue; }
                var entry = atomicLoad(&head[cellIndex(c)]);
                while (entry != 0u) {
                    let j = entry - 1u;
                    entry = next[j];
                    if (j == i) { continue; }
                    let t = spheres[j];
                    let d = t.xyz - s.xyz;
                    let reach = s.w + t.w;
                    let d2 = dot(d, d);
                    if (d2 >= reach * reach) { continue; }
                    let overlap = reach - sqrt(d2);
                    if (n < SLOTS) {
                        kept[n] = j;
                        depth[n] = overlap;
                        n++;
                        continue;
                    }
                    // Full: replace the least overlapped, if this overlaps more.
                    var least = 0u;
                    for (var k = 1u; k < SLOTS; k++) {
                        if (depth[k] < depth[least]) { least = k; }
                    }
                    if (overlap > depth[least]) {
                        kept[least] = j;
                        depth[least] = overlap;
                    }
                }
            }
        }
    }
    for (var k = 0u; k < SLOTS; k++) {
        neighbours[i * SLOTS + k] = select(NO_NEIGHBOUR, kept[k], k < n);
    }
}
`;

/** The spheres (x, y, z, radius) and their neighbour lists, ready to bind as storage. */
export interface SphereNeighbourBuffers {
    spheres: GPUBuffer;
    neighbours: GPUBuffer;
}

export class SphereNeighbourKernels {
    private readonly layout: GPUBindGroupLayout;
    private readonly link: GPUComputePipeline;
    private readonly gather: GPUComputePipeline;

    constructor(private readonly device: GPUDevice) {
        const storage = (type: GPUBufferBindingType) => ({ visibility: ShaderStage.COMPUTE, buffer: { type } });
        this.layout = device.createBindGroupLayout({
            label: "sphere neighbours",
            entries: [
                { binding: 0, ...storage("uniform") },
                { binding: 1, ...storage("read-only-storage") },
                { binding: 2, ...storage("storage") },
                { binding: 3, ...storage("storage") },
                { binding: 4, ...storage("storage") },
            ],
        });
        const module = device.createShaderModule({ label: "sphere neighbours", code: NEIGHBOURS_WGSL });
        const layout = device.createPipelineLayout({ bindGroupLayouts: [this.layout] });
        this.link = device.createComputePipeline({ label: "sphere neighbours: link", layout, compute: { module, entryPoint: "link" } });
        this.gather = device.createComputePipeline({ label: "sphere neighbours: gather", layout, compute: { module, entryPoint: "gather" } });
    }

    /**
     * The neighbour lists of `count` spheres: `origins` x, y, z a sphere, `sizes` x, y, z a sphere of
     * which x is the radius (as vs_sphere takes it). Two spheres are neighbours when their centres
     * are closer than the sum of their radii. Null when there are too many spheres to dispatch or
     * bind; the buffers made are added to `created`, to be destroyed with the sub-buffer's.
     */
    build(origins: ArrayLike<number>, sizes: ArrayLike<number>, count: number, created: GPUBuffer[]): SphereNeighbourBuffers | null {
        const limits = this.device.limits;
        const groups = Math.ceil(count / WORKGROUP);
        if (count < 1 || groups > limits.maxComputeWorkgroupsPerDimension
            || count * NEIGHBOUR_SLOTS * 4 > limits.maxStorageBufferBindingSize) return null;

        const data = new Float32Array(4 * count);
        const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
        let maxRadius = 0;
        for (let i = 0; i < count; i++) {
            for (let k = 0; k < 3; k++) {
                const v = origins[3 * i + k];
                data[4 * i + k] = v;
                if (v < lo[k]) lo[k] = v;
                if (v > hi[k]) hi[k] = v;
            }
            const r = Math.abs(sizes[3 * i]);
            data[4 * i + 3] = r;
            if (r > maxRadius) maxRadius = r;
        }
        if (![...lo, ...hi, maxRadius].every(Number.isFinite)) return null;

        // Cells a largest diameter wide, but not so many that an outlying sphere makes a huge grid.
        let cell = Math.max(2 * maxRadius, 1e-3);
        const extent = [0, 1, 2].map(k => hi[k] - lo[k]);
        const cellsFor = (size: number) => extent.reduce((n, e) => n * (Math.floor(e / size) + 1), 1);
        while (cellsFor(cell) > 4 * count + 64) cell *= 2;
        const dims = extent.map(e => Math.floor(e / cell) + 1);

        const buffer = (label: string, size: number, usage: number) => this.device.createBuffer({ label, size: Math.max(16, size), usage });
        const spheres = buffer("cap spheres", data.byteLength, BufferUsage.STORAGE | BufferUsage.COPY_DST);
        this.device.queue.writeBuffer(spheres, 0, data);
        // (COPY_SRC: read back by the GPU tests.)
        const neighbours = buffer("cap neighbours", count * NEIGHBOUR_SLOTS * 4, BufferUsage.STORAGE | BufferUsage.COPY_SRC);
        created.push(spheres, neighbours);

        const gridData = new ArrayBuffer(32);
        new Float32Array(gridData, 0, 4).set([lo[0], lo[1], lo[2], cell]);
        new Uint32Array(gridData, 16, 4).set([dims[0], dims[1], dims[2], count]);
        const grid = buffer("sphere neighbours: grid", 32, BufferUsage.UNIFORM | BufferUsage.COPY_DST);
        this.device.queue.writeBuffer(grid, 0, gridData);
        const head = buffer("sphere neighbours: cells", dims[0] * dims[1] * dims[2] * 4, BufferUsage.STORAGE);
        const next = buffer("sphere neighbours: lists", count * 4, BufferUsage.STORAGE);

        const bindGroup = this.device.createBindGroup({
            layout: this.layout,
            entries: [grid, spheres, head, next, neighbours].map((b, binding) => ({ binding, resource: { buffer: b } })),
        });
        const encoder = this.device.createCommandEncoder({ label: "sphere neighbours" });
        const pass = encoder.beginComputePass({ label: "sphere neighbours" });
        pass.setBindGroup(0, bindGroup);
        pass.setPipeline(this.link);
        pass.dispatchWorkgroups(groups);
        pass.setPipeline(this.gather);
        pass.dispatchWorkgroups(groups);
        pass.end();
        this.device.queue.submit([encoder.finish()]);
        // The scratch goes once the work submitted with it is done.
        grid.destroy();
        head.destroy();
        next.destroy();
        return { spheres, neighbours };
    }
}
