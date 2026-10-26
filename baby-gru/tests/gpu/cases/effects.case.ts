/**
 * Ambient occlusion and edge detection in the WebGPU renderer (effectPasses.ts), on a scene made
 * to show them: a floor, a plateau 2 A above it, and a sphere floating over it, seen from above.
 *
 * What should happen, by WebGL's definitions: the floor darkens where the plateau and the sphere
 * stand over it (within the occlusion radius) and nowhere else; the plateau's top, open to the sky,
 * does not; and with edges on, a dark line follows every step in depth bigger than the threshold -
 * the plateau's border and the sphere's rim - and nothing else changes. Strength 0, or a threshold
 * above the step, must leave the picture exactly as with the effect off. And a snapshot drawn in
 * tiles must come out as one drawn whole.
 */
import { WebGPUPreviewRenderer } from "../../../src/WebGPUComponents/previewRenderer";
import type { PreviewCameraSource } from "../../../src/WebGPUComponents/previewScene";
import type { DisplayBuffer } from "../../../src/WebGLgComponents/displayBuffer";
import { type Quad, emptyQuad, rectangle } from "../reference/surfaceLighting";
import { defineCase } from "../helpers/browserCase";

const WIDTH = 240, HEIGHT = 160;

const base: PreviewCameraSource = {
    myQuat: [0, 0, 0, 1], origin: [0, 0, 0], zoom: 0.35, fogClipOffset: 250,
    gl_clipPlane0: [0, 0, -1, -230], gl_clipPlane1: [0, 0, 1, 270], gl_fog_start: 280, gl_fog_end: 290,
    doPerspectiveProjection: false,
    light_positions: [25, 25, 50, 1], light_colours_ambient: [0.2, 0.2, 0.2, 1], light_colours_diffuse: [0.6, 0.6, 0.6, 1],
    light_colours_specular: [0.4, 0.4, 0.4, 1], specularPower: 32, background_colour: [0, 0, 0, 1],
};

/** The plateau: x 0..6, y -3..3, 2 A up. The sphere: centre (-6, 0, 3), radius 1.5. */
const PLATEAU = { x0: 0, x1: 6, y0: -3, y1: 3, z: 2 };
const SPHERE = { x: -6, y: 0, z: 3, r: 1.5 };

function scene(): DisplayBuffer[] {
    const q: Quad = emptyQuad();
    rectangle(q, -10, -7, 10, 7, [0, 0, 1], [0.8, 0.8, 0.8, 1]);
    const top = emptyQuad();
    rectangle(top, PLATEAU.x0, PLATEAU.y0, PLATEAU.x1, PLATEAU.y1, [0, 0, 1], [0.6, 0.7, 0.9, 1]);
    for (let i = 2; i < top.positions.length; i += 3) top.positions[i] = PLATEAU.z;
    const mesh = (m: Quad): DisplayBuffer => ({
        visible: true, alphaMultiplier: 1, dataVersion: 1, bufferTypes: ["TRIANGLES"],
        triangleVertices: [new Float32Array(m.positions)], triangleNormals: [new Float32Array(m.normals)],
        triangleColours: [new Float32Array(m.colours)], triangleIndexs: [new Uint32Array(m.indices)], symmetryMatrices: [],
    } as unknown as DisplayBuffer);
    const sphere = {
        visible: true, alphaMultiplier: 1, dataVersion: 1, bufferTypes: ["PERFECT_SPHERES"],
        triangleInstanceOrigins: [new Float32Array([SPHERE.x, SPHERE.y, SPHERE.z])],
        triangleInstanceSizes: [new Float32Array([SPHERE.r, SPHERE.r, SPHERE.r])],
        triangleColours: [new Float32Array([0.9, 0.5, 0.3, 1])], symmetryMatrices: [],
    } as unknown as DisplayBuffer;
    return [mesh(q), mesh(top), sphere];
}

/** Pixel of world (x, y): 1 A is HEIGHT / (48 zoom) pixels, y up, centred. */
const pixelOf = (x: number, y: number): [number, number] => {
    const ppa = HEIGHT / (48 * base.zoom);
    return [Math.floor(WIDTH / 2 + x * ppa), Math.floor(HEIGHT / 2 - y * ppa)];
};

const brightness = (data: Uint8ClampedArray, x: number, y: number): number => {
    const [px, py] = pixelOf(x, y);
    const at = (py * WIDTH + px) * 4;
    return data[at] + data[at + 1] + data[at + 2];
};

/** How a picture differs from another: pixels that differ at all, and the largest difference. */
const difference = (a: Uint8ClampedArray, b: Uint8ClampedArray) => {
    let differing = 0, worst = 0;
    for (let i = 0; i < a.length; i += 4) {
        const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
        if (d > 0) differing++;
        worst = Math.max(worst, d);
    }
    return { differing, worst };
};

export interface EffectsReport {
    /** Brightness (r + g + b) with occlusion over without, at places on the floor and plateau. */
    occlusion: { floorByPlateau: number; floorBySphere: number; floorFar: number; plateauTop: number; sphereTop: number };
    /** Strength 0: occlusion computed but changing nothing. */
    strengthZero: { differing: number; worst: number };
    /** Along the row y = 0, x from -10 to 10: pixels darkened to under half, with edges on, and where. */
    edgeRow: { x: number; ratio: number }[];
    /** Away from any step (floor far, plateau middle, sphere middle): with edges over without. */
    edgeQuiet: number[];
    /** A threshold above every step: no edges. */
    edgesAboveThreshold: { differing: number; worst: number };
    /**
     * Both on, drawn in 6 tiles and whole: how far apart. Each tile's effects are worked out over
     * the tile and a margin, so they should join exactly.
     */
    tiled: { differing: number; worst: number; tiles: number };
    rendererErrors: string[];
}

export default defineCase(async (_device: GPUDevice): Promise<EffectsReport> => {
    const rendererErrors: string[] = [];
    const renderer = await WebGPUPreviewRenderer.create(document.createElement("canvas"), message => rendererErrors.push(message));
    const buffers = scene();
    const shot = async (over: Partial<PreviewCameraSource>, maxTile?: number) =>
        await renderer.snapshot(buffers, { ...base, ...over }, [], WIDTH, HEIGHT, maxTile ? { maxTile } : {});
    try {
        const plain = (await shot({})).data;
        const ao = (await shot({ doSSAO: true, ssaoRadius: 2, ssaoBias: 1 })).data;
        const ratio = (x: number, y: number) => brightness(ao, x, y) / brightness(plain, x, y);
        const occlusion = {
            floorByPlateau: ratio(PLATEAU.x1 + 0.5, 0),
            floorBySphere: ratio(SPHERE.x - SPHERE.r - 0.4, 0),
            floorFar: ratio(-9, 5),
            plateauTop: ratio(3, 0),
            sphereTop: ratio(SPHERE.x, SPHERE.y),
        };
        const strengthZero = difference((await shot({ doSSAO: true, ssaoRadius: 2, ssaoBias: 0 })).data, plain);

        const edges = (await shot({ doEdgeDetect: true, depthThreshold: 1.3, normalThreshold: 0.5, scaleDepth: 2, scaleNormal: 0 })).data;
        const edgeRow: { x: number; ratio: number }[] = [];
        const ppa = HEIGHT / (48 * base.zoom);
        for (let px = Math.ceil(WIDTH / 2 - 10 * ppa); px < WIDTH / 2 + 10 * ppa; px++) {
            const x = (px + 0.5 - WIDTH / 2) / ppa;
            const r = brightness(edges, x, 0) / brightness(plain, x, 0);
            if (r < 0.5) edgeRow.push({ x, ratio: r });
        }
        const quiet = (x: number, y: number) => brightness(edges, x, y) / brightness(plain, x, y);
        const edgeQuiet = [quiet(-9, 5), quiet(3, 0), quiet(SPHERE.x, SPHERE.y)];
        const edgesAboveThreshold = difference((await shot({ doEdgeDetect: true, depthThreshold: 50, scaleDepth: 2 })).data, plain);

        const both = { doSSAO: true, ssaoRadius: 2, ssaoBias: 1, doEdgeDetect: true, depthThreshold: 1.3, scaleDepth: 2 };
        const whole = (await shot(both)).data;
        const tiledShot = await shot(both, 90);
        const tiled = { ...difference(tiledShot.data, whole), tiles: tiledShot.tiles };

        return { occlusion, strengthZero, edgeRow, edgeQuiet, edgesAboveThreshold, tiled, rendererErrors };
    } finally {
        renderer.destroy();
    }
});
