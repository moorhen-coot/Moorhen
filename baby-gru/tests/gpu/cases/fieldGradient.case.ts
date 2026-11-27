/**
 * The per-pixel normal's gradient (smoothSurface/surfaceField.ts, FIELD_GRADIENT_WGSL, which the
 * renderer's fs_field calls) run in a compute kernel at chosen points, against:
 * - the same cubic B-spline gradient in double on the CPU, written out here from its definition;
 * - a linear field, whose B-spline gradient is its slope exactly (away from the clamped edges);
 * - a sphere's distance, whose gradient points away from the centre: the normals a sphere should have.
 */
import { BufferUsage, ComputeKernel, createBuffer, readBuffer } from "../../../src/WebGPUComponents/gpu";
import { FIELD_GRADIENT_WGSL, FIELD_GRID_BYTES } from "../../../src/WebGPUComponents/smoothSurface/surfaceField";
import { defineCase } from "../helpers/browserCase";

export interface FieldGradientReport {
    points: number;
    /** Largest |GPU - CPU| over the components, against the largest component. */
    maxRelativeError: number;
    /** Linear field: largest |gradient - slope|. */
    maxLinearError: number;
    /** Sphere: largest angle between the normal and the radial direction, degrees. */
    maxSphereDegrees: number;
}

const KERNEL = /* wgsl */ `
@group(0) @binding(0) var<uniform> fieldGrid: FieldGrid;
@group(1) @binding(0) var<storage, read> fieldValues: array<f32>;
@group(1) @binding(1) var<storage, read> points: array<vec4f>;
@group(1) @binding(2) var<storage, read_write> out: array<vec4f>;
${FIELD_GRADIENT_WGSL}
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3u) {
    if (id.x >= arrayLength(&points)) { return; }
    out[id.x] = vec4f(fieldGradient(points[id.x].xyz), 0.0);
}
`;

interface Grid { dims: [number, number, number]; origin: [number, number, number]; spacing: number; values: Float32Array }

function makeGrid(dims: [number, number, number], origin: [number, number, number], spacing: number, f: (x: number, y: number, z: number) => number): Grid {
    const values = new Float32Array(dims[0] * dims[1] * dims[2]);
    for (let k = 0; k < dims[2]; k++) for (let j = 0; j < dims[1]; j++) for (let i = 0; i < dims[0]; i++) {
        values[(k * dims[1] + j) * dims[0] + i] = f(origin[0] + i * spacing, origin[1] + j * spacing, origin[2] + k * spacing);
    }
    return { dims, origin, spacing, values };
}

/** The B-spline gradient in double, from the basis functions as written in any textbook. */
function cpuGradient(grid: Grid, p: number[]): number[] {
    const b = (t: number) => [(1 - t) ** 3 / 6, (3 * t ** 3 - 6 * t ** 2 + 4) / 6, (-3 * t ** 3 + 3 * t ** 2 + 3 * t + 1) / 6, t ** 3 / 6];
    const db = (t: number) => [-((1 - t) ** 2) / 2, (3 * t ** 2 - 4 * t) / 2, (-3 * t ** 2 + 2 * t + 1) / 2, t ** 2 / 2];
    const u = p.map((v, a) => (v - grid.origin[a]) / grid.spacing);
    const cell = u.map(Math.floor);
    const t = u.map((v, a) => v - cell[a]);
    const at = (i: number, j: number, k: number) => {
        const c = (v: number, n: number) => Math.min(Math.max(v, 0), n - 1);
        return grid.values[(c(k, grid.dims[2]) * grid.dims[1] + c(j, grid.dims[1])) * grid.dims[0] + c(i, grid.dims[0])];
    };
    const g = [0, 0, 0];
    for (let c = 0; c < 4; c++) for (let bb = 0; bb < 4; bb++) for (let a = 0; a < 4; a++) {
        const v = at(cell[0] - 1 + a, cell[1] - 1 + bb, cell[2] - 1 + c);
        g[0] += db(t[0])[a] * b(t[1])[bb] * b(t[2])[c] * v;
        g[1] += b(t[0])[a] * db(t[1])[bb] * b(t[2])[c] * v;
        g[2] += b(t[0])[a] * b(t[1])[bb] * db(t[2])[c] * v;
    }
    return g.map(v => v / grid.spacing);
}

async function gpuGradients(device: GPUDevice, kernel: ComputeKernel, grid: Grid, points: number[][]): Promise<number[][]> {
    const uniform = new ArrayBuffer(FIELD_GRID_BYTES);
    new Float32Array(uniform, 0, 4).set([...grid.origin, grid.spacing]);
    new Uint32Array(uniform, 16, 4).set([...grid.dims, 0]);
    const P = createBuffer(device, "grid", FIELD_GRID_BYTES, BufferUsage.UNIFORM, new Uint8Array(uniform));
    const values = createBuffer(device, "values", grid.values.byteLength, BufferUsage.STORAGE, grid.values);
    const packed = new Float32Array(4 * points.length);
    points.forEach((p, i) => packed.set(p, 4 * i));
    const at = createBuffer(device, "points", packed.byteLength, BufferUsage.STORAGE, packed);
    const out = createBuffer(device, "out", packed.byteLength, BufferUsage.STORAGE | BufferUsage.COPY_SRC);
    const encoder = device.createCommandEncoder();
    kernel.dispatch(encoder, { groups: [[P], [values, at, out]], items: points.length });
    device.queue.submit([encoder.finish()]);
    const result = new Float32Array(await readBuffer(device, out, packed.byteLength));
    [P, values, at, out].forEach(b => b.destroy());
    return points.map((_, i) => [result[4 * i], result[4 * i + 1], result[4 * i + 2]]);
}

export default defineCase(async (device: GPUDevice, args: { code?: string } | null): Promise<FieldGradientReport> => {
    const kernel = await ComputeKernel.create(device, { label: "field gradient", code: args?.code ?? KERNEL, workgroupSize: 64 });
    let seed = 3;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    // Inside the grid, two cells from its edges, where nothing is clamped.
    const dims: [number, number, number] = [24, 20, 22], origin: [number, number, number] = [-6, -5, -5.5], spacing = 0.5;
    const points = Array.from({ length: 2000 }, () => [0, 1, 2].map(a => origin[a] + (2 + random() * (dims[a] - 5)) * spacing));

    // A bumpy field: a sphere's distance with ripples.
    const bumpy = makeGrid(dims, origin, spacing, (x, y, z) => Math.hypot(x, y, z) - 3 + 0.3 * Math.sin(2 * x) * Math.cos(1.5 * y + z));
    const gpu = await gpuGradients(device, kernel, bumpy, points);
    let maxRelativeError = 0;
    points.forEach((p, i) => {
        const cpu = cpuGradient(bumpy, p);
        const scale = Math.max(...cpu.map(Math.abs), 1e-6);
        for (let a = 0; a < 3; a++) maxRelativeError = Math.max(maxRelativeError, Math.abs(gpu[i][a] - cpu[a]) / scale);
    });

    const slope = [0.7, -1.3, 0.4];
    const linear = makeGrid(dims, origin, spacing, (x, y, z) => slope[0] * x + slope[1] * y + slope[2] * z + 2);
    let maxLinearError = 0;
    (await gpuGradients(device, kernel, linear, points)).forEach(g => {
        for (let a = 0; a < 3; a++) maxLinearError = Math.max(maxLinearError, Math.abs(g[a] - slope[a]));
    });

    // The sphere of radius 3 itself: points on it, normals against the radius.
    const sphere = makeGrid(dims, origin, spacing, (x, y, z) => Math.hypot(x, y, z) - 3);
    const onSphere = Array.from({ length: 500 }, () => {
        const d = [random() - 0.5, random() - 0.5, random() - 0.5];
        const len = Math.hypot(d[0], d[1], d[2]);
        return d.map(v => (3 * v) / len);
    });
    let maxSphereDegrees = 0;
    (await gpuGradients(device, kernel, sphere, onSphere)).forEach((g, i) => {
        const p = onSphere[i];
        const cos = (g[0] * p[0] + g[1] * p[1] + g[2] * p[2]) / (Math.hypot(g[0], g[1], g[2]) * 3);
        maxSphereDegrees = Math.max(maxSphereDegrees, (Math.acos(Math.min(1, cos)) * 180) / Math.PI);
    });
    return { points: points.length, maxRelativeError, maxLinearError, maxSphereDegrees };
});

