/**
 * MetaBalls on the GPU: the same mesh as metaballs/metaballs.cc (GenerateMeshFromPoints), made
 * with WebGPU compute.
 *
 * Every stage of the C++ is here - the scalar field, marching cubes, and the per-vertex pass that
 * gives each vertex its normal, colour and hover influences - each as one thread per grid
 * point, cell or vertex. Marching cubes is the edge-based, indexed form: one vertex per crossed
 * grid edge, shared by every triangle that uses it, so the mesh is as compact as MC.h's.
 *
 * The grid is worked through a slab of z planes at a time, so GPU memory depends on the slab, not
 * the molecule, and the output lands in ordinary typed arrays, ready for a DisplayBuffer.
 *
 * The CPU does not wait on the GPU between slabs. Each slab is one submission: its output buffers
 * are sized from an estimate (MetaBalls make close to 280 vertices per point), the offsets into
 * the whole mesh are kept on the GPU, and a few slabs are in flight while earlier ones are read
 * back. Waits cost up to 100 ms each in Firefox, which only checks for finished GPU work that
 * often. If a slab turns out bigger than its room, the whole mesh is made again with more.
 *
 *
 * Not computed: MC.h's face-accumulated normals (metaballs.cc throws them away for the
 * field-gradient ones), and vertex_owner / point_triangles, which DrawMoorhenMetaBalls does not
 * return.
 */
import { GpuScan, dispatchSize } from "./gpuScan";
import { MC_TRIANGLE_TABLE } from "./mcTable";
import {
    METABALLS_FIELD_CUTOFF, MetaBallsGrid, binPoints, boxZSpan, fieldFixedPointBits, metaballsGrid, pointIndexBoxes, slabDepth,
    slabPointRange,
} from "./metaballsGrid";
import {
    COUNT_TRIANGLES_WGSL, COUNT_VERTICES_WGSL, EMIT_TRIANGLES_WGSL, EMIT_VERTICES_WGSL, FIELD_BOXES_WGSL, FIELD_BRICK, FIELD_COLUMNS_WGSL,
    FIELD_DIRECT_WGSL, FIELD_NEAR_WGSL, FIELD_ROWS_WGSL, INFLUENCE_ENDS_WGSL, INFLUENCES_WGSL, ITEM_WORKGROUP, SMOOTH_WGSL,
    TOTALS_WGSL,
} from "./metaballsShaders";

// Spec values; the DOM typings have the WebGPU interfaces but not these globals.
const MAP_READ = 0x0001, COPY_SRC = 0x0004, COPY_DST = 0x0008, UNIFORM = 0x0040, STORAGE = 0x0080;
const MAP_MODE_READ = 0x0001;

/**
 * How many workgroups the row-sum and near-field kernels start; each loops over rows or bricks.
 * Enough to fill a large GPU, few enough that zeroing their workgroup memory at the start (which
 * WebGPU requires, and Firefox does with one thread) is not a cost.
 */
const ROW_WORKGROUPS = 4096;
const BRICK_WORKGROUPS = 16384;

/** Slabs submitted but not yet read back. */
const SLABS_IN_FLIGHT = 3;
/** Vertices per point the output room is sized for: 25% over the ~280 MetaBalls make. */
const VERTICES_PER_POINT = 375;
/** Times the mesh is made again with more room, if a slab overflows, before giving up. */
const MAX_RETRIES = 2;

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
    /**
     * Grid points per slab; GPU memory is about 25 bytes per point. Default 16M (~400 MB), and
     * never more than the device's largest storage buffer allows.
     */
    maxSlabPoints?: number;
    /**
     * Which field calculation: split (default) into box sums plus a correction from the points
     * within 3.46 A (see FIELD_BOXES_WGSL), or the plain one, every point's full term at every
     * voxel of its box, a thread per voxel. The same field to within float rounding.
     */
    splitField?: boolean;
    /**
     * Hand the mesh over as Moorhen draws it - normals reversed, each triangle (a, c, b), as the
     * worker's PickableMeshPerm conversion does - rather than as metaballs.cc makes it. Done in
     * the kernels, so there is no pass over the arrays afterwards.
     */
    pickable?: boolean;
    /** For tests: start with this fraction of the usual room for each slab, to force a retry. */
    room?: number;
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
    /** True when normals and winding are already Moorhen's (MetaBallsOptions.pickable). */
    pickable?: boolean;
    grid: MetaBallsGrid | null;
    timings: MetaBallsTimings;
}

/** Where the time went, in ms, summed over any retries. */
export interface MetaBallsTimings {
    totalMs: number;
    slabs: number;
    /** Which field calculation ran (see MetaBallsOptions.splitField). */
    field?: "split" | "plain";
    /** Times the mesh was made again because a slab outgrew its estimated room. */
    retries?: number;
    /** Grid, binning, uploads and buffer creation. */
    setupMs: number;
    /** Recording and submitting the slabs' work. */
    encodeMs?: number;
    /** Waiting for slabs' results to be ready to read: GPU time not hidden behind the CPU's. */
    waitMs?: number;
    /** Copying the slabs' results into the output arrays (and growing them if needed). */
    copyMs?: number;
    /** Before the waits were removed: the three waits per slab. */
    countWaitMs?: number;
    emitWaitMs?: number;
    readbackWaitMs?: number;
    assembleMs?: number;
    /**
     * GPU time per kernel, summed over slabs, from timestamp queries: resolves after the mesh is
     * returned, so that reading them back is not part of making it (it is one more wait, up to
     * 100 ms in Firefox). Absent when the device does not offer timestamps; undefined if they
     * could not be read. Chrome rounds each timestamp to 0.1 ms unless told otherwise.
     */
    gpuMs?: Promise<Record<string, number> | undefined>;
}

const EMPTY = (grid: MetaBallsGrid | null, totalMs: number): MetaBallsMesh => ({
    positions: new Float32Array(0), normals: new Float32Array(0), colours: new Float32Array(0),
    indices: new Uint32Array(0), influenceEnds: new Uint32Array(0), influencePoints: new Uint32Array(0),
    influenceWeights: new Float32Array(0), grid,
    timings: { totalMs, slabs: 0, setupMs: 0, encodeMs: 0, waitMs: 0, copyMs: 0 },
});

/**
 * One output array, which each slab's results are copied into straight from the mapped GPU
 * buffer - the one copy they need. It is sized up front from an estimate of the whole mesh, and
 * grows if a slab does not fit, to the size the slabs so far suggest. The result is a view of the
 * filled part, or a trimmed copy if the estimate was far too generous.
 */
class Output<T extends Float32Array | Uint32Array> {
    private data: T;
    private length = 0;
    /** `guess`: the expected final length, allocated now. */
    constructor(private readonly make: (n: number) => T, private readonly view: (b: ArrayBuffer) => T, guess: number) {
        this.data = make(Math.max(0, Math.ceil(guess)));
    }
    /** Room for `more` values; `expected` is the guess at the final total. */
    reserve(more: number, expected: number): void {
        const need = this.length + more;
        if (need <= this.data.length) return;
        const grown = this.make(Math.max(need, Math.ceil(expected), Math.ceil(this.data.length * 1.5)));
        grown.set(this.data.subarray(0, this.length));
        this.data = grown;
    }
    append(range: ArrayBuffer): void {
        if (range.byteLength === 0) return;
        const values = this.view(range);
        this.data.set(values, this.length);
        this.length += values.length;
    }
    result(): T {
        const filled = this.data.subarray(0, this.length) as T;
        return this.data.length > 1.25 * this.length + 4096 ? filled.slice() as T : filled;
    }
}

/**
 * Timestamp queries for every pass of one generate call, read once at the end. Query sets of 512
 * passes are added as they fill, so slabs can stay in flight.
 */
class PassTimer {
    private static readonly CAPACITY = 1024;
    private readonly sets: { querySet: GPUQuerySet; labels: string[] }[] = [];
    constructor(private readonly device: GPUDevice) {}
    /** Timestamp writes for one more pass. */
    writes(label: string): GPUComputePassTimestampWrites {
        let current = this.sets[this.sets.length - 1];
        if (!current || current.labels.length * 2 + 2 > PassTimer.CAPACITY) {
            current = { querySet: this.device.createQuerySet({ type: "timestamp", count: PassTimer.CAPACITY }), labels: [] };
            this.sets.push(current);
        }
        const i = current.labels.length * 2;
        current.labels.push(label);
        return { querySet: current.querySet, beginningOfPassWriteIndex: i, endOfPassWriteIndex: i + 1 };
    }
    /** GPU ms per label. Call when every pass recorded has finished; the timer is done with after. */
    async read(): Promise<Record<string, number>> {
        const totals: Record<string, number> = {};
        try {
            for (const { querySet, labels } of this.sets) {
                const count = labels.length * 2;
                if (count === 0) continue;
                const resolve = this.device.createBuffer({ size: count * 8, usage: 0x0200 /* QUERY_RESOLVE */ | COPY_SRC });
                const read = this.device.createBuffer({ size: count * 8, usage: MAP_READ | COPY_DST });
                const encoder = this.device.createCommandEncoder();
                encoder.resolveQuerySet(querySet, 0, count, resolve, 0);
                encoder.copyBufferToBuffer(resolve, 0, read, 0, count * 8);
                this.device.queue.submit([encoder.finish()]);
                await read.mapAsync(MAP_MODE_READ);
                const times = new BigUint64Array(read.getMappedRange());
                labels.forEach((label, k) => {
                    const ns = Number(times[2 * k + 1] - times[2 * k]);
                    totals[label] = (totals[label] ?? 0) + (ns > 0 ? ns / 1e6 : 0);
                });
                read.unmap();
                read.destroy();
                resolve.destroy();
            }
            return totals;
        } finally {
            this.sets.forEach(({ querySet }) => querySet.destroy());
        }
    }
}

/** One slab's results on their way back: staging buffers, and where each goes. */
interface SlabReadback {
    /** The slab's totals (vertices, triangles, influences) and the room it had for each. */
    counts: GPUBuffer;
    room: [number, number, number];
    parts: { staging: GPUBuffer; out: Output<Float32Array | Uint32Array>; bytesPer: number; of: 0 | 1 | 2 }[];
    /** Buffers to destroy once read. */
    buffers: GPUBuffer[];
    mapped: Promise<unknown>;
}

type Kernel = "fieldBoxes" | "fieldColumns" | "fieldRows" | "fieldNear" | "fieldDirect" | "countVertices" | "countTriangles" | "emitVertices" | "emitTriangles"
    | "smooth" | "influences" | "influenceEnds" | "totalsVT" | "totalsI" | "advance";

/** The first index in sorted `values` not below `x`. */
function lowerBound(values: Float32Array, x: number): number {
    let lo = 0, hi = values.length;
    while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (values[mid] < x) lo = mid + 1; else hi = mid;
    }
    return lo;
}

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
            ["fieldBoxes", FIELD_BOXES_WGSL, "main"],
            ["fieldColumns", FIELD_COLUMNS_WGSL, "main"],
            ["fieldRows", FIELD_ROWS_WGSL, "main"],
            ["fieldNear", FIELD_NEAR_WGSL, "main"],
            ["fieldDirect", FIELD_DIRECT_WGSL, "main"],
            ["countVertices", COUNT_VERTICES_WGSL, "main"],
            ["countTriangles", COUNT_TRIANGLES_WGSL, "main"],
            ["emitVertices", EMIT_VERTICES_WGSL, "main"],
            ["emitTriangles", EMIT_TRIANGLES_WGSL, "main"],
            ["smooth", SMOOTH_WGSL, "main"],
            ["influences", INFLUENCES_WGSL, "main"],
            ["influenceEnds", INFLUENCE_ENDS_WGSL, "main"],
            ["totalsVT", TOTALS_WGSL, "vertices_and_triangles"],
            ["totalsI", TOTALS_WGSL, "influences"],
            ["advance", TOTALS_WGSL, "advance"],
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
        return this.generateUnchecked(input, options);
    }

    private async generateUnchecked(input: MetaBallsInput, options: MetaBallsOptions): Promise<MetaBallsMesh> {
        const started = performance.now();
        let room = options.room ?? 1;
        let retries = 0;
        let spent = { setupMs: 0, encodeMs: 0, waitMs: 0, copyMs: 0 };
        for (;;) {
            const attempt = await this.makeMesh(input, options, room);
            const timings = attempt.timings;
            spent = {
                setupMs: spent.setupMs + timings.setupMs, encodeMs: spent.encodeMs + (timings.encodeMs ?? 0),
                waitMs: spent.waitMs + (timings.waitMs ?? 0), copyMs: spent.copyMs + (timings.copyMs ?? 0),
            };
            if (!attempt.overflow) {
                return { ...attempt.mesh, timings: { ...timings, ...spent, retries, totalMs: performance.now() - started } };
            }
            if (retries >= MAX_RETRIES) throw new Error("GPU MetaBalls: slabs kept outgrowing their estimated room");
            retries++;
            // Only slabs up to the first that overflowed were checked: allow for later ones too.
            room *= Math.max(attempt.overflow * 1.25, 1.5);
        }
    }

    /**
     * One go at the mesh, with `room` times the usual estimate of each slab's output. Returns how
     * many times too small the room was instead of a mesh, if a slab outgrew it.
     */
    private async makeMesh(input: MetaBallsInput, options: MetaBallsOptions, room: number):
        Promise<{ mesh?: MetaBallsMesh; overflow?: number; timings: MetaBallsTimings }> {
        const started = performance.now();
        const grid = metaballsGrid(input.points, options.gridSize, options.isoLevel);
        if (!grid) return { mesh: EMPTY(grid, performance.now() - started), timings: EMPTY(grid, 0).timings };

        // Validation and out-of-memory errors from everything below, so that a failure is
        // reported (and the caller can fall back to the C++) rather than a mesh made of whatever
        // the buffers held. The scopes are closed straight after the last submission, so that
        // the answer comes back with the last slabs rather than after them.
        this.device.pushErrorScope("out-of-memory");
        this.device.pushErrorScope("validation");
        let scopes: Promise<GPUError | null> | null = null;
        const closeScopes = (): Promise<GPUError | null> => {
            if (!scopes) {
                const validation = this.device.popErrorScope();
                const memory = this.device.popErrorScope();
                scopes = Promise.all([validation, memory]).then(([v, m]) => v ?? m);
            }
            return scopes;
        };
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
        // For estimating each slab's output: the points' heights, in order.
        const heights = new Float32Array(pointCount);
        for (let i = 0; i < pointCount; i++) heights[i] = input.points[4 * i + 2];
        heights.sort();

        const owned: GPUBuffer[] = [];
        const keep = (b: GPUBuffer) => { owned.push(b); return b; };
        const points = keep(this.upload("points", sortedPoints, STORAGE));
        const colours = keep(this.upload("colours", sortedColours, STORAGE));
        const pointIds = keep(this.upload("point ids", bins.order, STORAGE));
        const binStart = keep(this.upload("bin start", bins.start, STORAGE));
        const pointBoxes = pointIndexBoxes(input.points, grid, bins.order);
        const boxes = keep(this.upload("point boxes", pointBoxes, STORAGE));
        const zSpan = boxZSpan(pointBoxes);
        // Too dense for the fixed-point box sums to keep their precision (no real structure is):
        // the plain field instead.
        const fixedBits = fieldFixedPointBits(input.points, bins, grid.cell);
        const split = (options.splitField ?? true) && fixedBits >= 20;

        const largestBuffer = Math.min(this.device.limits.maxStorageBufferBindingSize, this.device.limits.maxBufferSize);
        const budget = Math.min(options.maxSlabPoints ?? 16_000_000, Math.floor(largestBuffer / 4));
        const depth = slabDepth(grid, budget);
        const slabPlanes = depth + 2;
        // Shared by every slab: the GPU runs the slabs' work in the order it was submitted.
        const field = keep(this.storage("field", slabPlanes * plane * 4, COPY_SRC | COPY_DST));
        // The last two field planes of a slab are the first two of the next.
        const carry = keep(this.storage("field carry", 2 * plane * 4, COPY_SRC | COPY_DST));
        const edgeMask = keep(this.storage("edge mask", slabPlanes * plane * 4));
        // Also the box sums' difference array, which is done with before the counting starts.
        const vertexCount = keep(this.storage("vertex count", slabPlanes * plane * 4, COPY_DST));
        const vertexOffset = keep(this.storage("vertex offset", slabPlanes * plane * 4));
        const triangleCount = keep(this.storage("triangle count", depth * cellPlane * 4));
        const triangleOffset = keep(this.storage("triangle offset", depth * cellPlane * 4));
        // The slab's totals and the mesh's so far (see TOTALS_WGSL), starting from nothing.
        const counts = keep(this.storage("counts", 32, COPY_SRC | COPY_DST));
        this.device.queue.writeBuffer(counts, 0, new Uint32Array(8));
        const params = keep(this.device.createBuffer({ label: "metaballs params", size: 36 * 4, usage: UNIFORM | COPY_DST }));

        // MetaBalls make close to 280 vertices per point, with two triangles and two influences
        // per vertex (1df7, 4dfr, 5a3h, 1ibm all within a few per cent): size for a little more.
        const vertexGuess = 300 * pointCount;
        const floats = (perVertex: number) => new Output(n => new Float32Array(n), b => new Float32Array(b), perVertex * vertexGuess);
        const uints = (perVertex: number) => new Output(n => new Uint32Array(n), b => new Uint32Array(b), perVertex * vertexGuess);
        const positionsOut = floats(3);
        const normalsOut = floats(3);
        const coloursOut = floats(4);
        const indicesOut = uints(6);
        const endsOut = uints(1);
        const inflPointsOut = uints(2);
        const inflWeightsOut = floats(2);
        const keysOut = options.withKeys ? uints(1) : null;
        this.timer = this.device.features.has("timestamp-query") ? new PassTimer(this.device) : null;
        const scanTimestamps = this.timer ? (label: string) => this.timer.writes(label) : undefined;
        const setupMs = performance.now() - started;

        let slabs = 0;
        let encodeMs = 0, waitMs = 0, copyMs = 0;
        let overflow = 0;
        const inFlight: SlabReadback[] = [];

        // Wait for the oldest slab in flight, check it fitted, and copy it into the outputs.
        const takeOldest = async (): Promise<void> => {
            const slab = inFlight.shift();
            let mark = performance.now();
            try {
                await slab.mapped;
                waitMs += performance.now() - mark;
                mark = performance.now();
                const totals = new Uint32Array(slab.counts.getMappedRange(), 0, 3);
                const [vertices, triangles, influences] = totals;
                const need = Math.max(vertices / slab.room[0], triangles / slab.room[1], influences / slab.room[2]);
                if (need > 1) overflow = Math.max(overflow, need);
                if (overflow > 0) return;
                const sizes = [vertices, triangles, influences];
                for (const part of slab.parts) {
                    const bytes = sizes[part.of] * part.bytesPer;
                    part.out.reserve(bytes / 4, 0);
                    if (bytes > 0) part.out.append(part.staging.getMappedRange(0, bytes));
                }
                copyMs += performance.now() - mark;
            } finally {
                slab.buffers.forEach(b => b.destroy());
            }
        };

        try {
            for (let zs = 0; zs < nz && overflow === 0; zs += depth) {
                const mark = performance.now();
                slabs++;
                const ze = Math.min(zs + depth, nz);
                const fieldPlanes = Math.min(ze + 1, nz - 1) - zs + 1;
                const countPlanes = Math.min(ze, nz - 1) - zs + 1;
                const cellPlanes = Math.max(0, Math.min(ze, nz - 1) - zs);
                const ownedPlanes = ze - zs;
                // The planes whose field this slab works out; the two before come from the last.
                const fieldFirst = zs > 0 ? 2 : 0;
                const fz0 = zs + fieldFirst;
                const fzCount = Math.max(0, fieldPlanes - fieldFirst);
                const [kStart, kEnd] = fzCount > 0 ? slabPointRange(bins, grid, fz0, fz0 + fzCount) : [0, 0];

                // Room for the slab's output, from the points within 0.75 A of its planes.
                const zLow = grid.min[2] + zs * grid.cell - 0.75;
                const zHigh = grid.min[2] + ze * grid.cell + 0.75;
                const near = lowerBound(heights, zHigh) - lowerBound(heights, zLow);
                const capVertices = Math.ceil((VERTICES_PER_POINT * near + 4096) * room);
                const capTriangles = 2 * capVertices;
                const capInfluences = Math.ceil(2.2 * capVertices);

                const buf = new ArrayBuffer(36 * 4);
                const fl = new Float32Array(buf);
                const u = new Uint32Array(buf);
                fl.set([grid.min[0], grid.min[1], grid.min[2], grid.cell], 0);
                u.set([nx, ny, nz], 4); fl[7] = options.isoLevel;
                fl.set([bins.origin[0], bins.origin[1], bins.origin[2], bins.size], 8);
                u.set(bins.dims, 12); fl[15] = METABALLS_FIELD_CUTOFF;
                u.set([zs, fieldPlanes, countPlanes, cellPlanes, ownedPlanes, capTriangles, capVertices, pointCount], 16);
                u.set([fz0, fzCount, fieldFirst, kStart, kEnd - kStart, zSpan], 24);
                fl[30] = 2 ** fixedBits; fl[31] = 2 ** -fixedBits;
                u.set([capInfluences, options.pickable ? 1 : 0], 32);
                // Queued behind the previous slab's work, so that still sees its own.
                this.device.queue.writeBuffer(params, 0, buf);

                const slabBuffers: GPUBuffer[] = [];
                const slabBuffer = (label: string, bytes: number) => {
                    const b = this.storage(label, Math.max(4, bytes), COPY_SRC | COPY_DST);
                    slabBuffers.push(b);
                    return b;
                };
                const positions = slabBuffer("positions", capVertices * 12);
                const keys = slabBuffer("keys", capVertices * 4);
                const normals = slabBuffer("normals", capVertices * 12);
                const vColours = slabBuffer("vertex colours", capVertices * 16);
                const inflCount = slabBuffer("influence count", capVertices * 4);
                const inflOffset = slabBuffer("influence offset", capVertices * 4);
                const indices = slabBuffer("indices", capTriangles * 12);
                const inflPoints = slabBuffer("influence points", capInfluences * 4);
                const inflWeights = slabBuffer("influence weights", capInfluences * 4);

                const encoder = this.device.createCommandEncoder({ label: "metaballs slab" });
                // 1. Field.
                if (fieldFirst > 0) encoder.copyBufferToBuffer(carry, 0, field, 0, 2 * plane * 4);
                if (fzCount > 0 && split) {
                    // Boxes: corners into the difference array, summed along y per column and
                    // then along x per row into the field; then the near points' corrections.
                    encoder.clearBuffer(vertexCount, 0, fzCount * plane * 4);
                    this.dispatch(encoder, "fieldBoxes", params, [points, boxes, vertexCount], (kEnd - kStart) * zSpan);
                    this.dispatch(encoder, "fieldColumns", params, [vertexCount], nx * fzCount);
                    this.dispatch(encoder, "fieldRows", params, [vertexCount, field], Math.min(ny * fzCount, ROW_WORKGROUPS) * ITEM_WORKGROUP);
                    const bricks = Math.ceil(nx / FIELD_BRICK) * Math.ceil(ny / FIELD_BRICK) * Math.ceil(fzCount / FIELD_BRICK);
                    this.dispatch(encoder, "fieldNear", params, [points, binStart, field], Math.min(bricks, BRICK_WORKGROUPS) * ITEM_WORKGROUP);
                } else if (fzCount > 0) {
                    this.dispatch(encoder, "fieldDirect", params, [points, binStart, field, boxes], fzCount * plane);
                }
                if (ze < nz) encoder.copyBufferToBuffer(field, depth * plane * 4, carry, 0, 2 * plane * 4);
                // 2. Crossings and triangle counts, their offsets and totals.
                this.dispatch(encoder, "countVertices", params, [field, edgeMask, vertexCount], countPlanes * plane);
                if (cellPlanes > 0) {
                    this.dispatch(encoder, "countTriangles", params, [field, this.table, triangleCount], cellPlanes * cellPlane);
                }
                this.scan.encode(encoder, vertexCount, vertexOffset, countPlanes * plane, 0, scanTimestamps);
                if (cellPlanes > 0) this.scan.encode(encoder, triangleCount, triangleOffset, cellPlanes * cellPlane, 0, scanTimestamps);
                this.dispatchTotals(encoder, "totalsVT", params, {
                    0: vertexCount, 1: vertexOffset, 2: triangleCount, 3: triangleOffset, 6: counts,
                });
                // 3. Vertices, triangles, normals and colours; influences, and their ends.
                encoder.clearBuffer(inflCount, 0, capVertices * 4);
                this.dispatch(encoder, "emitVertices", params, [field, edgeMask, vertexOffset, positions, keys], ownedPlanes * plane);
                if (cellPlanes > 0) {
                    this.dispatch(encoder, "emitTriangles", params,
                        [field, this.table, edgeMask, vertexOffset, triangleOffset, indices, counts], cellPlanes * cellPlane);
                }
                this.dispatch(encoder, "smooth", params, [points, colours, binStart, positions, normals, vColours, inflCount, counts], capVertices);
                this.scan.encode(encoder, inflCount, inflOffset, capVertices, 0, scanTimestamps);
                this.dispatchTotals(encoder, "totalsI", params, { 4: inflCount, 5: inflOffset, 6: counts });
                this.dispatch(encoder, "influences", params,
                    [points, pointIds, binStart, positions, inflOffset, inflCount, inflPoints, inflWeights], capVertices);
                this.dispatch(encoder, "influenceEnds", params, [inflOffset, inflCount, counts], capVertices);
                // 4. Copy out (the room, not knowing yet how much is used), then move the mesh's
                // offsets on past this slab.
                const staged = (source: GPUBuffer, bytes: number) => {
                    const staging = this.device.createBuffer({ size: Math.max(4, bytes), usage: MAP_READ | COPY_DST });
                    slabBuffers.push(staging);
                    encoder.copyBufferToBuffer(source, 0, staging, 0, Math.max(4, bytes));
                    return staging;
                };
                const countsStaging = staged(counts, 16);
                const parts: SlabReadback["parts"] = [
                    { staging: staged(positions, capVertices * 12), out: positionsOut, bytesPer: 12, of: 0 },
                    { staging: staged(normals, capVertices * 12), out: normalsOut, bytesPer: 12, of: 0 },
                    { staging: staged(vColours, capVertices * 16), out: coloursOut, bytesPer: 16, of: 0 },
                    { staging: staged(inflCount, capVertices * 4), out: endsOut, bytesPer: 4, of: 0 },
                    { staging: staged(indices, capTriangles * 12), out: indicesOut, bytesPer: 12, of: 1 },
                    { staging: staged(inflPoints, capInfluences * 4), out: inflPointsOut, bytesPer: 4, of: 2 },
                    { staging: staged(inflWeights, capInfluences * 4), out: inflWeightsOut, bytesPer: 4, of: 2 },
                ];
                if (keysOut) parts.push({ staging: staged(keys, capVertices * 4), out: keysOut, bytesPer: 4, of: 0 });
                this.dispatchTotals(encoder, "advance", params, { 6: counts });
                this.device.queue.submit([encoder.finish()]);
                inFlight.push({
                    counts: countsStaging,
                    room: [capVertices, capTriangles, capInfluences],
                    parts,
                    buffers: slabBuffers,
                    mapped: Promise.all([countsStaging, ...parts.map(p => p.staging)].map(b => b.mapAsync(MAP_MODE_READ))),
                });
                encodeMs += performance.now() - mark;
                if (inFlight.length >= SLABS_IN_FLIGHT) await takeOldest();
            }
            closeScopes();
            while (inFlight.length > 0 && overflow === 0) await takeOldest();
        } finally {
            closeScopes();
            // After an overflow or an error: let what is in flight finish before freeing it all.
            while (inFlight.length > 0) {
                const slab = inFlight.shift();
                await slab.mapped.catch(() => undefined);
                slab.buffers.forEach(b => b.destroy());
            }
            owned.forEach(b => b.destroy());
            this.scan.releaseTransient();
        }

        const error = await closeScopes();
        // Read the kernel times in the background. If a slab's commands were invalid, their
        // queries were never written, and resolving them has been seen to hang: give up after 2 s.
        const gpuMs = this.timer
            ? Promise.race([this.timer.read(), new Promise<undefined>(done => setTimeout(() => done(undefined), 2000))])
            : undefined;
        this.timer = null;
        if (error) throw new Error(`GPU MetaBalls: ${error.message}`);
        const timings: MetaBallsTimings = {
            totalMs: performance.now() - started, slabs, field: split ? "split" : "plain",
            setupMs, encodeMs, waitMs, copyMs, gpuMs,
        };
        if (overflow > 0) return { overflow, timings };
        const mark = performance.now();
        const mesh: MetaBallsMesh = {
            positions: positionsOut.result(),
            normals: normalsOut.result(),
            colours: coloursOut.result(),
            indices: indicesOut.result(),
            influenceEnds: endsOut.result(),
            influencePoints: inflPointsOut.result(),
            influenceWeights: inflWeightsOut.result(),
            keys: keysOut?.result(),
            pickable: options.pickable ?? false,
            grid,
            timings,
        };
        timings.copyMs += performance.now() - mark;
        return { mesh, timings };
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
    private dispatchTotals(encoder: GPUCommandEncoder, kernel: "totalsVT" | "totalsI" | "advance", params: GPUBuffer,
                           buffers: Record<number, GPUBuffer>): void {
        const pipeline = this.pipelines.get(kernel);
        const pass = encoder.beginComputePass({ label: `metaballs ${kernel}` });
        pass.setPipeline(pipeline);
        // advance uses no parameters, so its layout has nothing in group 0.
        if (kernel !== "advance") {
            pass.setBindGroup(0, this.device.createBindGroup({
                layout: pipeline.getBindGroupLayout(0),
                entries: [{ binding: 0, resource: { buffer: params } }],
            }));
        }
        pass.setBindGroup(1, this.device.createBindGroup({
            layout: pipeline.getBindGroupLayout(1),
            entries: Object.entries(buffers).map(([binding, buffer]) => ({ binding: Number(binding), resource: { buffer } })),
        }));
        pass.dispatchWorkgroups(1);
        pass.end();
    }
}
