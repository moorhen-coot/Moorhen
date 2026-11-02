/**
 * The hover highlight in the WebGPU renderer, as WebGL draws it (hoverHighlight.ts):
 *
 * - a section of an instanced mesh (a ribbon's residue) lightened halfway to white, chosen by the
 *   pointer, by the sequence viewer, and widened at a coarser grain; the same when the mesh is
 *   drawn in chunks, whose vertex numbers start part-way through the mesh;
 * - a whole instance of an instanced mesh;
 * - a smooth mesh's overlay (MetaBalls, surfaces): where the hovered point has all of a vertex, the
 *   mesh as if it were orange; nothing elsewhere; a chain's worth at the chain grain; a whole mesh
 *   (a cavity) all orange; asked for by the sequence viewer; in chunks; over a transparent mesh,
 *   peeled and blended.
 *
 * Pictures are compared pixel for pixel against references drawn without any hover: a section
 * lit is the unlit picture halfway to white, an overlay is the picture of the mesh coloured
 * orange. Each region is found by drawing its part alone (any coverage at all counts, so the
 * antialiased boundary between two sections is inside both).
 */
import { WebGPUPreviewRenderer } from "../../../src/WebGPUComponents/previewRenderer";
import type { PreviewCameraSource } from "../../../src/WebGPUComponents/previewScene";
import type { DisplayBuffer } from "../../../src/WebGLgComponents/displayBuffer";
import { defineCase } from "../helpers/browserCase";

const WIDTH = 240, HEIGHT = 120;

const baseCamera: PreviewCameraSource = {
    myQuat: [0, 0, 0, 1], origin: [0, 0, 0], zoom: 0.3, fogClipOffset: 250,
    gl_clipPlane0: [0, 0, -1, -230], gl_clipPlane1: [0, 0, 1, 270], gl_fog_start: 250, gl_fog_end: 290,
    doPerspectiveProjection: false,
    light_positions: [10, 10, 60, 1], light_colours_ambient: [0.2, 0.2, 0.2, 1], light_colours_diffuse: [0.6, 0.6, 0.6, 1],
    light_colours_specular: [0.4, 0.4, 0.4, 1], specularPower: 64, background_colour: [0, 0, 0, 1],
};

interface Hover {
    hoveridx?: number;
    hover_point?: number;
    pickLevel?: number;
    section?: { bufferId: string; section: number };
    transparency?: boolean;
}

function camera(hover: Hover = {}): PreviewCameraSource {
    return {
        ...baseCamera,
        state: { hoveridx: hover.hoveridx ?? -1, hover_point: hover.hover_point ?? -1 },
        pickLevel: hover.pickLevel ?? 0,
        doOrderIndependentTransparency: hover.transparency ?? false,
        store: { getState: () => ({ hoveringStates: { hoveredSection: hover.section ?? null } }) },
    };
}

/** Quads side by side along x, each with its own four vertices, facing the viewer. */
function quads(xs: number[], width: number, colour: number[]) {
    const positions: number[] = [], normals: number[] = [], colours: number[] = [], indices: number[] = [];
    xs.forEach((x, q) => {
        positions.push(x, -2, 0, x + width, -2, 0, x + width, 2, 0, x, 2, 0);
        for (let k = 0; k < 4; k++) { normals.push(0, 0, 1); colours.push(...colour); }
        indices.push(4 * q, 4 * q + 1, 4 * q + 2, 4 * q, 4 * q + 2, 4 * q + 3);
    });
    return { positions, normals, colours, indices };
}

const BLUE = [0.3, 0.4, 0.8, 1];
const ORANGE = [0.9, 0.5, 0.0, 1];
const SECTION_X = [-12, -6, 0, 6];

/** A strip of four sections, one instance at the origin, as a ribbon is drawn. `only`: just that section. */
function strip(only: number | null = null): DisplayBuffer {
    const xs = only === null ? SECTION_X : [SECTION_X[only]];
    const m = quads(xs, 6, BLUE);
    return {
        id: "strip", visible: true, alphaMultiplier: 1, dataVersion: 1, bufferTypes: ["TRIANGLES"],
        triangleVertices: [new Float32Array(m.positions)], triangleNormals: [new Float32Array(m.normals)],
        triangleColours: [new Float32Array(m.colours)], triangleIndexs: [new Uint32Array(m.indices)],
        triangleInstanceOrigins: [new Float32Array([0, 0, 0])], triangleInstanceSizes: [new Float32Array([1, 1, 1])],
        triangleInstanceOrientations: [new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])],
        pick_info: {
            pick_points: SECTION_X.map(x => [x + 3, 0, 0]),
            pick_point_sections: [0, 1, 2, 3],
            section_ranges: [[0, 4], [4, 8], [8, 12], [12, 16]],
            // Level 1 lights the sections in pairs.
            section_level_ranges: [[[0, 4], [4, 8], [8, 12], [12, 16]], [[0, 8], [0, 8], [8, 16], [8, 16]]],
        },
    } as unknown as DisplayBuffer;
}

/** One small quad, instanced three times along x. `only`: just that instance. */
function shapes(only: number | null = null): DisplayBuffer {
    const m = quads([-2], 4, BLUE);
    const origins = [-10, 0, 10].map(x => [x, 0, 0]);
    const used = only === null ? origins : [origins[only]];
    return {
        id: "shapes", visible: true, alphaMultiplier: 1, dataVersion: 1, bufferTypes: ["TRIANGLES"],
        triangleVertices: [new Float32Array(m.positions)], triangleNormals: [new Float32Array(m.normals)],
        triangleColours: [new Float32Array(m.colours)], triangleIndexs: [new Uint32Array(m.indices)],
        triangleInstanceOrigins: [new Float32Array(used.flat())],
        triangleInstanceSizes: [new Float32Array(used.flatMap(() => [1, 1, 1]))],
        triangleInstanceOrientations: [new Float32Array(used.flatMap(() => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]))],
        pick_info: { pick_points: used },
    } as unknown as DisplayBuffer;
}

/**
 * A smooth mesh of two quads (not instanced): the left one's vertices all point 0's, the right
 * one's point 1's, both of chain 0 (owner codes 0 and 1: residues 0 and 1 of chain 0). `colour`
 * for the reference pictures; `whole` for a mesh with no influence lists that lights whole.
 */
function blob(colour = BLUE, only: number | null = null, whole = false): DisplayBuffer {
    const xs = only === null ? [-8, 0] : [[-8, 0][only]];
    const m = quads(xs, 8, colour);
    const n = m.positions.length / 3;
    const ends = Uint32Array.from({ length: n }, (_, v) => v + 1);
    const points = Uint32Array.from({ length: n }, (_, v) => (v < 4 ? 0 : 1));
    return {
        id: "blob", visible: true, alphaMultiplier: 1, dataVersion: 1, bufferTypes: ["TRIANGLES"],
        triangleVertices: [new Float32Array(m.positions)], triangleNormals: [new Float32Array(m.normals)],
        triangleColours: [new Float32Array(m.colours)], triangleIndexs: [new Uint32Array(m.indices)],
        transparent: colour[3] < 0.99,
        pick_info: whole
            ? { pick_points: [[0, 0, 0]], highlight_whole: true }
            : {
                pick_points: [[-4, 0, 0], [4, 0, 0]],
                owner_codes: new Uint32Array([0, 1]),
                influence: { weights: new Float32Array(n).fill(1), point_indexes: points, index_offsets: ends },
            },
    } as unknown as DisplayBuffer;
}

/** Pixels covered at all (anything but the black background). */
function coverage(data: Uint8ClampedArray): boolean[] {
    const out: boolean[] = [];
    for (let i = 0; i < data.length; i += 4) out.push(data[i] + data[i + 1] + data[i + 2] > 0);
    return out;
}

const maxDiff = (a: Uint8ClampedArray, b: Uint8ClampedArray | number[], i: number): number =>
    Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));

/**
 * How `shot` relates to `plain` (no hover) and `lit` (what the lit pixels should be) inside and
 * outside `region`: pixels inside that match `lit`, and pixels outside that differ from `plain`.
 */
function compare(shot: Uint8ClampedArray, plain: Uint8ClampedArray, lit: Uint8ClampedArray, region: boolean[]) {
    let inside = 0, insideLit = 0, outsideChanged = 0, worstOutside = 0;
    for (let p = 0; p < region.length; p++) {
        const i = 4 * p;
        if (region[p]) {
            inside++;
            if (maxDiff(shot, lit, i) <= 2) insideLit++;
        } else {
            const d = maxDiff(shot, plain, i);
            worstOutside = Math.max(worstOutside, d);
            if (d > 1) outsideChanged++;
        }
    }
    return { inside, insideLit, outsideChanged, worstOutside };
}

/** The picture halfway to white, as the highlight lightens a lit colour (before the resolve). */
function halfwayToWhite(data: Uint8ClampedArray): Uint8ClampedArray {
    const out = new Uint8ClampedArray(data.length);
    for (let i = 0; i < data.length; i += 4) {
        // Background pixels stay as they are; covered ones go halfway.
        const covered = data[i] + data[i + 1] + data[i + 2] > 0;
        for (let c = 0; c < 3; c++) out[i + c] = covered ? Math.round((data[i + c] + 255) / 2) : data[i + c];
        out[i + 3] = 255;
    }
    return out;
}

export type Comparison = ReturnType<typeof compare>;

export interface HoverReport {
    sectionByPointer: Comparison;
    sectionBySequence: Comparison;
    sectionsAtCoarserGrain: Comparison;
    sectionChunkedDiffer: number;
    instance: Comparison;
    overlayPoint: Comparison;
    overlayChain: Comparison;
    overlayWhole: Comparison;
    overlayBySequence: Comparison;
    overlayChunkedDiffer: number;
    overlayOverTransparentPeeled: Comparison;
    overlayOverTransparentBlended: Comparison;
    nothingHoveredDiffer: number;
    rendererErrors: string[];
}

export default defineCase(async (_device: GPUDevice): Promise<HoverReport> => {
    const rendererErrors: string[] = [];
    const renderer = await WebGPUPreviewRenderer.create(document.createElement("canvas"), message => rendererErrors.push(message));
    // Small buffers: every quad its own chunk, a window starting at its first vertex.
    const chunked = await WebGPUPreviewRenderer.create(document.createElement("canvas"), message => rendererErrors.push(message),
        { maxBufferBytes: 64 });
    const shot = async (buffers: DisplayBuffer[], cam = camera(), r = renderer) => (await r.snapshot(buffers, cam, [], WIDTH, HEIGHT)).data;
    const differ = (a: Uint8ClampedArray, b: Uint8ClampedArray) => {
        let n = 0;
        for (let i = 0; i < a.length; i += 4) if (maxDiff(a, b, i) > 1) n++;
        return n;
    };
    try {
        // Sections and instances.
        const stripPlain = await shot([strip()]);
        const stripLit = halfwayToWhite(stripPlain);
        const section = async (k: number) => coverage(await shot([strip(k)]));
        const union = (a: boolean[], b: boolean[]) => a.map((v, i) => v || b[i]);
        const byPointer = await shot([strip()], camera({ hoveridx: 0, hover_point: 2 }));
        const bySequence = await shot([strip()], camera({ section: { bufferId: "strip", section: 1 } }));
        const coarser = await shot([strip()], camera({ hoveridx: 0, hover_point: 2, pickLevel: 1 }));
        const byPointerChunked = await shot([strip()], camera({ hoveridx: 0, hover_point: 2 }), chunked);

        const shapesPlain = await shot([shapes()]);
        const instance = await shot([shapes()], camera({ hoveridx: 0, hover_point: 1 }));

        // The smooth mesh overlay.
        const blobPlain = await shot([blob()]);
        const blobOrange = await shot([blob(ORANGE)]);
        const left = coverage(await shot([blob(BLUE, 0)]));
        const right = coverage(await shot([blob(BLUE, 1)]));
        const everywhere = union(left, right);
        const overlayPoint = await shot([blob()], camera({ hoveridx: 0, hover_point: 0 }));
        const overlayChain = await shot([blob()], camera({ hoveridx: 0, hover_point: 0, pickLevel: 1 }));
        const wholePlain = await shot([blob(BLUE, null, true)]);
        const overlayWhole = await shot([blob(BLUE, null, true)], camera({ hoveridx: 0, hover_point: 0 }));
        const overlayBySequence = await shot([blob()], camera({ section: { bufferId: "blob", section: 1 } }));
        const overlayChunked = await shot([blob()], camera({ hoveridx: 0, hover_point: 0 }), chunked);
        const glass = [0.3, 0.4, 0.8, 0.5];
        const glassPeeled = await shot([blob(glass)], camera({ transparency: true }));
        const overlayPeeled = await shot([blob(glass)], camera({ hoveridx: 0, hover_point: 0, transparency: true }));
        const glassBlended = await shot([blob(glass)], camera({ transparency: false }));
        const overlayBlended = await shot([blob(glass)], camera({ hoveridx: 0, hover_point: 0, transparency: false }));

        // A hover on something with nothing to light (an instance index past the end, a point of a
        // mesh with no lists): the picture as it was.
        const nothing = await shot([strip(), blob(BLUE, null)], camera({ hoveridx: 5, hover_point: 0 }));
        const nothingPlain = await shot([strip(), blob(BLUE, null)]);

        return {
            sectionByPointer: compare(byPointer, stripPlain, stripLit, await section(2)),
            sectionBySequence: compare(bySequence, stripPlain, stripLit, await section(1)),
            sectionsAtCoarserGrain: compare(coarser, stripPlain, stripLit, union(await section(2), await section(3))),
            sectionChunkedDiffer: differ(byPointerChunked, byPointer),
            instance: compare(instance, shapesPlain, halfwayToWhite(shapesPlain), coverage(await shot([shapes(1)]))),
            overlayPoint: compare(overlayPoint, blobPlain, blobOrange, left),
            overlayChain: compare(overlayChain, blobPlain, blobOrange, everywhere),
            overlayWhole: compare(overlayWhole, wholePlain, blobOrange, everywhere),
            overlayBySequence: compare(overlayBySequence, blobPlain, blobOrange, right),
            overlayChunkedDiffer: differ(overlayChunked, overlayPoint),
            overlayOverTransparentPeeled: compare(overlayPeeled, glassPeeled, blobOrange, left),
            overlayOverTransparentBlended: compare(overlayBlended, glassBlended, blobOrange, left),
            nothingHoveredDiffer: differ(nothing, nothingPlain),
            rendererErrors,
        };
    } finally {
        renderer.destroy();
        chunked.destroy();
    }
});
