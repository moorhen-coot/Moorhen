/**
 * The GPU smooth surface's stages 4 and 3 (src/WebGPUComponents/smoothSurface: SAS occupancy, seeds,
 * the feature transform, distances, the opening) against the C++ (smooth-surface.cc
 * ses_field_unblurred and its intermediates), from the same exposed SAS (ses_exposure); then the whole
 * surface from the exposed SAS against the C++'s. The reference is made by the spec, served at
 * /generated/reference.bin (tests/gpu/reference/smooth-surface-cpp).
 */
import { readBuffer } from "../../../src/WebGPUComponents/gpu";
import { GpuMetaBalls } from "../../../src/WebGPUComponents/metaballs/gpuMetaBalls";
import { GpuSmoothSurface } from "../../../src/WebGPUComponents/smoothSurface/gpuSmoothSurface";
import { defineCase } from "../helpers/browserCase";

export interface SmoothFieldReport {
    points: number;
    exteriorDiffers: number;
    deepDiffers: number;
    cppSeeds: number;
    gpuSeeds: number;
    maxSeedError: number;
    seedAtomDiffers: number;
    featureDiffers: number;
    maxDistanceError: number;
    maxOpenedError: number;
    maxOpenedErrorNearSurface: number;
    weightDiffers: number;
    cppInterior: number;
    gpuInterior: number;
    cppVertices: number;
    gpuVertices: number;
    cppTriangles: number;
    gpuTriangles: number;
    unmatched1e2: number;
    unmatched1e3: number;
}

export default defineCase(async (device: GPUDevice): Promise<SmoothFieldReport> => {
    const response = await fetch("/generated/reference.bin");
    if (!response.ok) throw new Error(`reference: ${response.status}`);
    const buffer = await response.arrayBuffer();
    let offset = 0;
    const take = (bytes: number) => { const b = buffer.slice(offset, offset + bytes); offset += bytes; return b; };
    const u32 = (n: number) => new Uint32Array(take(4 * n));
    const i32 = (n: number) => new Int32Array(take(4 * n));
    const f32 = (n: number) => new Float32Array(take(4 * n));
    const f64 = (n: number) => new Float64Array(take(8 * n));
    const [n] = u32(1);
    const atoms = f32(4 * n), residueOf = i32(n), [probe] = f32(1);
    const [nx, ny, nz] = i32(3);
    const [ox, oy, oz, spacing] = f32(4);
    const count = nx * ny * nz;
    f32(count);
    const [vertices, indexCount] = u32(2);
    const cppPositions = f32(3 * vertices);
    f32(3 * vertices); u32(indexCount); i32(vertices); i32(vertices); f32(vertices); i32(4 * vertices); f32(4 * vertices);
    const cppOpened = f32(count);
    const [changedLength] = u32(1);
    const changed = new Uint8Array(take(changedLength));
    const [cppInterior] = f64(2);
    const arrayOf = <T>(make: (b: ArrayBuffer) => T, size: number): T => { const [length] = u32(1); return make(take(size * length)); };
    const I = () => arrayOf(b => new Int32Array(b), 4), F = () => arrayOf(b => new Float32Array(b), 4), B = () => arrayOf(b => new Uint8Array(b), 1);
    const exposure = {
        nx, ny, nz, origin: [ox, oy, oz], spacing,
        sas: F(), exposed: B(), neighbourStart: I(), neighbourIds: I(), circleStart: I(), circleIds: I(),
        atomCircleStart: I(), atomCircleIds: I(), other: I(), arcStart: I(), circles: F(), arcs: F(), clamp: f64(1)[0],
    };
    const exterior = B(), deep = B(), seedPoint = I(), seedAtom = I(), seedCircle = I(), seedXyz = F(), cppFeature = I(), cppDistance = F();

    const options = { probe, sigma: 0.5, maxShift: 0.3, openRadius: 0.5, openUncapped: true, healBlur: 0.6 };
    const marchingCubes = await GpuMetaBalls.create(device);
    const gpu = await GpuSmoothSurface.create(device, marchingCubes);
    const made = gpu.unblurredFromExposure(exposure, options, 1, true);
    const kept = made.kept;
    const flags = new Uint32Array(await readBuffer(device, kept.flags, count * 4));
    const feature = new Int32Array(await readBuffer(device, kept.feature, count * 4));
    const distance = new Float32Array(await readBuffer(device, kept.distance, count * 4));
    const opened = new Float32Array(await readBuffer(device, made.field, count * 4));
    const weight = made.weight ? new Uint32Array(await readBuffer(device, made.weight, count * 4)) : new Uint32Array(count);
    const [gpuInterior] = new Uint32Array(await readBuffer(device, made.interior, 4));
    const [overflow] = new Uint32Array(await readBuffer(device, made.overflow, 4));
    if (overflow) throw new Error(`seed candidates overflowed: ${overflow}`);
    const cppSeeds = seedAtom.length;
    const gpuSeedData = new Uint32Array(await readBuffer(device, kept.seeds, cppSeeds * 20));
    const gpuSeedF = new Float32Array(gpuSeedData.buffer), gpuSeedI = new Int32Array(gpuSeedData.buffer);
    let gpuSeeds = 0;
    let exteriorDiffers = 0, deepDiffers = 0, featureDiffers = 0, maxDistanceError = 0, maxOpenedError = 0, maxOpenedErrorNearSurface = 0, weightDiffers = 0;
    for (let i = 0; i < count; i++) {
        if (((flags[i] & 1) !== 0) !== (exterior[i] !== 0)) exteriorDiffers++;
        if (((flags[i] & 2) !== 0) !== (deep[i] !== 0)) deepDiffers++;
        if (feature[i] !== cppFeature[i]) featureDiffers++;
        gpuSeeds = Math.max(gpuSeeds, feature[i] + 1);
        maxDistanceError = Math.max(maxDistanceError, Math.abs(distance[i] - cppDistance[i]));
        const e = Math.abs(opened[i] - cppOpened[i]);
        maxOpenedError = Math.max(maxOpenedError, e);
        if (Math.abs(cppOpened[i]) < 0.5) maxOpenedErrorNearSurface = Math.max(maxOpenedErrorNearSurface, e);
        if ((weight[i] === 255) !== (changed.length ? changed[i] === 255 : false)) weightDiffers++;
    }
    let maxSeedError = 0, seedAtomDiffers = 0;
    for (let k = 0; k < cppSeeds; k++) {
        const err = Math.hypot(gpuSeedF[5 * k] - seedXyz[3 * k], gpuSeedF[5 * k + 1] - seedXyz[3 * k + 1], gpuSeedF[5 * k + 2] - seedXyz[3 * k + 2]);

        maxSeedError = Math.max(maxSeedError, err);
        if (gpuSeedI[5 * k + 3] !== seedAtom[k] || gpuSeedI[5 * k + 4] !== seedCircle[k]) seedAtomDiffers++;
    }
    void seedPoint;
    for (const b of [made.field, made.interior, made.overflow, ...(made.weight ? [made.weight] : []), ...Object.values(kept)]) b.destroy();

    const surface = await gpu.surfaceFromExposure(exposure, options, atoms, residueOf);
    if (!surface) throw new Error("GPU: no surface");
    const cell = 0.05;
    const bins = new Map<string, number[]>();
    for (let v = 0; v < vertices; v++) {
        const k = `${Math.floor(cppPositions[3 * v] / cell)},${Math.floor(cppPositions[3 * v + 1] / cell)},${Math.floor(cppPositions[3 * v + 2] / cell)}`;
        const bin = bins.get(k);
        if (bin) bin.push(v); else bins.set(k, [v]);
    }
    let unmatched1e2 = 0, unmatched1e3 = 0;
    const gpuVertices = surface.positions.length / 3;
    for (let v = 0; v < gpuVertices; v++) {
        const x = surface.positions[3 * v], y = surface.positions[3 * v + 1], z = surface.positions[3 * v + 2];
        const cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
        let best = Infinity;
        for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
            for (const w of bins.get(`${cx + i},${cy + j},${cz + k}`) ?? []) {
                best = Math.min(best, Math.hypot(cppPositions[3 * w] - x, cppPositions[3 * w + 1] - y, cppPositions[3 * w + 2] - z));
            }
        }
        if (best > 1e-2) unmatched1e2++;
        if (best > 1e-3) unmatched1e3++;
    }
    return {
        points: count, exteriorDiffers, deepDiffers, cppSeeds, gpuSeeds, maxSeedError, seedAtomDiffers, featureDiffers,
        maxDistanceError, maxOpenedError, maxOpenedErrorNearSurface, weightDiffers, cppInterior, gpuInterior,
        cppVertices: vertices, gpuVertices, cppTriangles: indexCount / 3, gpuTriangles: surface.indices.length / 3, unmatched1e2, unmatched1e3,
    };
});
