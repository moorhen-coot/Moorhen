/**
 * The GPU smooth surface's stage 5 (src/WebGPUComponents/smoothSurface exposureOnGpu: neighbours,
 * circles, exposed arcs, exposed atoms) and grid (smoothGrid) against the C++ (smooth-surface.cc
 * ses_exposure), then the whole surface from the atoms on the GPU against the C++'s. The reference is
 * made by the spec, served at /generated/reference.bin (tests/gpu/reference/smooth-surface-cpp).
 */
import { readBuffer } from "../../../src/WebGPUComponents/gpu";
import { GpuMetaBalls } from "../../../src/WebGPUComponents/metaballs/gpuMetaBalls";
import { GpuSmoothSurface, smoothGrid } from "../../../src/WebGPUComponents/smoothSurface/gpuSmoothSurface";
import { defineCase } from "../helpers/browserCase";

export interface SmoothExposureReport {
    gridSame: boolean;
    /** Integer tables that differ from the C++'s (by name). */
    tablesDiffer: string[];
    cppCircles: number;
    gpuCircles: number;
    cppArcs: number;
    gpuArcs: number;
    maxCircleError: number;
    maxArcEndError: number;
    arcClassDiffers: number;
    cppVertices: number;
    gpuVertices: number;
    cppTriangles: number;
    gpuTriangles: number;
    unmatched1e2: number;
    unmatched1e3: number;
}

export default defineCase(async (device: GPUDevice): Promise<SmoothExposureReport> => {
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
    f32(count);
    const [changedLength] = u32(1);
    take(changedLength);
    f64(2);
    const arrayOf = <T>(make: (b: ArrayBuffer) => T, size: number): T => { const [length] = u32(1); return make(take(size * length)); };
    const I = () => arrayOf(b => new Int32Array(b), 4), F = () => arrayOf(b => new Float32Array(b), 4), B = () => arrayOf(b => new Uint8Array(b), 1);
    const cpp = {
        sas: F(), exposed: B(), neighbourStart: I(), neighbourIds: I(), circleStart: I(), circleIds: I(),
        atomCircleStart: I(), atomCircleIds: I(), other: I(), arcStart: I(), circles: F(), arcs: F(), clamp: f64(1)[0],
    };

    const options = { probe, spacing: 0.5, sigma: 0.5, maxShift: 0.3, openRadius: 0.5, openUncapped: true, healBlur: 0.6 };
    const grid = smoothGrid(atoms, probe, options.spacing, options.sigma, options.openRadius);
    const gridSame = grid.nx === nx && grid.ny === ny && grid.nz === nz && Math.fround(grid.spacing) === spacing &&
        grid.origin.every((v, k) => Math.fround(v) === [ox, oy, oz][k]) && Math.abs(grid.clamp - cpp.clamp) < 1e-12;

    const marchingCubes = await GpuMetaBalls.create(device);
    const gpu = await GpuSmoothSurface.create(device, marchingCubes);
    const sas = new Float32Array(atoms.length);
    for (let i = 0; i < atoms.length; i += 4) sas.set([atoms[i], atoms[i + 1], atoms[i + 2], atoms[i + 3] + probe], i);
    const packed = await gpu.exposureOnGpu(sas, grid);
    const o = packed.offsets;
    const table = new Int32Array(await readBuffer(device, packed.table, (o[10] + n) * 4));
    const segment = (k: number, length: number) => table.slice(o[k], o[k] + length);
    const C = o[5] - o[4];
    const gpuArcCount = (packed.floats.size / 4 - 13 * C) / 5;
    const floats = new Float32Array(await readBuffer(device, packed.floats, packed.floats.size));
    [packed.sas, packed.table, packed.floats].forEach(b => b.destroy());

    const tablesDiffer: string[] = [];
    const same = (name: string, g: ArrayLike<number>, c: ArrayLike<number>) => {
        if (g.length !== c.length) { tablesDiffer.push(`${name} (length ${g.length} vs ${c.length})`); return; }
        for (let i = 0; i < c.length; i++) if (g[i] !== c[i]) { tablesDiffer.push(`${name} [${i}]: ${g[i]} vs ${c[i]}`); return; }
    };
    same("exposed", segment(0, n), cpp.exposed);
    same("neighbourStart", segment(1, n + 1), cpp.neighbourStart);
    same("neighbourIds", segment(2, cpp.neighbourIds.length), cpp.neighbourIds);
    same("circleStart", segment(3, n + 1), cpp.circleStart);
    same("circleIds", segment(4, C), cpp.circleIds);
    same("atomCircleStart", segment(5, n + 1), cpp.atomCircleStart);
    same("atomCircleIds", segment(6, 2 * C), cpp.atomCircleIds);
    same("other", segment(7, C), cpp.other);
    same("arcStart", segment(8, C + 1), cpp.arcStart);

    let maxCircleError = 0;
    const cppCircles = cpp.circles.length / 13;
    for (let i = 0; i < Math.min(13 * C, cpp.circles.length); i++) maxCircleError = Math.max(maxCircleError, Math.abs(floats[i] - cpp.circles[i]));
    let maxArcEndError = 0, arcClassDiffers = 0;
    const cppArcs = cpp.arcs.length / 2;
    for (let m = 0; m < Math.min(gpuArcCount, cppArcs); m++) {
        const from = cpp.arcs[2 * m], length = cpp.arcs[2 * m + 1];
        const g = floats.subarray(13 * C + 5 * m, 13 * C + 5 * m + 5);
        const expected = [Math.cos(from), Math.sin(from), Math.cos(from + length), Math.sin(from + length)];
        for (let k = 0; k < 4; k++) maxArcEndError = Math.max(maxArcEndError, Math.abs(g[k] - expected[k]));
        const cppClass = length >= 2 * Math.PI - 1e-6 ? 2 : length <= Math.PI ? 0 : 1;
        const gpuClass = g[4] >= 2 * Math.PI - 1e-6 ? 2 : g[4] <= Math.PI ? 0 : 1;
        if (cppClass !== gpuClass) arcClassDiffers++;
    }

    const { surface } = await gpu.surfaceFromAtoms(atoms, residueOf, options);
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
        gridSame, tablesDiffer, cppCircles, gpuCircles: C, cppArcs, gpuArcs: gpuArcCount, maxCircleError, maxArcEndError, arcClassDiffers,
        cppVertices: vertices, gpuVertices, cppTriangles: indexCount / 3, gpuTriangles: surface.indices.length / 3, unmatched1e2, unmatched1e3,
    };
});
