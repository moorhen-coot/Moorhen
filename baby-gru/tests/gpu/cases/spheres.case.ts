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
 *   drawn (Stuart's old WebGL bug cut a ring out of the cap, or shrank it) - including once the
 *   centre has crossed the plane, until the back of the sphere has (the sphere used to vanish as
 *   its centre crossed, its square clipped by the near plane), orthographic and in perspective;
 * - overlapping caps meet as a cut through the spheres would: each point of the cut shows the
 *   sphere whose power distance there is least, whichever is drawn first; and a line is drawn
 *   where they meet, so that caps of one colour do not run together;
 * - chunking: spheres split over several buffers draw the same picture;
 * - a hover highlight's spheres all take the hover size (glRef.hoverSize + 0.4) once that is past
 *   the default;
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

/**
 * Each pixel of a cut through overlapping spheres, from first principles: the sphere whose cap
 * should show there (the least power distance |p - c|^2 - r^2 at the pixel's point p on the front
 * plane, where their surfaces' seam is) and the next; how far the pixel is, in pixels, from the
 * seam between those two and from the cap's rim; and whether the next one's cap is there too.
 * Null where the pixel's point is in no sphere.
 */
function cutPixels(spheres: Sphere[], source: PreviewCameraSource): ({ px: number; py: number; best: number; overlap: boolean; seam: number; rim: number } | null)[] {
    const f = frameUniforms(source, WIDTH, HEIGHT);
    const projection = f.slice(0, 16), view = f.slice(16, 32);
    const plane = f.slice(68, 72);
    const normal = Array.from(plane.slice(0, 3)).map(v => v / Math.hypot(plane[0], plane[1], plane[2]));
    const perspective = projection[11] !== 0;
    const centres = spheres.map(s => [0, 1, 2].map(r => view[r] * s.centre[0] + view[4 + r] * s.centre[1] + view[8 + r] * s.centre[2] + view[12 + r]));
    const out: ReturnType<typeof cutPixels> = [];
    for (let py = 0; py < HEIGHT; py++) for (let px = 0; px < WIDTH; px++) {
        const nx = (px + 0.5) / WIDTH * 2 - 1, ny = 1 - (py + 0.5) / HEIGHT * 2;
        let p: number[];
        if (perspective) {
            const d = [(nx + projection[8]) / projection[0], (ny + projection[9]) / projection[5], -1];
            const t = -plane[3] / (plane[0] * d[0] + plane[1] * d[1] + plane[2] * d[2]);
            p = d.map(v => v * t);
        } else {
            const ex = (nx - projection[12]) / projection[0], ey = (ny - projection[13]) / projection[5];
            p = [ex, ey, -(plane[0] * ex + plane[1] * ey + plane[3]) / plane[2]];
        }
        const pixelSize = 2 / (projection[0] * WIDTH) * (perspective ? Math.abs(p[2]) : 1);
        const power = centres.map((c, k) => (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2 - spheres[k].radius ** 2);
        const [best, next] = power.map((_, k) => k).sort((a, b) => power[a] - power[b]);
        if (power[best] >= 0) {
            out.push(null);
            continue;
        }
        // Along the plane the power distance rises at 2 |p - c| (in the plane) toward the rim, and
        // the difference of two at 2 |c1 - c2| (in the plane) across their seam.
        const inPlane = (v: number[]) => { const n = v[0] * normal[0] + v[1] * normal[1] + v[2] * normal[2]; return Math.hypot(...v.map((x, k) => x - n * normal[k])); };
        const rimSlope = 2 * Math.max(inPlane(p.map((x, k) => x - centres[best][k])), spheres[best].radius * 0.3);
        const rim = -power[best] / rimSlope / pixelSize;
        let seam = Infinity;
        if (next !== undefined) {
            const slope = 2 * inPlane(centres[best].map((x, k) => x - centres[next][k]));
            if (slope > 1e-4) seam = (power[next] - power[best]) / slope / pixelSize;
        }
        out.push({ px, py, best, overlap: next !== undefined && power[next] < 0, seam, rim });
    }
    return out;
}

/**
 * Overlapping spheres cut by the front plane, with clip caps: each pixel's point on the plane should
 * show the sphere whose power distance there is least, in its flat colour. Pixels within 2.5
 * pixels of a seam (where the line is) or 1.5 of a cap's rim, or near a sphere's silhouette (cut a
 * little short, as WebGL's), are not judged.
 */
function capOwnerErrors(spheres: Sphere[], source: PreviewCameraSource, image: Uint8ClampedArray): { checked: number; overlap: number; wrong: number } {
    let checked = 0, overlap = 0, wrong = 0;
    for (const pixel of cutPixels(spheres, source)) {
        if (!pixel || pixel.rim < 1.5 || pixel.seam < 2.5) continue;
        const sphere = spheres[pixel.best];
        checked++;
        if (pixel.overlap) overlap++;
        const i = (pixel.py * WIDTH + pixel.px) * 4;
        if ([0, 1, 2].some(c => Math.abs(image[i + c] - 255 * sphere.colour[c]) > 3)) wrong++;
    }
    return { checked, overlap, wrong };
}

/**
 * The line where two caps meet: pixels within half a pixel of the seam (on it), and 2.5 pixels or
 * more from it and from the rim (away); how many of each are darker than the cap's flat colour.
 */
function capSeamLine(spheres: Sphere[], source: PreviewCameraSource, image: Uint8ClampedArray): { on: number; onDark: number; away: number; awayDark: number } {
    let on = 0, onDark = 0, away = 0, awayDark = 0;
    for (const pixel of cutPixels(spheres, source)) {
        if (!pixel || pixel.rim < 2.5) continue;
        const i = (pixel.py * WIDTH + pixel.px) * 4;
        const colour = spheres[pixel.best].colour;
        const dark = [0, 1, 2].every(c => image[i + c] < 255 * colour[c] * 0.75 + 1);
        if (pixel.seam < 0.5 && pixel.overlap) {
            on++;
            if (dark) onDark++;
        } else if (pixel.seam >= 2.5) {
            away++;
            if (dark) awayDark++;
        }
    }
    return { on, onDark, away, awayDark };
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
    /**
     * Spheres of radius 4, capped, with centres from 3.8 A in front of the front plane (most of the
     * sphere past it) to 2.4 A behind it.
     */
    capErrors: { holes: number; extra: number; expected: number };
    /**
     * The same in perspective, the pixels drawn with the centre 0.5 to 3.5 A in front of the plane
     * (each should show a cut), and with it 4.5 A in front (all of it past the plane: nothing).
     */
    perspectiveCut: { drawn: number[]; gone: number };
    /**
     * Two overlapping spheres, one centre in front of the plane and one behind, drawn in both
     * orders, orthographic and in perspective: pixels judged, those in both caps, and wrong ones.
     */
    capOwners: { label: string; checked: number; overlap: number; wrong: number }[];
    /** The same pair in one colour: the line where their caps meet (capSeamLine). */
    capSeams: { label: string; on: number; onDark: number; away: number; awayDark: number }[];
    depth: { centre: number[]; centreOtherOrder: number[]; smallAlone: number[] };
    beyondBackPlane: number;
    chunked: { differ: number; drawn: number };
    tiled: { differ: number; tiles: number };
    perspectiveTiled: { differ: number; drawn: number; fromOrthographic: number };
    /** A hover sphere of size 0.3 with hoverSize 1.6, against a plain sphere of radius 2; and at the default. */
    hover: { drawn: number; plainDrawn: number; differ: number; atDefault: number; smallDrawn: number };
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

        // Centres from 3.8 A in front of the front plane (world z = 20) to 2.4 A behind it; the old
        // WebGL bug cut a ring from the cap for anything closer than r/3 (1.33 A). In front of the
        // plane, the sphere used to vanish whole, its square (at the centre's depth) clipped by the
        // projection's near plane, which is the front plane; WebGL's still does.
        const errors = { holes: 0, extra: 0, expected: 0 };
        for (const d of [-3.8, -3, -2, -1, -0.4, -0.05, 0, 0.2, 0.4, 0.8, 1.2, 1.6, 2.4]) {
            const sphere: Sphere = { centre: [0, 0, 20 - d], radius: 4, colour: [0.8, 0.8, 0.2, 1] };
            const image = await shot([sphereBuffer([sphere])], capCamera);
            const e = capErrors(sphere, capCamera, image.data);
            errors.holes += e.holes;
            errors.extra += e.extra;
            errors.expected += e.expected;
        }

        const perspectiveCap = { ...camera(true, [0, 0, 0, 1], true) };
        const perspectiveCut = { drawn: [] as number[], gone: 0 };
        for (const d of [-0.5, -1.5, -2.5, -3.5]) {
            const image = await shot([sphereBuffer([{ centre: [0, 0, 20 - d], radius: 4, colour: [0.8, 0.8, 0.2, 1] }])], perspectiveCap);
            perspectiveCut.drawn.push(drawnPixels(image.data));
        }
        perspectiveCut.gone = drawnPixels((await shot([sphereBuffer([{ centre: [0, 0, 24.5], radius: 4, colour: [0.8, 0.8, 0.2, 1] }])], perspectiveCap)).data);

        // Overlapping caps: a red sphere 0.8 A in front of the plane and a blue one 1 A behind it.
        const pair: Sphere[] = [
            { centre: [-2.2, 0.3, 20.8], radius: 4, colour: [0.9, 0.2, 0.1, 1] },
            { centre: [2.3, -0.2, 19], radius: 3.5, colour: [0.1, 0.3, 0.9, 1] },
        ];
        const capOwners: SpheresReport["capOwners"] = [];
        for (const [label, source] of [["orthographic", capCamera], ["perspective", perspectiveCap]] as const) {
            for (const [order, spheres] of [["red first", pair], ["blue first", [pair[1], pair[0]]]] as const) {
                const image = await shot([sphereBuffer([...spheres])], source);
                capOwners.push({ label: `${label}, ${order}`, ...capOwnerErrors(pair, source, image.data) });
            }
        }
        const samePair = pair.map(sphere => ({ ...sphere, colour: [0.8, 0.7, 0.5, 1] }));
        const capSeams: SpheresReport["capSeams"] = [];
        for (const [label, source] of [["orthographic", capCamera], ["perspective", perspectiveCap]] as const) {
            const image = await shot([sphereBuffer(samePair)], source);
            capSeams.push({ label, ...capSeamLine(samePair, source, image.data) });
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

        const hoverCamera = { ...front, store: { getState: () => ({ glRef: { hoverSize: 1.6 } }) } };
        const defaultCamera = { ...front, store: { getState: () => ({ glRef: { hoverSize: 0.27 } }) } };
        const hoverBuffer = sphereBuffer([{ centre: [0, 0, 0], radius: 0.3, colour: [1, 0.5, 0, 1] }]);
        hoverBuffer.isHoverBuffer = true;
        const hovered = await shot([hoverBuffer], hoverCamera);
        const plain = await shot([sphereBuffer([{ centre: [0, 0, 0], radius: 2, colour: [1, 0.5, 0, 1] }])], hoverCamera);
        const atDefault = await shot([hoverBuffer], defaultCamera);
        const smallPlain = await shot([sphereBuffer([{ centre: [0, 0, 0], radius: 0.3, colour: [1, 0.5, 0, 1] }])], defaultCamera);

        const singleComparison = compare(single.data, expected);
        return {
            pixels: WIDTH * HEIGHT,
            single: { drawn: drawnPixels(single.data), expected: drawnPixels(expected), ...singleComparison },
            cut: { drawn: drawnPixels(cut.data), expected: drawnPixels(cutExpected), ...compare(cut.data, cutExpected) },
            capped: { drawn: drawnPixels(capped.data), expected: drawnPixels(cappedExpected), ...compare(capped.data, cappedExpected), flat },
            capErrors: errors,
            perspectiveCut,
            capOwners,
            capSeams,
            depth: { centre: pixel(bigFirst.data, cx, cy), centreOtherOrder: pixel(smallFirst.data, cx, cy), smallAlone: pixel(smallAlone.data, cx, cy) },
            beyondBackPlane: drawnPixels(far.data),
            chunked: { differ: compare(chunked.data, whole.data, 0).differ, drawn: drawnPixels(whole.data) },
            tiled: { differ: compare(tiled.data, whole.data).differ, tiles: tiled.tiles },
            perspectiveTiled: { differ: compare(perspectiveTiled.data, perspective.data).differ, drawn: drawnPixels(perspective.data), fromOrthographic: compare(perspective.data, whole.data).differ },
            hover: {
                drawn: drawnPixels(hovered.data), plainDrawn: drawnPixels(plain.data), differ: compare(hovered.data, plain.data).differ,
                atDefault: drawnPixels(atDefault.data), smallDrawn: drawnPixels(smallPlain.data),
            },
            rendererErrors,
        };
    } finally {
        renderer.destroy();
        chunkedRenderer.destroy();
    }
});
