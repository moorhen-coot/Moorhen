/**
 * A smooth surface's field, kept on the GPU after the surface is made, for shading it per pixel: the
 * WebGPU renderer takes each fragment's normal from the field's gradient (previewShaders.ts,
 * fs_field) instead of interpolating the vertices' normals across the triangles - so the shading has
 * no trace of the triangles, and the surface needs no split to hide them (webgpu.md, "Per-pixel
 * normals").
 *
 * The gradient is that of the field's cubic B-spline: smooth (C2), so the normals have no creases at
 * the grid's cell faces, as a Catmull-Rom's or a trilinear's would (squares in the highlights). 64
 * exact loads a fragment; not hardware-filtered, whose weights have 8 bits and would bring steps back
 * into a derivative.
 *
 * And its atoms, for colouring it per pixel (attachSurfaceColouring): each fragment's colour from the
 * atoms nearest it, by the same weights as a vertex's (smoothSurface.ts blendWeights) but over every
 * atom within reach rather than the nearest four - so colour boundaries follow the surface at screen
 * resolution, with no triangle-sized steps, and are continuous everywhere.
 */
import { BufferUsage } from "../gpu";
import { binAtoms } from "./gpuSmoothSurface";
import { type Sliced, runNow, runSliced } from "../../utils/timeSlicing";

/** The field, as the GPU finish contours it: float32, x fastest, negative inside, 0 on the surface. */
export interface SurfaceField {
    /** STORAGE; the grid's values. Owned by whoever holds the field: releaseSurfaceField. */
    buffer: GPUBuffer;
    dims: [number, number, number];
    origin: [number, number, number];
    spacing: number;
    /** For per-pixel colour: the surface's atoms and their colours, if attached. */
    colouring?: SurfaceColouring;
    /** Set by releaseSurfaceField: drawn no more from now on, whatever still refers to it. */
    released?: boolean;
}

/**
 * The device each field's buffers are on. Not a property: a field hangs off DisplayBuffers, which the
 * store's types walk, and a GPUDevice does not survive that walk.
 */
const devices = new WeakMap<SurfaceField, GPUDevice>();

/** A field kept on `device`, from its grid's values (`buffer`, STORAGE) and the grid. */
export function makeSurfaceField(device: GPUDevice, buffer: GPUBuffer, grid: { nx: number; ny: number; nz: number; origin: ArrayLike<number>; spacing: number }): SurfaceField {
    const field: SurfaceField = {
        buffer, dims: [grid.nx, grid.ny, grid.nz], origin: [grid.origin[0], grid.origin[1], grid.origin[2]], spacing: grid.spacing,
    };
    devices.set(field, device);
    return field;
}

/** A surface's atoms on the GPU, for colouring it per pixel. */
export interface SurfaceColouring {
    /** x, y, z, radius per atom (vec4), as the surface was made from them. */
    atoms: GPUBuffer;
    /**
     * RGB per atom, and in alpha its colour's reach (colourReach): rewritten by setSurfaceColours. The
     * colours' own alpha is never drawn (the representation's opacity is the vertex colours').
     */
    colours: GPUBuffer;
    /** The atoms binned (binAtoms): CSR start per cell, and the members. */
    binStart: GPUBuffer;
    binMembers: GPUBuffer;
    binLow: number[];
    binDims: number[];
    binSize: number;
    /** How far from its sphere a point can be and still take an atom's colour (ownershipBand), Å. */
    band: number;
    /** The colour blend's width, Å (smoothSurfaceSetting.colourBlend): 0 for each point its nearest atom's. */
    width: number;
    /** The largest atom radius, Å: how far round a point the atoms that can count are searched for. */
    rMax: number;
}

/**
 * The widest colour blend drawn, Å: wider is drawn this wide. Each pixel reads every atom within
 * the largest radius + band + twice the width of it, so this bounds the cost.
 */
export const MAX_COLOUR_BLEND = 1.0;

/**
 * What colourReach needs again when the colours change: the atoms and their bins, on the CPU. Not on
 * SurfaceColouring, which the store's types walk.
 */
const reachInputs = new WeakMap<SurfaceColouring, { atoms: Float32Array; bins: ReturnType<typeof binAtoms>; generation: number }>();

/**
 * colourReach's bins, Å: its own, coarser than the pixels' - each holding a few atoms, so that the
 * cells of one colour passed over whole are most of them. 5 Å was the fastest of 1.5 to 5 (100k atoms:
 * about 120 ms, against 600 at the pixels' size).
 */
const REACH_BIN = 5;

/** colourReach's value for an atom that overlaps one of another colour: the shortcut never taken. */
export const REACH_NEVER = Math.fround(-1e30);

/**
 * Per atom, how far its colour reaches unchallenged: the least |a - n| - r_a - r_n over the atoms a
 * of another colour, capped at `cap`. A pixel whose nearest sphere n is g0 away takes colour only from
 * atoms whose gap is under g0 + R, and any such a has |a - n| - r_a - r_n < 2 g0 + R (the triangle
 * through the pixel). So where n's reach is at least 2 g0 + R, every atom the blend would weigh is
 * n's colour, and the blend is n's colour: ATOM_COLOUR_WGSL skips it - exactly, a pixel of a surface
 * coloured by chain or by residue anywhere but near a boundary. With the cap at 2 x band + 2 x the
 * widest blend, atoms whose centres are further than cap + both radii never need looking at.
 *
 * Any value at most the true reach is as correct, only skipping less. So an atom overlapping one of
 * another colour (a negative reach: only a pixel inside its sphere could use it) is REACH_NEVER, found
 * in the few cells round it without searching the rest - which is nearly every atom coloured by
 * element. And cells holding only the atom's own colour are passed over whole - nearly every cell
 * coloured by chain. About a tenth of a second for 100k atoms either way, rather than most of one;
 * and run in slices (writeColours).
 */
export function colourReach(atoms: Float32Array, colours: Float32Array, bins: ReturnType<typeof binAtoms>, binSize: number, cap: number): Float32Array {
    return runNow(colourReachSliced(atoms, colours, bins, binSize, cap));
}

/** colourReach in slices (timeSlicing.ts), of a few thousand atoms. */
export function* colourReachSliced(atoms: Float32Array, colours: Float32Array, bins: ReturnType<typeof binAtoms>, binSize: number, cap: number): Sliced<Float32Array> {
    const n = atoms.length / 4;
    const reach = new Float32Array(n);
    let rMax = 0;
    for (let i = 3; i < atoms.length; i += 4) rMax = Math.max(rMax, atoms[i]);
    const { low, dims, start, members } = bins;
    const same = (a: number, b: number) =>
        colours[4 * a] === colours[4 * b] && colours[4 * a + 1] === colours[4 * b + 1] && colours[4 * a + 2] === colours[4 * b + 2];
    // Per cell: an atom whose colour all of the cell's share, or -1 for a cell of several (or none).
    const cells = dims[0] * dims[1] * dims[2];
    const cellColour = new Int32Array(cells).fill(-1);
    for (let c = 0; c < cells; c++) {
        if (start[c] === start[c + 1]) continue;
        const first = members[start[c]];
        let one = true;
        for (let m = start[c] + 1; m < start[c + 1] && one; m++) one = same(members[m], first);
        if (one) cellColour[c] = first;
    }
    for (let i = 0; i < n; i++) {
        if ((i & 4095) === 4095) yield;
        const x = atoms[4 * i], y = atoms[4 * i + 1], z = atoms[4 * i + 2], r = atoms[4 * i + 3];
        const cx = (x - low[0]) / binSize, cy = (y - low[1]) / binSize, cz = (z - low[2]) / binSize;
        let best = cap;
        // Every atom of another colour within `radius` of i's centre, cell by cell.
        const scan = (radius: number) => {
            const s = radius / binSize;
            const x0 = Math.max(0, Math.floor(cx - s)), x1 = Math.min(dims[0] - 1, Math.floor(cx + s));
            const y0 = Math.max(0, Math.floor(cy - s)), y1 = Math.min(dims[1] - 1, Math.floor(cy + s));
            const z0 = Math.max(0, Math.floor(cz - s)), z1 = Math.min(dims[2] - 1, Math.floor(cz + s));
            for (let k = z0; k <= z1; k++) {
                for (let j = y0; j <= y1; j++) {
                    const row = (k * dims[1] + j) * dims[0];
                    for (let c = row + x0; c <= row + x1; c++) {
                        const one = cellColour[c];
                        if (one >= 0 && same(one, i)) continue;
                        for (let m = start[c], end = start[c + 1]; m < end; m++) {
                            const a = members[m];
                            if (same(a, i)) continue;
                            const dx = atoms[4 * a] - x, dy = atoms[4 * a + 1] - y, dz = atoms[4 * a + 2] - z;
                            const ra = atoms[4 * a + 3];
                            const limit = best + r + ra;
                            const d2 = dx * dx + dy * dy + dz * dz;
                            if (d2 >= limit * limit) continue;
                            best = Math.sqrt(d2) - r - ra;
                        }
                    }
                }
            }
        };
        // First the overlapping atoms' reach, then - if none - out to the cap, or the nearest found.
        scan(r + rMax);
        if (best < 0) {
            reach[i] = REACH_NEVER;
            continue;
        }
        scan(best + r + rMax);
        reach[i] = best;
    }
    return reach;
}

/**
 * Writes the colours as the GPU reads them: each atom's RGB, and its reach in alpha. At once with
 * every reach REACH_NEVER - the blend never skipped, the picture already right - then, the reach worked
 * out in slices off the frame (a tenth of a second for 100k atoms), again with it. Resolves when that
 * is written, or would have been: not if newer colours came meanwhile, or the colouring went.
 */
async function writeColours(field: SurfaceField, colouring: SurfaceColouring, colours: Float32Array): Promise<void> {
    const device = devices.get(field);
    const inputs = reachInputs.get(colouring);
    if (!device || !inputs) return;
    const generation = ++inputs.generation;
    const out = colours.slice();
    for (let i = 3; i < out.length; i += 4) out[i] = REACH_NEVER;
    device.queue.writeBuffer(colouring.colours, 0, out);
    const cap = 2 * colouring.band + 2 * MAX_COLOUR_BLEND;
    const reach = await runSliced(colourReachSliced(inputs.atoms, colours, inputs.bins, REACH_BIN, cap));
    if (inputs.generation !== generation || field.colouring !== colouring || field.released) return;
    for (let i = 0; i < reach.length; i++) out[4 * i + 3] = reach[i];
    device.queue.writeBuffer(colouring.colours, 0, out);
}

/**
 * Colour `field`'s surface per pixel from `atoms` (x, y, z, r per atom, as it was made from) and their
 * `colours` (RGBA per atom). Replaces any colouring it had. Drawn from now; resolves when the shortcut
 * past the blend is in place too (writeColours), which nobody needs to wait for but a test.
 */
export async function attachSurfaceColouring(field: SurfaceField, atoms: Float32Array, colours: Float32Array, band: number, width: number): Promise<void> {
    const device = devices.get(field);
    if (!device || field.released) return;
    destroyColouring(field.colouring);
    let rMax = 0;
    for (let i = 3; i < atoms.length; i += 4) rMax = Math.max(rMax, atoms[i]);
    // Each pixel searches the cells its own radius reaches (ATOM_COLOUR_WGSL): the smaller the cells,
    // the less the box of cells holds beyond that sphere, but the more rows of cells to walk. Half
    // the nearest-atom search's radius.
    const binSize = Math.max(0.5, (rMax + band) / 2);
    const bins = binAtoms(atoms, binSize);
    const make = (label: string, data: ArrayBufferView & { byteLength: number }) => {
        const buffer = device.createBuffer({
            label: `surface colouring ${label}`, size: Math.max(16, Math.ceil(data.byteLength / 4) * 4),
            usage: BufferUsage.STORAGE | BufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(buffer, 0, data);
        return buffer;
    };
    const colouring: SurfaceColouring = {
        atoms: make("atoms", atoms), colours: make("colours", new Float32Array(colours.length)),
        binStart: make("bin start", bins.start), binMembers: make("bin members", bins.members),
        binLow: bins.low, binDims: bins.dims, binSize, band, width, rMax,
    };
    reachInputs.set(colouring, { atoms: atoms.slice(), bins: binAtoms(atoms, REACH_BIN), generation: 0 });
    field.colouring = colouring;
    await writeColours(field, colouring, colours);
}

/**
 * New colours (RGBA per atom) and blend width for a surface coloured per pixel: no new surface, no new
 * bins. Resolves as attachSurfaceColouring does.
 */
export async function setSurfaceColours(field: SurfaceField, colours: Float32Array, width: number): Promise<void> {
    const device = devices.get(field);
    if (!device || !field.colouring || field.released) return;
    field.colouring.width = width;
    await writeColours(field, field.colouring, colours);
}

function destroyColouring(colouring: SurfaceColouring | undefined, delayMs = 0): void {
    if (!colouring) return;
    const buffers = [colouring.atoms, colouring.colours, colouring.binStart, colouring.binMembers];
    setTimeout(() => buffers.forEach(b => b.destroy()), delayMs);
}

/**
 * Done with a field: its buffer destroyed - a little later, as a frame already recorded may still
 * draw with it, and a destroyed buffer in a submit is an error that would end WebGPU drawing.
 */
export function releaseSurfaceField(field: SurfaceField | null | undefined, delayMs = 1000): void {
    if (!field || field.released) return;
    field.released = true;
    setTimeout(() => field.buffer.destroy(), delayMs);
    destroyColouring(field.colouring, delayMs);
}

/** Bytes in a FieldGrid uniform block (FIELD_GRADIENT_WGSL). */
export const FIELD_GRID_BYTES = 80;

/**
 * The FieldGrid uniform block the WGSL below reads: the grid, and for per-pixel colour (`atomColours`,
 * with colouring attached) the atom bins, band and width.
 */
export function surfaceFieldUniform(field: SurfaceField, atomColours = false): ArrayBuffer {
    const block = new ArrayBuffer(FIELD_GRID_BYTES);
    const f = new Float32Array(block), u = new Uint32Array(block);
    f.set([...field.origin, field.spacing], 0);
    u.set([...field.dims, 0], 4);
    const c = atomColours ? field.colouring : undefined;
    if (c) {
        f.set([c.binLow[0], c.binLow[1], c.binLow[2], c.binSize], 8);
        u.set([c.binDims[0], c.binDims[1], c.binDims[2], 1], 12);
        f.set([c.band, Math.min(c.width, MAX_COLOUR_BLEND), c.rMax, 0], 16);
    }
    return block;
}

/**
 * The field's B-spline gradient at a point, in WGSL: `fieldGradient(p)`, per Å. Reads `fieldGrid`
 * (a FieldGrid uniform) and `fieldValues` (array<f32>), which whoever includes it declares, at their
 * own bindings. The grid's coordinates are clamped at its edges.
 */
export const FIELD_GRADIENT_WGSL = /* wgsl */ `
struct FieldGrid {
    origin: vec4f,   // xyz, and the spacing in w
    dims: vec4u,
    // Per-pixel colour (ATOM_COLOUR_WGSL): the atom bins' lowest corner and cell size; their counts
    // along each axis, and w 1 to colour from the atoms (0: the vertex colours); the band, width and
    // largest atom radius.
    binLow: vec4f,
    binDims: vec4u,
    colour: vec4f,
};

fn fieldValueAt(i: i32, j: i32, k: i32) -> f32 {
    let x = u32(clamp(i, 0, i32(fieldGrid.dims.x) - 1));
    let y = u32(clamp(j, 0, i32(fieldGrid.dims.y) - 1));
    let z = u32(clamp(k, 0, i32(fieldGrid.dims.z) - 1));
    return fieldValues[(z * fieldGrid.dims.y + y) * fieldGrid.dims.x + x];
}

// The uniform cubic B-spline's weights at t in [0, 1), for points -1, 0, 1, 2, and their derivatives.
fn bsplineWeights(t: f32) -> vec4f {
    let s = 1.0 - t;
    let t2 = t * t;
    let t3 = t2 * t;
    return vec4f(s * s * s, 3.0 * t3 - 6.0 * t2 + 4.0, -3.0 * t3 + 3.0 * t2 + 3.0 * t + 1.0, t3) / 6.0;
}
fn bsplineDerivatives(t: f32) -> vec4f {
    let s = 1.0 - t;
    return vec4f(-s * s, 3.0 * t * t - 4.0 * t, -3.0 * t * t + 2.0 * t + 1.0, t * t) * 0.5;
}

fn fieldGradient(p: vec3f) -> vec3f {
    let u = (p - fieldGrid.origin.xyz) / fieldGrid.origin.w;
    let cell = floor(u);
    let f = u - cell;
    let base = vec3i(cell) - vec3i(1);
    let wx = bsplineWeights(f.x); let wy = bsplineWeights(f.y); let wz = bsplineWeights(f.z);
    let dx = bsplineDerivatives(f.x); let dy = bsplineDerivatives(f.y); let dz = bsplineDerivatives(f.z);
    var g = vec3f(0.0);
    for (var c = 0; c < 4; c++) {
        for (var b = 0; b < 4; b++) {
            // The x row's three sums: the value weights, and the derivative weights along x.
            var row = 0.0;
            var rowDx = 0.0;
            for (var a = 0; a < 4; a++) {
                let v = fieldValueAt(base.x + a, base.y + b, base.z + c);
                row += wx[a] * v;
                rowDx += dx[a] * v;
            }
            g += vec3f(rowDx * wy[b] * wz[c], row * dy[b] * wz[c], row * wy[b] * dz[c]);
        }
    }
    return g / fieldGrid.origin.w;
}
`;

/**
 * A fragment's colour from the surface's atoms, in WGSL: `atomColourAt(p, fallback)`. Reads
 * `fieldGrid` and `colourAtoms`, `atomColours`, `colourBinStart`, `colourBinMembers` (vec4f, vec4f,
 * u32, u32), declared by whoever includes it. The weights are blendWeights': the nearest sphere's gap
 * g0 = |p - a| - r first, then every atom within reach weighted (1 - (g - g0) / R)², R = 2 x width,
 * normalised - skipped where the nearest atom's colour reaches past all of them (colourReach). RGB,
 * alpha 1; `fallback` (the vertex colour) where colouring is off or no atom is within its band.
 */
export const ATOM_COLOUR_WGSL = /* wgsl */ `
// The atom bins' cells within \`radius\` of p, as a box: lowest and highest cell, clamped to the bins.
fn colourCells(p: vec3f, radius: f32) -> array<vec3i, 2> {
    let low = (p - fieldGrid.binLow.xyz) / fieldGrid.binLow.w;
    let r = radius / fieldGrid.binLow.w;
    let lo = max(vec3i(0), vec3i(floor(low - r)));
    let hi = min(vec3i(fieldGrid.binDims.xyz) - vec3i(1), vec3i(floor(low + r)));
    return array<vec3i, 2>(lo, hi);
}

fn atomColourAt(p: vec3f, fallback: vec4f) -> vec4f {
    if (fieldGrid.binDims.w == 0u) { return fallback; }
    let band = fieldGrid.colour.x;
    let width = fieldGrid.colour.y;
    let rMax = fieldGrid.colour.z;
    // The nearest sphere's gap, among the atoms within their band: only atoms within rMax + band of p.
    var box = colourCells(p, rMax + band);
    if (any(box[0] > box[1])) { return fallback; }
    var g0 = 3.4e38;
    var nearest = -1;
    for (var k = box[0].z; k <= box[1].z; k++) {
        for (var j = box[0].y; j <= box[1].y; j++) {
            let row = (u32(k) * fieldGrid.binDims.y + u32(j)) * fieldGrid.binDims.x;
            for (var m = colourBinStart[row + u32(box[0].x)]; m < colourBinStart[row + u32(box[1].x) + 1u]; m++) {
                let a = colourBinMembers[m];
                let atom = colourAtoms[a];
                let d = p - atom.xyz;
                let reach = atom.w + band;
                if (dot(d, d) >= reach * reach) { continue; }
                let g = length(d) - atom.w;
                if (g < g0) { g0 = g; nearest = i32(a); }
            }
        }
    }
    if (nearest < 0) { return fallback; }
    let own = atomColours[nearest];
    if (width <= 0.0) { return vec4f(own.rgb, 1.0); }
    // Nothing of another colour within the blend's reach (colourReach, in alpha): the blend would be
    // the nearest atom's colour.
    let R = 2.0 * width;
    if (own.a >= 2.0 * g0 + R) { return vec4f(own.rgb, 1.0); }
    // Every atom whose gap is within R of the nearest's: only atoms within rMax + g0 + R of p.
    box = colourCells(p, rMax + g0 + R);
    var sum = vec3f(0.0);
    var total = 0.0;
    for (var k = box[0].z; k <= box[1].z; k++) {
        for (var j = box[0].y; j <= box[1].y; j++) {
            let row = (u32(k) * fieldGrid.binDims.y + u32(j)) * fieldGrid.binDims.x;
            for (var m = colourBinStart[row + u32(box[0].x)]; m < colourBinStart[row + u32(box[1].x) + 1u]; m++) {
                let a = colourBinMembers[m];
                let atom = colourAtoms[a];
                let d = p - atom.xyz;
                let reach = atom.w + g0 + R;
                if (dot(d, d) >= reach * reach) { continue; }
                let t = 1.0 - (length(d) - atom.w - g0) / R;
                if (t <= 0.0) { continue; }
                sum += t * t * atomColours[a].rgb;
                total += t * t;
            }
        }
    }
    return vec4f(sum / total, 1.0);
}
`;
