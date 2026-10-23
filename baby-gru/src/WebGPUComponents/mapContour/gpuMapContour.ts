/**
 * Map contours made on the GPU and left there: the compute writes vertex, index and draw-argument
 * buffers that a WebGPU renderer on the same device draws with drawIndexedIndirect. Nothing waits
 * on the GPU: a change of level or centre is one submission, and the next frame draws its result.
 *
 * The output buffers are sized by guess. The totals are read back in the background, and if the
 * guess was too small (the draw then shows only part of the surface for a frame), the buffers
 * grow and the contour is made again.
 */
import { BufferUsage, ComputeKernel, GpuScan, GpuSpanTimer, MapMode, SpanTiming, createBuffer } from "../gpu";
import { MC_TRIANGLE_TABLE } from "../metaballs/mcTable";
import { ContourBox, MapUnitCellGrid, contourBox, inverse3 } from "./mapContourBox";
import {
    COUNT_TRIANGLES_WGSL, COUNT_VERTICES_WGSL, EMIT_TRIANGLES_WGSL, EMIT_VERTICES_WGSL, MAP_WORKGROUP, SAMPLE_WGSL, TOTALS_WGSL, chunksOf,
} from "./mapContourShaders";

const { MAP_READ, COPY_SRC, COPY_DST, INDEX, VERTEX, UNIFORM, STORAGE, INDIRECT } = BufferUsage;
const MAP_MODE_READ = MapMode.READ;

type Kernel = "sample" | "countVertices" | "countTriangles" | "emitVertices" | "emitTriangles" | "totals";

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
            ["countTriangles", COUNT_TRIANGLES_WGSL, MAP_WORKGROUP], ["emitVertices", EMIT_VERTICES_WGSL, MAP_WORKGROUP],
            ["emitTriangles", EMIT_TRIANGLES_WGSL, MAP_WORKGROUP], ["totals", TOTALS_WGSL, 1],
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
    dispatch(encoder: GPUCommandEncoder, kernel: Kernel, params: GPUBuffer, buffers: GPUBuffer[], items: number,
             timestampWrites?: GPUComputePassTimestampWrites): void {
        this.kernels.get(kernel).dispatch(encoder, { groups: [[params], buffers], items, timestampWrites });
    }

    destroy(): void {
        this.scan.destroy();
        this.table.destroy();
    }
}

/** A map's unit-cell grid, uploaded once. */
export class GpuMapGrid {
    readonly buffer: GPUBuffer;
    readonly frac: number[];
    constructor(readonly kernels: MapContourKernels, readonly grid: MapUnitCellGrid) {
        this.buffer = createBuffer(kernels.device, "map grid", grid.data.byteLength, STORAGE, grid.data);
        this.frac = inverse3(grid.orth);
    }
    destroy(): void {
        this.buffer.destroy();
    }
}

/** What a renderer needs to draw a contour: vertex buffers, and indices with their draw arguments. */
export interface GpuContourBuffers {
    position: GPUBuffer;
    normal: GPUBuffer;
    /** Triangle indices; also what the thick lines are drawn from, as each triangle's edges. */
    triangles: GPUBuffer;
    /**
     * Draw arguments: drawIndexedIndirect's for the triangles at byte 0, drawIndirect's for thick
     * lines (18 vertices per triangle) at byte 32.
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
    /** Per run of CHUNK points or cells: its count, and where it starts. */
    vertexChunkSum: GPUBuffer;
    vertexChunkOffset: GPUBuffer;
    triangleChunkSum: GPUBuffer;
    triangleChunkOffset: GPUBuffer;
}

/** The steps of a contouring, as GpuIsosurface times them: segment i of its SpanTiming is step i. */
export const CONTOUR_STEPS = ["sample", "count vertices", "count triangles", "scans", "emit vertices", "emit triangles", "totals"] as const;

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
    private output: { vertices: number; triangles: number; buffers: GpuContourBuffers } | null = null;
    private last = "";
    private reading = false;
    private destroyed = false;
    /** How many times the contour has been made, and the box last contoured: for the status line. */
    made = 0;
    lastBox: ContourBox | null = null;
    /** Triangles (kept, so drawn), as last read back; for the status line. */
    lastTriangles = 0;
    /** GPU time of each contouring and its steps (CONTOUR_STEPS), when the device can time. */
    private readonly timer: GpuSpanTimer | null;

    /** `onRemade`: the room was too small; the next update will make the contour again. */
    constructor(private readonly kernels: MapContourKernels, private readonly mapGrid: GpuMapGrid, private readonly onRemade: () => void) {
        this.device = kernels.device;
        this.params = this.device.createBuffer({ label: "map contour params", size: 192, usage: UNIFORM | COPY_DST });
        this.counts = this.device.createBuffer({ label: "map contour counts", size: 16, usage: STORAGE | COPY_SRC });
        this.countsRead = this.device.createBuffer({ label: "map contour counts read", size: 16, usage: MAP_READ | COPY_DST });
        this.drawArgs = this.device.createBuffer({ label: "map contour draw args", size: 64, usage: STORAGE | INDIRECT | COPY_SRC | COPY_DST });
        this.device.queue.writeBuffer(this.drawArgs, 0, new Uint32Array(16));
        this.timer = GpuSpanTimer.create(this.device, "map contour", CONTOUR_STEPS.length + 1);
    }

    /** The GPU time of contouring since the last call, by step (CONTOUR_STEPS); null if untimed. */
    takeTiming(): SpanTiming | null {
        return this.timer?.take() ?? null;
    }

    /** The buffers to draw, or null before the first contour. */
    get buffers(): GpuContourBuffers | null {
        return this.output?.buffers ?? null;
    }

    /** Make the contour for `request`, unless it is what was made last. Returns whether it did. */
    update(request: ContourRequest): boolean {
        if (this.destroyed) return false;
        const key = `${request.centre.join(",")}|${request.radius}|${request.level}`;
        if (key === this.last) return false;
        this.last = key;
        const box = contourBox(this.mapGrid.grid, request.centre, request.radius);
        this.lastBox = box;
        if (!box) {
            this.device.queue.writeBuffer(this.drawArgs, 0, new Uint32Array(16));
            return true;
        }
        const points = box.size[0] * box.size[1] * box.size[2];
        const cells = (box.size[0] - 1) * (box.size[1] - 1) * (box.size[2] - 1);
        const work = this.workBuffers(points, cells);
        const out = this.outputBuffers(points);
        this.writeParams(box, request, out.vertices, out.triangles);

        const { field, edgeMask, vertexOffset, keepMask, vertexChunkSum, vertexChunkOffset, triangleChunkSum, triangleChunkOffset } = work;
        const { position, normal, triangles } = out.buffers;
        const k = this.kernels;
        const encoder = this.device.createCommandEncoder({ label: "map contour" });
        // Marks at the step boundaries (CONTOUR_STEPS); the scans' own passes fall between 3 and 4.
        const mark = this.timer?.writes() ?? null;
        k.dispatch(encoder, "sample", this.params, [this.mapGrid.buffer, field], points, mark?.(0));
        // The count and emit kernels take CHUNK points or cells per thread, and only the chunks'
        // sums are scanned (see mapContourShaders).
        const pointChunks = chunksOf(points), cellChunks = chunksOf(cells);
        k.dispatch(encoder, "countVertices", this.params, [field, edgeMask, vertexChunkSum], pointChunks, mark?.(1));
        k.dispatch(encoder, "countTriangles", this.params, [field, k.table, keepMask, triangleChunkSum], cellChunks, mark?.(2, 3));
        k.scan.encode(encoder, vertexChunkSum, vertexChunkOffset, pointChunks);
        k.scan.encode(encoder, triangleChunkSum, triangleChunkOffset, cellChunks);
        k.dispatch(encoder, "emitVertices", this.params,
            [this.mapGrid.buffer, field, edgeMask, vertexChunkOffset, vertexOffset, position, normal], pointChunks, mark?.(4));
        k.dispatch(encoder, "emitTriangles", this.params,
            [field, k.table, edgeMask, vertexOffset, triangleChunkOffset, keepMask, triangles], cellChunks, mark?.(5));
        k.dispatch(encoder, "totals", this.params,
            [vertexChunkSum, vertexChunkOffset, triangleChunkSum, triangleChunkOffset, this.counts, this.drawArgs], 1, mark?.(6, 7));
        const timing = mark !== null;
        if (timing) this.timer.resolve(encoder);
        const check = !this.reading;
        if (check) encoder.copyBufferToBuffer(this.counts, 0, this.countsRead, 0, 16);
        this.device.queue.submit([encoder.finish()]);
        if (timing) this.timer.collect();
        // Freed once the commands that use them have run.
        k.scan.releaseTransient();
        this.made++;
        if (check) this.checkRoom(out.vertices, out.triangles);
        return true;
    }

    destroy(): void {
        this.destroyed = true;
        this.destroyWork();
        this.destroyOutput();
        this.params.destroy();
        this.counts.destroy();
        if (!this.reading) this.countsRead.destroy();
        this.drawArgs.destroy();
        this.timer?.destroy();
    }

    /** In the background: if the room was too small, make more and the contour again. */
    private checkRoom(vertexRoom: number, triangleRoom: number): void {
        this.reading = true;
        this.countsRead.mapAsync(MAP_MODE_READ).then(() => {
            const [vertices, triangles] = new Uint32Array(this.countsRead.getMappedRange(), 0, 2);
            this.countsRead.unmap();
            this.reading = false;
            this.lastTriangles = triangles;
            if (this.destroyed) {
                this.countsRead.destroy();
                return;
            }
            if (vertices > vertexRoom || triangles > triangleRoom) {
                this.grow(vertices, triangles);
                this.last = "";
                this.onRemade();
            }
        }).catch(() => {
            this.reading = false;
        });
    }

    private workBuffers(points: number, cells: number): WorkBuffers {
        if (!this.work || this.work.points < points || this.work.cells < cells) {
            this.destroyWork();
            const p = Math.ceil(points * 1.25), c = Math.ceil(cells * 1.25);
            const storage = (label: string, n: number) =>
                this.device.createBuffer({ label: `map contour ${label}`, size: Math.max(16, n * 4), usage: STORAGE });
            this.work = {
                points: p, cells: c,
                buffers: {
                    field: storage("field", p), edgeMask: storage("edge mask", p), vertexOffset: storage("vertex offset", p),
                    keepMask: storage("keep mask", c),
                    vertexChunkSum: storage("vertex chunk sums", chunksOf(p)), vertexChunkOffset: storage("vertex chunk offsets", chunksOf(p)),
                    triangleChunkSum: storage("triangle chunk sums", chunksOf(c)),
                    triangleChunkOffset: storage("triangle chunk offsets", chunksOf(c)),
                },
            };
        }
        return this.work.buffers;
    }

    private destroyWork(): void {
        if (this.work) Object.values(this.work.buffers).forEach(b => b.destroy());
        this.work = null;
    }

    /** Room for a fifth of the box's points as vertices, and two triangles per vertex, at first. */
    private outputBuffers(points: number): { vertices: number; triangles: number; buffers: GpuContourBuffers } {
        if (!this.output) {
            const vertices = Math.max(GpuIsosurface.vertexRoomPerPoint < 0.1 ? 16 : 16384, Math.ceil(points * GpuIsosurface.vertexRoomPerPoint));
            this.makeOutput(vertices, 2 * vertices);
        }
        return this.output;
    }

    private grow(vertices: number, triangles: number): void {
        const current = this.output;
        this.destroyOutput();
        this.makeOutput(Math.max(Math.ceil(vertices * 1.5), current?.vertices ?? 0), Math.max(Math.ceil(triangles * 1.5), current?.triangles ?? 0));
    }

    private makeOutput(vertices: number, triangles: number): void {
        const buffer = (label: string, size: number, usage: number) =>
            this.device.createBuffer({ label: `map contour ${label}`, size: Math.max(16, size), usage: STORAGE | COPY_SRC | usage });
        this.output = {
            vertices, triangles,
            buffers: {
                position: buffer("positions", vertices * 12, VERTEX),
                normal: buffer("normals", vertices * 12, VERTEX),
                triangles: buffer("triangles", triangles * 12, INDEX),
                drawArgs: this.drawArgs,
            },
        };
    }

    private destroyOutput(): void {
        if (!this.output) return;
        const { position, normal, triangles } = this.output.buffers;
        [position, normal, triangles].forEach(b => b.destroy());
        this.output = null;
    }

    private writeParams(box: ContourBox, request: ContourRequest, vertexRoom: number, triangleRoom: number): void {
        const { grid } = this.mapGrid;
        const buf = new ArrayBuffer(192);
        const i = new Int32Array(buf), u = new Uint32Array(buf), f = new Float32Array(buf);
        i.set(box.min, 0);
        u.set([...box.size, grid.isEM ? 1 : 0], 4);
        u.set([grid.nu, grid.nv, grid.nw, 0], 8);
        const o = grid.orth, r = this.mapGrid.frac;
        f.set([o[0], o[1], o[2], 0, o[3], o[4], o[5], 0, o[6], o[7], o[8], 0], 12);
        f.set([r[0], r[1], r[2], 0, r[3], r[4], r[5], 0, r[6], r[7], r[8], 0], 24);
        f.set([...request.centre, request.radius * request.radius], 36);
        f.set([request.level, request.level < 0 ? -1 : 1, 0, 0], 40);
        u.set([vertexRoom, triangleRoom, 0, 0], 44);
        this.device.queue.writeBuffer(this.params, 0, buf);
    }
}
