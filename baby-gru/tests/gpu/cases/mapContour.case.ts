/**
 * GPU map contours (src/WebGPUComponents/mapContour) against the CPU reference: the same kept
 * triangles (midpoints within 0.015 A), no degenerate ones, normals along the map's gradient, and
 * the lines exactly the triangles' edges, each once, with their draw arguments to match.
 */
import { readBuffer } from "../../../src/WebGPUComponents/gpu";
import { GpuIsosurface, GpuMapGrid, MapContourKernels } from "../../../src/WebGPUComponents/mapContour/gpuMapContour";
import { cpuContourMidpoints, expectedNormal, syntheticMap, unmatchedMidpoints } from "../reference/mapContourReference";
import { defineCase } from "../helpers/browserCase";

export interface ContourCase {
    em: boolean;
    centre: [number, number, number];
    radius: number;
    level: number;
    /** GpuIsosurface.vertexRoomPerPoint: tiny forces the grow-and-remake path. */
    room: number;
}

export interface ContourReport {
    box: number[] | null;
    remade: number;
    gpuTriangles: number;
    cpuTriangles: number;
    degenerate: number;
    unmatchedMidpoints: number;
    thickLineArgsOk: boolean;
    /** Lines drawn, the triangles' distinct edges, and lines that are not one or repeat one. */
    lines: number;
    edges: number;
    strayLines: number;
    repeatedLines: number;
    normalsChecked: number;
    normalsOff: number;
    worstNormalDot: number;
}

export default defineCase(async (device: GPUDevice, c: ContourCase): Promise<ContourReport> => {
    const kernels = await MapContourKernels.create(device);
    const grid = syntheticMap(c.em);
    const mapGrid = new GpuMapGrid(kernels, grid);
    const saved = GpuIsosurface.vertexRoomPerPoint;
    GpuIsosurface.vertexRoomPerPoint = c.room;
    let remade = 0;
    const surface = new GpuIsosurface(kernels, mapGrid, () => { remade++; });
    try {
        const request = { centre: c.centre, radius: c.radius, level: c.level };
        surface.update(request);
        // The room check reads the totals back in the background; give it time, then remake if
        // it asked to (as the next frame would).
        await device.queue.onSubmittedWorkDone();
        await new Promise(resolve => setTimeout(resolve, 200));
        if (remade) surface.update(request);

        const b = surface.buffers;
        const args = new Uint32Array(await readBuffer(device, b.drawArgs, 64));
        const indexCount = args[0];
        const triangles = new Uint32Array(await readBuffer(device, b.triangles, indexCount * 4));
        const vertexCount = triangles.reduce((m, v) => Math.max(m, v), 0) + 1;
        const positions = new Float32Array(await readBuffer(device, b.position, vertexCount * 12));
        const normals = new Float32Array(await readBuffer(device, b.normal, vertexCount * 12));
        const position = (i: number) => [positions[3 * i], positions[3 * i + 1], positions[3 * i + 2]];

        let degenerate = 0;
        const midpoints: number[][] = [];
        for (let t = 0; t < indexCount / 3; t++) {
            const [a, bb, cc] = [triangles[3 * t], triangles[3 * t + 1], triangles[3 * t + 2]];
            if (a === bb && bb === cc) { degenerate++; continue; }
            const [pa, pb, pc] = [position(a), position(bb), position(cc)];
            midpoints.push([0, 1, 2].map(i => (pa[i] + pb[i] + pc[i]) / 3));
        }
        const cpu = cpuContourMidpoints(grid, c.centre, c.radius, c.level);

        // The lines: each distinct edge of the triangles, once.
        const lineCount = args[8] / 6;
        const lines = new Uint32Array(await readBuffer(device, b.lines, Math.max(8, lineCount * 8)));
        const edgeKey = (p: number, q: number) => p < q ? `${p},${q}` : `${q},${p}`;
        const edges = new Set<string>();
        for (let t = 0; t < indexCount / 3; t++) {
            for (let k = 0; k < 3; k++) edges.add(edgeKey(triangles[3 * t + k], triangles[3 * t + (k + 1) % 3]));
        }
        const seen = new Set<string>();
        let strayLines = 0, repeatedLines = 0;
        for (let l = 0; l < lineCount; l++) {
            const key = edgeKey(lines[2 * l], lines[2 * l + 1]);
            if (!edges.has(key)) strayLines++;
            if (seen.has(key)) repeatedLines++;
            seen.add(key);
        }

        let normalsChecked = 0, normalsOff = 0, worstNormalDot = 1;
        for (const i of new Set(triangles)) {
            const want = expectedNormal(grid, position(i), c.level);
            if (!want) continue;
            const dot = want[0] * normals[3 * i] + want[1] * normals[3 * i + 1] + want[2] * normals[3 * i + 2];
            normalsChecked++;
            worstNormalDot = Math.min(worstNormalDot, dot);
            if (dot < 0.999) normalsOff++;
        }

        return {
            box: surface.lastBox?.size ?? null,
            remade,
            gpuTriangles: midpoints.length,
            cpuTriangles: cpu.length,
            degenerate,
            unmatchedMidpoints: unmatchedMidpoints(midpoints, cpu, 0.015),
            // drawIndirect for thick lines: 6 vertices for each line.
            thickLineArgsOk: args[8] % 6 === 0 && args[9] === 1 && args[10] === 0 && args[11] === 0,
            lines: lineCount,
            edges: edges.size,
            strayLines,
            repeatedLines,
            normalsChecked,
            normalsOff,
            worstNormalDot,
        };
    } finally {
        GpuIsosurface.vertexRoomPerPoint = saved;
        surface.destroy();
        mapGrid.destroy();
        kernels.destroy();
    }
});
