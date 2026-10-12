/**
 * The text atlas must not be rebuilt when the text has not changed.
 *
 * drawTextOverlays runs every frame and used to begin by wiping the glyph atlas, which threw
 * away the rasterisation cache and re-uploaded a 768x2048 RGBA canvas - 6.3 MB - twice per
 * frame, whether or not a single character had changed. Measured on an empty scene with
 * nothing loaded at all, that was 13.6 ms of GPU time per frame out of a 20 ms frame: more
 * than the entire molecule cost to draw.
 *
 * What makes this worth a test rather than a comment is that the bug is invisible. The picture
 * is correct either way; only the clock is wrong. Nothing about the rendered output would ever
 * tell you the work was wasted, which is why it survived so long.
 *
 * So these tests assert on the GL and canvas calls rather than on what the atlas looks like:
 * what gets rasterised, what gets uploaded, and - the part that keeps this honest - that the text
 * is still right afterwards.
 *
 * The contract has since moved on once more. Keying the rebuild on the content stopped the waste
 * on an *unchanged* frame, but a frame where one label out of fifty differed still threw away all
 * fifty rasterised strings and re-uploaded the atlas twice. Now the glyphs persist and only the
 * pixels that were newly drawn are sent, with texSubImage2D. So several tests below changed from
 * "rebuilds when X changes" to "rasterises only the part of X that is new", which is the whole
 * point of the exercise.
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

/** Enough of a 2D context to lay out text, recording what was drawn. */
class FakeContext2D {
    fillStyle = "";
    font = "";
    textBaseline = "";
    fillTextCalls: { text: string; font: string; colour: string }[] = [];
    clearRectCalls = 0;
    fillRectCalls = 0;

    measureText(t: string) {
        // Deterministic metrics: 10px per character, 12px tall.
        return {
            width: t.length * 10,
            actualBoundingBoxRight: t.length * 10,
            actualBoundingBoxAscent: 10,
            actualBoundingBoxDescent: 2,
        };
    }
    fillText(text: string) {
        this.fillTextCalls.push({ text, font: this.font, colour: this.fillStyle });
    }
    getImageDataCalls: { x: number; y: number; w: number; h: number }[] = [];
    getImageData(x: number, y: number, w: number, h: number) {
        this.getImageDataCalls.push({ x, y, w, h });
        return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) };
    }
    clearRect() { this.clearRectCalls++; }
    fillRect() { this.fillRectCalls++; }
    drawImage() { /* used by addImageToBigTexture, not these tests */ }
    putImageData() { /* ditto */ }
}

class FakeOffscreenCanvas {
    width: number;
    height: number;
    ctx = new FakeContext2D();
    constructor(width: number, height: number) { this.width = width; this.height = height; }
    getContext() { return this.ctx; }
}

/** Counts the calls that cost real time: the atlas upload above all. */
const makeGl = () => {
    const gl = {
        TEXTURE_2D: 1, RGBA: 2, UNSIGNED_BYTE: 3, ARRAY_BUFFER: 4, ELEMENT_ARRAY_BUFFER: 5,
        STATIC_DRAW: 6, TEXTURE_WRAP_S: 7, TEXTURE_WRAP_T: 8, TEXTURE_MIN_FILTER: 9,
        CLAMP_TO_EDGE: 10, LINEAR: 11, MAX_TEXTURE_SIZE: 12,
        getParameter: jest.fn(() => 4096),
        createTexture: jest.fn(() => ({})),
        bindTexture: jest.fn(),
        texParameteri: jest.fn(),
        texImage2D: jest.fn(),
        texSubImage2D: jest.fn(),
        createBuffer: jest.fn(() => ({})),
        bindBuffer: jest.fn(),
        bufferData: jest.fn(),
    };
    return gl;
};

const store = { getState: () => ({ sceneSettings: { backgroundColor: [1, 1, 1, 1] } }) };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let TextCanvasTexture: any;

beforeEach(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).OffscreenCanvas = FakeOffscreenCanvas;
    ({ TextCanvasTexture } = await import("../../src/WebGLgComponents/textCanvasTexture"));
});

/** One frame's worth of overlay text, as drawTextOverlays would issue it. */
const drawFrame = (atlas, strings: string[], originX = 0) => {
    const key = atlas.contentKeyFor(strings.map(text => ({ text, font: "20px helvetica" })));
    const rebuilt = atlas.beginFrame(key);
    strings.forEach((text, i) =>
        atlas.addBigTextureTextImage({ text, font: "20px helvetica", x: originX + i, y: 0, z: 0 }));
    atlas.recreateBigTextureBuffers(rebuilt);
    return rebuilt;
};

describe("text atlas rebuilding", () => {
    let gl, atlas;

    beforeEach(() => {
        gl = makeGl();
        atlas = new TextCanvasTexture(gl, true, true, {}, 768, 2048, store);
        gl.texImage2D.mockClear();
    });

    it("sends the new glyphs on the first frame, as a region rather than the whole atlas", () => {
        expect(drawFrame(atlas, ["43 fps"])).toBe(false);
        expect(gl.texSubImage2D).toHaveBeenCalledTimes(1);
        expect(gl.texImage2D).not.toHaveBeenCalled();
    });

    it("uploads nothing on a second frame with the same text", () => {
        drawFrame(atlas, ["43 fps"]);
        gl.texSubImage2D.mockClear();

        drawFrame(atlas, ["43 fps"]);
        expect(gl.texSubImage2D).not.toHaveBeenCalled();
        expect(gl.texImage2D).not.toHaveBeenCalled();
    });

    it("does not re-rasterise unchanged text", () => {
        drawFrame(atlas, ["43 fps"]);
        const before = atlas.contextBig.fillTextCalls.length;

        drawFrame(atlas, ["43 fps"]);
        expect(atlas.contextBig.fillTextCalls.length).toBe(before);
    });

    it("still moves the text, which is what does change every frame", () => {
        drawFrame(atlas, ["43 fps"], 0);
        drawFrame(atlas, ["43 fps"], 17);
        // The instance origin is the per-frame data: skipping the atlas upload must not skip this.
        expect(atlas.bigTextureTexOrigins[0]).toEqual([17, 0, 0]);
    });

    it("rasterises only the string that changed, keeping the rest", () => {
        // The point of the whole thing. One label differing used to discard every other glyph.
        drawFrame(atlas, ["43 fps", "61 draws", "1ibm"]);
        const before = atlas.contextBig.fillTextCalls.length;
        gl.texSubImage2D.mockClear();

        drawFrame(atlas, ["44 fps", "61 draws", "1ibm"]);
        expect(atlas.contextBig.fillTextCalls.length).toBe(before + 1);
        expect(atlas.contextBig.fillTextCalls.at(-1).text).toBe("44 fps");
        expect(gl.texSubImage2D).toHaveBeenCalledTimes(1);
        expect(gl.texImage2D).not.toHaveBeenCalled();
    });

    it("uploads a small region, not the whole atlas", () => {
        drawFrame(atlas, ["43 fps"]);
        atlas.contextBig.getImageDataCalls.length = 0;

        drawFrame(atlas, ["44 fps"]);
        const region = atlas.contextBig.getImageDataCalls.at(-1);
        expect(region.w * region.h).toBeLessThan(0.01 * atlas.canvasBig.width * atlas.canvasBig.height);
    });

    it("rasterises only the new string when one is added", () => {
        drawFrame(atlas, ["43 fps"]);
        const before = atlas.contextBig.fillTextCalls.length;

        drawFrame(atlas, ["43 fps", "61 draws"]);
        expect(atlas.contextBig.fillTextCalls.length).toBe(before + 1);
    });

    it("does nothing at all when a string is removed", () => {
        drawFrame(atlas, ["43 fps", "61 draws"]);
        const before = atlas.contextBig.fillTextCalls.length;
        gl.texSubImage2D.mockClear();

        drawFrame(atlas, ["43 fps"]);
        expect(atlas.contextBig.fillTextCalls.length).toBe(before);
        expect(gl.texSubImage2D).not.toHaveBeenCalled();
    });

    it("no longer cares what order the strings arrive in", () => {
        // This used to force a full rebuild, because the packing order decided the texture
        // coordinates. Each string now keeps the slot it was first given, so the order is free.
        drawFrame(atlas, ["alpha", "beta"]);
        const before = atlas.contextBig.fillTextCalls.length;
        gl.texSubImage2D.mockClear();

        drawFrame(atlas, ["beta", "alpha"]);
        expect(atlas.contextBig.fillTextCalls.length).toBe(before);
        expect(gl.texSubImage2D).not.toHaveBeenCalled();
    });

    it("treats the same text in a different font as a different glyph", () => {
        drawFrame(atlas, ["A"]);
        const before = atlas.contextBig.fillTextCalls.length;

        atlas.beginFrame(atlas.contentKeyFor([{ text: "A", font: "40px helvetica" }]));
        atlas.addBigTextureTextImage({ text: "A", font: "40px helvetica", x: 0, y: 0, z: 0 });
        atlas.recreateBigTextureBuffers();

        expect(atlas.contextBig.fillTextCalls.length).toBe(before + 1);
    });

    it("rebuilds when the text colour flips with the background", () => {
        // Light background gives black text, dark gives white. Same strings, different pixels.
        const light = atlas.contentKeyFor([{ text: "A", font: "20px helvetica" }], "black");
        const dark = atlas.contentKeyFor([{ text: "A", font: "20px helvetica" }], "white");
        expect(light).not.toEqual(dark);
    });

    it("does not confuse two strings for one joined differently", () => {
        // A naive join on an ordinary character would make ["a","b"] and ["a b"] collide.
        const two = atlas.contentKeyFor([
            { text: "a", font: "f" }, { text: "b", font: "f" }]);
        const one = atlas.contentKeyFor([{ text: "a b", font: "f" }]);
        expect(two).not.toEqual(one);
    });

    it("re-rasterises after an unrelated caller clears the atlas", () => {
        // clearBigTexture is public and called from elsewhere. It wipes the canvas, the cache and
        // the packing, so the next frame has to draw everything again - and would otherwise be
        // drawing from an atlas that had just been emptied.
        drawFrame(atlas, ["43 fps"]);
        const before = atlas.contextBig.fillTextCalls.length;

        atlas.clearBigTexture();
        drawFrame(atlas, ["43 fps"]);

        expect(atlas.contextBig.fillTextCalls.length).toBe(before + 1);
        expect(gl.texSubImage2D).toHaveBeenCalled();
    });

    it("starts from an empty atlas on the frame after it fills up", () => {
        // A string that cannot be placed is skipped for one frame rather than drawn with somebody
        // else's coordinates; the wipe happens at the next frame boundary, where no label is
        // already holding a slot that is about to move.
        const small = new TextCanvasTexture(gl, true, true, {}, 64, 64, store);
        small.beginFrame(small.contentKeyFor([{ text: "far too wide to fit", font: "20px helvetica" }]));
        small.addBigTextureTextImage({ text: "far too wide to fit", font: "20px helvetica", x: 0, y: 0, z: 0 });

        expect(small.atlasFull).toBe(true);
        expect(small.bigTextureTexOrigins.length).toBe(0);
        expect(small.beginFrame("anything")).toBe(true);
        expect(small.atlasFull).toBe(false);
    });

    it("keeps the instance arrays from growing frame on frame", () => {
        // The positions are rebuilt every frame; if the reset were skipped along with the upload,
        // every frame would append another copy and the text would multiply without limit.
        for (let i = 0; i < 5; i++) drawFrame(atlas, ["43 fps", "61 draws"]);
        expect(atlas.bigTextureTexOrigins.length).toBe(2);
    });
});
