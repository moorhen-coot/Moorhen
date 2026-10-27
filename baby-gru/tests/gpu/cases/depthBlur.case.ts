/**
 * Depth blur in the WebGPU renderer (depthBlur.ts), on a scene made to show it: seen from above,
 * a red square 5 A in front of the view centre and a green one 5 A behind it, on the black
 * background.
 *
 * What should happen, by WebGL's definitions (blur_x, blur_y and render-framebuffer shaders): with
 * the focal plane at the view centre, the square behind it is blurred - its edges soften and it
 * spreads onto the background - and the square in front, and the background round it, stay
 * exactly as without the blur (a tap on something in front of the plane counts with the centre's
 * colour, so nothing in focus spreads). With the plane behind everything, nothing changes at all;
 * with it in front of everything, both squares blur. A snapshot drawn in tiles must come out as one
 * drawn whole. And with the far square half transparent, so depth-peeled, it still blurs: where
 * nothing opaque was drawn the blur reads the nearest transparent layer's depth, as WebGL's does.
 *
 * Two things WebGL's screenshots never got right: a picture four times the canvas across blurs as
 * smoothly as the canvas does (its taps four times as far apart, each split into four, rather than
 * skipping three pixels in four and leaving ghost copies of every edge); and with a transparent
 * background, neither the square's antialiased edge nor the blur's spread onto the background
 * takes any of the background's colour (which has no alpha, so must not count).
 *
 * And one thing WebGL's blur never did: a small blurred piece glows round, not in a cross. A green
 * dot an angstrom across, behind the plane: its glow as far out along a diagonal as along an axis.
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
    light_positions: [0, 0, 50, 1], light_colours_ambient: [0.2, 0.2, 0.2, 1], light_colours_diffuse: [0.6, 0.6, 0.6, 1],
    light_colours_specular: [0, 0, 0, 1], specularPower: 32, background_colour: [0, 0, 0, 1],
};

/** In front of the view centre (towards the eye) and behind it. */
const NEAR = { x0: 1, x1: 6, y0: -3, y1: 3, z: 5 };
const FAR = { x0: -8, x1: -2, y0: -3, y1: 3, z: -5 };

const square = (s: typeof NEAR, colour: number[], transparent = false): DisplayBuffer => {
    const q: Quad = emptyQuad();
    rectangle(q, s.x0, s.y0, s.x1, s.y1, [0, 0, 1], colour);
    for (let i = 2; i < q.positions.length; i += 3) q.positions[i] = s.z;
    return {
        visible: true, alphaMultiplier: 1, dataVersion: 1, bufferTypes: ["TRIANGLES"], transparent,
        triangleVertices: [new Float32Array(q.positions)], triangleNormals: [new Float32Array(q.normals)],
        triangleColours: [new Float32Array(q.colours)], triangleIndexs: [new Uint32Array(q.indices)], symmetryMatrices: [],
    } as unknown as DisplayBuffer;
};

function scene(farTransparent = false): DisplayBuffer[] {
    return [square(NEAR, [1, 0, 0, 1]), farTransparent ? square(FAR, [0, 1, 0, 0.5], true) : square(FAR, [0, 1, 0, 1])];
}

/** A green dot an angstrom across at the view centre, 5 A behind it. */
const DOT = { x0: -0.5, x1: 0.5, y0: -0.5, y1: 0.5, z: -5 };

const PPA = HEIGHT / (48 * base.zoom);
/** Pixel column of world x, and row of world y: 1 A is HEIGHT / (48 zoom) pixels, y up, centred. */
const column = (x: number) => Math.floor(WIDTH / 2 + x * PPA);
const row = (y: number) => Math.floor(HEIGHT / 2 - y * PPA);

/** How a picture differs from another over a box of pixels (all of it by default). */
const difference = (a: Uint8ClampedArray, b: Uint8ClampedArray, box = { x0: 0, x1: WIDTH, y0: 0, y1: HEIGHT }) => {
    let differing = 0, worst = 0;
    for (let y = box.y0; y < box.y1; y++) {
        for (let x = box.x0; x < box.x1; x++) {
            const i = (y * WIDTH + x) * 4;
            const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
            if (d > 0) differing++;
            worst = Math.max(worst, d);
        }
    }
    return { differing, worst };
};

/**
 * Along the middle row, from x0 to x1 A: pixels of `channel` part way between the background and
 * the square's inside (between a tenth and nine tenths of it) - how wide the square's edges are.
 */
const softPixels = (data: Uint8ClampedArray, channel: number, x0: number, x1: number, inside: number): number => {
    let soft = 0;
    const y = row(0);
    for (let x = column(x0); x <= column(x1); x++) {
        const v = data[(y * WIDTH + x) * 4 + channel];
        if (v > 0.1 * inside && v < 0.9 * inside) soft++;
    }
    return soft;
};

export interface DepthBlurReport {
    /** Pixels part way across each square's left and right edges, along the middle row. */
    edges: {
        plain: { near: number; far: number };
        focusAtCentre: { near: number; far: number };
        focusInFront: { near: number; far: number };
    };
    /** Focal plane at the centre: the near square and the background round it, against no blur. */
    nearUnchanged: { differing: number; worst: number };
    /** Focal plane at the centre: the far square and round it, against no blur. */
    farChanged: { differing: number; worst: number };
    /** Focal plane behind everything: the whole picture against no blur. */
    focusBehind: { differing: number; worst: number };
    /** Focal plane at the centre, drawn in 6 tiles and whole: how far apart. */
    tiled: { differing: number; worst: number; tiles: number };
    /** The far square half transparent: layers peeled, and its edges without and with the blur. */
    peeled: { layers: number; plain: number; focusAtCentre: number };
    /**
     * The canvas a quarter of the picture across, so the blur reaches four times as far: down a
     * column towards the far square's top edge, where the blur spreads onto the background, the
     * largest step from one pixel to the next in green, against the square's own green, and how
     * many pixels the spread covers. (At the edge itself the picture steps: inside, a tap on the
     * background counts with the centre's colour, so the square does not fade, as in WebGL.)
     */
    scaled: { largestStep: number; green: number; reach: number };
    /**
     * The dot, blurred four times as far as on the canvas: its glow's green out from its centre,
     * along an axis and along a diagonal, as far out each way, at a few distances.
     */
    glow: { distance: number; axis: number; diagonal: number }[];
    /**
     * A white background, transparent: round the far square, the partly transparent pixels - its
     * antialiased edge and the blur's spread - how many, and the most red and blue any has, times
     * its alpha (the square is pure green; white bleeding in would show as both).
     */
    transparent: { partly: number; worstRedBlue: number };
    rendererErrors: string[];
}

export default defineCase(async (_device: GPUDevice): Promise<DepthBlurReport> => {
    const rendererErrors: string[] = [];
    const renderer = await WebGPUPreviewRenderer.create(document.createElement("canvas"), message => rendererErrors.push(message));
    const buffers = scene();
    const shot = async (over: Partial<PreviewCameraSource>, maxTile?: number) =>
        await renderer.snapshot(buffers, { ...base, ...over }, [], WIDTH, HEIGHT, maxTile ? { maxTile } : {});
    const blur = (blurDepth: number): Partial<PreviewCameraSource> => ({ useOffScreenBuffers: true, blurSize: 3, blurDepth });
    try {
        const plain = (await shot({})).data;
        const centre = (await shot(blur(0))).data;
        const inFront = (await shot(blur(-1000))).data;
        const behind = (await shot(blur(1000))).data;

        // The squares' insides, from the plain picture.
        const inside = (channel: number, s: typeof NEAR) => plain[(row(0) * WIDTH + column((s.x0 + s.x1) / 2)) * 4 + channel];
        const red = inside(0, NEAR), green = inside(1, FAR);
        const widths = (data: Uint8ClampedArray) => ({
            near: softPixels(data, 0, NEAR.x0 - 1, NEAR.x1 + 1, red),
            far: softPixels(data, 1, FAR.x0 - 1, FAR.x1 + 1, green),
        });
        // Boxes round each square, a little over an angstrom beyond it: further than the blur reaches.
        const around = (s: typeof NEAR) => ({ x0: column(s.x0 - 1.2), x1: column(s.x1 + 1.2), y0: row(s.y1 + 1.2), y1: row(s.y0 - 1.2) });

        const whole = centre;
        const tiledShot = await shot(blur(0), 90);

        const seeThrough = scene(true);
        const peeledPlain = await renderer.snapshot(seeThrough, base, [], WIDTH, HEIGHT);
        const peeledBlur = await renderer.snapshot(seeThrough, { ...base, ...blur(0) }, [], WIDTH, HEIGHT);
        const halfGreen = peeledPlain.data[(row(0) * WIDTH + column((FAR.x0 + FAR.x1) / 2)) * 4 + 1];
        const peeled = {
            layers: peeledBlur.report.peelLayers,
            plain: softPixels(peeledPlain.data, 1, FAR.x0 - 1, FAR.x1 + 1, halfGreen),
            focusAtCentre: softPixels(peeledBlur.data, 1, FAR.x0 - 1, FAR.x1 + 1, halfGreen),
        };
        // Four times the canvas: the same picture, with a canvas a quarter as wide.
        const scaledShot = (await shot({ ...blur(0), canvas: { width: WIDTH / 4 } })).data;
        const x = column((FAR.x0 + FAR.x1) / 2);
        let largestStep = 0, reach = 0;
        for (let y = row(FAR.y1) - 40; y < row(FAR.y1) - 2; y++) {
            const here = scaledShot[(y * WIDTH + x) * 4 + 1], next = scaledShot[((y + 1) * WIDTH + x) * 4 + 1];
            largestStep = Math.max(largestStep, Math.abs(next - here));
            if (here > 0) reach++;
        }

        // Transparent, on white.
        const clear = (await renderer.snapshot(buffers, { ...base, ...blur(0), background_colour: [1, 1, 1, 1] }, [], WIDTH, HEIGHT,
            { transparentBackground: true })).data;
        let partly = 0, worstRedBlue = 0;
        const box = around(FAR);
        for (let y = box.y0; y < box.y1; y++) {
            for (let x = box.x0; x < box.x1; x++) {
                const i = (y * WIDTH + x) * 4;
                if (clear[i + 3] === 0 || clear[i + 3] === 255) continue;
                partly++;
                // As it shows over anything: premultiplied. Straight, a pixel almost wholly clear
                // can read a few levels of red from rounding, which nothing could see.
                worstRedBlue = Math.max(worstRedBlue, clear[i] * clear[i + 3] / 255, clear[i + 2] * clear[i + 3] / 255);
            }
        }

        const dotShot = (await renderer.snapshot([square(DOT, [0, 1, 0, 1])], { ...base, ...blur(0), canvas: { width: WIDTH / 4 } }, [], WIDTH, HEIGHT)).data;
        const glow = [8, 12, 16].map(distance => {
            const cx = column(0), cy = row(0);
            const d = Math.round(distance / Math.SQRT2);
            const g = (x: number, y: number) => dotShot[(y * WIDTH + x) * 4 + 1];
            return {
                distance,
                axis: (g(cx + distance, cy) + g(cx - distance, cy) + g(cx, cy + distance) + g(cx, cy - distance)) / 4,
                diagonal: (g(cx + d, cy + d) + g(cx - d, cy + d) + g(cx + d, cy - d) + g(cx - d, cy - d)) / 4,
            };
        });

        return {
            glow,
            scaled: { largestStep, green, reach },
            transparent: { partly, worstRedBlue },
            edges: { plain: widths(plain), focusAtCentre: widths(centre), focusInFront: widths(inFront) },
            nearUnchanged: difference(centre, plain, around(NEAR)),
            farChanged: difference(centre, plain, around(FAR)),
            focusBehind: difference(behind, plain),
            tiled: { ...difference(tiledShot.data, whole), tiles: tiledShot.tiles },
            peeled,
            rendererErrors,
        };
    } finally {
        renderer.destroy();
    }
});
