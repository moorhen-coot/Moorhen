/**
 * Map contours made on the GPU and left there: the compute writes vertex, index and draw-argument
 * buffers that a WebGPU renderer on the same device draws with drawIndexedIndirect. Nothing waits
 * on the GPU: a change of level or centre is one submission, and the next frame draws its result.
 *
 * The output buffers are sized by guess. The totals are read back in the background, and if the
 * guess was too small (the draw then shows only part of the surface for a frame), the buffers
 * grow and the contour is made again.
 *
 * A contour can be too big for the GPU: a large radius, or a large EM map. Then it is made at the
 * largest radius that fits, and says so (`limitedRadius`, `limitReason`): a box no bigger than
 * the device allows in one buffer, nor than a budget (`mapContourLimits`). What is asked for is
 * made inside error scopes, so running out of memory is caught too, and the radius is brought down
 * until it fits. Nothing reaches the device's uncaptured errors, which would end WebGPU for the
 * whole view. Only if nothing fits at all does the isosurface give up (`tooBig`), and Coot
 * contours the maps.
 */
import { BufferUsage, ComputeKernel, GpuScan, MapMode, createBuffer, withErrorScope } from "../gpu";
import { MC_TRIANGLE_TABLE } from "../metaballs/mcTable";
import { formatCount } from "../rendererReport";
import {
    ContourBox, MapUnitCellGrid, WORK_BYTES_PER_BOX_POINT, contourBox, emRangeOf, formatBytes, inverse3, largestRadiusWithin, roomFor,
} from "./mapContourBox";
import {
    COUNT_LINES_WGSL, COUNT_TRIANGLES_WGSL, COUNT_VERTICES_WGSL, EMIT_LINES_WGSL, EMIT_TRIANGLES_WGSL, EMIT_VERTICES_WGSL, MAP_WORKGROUP,
    SAMPLE_WGSL, TOTALS_WGSL, chunksOf,
} from "./mapContourShaders";

const { MAP_READ, COPY_SRC, COPY_DST, INDEX, VERTEX, UNIFORM, STORAGE, INDIRECT } = BufferUsage;
const MAP_MODE_READ = MapMode.READ;

type Kernel = "sample" | "countVertices" | "countTriangles" | "countLines" | "emitVertices" | "emitTriangles" | "emitLines" | "totals";

/** The compiled kernels for one device, shared by every map contoured on it. */
export class MapContourKernels {
    private constructor(
        readonly device: GPUDevice,
        readonly scan: GpuScan,
        readonly table: GPUBuffer,
        private readonly kernels: Map<Kernel, ComputeKernel>,
    ) {}

    static async create(device: GPUDevice): Promise<MapContourKernels> {
        const sources: [Kernel, string, number][] = [
            ["sample", SAMPLE_WGSL, MAP_WORKGROUP], ["countVertices", COUNT_VERTICES_WGSL, MAP_WORKGROUP],
            ["countTriangles", COUNT_TRIANGLES_WGSL, MAP_WORKGROUP], ["countLines", COUNT_LINES_WGSL, MAP_WORKGROUP],
            ["emitVertices", EMIT_VERTICES_WGSL, MAP_WORKGROUP], ["emitTriangles", EMIT_TRIANGLES_WGSL, MAP_WORKGROUP],
            ["emitLines", EMIT_LINES_WGSL, MAP_WORKGROUP], ["totals", TOTALS_WGSL, 1],
        ];
        const [scan, ...compiled] = await Promise.all([
            GpuScan.create(device),
            ...sources.map(([kernel, code, workgroupSize]) =>
                ComputeKernel.create(device, { label: `map contour ${kernel}`, code, workgroupSize })),
        ]);
        const kernels = new Map<Kernel, ComputeKernel>();
        sources.forEach(([kernel], i) => kernels.set(kernel, compiled[i] as ComputeKernel));
        const table = createBuffer(device, "mc table", MC_TRIANGLE_TABLE.byteLength, STORAGE, MC_TRIANGLE_TABLE);
        return new MapContourKernels(device, scan as GpuScan, table, kernels);
    }

    /**
     * One pass of `kernel` over `items` threads, with the parameters at group 0 and `buffers` at
     * group 1, in binding order.
     */
    dispatch(encoder: GPUCommandEncoder, kernel: Kernel, params: GPUBuffer, buffers: GPUBuffer[], items: number): void {
        this.kernels.get(kernel).dispatch(encoder, { groups: [[params], buffers], items });
    }

    destroy(): void {
        this.scan.destroy();
        this.table.destroy();
    }
}

/**
 * How big a contour may be. `bindingBytes`: the largest buffer, in place of the device's (for
 * tests). `budgetBytes`: the most one contour's work buffers may take - beyond it a contour is
 * slow to make (about 5 ns a box point on an M1) and memory goes on one map; 1 GB is a box of
 * about 50M points, 370 a side.
 */
export const mapContourLimits: { bindingBytes: number | null; budgetBytes: number } = { bindingBytes: null, budgetBytes: 1e9 };

/** The most box points a contour may have: its per-point arrays in one buffer each, within the budget. */
export function maxBoxPoints(device: GPUDevice): number {
    return Math.min(Math.floor(largestBuffer(device) / 4), Math.floor(mapContourLimits.budgetBytes / WORK_BYTES_PER_BOX_POINT));
}

/** The contour's parameters (Params in mapContourShaders.ts): 14 vectors of 16 bytes. */
const PARAMS_BYTES = 224;

/** Below this the GPU is not worth asking: Coot contours the maps instead. */
const SMALLEST_RADIUS = 2;

/**
 * The largest buffer a contour may ask for: every one of them is bound as storage somewhere, so
 * the smaller of the device's largest buffer and largest storage binding.
 */
export function largestBuffer(device: GPUDevice): number {
    return mapContourLimits.bindingBytes ?? Math.min(device.limits.maxBufferSize, device.limits.maxStorageBufferBindingSize);
}

/** A map's unit-cell grid, uploaded once. */
export class GpuMapGrid {
    readonly buffer: GPUBuffer;
    readonly frac: number[];
    constructor(readonly kernels: MapContourKernels, readonly grid: MapUnitCellGrid) {
        this.buffer = createBuffer(kernels.device, "map grid", grid.data.byteLength, STORAGE, grid.data);
        this.frac = inverse3(grid.orth);
    }

    /**
     * Upload `grid`, or reject saying why the GPU cannot hold it: bigger than its largest buffer,
     * or out of memory. Nothing reaches the device's uncaptured errors.
     */
    static async create(kernels: MapContourKernels, grid: MapUnitCellGrid): Promise<GpuMapGrid> {
        const limit = largestBuffer(kernels.device);
        if (grid.data.byteLength > limit) {
            throw new Error(`its grid (${grid.nu}×${grid.nv}×${grid.nw}, ${formatBytes(grid.data.byteLength)}) is larger than ` +
                `this GPU's largest buffer (${formatBytes(limit)})`);
        }
        let made: GpuMapGrid | null = null;
        const error = await withErrorScope(kernels.device, () => { made = new GpuMapGrid(kernels, grid); });
        if (error) {
            (made as GpuMapGrid | null)?.destroy();
            throw new Error(`the GPU could not hold its grid (${formatBytes(grid.data.byteLength)}): ${error.message}`);
        }
        return made as GpuMapGrid;
    }
    destroy(): void {
        this.buffer.destroy();
    }
}

/** What a renderer needs to draw a contour: vertex buffers, and indices with their draw arguments. */
export interface GpuContourBuffers {
    position: GPUBuffer;
    normal: GPUBuffer;
    /** Triangle indices. */
    triangles: GPUBuffer;
    /** The triangles' edges, each once, as pairs of vertex indices: what the line styles draw. */
    lines: GPUBuffer;
    /**
     * Draw arguments: drawIndexedIndirect's for the triangles at byte 0, drawIndirect's for thick
     * lines (6 vertices per line) at byte 32.
     */
    drawArgs: GPUBuffer;
}

export interface ContourRequest {
    centre: [number, number, number];
    radius: number;
    level: number;
}

/** Per contouring, kept between contourings and grown as needed. */
interface WorkBuffers {
    /** The map less the level, per box point. */
    field: GPUBuffer;
    /** Per box point: which of its three edges carry a vertex. */
    edgeMask: GPUBuffer;
    /** Per box point: its first vertex. */
    vertexOffset: GPUBuffer;
    /** Per cell: which of its triangles are kept. */
    keepMask: GPUBuffer;
    /** Per cell: which edges of its kept triangles it draws as lines. */
    lineMask: GPUBuffer;
    /** Per run of CHUNK points or cells: its count, and where it starts. */
    vertexChunkSum: GPUBuffer;
    vertexChunkOffset: GPUBuffer;
    triangleChunkSum: GPUBuffer;
    triangleChunkOffset: GPUBuffer;
    lineChunkSum: GPUBuffer;
    lineChunkOffset: GPUBuffer;
}

/** One contour level of one map, remade when the request changes. */
export class GpuIsosurface {
    /** First guess at the room needed: vertices per box point. Tests make it tiny to force growth. */
    static vertexRoomPerPoint = 0.2;

    private readonly device: GPUDevice;
    private readonly params: GPUBuffer;
    private readonly counts: GPUBuffer;
    private readonly countsRead: GPUBuffer;
    private readonly drawArgs: GPUBuffer;
    private work: { points: number; cells: number; buffers: WorkBuffers } | null = null;
    private output: { vertices: number; triangles: number; lines: number; buffers: GpuContourBuffers } | null = null;
    private last = "";
    /** Counts requests, so that an error found after the next request has begun is not blamed on it. */
    private requestNo = 0;
    private reading = false;
    private destroyed = false;
    /**
     * How many times the contour has been made, and the box last contoured (the layer's status and
     * the renderer report's map walk).
     */
    made = 0;
    lastBox: ContourBox | null = null;
    /** Triangles (kept, so drawn) and the lines of their edges, as last read back (the report). */
    lastTriangles = 0;
    lastLines = 0;
    /**
     * The radius last contoured, if smaller than asked for, and why: the box at the radius asked
     * for was too big for the GPU's buffers, the budget, or its memory.
     */
    limitedRadius: number | null = null;
    limitReason: string | null = null;
    /**
     * Why not even a small radius could be contoured here, or null. Nothing is drawn while it is
     * set; the map layer then gives the maps to Coot.
     */
    tooBig: string | null = null;
    /** The largest radius the GPU's memory has taken, after it refused a larger one. */
    private radiusCap = Infinity;
    /** The radius of the contour last asked of the GPU. */
    private contouredRadius = 0;

    /** `onRemade`: the room was too small; the next update will make the contour again. */
    constructor(private readonly kernels: MapContourKernels, private readonly mapGrid: GpuMapGrid, private readonly onRemade: () => void) {
        this.device = kernels.device;
        this.params = this.device.createBuffer({ label: "map contour params", size: PARAMS_BYTES, usage: UNIFORM | COPY_DST });
        this.counts = this.device.createBuffer({ label: "map contour counts", size: 16, usage: STORAGE | COPY_SRC });
        this.countsRead = this.device.createBuffer({ label: "map contour counts read", size: 16, usage: MAP_READ | COPY_DST });
        this.drawArgs = this.device.createBuffer({ label: "map contour draw args", size: 64, usage: STORAGE | INDIRECT | COPY_SRC | COPY_DST });
        this.device.queue.writeBuffer(this.drawArgs, 0, new Uint32Array(16));
    }

    /** The buffers to draw, or null before the first contour. */
    get buffers(): GpuContourBuffers | null {
        return this.output?.buffers ?? null;
    }

    /** Make the contour for `request`, unless it is what was made last. Returns whether it did. */
    update(request: ContourRequest): boolean {
        if (this.destroyed || this.tooBig) return false;
        const key = `${request.centre.join(",")}|${request.radius}|${request.level}|${this.radiusCap}`;
        if (key === this.last) return false;
        this.last = key;
        const requestNo = ++this.requestNo;

        // The largest radius, up to the one asked for, whose box fits.
        const grid = this.mapGrid.grid;
        const maxPoints = maxBoxPoints(this.device);
        const capped = Math.min(request.radius, this.radiusCap);
        const radius = largestRadiusWithin(grid, request.centre, capped, maxPoints);
        if (radius < request.radius) {
            this.limitedRadius = radius;
            if (radius < capped) {
                const full = contourBox(grid, request.centre, capped);
                const points = full ? full.size[0] * full.size[1] * full.size[2] : 0;
                this.limitReason = `at ${+capped.toFixed(1)} Å its box would be ${full?.size.join("×")} grid points ` +
                    `(${formatBytes(points * WORK_BYTES_PER_BOX_POINT)} to contour), more than ${formatBytes(maxPoints * WORK_BYTES_PER_BOX_POINT)} allowed`;
            }
        } else {
            this.limitedRadius = null;
            this.limitReason = null;
        }
        if (radius < Math.min(SMALLEST_RADIUS, request.radius)) {
            this.refuse(this.limitReason ?? "the GPU could not hold even a small contour");
            return true;
        }
        this.contouredRadius = radius;
        const box = contourBox(grid, request.centre, radius);
        this.lastBox = box;
        if (!box) {
            this.device.queue.writeBuffer(this.drawArgs, 0, new Uint32Array(16));
            return true;
        }
        const points = box.size[0] * box.size[1] * box.size[2];
        const cells = (box.size[0] - 1) * (box.size[1] - 1) * (box.size[2] - 1);
        let refused = false;
        withErrorScope(this.device, () => {
            const work = this.workBuffers(points, cells);
            const out = work ? this.outputBuffers(points) : null;
            if (!work || !out) {
                refused = true;
                return;
            }
            this.contour(box, { ...request, radius }, points, cells, work, out);
        }).then(error => {
            if (error && requestNo === this.requestNo) this.shrink(radius, error.message);
        }, err => { if (requestNo === this.requestNo) this.shrink(radius, String(err)); });
        if (refused) this.shrink(radius, `a box of ${box.size.join("×")} grid points is more than this GPU's largest buffer holds`);
        return true;
    }

    /**
     * The GPU could not make the contour at `radius` (out of memory, or more triangles than a
     * buffer holds): free what was made for it, and try again at a radius with about half the box.
     */
    private shrink(radius: number, why: string): void {
        if (this.destroyed || this.tooBig) return;
        this.destroyWork();
        this.destroyOutput();
        this.device.queue.writeBuffer(this.drawArgs, 0, new Uint32Array(16));
        const next = radius * 0.8;
        if (next < SMALLEST_RADIUS) {
            this.refuse(why);
            return;
        }
        this.radiusCap = Math.min(this.radiusCap, next);
        this.limitReason = `at ${+radius.toFixed(1)} Å ${why}`;
        this.last = "";
        this.onRemade();
    }

    /** Encode and submit the passes that make the contour; inside update's error scopes. */
    private contour(box: ContourBox, request: ContourRequest, points: number, cells: number, work: WorkBuffers,
                    out: { vertices: number; triangles: number; lines: number; buffers: GpuContourBuffers }): void {
        this.writeParams(box, request, out.vertices, out.triangles, out.lines);

        const {
            field, edgeMask, vertexOffset, keepMask, lineMask, vertexChunkSum, vertexChunkOffset, triangleChunkSum, triangleChunkOffset,
            lineChunkSum, lineChunkOffset,
        } = work;
        const { position, normal, triangles, lines } = out.buffers;
        const k = this.kernels;
        const encoder = this.device.createCommandEncoder({ label: "map contour" });
        k.dispatch(encoder, "sample", this.params, [this.mapGrid.buffer, field], points);
        // The count and emit kernels take CHUNK points or cells per thread, and only the chunks'
        // sums are scanned (see mapContourShaders).
        const pointChunks = chunksOf(points), cellChunks = chunksOf(cells);
        k.dispatch(encoder, "countVertices", this.params, [field, edgeMask, vertexChunkSum], pointChunks);
        k.dispatch(encoder, "countTriangles", this.params, [field, k.table, keepMask, triangleChunkSum], cellChunks);
        // After all the cells' keepMasks: a cell looks at the ones below it.
        k.dispatch(encoder, "countLines", this.params, [field, k.table, keepMask, lineMask, lineChunkSum], cellChunks);
        k.scan.encode(encoder, vertexChunkSum, vertexChunkOffset, pointChunks);
        k.scan.encode(encoder, triangleChunkSum, triangleChunkOffset, cellChunks);
        k.scan.encode(encoder, lineChunkSum, lineChunkOffset, cellChunks);
        k.dispatch(encoder, "emitVertices", this.params,
            [this.mapGrid.buffer, field, edgeMask, vertexChunkOffset, vertexOffset, position, normal], pointChunks);
        k.dispatch(encoder, "emitTriangles", this.params,
            [field, k.table, edgeMask, vertexOffset, triangleChunkOffset, keepMask, triangles], cellChunks);
        k.dispatch(encoder, "emitLines", this.params,
            [field, k.table, edgeMask, vertexOffset, lineChunkOffset, lineMask, lines], cellChunks);
        k.dispatch(encoder, "totals", this.params,
            [vertexChunkSum, vertexChunkOffset, triangleChunkSum, triangleChunkOffset, lineChunkSum, lineChunkOffset, this.counts, this.drawArgs],
            1);
        const check = !this.reading;
        if (check) encoder.copyBufferToBuffer(this.counts, 0, this.countsRead, 0, 16);
        this.device.queue.submit([encoder.finish()]);
        // Freed once the commands that use them have run.
        k.scan.releaseTransient();
        this.made++;
        if (check) this.checkRoom(out.vertices, out.triangles, out.lines);
    }

    /** Not even a small contour can be made here: free everything, draw nothing, and say why. */
    private refuse(why: string): void {
        if (this.destroyed || this.tooBig) return;
        this.tooBig = why;
        this.destroyWork();
        this.destroyOutput();
        this.device.queue.writeBuffer(this.drawArgs, 0, new Uint32Array(16));
        this.onRemade();
    }

    destroy(): void {
        this.destroyed = true;
        this.destroyWork();
        this.destroyOutput();
        this.params.destroy();
        this.counts.destroy();
        if (!this.reading) this.countsRead.destroy();
        this.drawArgs.destroy();
    }

    /** In the background: if the room was too small, make more and the contour again. */
    private checkRoom(vertexRoom: number, triangleRoom: number, lineRoom: number): void {
        this.reading = true;
        this.countsRead.mapAsync(MAP_MODE_READ).then(() => {
            const [vertices, triangles, lines] = new Uint32Array(this.countsRead.getMappedRange(), 0, 3);
            this.countsRead.unmap();
            this.reading = false;
            this.lastTriangles = triangles;
            this.lastLines = lines;
            if (this.destroyed) {
                this.countsRead.destroy();
                return;
            }
            if (this.tooBig) return;
            if (vertices > vertexRoom || triangles > triangleRoom || lines > lineRoom) {
                const key = this.last, requestNo = this.requestNo;
                const radius = this.contouredRadius;
                withErrorScope(this.device, () => this.grow(vertices, triangles, lines)).then(error => {
                    if (error && requestNo === this.requestNo) {
                        this.shrink(radius, `the GPU could not hold ${formatCount(triangles)} triangles: ${error.message}`);
                    }
                }, err => { if (requestNo === this.requestNo) this.shrink(radius, String(err)); });
                if (this.tooBig || this.last !== key) return;
                // Made again on the next update: unless the request has changed meanwhile.
                if (this.last === key) this.last = "";
                this.onRemade();
            }
        }).catch(() => {
            this.reading = false;
        });
    }

    /** The work buffers for a box of `points` and `cells`, or null if they would be too big. */
    private workBuffers(points: number, cells: number): WorkBuffers | null {
        if (!this.work || this.work.points < points || this.work.cells < cells) {
            this.destroyWork();
            const limit = largestBuffer(this.device);
            const p = roomFor(points, 4, limit, 1.25), c = roomFor(cells, 4, limit, 1.25);
            if (p === null || c === null) return null;
            const storage = (label: string, n: number) =>
                this.device.createBuffer({ label: `map contour ${label}`, size: Math.max(16, n * 4), usage: STORAGE });
            this.work = {
                points: p, cells: c,
                buffers: {
                    field: storage("field", p), edgeMask: storage("edge mask", p), vertexOffset: storage("vertex offset", p),
                    keepMask: storage("keep mask", c), lineMask: storage("line mask", c),
                    vertexChunkSum: storage("vertex chunk sums", chunksOf(p)), vertexChunkOffset: storage("vertex chunk offsets", chunksOf(p)),
                    triangleChunkSum: storage("triangle chunk sums", chunksOf(c)),
                    triangleChunkOffset: storage("triangle chunk offsets", chunksOf(c)),
                    lineChunkSum: storage("line chunk sums", chunksOf(c)), lineChunkOffset: storage("line chunk offsets", chunksOf(c)),
                },
            };
        }
        return this.work.buffers;
    }

    private destroyWork(): void {
        if (this.work) Object.values(this.work.buffers).forEach(b => b.destroy());
        this.work = null;
    }

    /**
     * Room for a fifth of the box's points as vertices, two triangles per vertex and three lines
     * per vertex (a closed surface has about 2 triangles and 3 edges per vertex), at first.
     */
    private outputBuffers(points: number): { vertices: number; triangles: number; lines: number; buffers: GpuContourBuffers } {
        if (!this.output) {
            // No bigger than a buffer can be: if the surface needs more, checkRoom finds out.
            const limit = largestBuffer(this.device);
            const vertices = Math.min(Math.floor(limit / 12),
                Math.max(GpuIsosurface.vertexRoomPerPoint < 0.1 ? 16 : 16384, Math.ceil(points * GpuIsosurface.vertexRoomPerPoint)));
            this.makeOutput(vertices, Math.min(2 * vertices, Math.floor(limit / 12)), Math.min(3 * vertices, Math.floor(limit / 8)));
        }
        return this.output;
    }

    /** Room for at least this much, with half again to spare where a buffer can hold it; a smaller radius if it cannot. */
    private grow(vertices: number, triangles: number, lines: number): void {
        const current = this.output;
        const limit = largestBuffer(this.device);
        const more = (needed: number, bytesEach: number, now: number | undefined) =>
            roomFor(Math.max(needed, now ?? 0), bytesEach, limit, needed > (now ?? 0) ? 1.5 : 1);
        const v = more(vertices, 12, current?.vertices), t = more(triangles, 12, current?.triangles), l = more(lines, 8, current?.lines);
        if (v === null || t === null || l === null) {
            this.shrink(this.contouredRadius, `its contour has ${formatCount(vertices)} vertices, ${formatCount(triangles)} triangles and ` +
                `${formatCount(lines)} lines, more than this GPU's largest buffer (${formatBytes(limit)}) holds`);
            return;
        }
        this.destroyOutput();
        this.makeOutput(v, t, l);
    }

    private makeOutput(vertices: number, triangles: number, lines: number): void {
        const buffer = (label: string, size: number, usage: number) =>
            this.device.createBuffer({ label: `map contour ${label}`, size: Math.max(16, size), usage: STORAGE | COPY_SRC | usage });
        this.output = {
            vertices, triangles, lines,
            buffers: {
                position: buffer("positions", vertices * 12, VERTEX),
                normal: buffer("normals", vertices * 12, VERTEX),
                triangles: buffer("triangles", triangles * 12, INDEX),
                lines: buffer("lines", lines * 8, 0),
                drawArgs: this.drawArgs,
            },
        };
    }

    private destroyOutput(): void {
        if (!this.output) return;
        const { position, normal, triangles, lines } = this.output.buffers;
        [position, normal, triangles, lines].forEach(b => b.destroy());
        this.output = null;
    }

    private writeParams(box: ContourBox, request: ContourRequest, vertexRoom: number, triangleRoom: number, lineRoom: number): void {
        const { grid } = this.mapGrid;
        const buf = new ArrayBuffer(PARAMS_BYTES);
        const i = new Int32Array(buf), u = new Uint32Array(buf), f = new Float32Array(buf);
        i.set(box.min, 0);
        u.set([...box.size, grid.isEM ? 1 : 0], 4);
        u.set([grid.nu, grid.nv, grid.nw, 0], 8);
        const o = grid.orth, r = this.mapGrid.frac;
        f.set([o[0], o[1], o[2], 0, o[3], o[4], o[5], 0, o[6], o[7], o[8], 0], 12);
        f.set([r[0], r[1], r[2], 0, r[3], r[4], r[5], 0, r[6], r[7], r[8], 0], 24);
        f.set([...request.centre, request.radius * request.radius], 36);
        f.set([request.level, request.level < 0 ? -1 : 1, 0, 0], 40);
        u.set([vertexRoom, triangleRoom, lineRoom, 0], 44);
        const em = emRangeOf(grid), n = [grid.nu, grid.nv, grid.nw];
        f.set([0, 1, 2].map(a => em.min[a] / n[a]), 48);
        f.set([0, 1, 2].map(a => em.max[a] / n[a]), 52);
        this.device.queue.writeBuffer(this.params, 0, buf);
    }
}
