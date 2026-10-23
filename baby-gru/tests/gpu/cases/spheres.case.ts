/**
 * PERFECT_SPHERES in the WebGPU renderer, against a CPU transcription of what the WebGL impostor
 * shaders (twodshapes-vertex-shader.js, perfect-sphere-fragment-shader.js) compute per pixel:
 *
 * - the shape and shading of a sphere, pixel for pixel, under a turned camera;
 * - depth: a big sphere whose centre is behind a small one's, but whose front is in front of it,
 *   hides it, which only works if each pixel gets the sphere's depth rather than its quad's;
 * - spheres beyond the back clip plane are not drawn;
 * - a sphere cut by the front clip plane, with and without clip caps;
 * - clip caps leave no holes: wherever some of a sphere is behind the front plane, something is
 *   drawn (Stuart's old WebGL bug cut a ring out of the cap, or shrank it);
 * - chunking: spheres split over several buffers draw the same picture;
 * - tiled snapshots match whole ones, orthographic and perspective.
 */
import * as mat4 from "gl-matrix/mat4";
import { WebGPUPreviewRenderer } from "../../../src/WebGPUComponents/previewRenderer";
import type { PreviewCameraSource } from "../../../src/WebGPUComponents/previewScene";
import { frameUniforms } from "../../../src/WebGPUComponents/previewScene";
import type { DisplayBuffer } from "../../../src/WebGLgComponents/displayBuffer";
import { defineCase } from "../helpers/browserCase";

const WIDTH = 240, HEIGHT = 160;

function camera(perspective = false, quat: number[] = [0.2, 0.3, 0, Math.sqrt(1 - 0.13)], clipCap = false): PreviewCameraSource {
    return {
        myQuat: quat, origin: [0, 0, 0], zoom: 0.25, fogClipOffset: 250,
        gl_clipPlane0: [0, 0, -1, -230], gl_clipPlane1: [0, 0, 1, 270], gl_fog_start: 250, gl_fog_end: 290,
        doPerspectiveProjection: perspective,
        light_positions: [25, 25, 50, 1], light_colours_ambient: [0.2, 0.2, 0.2, 1], light_colours_diffuse: [0.5, 0.5, 0.5, 1],
        light_colours_specular: [0.5, 0.5, 0.5, 1], specularPower: 32, background_colour: [0, 0, 0, 1],
        clipCapPerfectSpheres: clipCap,
    };
}

interface Sphere { centre: number[]; radius: number; colour: number[] }

function sphereBuffer(spheres: Sphere[]): DisplayBuffer {
    return {
        visible: true, alphaMultiplier: 1, dataVersion: 1, bufferTypes: ["PERFECT_SPHERES"],
        triangleInstanceOrigins: [new Float32Array(spheres.flatMap(s => s.centre))],
        triangleInstanceSizes: [new Float32Array(spheres.flatMap(s => [s.radius, s.radius, s.radius]))],
        triangleColours: [new Float32Array(spheres.flatMap(s => s.colour))],
        triangleVertices: [new Float32Array(spheres.flatMap(s => s.centre))],
        triangleNormals: [new Float32Array(spheres.flatMap(s => s.centre))],
        triangleIndexs: [new Uint32Array(spheres.map((_, i) => i))],
        symmetryMatrices: [],
    } as unknown as DisplayBuffer;
}

/**
 * The image WebGL's shaders would give one sphere, orthographic: per pixel centre, the point on
 * the sphere's screen-facing square, then the impostor's cut, normal and lighting.
 */
function reference(sphere: Sphere, source: PreviewCameraSource): Uint8ClampedArray {
    const f = frameUniforms(source, WIDTH, HEIGHT);
    const projection = f.slice(0, 16), view = f.slice(16, 32);
    const centre = [0, 1, 2].map(r => view[r] * sphere.centre[0] + view[4 + r] * sphere.centre[1] + view[8 + r] * sphere.centre[2] + view[12 + r]);
    const L = f.slice(32, 35), E = f.slice(36, 39), right = f.slice(60, 63), up = f.slice(64, 67);
    const [amb, dif, spec] = [f.slice(40, 44), f.slice(44, 48), f.slice(48, 52)];
    const power = f[58];
    const [fogStart, fogEnd] = [f[56], f[57]];
    const fog = f.slice(52, 55);
    const plane0 = f.slice(68, 72), plane1 = f.slice(72, 76);
    const dot = (p: number[], q: ArrayLike<number>) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2] + q[3];
    const out = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
    for (let py = 0; py < HEIGHT; py++) for (let px = 0; px < WIDTH; px++) {
        const i = (py * WIDTH + px) * 4;
        out[i + 3] = 255;
        // Orthographic: clip x = P0 * eye x + P12, so eye x from the pixel centre.
        const ex = ((px + 0.5) / WIDTH * 2 - 1 - projection[12]) / projection[0];
        const ey = (1 - (py + 0.5) / HEIGHT * 2 - projection[13]) / projection[5];
        const x = (ex - centre[0]) / sphere.radius, y = (ey - centre[1]) / sphere.radius;
        const zz = 1 - x * x - y * y;
        if (zz <= 0.06) continue;
        const eye = [ex, ey, centre[2]];
        if (dot(eye, plane1) < 0) continue;
        if (!source.clipCapPerfectSpheres && dot(eye, plane0) < 0) continue;
        const z = Math.sqrt(zz);
        const r = sphere.radius;
        const n = [0, 1, 2].map(k => x * right[k] + y * up[k] + z * E[k]);
        const nl = Math.max(n[0] * L[0] + n[1] * L[1] + n[2] * L[2], 0);
        let colour = [0, 1, 2].map(c => 1.5 * sphere.colour[c] * amb[c] + 1.2 * sphere.colour[c] * dif[c] * nl + spec[c] * Math.pow(nl, power));
        if (source.clipCapPerfectSpheres) {
            const front = dot([ex, ey, centre[2] + z * r], plane0);
            const back = dot(eye, plane0) + z * r;
            if (front < 0) colour = sphere.colour.slice(0, 3);
            if (back < 0) continue;
        }
        const fogFactor = 1 - Math.min(Math.max((fogEnd - Math.abs(centre[2])) / (fogEnd - fogStart), 0), 1);
        for (let c = 0; c < 3; c++) out[i + c] = Math.round(255 * (colour[c] * (1 - fogFactor) + fog[c] * fogFactor));
    }
    return out;
}

/**
 * Clip caps from first principles, not from the shader: pixels whose ray meets the impostor's disc
 * with some of its chord behind the front plane (so the sphere, or its cut, should show) but
 * that were not drawn, and pixels drawn where none of it is.
 */
function capErrors(sphere: Sphere, source: PreviewCameraSource, image: Uint8ClampedArray): { holes: number; extra: number; expected: number } {
    const f = frameUniforms(source, WIDTH, HEIGHT);
    const projection = f.slice(0, 16), view = f.slice(16, 32);
    const centre = [0, 1, 2].map(r => view[r] * sphere.centre[0] + view[4 + r] * sphere.centre[1] + view[8 + r] * sphere.centre[2] + view[12 + r]);
    const plane = f.slice(68, 72);
    let holes = 0, extra = 0, expected = 0;
    for (let py = 0; py < HEIGHT; py++) for (let px = 0; px < WIDTH; px++) {
        const ex = ((px + 0.5) / WIDTH * 2 - 1 - projection[12]) / projection[0];
        const ey = (1 - (py + 0.5) / HEIGHT * 2 - projection[13]) / projection[5];
        const x = (ex - centre[0]) / sphere.radius, y = (ey - centre[1]) / sphere.radius;
        const zz = 1 - x * x - y * y;
        // The far end of the chord, on the kept side of the plane (dot >= 0)?
        const far = zz > 0.06 ? centre[2] - Math.sqrt(zz) * sphere.radius : Infinity;
        const show = zz > 0.06 && plane[0] * ex + plane[1] * ey + plane[2] * far + plane[3] >= 0;
        const i = (py * WIDTH + px) * 4;
        const drawn = image[i] + image[i + 1] + image[i + 2] > 0;
        if (show) expected++;
        if (show && !drawn) holes++;
        if (!show && drawn) extra++;
    }
    return { holes, extra, expected };
}

function compare(a: Uint8ClampedArray, b: Uint8ClampedArray, tolerance = 2): { differ: number; worst: number } {
    let differ = 0, worst = 0;
    for (let i = 0; i < a.length; i += 4) {
        const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
        worst = Math.max(worst, d);
        if (d > tolerance) differ++;
    }
    return { differ, worst };
}

function pixel(data: Uint8ClampedArray, x: number, y: number): number[] {
    const i = (y * WIDTH + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
}

/** The pixel a world point lands on. */
function pixelOf(point: number[], source: PreviewCameraSource): [number, number] {
    const f = frameUniforms(source, WIDTH, HEIGHT);
    const m = mat4.multiply(mat4.create(), f.slice(0, 16) as unknown as mat4.mat4, f.slice(16, 32) as unknown as mat4.mat4);
    const c = [0, 1, 3].map(r => m[r] * point[0] + m[4 + r] * point[1] + m[8 + r] * point[2] + m[12 + r]);
    return [Math.floor((c[0] / c[2] + 1) / 2 * WIDTH), Math.floor((1 - c[1] / c[2]) / 2 * HEIGHT)];
}

function drawnPixels(data: Uint8ClampedArray): number {
    let n = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i] + data[i + 1] + data[i + 2] > 0) n++;
    return n;
}

export interface SpheresReport {
    pixels: number;
    single: { drawn: number; expected: number; differ: number; worst: number };
    /** A sphere cut by the front plane, without and with clip caps, against the reference. */
    cut: { drawn: number; expected: number; differ: number; worst: number };
    capped: { drawn: number; expected: number; differ: number; worst: number; flat: number };
    /** Spheres with centres from on the front plane to 2.4 A behind it, radius 4, capped. */
    capErrors: { holes: number; extra: number; expected: number };
    depth: { centre: number[]; centreOtherOrder: number[]; smallAlone: number[] };
    beyondBackPlane: number;
    chunked: { differ: number; drawn: number };
    tiled: { differ: number; tiles: number };
    perspectiveTiled: { differ: number; drawn: number; fromOrthographic: number };
    rendererErrors: string[];
}

export default defineCase(async (_device: GPUDevice): Promise<SpheresReport> => {
    const canvas = document.createElement("canvas");
    const rendererErrors: string[] = [];
    const renderer = await WebGPUPreviewRenderer.create(canvas, message => rendererErrors.push(message));
    const chunkedRenderer = await WebGPUPreviewRenderer.create(document.createElement("canvas"),
        message => rendererErrors.push(message), { maxBufferBytes: 64 });
    const shot = async (buffers: DisplayBuffer[], source = camera(), maxTile?: number, which = renderer) =>
        which.snapshot(buffers, source, [], WIDTH, HEIGHT, { maxTile });

    try {
        // One sphere, pixel for pixel against the CPU.
        const one: Sphere = { centre: [1, -0.5, 2], radius: 4, colour: [0.9, 0.5, 0.2, 1] };
        const single = await shot([sphereBuffer([one])]);
        const expected = reference(one, camera());

        // Depth from the sphere, not the square: B's centre is 2.5 A behind A's, but its front is
        // 0.5 A in front of A's front. Both orders of drawing.
        const small: Sphere = { centre: [0, 0, 0], radius: 1, colour: [1, 0, 0, 1] };
        const big: Sphere = { centre: [0, 0, -2.5], radius: 4, colour: [0, 0, 1, 1] };
        const front = camera(false, [0, 0, 0, 1]);
        const [cx, cy] = pixelOf([0, 0, 0], front);
        const bigFirst = await shot([sphereBuffer([big]), sphereBuffer([small])], front);
        const smallFirst = await shot([sphereBuffer([small]), sphereBuffer([big])], front);
        const smallAlone = await shot([sphereBuffer([small])], front);

        // Its centre 1 A behind the front plane (which is 20 A in front of the centre of view),
        // its front 3 A beyond it. Without caps, kept whole (WebGL tests the plane at the centre);
        // pulled 2 A further forward, it goes. With caps, a flat disc where it is cut.
        const straddling: Sphere = { centre: [2, 1, 19], radius: 4, colour: [0.3, 0.7, 0.9, 1] };
        const forward: Sphere = { ...straddling, centre: [2, 1, 21] };
        const cutCamera = camera(false, [0, 0, 0, 1]);
        const capCamera = camera(false, [0, 0, 0, 1], true);
        const cut = await shot([sphereBuffer([straddling]), sphereBuffer([forward])], cutCamera);
        const cutExpected = reference(straddling, cutCamera);
        const forwardExpected = reference(forward, cutCamera);
        for (let i = 0; i < cutExpected.length; i += 4) {
            if (forwardExpected[i] + forwardExpected[i + 1] + forwardExpected[i + 2] > 0) throw new Error("the forward sphere should be clipped away");
        }
        const capped = await shot([sphereBuffer([straddling])], capCamera);
        const cappedExpected = reference(straddling, capCamera);
        // The cap's pixels: exactly the sphere's own colour, unlit.
        let flat = 0;
        for (let i = 0; i < capped.data.length; i += 4) {
            const d = Math.max(Math.abs(capped.data[i] - 0.3 * 255), Math.abs(capped.data[i + 1] - 0.7 * 255), Math.abs(capped.data[i + 2] - 0.9 * 255));
            if (d <= 1) flat++;
        }

        // Centres from on the front plane (world z = 20) to 2.4 A behind it; the old WebGL bug cut
        // a ring from the cap for anything closer than r/3 (1.33 A). A sphere whose centre is in
        // front of the plane is not drawn at all - its square is at the centre's depth, and the
        // projection's near plane is the front plane - in WebGL as here, so it is not tested.
        const errors = { holes: 0, extra: 0, expected: 0 };
        for (const d of [0, 0.2, 0.4, 0.8, 1.2, 1.6, 2.4]) {
            const sphere: Sphere = { centre: [0, 0, 20 - d], radius: 4, colour: [0.8, 0.8, 0.2, 1] };
            const image = await shot([sphereBuffer([sphere])], capCamera);
            const e = capErrors(sphere, capCamera, image.data);
            errors.holes += e.holes;
            errors.extra += e.extra;
            errors.expected += e.expected;
        }

        // 30 A behind the centre of view: beyond the back clip plane (20 A behind).
        const far = await shot([sphereBuffer([{ centre: [0, 0, -30], radius: 3, colour: [1, 1, 1, 1] }])], front);

        // Ten spheres in a row; 64-byte buffers hold four colours, so three chunks.
        const row = sphereBuffer(Array.from({ length: 10 }, (_, i) => ({
            centre: [-13.5 + 3 * i, 0, 0], radius: 1.4, colour: [0.2 + 0.08 * i, 0.9 - 0.08 * i, 0.4, 1],
        })));
        const whole = await shot([row]);
        const chunked = await shot([row], camera(), undefined, chunkedRenderer);
        const tiled = await shot([row], camera(), 50);
        const perspective = await shot([row], camera(true));
        const perspectiveTiled = await shot([row], camera(true), 50);

        const singleComparison = compare(single.data, expected);
        return {
            pixels: WIDTH * HEIGHT,
            single: { drawn: drawnPixels(single.data), expected: drawnPixels(expected), ...singleComparison },
            cut: { drawn: drawnPixels(cut.data), expected: drawnPixels(cutExpected), ...compare(cut.data, cutExpected) },
            capped: { drawn: drawnPixels(capped.data), expected: drawnPixels(cappedExpected), ...compare(capped.data, cappedExpected), flat },
            capErrors: errors,
            depth: { centre: pixel(bigFirst.data, cx, cy), centreOtherOrder: pixel(smallFirst.data, cx, cy), smallAlone: pixel(smallAlone.data, cx, cy) },
            beyondBackPlane: drawnPixels(far.data),
            chunked: { differ: compare(chunked.data, whole.data, 0).differ, drawn: drawnPixels(whole.data) },
            tiled: { differ: compare(tiled.data, whole.data).differ, tiles: tiled.tiles },
            perspectiveTiled: { differ: compare(perspectiveTiled.data, perspective.data).differ, drawn: drawnPixels(perspective.data), fromOrthographic: compare(perspective.data, whole.data).differ },
            rendererErrors,
        };
    } finally {
        renderer.destroy();
        chunkedRenderer.destroy();
    }
});
