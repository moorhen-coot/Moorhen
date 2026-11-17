/**
 * The smooth molecular surface's marching cubes on the GPU (GpuMetaBalls.contourField) against the
 * CPU's (contourOnCpu in src/utils/smoothSurface.ts), on the same blurred SES field of 1df7.
 *
 * Both use MC.h's table, edge numbering and inside test, so they should give the same mesh: the
 * same vertices on the same grid edges, at the same places to float rounding, and the same
 * triangles in the same order (the GPU numbers vertices differently, so triangles are compared
 * through the grid edges of their corners). Run in one slab, in many small ones, and with too
 * little room to start with, so the slab joins and the retry are both exercised.
 */
import { GpuMetaBalls } from "../../../src/WebGPUComponents/metaballs/gpuMetaBalls";
import { m2tAtomRadius } from "../../../src/utils/m2tAtomRadii";
import { type EdgeContour, contourInput, contourOnCpu, sesField } from "../../../src/utils/smoothSurface";
import { defineCase } from "../helpers/browserCase";

export interface SmoothSurfaceArgs {
    pdbLines: string[];
}

export interface ContourComparison {
    cpuVertices: number;
    gpuVertices: number;
    cpuTriangles: number;
    gpuTriangles: number;
    /** CPU vertices with no GPU vertex on the same grid edge. */
    unmatchedVertices: number;
    maxPositionError: number;
    /** Triangles whose corners are on the same grid edges, in the same order, at the same place. */
    sameTriangles: number;
    slabs: number;
    retries: number;
}

export interface SmoothSurfaceReport {
    gridPoints: number;
    oneSlab: ContourComparison;
    manySlabs: ContourComparison;
    retried: ContourComparison;
}

function compare(cpu: EdgeContour, gpu: EdgeContour & { slabs: number; retries: number }): ContourComparison {
    const gpuByKey = new Map<number, number>();
    gpu.keys.forEach((key, v) => gpuByKey.set(key, v));
    let unmatchedVertices = 0, maxPositionError = 0;
    cpu.keys.forEach((key, v) => {
        const g = gpuByKey.get(key);
        if (g === undefined) { unmatchedVertices++; return; }
        for (let k = 0; k < 3; k++) maxPositionError = Math.max(maxPositionError, Math.abs(cpu.positions[3 * v + k] - gpu.positions[3 * g + k]));
    });
    let sameTriangles = 0;
    const triangles = Math.min(cpu.indices.length, gpu.indices.length);
    for (let i = 0; i + 2 < triangles; i += 3) {
        let same = true;
        for (let k = 0; k < 3; k++) if (cpu.keys[cpu.indices[i + k]] !== gpu.keys[gpu.indices[i + k]]) same = false;
        if (same) sameTriangles++;
    }
    return {
        cpuVertices: cpu.keys.length, gpuVertices: gpu.keys.length,
        cpuTriangles: cpu.indices.length / 3, gpuTriangles: gpu.indices.length / 3,
        unmatchedVertices, maxPositionError, sameTriangles, slabs: gpu.slabs, retries: gpu.retries,
    };
}

export default defineCase(async (device: GPUDevice, args: SmoothSurfaceArgs): Promise<SmoothSurfaceReport> => {
    const atoms = args.pdbLines.map(line => ({
        x: parseFloat(line.slice(30, 38)), y: parseFloat(line.slice(38, 46)), z: parseFloat(line.slice(46, 54)),
        r: m2tAtomRadius(line.slice(12, 16), line.slice(17, 20)),
    }));
    const grid = sesField(atoms, 1.4, 0.4, 0.35);
    const field = contourInput(grid);
    const cpu = contourOnCpu(field, grid);
    const generator = await GpuMetaBalls.create(device);
    const n: [number, number, number] = [grid.nx, grid.ny, grid.nz];
    try {
        const run = (options: { maxSlabPoints?: number; room?: number }) => generator.contourField(field, n, grid.origin, grid.spacing, options);
        return {
            gridPoints: grid.nx * grid.ny * grid.nz,
            oneSlab: compare(cpu, await run({})),
            manySlabs: compare(cpu, await run({ maxSlabPoints: 12 * grid.nx * grid.ny })),
            retried: compare(cpu, await run({ room: 0.05 })),
        };
    } finally {
        generator.destroy();
    }
});
