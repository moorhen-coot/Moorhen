/**
 * Per-pixel colour (smoothSurface/surfaceField.ts, ATOM_COLOUR_WGSL, which the renderer's fs_field
 * calls) run in a compute kernel at chosen points, through the same binning and uniform block the
 * renderer uses (attachSurfaceColouring, surfaceFieldUniform), against every atom visited on the CPU in
 * double: the nearest sphere's gap g0 among the atoms within their band, then every atom within
 * g0 + 2 x width weighted (1 - (g - g0) / (2 x width))², normalised; the fallback with none in band.
 * RGB compared (the GPU's alpha is the colour's reach, colourReach). Twice: every atom its own random
 * colour, and a few colours grouped by cluster with some atoms odd ones out - where most points take
 * the shortcut past the blend, which must give what the blend gives.
 */
import { BufferUsage, ComputeKernel, createBuffer, readBuffer } from "../../../src/WebGPUComponents/gpu";
import {
    ATOM_COLOUR_WGSL, FIELD_GRADIENT_WGSL, attachSurfaceColouring, makeSurfaceField, surfaceFieldUniform,
} from "../../../src/WebGPUComponents/smoothSurface/surfaceField";
import { defineCase } from "../helpers/browserCase";

export interface AtomColourReport {
    points: number;
    /** Points with no atom in band (the fallback colour), on the CPU; and where the GPU disagrees. */
    fallbacks: number;
    fallbackDiffers: number;
    /** Largest |GPU - CPU| over RGB, per colouring and width ("random 0.4", "grouped 1"). */
    maxError: Record<string, number>;
}

const KERNEL = /* wgsl */ `
@group(0) @binding(0) var<uniform> fieldGrid: FieldGrid;
@group(1) @binding(0) var<storage, read> colourAtoms: array<vec4f>;
@group(1) @binding(1) var<storage, read> atomColours: array<vec4f>;
@group(1) @binding(2) var<storage, read> colourBinStart: array<u32>;
@group(1) @binding(3) var<storage, read> colourBinMembers: array<u32>;
@group(1) @binding(4) var<storage, read> points: array<vec4f>;
@group(1) @binding(5) var<storage, read_write> out: array<vec4f>;
@group(1) @binding(6) var<storage, read> fieldValues: array<f32>;
${FIELD_GRADIENT_WGSL}
${ATOM_COLOUR_WGSL}
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3u) {
    if (id.x >= arrayLength(&points)) { return; }
    _ = fieldValues[0];
    out[id.x] = atomColourAt(points[id.x].xyz, vec4f(-1.0));
}
`;

const BAND = 1.4;

function cpuColour(atoms: Float32Array, colours: Float32Array, p: number[], width: number): number[] {
    const n = atoms.length / 4;
    const gap = (a: number) => Math.hypot(p[0] - atoms[4 * a], p[1] - atoms[4 * a + 1], p[2] - atoms[4 * a + 2]) - atoms[4 * a + 3];
    let g0 = Infinity, nearest = -1;
    for (let a = 0; a < n; a++) {
        const g = gap(a);
        if (g < BAND && g < g0) { g0 = g; nearest = a; }
    }
    if (nearest < 0) return [-1, -1, -1];
    if (width <= 0) return Array.from(colours.subarray(4 * nearest, 4 * nearest + 3));
    const R = 2 * width;
    const sum = [0, 0, 0];
    let total = 0;
    for (let a = 0; a < n; a++) {
        const t = 1 - (gap(a) - g0) / R;
        if (t <= 0) continue;
        for (let c = 0; c < 3; c++) sum[c] += t * t * colours[4 * a + c];
        total += t * t;
    }
    return sum.map(v => v / total);
}

export default defineCase(async (device: GPUDevice): Promise<AtomColourReport> => {
    const kernel = await ComputeKernel.create(device, { label: "atom colour", code: KERNEL, workgroupSize: 64 });
    let seed = 11;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    // 600 atoms in a few clusters, radii 1.2 to 2.1, random colours.
    const n = 600;
    const atoms = new Float32Array(4 * n), random_ = new Float32Array(4 * n), grouped = new Float32Array(4 * n);
    const palette = [[1, 0, 0], [0, 0.5, 1], [0.2, 0.9, 0.3]];
    for (let a = 0; a < n; a++) {
        const cluster = a % 5;
        atoms.set([cluster * 9 + random() * 8, (cluster % 2) * 6 + random() * 8, random() * 8, 1.2 + random() * 0.9], 4 * a);
        random_.set([random(), random(), random(), 0.5 + 0.5 * random()], 4 * a);
        const odd = random() < 0.05;
        grouped.set([...palette[odd ? Math.floor(random() * 3) : cluster % 3], 1], 4 * a);
    }
    // Points on and just off the spheres (gap -0.3 to 2.5: some beyond every band), and a few far away.
    const points: number[][] = [];
    for (let i = 0; i < 3000; i++) {
        const a = Math.floor(random() * n);
        const d = [random() - 0.5, random() - 0.5, random() - 0.5];
        const len = Math.hypot(d[0], d[1], d[2]);
        const r = atoms[4 * a + 3] - 0.3 + random() * 2.8;
        points.push([0, 1, 2].map(k => atoms[4 * a + k] + (r * d[k]) / len));
    }
    for (let i = 0; i < 50; i++) points.push([-30 - random() * 10, random() * 10, random() * 10]);

    const stand = createBuffer(device, "field", 16, BufferUsage.STORAGE, new Float32Array(4));
    const field = makeSurfaceField(device, stand, { nx: 1, ny: 1, nz: 1, origin: [0, 0, 0], spacing: 1 });
    const packed = new Float32Array(4 * points.length);
    points.forEach((p, i) => packed.set(p, 4 * i));
    const at = createBuffer(device, "points", packed.byteLength, BufferUsage.STORAGE, packed);
    const out = createBuffer(device, "out", packed.byteLength, BufferUsage.STORAGE | BufferUsage.COPY_SRC);

    const maxError: Record<string, number> = {};
    let fallbacks = 0, fallbackDiffers = 0;
    for (const [scheme, colours] of [["random", random_], ["grouped", grouped]] as const) for (const width of [0, 0.4, 1.0]) {
        // Awaited: the shortcut past the blend is written after the colours (writeColours).
        await attachSurfaceColouring(field, atoms, colours, BAND, width);
        const c = field.colouring!;
        const uniform = createBuffer(device, "grid", 80, BufferUsage.UNIFORM, new Uint8Array(surfaceFieldUniform(field, true)));
        const encoder = device.createCommandEncoder();
        kernel.dispatch(encoder, { groups: [[uniform], [c.atoms, c.colours, c.binStart, c.binMembers, at, out, stand]], items: points.length });
        device.queue.submit([encoder.finish()]);
        const gpu = new Float32Array(await readBuffer(device, out, packed.byteLength));
        uniform.destroy();
        let worst = 0;
        points.forEach((p, i) => {
            const cpu = cpuColour(atoms, colours, p, width);
            if (cpu[0] < 0) {
                if (width === 0.4 && scheme === "random") fallbacks++;
                if (gpu[4 * i] !== -1 && width === 0.4 && scheme === "random") fallbackDiffers++;
                return;
            }
            for (let k = 0; k < 3; k++) worst = Math.max(worst, Math.abs(gpu[4 * i + k] - cpu[k]));
        });
        maxError[`${scheme} ${width}`] = worst;
    }
    [stand, at, out].forEach(b => b.destroy());
    return { points: points.length, fallbacks, fallbackDiffers, maxError };
});
