/**
 * The smooth surface's last steps on the GPU (stage 1 of the GPU smooth surface; see
 * src/.roadmaps/webgpu.md and smoothSurfaceShaders.ts): from the field the C++ makes in the Coot
 * worker (smoothSurfaceFieldFromAtoms), marching cubes (the MetaBalls kernels), the split, Newton
 * steps onto the surface with normals from the field, winding, and each vertex's atoms - the same
 * AtomSurface the C++'s smoothSurfaceFromAtoms returns, read back once at the end.
 */
import { BufferUsage, ComputeKernel, GpuScan, MapMode, createBuffer } from "../gpu";
import type { GpuMetaBalls } from "../metaballs";
import {
    COLOUR_ATOMS, EDGE_COUNT_WGSL, EDGE_FILL_WGSL, MIDPOINTS_WGSL, MIDPOINT_TOTAL_WGSL, ORIENT_WGSL, REFINE_WGSL, ROW_UNIQUE_WGSL,
    SMOOTH_WORKGROUP, SPLIT_WGSL, VERTEX_ATOMS_WGSL,
} from "./smoothSurfaceShaders";

/** The grid the field is on, as the C++ hands it over. */
export interface SmoothFieldGrid {
    nx: number;
    ny: number;
    nz: number;
    origin: readonly [number, number, number] | number[];
    spacing: number;
}

/** What the C++'s smoothSurfaceFromAtoms returns (AtomSurface in src/utils/smoothSurface.ts), and GPU times. */
export interface GpuAtomSurface {
    positions: Float32Array;
    normals: Float32Array;
    indices: Uint32Array;
    atom: Int32Array;
    other: Int32Array;
    weight: Float32Array;
    near: Int32Array;
    nearGap: Float32Array;
    timings: { contour: number; finish: number };
}

const KERNELS = {
    edgeCount: EDGE_COUNT_WGSL,
    edgeFill: EDGE_FILL_WGSL,
    rowUnique: ROW_UNIQUE_WGSL,
    midpointTotal: MIDPOINT_TOTAL_WGSL,
    midpoints: MIDPOINTS_WGSL,
    split: SPLIT_WGSL,
    refine: REFINE_WGSL,
    orient: ORIENT_WGSL,
    vertexAtoms: VERTEX_ATOMS_WGSL,
} as const;
type KernelName = keyof typeof KERNELS;

const { STORAGE, UNIFORM, COPY_SRC, COPY_DST, MAP_READ } = BufferUsage;

/** How far from a second residue's atom a vertex is still shared with it (smooth-surface.hh ownership_band). */
export const ownershipBand = (probe: number): number => Math.max(probe, 1.4);

/**
 * Atoms binned as the C++'s atom_bins_t bins them (cells of `size` from the lowest atom, atoms in
 * index order within a cell), so that the GPU visits them in the same order.
 */
export function binAtoms(atoms: Float32Array, size: number): { low: number[]; dims: number[]; start: Uint32Array; members: Uint32Array } {
    const n = atoms.length / 4;
    const low = [Infinity, Infinity, Infinity], high = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) {
        low[k] = Math.min(low[k], atoms[4 * i + k]);
        high[k] = Math.max(high[k], atoms[4 * i + k]);
    }
    const dims = [0, 1, 2].map(k => (n ? Math.floor((high[k] - low[k]) / size) + 1 : 1));
    const cellOf = (v: number, k: number) => Math.floor((v - low[k]) / size);
    const cells = dims[0] * dims[1] * dims[2];
    const start = new Uint32Array(cells + 1);
    const cellOfAtom = new Uint32Array(n);
    for (let i = 0; i < n; i++) {
        const c = (cellOf(atoms[4 * i + 2], 2) * dims[1] + cellOf(atoms[4 * i + 1], 1)) * dims[0] + cellOf(atoms[4 * i], 0);
        cellOfAtom[i] = c;
        start[c + 1]++;
    }
    for (let c = 0; c < cells; c++) start[c + 1] += start[c];
    const fill = start.slice(0, cells);
    const members = new Uint32Array(n);
    for (let i = 0; i < n; i++) members[fill[cellOfAtom[i]]++] = i;
    return { low, dims, start, members };
}

export class GpuSmoothSurface {
    private constructor(
        private readonly device: GPUDevice,
        private readonly kernels: Map<KernelName, ComputeKernel>,
        private readonly scan: GpuScan,
        private readonly marchingCubes: GpuMetaBalls,
    ) {}

    /** Compile the kernels (in parallel) on `device`, the one `marchingCubes` is on. */
    static async create(device: GPUDevice, marchingCubes: GpuMetaBalls): Promise<GpuSmoothSurface> {
        const names = Object.keys(KERNELS) as KernelName[];
        const [scan, ...compiled] = await Promise.all([
            GpuScan.create(device),
            ...names.map(name => ComputeKernel.create(device, {
                label: `smooth surface ${name}`, code: KERNELS[name], workgroupSize: name === "midpointTotal" ? 1 : SMOOTH_WORKGROUP,
            })),
        ]);
        return new GpuSmoothSurface(device, new Map(names.map((name, i) => [name, compiled[i]])), scan, marchingCubes);
    }

    /**
     * The surface of the field `input` (ready to contour: negative inside, the surface at 0, x fastest)
     * on `grid`, with each vertex's atoms among `atoms` (x, y, z, r per atom) and `residueOf`. Null if
     * there is nothing to contour.
     */
    async surfaceFromField(input: Float32Array, grid: SmoothFieldGrid, atoms: Float32Array, residueOf: Int32Array,
                           probe: number): Promise<GpuAtomSurface | null> {
        const { nx, ny, nz, spacing } = grid;
        const origin = [grid.origin[0], grid.origin[1], grid.origin[2]];
        let mark = performance.now();
        const contour = await this.marchingCubes.contourField(input, [nx, ny, nz], origin as [number, number, number], spacing);
        const contourMs = performance.now() - mark;
        const V = contour.positions.length / 3;
        const T = contour.indices.length / 3;
        if (T === 0 || atoms.length === 0) return null;
        mark = performance.now();

        // Room for every vertex: the contour's, and at most one midpoint per triangle edge.
        const N = V + 3 * T;
        const band = ownershipBand(probe);
        let rMax = 0;
        for (let i = 3; i < atoms.length; i += 4) rMax = Math.max(rMax, atoms[i]);
        const binSize = rMax + band;
        const bins = binAtoms(atoms, binSize);
        const span = Math.max(1, Math.ceil((rMax + band) / binSize));

        const params = new ArrayBuffer(6 * 16);
        const f = new Float32Array(params), u = new Uint32Array(params);
        f.set([origin[0], origin[1], origin[2], spacing], 0);
        u.set([nx, ny, nz, V], 4);
        u.set([T, atoms.length / 4, span, 0], 8);
        f.set([bins.low[0], bins.low[1], bins.low[2], binSize], 12);
        u.set([bins.dims[0], bins.dims[1], bins.dims[2], 0], 16);
        f.set([band, 0.5 * spacing, 1e-5 * spacing, rMax], 20);

        const owned: GPUBuffer[] = [];
        const make = (label: string, bytes: number, usage: number = STORAGE, data?: ArrayBufferView) => {
            const b = createBuffer(this.device, `smooth surface ${label}`, bytes, usage, data);
            owned.push(b);
            return b;
        };
        this.device.pushErrorScope("out-of-memory");
        this.device.pushErrorScope("validation");
        try {
            const P = make("params", params.byteLength, UNIFORM | COPY_DST, new Uint8Array(params));
            const field = make("field", input.byteLength, STORAGE, input);
            const positions = make("positions", N * 12, STORAGE | COPY_SRC | COPY_DST);
            this.device.queue.writeBuffer(positions, 0, contour.positions);
            const normals = make("normals", N * 12, STORAGE | COPY_SRC);
            const indices = make("indices", T * 12, STORAGE, contour.indices);
            const rowCount = make("row count", V * 4, STORAGE, new Uint32Array(V));
            const rowStart = make("row start", V * 4);
            const rowFill = make("row fill", V * 4, STORAGE, new Uint32Array(V));
            const rowHi = make("row ends", T * 12);
            const uniqueCount = make("distinct edges", V * 4);
            const midStart = make("midpoint start", V * 4);
            const counts = make("counts", 16, STORAGE | COPY_SRC, new Uint32Array(4));
            const split = make("split", T * 48, STORAGE | COPY_SRC);
            const atomBuffer = make("atoms", atoms.byteLength, STORAGE, atoms);
            const residues = make("residues", residueOf.byteLength, STORAGE, residueOf);
            const binStart = make("bin start", bins.start.byteLength, STORAGE, bins.start);
            const binMembers = make("bin members", bins.members.byteLength, STORAGE, bins.members);
            const info = make("vertex info", N * 12, STORAGE | COPY_SRC);
            const near = make("near atoms", N * 8 * COLOUR_ATOMS, STORAGE | COPY_SRC);

            const encoder = this.device.createCommandEncoder({ label: "smooth surface" });
            const run = (name: KernelName, buffers: GPUBuffer[], items: number) =>
                this.kernels.get(name).dispatch(encoder, { groups: [[P], buffers], items });
            run("edgeCount", [indices, rowCount], T);
            this.scan.encode(encoder, rowCount, rowStart, V);
            run("edgeFill", [indices, rowStart, rowFill, rowHi], T);
            run("rowUnique", [rowStart, rowCount, rowHi, uniqueCount], V);
            this.scan.encode(encoder, uniqueCount, midStart, V);
            this.kernels.get("midpointTotal").dispatch(encoder, { groups: [[P], [uniqueCount, midStart, counts]], workgroups: 1 });
            run("midpoints", [rowStart, rowCount, rowHi, midStart, positions], V);
            run("split", [indices, rowStart, rowCount, rowHi, midStart, split], T);
            run("refine", [field, counts, positions, normals], N);
            run("orient", [positions, normals, split], 4 * T);
            run("vertexAtoms", [positions, atomBuffer, residues, binStart, binMembers, counts, info, near], N);

            const staged = (source: GPUBuffer, bytes: number) => {
                const staging = make(`read ${source.label}`, bytes, MAP_READ | COPY_DST);
                encoder.copyBufferToBuffer(source, 0, staging, 0, Math.max(16, Math.ceil(bytes / 4) * 4));
                return staging;
            };
            const read = {
                counts: staged(counts, 16), positions: staged(positions, N * 12), normals: staged(normals, N * 12),
                split: staged(split, T * 48), info: staged(info, N * 12), near: staged(near, N * 8 * COLOUR_ATOMS),
            };
            this.device.queue.submit([encoder.finish()]);
            await Promise.all(Object.values(read).map(b => b.mapAsync(MapMode.READ)));
            const vertices = V + new Uint32Array(read.counts.getMappedRange())[0];
            const positionsOut = new Float32Array(read.positions.getMappedRange().slice(0, vertices * 12));
            const normalsOut = new Float32Array(read.normals.getMappedRange().slice(0, vertices * 12));
            const indicesOut = new Uint32Array(read.split.getMappedRange().slice(0, T * 48));
            const infoWords = new Uint32Array(read.info.getMappedRange().slice(0, vertices * 12));
            const nearWords = new Uint32Array(read.near.getMappedRange().slice(0, vertices * 8 * COLOUR_ATOMS));
            const infoInts = new Int32Array(infoWords.buffer), infoFloats = new Float32Array(infoWords.buffer);
            const nearInts = new Int32Array(nearWords.buffer), nearFloats = new Float32Array(nearWords.buffer);
            const atom = new Int32Array(vertices), other = new Int32Array(vertices), weight = new Float32Array(vertices);
            const nearOut = new Int32Array(COLOUR_ATOMS * vertices), nearGap = new Float32Array(COLOUR_ATOMS * vertices);
            for (let v = 0; v < vertices; v++) {
                atom[v] = infoInts[3 * v];
                other[v] = infoInts[3 * v + 1];
                weight[v] = infoFloats[3 * v + 2];
                for (let k = 0; k < COLOUR_ATOMS; k++) {
                    nearOut[COLOUR_ATOMS * v + k] = nearInts[2 * COLOUR_ATOMS * v + k];
                    nearGap[COLOUR_ATOMS * v + k] = nearFloats[2 * COLOUR_ATOMS * v + COLOUR_ATOMS + k];
                }
            }
            return {
                positions: positionsOut, normals: normalsOut, indices: indicesOut, atom, other, weight, near: nearOut, nearGap,
                timings: { contour: contourMs, finish: performance.now() - mark },
            };
        } finally {
            const validation = this.device.popErrorScope();
            const memory = this.device.popErrorScope();
            owned.forEach(b => b.destroy());
            this.scan.releaseTransient();
            const error = (await validation) ?? (await memory);
            if (error) throw new Error(`GPU smooth surface: ${error.message}`);
        }
    }
}
