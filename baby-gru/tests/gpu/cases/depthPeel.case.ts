/**
 * Depth peeling in the WebGPU renderer (depthPeel.ts), against the sorted composite worked out on
 * the CPU.
 *
 * The light is put along the view, with no ambient or highlight and a diffuse of 1 / 1.2, so a
 * surface facing the viewer is drawn in exactly its own colour; the composite is then plain
 * arithmetic. Seen from above:
 *   - an opaque grey floor, and over it four transparent quads in one mesh, in no order of depth
 *     (3, 1, 4, 2): red at 6 A, green at 4, blue at 2, white at 1, overlapping so that some places
 *     have four layers over the floor, some three, some two. WebGL's default of 4 layers peels 3
 *     transparent ones, the nearest; where there are four, the furthest is not drawn.
 *   - at a silhouette, an opaque bar in front of a transparent quad: the pixel its edge halves
 *     should be half bar and half the quad over the floor - not half the bare floor, the "white
 *     rim" WebGL's resolved opaque depth makes.
 *   - a transparent sphere: its own lit colour, half over the floor.
 */
import { WebGPUPreviewRenderer } from "../../../src/WebGPUComponents/previewRenderer";
import type { PreviewCameraSource } from "../../../src/WebGPUComponents/previewScene";
import type { DisplayBuffer } from "../../../src/WebGLgComponents/displayBuffer";
import { type Quad, emptyQuad, rectangle } from "../reference/surfaceLighting";
import { defineCase } from "../helpers/browserCase";

const WIDTH = 240, HEIGHT = 160;
const ZOOM = 0.35;
const PPA = HEIGHT / (48 * ZOOM);

const base: PreviewCameraSource = {
    myQuat: [0, 0, 0, 1], origin: [0, 0, 0], zoom: ZOOM, fogClipOffset: 250,
    gl_clipPlane0: [0, 0, -1, -230], gl_clipPlane1: [0, 0, 1, 270], gl_fog_start: 280, gl_fog_end: 290,
    doPerspectiveProjection: false,
    light_positions: [0, 0, 1, 1], light_colours_ambient: [0, 0, 0, 1], light_colours_diffuse: [1 / 1.2, 1 / 1.2, 1 / 1.2, 1],
    light_colours_specular: [0, 0, 0, 1], specularPower: 32, background_colour: [0, 0, 0, 1],
};

type RGBA = [number, number, number, number];
interface Layer { x0: number; x1: number; y0: number; y1: number; z: number; colour: RGBA }

const FLOOR: RGBA = [0.5, 0.5, 0.5, 1];
/** In the order they are in the mesh. */
const STACK: Layer[] = [
    { x0: -8, x1: 8, y0: -2, y1: 6, z: 2, colour: [0, 0, 1, 0.5] },
    { x0: -8, x1: 2, y0: -6, y1: 6, z: 6, colour: [1, 0, 0, 0.5] },
    { x0: -8, x1: 8, y0: -6, y1: 6, z: 1, colour: [1, 1, 1, 0.5] },
    { x0: -2, x1: 8, y0: -6, y1: 6, z: 4, colour: [0, 1, 0, 0.5] },
];
/** Places, with how many quads are over the floor there. */
const PLACES: { name: string; x: number; y: number }[] = [
    { name: "all four", x: 0, y: 4 },
    { name: "red, green, white", x: 0, y: -4 },
    { name: "red, blue, white", x: -5, y: 4 },
    { name: "green, blue, white", x: 5, y: 4 },
    { name: "red, white", x: -5, y: -4 },
    { name: "floor alone", x: -9.5, y: 0 },
];

/** The floor, then the quads over (x, y) furthest first - only the nearest `layers` of them. */
function expected(x: number, y: number, layers: number): number[] {
    const over = STACK.filter(q => x > q.x0 && x < q.x1 && y > q.y0 && y < q.y1).sort((a, b) => a.z - b.z);
    let colour = FLOOR.slice(0, 3);
    for (const q of over.slice(Math.max(0, over.length - layers))) {
        colour = colour.map((c, i) => q.colour[3] * q.colour[i] + (1 - q.colour[3]) * c);
    }
    return colour.map(c => Math.round(255 * c));
}

const mesh = (m: Quad, transparent: boolean): DisplayBuffer => ({
    visible: true, transparent, alphaMultiplier: 1, dataVersion: 1, bufferTypes: ["TRIANGLES"],
    triangleVertices: [new Float32Array(m.positions)], triangleNormals: [new Float32Array(m.normals)],
    triangleColours: [new Float32Array(m.colours)], triangleIndexs: [new Uint32Array(m.indices)], symmetryMatrices: [],
} as unknown as DisplayBuffer);

function quadAt(into: Quad, q: Layer): void {
    const first = into.positions.length;
    rectangle(into, q.x0, q.y0, q.x1, q.y1, [0, 0, 1], q.colour);
    for (let i = first + 2; i < into.positions.length; i += 3) into.positions[i] = q.z;
}

function floor(): DisplayBuffer {
    const f = emptyQuad();
    rectangle(f, -10, -7, 10, 7, [0, 0, 1], FLOOR);
    return mesh(f, false);
}

function stack(): DisplayBuffer {
    const m = emptyQuad();
    for (const q of STACK) quadAt(m, q);
    return mesh(m, true);
}

/** Where the bar's left edge falls: halfway across pixel 150. */
const BAR_EDGE_X = (150.5 - WIDTH / 2) / PPA;
const RIM_QUAD: Layer = { x0: -8, x1: 8, y0: -5, y1: 5, z: 2, colour: [1, 0, 0, 0.6] };
const BAR: Layer = { x0: BAR_EDGE_X, x1: 8, y0: -3, y1: 3, z: 4, colour: [0, 0, 1, 1] };

function rimScene(): DisplayBuffer[] {
    const quad = emptyQuad();
    quadAt(quad, RIM_QUAD);
    const bar = emptyQuad();
    quadAt(bar, BAR);
    return [floor(), mesh(quad, true), mesh(bar, false)];
}

const SPHERE = { x: -4, y: 0, z: 3, r: 2 };
function sphereScene(alpha: number): DisplayBuffer[] {
    const sphere = {
        visible: true, transparent: alpha < 1, alphaMultiplier: 1, dataVersion: 1, bufferTypes: ["PERFECT_SPHERES"],
        triangleInstanceOrigins: [new Float32Array([SPHERE.x, SPHERE.y, SPHERE.z])],
        triangleInstanceSizes: [new Float32Array([SPHERE.r, SPHERE.r, SPHERE.r])],
        triangleColours: [new Float32Array([0.9, 0.6, 0.2, alpha])], symmetryMatrices: [],
    } as unknown as DisplayBuffer;
    return [floor(), sphere];
}

const pixelOf = (x: number, y: number): [number, number] => [Math.floor(WIDTH / 2 + x * PPA), Math.floor(HEIGHT / 2 - y * PPA)];
const rgbAtPixel = (data: Uint8ClampedArray, px: number, py: number): number[] => {
    const i = (py * WIDTH + px) * 4;
    return [data[i], data[i + 1], data[i + 2]];
};
const rgbAt = (data: Uint8ClampedArray, x: number, y: number) => rgbAtPixel(data, ...pixelOf(x, y));
const differing = (a: Uint8ClampedArray, b: Uint8ClampedArray) => {
    let n = 0;
    for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) n++;
    return n;
};

export interface DepthPeelReport {
    /** Per place: drawn, expected with 3 layers, and with 4 (depthPeelLayers 5). */
    places: { name: string; drawn: number[]; expected3: number[]; drawn4: number[]; expected4: number[] }[];
    peelLayers: { default: number; five: number; off: number; hoverOnly: number; opaqueOnly: number };
    /** Without peeling (order-independent transparency off): blended in mesh order, so not sorted. */
    unsortedAllFour: number[];
    rim: { edge: number[]; expectedEdge: number[]; rimEdge: number[]; inside: number[]; outside: number[] };
    sphere: { centre: number[]; expectedCentre: number[]; side: number[]; expectedSide: number[] };
    tiles: number;
    tiledDiffers: number;
    rendererErrors: string[];
}

export default defineCase(async (_device: GPUDevice): Promise<DepthPeelReport> => {
    const rendererErrors: string[] = [];
    const renderer = await WebGPUPreviewRenderer.create(document.createElement("canvas"), message => rendererErrors.push(message));
    const withLayers = (depthPeelLayers: number): Partial<PreviewCameraSource> => ({ store: { getState: () => ({ sceneSettings: { depthPeelLayers } }) } });
    const shot = async (buffers: DisplayBuffer[], over: Partial<PreviewCameraSource> = {}, maxTile?: number) =>
        await renderer.snapshot(buffers, { ...base, ...over }, [], WIDTH, HEIGHT, maxTile ? { maxTile } : {});
    try {
        const scene = [floor(), stack()];
        const three = await shot(scene);
        const four = await shot(scene, withLayers(5));
        const places = PLACES.map(p => ({
            name: p.name,
            drawn: rgbAt(three.data, p.x, p.y), expected3: expected(p.x, p.y, 3),
            drawn4: rgbAt(four.data, p.x, p.y), expected4: expected(p.x, p.y, 4),
        }));
        const off = await shot(scene, { doOrderIndependentTransparency: false });

        const hover = stack();
        (hover as unknown as { isHoverBuffer: boolean }).isHoverBuffer = true;
        const hoverOnly = await shot([floor(), hover]);
        const opaqueOnly = await shot([floor()]);

        const rim = await shot(rimScene());
        const py = Math.floor(HEIGHT / 2);
        const behindBar = RIM_QUAD.colour.slice(0, 3).map((c, i) => RIM_QUAD.colour[3] * c + (1 - RIM_QUAD.colour[3]) * FLOOR[i]);
        const half = (a: number[], b: number[]) => a.map((c, i) => Math.round(255 * (c + b[i]) / 2));

        const solidSphere = await shot(sphereScene(1));
        const glassSphere = await shot(sphereScene(0.5));
        const throughGlass = (solid: number[]) => solid.map((c, i) => Math.round(0.5 * c + 0.5 * 255 * FLOOR[i]));
        const sideX = SPHERE.x + 0.7 * SPHERE.r;

        const tiled = await shot(scene, {}, 90);
        return {
            places,
            peelLayers: {
                default: three.report.peelLayers, five: four.report.peelLayers, off: off.report.peelLayers,
                hoverOnly: hoverOnly.report.peelLayers, opaqueOnly: opaqueOnly.report.peelLayers,
            },
            unsortedAllFour: rgbAt(off.data, 0, 4),
            rim: {
                edge: rgbAtPixel(rim.data, 150, py),
                expectedEdge: half(BAR.colour.slice(0, 3), behindBar),
                rimEdge: half(BAR.colour.slice(0, 3), FLOOR.slice(0, 3)),
                inside: rgbAtPixel(rim.data, 155, py),
                outside: rgbAtPixel(rim.data, 145, py),
            },
            sphere: {
                centre: rgbAt(glassSphere.data, SPHERE.x, SPHERE.y), expectedCentre: throughGlass(rgbAt(solidSphere.data, SPHERE.x, SPHERE.y)),
                side: rgbAt(glassSphere.data, sideX, SPHERE.y), expectedSide: throughGlass(rgbAt(solidSphere.data, sideX, SPHERE.y)),
            },
            tiles: tiled.tiles,
            tiledDiffers: differing(tiled.data, three.data),
            rendererErrors,
        };
    } finally {
        renderer.destroy();
    }
});
