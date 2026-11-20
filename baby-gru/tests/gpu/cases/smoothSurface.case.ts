/**
 * The GPU smooth surface's stage 1 (src/WebGPUComponents/smoothSurface: marching cubes, split, Newton
 * steps, normals, winding, vertex atoms) against the C++ (wasm_src/smooth-surface.cc), from the same
 * field: the one the C++ hands over (smoothSurfaceFieldFromAtoms).
 *
 * The reference - atoms, field and the C++'s finished surface - is made by the spec as it runs
 * (tests/gpu/reference/smooth-surface-cpp) and served at /generated/reference.bin. The GPU numbers
 * its vertices in another order, so vertices are matched by position, then compared.
 */
import { GpuMetaBalls } from "../../../src/WebGPUComponents/metaballs/gpuMetaBalls";
import { GpuSmoothSurface } from "../../../src/WebGPUComponents/smoothSurface/gpuSmoothSurface";
import { defineCase } from "../helpers/browserCase";

export interface SmoothSurfaceReport {
    atoms: number;
    cppVertices: number;
    gpuVertices: number;
    cppTriangles: number;
    gpuTriangles: number;
    /** GPU vertices with no C++ vertex within 1e-3 A. */
    unmatchedVertices: number;
    maxPositionError: number;
    maxNormalDegrees: number;
    /** Matched vertices whose atom / other residue's atom / nearest atoms differ. */
    atomDiffers: number;
    otherDiffers: number;
    nearDiffers: number;
    maxWeightError: number;
    maxGapError: number;
    /** GPU triangles that are C++ triangles, wound the same way; and either way. */
    sameTriangles: number;
    sameUnwound: number;
    /** Of the others, those with a vertex that has a second C++ vertex within 2e-3 A (coincident marching-cubes vertices: matching by position can pick either). */
    otherWithTwins: number;
    gpuMs: number;
}

function readReference(buffer: ArrayBuffer) {
    let offset = 0;
    const take = <T>(make: (b: ArrayBuffer) => T, n: number): T => {
        const out = make(buffer.slice(offset, offset + 4 * n));
        offset += 4 * n;
        return out;
    };
    const u32 = (n: number) => take(b => new Uint32Array(b), n);
    const i32 = (n: number) => take(b => new Int32Array(b), n);
    const f32 = (n: number) => take(b => new Float32Array(b), n);
    const [n] = u32(1);
    const atoms = f32(4 * n), residueOf = i32(n), [probe] = f32(1);
    const [nx, ny, nz] = i32(3);
    const [ox, oy, oz, spacing] = f32(4);
    const field = f32(nx * ny * nz);
    const [vertices, indexCount] = u32(2);
    return {
        atoms, residueOf, probe, grid: { nx, ny, nz, origin: [ox, oy, oz], spacing }, field,
        surface: {
            positions: f32(3 * vertices), normals: f32(3 * vertices), indices: u32(indexCount),
            atom: i32(vertices), other: i32(vertices), weight: f32(vertices), near: i32(4 * vertices), nearGap: f32(4 * vertices),
        },
    };
}

/** A triangle as a key: its vertices from the smallest, in its winding order. */
function triangleKey(a: number, b: number, c: number): string {
    if (a <= b && a <= c) return `${a},${b},${c}`;
    if (b <= a && b <= c) return `${b},${c},${a}`;
    return `${c},${a},${b}`;
}

export default defineCase(async (device: GPUDevice): Promise<SmoothSurfaceReport> => {
    const response = await fetch("/generated/reference.bin");
    if (!response.ok) throw new Error(`reference: ${response.status}`);
    const ref = readReference(await response.arrayBuffer());
    const cpp = ref.surface;

    const marchingCubes = await GpuMetaBalls.create(device);
    const gpuSurface = await GpuSmoothSurface.create(device, marchingCubes);
    const started = performance.now();
    const gpu = await gpuSurface.surfaceFromField(ref.field, ref.grid, ref.atoms, ref.residueOf, ref.probe);
    const gpuMs = performance.now() - started;
    if (!gpu) throw new Error("GPU: no surface");

    // C++ vertices binned at 0.05 A, for the nearest one to each GPU vertex.
    const cell = 0.05;
    const bins = new Map<string, number[]>();
    const keyOf = (x: number, y: number, z: number) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
    const cppCount = cpp.positions.length / 3;
    for (let v = 0; v < cppCount; v++) {
        const key = keyOf(cpp.positions[3 * v], cpp.positions[3 * v + 1], cpp.positions[3 * v + 2]);
        const bin = bins.get(key);
        if (bin) bin.push(v); else bins.set(key, [v]);
    }
    const gpuCount = gpu.positions.length / 3;
    const match = new Int32Array(gpuCount).fill(-1);
    let unmatchedVertices = 0, maxPositionError = 0, maxNormalDegrees = 0;
    let atomDiffers = 0, otherDiffers = 0, nearDiffers = 0, maxWeightError = 0, maxGapError = 0;
    for (let v = 0; v < gpuCount; v++) {
        const x = gpu.positions[3 * v], y = gpu.positions[3 * v + 1], z = gpu.positions[3 * v + 2];
        const cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
        let best = -1, bestD = Infinity;
        for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
            for (const w of bins.get(`${cx + i},${cy + j},${cz + k}`) ?? []) {
                const d = Math.hypot(cpp.positions[3 * w] - x, cpp.positions[3 * w + 1] - y, cpp.positions[3 * w + 2] - z);
                if (d < bestD) { bestD = d; best = w; }
            }
        }
        if (best < 0 || bestD > 1e-3) { unmatchedVertices++; continue; }
        match[v] = best;
        maxPositionError = Math.max(maxPositionError, bestD);
        const dot = gpu.normals[3 * v] * cpp.normals[3 * best] + gpu.normals[3 * v + 1] * cpp.normals[3 * best + 1] +
            gpu.normals[3 * v + 2] * cpp.normals[3 * best + 2];
        maxNormalDegrees = Math.max(maxNormalDegrees, Math.acos(Math.min(1, dot)) * 180 / Math.PI);
        if (gpu.atom[v] !== cpp.atom[best]) atomDiffers++;
        if (gpu.other[v] !== cpp.other[best]) otherDiffers++;
        else if (gpu.other[v] >= 0) maxWeightError = Math.max(maxWeightError, Math.abs(gpu.weight[v] - cpp.weight[best]));
        let nearSame = true;
        for (let k = 0; k < 4; k++) {
            if (gpu.near[4 * v + k] !== cpp.near[4 * best + k]) nearSame = false;
            else if (gpu.near[4 * v + k] >= 0) maxGapError = Math.max(maxGapError, Math.abs(gpu.nearGap[4 * v + k] - cpp.nearGap[4 * best + k]));
        }
        if (!nearSame) nearDiffers++;
    }

    const cppTriangles = new Set<string>();
    for (let t = 0; t < cpp.indices.length; t += 3) cppTriangles.add(triangleKey(cpp.indices[t], cpp.indices[t + 1], cpp.indices[t + 2]));
    let sameTriangles = 0, sameUnwound = 0, otherWithTwins = 0;
    const hasTwin = (w: number) => {
        const x = cpp.positions[3 * w], y = cpp.positions[3 * w + 1], z = cpp.positions[3 * w + 2];
        const cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
        for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
            for (const u of bins.get(`${cx + i},${cy + j},${cz + k}`) ?? []) {
                if (u !== w && Math.hypot(cpp.positions[3 * u] - x, cpp.positions[3 * u + 1] - y, cpp.positions[3 * u + 2] - z) < 2e-3) return true;
            }
        }
        return false;
    };
    for (let t = 0; t < gpu.indices.length; t += 3) {
        const a = match[gpu.indices[t]], b = match[gpu.indices[t + 1]], c = match[gpu.indices[t + 2]];
        if (a < 0 || b < 0 || c < 0) continue;
        if (cppTriangles.has(triangleKey(a, b, c))) { sameTriangles++; sameUnwound++; }
        else if (cppTriangles.has(triangleKey(a, c, b))) sameUnwound++;
        else if ([a, b, c].some(hasTwin)) otherWithTwins++;
    }

    return {
        atoms: ref.atoms.length / 4,
        cppVertices: cppCount, gpuVertices: gpuCount,
        cppTriangles: cpp.indices.length / 3, gpuTriangles: gpu.indices.length / 3,
        unmatchedVertices, maxPositionError, maxNormalDegrees,
        atomDiffers, otherDiffers, nearDiffers, maxWeightError, maxGapError,
        sameTriangles, sameUnwound, otherWithTwins, gpuMs,
    };
});
