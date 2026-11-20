/**
 * The smooth surface's last steps on the GPU (stage 1 of the GPU smooth surface; see
 * src/.roadmaps/webgpu.md and smoothSurfaceShaders.ts): from the field the C++ makes in the Coot
 * worker (smoothSurfaceFieldFromAtoms), marching cubes (the MetaBalls kernels), the split, Newton
 * steps onto the surface with normals from the field, winding, and each vertex's atoms - the same
 * AtomSurface the C++'s smoothSurfaceFromAtoms returns, read back once at the end.
 */
import { BufferUsage, ComputeKernel, GpuScan, MapMode, createBuffer, readBuffer } from "../gpu";
import type { GpuMetaBalls } from "../metaballs";
import { SLICE_MASK, runSliced, yieldToBrowser } from "../../utils/timeSlicing";
import { type SurfaceField, makeSurfaceField } from "./surfaceField";
import {
    BLUR_WEIGHT_WGSL, BLUR_WGSL, CANDIDATE_TOTAL_WGSL, CAP_WGSL, COLOUR_ATOMS, CONTOUR_INPUT_WGSL, DISTANCE_WGSL, EDGE_COUNT_WGSL,
    EDGE_FILL_WGSL, FEATURE_INIT_WGSL, FEATURE_PASS_WGSL, HEAL_WGSL, HISTOGRAM_WGSL, INTERIOR_WGSL, LEVEL_BINS, LEVEL_WGSL, MAX_LINE,
    MIDPOINTS_WGSL, MIDPOINT_TOTAL_WGSL, OCCUPANCY_WGSL, OPENING_WGSL, ORIENT_WGSL, REFINE_WGSL, ROW_UNIQUE_WGSL, SEED_CANDIDATES_WGSL,
    SEED_FIND_WGSL, SEED_VALID_WGSL, SMOOTH_WORKGROUP, SPLIT_WGSL, VERTEX_ATOMS_WGSL, WEIGHT_INIT_WGSL, WEIGHT_SCALE_WGSL,
    ATOM_CIRCLES_WGSL, ATOM_CIRCLE_FILL_WGSL, ATOM_CIRCLE_SORT_WGSL, CIRCLE_COUNT_WGSL, CIRCLE_EMIT_WGSL, CIRCLE_KEEP_WGSL,
    EXPO_TOTALS_WGSL, MARK_ATOMS_WGSL, NEIGHBOUR_COUNT_WGSL, NEIGHBOUR_FILL_WGSL, PAIR_COUNT_WGSL, PAIR_FILL_WGSL, START_TOTAL_WGSL,
} from "./smoothSurfaceShaders";

/** The grid the field is on, as the C++ hands it over. */
export interface SmoothFieldGrid {
    nx: number;
    ny: number;
    nz: number;
    origin: readonly [number, number, number] | number[];
    spacing: number;
}

/**
 * The C++'s field up to the opening, unblurred (smoothSurfaceUnblurredFieldFromAtoms, stage 2's
 * hand-off): positive inside; `changed` 255 where the opening changed it (null if nothing wants it);
 * `interior` the points inside, `clamp` the field's range.
 */
export interface SmoothUnblurredField extends SmoothFieldGrid {
    field: Float32Array;
    changed: Uint8Array | null;
    interior: number;
    clamp: number;
}

/**
 * The C++'s grid and exposed SAS (smoothSurfaceExposureFromAtoms; smooth-surface.hh exposure_t), the
 * hand-off for stages 4 to 1.
 */
export interface SmoothExposure extends SmoothFieldGrid {
    clamp: number;
    sas: Float32Array;
    exposed: Uint8Array;
    neighbourStart: Int32Array;
    neighbourIds: Int32Array;
    circleStart: Int32Array;
    circleIds: Int32Array;
    atomCircleStart: Int32Array;
    atomCircleIds: Int32Array;
    other: Int32Array;
    arcStart: Int32Array;
    circles: Float32Array;
    arcs: Float32Array;
}

/**
 * The exposed SAS packed for the GPU (packExposure, or exposureOnGpu): the grid, the atom bins, and the
 * three buffers stages 4 and 3 read, with where each integer table starts (`offsets`) and where the arcs
 * start among the floats (`arcsAt`).
 */
export interface PackedExposure extends SmoothFieldGrid {
    clamp: number;
    atomCount: number;
    binSize: number;
    binLow: number[];
    binDims: number[];
    offsets: number[];
    arcsAt: number;
    sas: GPUBuffer;
    table: GPUBuffer;
    floats: GPUBuffer;
}

/**
 * The atom bins stages 5 to 3 share, as the C++'s atom_bins_t has them for the neighbours: cells of the
 * largest SAS radius plus the farthest any search reaches (the window, clamp + spacing, a voxel's diagonal).
 */
export function exposureBins(sas: Float32Array, spacing: number, clamp: number) {
    let rMax = 0;
    for (let a = 3; a < sas.length; a += 4) rMax = Math.max(rMax, sas[a]);
    const binSize = rMax + Math.max(3 * spacing, clamp + spacing, Math.sqrt(3) * spacing);
    return { rMax, binSize, bins: binAtoms(sas, binSize) };
}

/**
 * The grid the smooth surface is made on, as smooth-surface.cc make_setup sizes it: the atoms' box
 * padded by the largest radius, the probe, three blur sigmas and three spacings; the spacing raised by
 * 15% at a time until the grid has at most 24M points. `atoms`: x, y, z, van der Waals radius per atom
 * (float32, as the C++ is given them, so the grid is the C++'s to the last bit).
 */
export function smoothGrid(atoms: Float32Array, probe: number, spacing: number, sigma: number, openRadius: number):
    SmoothFieldGrid & { clamp: number } {
    let rMax = 0;
    const low = [Infinity, Infinity, Infinity], high = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < atoms.length; i += 4) {
        rMax = Math.max(rMax, atoms[i + 3]);
        for (let k = 0; k < 3; k++) { low[k] = Math.min(low[k], atoms[i + k]); high[k] = Math.max(high[k], atoms[i + k]); }
    }
    let h = spacing, pad = 0, nx = 0, ny = 0, nz = 0;
    for (;;) {
        pad = rMax + probe + 3 * sigma + 3 * h;
        nx = Math.ceil((high[0] - low[0] + 2 * pad) / h) + 1;
        ny = Math.ceil((high[1] - low[1] + 2 * pad) / h) + 1;
        nz = Math.ceil((high[2] - low[2] + 2 * pad) / h) + 1;
        if (nx * ny * nz <= 24_000_000) break;
        h *= 1.15;
    }
    const clamp = Math.max(3 * sigma, openRadius > 0 ? openRadius + 2 * h : 0) + 2 * h;
    return { nx, ny, nz, origin: [low[0] - pad, low[1] - pad, low[2] - pad], spacing: h, clamp };
}

/** The blur's options, as smoothSurfaceSetting has them. */
export interface SmoothBlurOptions {
    sigma: number;
    maxShift: number;
    openUncapped: boolean;
    healBlur: number;
}

/** What the field needs beyond the blur's options: the probe and the opening's radius. */
export interface SmoothFieldOptions extends SmoothBlurOptions {
    probe: number;
    openRadius: number;
    /**
     * Shaded per pixel from the field (surfaceField.ts): the field kept and handed over with the
     * surface, and the contour not split - the split only hides the triangles from per-vertex normals.
     */
    fieldShading?: boolean;
}

/** The Gaussian's weights for `sigma` grid points, as gaussian_blur_3d makes them (normalised in double). */
export function gaussianKernel(sigma: number): Float32Array {
    const radius = Math.max(1, Math.ceil(3 * sigma));
    const weights = new Float64Array(2 * radius + 1);
    let total = 0;
    for (let i = -radius; i <= radius; i++) {
        weights[i + radius] = Math.exp(-(i * i) / (2 * sigma * sigma));
        total += weights[i + radius];
    }
    return Float32Array.from(weights, w => w / total);
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
    /**
     * The field it was contoured from, kept on the GPU for per-pixel shading (surfaceField.ts), when
     * asked for (fieldShading); the holder releases it (releaseSurfaceField).
     */
    field?: SurfaceField;
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
    weightInit: WEIGHT_INIT_WGSL,
    blur: BLUR_WGSL,
    blurWeight: BLUR_WEIGHT_WGSL,
    weightScale: WEIGHT_SCALE_WGSL,
    cap: CAP_WGSL,
    heal: HEAL_WGSL,
    histogram: HISTOGRAM_WGSL,
    level: LEVEL_WGSL,
    contourInput: CONTOUR_INPUT_WGSL,
    occupancy: OCCUPANCY_WGSL,
    seedCandidates: SEED_CANDIDATES_WGSL,
    candidateTotal: CANDIDATE_TOTAL_WGSL,
    seedFind: SEED_FIND_WGSL,
    seedValid: SEED_VALID_WGSL,
    featureInit: FEATURE_INIT_WGSL,
    featurePass: FEATURE_PASS_WGSL,
    distance: DISTANCE_WGSL,
    opening: OPENING_WGSL,
    interior: INTERIOR_WGSL,
    neighbourCount: NEIGHBOUR_COUNT_WGSL,
    startTotal: START_TOTAL_WGSL,
    neighbourFill: NEIGHBOUR_FILL_WGSL,
    pairCount: PAIR_COUNT_WGSL,
    pairFill: PAIR_FILL_WGSL,
    circleCount: CIRCLE_COUNT_WGSL,
    circleKeep: CIRCLE_KEEP_WGSL,
    circleEmit: CIRCLE_EMIT_WGSL,
    markAtoms: MARK_ATOMS_WGSL,
    atomCircles: ATOM_CIRCLES_WGSL,
    atomCircleFill: ATOM_CIRCLE_FILL_WGSL,
    atomCircleSort: ATOM_CIRCLE_SORT_WGSL,
    expoTotals: EXPO_TOTALS_WGSL,
} as const;
/** Kernels of one thread in all. */
const SINGLE: readonly KernelName[] = ["midpointTotal", "level", "candidateTotal", "startTotal", "expoTotals"];
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
                label: `smooth surface ${name}`, code: KERNELS[name], workgroupSize: SINGLE.includes(name) ? 1 : SMOOTH_WORKGROUP,
            })),
        ]);
        return new GpuSmoothSurface(device, new Map(names.map((name, i) => [name, compiled[i]])), scan, marchingCubes);
    }

    /**
     * Stage 2 then 1: the surface from the C++'s unblurred field - blurred, capped and healed, its level
     * found and the field made ready to contour on the GPU (contourInputFromUnblurred), then
     * surfaceFromField. The field stays on the GPU throughout. Null if there is nothing to contour.
     */
    async surfaceFromUnblurred(unblurred: SmoothUnblurredField, options: SmoothBlurOptions & { fieldShading?: boolean },
                               atoms: Float32Array, residueOf: Int32Array, probe: number): Promise<GpuAtomSurface | null> {
        const input = this.contourInputFromUnblurred(unblurred, options);
        let kept = false;
        try {
            const surface = await this.surfaceFromField(input, unblurred, atoms, residueOf, probe, !options.fieldShading);
            if (surface && options.fieldShading) {
                surface.field = makeSurfaceField(this.device, input, unblurred);
                kept = true;
            }
            return surface;
        } finally {
            if (!kept) input.destroy();
        }
    }

    /**
     * Stage 2 from the C++'s unblurred field (smoothSurfaceUnblurredFieldFromAtoms): uploaded, then
     * blurField. Returns the field ready to contour, a GPU buffer the caller destroys.
     */
    contourInputFromUnblurred(unblurred: SmoothUnblurredField, options: SmoothBlurOptions): GPUBuffer {
        const count = unblurred.nx * unblurred.ny * unblurred.nz;
        const exact = createBuffer(this.device, "smooth surface unblurred field", count * 4, STORAGE | COPY_SRC | COPY_DST, unblurred.field);
        const interior = createBuffer(this.device, "smooth surface interior", 16, STORAGE | COPY_DST, new Uint32Array([unblurred.interior, 0, 0, 0]));
        let weight: GPUBuffer | null = null;
        if (unblurred.changed) {
            const bytes = Math.ceil(count / 4) * 4;
            const packed = new Uint8Array(bytes);
            packed.set(unblurred.changed);
            const changed = createBuffer(this.device, "smooth surface changed", bytes, STORAGE, packed);
            weight = createBuffer(this.device, "smooth surface weight", count * 4, STORAGE | COPY_SRC | COPY_DST);
            const P = this.blurParams(unblurred, unblurred.clamp, options, 0, 0, false);
            const encoder = this.device.createCommandEncoder({ label: "smooth surface weight" });
            this.kernels.get("weightInit").dispatch(encoder, { groups: [[P], [changed, weight]], items: count });
            this.device.queue.submit([encoder.finish()]);
            changed.destroy();
            P.destroy();
        }
        return this.blurField(exact, weight, interior, unblurred, unblurred.clamp, options);
    }

    /** Stage 2's parameters (BlurParams). */
    private blurParams(grid: SmoothFieldGrid, clamp: number, options: SmoothBlurOptions, axis: number, radius: number, lift: boolean): GPUBuffer {
        const buffer = new ArrayBuffer(48);
        const u = new Uint32Array(buffer), f = new Float32Array(buffer);
        u.set([grid.nx, grid.ny, grid.nz, grid.nx * grid.ny * grid.nz], 0);
        u.set([axis, radius, lift ? 1 : 0, 0], 4);
        f.set([Number.isFinite(options.maxShift) ? options.maxShift : 0, clamp], 8);
        return createBuffer(this.device, "smooth surface blur params", 48, UNIFORM | COPY_DST, new Uint8Array(buffer));
    }

    /**
     * Stage 2 (smooth-surface.cc blur_field): from the opened, unblurred field `exact`, the opening's
     * raw `weight` (0 or 255 per point; null if nothing wants it) and the points inside (`interior[0]`),
     * the weight spread, the blur, the cap, the heal blur and the level that keeps the enclosed volume.
     * Takes the three buffers (and destroys them); returns the field ready to contour (the level less
     * the field), a GPU buffer the caller destroys. Recorded and submitted, not waited for.
     */
    blurField(exact: GPUBuffer, weight: GPUBuffer | null, interior: GPUBuffer, grid: SmoothFieldGrid, clamp: number,
              options: SmoothBlurOptions): GPUBuffer {
        const { spacing } = grid;
        const count = grid.nx * grid.ny * grid.nz;
        const { sigma, maxShift, openUncapped, healBlur } = options;
        const fieldUsage = STORAGE | COPY_SRC | COPY_DST;
        const owned: GPUBuffer[] = [exact, interior, ...(weight ? [weight] : [])];
        const make = (label: string, bytes: number, usage: number, data?: ArrayBufferView) => {
            const b = createBuffer(this.device, `smooth surface ${label}`, bytes, usage, data);
            owned.push(b);
            return b;
        };
        const lift = openUncapped && !!weight;
        const params = (axis: number, radius: number) => {
            const b = this.blurParams(grid, clamp, options, axis, radius, lift);
            owned.push(b);
            return b;
        };
        const P = params(0, 0);
        const encoder = this.device.createCommandEncoder({ label: "smooth surface blur" });
        const run = (name: KernelName, uniform: GPUBuffer, buffers: GPUBuffer[]) =>
            this.kernels.get(name).dispatch(encoder, { groups: [[uniform], buffers], items: count });
        // Three separable passes from `source`, ending in `output`, through `scratch`.
        const blur3 = (name: "blur" | "blurWeight", sigmaVoxels: number, source: GPUBuffer, scratch: GPUBuffer, output: GPUBuffer) => {
            const weights = gaussianKernel(sigmaVoxels);
            const kernel = make("blur kernel", weights.byteLength, STORAGE, weights);
            const radius = (weights.length - 1) / 2;
            run(name, params(0, radius), [kernel, source, output]);
            run(name, params(1, radius), [kernel, output, scratch]);
            run(name, params(2, radius), [kernel, scratch, output]);
        };

        let spare = make("field a", count * 4, fieldUsage);
        let field = make("field b", count * 4, fieldUsage);
        if (weight) {
            // Spread over about an A: three passes ending in `spare`, which becomes the weight.
            blur3("blurWeight", 1.0 / spacing, weight, field, spare);
            run("weightScale", P, [spare]);
            [weight, spare] = [spare, weight];
        }
        // The blur, into `field`.
        if (sigma > 0) blur3("blur", sigma / spacing, exact, spare, field);
        else encoder.copyBufferToBuffer(exact, 0, field, 0, count * 4);
        if (sigma > 0 && Number.isFinite(maxShift) && maxShift > 0) {
            run("cap", P, [exact, weight ?? exact, field]);
        }
        if (healBlur > sigma && weight) {
            // The wider field into `exact`, no longer wanted.
            blur3("blur", Math.sqrt(healBlur * healBlur - sigma * sigma) / spacing, field, spare, exact);
            run("heal", P, [exact, weight, field]);
        }
        const level = make("level", 16, STORAGE, new Float32Array(4));
        if (sigma > 0) {
            const histogram = make("histogram", LEVEL_BINS * 4, STORAGE, new Uint32Array(LEVEL_BINS));
            run("histogram", P, [field, histogram]);
            this.kernels.get("level").dispatch(encoder, { groups: [[P], [histogram, interior, level]], workgroups: 1 });
        }
        // The input, into `spare`: kept, handed to the caller.
        run("contourInput", P, [field, level, spare]);
        this.device.queue.submit([encoder.finish()]);
        const input = spare;
        owned.filter(b => b !== input).forEach(b => b.destroy());
        return input;
    }

    /**
     * Stages 4, 3, 2 and 1: the whole surface on the GPU from the C++'s grid and exposed SAS
     * (smoothSurfaceExposureFromAtoms). Null if there is nothing to contour; throws if a grid line is
     * longer than the feature transform takes (MAX_LINE), for the caller to have the C++ make it.
     */
    async surfaceFromExposure(exposure: SmoothExposure, options: SmoothFieldOptions, atoms: Float32Array, residueOf: Int32Array):
        Promise<GpuAtomSurface | null> {
        const packed = this.packExposure(exposure);
        try {
            return await this.surfaceFromPacked(packed, options, atoms, residueOf);
        } finally {
            [packed.sas, packed.table, packed.floats].forEach(b => b.destroy());
        }
    }

    /**
     * Everything on the GPU (stages 5 to 1): the grid (smoothGrid), the exposed SAS (exposureOnGpu), the
     * field, the blur, the surface. `atoms`: x, y, z, van der Waals radius per atom. Null if there is
     * nothing to contour; throws if the grid's lines are too long (MAX_LINE) or a circle had more
     * intervals or arcs than room for, for the caller to have the C++ make it.
     */
    async surfaceFromAtoms(atoms: Float32Array, residueOf: Int32Array, options: SmoothFieldOptions & { spacing: number }):
        Promise<{ surface: GpuAtomSurface | null; exposureMs: number }> {
        if (atoms.length === 0) return { surface: null, exposureMs: 0 };
        const grid = smoothGrid(atoms, options.probe, options.spacing, options.sigma, options.openRadius);
        if (Math.max(grid.nx, grid.ny, grid.nz) > MAX_LINE) throw new Error(`GPU smooth surface: grid ${grid.nx}x${grid.ny}x${grid.nz} has lines longer than ${MAX_LINE}`);
        const sas = new Float32Array(atoms.length);
        for (let i = 0; i < atoms.length; i += 4) sas.set([atoms[i], atoms[i + 1], atoms[i + 2], atoms[i + 3] + options.probe], i);
        // Any WebGPU error on the way is this surface's (for the caller to have the C++ make it), not
        // the renderer's: uncaught, it would end WebGPU drawing the main view.
        this.device.pushErrorScope("out-of-memory");
        this.device.pushErrorScope("validation");
        let result: { surface: GpuAtomSurface | null; exposureMs: number } | null = null;
        try {
            const started = performance.now();
            const packed = await this.exposureOnGpu(sas, grid);
            const exposureMs = performance.now() - started;
            try {
                result = { surface: await this.surfaceFromPacked(packed, options, atoms, residueOf), exposureMs };
            } finally {
                [packed.sas, packed.table, packed.floats].forEach(b => b.destroy());
            }
        } finally {
            const validation = await this.device.popErrorScope();
            const memory = await this.device.popErrorScope();
            const error = validation ?? memory;
            if (error) {
                result?.surface?.field?.buffer.destroy();
                throw new Error(`GPU smooth surface: ${error.message}`);
            }
        }
        return result;
    }

    /** Stages 4 to 1 from a packed exposed SAS, again with more room for seed candidates if they overflowed. */
    private async surfaceFromPacked(packed: PackedExposure, options: SmoothFieldOptions, atoms: Float32Array, residueOf: Int32Array):
        Promise<GpuAtomSurface | null> {
        for (let room = 1; ; room *= 2) {
            const made = this.fieldFromPacked(packed, options, room);
            const input = this.blurField(made.field, made.weight, made.interior, packed, packed.clamp, options);
            let kept = false;
            try {
                const surface = await this.surfaceFromField(input, packed, atoms, residueOf, options.probe, !options.fieldShading);
                const overflow = new Uint32Array(await readBuffer(this.device, made.overflow, 4))[0];
                if (overflow === 0) {
                    if (surface && options.fieldShading) {
                        surface.field = makeSurfaceField(this.device, input, packed);
                        kept = true;
                    }
                    return surface;
                }
                if (room >= 64) throw new Error("GPU smooth surface: seed candidates kept outgrowing their room");
            } finally {
                if (!kept) input.destroy();
                made.overflow.destroy();
            }
        }
    }

    /**
     * Stage 5 (smooth-surface.cc exposed_sas): the exposed SAS of SAS spheres `sas` (x, y, z, r + probe)
     * on the GPU, packed as packExposure packs the C++'s. One wait, at the end, for the totals the tables
     * are sized by; made again with more room if neighbours, jobs, circles or arcs outgrew their estimate.
     * Throws if a circle had more intervals or arcs than a thread holds (MAX_INTERVALS, MAX_ARCS).
     */
    async exposureOnGpu(sas: Float32Array, grid: SmoothFieldGrid & { clamp: number }): Promise<PackedExposure> {
        const A = sas.length / 4;
        const geometry = exposureBins(sas, grid.spacing, grid.clamp);
        const span = Math.max(1, Math.ceil((2 * geometry.rMax) / geometry.binSize));
        for (let room = 1; ; room *= 2) {
            const caps = {
                neighbours: Math.ceil(96 * A * room) + 64, jobs: Math.ceil(48 * A * room) + 64,
                circles: Math.ceil(8 * A * room) + 64, arcs: Math.ceil(8 * A * room) + 64,
            };
            const owned: GPUBuffer[] = [];
            const make = (label: string, words: number, usage: number = STORAGE | COPY_SRC, data?: ArrayBufferView) => {
                const b = createBuffer(this.device, `smooth surface ${label}`, Math.max(1, words) * 4, usage, data);
                owned.push(b);
                return b;
            };
            const params = new ArrayBuffer(64);
            const u = new Uint32Array(params), f = new Float32Array(params);
            u.set([A, caps.neighbours, caps.jobs, 0], 0);
            u.set([caps.circles, caps.arcs, 0, 0], 4);
            u.set([geometry.bins.dims[0], geometry.bins.dims[1], geometry.bins.dims[2], span], 8);
            f.set([geometry.bins.low[0], geometry.bins.low[1], geometry.bins.low[2], geometry.binSize], 12);
            const P = make("expo params", 16, UNIFORM | COPY_DST, new Uint32Array(params));
            const sasBuffer = createBuffer(this.device, "smooth surface sas", sas.byteLength, STORAGE, sas);
            const binStart = make("bin start", geometry.bins.start.length, STORAGE, geometry.bins.start);
            const binMembers = make("bin members", geometry.bins.members.length, STORAGE, geometry.bins.members);
            const count = make("neighbour count", A);
            const contained = make("contained", A);
            const nbr = make("neighbours", A + 1 + caps.neighbours);
            const jobCount = make("job count", A);
            const touch = make("circle count", A);
            const jobStart = make("job start", A + 1);
            const jobs = make("jobs", 2 * caps.jobs);
            const arcCount = make("arc count", caps.jobs);
            const keep = make("kept", caps.jobs);
            const circleAt = make("circle numbers", caps.jobs);
            const arcAt = make("arc numbers", caps.jobs);
            const at = make("numbers", 2 * caps.jobs, STORAGE | COPY_SRC | COPY_DST);
            const floatsOut = make("circles and arcs", 13 * caps.circles + 5 * caps.arcs);
            const intsOut = make("other and arc start", 2 * caps.circles);
            const exposed = make("exposed", A);
            const atomCircleCount = make("atom circle count", A);
            const atomCircleStart = make("atom circle start", A + 1);
            const fill = make("atom circle fill", A);
            const atomCircleIds = make("atom circles", 2 * caps.circles);
            const circleStart = make("circle start", A + 1);
            const status = make("expo status", 8);

            const encoder = this.device.createCommandEncoder({ label: "smooth surface exposed SAS" });
            const run = (name: KernelName, buffers: GPUBuffer[], items: number) =>
                this.kernels.get(name).dispatch(encoder, { groups: [[P], buffers], items });
            const total = (counts: GPUBuffer, starts: GPUBuffer) =>
                this.kernels.get("startTotal").dispatch(encoder, { groups: [[P], [counts, starts]], workgroups: 1 });
            run("neighbourCount", [sasBuffer, binStart, binMembers, count, contained], A);
            this.scan.encode(encoder, count, nbr, A);
            total(count, nbr);
            run("neighbourFill", [sasBuffer, binStart, binMembers, nbr], A);
            run("pairCount", [sasBuffer, nbr, jobCount, touch], A);
            this.scan.encode(encoder, jobCount, jobStart, A);
            total(jobCount, jobStart);
            run("pairFill", [sasBuffer, nbr, jobStart, jobs], A);
            run("circleCount", [sasBuffer, nbr, jobs, jobStart, arcCount, status], caps.jobs);
            run("circleKeep", [arcCount, keep], caps.jobs);
            this.scan.encode(encoder, keep, circleAt, caps.jobs);
            this.scan.encode(encoder, arcCount, arcAt, caps.jobs);
            encoder.copyBufferToBuffer(circleAt, 0, at, 0, caps.jobs * 4);
            encoder.copyBufferToBuffer(arcAt, 0, at, caps.jobs * 4, caps.jobs * 4);
            run("circleEmit", [sasBuffer, nbr, jobs, arcCount, at, floatsOut, intsOut], caps.jobs);
            run("markAtoms", [jobs, arcCount, exposed, atomCircleCount], caps.jobs);
            run("atomCircles", [touch, contained, jobStart, arcCount, at, exposed, circleStart], A + 1);
            this.scan.encode(encoder, atomCircleCount, atomCircleStart, A);
            total(atomCircleCount, atomCircleStart);
            run("atomCircleFill", [jobs, arcCount, at, atomCircleStart, fill, atomCircleIds], caps.jobs);
            run("atomCircleSort", [atomCircleStart, atomCircleIds], A);
            this.kernels.get("expoTotals").dispatch(encoder, { groups: [[P], [nbr, jobStart, arcCount, at, status]], workgroups: 1 });
            const staging = make("expo status read", 8, MAP_READ | COPY_DST);
            encoder.copyBufferToBuffer(status, 0, staging, 0, 32);
            this.device.queue.submit([encoder.finish()]);
            this.scan.releaseTransient();
            await staging.mapAsync(MapMode.READ);
            const [overflow, N, , C, R] = new Uint32Array(staging.getMappedRange().slice(0));
            if (overflow === 1) {
                owned.forEach(b => b.destroy());
                sasBuffer.destroy();
                throw new Error("GPU smooth surface: a circle had more intervals or arcs than a thread holds");
            }
            if (overflow === 2) {
                owned.forEach(b => b.destroy());
                sasBuffer.destroy();
                if (room >= 16) throw new Error("GPU smooth surface: the exposed SAS kept outgrowing its room");
                continue;
            }

            // The tables, packed as packExposure packs the C++'s.
            const sizes = [A, A + 1, N, A + 1, C, A + 1, 2 * C, C, C + 1, geometry.bins.start.length, geometry.bins.members.length];
            const offsets: number[] = [];
            let words = 0;
            for (const n of sizes) { offsets.push(words); words += n; }
            const table = createBuffer(this.device, "smooth surface atom tables", Math.max(words, 1) * 4, STORAGE | COPY_DST | COPY_SRC);
            const floats = createBuffer(this.device, "smooth surface atom floats", Math.max(13 * C + 5 * R, 1) * 4, STORAGE | COPY_DST | COPY_SRC);
            const pack = this.device.createCommandEncoder({ label: "smooth surface pack" });
            const copy = (source: GPUBuffer, from: number, target: GPUBuffer, to: number, n: number) => {
                if (n > 0) pack.copyBufferToBuffer(source, from * 4, target, to * 4, n * 4);
            };
            copy(exposed, 0, table, offsets[0], A);
            copy(nbr, 0, table, offsets[1], A + 1 + N);
            copy(circleStart, 0, table, offsets[3], A + 1);
            copy(atomCircleStart, 0, table, offsets[5], A + 1);
            copy(atomCircleIds, 0, table, offsets[6], 2 * C);
            copy(intsOut, 0, table, offsets[7], C);
            copy(intsOut, caps.circles, table, offsets[8], C);
            copy(floatsOut, 0, floats, 0, 13 * C);
            copy(floatsOut, 13 * caps.circles, floats, 13 * C, 5 * R);
            this.device.queue.writeBuffer(table, offsets[4] * 4, Int32Array.from({ length: C }, (_, k) => k));
            this.device.queue.writeBuffer(table, (offsets[8] + C) * 4, new Int32Array([R]));
            this.device.queue.writeBuffer(table, offsets[9] * 4, geometry.bins.start);
            this.device.queue.writeBuffer(table, offsets[10] * 4, geometry.bins.members);
            this.device.queue.submit([pack.finish()]);
            owned.forEach(b => b.destroy());
            return {
                nx: grid.nx, ny: grid.ny, nz: grid.nz, origin: [grid.origin[0], grid.origin[1], grid.origin[2]], spacing: grid.spacing,
                clamp: grid.clamp, atomCount: A, binSize: geometry.binSize, binLow: geometry.bins.low, binDims: geometry.bins.dims,
                offsets, arcsAt: 13 * C, sas: sasBuffer, table, floats,
            };
        }
    }

    /**
     * The C++'s exposed SAS (ses_exposure), packed into the GPU tables stages 4 and 3 read: the SAS
     * spheres; one integer table (exposed, neighbour start and ids, circle start and ids, atom circle
     * start and ids, other, arc start, then the atom bins) and one float table (13 per circle, then 5
     * per arc: its start and end directions - cos, sin, in double - and its length).
     */
    packExposure(exposure: SmoothExposure): PackedExposure {
        const atomCount = exposure.sas.length / 4;
        const geometry = exposureBins(exposure.sas, exposure.spacing, exposure.clamp);
        const tables: ArrayLike<number>[] = [Int32Array.from(exposure.exposed), exposure.neighbourStart, exposure.neighbourIds,
            exposure.circleStart, exposure.circleIds, exposure.atomCircleStart, exposure.atomCircleIds, exposure.other, exposure.arcStart,
            geometry.bins.start, geometry.bins.members];
        const offsets: number[] = [];
        let total = 0;
        for (const t of tables) { offsets.push(total); total += t.length; }
        const table = new Int32Array(Math.max(total, 1));
        tables.forEach((t, k) => table.set(t, offsets[k]));
        const arcCount = exposure.arcs.length / 2;
        const floats = new Float32Array(Math.max(exposure.circles.length + 5 * arcCount, 1));
        floats.set(exposure.circles, 0);
        for (let m = 0; m < arcCount; m++) {
            const from = exposure.arcs[2 * m], length = exposure.arcs[2 * m + 1];
            floats.set([Math.cos(from), Math.sin(from), Math.cos(from + length), Math.sin(from + length), length],
                exposure.circles.length + 5 * m);
        }
        return {
            nx: exposure.nx, ny: exposure.ny, nz: exposure.nz, origin: [exposure.origin[0], exposure.origin[1], exposure.origin[2]],
            spacing: exposure.spacing, clamp: exposure.clamp, atomCount, binSize: geometry.binSize, binLow: geometry.bins.low,
            binDims: geometry.bins.dims, offsets, arcsAt: exposure.circles.length,
            sas: createBuffer(this.device, "smooth surface sas", exposure.sas.byteLength, STORAGE, exposure.sas),
            table: createBuffer(this.device, "smooth surface atom tables", table.byteLength, STORAGE, table),
            floats: createBuffer(this.device, "smooth surface atom floats", floats.byteLength, STORAGE, floats),
        };
    }

    /** Stages 4 and 3 from the C++'s exposed SAS: packExposure, then fieldFromPacked. */
    unblurredFromExposure(exposure: SmoothExposure, options: SmoothFieldOptions, room = 1, keep = false): ReturnType<GpuSmoothSurface["fieldFromPacked"]> {
        const packed = this.packExposure(exposure);
        try {
            return this.fieldFromPacked(packed, options, room, keep);
        } finally {
            [packed.sas, packed.table, packed.floats].forEach(b => b.destroy());
        }
    }

    /**
     * Stages 4 and 3 (smooth-surface.cc ses_field_unblurred): SAS occupancy, seeds, the feature
     * transform, the distances and the opening, from the packed exposed SAS (packExposure, or made on
     * the GPU: exposureOnGpu). Returns the opened field, the opening's raw weight (or null), the points
     * inside and an overflow flag (more seed candidates than `room` times the estimate made room for:
     * read after, and made again with more) - GPU buffers, the first three for blurField. With `keep`,
     * the intermediates too, for tests. The packed tables stay the caller's.
     */
    fieldFromPacked(packed: PackedExposure, options: SmoothFieldOptions, room = 1, keep = false): {
        field: GPUBuffer; weight: GPUBuffer | null; interior: GPUBuffer; overflow: GPUBuffer;
        kept?: { flags: GPUBuffer; feature: GPUBuffer; seeds: GPUBuffer; distance: GPUBuffer; candidates: GPUBuffer; seedCount: GPUBuffer };
    } {
        const { nx, ny, nz, spacing: h, clamp, offsets } = packed;
        if (Math.max(nx, ny, nz) > MAX_LINE) throw new Error(`GPU smooth surface: grid ${nx}x${ny}x${nz} has lines longer than ${MAX_LINE}`);
        const count = nx * ny * nz;
        const { probe, sigma, openRadius, openUncapped, healBlur } = options;
        const window = 3 * h, diagonal = Math.sqrt(3) * h;
        const mark = openRadius > 0 && (openUncapped || healBlur > sigma);
        // Seed candidates: the points next to the SAS, a few per cent of the grid.
        const cap = Math.ceil((0.06 * count + 4096) * room);

        const owned: GPUBuffer[] = [];
        const make = (label: string, bytes: number, usage: number = STORAGE, data?: ArrayBufferView) => {
            const b = createBuffer(this.device, `smooth surface ${label}`, bytes, usage, data);
            owned.push(b);
            return b;
        };
        const params = (axis: number, lines: number) => {
            const buffer = new ArrayBuffer(176);
            const f = new Float32Array(buffer), u = new Uint32Array(buffer);
            f.set([packed.origin[0], packed.origin[1], packed.origin[2], h], 0);
            u.set([nx, ny, nz, count], 4);
            f.set([probe, clamp, window, diagonal], 8);
            f.set([probe - clamp - h, probe + clamp + h, -(3 * sigma + 2 * h), openRadius], 12);
            f.set([(h * h) / 4, -(probe + clamp), packed.binSize, mark ? 1 : 0], 16);
            u.set([packed.binDims[0], packed.binDims[1], packed.binDims[2], packed.atomCount], 20);
            f.set([packed.binLow[0], packed.binLow[1], packed.binLow[2], 0], 24);
            u.set([axis, lines, cap, 0], 28);
            u.set([offsets[0], offsets[1], offsets[2], offsets[3]], 32);
            u.set([offsets[4], offsets[5], offsets[6], offsets[7]], 36);
            u.set([offsets[8], offsets[9], offsets[10], packed.arcsAt], 40);
            return make("field params", 176, UNIFORM | COPY_DST, new Uint8Array(buffer));
        };
        const P = params(0, 0);
        const sas = packed.sas, tableBuffer = packed.table, floatBuffer = packed.floats;
        const grid = (label: string) => make(label, count * 4, STORAGE | COPY_SRC | COPY_DST);
        const flags = grid("flags");
        const candidates = grid("candidates");
        const candidateAt = grid("candidate places");
        const feature = grid("feature");
        const scratch = grid("transform scratch");
        const seed = make("seed candidates", cap * 24, STORAGE | COPY_SRC);
        const valid = make("valid seeds", cap * 4);
        const seedAt = make("seed numbers", cap * 4);
        const seeds = make("seeds", cap * 20, STORAGE | COPY_SRC);
        const counts = make("candidate count", 16, STORAGE | COPY_SRC, new Uint32Array(4));
        const overflow = createBuffer(this.device, "smooth surface seed overflow", 16, STORAGE | COPY_SRC | COPY_DST, new Uint32Array(4));
        const interior = createBuffer(this.device, "smooth surface interior", 16, STORAGE | COPY_SRC | COPY_DST, new Uint32Array(4));

        const encoder = this.device.createCommandEncoder({ label: "smooth surface field" });
        const run = (name: KernelName, uniform: GPUBuffer, buffers: GPUBuffer[], items: number) =>
            this.kernels.get(name).dispatch(encoder, { groups: [[uniform], buffers], items });
        run("occupancy", P, [sas, tableBuffer, floatBuffer, flags], count);
        run("seedCandidates", P, [flags, candidates], count);
        this.scan.encode(encoder, candidates, candidateAt, count);
        this.kernels.get("candidateTotal").dispatch(encoder, { groups: [[P], [candidates, candidateAt, counts]], workgroups: 1 });
        run("seedFind", P, [sas, tableBuffer, floatBuffer, flags, candidateAt, seed, overflow], count);
        run("seedValid", P, [seed, counts, valid], cap);
        this.scan.encode(encoder, valid, seedAt, cap);
        run("featureInit", P, [candidates, candidateAt, seed, seedAt, feature, scratch, seeds], count);
        run("featurePass", params(0, nz * ny), [feature, scratch], nz * ny);
        run("featurePass", params(1, nz * nx), [feature, scratch], nz * nx);
        run("featurePass", params(2, ny * nx), [feature, scratch], ny * nx);
        // The distances into `candidates` (no longer wanted), the opened field into `scratch`, the
        // opening's weight into `candidateAt`.
        const distance = keep ? grid("distance") : candidates;
        run("distance", P, [sas, tableBuffer, floatBuffer, flags, feature, seeds, distance], count);
        const opened = scratch;
        const weight = mark ? candidateAt : null;
        run("opening", P, [distance, opened, weight ?? candidateAt], count);
        run("interior", P, [opened, interior], count);
        this.device.queue.submit([encoder.finish()]);
        this.scan.releaseTransient();
        const handed = new Set<GPUBuffer>([opened, ...(weight ? [weight] : [])]);
        const kept = keep ? { flags, feature, seeds, distance, candidates, seedCount: seedAt } : undefined;
        const keptSet = new Set<GPUBuffer>(kept ? Object.values(kept) : []);
        owned.filter(b => !handed.has(b) && !keptSet.has(b)).forEach(b => b.destroy());
        return { field: opened, weight, interior, overflow, kept };
    }

    /**
     * The surface of the field `input` (ready to contour: negative inside, the surface at 0, x fastest;
     * from the CPU, or a GPU buffer with STORAGE and COPY_SRC) on `grid`, with each vertex's atoms among
     * `atoms` (x, y, z, r per atom) and `residueOf`. Null if there is nothing to contour. `split`: each
     * triangle split in four at its edges' midpoints (for per-vertex normals); without, the contour's
     * vertices are still moved onto the surface and given the field's normals.
     */
    async surfaceFromField(input: Float32Array | GPUBuffer, grid: SmoothFieldGrid, atoms: Float32Array, residueOf: Int32Array,
                           probe: number, split = true): Promise<GpuAtomSurface | null> {
        const { nx, ny, nz, spacing } = grid;
        const origin = [grid.origin[0], grid.origin[1], grid.origin[2]];
        let mark = performance.now();
        const contour = await this.marchingCubes.contourField(input, [nx, ny, nz], origin as [number, number, number], spacing);
        const contourMs = performance.now() - mark;
        const V = contour.positions.length / 3;
        const T = contour.indices.length / 3;
        if (T === 0 || atoms.length === 0) return null;
        mark = performance.now();

        // Room for every vertex: the contour's, and (split) at most one midpoint per triangle edge.
        const N = split ? V + 3 * T : V;
        const outTriangles = split ? 4 * T : T;
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
        u.set([T, atoms.length / 4, span, outTriangles], 8);
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
            const field = input instanceof Float32Array ? make("field", input.byteLength, STORAGE, input) : input;
            const positions = make("positions", N * 12, STORAGE | COPY_SRC | COPY_DST);
            this.device.queue.writeBuffer(positions, 0, contour.positions);
            const normals = make("normals", N * 12, STORAGE | COPY_SRC);
            const indices = make("indices", T * 12, STORAGE | COPY_SRC, contour.indices);
            const rowCount = make("row count", V * 4, STORAGE, new Uint32Array(V));
            const rowStart = make("row start", V * 4);
            const rowFill = make("row fill", V * 4, STORAGE, new Uint32Array(V));
            const rowHi = make("row ends", T * 12);
            const uniqueCount = make("distinct edges", V * 4);
            const midStart = make("midpoint start", V * 4);
            const counts = make("counts", 16, STORAGE | COPY_SRC, new Uint32Array(4));
            const splitIndices = make("split", outTriangles * 12, STORAGE | COPY_SRC | COPY_DST);
            const atomBuffer = make("atoms", atoms.byteLength, STORAGE, atoms);
            const residues = make("residues", residueOf.byteLength, STORAGE, residueOf);
            const binStart = make("bin start", bins.start.byteLength, STORAGE, bins.start);
            const binMembers = make("bin members", bins.members.byteLength, STORAGE, bins.members);
            const info = make("vertex info", N * 12, STORAGE | COPY_SRC);
            const near = make("near atoms", N * 8 * COLOUR_ATOMS, STORAGE | COPY_SRC);

            const encoder = this.device.createCommandEncoder({ label: "smooth surface" });
            const run = (name: KernelName, buffers: GPUBuffer[], items: number) =>
                this.kernels.get(name).dispatch(encoder, { groups: [[P], buffers], items });
            if (split) {
                run("edgeCount", [indices, rowCount], T);
                this.scan.encode(encoder, rowCount, rowStart, V);
                run("edgeFill", [indices, rowStart, rowFill, rowHi], T);
                run("rowUnique", [rowStart, rowCount, rowHi, uniqueCount], V);
                this.scan.encode(encoder, uniqueCount, midStart, V);
                this.kernels.get("midpointTotal").dispatch(encoder, { groups: [[P], [uniqueCount, midStart, counts]], workgroups: 1 });
                run("midpoints", [rowStart, rowCount, rowHi, midStart, positions], V);
                run("split", [indices, rowStart, rowCount, rowHi, midStart, splitIndices], T);
            } else {
                // No midpoints (counts stays 0): the contour's own triangles, oriented below.
                encoder.copyBufferToBuffer(indices, 0, splitIndices, 0, T * 12);
            }
            run("refine", [field, counts, positions, normals], N);
            run("orient", [positions, normals, splitIndices], outTriangles);
            run("vertexAtoms", [positions, atomBuffer, residues, binStart, binMembers, counts, info, near], N);

            const staged = (source: GPUBuffer, bytes: number) => {
                const staging = make(`read ${source.label}`, bytes, MAP_READ | COPY_DST);
                encoder.copyBufferToBuffer(source, 0, staging, 0, Math.max(16, Math.ceil(bytes / 4) * 4));
                return staging;
            };
            const read = {
                counts: staged(counts, 16), positions: staged(positions, N * 12), normals: staged(normals, N * 12),
                split: staged(splitIndices, outTriangles * 12), info: staged(info, N * 12), near: staged(near, N * 8 * COLOUR_ATOMS),
            };
            this.device.queue.submit([encoder.finish()]);
            await Promise.all(Object.values(read).map(b => b.mapAsync(MapMode.READ)));
            const vertices = V + new Uint32Array(read.counts.getMappedRange())[0];
            // Copied out of the mapped ranges one at a time, and taken apart in slices
            // (timeSlicing.ts), the view getting its turns between: on a large surface this is
            // hundreds of megabytes.
            const copy = async (buffer: GPUBuffer, bytes: number) => {
                const out = buffer.getMappedRange().slice(0, bytes);
                await yieldToBrowser();
                return out;
            };
            const positionsOut = new Float32Array(await copy(read.positions, vertices * 12));
            const normalsOut = new Float32Array(await copy(read.normals, vertices * 12));
            const indicesOut = new Uint32Array(await copy(read.split, outTriangles * 12));
            const infoWords = new Uint32Array(await copy(read.info, vertices * 12));
            const nearWords = new Uint32Array(await copy(read.near, vertices * 8 * COLOUR_ATOMS));
            const infoInts = new Int32Array(infoWords.buffer), infoFloats = new Float32Array(infoWords.buffer);
            const nearInts = new Int32Array(nearWords.buffer), nearFloats = new Float32Array(nearWords.buffer);
            const atom = new Int32Array(vertices), other = new Int32Array(vertices), weight = new Float32Array(vertices);
            const nearOut = new Int32Array(COLOUR_ATOMS * vertices), nearGap = new Float32Array(COLOUR_ATOMS * vertices);
            await runSliced((function* () {
                for (let v = 0; v < vertices; v++) {
                    if ((v & SLICE_MASK) === SLICE_MASK) yield;
                    atom[v] = infoInts[3 * v];
                    other[v] = infoInts[3 * v + 1];
                    weight[v] = infoFloats[3 * v + 2];
                    for (let k = 0; k < COLOUR_ATOMS; k++) {
                        nearOut[COLOUR_ATOMS * v + k] = nearInts[2 * COLOUR_ATOMS * v + k];
                        nearGap[COLOUR_ATOMS * v + k] = nearFloats[2 * COLOUR_ATOMS * v + COLOUR_ATOMS + k];
                    }
                }
            })());
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
