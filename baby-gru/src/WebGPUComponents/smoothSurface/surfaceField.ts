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
    /** RGBA per atom (vec4): rewritten by setSurfaceColours. */
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
}

/**
 * The widest colour blend the bins are made for, Å: wider and the farthest atoms that should still
 * count may be outside the cells searched (they would then be left out, not wrongly included).
 */
export const MAX_COLOUR_BLEND = 1.0;

/**
 * Colour `field`'s surface per pixel from `atoms` (x, y, z, r per atom, as it was made from) and their
 * `colours` (RGBA per atom). Replaces any colouring it had.
 */
export function attachSurfaceColouring(field: SurfaceField, atoms: Float32Array, colours: Float32Array, band: number, width: number): void {
    const device = devices.get(field);
    if (!device || field.released) return;
    destroyColouring(field.colouring);
    let rMax = 0;
    for (let i = 3; i < atoms.length; i += 4) rMax = Math.max(rMax, atoms[i]);
    // Cells half the reach, searched two cells out: the reach covered, fewer atoms read than with
    // cells the reach's size searched one out.
    const reach = rMax + band + 2 * MAX_COLOUR_BLEND;
    const binSize = reach / 2;
    const bins = binAtoms(atoms, binSize);
    const make = (label: string, data: ArrayBufferView & { byteLength: number }) => {
        const buffer = device.createBuffer({
            label: `surface colouring ${label}`, size: Math.max(16, Math.ceil(data.byteLength / 4) * 4),
            usage: BufferUsage.STORAGE | BufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(buffer, 0, data);
        return buffer;
    };
    field.colouring = {
        atoms: make("atoms", atoms), colours: make("colours", colours),
        binStart: make("bin start", bins.start), binMembers: make("bin members", bins.members),
        binLow: bins.low, binDims: bins.dims, binSize, band, width,
    };
}

/** New colours (RGBA per atom) and blend width for a surface coloured per pixel: no new surface, no new bins. */
export function setSurfaceColours(field: SurfaceField, colours: Float32Array, width: number): void {
    const device = devices.get(field);
    if (!device || !field.colouring || field.released) return;
    device.queue.writeBuffer(field.colouring.colours, 0, colours);
    field.colouring.width = width;
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
        f.set([c.band, Math.min(c.width, MAX_COLOUR_BLEND), 0, 0], 16);
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
    // along each axis, and w 1 to colour from the atoms (0: the vertex colours); the band and width.
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
 * normalised. `fallback` (the vertex colour) where colouring is off or no atom is within its band.
 */
export const ATOM_COLOUR_WGSL = /* wgsl */ `
fn atomColourAt(p: vec3f, fallback: vec4f) -> vec4f {
    if (fieldGrid.binDims.w == 0u) { return fallback; }
    let band = fieldGrid.colour.x;
    let width = fieldGrid.colour.y;
    let c = vec3i(floor((p - fieldGrid.binLow.xyz) / fieldGrid.binLow.w));
    let lo = max(vec3i(0), c - vec3i(2));
    let hi = min(vec3i(fieldGrid.binDims.xyz) - vec3i(1), c + vec3i(2));
    if (any(lo > hi)) { return fallback; }
    var g0 = 3.4e38;
    var nearest = -1;
    for (var k = lo.z; k <= hi.z; k++) {
        for (var j = lo.y; j <= hi.y; j++) {
            let row = (u32(k) * fieldGrid.binDims.y + u32(j)) * fieldGrid.binDims.x;
            for (var m = colourBinStart[row + u32(lo.x)]; m < colourBinStart[row + u32(hi.x) + 1u]; m++) {
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
    if (width <= 0.0) { return atomColours[nearest]; }
    let R = 2.0 * width;
    var sum = vec4f(0.0);
    var total = 0.0;
    for (var k = lo.z; k <= hi.z; k++) {
        for (var j = lo.y; j <= hi.y; j++) {
            let row = (u32(k) * fieldGrid.binDims.y + u32(j)) * fieldGrid.binDims.x;
            for (var m = colourBinStart[row + u32(lo.x)]; m < colourBinStart[row + u32(hi.x) + 1u]; m++) {
                let a = colourBinMembers[m];
                let atom = colourAtoms[a];
                let d = p - atom.xyz;
                let reach = atom.w + g0 + R;
                if (dot(d, d) >= reach * reach) { continue; }
                let t = 1.0 - (length(d) - atom.w - g0) / R;
                if (t <= 0.0) { continue; }
                sum += t * t * atomColours[a];
                total += t * t;
            }
        }
    }
    return sum / total;
}
`;
