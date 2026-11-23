/**
 * GPU MetaBalls (src/WebGPUComponents/metaballs) against Moorhen's C++ (metaballs/metaballs.cc,
 * GenerateMeshFromPoints) on the first 16 atoms of 1df7, vertex for vertex.
 *
 * The reference mesh is tests/gpu/data/metaballs-1df7-first16.cpp.bin.gz, written by the C++ with
 * grid 0.2 A, iso level 1.8, one thread (see tests/gpu/README.md to regenerate it). Vertices are
 * matched through the grid edge they lie on - the GPU numbers them in a different order - and then
 * positions, normals, colours, triangles and hover influences are compared.
 */
import { GpuMetaBalls } from "../../../src/WebGPUComponents/metaballs/gpuMetaBalls";
import { metaballRadius } from "../../../src/WebGPUComponents/metaballs/metaballsGrid";
import { defineCase } from "../helpers/browserCase";

/** Sizes and colours as the reference's input was made (DrawMoorhenMetaBalls' VDW-BALLS sizes). */
const SIZE: Record<string, number> = { C: 1.7, N: 1.55, O: 1.52, S: 1.8, P: 1.8, H: 1.1 };
const COLOUR: Record<string, number[]> = { C: [0.6, 0.6, 0.6, 1], N: [0.2, 0.3, 1, 1], O: [1, 0.2, 0.2, 1], S: [1, 0.9, 0.2, 1] };

export interface MetaBallsArgs {
    /** The atom lines the reference was made from. */
    pdbLines: string[];
    reference: string;
}

export interface MetaBallsReport {
    cppVertices: number;
    gpuVertices: number;
    cppTriangles: number;
    gpuTriangles: number;
    /** C++ vertices with no GPU vertex on the same grid edge within 1e-3 A. */
    unmatchedVertices: number;
    maxPositionError: number;
    maxNormalDegrees: number;
    maxColourError: number;
    /** Triangles whose three vertices match, in the same order, at the same place in the list. */
    sameTriangles: number;
    /** Vertices whose set of influencing atoms differs (weights near the 0.005 cut can tip). */
    influenceSetsDiffer: number;
    maxInfluenceWeightError: number;
}

async function gunzip(url: string): Promise<ArrayBuffer> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    return new Response(response.body.pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
}

/** The C++ mesh as cppmesh writes it: counts, then positions, normals, colours, indices, CSR influences. */
function readReference(buffer: ArrayBuffer) {
    const [vertices, indexCount, influenceCount] = new Uint32Array(buffer, 0, 3);
    let offset = 12;
    const take = <T>(make: (b: ArrayBuffer, o: number, n: number) => T, n: number): T => {
        const out = make(buffer.slice(offset, offset + 4 * n), 0, n);
        offset += 4 * n;
        return out;
    };
    const f32 = (b: ArrayBuffer, o: number, n: number) => new Float32Array(b, o, n);
    const u32 = (b: ArrayBuffer, o: number, n: number) => new Uint32Array(b, o, n);
    return {
        vertices,
        positions: take(f32, 3 * vertices), normals: take(f32, 3 * vertices), colours: take(f32, 4 * vertices),
        indices: take(u32, indexCount), ends: take(u32, vertices), points: take(u32, influenceCount), weights: take(f32, influenceCount),
    };
}

export default defineCase(async (device: GPUDevice, args: MetaBallsArgs): Promise<MetaBallsReport> => {
    const points: number[] = [], colours: number[] = [];
    for (const line of args.pdbLines) {
        const element = (line.slice(76, 78).trim() || line.slice(12, 14).trim()[0]).toUpperCase();
        points.push(+line.slice(30, 38), +line.slice(38, 46), +line.slice(46, 54), metaballRadius(0.67, SIZE[element] ?? 1.7));
        colours.push(...(COLOUR[element] ?? [0, 1, 0, 1]));
    }
    const c = readReference(await gunzip(args.reference));

    const generator = await GpuMetaBalls.create(device);
    const g = await generator.generate(
        { points: new Float32Array(points), colours: new Float32Array(colours) },
        { gridSize: 0.2, isoLevel: 1.8, withKeys: true },
    );
    generator.destroy();

    // GPU vertices by grid edge: ((z * ny + y) * nx + x) * 3 + axis.
    const byKey = new Map<number, number>();
    g.keys.forEach((key, i) => byKey.set(key, i));
    const [nx, ny] = g.grid.n;
    const distance = (i: number, j: number) =>
        Math.hypot(c.positions[3 * i] - g.positions[3 * j], c.positions[3 * i + 1] - g.positions[3 * j + 1], c.positions[3 * i + 2] - g.positions[3 * j + 2]);
    const match = new Int32Array(c.vertices).fill(-1);
    let unmatchedVertices = 0;
    for (let i = 0; i < c.vertices; i++) {
        const gridPoint = [0, 1, 2].map(k => (c.positions[3 * i + k] - g.grid.min[k]) / g.grid.cell);
        let best = -1, bestDistance = Infinity;
        for (let axis = 0; axis < 3; axis++) for (const shift of [0, -1]) {
            const p = gridPoint.map((v, k) => (k === axis ? Math.floor(v) + shift : Math.round(v)));
            const j = byKey.get(((p[2] * ny + p[1]) * nx + p[0]) * 3 + axis);
            if (j === undefined) continue;
            const d = distance(i, j);
            if (d < bestDistance) { bestDistance = d; best = j; }
        }
        if (best >= 0 && bestDistance < 1e-3) match[i] = best; else unmatchedVertices++;
    }

    let maxPositionError = 0, maxNormalDegrees = 0, maxColourError = 0, influenceSetsDiffer = 0, maxInfluenceWeightError = 0;
    for (let i = 0; i < c.vertices; i++) {
        const j = match[i];
        if (j < 0) continue;
        maxPositionError = Math.max(maxPositionError, distance(i, j));
        let dot = 0;
        for (let k = 0; k < 3; k++) dot += c.normals[3 * i + k] * g.normals[3 * j + k];
        maxNormalDegrees = Math.max(maxNormalDegrees, Math.acos(Math.min(1, Math.max(-1, dot))) * 180 / Math.PI);
        for (let k = 0; k < 4; k++) maxColourError = Math.max(maxColourError, Math.abs(c.colours[4 * i + k] - g.colours[4 * j + k]));
        const cStart = i ? c.ends[i - 1] : 0, gStart = j ? g.influenceEnds[j - 1] : 0;
        const cSet = new Map<number, number>(), gSet = new Map<number, number>();
        for (let k = cStart; k < c.ends[i]; k++) cSet.set(c.points[k], c.weights[k]);
        for (let k = gStart; k < g.influenceEnds[j]; k++) gSet.set(g.influencePoints[k], g.influenceWeights[k]);
        if (cSet.size !== gSet.size || [...cSet.keys()].some(p => !gSet.has(p))) {
            influenceSetsDiffer++;
            continue;
        }
        for (const [p, w] of cSet) maxInfluenceWeightError = Math.max(maxInfluenceWeightError, Math.abs(w - gSet.get(p)));
    }
    let sameTriangles = 0;
    const triangles = Math.min(c.indices.length, g.indices.length) / 3;
    for (let t = 0; t < triangles; t++) {
        if ([0, 1, 2].every(k => match[c.indices[3 * t + k]] === g.indices[3 * t + k])) sameTriangles++;
    }
    return {
        cppVertices: c.vertices, gpuVertices: g.positions.length / 3,
        cppTriangles: c.indices.length / 3, gpuTriangles: g.indices.length / 3,
        unmatchedVertices, maxPositionError, maxNormalDegrees, maxColourError, sameTriangles,
        influenceSetsDiffer, maxInfluenceWeightError,
    };
});
