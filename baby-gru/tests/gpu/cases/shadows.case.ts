/**
 * Shadows in the WebGPU renderer (shadowMap.ts and the shadow pass), on a floor with a plateau
 * 4 A above it and a sphere 6 A up, lit from (25, 25, 50) - so a shadow falls half its caster's
 * height down and to the left of it, in x and in y.
 *
 * What WebGL's rules say should happen: the floor is darker where the plateau's and the sphere's
 * shadows fall and nowhere else, by half (shadowed light is halved, and loses its highlight); the
 * tops of the plateau and the sphere, facing the light with nothing over them, are untouched -
 * the sphere does not shadow itself; the soft lookup widens the shadow's edge; and a snapshot in
 * tiles comes out as one drawn whole.
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

/** The plateau: x 0..6, y -3..3, 4 A up; its shadow, 2 A down and left: x -2..4, y -5..1. */
const PLATEAU = { x0: 0, x1: 6, y0: -3, y1: 3, z: 4 };
/** The sphere: centre (-6, 2, 6), radius 1.5; its shadow's centre (-9, -1). */
const SPHERE = { x: -6, y: 2, z: 6, r: 1.5 };
/**
 * A sphere 22 A up, past the front clip plane (20 A in front of the view centre), so not seen. It
 * is 22 A from the view centre along the light: inside the light's box (which reaches about 25 A
 * that way here) but past the 20 A at which WebGL's shadow pass clips along the light, so it casts
 * nothing. Its shadow would fall at (-6, -6).
 */
const CLIPPED = { x: 5, y: 5, z: 22, r: 1.5 };

function scene(): DisplayBuffer[] {
    const floor: Quad = emptyQuad();
    rectangle(floor, -11, -7, 11, 7, [0, 0, 1], [0.8, 0.8, 0.8, 1]);
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
        triangleInstanceOrigins: [new Float32Array([SPHERE.x, SPHERE.y, SPHERE.z, CLIPPED.x, CLIPPED.y, CLIPPED.z])],
        triangleInstanceSizes: [new Float32Array([SPHERE.r, SPHERE.r, SPHERE.r, CLIPPED.r, CLIPPED.r, CLIPPED.r])],
        triangleColours: [new Float32Array([0.9, 0.5, 0.3, 1, 0.9, 0.5, 0.3, 1])], symmetryMatrices: [],
    } as unknown as DisplayBuffer;
    return [mesh(floor), mesh(top), sphere];
}

const pixelOf = (x: number, y: number): [number, number] => {
    const ppa = HEIGHT / (48 * base.zoom);
    return [Math.floor(WIDTH / 2 + x * ppa), Math.floor(HEIGHT / 2 - y * ppa)];
};

const brightness = (data: Uint8ClampedArray, x: number, y: number): number => {
    const [px, py] = pixelOf(x, y);
    const at = (py * WIDTH + px) * 4;
    return data[at] + data[at + 1] + data[at + 2];
};

const difference = (a: Uint8ClampedArray, b: Uint8ClampedArray) => {
    let differing = 0;
    for (let i = 0; i < a.length; i += 4) {
        if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) differing++;
    }
    return differing;
};

export interface ShadowsReport {
    /** With shadows over without, at named places. */
    ratios: Record<string, number>;
    /** Pixels along y = 0 between x = -4 and 0 whose brightness is strictly between shadowed and lit: the edge. */
    edgeWidth: { hard: number; soft: number };
    /** Shadows off with the shadow map code in place: the same as never having had it. */
    offDiffers: number;
    /** Tiled (6 tiles) against whole, shadows and occlusion on. */
    tiledDiffers: number;
    tiles: number;
    rendererErrors: string[];
}

export default defineCase(async (_device: GPUDevice): Promise<ShadowsReport> => {
    const rendererErrors: string[] = [];
    const renderer = await WebGPUPreviewRenderer.create(document.createElement("canvas"), message => rendererErrors.push(message));
    const buffers = scene();
    const shot = async (over: Partial<PreviewCameraSource>, options: { maxTile?: number; softShadows?: boolean } = {}) =>
        await renderer.snapshot(buffers, { ...base, ...over }, [], WIDTH, HEIGHT, options);
    try {
        const plain = (await shot({})).data;
        const shadowed = (await shot({ doShadow: true })).data;
        const ratio = (x: number, y: number) => brightness(shadowed, x, y) / brightness(plain, x, y);
        const ratios = {
            floorInPlateauShadowLeft: ratio(-1, 0),
            floorInPlateauShadowBelow: ratio(2, -4),
            floorLeftOfPlateauShadow: ratio(-3, 0),
            floorBelowPlateauShadow: ratio(2, -6),
            floorInSphereShadow: ratio(-9, -1),
            floorBesideSphereShadow: ratio(-9, 3),
            plateauTop: ratio(3, 0),
            sphereTop: ratio(SPHERE.x, SPHERE.y),
            floorUnderClippedSphere: ratio(CLIPPED.x - CLIPPED.z / 2, CLIPPED.y - CLIPPED.z / 2),
        };

        const soft = (await shot({ doShadow: true }, { softShadows: true })).data;
        const edge = (data: Uint8ClampedArray) => {
            const lit = brightness(data, -3.5, 0), dark = brightness(data, -0.5, 0);
            let n = 0;
            const ppa = HEIGHT / (48 * base.zoom);
            for (let px = Math.ceil(WIDTH / 2 - 4 * ppa); px < WIDTH / 2; px++) {
                const b = brightness(data, (px + 0.5 - WIDTH / 2) / ppa, 0);
                if (b < lit - 3 && b > dark + 3) n++;
            }
            return n;
        };
        const edgeWidth = { hard: edge(shadowed), soft: edge(soft) };

        const offDiffers = difference((await shot({ doShadow: false })).data, plain);
        const both = { doShadow: true, doSSAO: true, ssaoRadius: 2, ssaoBias: 1 };
        const whole = (await shot(both)).data;
        const tiled = await shot(both, { maxTile: 90 });
        return { ratios, edgeWidth, offDiffers, tiledDiffers: difference(tiled.data, whole), tiles: tiled.tiles, rendererErrors };
    } finally {
        renderer.destroy();
    }
});
