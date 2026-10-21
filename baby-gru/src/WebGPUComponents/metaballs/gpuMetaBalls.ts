/**
 * MetaBalls on the GPU: the same mesh as metaballs/metaballs.cc (GenerateMeshFromPoints), made
 * with WebGPU compute.
 *
 * Every stage of the C++ is here - the scalar field, marching cubes, and the per-vertex pass that
 * gives each vertex its normal, colour and hover influences - each as one thread per grid
 * point, cell or vertex. Marching cubes is the edge-based, indexed form: one vertex per crossed
 * grid edge, shared by every triangle that uses it, so the mesh is as compact as MC.h's.
 *
 * The grid is worked through a slab of z planes at a time, and each slab's results are read
 * back before the next starts. GPU memory therefore depends on the slab, not the molecule, and
 * the output lands in ordinary typed arrays, ready for a DisplayBuffer.
 *
 * Not computed: MC.h's face-accumulated normals (metaballs.cc throws them away for the
 * field-gradient ones), and vertex_owner / point_triangles, which DrawMoorhenMetaBalls does not
 * return.
 */
import { GpuScan, dispatchSize } from "./gpuScan";
import { MC_TRIANGLE_TABLE } from "./mcTable";
import { METABALLS_FIELD_CUTOFF, MetaBallsGrid, binPoints, metaballsGrid, pointIndexBoxes, slabDepth } from "./metaballsGrid";
import {
    COUNT_TRIANGLES_WGSL, COUNT_VERTICES_WGSL, EMIT_TRIANGLES_WGSL, EMIT_VERTICES_WGSL, FIELD_BRICK, FIELD_DIRECT_WGSL, FIELD_WGSL,
    INFLUENCES_WGSL, ITEM_WORKGROUP, SMOOTH_WGSL, TOTALS_WGSL,
} from "./metaballsShaders";

// Spec values; the DOM typings have the WebGPU interfaces but not these globals.
const MAP_READ = 0x0001, COPY_SRC = 0x0004, COPY_DST = 0x0008, UNIFORM = 0x0040, STORAGE = 0x0080;
const MAP_MODE_READ = 0x0001;

export interface MetaBallsInput {
    /** x, y, z, radius per point. */
    points: Float32Array;
    /** r, g, b, a per point. */
    colours: Float32Array;
}

export interface MetaBallsOptions {
    gridSize: number;
    isoLevel: number;
    /** Also return each vertex's grid edge, for comparing with the C++ mesh. */
    withKeys?: boolean;
    /** Grid points per slab; bounds GPU memory at about 16 bytes per point. Default 8M. */
    maxSlabPoints?: number;
    /**
     * Which field kernel: the tiled one (default), which shares each brick's atoms through
     * workgroup memory, or the direct one, a thread per point. Same field either way, summed in a
     * different order.
     */
    tiledField?: boolean;
}

/** What GenerateMeshFromPoints returns, in typed arrays, minus the parts nothing reads. */
export interface MetaBallsMesh {
    positions: Float32Array;
    /** The field-gradient normals, as metaballs.cc leaves them - pointing into the surface. */
    normals: Float32Array;
    colours: Float32Array;
    indices: Uint32Array;
    /** CSR, as DrawMoorhenMetaBalls packs it: the END offset of each vertex's influences. */
    influenceEnds: Uint32Array;
    influencePoints: Uint32Array;
    influenceWeights: Float32Array;
    /** Grid edge of each vertex: ((z * ny + y) * nx + x) * 3 + axis. Only when asked for. */
    keys?: Uint32Array;
    grid: MetaBallsGrid | null;
    timings: MetaBallsTimings;
}

/**
 * Where the time went, in ms. The waits are from submitting work to having its answer back, so
 * they hold the GPU's own time plus each round trip's latency; there are three per slab.
 */
export interface MetaBallsTimings {
    totalMs: number;
    slabs: number;
    /** Grid, binning, uploads and buffer creation. */
    setupMs: number;
    /** Field, crossings, triangle counts and their scans, until the totals are back. */
    countWaitMs: number;
    /** Vertices, triangles, normals and colours, until the influence total is back. */
    emitWaitMs: number;
    /** Influences, then copying the slab back and mapping it. */
    readbackWaitMs: number;
    /** JavaScript putting the slabs together into the final arrays. */
    assembleMs: number;
    /**
     * GPU time per kernel, summed over slabs, from timestamp queries. Absent when the device
     * does not offer them. Chrome rounds each timestamp to 0.1 ms unless told otherwise.
     */
    gpuMs?: Record<string, number>;
}

const EMPTY = (grid: MetaBallsGrid | null, totalMs: number): MetaBallsMesh => ({
    positions: new Float32Array(0), normals: new Float32Array(0), colours: new Float32Array(0),
    indices: new Uint32Array(0), influenceEnds: new Uint32Array(0), influencePoints: new Uint32Array(0),
    influenceWeights: new Float32Array(0), grid,
    timings: { totalMs, slabs: 0, setupMs: 0, countWaitMs: 0, emitWaitMs: 0, readbackWaitMs: 0, assembleMs: 0 },
});

/**
 * Slab results, kept as they arrive and joined once at the end: one copy, into an array of the
 * exact size, or none at all when there was only one slab.
 */
class Chunks<T extends Float32Array | Uint32Array> {
    private readonly parts: T[] = [];
    private length = 0;
    constructor(private readonly make: (n: number) => T) {}
    append(chunk: T): void {
        this.parts.push(chunk);
        this.length += chunk.length;
    }
    result(): T {
        if (this.parts.length === 1) return this.parts[0];
        const out = this.make(this.length);
        let at = 0;
        for (const part of this.parts) { out.set(part, at); at += part.length; }
        return out;
    }
}

/** Timestamp queries for every pass of one generate call, read back once at the end. */
class PassTimer {
    private static readonly CAPACITY = 1024;
    private readonly querySet: GPUQuerySet;
    private readonly labels: string[] = [];
    constructor(private readonly device: GPUDevice) {
        this.querySet = device.createQuerySet({ type: "timestamp", count: PassTimer.CAPACITY });
    }
    /** Timestamp writes for one more pass, or undefined once the query set is full. */
    writes(label: string): GPUComputePassTimestampWrites | undefined {
        const i = this.labels.length * 2;
        if (i + 2 > PassTimer.CAPACITY) return undefined;
        this.labels.push(label);
        return { querySet: this.querySet, beginningOfPassWriteIndex: i, endOfPassWriteIndex: i + 1 };
    }
    /** GPU ms per label. */
    async read(): Promise<Record<string, number>> {
        const count = this.labels.length * 2;
        const totals: Record<string, number> = {};
        if (count === 0) { this.querySet.destroy(); return totals; }
        const resolve = this.device.createBuffer({ size: count * 8, usage: 0x0200 /* QUERY_RESOLVE */ | COPY_SRC });
        const read = this.device.createBuffer({ size: count * 8, usage: MAP_READ | COPY_DST });
        const encoder = this.device.createCommandEncoder();
        encoder.resolveQuerySet(this.querySet, 0, count, resolve, 0);
        encoder.copyBufferToBuffer(resolve, 0, read, 0, count * 8);
        this.device.queue.submit([encoder.finish()]);
        await read.mapAsync(MAP_MODE_READ);
        const times = new BigUint64Array(read.getMappedRange());
        this.labels.forEach((label, k) => {
            const ns = Number(times[2 * k + 1] - times[2 * k]);
            totals[label] = (totals[label] ?? 0) + (ns > 0 ? ns / 1e6 : 0);
        });
        read.unmap();
        read.destroy();
        resolve.destroy();
        this.querySet.destroy();
        return totals;
    }
}

type Kernel = "field" | "fieldDirect" | "countVertices" | "countTriangles" | "emitVertices" | "emitTriangles"
    | "smooth" | "influences" | "totalsVT" | "totalsI";

export class GpuMetaBalls {
    private readonly device: GPUDevice;
    private readonly scan: GpuScan;
    private readonly pipelines = new Map<Kernel, GPUComputePipeline>();
    private readonly table: GPUBuffer;
    /** Set for the duration of a generate call when the device can time passes. */
    private timer: PassTimer | null = null;

    /** How long compiling the pipelines took, ms: paid once, in create. */
    readonly compileMs: number;

    /**
     * Compile every pipeline before returning. Created synchronously, pipelines are often only
     * really compiled at their first dispatch, which put a one-off cost inside the first mesh.
     */
    static async create(device: GPUDevice): Promise<GpuMetaBalls> {
        const started = performance.now();
        const kernels: [Kernel, string, string][] = [
            ["field", FIELD_WGSL, "main"],
            ["fieldDirect", FIELD_DIRECT_WGSL, "main"],
            ["countVertices", COUNT_VERTICES_WGSL, "main"],
            ["countTriangles", COUNT_TRIANGLES_WGSL, "main"],
            ["emitVertices", EMIT_VERTICES_WGSL, "main"],
            ["emitTriangles", EMIT_TRIANGLES_WGSL, "main"],
            ["smooth", SMOOTH_WGSL, "main"],
            ["influences", INFLUENCES_WGSL, "main"],
            ["totalsVT", TOTALS_WGSL, "vertices_and_triangles"],
            ["totalsI", TOTALS_WGSL, "influences"],
        ];
        const [scan, ...compiled] = await Promise.all([
            GpuScan.create(device),
            ...kernels.map(([kernel, code, entryPoint]) => device.createComputePipelineAsync({
                label: `metaballs ${kernel}`,
                layout: "auto",
                compute: { module: device.createShaderModule({ label: `metaballs ${kernel}`, code }), entryPoint },
            })),
        ]);
        const pipelines = new Map<Kernel, GPUComputePipeline>();
        kernels.forEach(([kernel], i) => pipelines.set(kernel, compiled[i] as GPUComputePipeline));
        return new GpuMetaBalls(device, scan as GpuScan, pipelines, performance.now() - started);
    }

    private constructor(device: GPUDevice, scan: GpuScan, pipelines: Map<Kernel, GPUComputePipeline>, compileMs: number) {
        this.device = device;
        this.scan = scan;
        pipelines.forEach((pipeline, kernel) => this.pipelines.set(kernel, pipeline));
        this.compileMs = compileMs;
        this.table = this.upload("mc table", MC_TRIANGLE_TABLE, STORAGE);
    }

    destroy(): void {
        this.scan.destroy();
        this.table.destroy();
    }

    /**
     * Make the mesh. Rejects if WebGPU reported a validation or out-of-memory error on the way,
     * rather than returning whatever the buffers held, so a caller can fall back to the C++.
     */
    async generate(input: MetaBallsInput, options: MetaBallsOptions): Promise<MetaBallsMesh> {
        this.device.pushErrorScope("out-of-memory");
        this.device.pushErrorScope("validation");
        let mesh: MetaBallsMesh | null = null;
        let thrown: unknown = null;
        try {
            mesh = await this.generateUnchecked(input, options);
        } catch (err) {
            thrown = err;
        }
        const validation = await this.device.popErrorScope();
        const memory = await this.device.popErrorScope();
        if (thrown) throw thrown;
        const error = validation ?? memory;
        if (error) throw new Error(`GPU MetaBalls: ${error.message}`);
        return mesh;
    }

    private async generateUnchecked(input: MetaBallsInput, options: MetaBallsOptions): Promise<MetaBallsMesh> {
        const started = performance.now();
        const grid = metaballsGrid(input.points, options.gridSize, options.isoLevel);
        if (!grid) return EMPTY(grid, performance.now() - started);
        const [nx, ny, nz] = grid.n;
        const plane = nx * ny;
        const cellPlane = (nx - 1) * (ny - 1);
        const pointCount = input.points.length / 4;

        // Bins about half the field's reach: a voxel then visits 3-4 bins a side.
        const bins = binPoints(input.points, grid, (METABALLS_FIELD_CUTOFF + grid.cell) / 2);
        const sortedPoints = new Float32Array(pointCount * 4);
        const sortedColours = new Float32Array(pointCount * 4);
        bins.order.forEach((original, k) => {
            sortedPoints.set(input.points.subarray(4 * original, 4 * original + 4), 4 * k);
            sortedColours.set(input.colours.subarray(4 * original, 4 * original + 4), 4 * k);
        });

        const owned: GPUBuffer[] = [];
        const keep = (b: GPUBuffer) => { owned.push(b); return b; };
        const points = keep(this.upload("points", sortedPoints, STORAGE));
        const colours = keep(this.upload("colours", sortedColours, STORAGE));
        const pointIds = keep(this.upload("point ids", bins.order, STORAGE));
        const binStart = keep(this.upload("bin start", bins.start, STORAGE));
        const boxes = keep(this.upload("point boxes", pointIndexBoxes(input.points, grid, bins.order), STORAGE));

        const depth = slabDepth(grid, options.maxSlabPoints ?? 8_000_000);
        const slabPlanes = depth + 2;
        const field = keep(this.storage("field", slabPlanes * plane * 4));
        const edgeMask = keep(this.storage("edge mask", slabPlanes * plane * 4));
        const vertexCount = keep(this.storage("vertex count", slabPlanes * plane * 4));
        const vertexOffset = keep(this.storage("vertex offset", slabPlanes * plane * 4));
        const triangleCount = keep(this.storage("triangle count", depth * cellPlane * 4));
        const triangleOffset = keep(this.storage("triangle offset", depth * cellPlane * 4));
        const totals = keep(this.storage("totals", 16, COPY_SRC));
        const totalsRead = keep(this.device.createBuffer({ label: "totals readback", size: 16, usage: MAP_READ | COPY_DST }));
        const params = keep(this.device.createBuffer({ label: "metaballs params", size: 24 * 4, usage: UNIFORM | COPY_DST }));
        const setupMs = performance.now() - started;

        const positionsOut = new Chunks(n => new Float32Array(n));
        const normalsOut = new Chunks(n => new Float32Array(n));
        const coloursOut = new Chunks(n => new Float32Array(n));
        const indicesOut = new Chunks(n => new Uint32Array(n));
        const endsOut = new Chunks(n => new Uint32Array(n));
        const inflPointsOut = new Chunks(n => new Uint32Array(n));
        const inflWeightsOut = new Chunks(n => new Float32Array(n));
        const keysOut = options.withKeys ? new Chunks(n => new Uint32Array(n)) : null;
        this.timer = this.device.features.has("timestamp-query") ? new PassTimer(this.device) : null;
        const scanTimestamps = this.timer ? (label: string) => this.timer.writes(label) : undefined;

        let vertexBase = 0;
        let influenceBase = 0;
        let slabs = 0;
        let countWaitMs = 0, emitWaitMs = 0, readbackWaitMs = 0, assembleMs = 0;
        let mark = performance.now();
        const since = () => { const now = performance.now(); const d = now - mark; mark = now; return d; };
        try {
            for (let zs = 0; zs < nz; zs += depth) {
                slabs++;
                const ze = Math.min(zs + depth, nz);
                const fieldPlanes = Math.min(ze + 1, nz - 1) - zs + 1;
                const countPlanes = Math.min(ze, nz - 1) - zs + 1;
                const cellPlanes = Math.max(0, Math.min(ze, nz - 1) - zs);
                const ownedPlanes = ze - zs;
                const writeParams = (vertexCountForSlab: number) => {
                    const buf = new ArrayBuffer(24 * 4);
                    const fl = new Float32Array(buf);
                    const u = new Uint32Array(buf);
                    fl.set([grid.min[0], grid.min[1], grid.min[2], grid.cell], 0);
                    u.set([nx, ny, nz], 4); fl[7] = options.isoLevel;
                    fl.set([bins.origin[0], bins.origin[1], bins.origin[2], bins.size], 8);
                    u.set(bins.dims, 12); fl[15] = METABALLS_FIELD_CUTOFF;
                    u.set([zs, fieldPlanes, countPlanes, cellPlanes, ownedPlanes, vertexBase, vertexCountForSlab, pointCount], 16);
                    this.device.queue.writeBuffer(params, 0, buf);
                };
                writeParams(0);

                // 1. Field, crossings, triangle counts, offsets; read back how many of each.
                let encoder = this.device.createCommandEncoder({ label: "metaballs slab count" });
                if (options.tiledField ?? true) {
                    // One workgroup per brick of the slab's field planes.
                    const bricks = Math.ceil(nx / FIELD_BRICK) * Math.ceil(ny / FIELD_BRICK) * Math.ceil(fieldPlanes / FIELD_BRICK);
                    this.dispatch(encoder, "field", params, [points, binStart, field, boxes], bricks * ITEM_WORKGROUP);
                } else {
                    this.dispatch(encoder, "fieldDirect", params, [points, binStart, field, boxes], fieldPlanes * plane);
                }
                this.dispatch(encoder, "countVertices", params, [field, edgeMask, vertexCount], countPlanes * plane);
                if (cellPlanes > 0) {
                    this.dispatch(encoder, "countTriangles", params, [field, this.table, triangleCount], cellPlanes * cellPlane);
                }
                this.scan.encode(encoder, vertexCount, vertexOffset, countPlanes * plane, 0, scanTimestamps);
                if (cellPlanes > 0) this.scan.encode(encoder, triangleCount, triangleOffset, cellPlanes * cellPlane, 0, scanTimestamps);
                this.dispatchTotals(encoder, "totalsVT", params, {
                    0: vertexCount, 1: vertexOffset, 2: triangleCount, 3: triangleOffset, 6: totals,
                });
                encoder.copyBufferToBuffer(totals, 0, totalsRead, 0, 16);
                since();
                this.device.queue.submit([encoder.finish()]);
                const [vertexTotal, triangleTotal] = await this.readU32(totalsRead, 2);
                countWaitMs += since();
                this.scan.releaseTransient();
                if (vertexTotal === 0 && triangleTotal === 0) continue;

                // 2. Vertices, triangles, normals and colours; read back the influence total.
                writeParams(vertexTotal);
                const slab: GPUBuffer[] = [];
                const slabBuffer = (label: string, bytes: number) => { const b = this.storage(label, Math.max(4, bytes), COPY_SRC); slab.push(b); return b; };
                const positions = slabBuffer("positions", vertexTotal * 12);
                const keys = slabBuffer("keys", vertexTotal * 4);
                const normals = slabBuffer("normals", vertexTotal * 12);
                const vColours = slabBuffer("vertex colours", vertexTotal * 16);
                const inflCount = slabBuffer("influence count", vertexTotal * 4);
                const inflOffset = slabBuffer("influence offset", vertexTotal * 4);
                const indices = slabBuffer("indices", triangleTotal * 12);
                try {
                    encoder = this.device.createCommandEncoder({ label: "metaballs slab emit" });
                    if (vertexTotal > 0) {
                        this.dispatch(encoder, "emitVertices", params, [field, edgeMask, vertexOffset, positions, keys], ownedPlanes * plane);
                    }
                    if (triangleTotal > 0) {
                        this.dispatch(encoder, "emitTriangles", params,
                            [field, this.table, edgeMask, vertexOffset, triangleOffset, indices], cellPlanes * cellPlane);
                    }
                    if (vertexTotal > 0) {
                        this.dispatch(encoder, "smooth", params, [points, colours, binStart, positions, normals, vColours, inflCount], vertexTotal);
                        this.scan.encode(encoder, inflCount, inflOffset, vertexTotal, 0, scanTimestamps);
                        this.dispatchTotals(encoder, "totalsI", params, { 4: inflCount, 5: inflOffset, 6: totals });
                    }
                    encoder.copyBufferToBuffer(totals, 0, totalsRead, 0, 16);
                    since();
                    this.device.queue.submit([encoder.finish()]);
                    const influenceTotal = vertexTotal > 0 ? (await this.readU32(totalsRead, 3))[2] : 0;
                    emitWaitMs += since();
                    this.scan.releaseTransient();

                    // 3. Influences, then read the slab back.
                    const inflPoints = slabBuffer("influence points", influenceTotal * 4);
                    const inflWeights = slabBuffer("influence weights", influenceTotal * 4);
                    encoder = this.device.createCommandEncoder({ label: "metaballs slab influences" });
                    if (vertexTotal > 0 && influenceTotal > 0) {
                        this.dispatch(encoder, "influences", params,
                            [points, pointIds, binStart, positions, inflOffset, inflCount, inflPoints, inflWeights], vertexTotal);
                    }
                    const reads = [
                        this.readback(encoder, positions, vertexTotal * 12),
                        this.readback(encoder, normals, vertexTotal * 12),
                        this.readback(encoder, vColours, vertexTotal * 16),
                        this.readback(encoder, indices, triangleTotal * 12),
                        this.readback(encoder, inflCount, vertexTotal * 4),
                        this.readback(encoder, inflOffset, vertexTotal * 4),
                        this.readback(encoder, inflPoints, influenceTotal * 4),
                        this.readback(encoder, inflWeights, influenceTotal * 4),
                        keysOut ? this.readback(encoder, keys, vertexTotal * 4) : null,
                    ];
                    since();
                    this.device.queue.submit([encoder.finish()]);
                    const [pos, nrm, col, idx, cnt, off, ip, iw, ky] = await Promise.all(reads.map(r => r ? r() : Promise.resolve(null)));
                    readbackWaitMs += since();

                    positionsOut.append(new Float32Array(pos));
                    normalsOut.append(new Float32Array(nrm));
                    coloursOut.append(new Float32Array(col));
                    indicesOut.append(new Uint32Array(idx));
                    // DrawMoorhenMetaBalls keeps the END of each vertex's run, counting from the
                    // start of the whole mesh.
                    const counts = new Uint32Array(cnt);
                    const offsets = new Uint32Array(off);
                    const ends = new Uint32Array(vertexTotal);
                    for (let i = 0; i < vertexTotal; i++) ends[i] = influenceBase + offsets[i] + counts[i];
                    endsOut.append(ends);
                    inflPointsOut.append(new Uint32Array(ip));
                    inflWeightsOut.append(new Float32Array(iw));
                    if (keysOut && ky) keysOut.append(new Uint32Array(ky));
                    vertexBase += vertexTotal;
                    influenceBase += influenceTotal;
                    assembleMs += since();
                } finally {
                    slab.forEach(b => b.destroy());
                }
            }
        } finally {
            owned.forEach(b => b.destroy());
            this.scan.releaseTransient();
        }

        since();
        const result = {
            positions: positionsOut.result(),
            normals: normalsOut.result(),
            colours: coloursOut.result(),
            indices: indicesOut.result(),
            influenceEnds: endsOut.result(),
            influencePoints: inflPointsOut.result(),
            influenceWeights: inflWeightsOut.result(),
            keys: keysOut?.result(),
            grid,
        };
        assembleMs += since();
        const gpuMs = this.timer ? await this.timer.read() : undefined;
        this.timer = null;
        return {
            ...result,
            timings: { totalMs: performance.now() - started, slabs, setupMs, countWaitMs, emitWaitMs, readbackWaitMs, assembleMs, gpuMs },
        };
    }

    private upload(label: string, data: Float32Array | Uint32Array, usage: number): GPUBuffer {
        const buffer = this.device.createBuffer({ label, size: Math.max(16, data.byteLength), usage: usage | COPY_DST });
        if (data.byteLength > 0) this.device.queue.writeBuffer(buffer, 0, data.buffer, data.byteOffset, data.byteLength);
        return buffer;
    }

    private storage(label: string, bytes: number, extra = 0): GPUBuffer {
        return this.device.createBuffer({ label, size: Math.max(16, Math.ceil(bytes / 4) * 4), usage: STORAGE | extra });
    }

    private dispatch(encoder: GPUCommandEncoder, kernel: Kernel, params: GPUBuffer, buffers: GPUBuffer[], items: number): void {
        if (items <= 0) return;
        const pipeline = this.pipelines.get(kernel);
        const pass = encoder.beginComputePass({ label: `metaballs ${kernel}`, timestampWrites: this.timer?.writes(kernel) });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, this.device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [{ binding: 0, resource: { buffer: params } }],
        }));
        pass.setBindGroup(1, this.device.createBindGroup({
            layout: pipeline.getBindGroupLayout(1),
            entries: buffers.map((buffer, binding) => ({ binding, resource: { buffer } })),
        }));
        const [gx, gy] = dispatchSize(Math.ceil(items / ITEM_WORKGROUP));
        pass.dispatchWorkgroups(gx, gy);
        pass.end();
    }

    /** The one-thread totals kernels, whose bindings are sparse. */
    private dispatchTotals(encoder: GPUCommandEncoder, kernel: "totalsVT" | "totalsI", params: GPUBuffer,
                           buffers: Record<number, GPUBuffer>): void {
        const pipeline = this.pipelines.get(kernel);
        const pass = encoder.beginComputePass({ label: `metaballs ${kernel}` });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, this.device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [{ binding: 0, resource: { buffer: params } }],
        }));
        pass.setBindGroup(1, this.device.createBindGroup({
            layout: pipeline.getBindGroupLayout(1),
            entries: Object.entries(buffers).map(([binding, buffer]) => ({ binding: Number(binding), resource: { buffer } })),
        }));
        pass.dispatchWorkgroups(1);
        pass.end();
    }

    private async readU32(buffer: GPUBuffer, count: number): Promise<number[]> {
        await buffer.mapAsync(MAP_MODE_READ);
        const values = Array.from(new Uint32Array(buffer.getMappedRange(), 0, count));
        buffer.unmap();
        return values;
    }

    /** Copy `bytes` of `source` into a staging buffer; the returned function maps and returns them. */
    private readback(encoder: GPUCommandEncoder, source: GPUBuffer, bytes: number): () => Promise<ArrayBuffer> {
        if (bytes === 0) return () => Promise.resolve(new ArrayBuffer(0));
        const staging = this.device.createBuffer({ size: bytes, usage: MAP_READ | COPY_DST });
        encoder.copyBufferToBuffer(source, 0, staging, 0, bytes);
        return async () => {
            await staging.mapAsync(MAP_MODE_READ);
            const copy = staging.getMappedRange().slice(0);
            staging.unmap();
            staging.destroy();
            return copy;
        };
    }
}
