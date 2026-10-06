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
 * that an unchanged frame uploads nothing and rasterises nothing, that a changed one does both,
 * and - the part that keeps this honest - that the text is still right afterwards.
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

    it("uploads the atlas on the first frame, because there is nothing cached yet", () => {
        expect(drawFrame(atlas, ["43 fps"])).toBe(true);
        expect(gl.texImage2D).toHaveBeenCalled();
    });

    it("uploads nothing on a second frame with the same text", () => {
        drawFrame(atlas, ["43 fps"]);
        gl.texImage2D.mockClear();

        expect(drawFrame(atlas, ["43 fps"])).toBe(false);
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

    it("rebuilds when the text changes", () => {
        drawFrame(atlas, ["43 fps"]);
        gl.texImage2D.mockClear();

        expect(drawFrame(atlas, ["44 fps"])).toBe(true);
        expect(gl.texImage2D).toHaveBeenCalled();
        expect(atlas.contextBig.fillTextCalls.map(c => c.text)).toContain("44 fps");
    });

    it("rebuilds when a string is added", () => {
        drawFrame(atlas, ["43 fps"]);
        gl.texImage2D.mockClear();
        expect(drawFrame(atlas, ["43 fps", "61 draws"])).toBe(true);
        expect(gl.texImage2D).toHaveBeenCalled();
    });

    it("rebuilds when a string is removed", () => {
        drawFrame(atlas, ["43 fps", "61 draws"]);
        gl.texImage2D.mockClear();
        expect(drawFrame(atlas, ["43 fps"])).toBe(true);
    });

    it("rebuilds when the same strings arrive in a different order", () => {
        // Order decides atlas layout, so the texture coordinates differ even though the set does
        // not. Treating these as equal would leave every label showing its neighbour's glyphs.
        drawFrame(atlas, ["alpha", "beta"]);
        gl.texImage2D.mockClear();
        expect(drawFrame(atlas, ["beta", "alpha"])).toBe(true);
    });

    it("rebuilds when only the font changes", () => {
        atlas.beginFrame(atlas.contentKeyFor([{ text: "A", font: "20px helvetica" }]));
        atlas.addBigTextureTextImage({ text: "A", font: "20px helvetica", x: 0, y: 0, z: 0 });
        gl.texImage2D.mockClear();

        const rebuilt = atlas.beginFrame(atlas.contentKeyFor([{ text: "A", font: "40px helvetica" }]));
        expect(rebuilt).toBe(true);
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

    it("rebuilds after an unrelated caller clears the atlas", () => {
        // clearBigTexture is public and called from elsewhere. If it left the key standing, the
        // next frame would skip the upload and draw from an atlas that had just been wiped.
        drawFrame(atlas, ["43 fps"]);
        atlas.clearBigTexture();
        gl.texImage2D.mockClear();

        expect(drawFrame(atlas, ["43 fps"])).toBe(true);
        expect(gl.texImage2D).toHaveBeenCalled();
    });

    it("keeps the instance arrays from growing frame on frame", () => {
        // The positions are rebuilt every frame; if the reset were skipped along with the upload,
        // every frame would append another copy and the text would multiply without limit.
        for (let i = 0; i < 5; i++) drawFrame(atlas, ["43 fps", "61 draws"]);
        expect(atlas.bigTextureTexOrigins.length).toBe(2);
    });
});
