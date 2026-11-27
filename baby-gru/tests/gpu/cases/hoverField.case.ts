/**
 * The hover overlay on a smooth surface shaded per pixel from its field (hoverOverlay.ts,
 * vs_hover_overlay_field / fs_hover_overlay_field), and per-pixel shading switched at draw time
 * (smoothSurfaceSetting.fieldShading, pixelColours; a snapshot's bestSurfaces).
 *
 * The surface is a flat strip at z = 0 facing the viewer, three quads across x = -8..8, over a field
 * f = z whose gradient is the strip's true normal - while the strip's vertex normals are tilted, so
 * a picture lit by the vertices' normals and one lit by the field's are told apart. Two atoms behind
 * it, residue 0 at x = -4 and residue 1 at x = 4, colour it per pixel (both blue). The vertices' hover
 * shares say residue 0 has all of the left quad and none of the right, and blend linearly across the
 * middle quad (x = -2..2), as a coarse mesh's would; per pixel, residue 0 has everything left of
 * x = 0, give or take the colour blend's 0.2 A.
 *
 * Hovering residue 0, the overlay should be the strip in orange, lit by the field, wherever residue 0
 * has all of a pixel - left of x = -0.5 - and nothing at all right of x = 0.5: the per-pixel edge, not
 * the vertices' ramp, which would light half of x = 1 and leave x = -1 three quarters lit. Without
 * the atoms' residues (no per-pixel share), the vertices' ramp. And the same over the strip made
 * transparent, where the overlay first lays down the strip's depth.
 */
import { WebGPUPreviewRenderer } from "../../../src/WebGPUComponents/previewRenderer";
import type { PreviewCameraSource } from "../../../src/WebGPUComponents/previewScene";
import type { DisplayBuffer } from "../../../src/WebGLgComponents/displayBuffer";
import { BufferUsage, createBuffer } from "../../../src/WebGPUComponents/gpu";
import { type SurfaceField, attachSurfaceColouring, makeSurfaceField } from "../../../src/WebGPUComponents/smoothSurface/surfaceField";
import { smoothSurfaceSetting } from "../../../src/utils/smoothSurface";
import { defineCase } from "../helpers/browserCase";

const WIDTH = 240, HEIGHT = 120;
const ZOOM = 0.3;
/** Pixels per A: the view is 48 x zoom A high. */
const SCALE = HEIGHT / (48 * ZOOM);

const baseCamera: PreviewCameraSource = {
    myQuat: [0, 0, 0, 1], origin: [0, 0, 0], zoom: ZOOM, fogClipOffset: 250,
    gl_clipPlane0: [0, 0, -1, -230], gl_clipPlane1: [0, 0, 1, 270], gl_fog_start: 250, gl_fog_end: 290,
    doPerspectiveProjection: false,
    light_positions: [10, 10, 60, 1], light_colours_ambient: [0.2, 0.2, 0.2, 1], light_colours_diffuse: [0.6, 0.6, 0.6, 1],
    light_colours_specular: [0.4, 0.4, 0.4, 1], specularPower: 64, background_colour: [0, 0, 0, 1],
};

function camera(hovered: boolean, transparency = false): PreviewCameraSource {
    return {
        ...baseCamera,
        state: { hoveridx: hovered ? 0 : -1, hover_point: hovered ? 0 : -1 },
        pickLevel: 0,
        doOrderIndependentTransparency: transparency,
        store: { getState: () => ({ hoveringStates: { hoveredSection: null } }) },
    };
}

const BLUE = [0.3, 0.4, 0.8, 1];
const ORANGE = [0.9, 0.5, 0.0, 1];
const QUAD_X = [-8, -2, 2, 8];

/** The strip: vertices at x = QUAD_X, y = +-2, z = 0; normals tilted; residue 0's share 1, 1, 0, 0 by x. */
function strip(colour: number[], field: SurfaceField): DisplayBuffer {
    const positions: number[] = [], normals: number[] = [], colours: number[] = [], indices: number[] = [];
    const tilt = [0.6, 0, 0.8];
    QUAD_X.forEach(x => {
        positions.push(x, -2, 0, x, 2, 0);
        normals.push(...tilt, ...tilt);
        colours.push(...colour, ...colour);
    });
    for (let q = 0; q < 3; q++) {
        const a = 2 * q;
        indices.push(a, a + 2, a + 3, a, a + 3, a + 1);
    }
    // Each vertex's owners: residue 0 (code 0) with the share, residue 1 (code 1) with the rest.
    const share = [1, 1, 0, 0].flatMap(s => [s, s]);
    const points: number[] = [], weights: number[] = [], ends: number[] = [];
    share.forEach(s => {
        if (s > 0) { points.push(0); weights.push(s); }
        if (s < 1) { points.push(1); weights.push(1 - s); }
        ends.push(points.length);
    });
    return {
        id: "strip", visible: true, alphaMultiplier: 1, dataVersion: 1, bufferTypes: ["TRIANGLES"],
        triangleVertices: [new Float32Array(positions)], triangleNormals: [new Float32Array(normals)],
        triangleColours: [new Float32Array(colours)], triangleIndexs: [new Uint32Array(indices)],
        transparent: colour[3] < 0.99,
        fieldShading: [field],
        pick_info: {
            pick_points: [[-4, 0, 0], [4, 0, 0]],
            owner_codes: new Uint32Array([0, 1]),
            influence: { weights: new Float32Array(weights), point_indexes: new Uint32Array(points), index_offsets: new Uint32Array(ends) },
        },
    } as unknown as DisplayBuffer;
}

/** The field f = z on a grid round the strip: its gradient (0, 0, 1) everywhere inside. */
function planeField(device: GPUDevice): SurfaceField {
    const nx = 25, ny = 11, nz = 7, origin = [-12, -5, -3], spacing = 1;
    const values = new Float32Array(nx * ny * nz);
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) values[(k * ny + j) * nx + i] = origin[2] + k * spacing;
    const buffer = createBuffer(device, "plane field", values.byteLength, BufferUsage.STORAGE, values);
    return makeSurfaceField(device, buffer, { nx, ny, nz, origin, spacing });
}

const ATOMS = new Float32Array([-4, 0, -1.5, 1.4, 4, 0, -1.5, 1.4]);
const ATOM_BLUE = new Float32Array([...BLUE, ...BLUE]);

/** Pixel columns whose centre is left of x0 A, or right of x1 (the camera is centred on x = 0). */
const columnsLeftOf = (x0: number) => (p: number) => ((p % WIDTH) + 0.5 - WIDTH / 2) / SCALE < x0;
const columnsRightOf = (x1: number) => (p: number) => ((p % WIDTH) + 0.5 - WIDTH / 2) / SCALE > x1;

const maxDiff = (a: Uint8ClampedArray, b: Uint8ClampedArray, i: number): number =>
    Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));

/** Covered pixels for which `where` holds: how many, and how many of them match `expected` (within 2 levels). */
function matching(shot: Uint8ClampedArray, expected: Uint8ClampedArray, covered: Uint8ClampedArray, where: (p: number) => boolean) {
    let pixels = 0, matched = 0, worst = 0;
    for (let p = 0; p < WIDTH * HEIGHT; p++) {
        const i = 4 * p;
        // Clear of the strip's top and bottom edges, which are antialiased against the background.
        const row = Math.floor(p / WIDTH);
        if (covered[i] + covered[i + 1] + covered[i + 2] === 0 || Math.abs(row + 0.5 - HEIGHT / 2) > 1.6 * SCALE || !where(p)) continue;
        pixels++;
        const d = maxDiff(shot, expected, i);
        worst = Math.max(worst, d);
        if (d <= 2) matched++;
    }
    return { pixels, matched, worst };
}

export type Match = ReturnType<typeof matching>;

export interface HoverFieldReport {
    /** Lit by the field, not the tilted vertex normals: a field-shaded picture differs from a per-vertex one. */
    fieldVersusVertexDiffer: number;
    /** Per pixel, residue 0 hovered: orange (lit by the field) left of -0.5 A, untouched right of 0.5. */
    pixelLeft: Match;
    pixelRight: Match;
    /** The same over the strip made transparent (blended): the overlay on top, as opaque as the share. */
    glassLeft: Match;
    glassRight: Match;
    /** Without the atoms' residues: the vertices' ramp, so right of 0.5 A some pixels lit. */
    rampRightChanged: number;
    /** fieldShading off for the canvas: drawn per vertex; a snapshot with bestSurfaces: per pixel anyway. */
    settingOffDiffersFromField: number;
    bestSurfacesDiffersFromField: number;
    rendererErrors: string[];
}

export default defineCase(async (device: GPUDevice): Promise<HoverFieldReport> => {
    const rendererErrors: string[] = [];
    const renderer = await WebGPUPreviewRenderer.create(document.createElement("canvas"), message => rendererErrors.push(message));
    const saved = { fieldShading: smoothSurfaceSetting.fieldShading, pixelColours: smoothSurfaceSetting.pixelColours };
    const fields: SurfaceField[] = [];
    const shot = async (buffers: DisplayBuffer[], cam: PreviewCameraSource, bestSurfaces = false) =>
        (await renderer.snapshot(buffers, cam, [], WIDTH, HEIGHT, { bestSurfaces })).data;
    const differ = (a: Uint8ClampedArray, b: Uint8ClampedArray) => {
        let n = 0;
        for (let i = 0; i < a.length; i += 4) if (maxDiff(a, b, i) > 2) n++;
        return n;
    };
    try {
        smoothSurfaceSetting.fieldShading = true;
        smoothSurfaceSetting.pixelColours = true;
        const field = (residues: boolean) => {
            const f = planeField(device);
            fields.push(f);
            return attachSurfaceColouring(f, ATOMS, ATOM_BLUE, 5, 0.2, residues ? new Int32Array([0, 1]) : undefined).then(() => f);
        };
        const coloured = await field(true);
        const unowned = await field(false);
        // The orange reference: no atoms, so its own (orange) vertex colours, lit by the field.
        const bare = planeField(device);
        fields.push(bare);

        const plain = await shot([strip(BLUE, coloured)], camera(false));
        const orange = await shot([strip(ORANGE, bare)], camera(false));
        const lit = await shot([strip(BLUE, coloured)], camera(true));
        const glass = [...BLUE.slice(0, 3), 0.5];
        const glassPlain = await shot([strip(glass, coloured)], camera(false));
        const glassLit = await shot([strip(glass, coloured)], camera(true));
        const ramp = await shot([strip(BLUE, unowned)], camera(true));
        const rampPlain = await shot([strip(BLUE, unowned)], camera(false));

        smoothSurfaceSetting.fieldShading = false;
        const perVertex = await shot([strip(ORANGE, bare)], camera(false));
        const best = await shot([strip(ORANGE, bare)], camera(false), true);
        smoothSurfaceSetting.fieldShading = true;

        let rampRightChanged = 0;
        for (let p = 0; p < WIDTH * HEIGHT; p++) {
            if (columnsRightOf(0.5)(p) && ((p % WIDTH) + 0.5 - WIDTH / 2) / SCALE < 1.5 && maxDiff(ramp, rampPlain, 4 * p) > 2) rampRightChanged++;
        }
        return {
            fieldVersusVertexDiffer: differ(orange, perVertex),
            pixelLeft: matching(lit, orange, plain, columnsLeftOf(-0.5)),
            pixelRight: matching(lit, plain, plain, columnsRightOf(0.5)),
            glassLeft: matching(glassLit, orange, glassPlain, columnsLeftOf(-0.5)),
            glassRight: matching(glassLit, glassPlain, glassPlain, columnsRightOf(0.5)),
            rampRightChanged,
            settingOffDiffersFromField: differ(perVertex, orange),
            bestSurfacesDiffersFromField: differ(best, orange),
            rendererErrors,
        };
    } finally {
        Object.assign(smoothSurfaceSetting, saved);
        renderer.destroy();
        fields.forEach(f => f.buffer.destroy());
    }
});
