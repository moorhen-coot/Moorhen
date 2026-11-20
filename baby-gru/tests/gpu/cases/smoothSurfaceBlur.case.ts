/**
 * The GPU smooth surface's stage 2 (src/WebGPUComponents/smoothSurface: the cuts' weight, the blur, the
 * cap, the heal blur, the level that keeps the volume) against the C++ (smooth-surface.cc blur_field),
 * from the same unblurred field (ses_field_unblurred); then stages 2 and 1 together against the C++'s
 * surface. The reference is made by the spec (tests/gpu/reference/smooth-surface-cpp), served at
 * /generated/reference.bin.
 */
import { readBuffer } from "../../../src/WebGPUComponents/gpu";
import { GpuMetaBalls } from "../../../src/WebGPUComponents/metaballs/gpuMetaBalls";
import { GpuSmoothSurface } from "../../../src/WebGPUComponents/smoothSurface/gpuSmoothSurface";
import { defineCase } from "../helpers/browserCase";

export interface SmoothBlurReport {
    points: number;
    changed: number;
    /** The field ready to contour (level less field): worst difference, everywhere and within 0.5 A of the surface. */
    maxInputError: number;
    maxInputErrorNearSurface: number;
    /** The surface from stages 2 + 1 against the C++'s. */
    cppVertices: number;
    gpuVertices: number;
    cppTriangles: number;
    gpuTriangles: number;
    /** GPU vertices further than 1e-3 / 1e-2 A from every C++ vertex. */
    unmatched1e3: number;
    unmatched1e2: number;
}

export default defineCase(async (device: GPUDevice): Promise<SmoothBlurReport> => {
    const response = await fetch("/generated/reference.bin");
    if (!response.ok) throw new Error(`reference: ${response.status}`);
    const buffer = await response.arrayBuffer();
    let offset = 0;
    const take = <T>(make: (b: ArrayBuffer) => T, bytes: number): T => {
        const out = make(buffer.slice(offset, offset + bytes));
        offset += bytes;
        return out;
    };
    const u32 = (n: number) => take(b => new Uint32Array(b), 4 * n);
    const i32 = (n: number) => take(b => new Int32Array(b), 4 * n);
    const f32 = (n: number) => take(b => new Float32Array(b), 4 * n);
    const [n] = u32(1);
    const atoms = f32(4 * n), residueOf = i32(n), [probe] = f32(1);
    const [nx, ny, nz] = i32(3);
    const [ox, oy, oz, spacing] = f32(4);
    const count = nx * ny * nz;
    const cppInput = f32(count);
    const [vertices, indexCount] = u32(2);
    const cppPositions = f32(3 * vertices);
    f32(3 * vertices); u32(indexCount); i32(vertices); i32(vertices); f32(vertices); i32(4 * vertices); f32(4 * vertices);
    const unblurredField = f32(count);
    const [changedLength] = u32(1);
    const changed = changedLength ? take(b => new Uint8Array(b), changedLength) : null;
    const [interior, clamp] = take(b => new Float64Array(b), 16);

    // The app's defaults (smoothSurfaceSetting), as the reference used them.
    const options = { sigma: 0.5, maxShift: 0.3, openUncapped: true, healBlur: 0.6 };
    const grid = { nx, ny, nz, origin: [ox, oy, oz], spacing };
    const unblurred = { ...grid, field: unblurredField, changed, interior, clamp };
    const marchingCubes = await GpuMetaBalls.create(device);
    const gpuSurface = await GpuSmoothSurface.create(device, marchingCubes);

    const input = gpuSurface.contourInputFromUnblurred(unblurred, options);
    const gpuInput = new Float32Array(await readBuffer(device, input, count * 4));
    input.destroy();
    let maxInputError = 0, maxInputErrorNearSurface = 0;
    for (let i = 0; i < count; i++) {
        const d = Math.abs(gpuInput[i] - cppInput[i]);
        maxInputError = Math.max(maxInputError, d);
        if (Math.abs(cppInput[i]) < 0.5) maxInputErrorNearSurface = Math.max(maxInputErrorNearSurface, d);
    }

    const surface = await gpuSurface.surfaceFromUnblurred(unblurred, options, atoms, residueOf, probe);
    if (!surface) throw new Error("GPU: no surface");
    const cell = 0.05;
    const bins = new Map<string, number[]>();
    const key = (x: number, y: number, z: number) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
    for (let v = 0; v < vertices; v++) {
        const k = key(cppPositions[3 * v], cppPositions[3 * v + 1], cppPositions[3 * v + 2]);
        const bin = bins.get(k);
        if (bin) bin.push(v); else bins.set(k, [v]);
    }
    let unmatched1e3 = 0, unmatched1e2 = 0;
    const gpuVertices = surface.positions.length / 3;
    for (let v = 0; v < gpuVertices; v++) {
        const x = surface.positions[3 * v], y = surface.positions[3 * v + 1], z = surface.positions[3 * v + 2];
        let best = Infinity;
        const cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
        for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
            for (const w of bins.get(`${cx + i},${cy + j},${cz + k}`) ?? []) {
                best = Math.min(best, Math.hypot(cppPositions[3 * w] - x, cppPositions[3 * w + 1] - y, cppPositions[3 * w + 2] - z));
            }
        }
        if (best > 1e-3) unmatched1e3++;
        if (best > 1e-2) unmatched1e2++;
    }
    return {
        points: count, changed: changed ? changed.reduce((s, b) => s + (b ? 1 : 0), 0) : 0,
        maxInputError, maxInputErrorNearSurface,
        cppVertices: vertices, gpuVertices, cppTriangles: indexCount / 3, gpuTriangles: surface.indices.length / 3,
        unmatched1e3, unmatched1e2,
    };
});
