/**
 * Mesh textures in the WebGPU renderer (DisplayBuffer.materials, surfaceTextures.ts), each against
 * something drawn without them that must look the same:
 *
 *  - a base colour texture against the same quad cut into one flat-coloured cell per texel, its
 *    vertex colour the tint times that texel - so the image is the right way up and round and is
 *    multiplied into the vertex colour; meshes and instanced meshes both;
 *  - a normal map tilting the surface one way everywhere, against the quad's own normals tilted
 *    that way - along u, up the image (glTF's +Y), scaled, and with the mapping mirrored;
 *  - a metallic-roughness map, against the lighting worked out on the CPU from the frame's uniforms;
 *  - a fine checkerboard seen small, which mipmaps make an even grey;
 *  - and a material whose texture is not registered, which must be drawn exactly as no material.
 *
 * webglSurfaceMaps.case.ts checks the WebGL shader against the same references.
 */
import { WebGPUPreviewRenderer } from "../../../src/WebGPUComponents/previewRenderer";
import { frameUniforms } from "../../../src/WebGPUComponents/previewScene";
import type { PreviewCameraSource } from "../../../src/WebGPUComponents/previewScene";
import type { DisplayBuffer } from "../../../src/WebGLgComponents/displayBuffer";
import { type BufferMaterial, registerTexture } from "../../../src/WebGLgComponents/textureRegistry";
import {
    type Lights, METALLIC_ROUGHNESS_CASES, NORMAL_MAP_CASES, type Quad, decodedNormal, emptyQuad, encodeNormal, fineChecker,
    litWithMetallicRoughness, nearHighlight, rectangle, solidImage, texelCells, texelColours, TEXELS_ACROSS, TEXELS_DOWN,
} from "../reference/surfaceLighting";
import { defineCase } from "../helpers/browserCase";

const WIDTH = 240, HEIGHT = 160;

/** Looking straight down -z at the origin; no fog where the quad is. */
const camera: PreviewCameraSource = {
    myQuat: [0, 0, 0, 1], origin: [0, 0, 0], zoom: 0.35, fogClipOffset: 250,
    gl_clipPlane0: [0, 0, -1, -230], gl_clipPlane1: [0, 0, 1, 270], gl_fog_start: 280, gl_fog_end: 290,
    doPerspectiveProjection: false,
    light_positions: [25, 25, 50, 1], light_colours_ambient: [0.2, 0.2, 0.2, 1], light_colours_diffuse: [0.6, 0.6, 0.6, 1],
    light_colours_specular: [0.4, 0.4, 0.4, 1], specularPower: 32, background_colour: [0, 0, 0, 1],
};

/** The quad: 16 x 12 A about the origin, in the z = 0 plane. */
const HALF_W = 8, HALF_H = 6;

/** The pixel at world (x, y): 1 A is HEIGHT / (48 zoom) pixels, y up. */
const pixelAt = (x: number, y: number): [number, number] => {
    const ppa = HEIGHT / (48 * camera.zoom);
    return [Math.floor(WIDTH / 2 + x * ppa), Math.floor(HEIGHT / 2 - y * ppa)];
};

function meshBuffer(q: Quad, material: BufferMaterial | null): DisplayBuffer {
    return {
        visible: true, alphaMultiplier: 1, dataVersion: 1, bufferTypes: ["TRIANGLES"],
        triangleVertices: [new Float32Array(q.positions)], triangleNormals: [new Float32Array(q.normals)],
        triangleColours: [new Float32Array(q.colours)], triangleIndexs: [new Uint32Array(q.indices)],
        triangleTextureCoords: material ? [new Float32Array(q.uvs)] : [],
        materials: material ? [material] : [],
        symmetryMatrices: [],
    } as unknown as DisplayBuffer;
}

/** The same quad as one instance of a unit square mesh, coloured per instance. */
function instancedBuffer(colour: number[], material: BufferMaterial): DisplayBuffer {
    const square = emptyQuad();
    rectangle(square, -1, -1, 1, 1, [0, 0, 1], [1, 1, 1, 1]);
    return {
        visible: true, alphaMultiplier: 1, dataVersion: 1, bufferTypes: ["TRIANGLES"],
        triangleVertices: [new Float32Array(square.positions)], triangleNormals: [new Float32Array(square.normals)],
        triangleColours: [new Float32Array(colour)], triangleIndexs: [new Uint32Array(square.indices)],
        triangleInstanceOrigins: [new Float32Array([0, 0, 0])], triangleInstanceSizes: [new Float32Array([HALF_W, HALF_H, 1])],
        supplementary: { instance_use_colors: [true] },
        triangleTextureCoords: [new Float32Array(square.uvs)], materials: [material],
        symmetryMatrices: [],
    } as unknown as DisplayBuffer;
}

export interface ColourComparison {
    /** Largest channel difference, in levels, over the pixels compared. */
    worst: number;
    /** Pixels compared that were drawn at all. */
    drawn: number;
    compared: number;
}

export interface SurfaceTexturesReport {
    baseColour: ColourComparison;
    instanced: ColourComparison;
    /** `flat`: how far the map moved the picture from the untilted quad, so a map doing nothing shows. */
    normalMaps: ({ name: string; flat: number } & ColourComparison)[];
    metallicRoughness: { name: string; worst: number; got: number[]; expected: number[] }[];
    /** A fine checkerboard far smaller on screen than in texels, against flat grey. */
    mipmapped: ColourComparison;
    unregisteredMatchesPlain: boolean;
    rendererErrors: string[];
}

export default defineCase(async (_device: GPUDevice): Promise<SurfaceTexturesReport> => {
    const rendererErrors: string[] = [];
    const renderer = await WebGPUPreviewRenderer.create(document.createElement("canvas"), message => rendererErrors.push(message));
    const shot = async (buffers: DisplayBuffer[]) => (await renderer.snapshot(buffers, camera, [], WIDTH, HEIGHT)).data;
    const pixel = (data: Uint8ClampedArray, x: number, y: number): number[] => {
        const [px, py] = pixelAt(x, y);
        const at = (py * WIDTH + px) * 4;
        return [data[at], data[at + 1], data[at + 2]];
    };
    const compare = (a: Uint8ClampedArray, b: Uint8ClampedArray, points: [number, number][]): ColourComparison => {
        let worst = 0, drawn = 0;
        for (const [x, y] of points) {
            const p = pixel(a, x, y), q = pixel(b, x, y);
            if (p[0] + p[1] + p[2] > 0) drawn++;
            worst = Math.max(worst, ...p.map((c, i) => Math.abs(c - q[i])));
        }
        return { worst, drawn, compared: points.length };
    };
    const whole = (normal: number[], colour: number[], mirrored = false): Quad => {
        const q = emptyQuad();
        rectangle(q, -HALF_W, -HALF_H, HALF_W, HALF_H, normal, colour, mirrored ? 1 : 0, mirrored ? 0 : 1);
        return q;
    };
    const samplePoints: [number, number][] = [];
    for (let i = -3; i <= 3; i++) for (let j = -2; j <= 2; j++) samplePoints.push([i * 2, j * 2]);

    try {
        // Base colour: a 4 x 4 image of distinct colours, tinted by the vertex colour.
        const image = registerTexture({ width: TEXELS_ACROSS, height: TEXELS_DOWN, rgba: new Uint8Array(texelColours().flat()) });
        const tint = [0.9, 1, 0.7, 1];
        const cells = texelCells(-HALF_W, -HALF_H, HALF_W, HALF_H, tint);
        const reference = await shot([meshBuffer(cells.quad, null)]);
        const baseColour = compare(await shot([meshBuffer(whole([0, 0, 1], tint), { baseColourTexture: image })]), reference, cells.centres);
        const instanced = compare(await shot([instancedBuffer(tint, { baseColourTexture: image })]), reference, cells.centres);

        // Normal maps: one tilted normal everywhere, against the quad's normals tilted the same way.
        const grey = [0.8, 0.8, 0.8, 1];
        const flat = await shot([meshBuffer(whole([0, 0, 1], grey), null)]);
        const normalMaps = [];
        for (const c of NORMAL_MAP_CASES) {
            const bytes = encodeNormal(c.tangent);
            const map = registerTexture(solidImage(bytes));
            const got = await shot([meshBuffer(whole([0, 0, 1], grey, c.mirrored), { normalTexture: map, normalScale: c.scale })]);
            const expected = await shot([meshBuffer(whole(c.world(decodedNormal(bytes, c.scale ?? 1)), grey), null)]);
            normalMaps.push({ name: c.name, ...compare(got, expected, samplePoints), flat: compare(got, flat, samplePoints).worst });
        }

        // Metallic-roughness: worked out on the CPU from the frame's own light and eye directions.
        const frame = frameUniforms(camera, WIDTH, HEIGHT);
        const lights: Lights = {
            L: Array.from(frame.slice(32, 35)), E: Array.from(frame.slice(36, 39)),
            ambient: Array.from(frame.slice(40, 43)), diffuse: Array.from(frame.slice(44, 47)), specular: Array.from(frame.slice(48, 51)),
        };
        const base = [0.7, 0.5, 0.3, 1];
        const normal = nearHighlight(lights);
        const metallicRoughness = [];
        for (const c of METALLIC_ROUGHNESS_CASES) {
            const map = registerTexture(solidImage([0, c.g, c.b, 255]));
            const data = await shot([meshBuffer(whole(normal, base), {
                metallicRoughnessTexture: map, metallicFactor: c.metallicFactor, roughnessFactor: c.roughnessFactor,
            })]);
            const got = pixel(data, 0, 0);
            const expected = litWithMetallicRoughness(lights, normal, base, c.b / 255 * c.metallicFactor, c.g / 255 * c.roughnessFactor);
            metallicRoughness.push({ name: c.name, got, expected, worst: Math.max(...got.map((v, i) => Math.abs(v - expected[i]))) });
        }

        // Mipmaps: a checkerboard of single texels, 1024 across a quad 150-odd pixels wide, is
        // seen through levels where it has averaged to grey. Without them it would alias into
        // black and white pixels.
        const checker = registerTexture(fineChecker(1024));
        const mipmapped = compare(await shot([meshBuffer(whole([0, 0, 1], [1, 1, 1, 1]), { baseColourTexture: checker })]),
            await shot([meshBuffer(whole([0, 0, 1], [0.5, 0.5, 0.5, 1]), null)]), samplePoints);

        // A texture id nobody registered: drawn as if there were no material.
        const plain = await shot([meshBuffer(whole([0, 0, 1], tint), null)]);
        const missing = await shot([meshBuffer(whole([0, 0, 1], tint), { baseColourTexture: "never-registered" })]);
        const unregisteredMatchesPlain = plain.every((v, i) => v === missing[i]);

        return { baseColour, instanced, normalMaps, metallicRoughness, mipmapped, unregisteredMatchesPlain, rendererErrors };
    } finally {
        renderer.destroy();
    }
});
