/**
 * Where texture pixels live, and the decisions baked into uploading them.
 *
 * Two of those decisions are easy to reverse by accident later and hard to notice, so they are
 * pinned here rather than left to a comment:
 *
 *   The internal format is RGBA, not SRGB8_ALPHA8. An sRGB format makes the sampler decode to
 *   linear, which is right in a renderer that works in linear light and encodes once at the end.
 *   Moorhen does not - vertex colours are used as they are and nothing gamma-encodes the output -
 *   so decoding the texture alone would make every texture darker than the equivalent vertex
 *   colour. Correct in isolation, wrong against everything around it.
 *
 *   Mipmaps are generated and the minification filter is trilinear. Without them a textured
 *   surface at any distance aliases into a shimmer as the camera moves, which is far worse than
 *   the blur.
 *
 * And one piece of discipline: the upload sets activeTexture to 0 itself rather than inheriting
 * it, because the draw loop leaves it on unit 9 after a hovered buffer.
 */
import {
    checkerboardTexture,
    forgetTexture,
    getTextureSource,
    glTextureFor,
    registerTexture,
    type TextureSource,
} from "../../src/WebGLgComponents/textureRegistry";

/** Just enough of a WebGL context to watch what the upload does. */
const fakeGl = () => {
    const calls: { name: string; args: unknown[] }[] = [];
    const record = (name: string) => (...args: unknown[]) => {
        calls.push({ name, args });
        return undefined;
    };
    let created = 0;
    const gl = {
        TEXTURE_2D: 3553,
        TEXTURE0: 33984,
        RGBA: 6408,
        SRGB8_ALPHA8: 35907,
        UNSIGNED_BYTE: 5121,
        TEXTURE_MIN_FILTER: 10241,
        TEXTURE_MAG_FILTER: 10240,
        TEXTURE_WRAP_S: 10242,
        TEXTURE_WRAP_T: 10243,
        LINEAR: 9729,
        LINEAR_MIPMAP_LINEAR: 9987,
        CLAMP_TO_EDGE: 33071,
        createTexture: () => { created++; return { id: created } as unknown as WebGLTexture; },
        activeTexture: record("activeTexture"),
        bindTexture: record("bindTexture"),
        texImage2D: record("texImage2D"),
        generateMipmap: record("generateMipmap"),
        texParameteri: record("texParameteri"),
        deleteTexture: record("deleteTexture"),
    };
    return { gl: gl as unknown as WebGLRenderingContext, calls, createdCount: () => created };
};

const oneByOne = (): TextureSource => ({ width: 1, height: 1, rgba: new Uint8Array([1, 2, 3, 4]) });

describe("registering image data", () => {
    it("gives back an id that resolves to the source", () => {
        const source = oneByOne();
        const id = registerTexture(source);
        expect(getTextureSource(id)).toBe(source);
    });

    it("gives different ids to different textures", () => {
        expect(registerTexture(oneByOne())).not.toBe(registerTexture(oneByOne()));
    });

    it("lets a texture be replaced under its own id", () => {
        const id = registerTexture(oneByOne());
        const replacement = oneByOne();
        registerTexture(replacement, id);
        expect(getTextureSource(id)).toBe(replacement);
    });

    it("forgets a texture completely", () => {
        const id = registerTexture(oneByOne());
        forgetTexture(id);
        expect(getTextureSource(id)).toBeUndefined();
    });
});

describe("uploading", () => {
    it("uses RGBA, not an sRGB format", () => {
        const { gl, calls } = fakeGl();
        const id = registerTexture(oneByOne());
        expect(glTextureFor(gl, id)).toBeTruthy();

        const upload = calls.find(c => c.name === "texImage2D")!;
        expect(upload.args[2]).toBe(6408);       // internalformat RGBA
        expect(upload.args[2]).not.toBe(35907);  // not SRGB8_ALPHA8
        expect(upload.args[6]).toBe(6408);       // format RGBA
    });

    it("generates mipmaps and minifies trilinearly", () => {
        const { gl, calls } = fakeGl();
        glTextureFor(gl, registerTexture(oneByOne()));

        expect(calls.some(c => c.name === "generateMipmap")).toBe(true);
        const minFilter = calls.find(c => c.name === "texParameteri" && c.args[1] === 10241)!;
        expect(minFilter.args[2]).toBe(9987); // LINEAR_MIPMAP_LINEAR
    });

    it("clamps rather than repeating, so a stray coordinate looks like a mistake", () => {
        const { gl, calls } = fakeGl();
        glTextureFor(gl, registerTexture(oneByOne()));
        for (const wrap of [10242, 10243]) {
            expect(calls.find(c => c.name === "texParameteri" && c.args[1] === wrap)!.args[2])
                .toBe(33071); // CLAMP_TO_EDGE
        }
    });

    it("sets the active unit to 0 itself rather than inheriting it", () => {
        // The draw loop leaves activeTexture on unit 9 after a hovered buffer, so an upload that
        // inherited the current unit would land on the hover-influence texture's unit.
        const { gl, calls } = fakeGl();
        glTextureFor(gl, registerTexture(oneByOne()));
        const firstActive = calls.find(c => c.name === "activeTexture")!;
        expect(firstActive.args[0]).toBe(33984); // TEXTURE0
    });

    it("uploads once and caches thereafter", () => {
        const { gl, createdCount } = fakeGl();
        const id = registerTexture(oneByOne());
        const first = glTextureFor(gl, id);
        const second = glTextureFor(gl, id);
        expect(second).toBe(first);
        expect(createdCount()).toBe(1);
    });

    it("re-uploads after the texture is replaced", () => {
        const { gl, createdCount } = fakeGl();
        const id = registerTexture(oneByOne());
        glTextureFor(gl, id);
        registerTexture(oneByOne(), id);
        glTextureFor(gl, id);
        expect(createdCount()).toBe(2);
    });

    it("returns null for an id nobody registered, rather than throwing", () => {
        // A mesh from a reopened session refers to a texture that no longer exists; it should
        // come back in its plain colour, not break the frame.
        const { gl } = fakeGl();
        expect(glTextureFor(gl, "never-registered")).toBeNull();
    });

    it("refuses a source with less data than its stated size", () => {
        const { gl } = fakeGl();
        const id = registerTexture({ width: 8, height: 8, rgba: new Uint8Array(4) });
        expect(glTextureFor(gl, id)).toBeNull();
    });
});

describe("the test checkerboard", () => {
    const at = (source: TextureSource, row: number, column: number) => {
        const i = 4 * (row * source.width + column);
        return [source.rgba[i], source.rgba[i + 1], source.rgba[i + 2]];
    };
    const dominant = (rgb: number[]) => {
        const [r, g, b] = rgb;
        if (r > 150 && g < 120 && b < 120) return "red";
        if (g > 150 && r < 120 && b < 120) return "green";
        if (b > 150 && r < 120) return "blue";
        if (r > 150 && g > 150 && b < 120) return "yellow";
        return "grey";
    };

    it("is the size asked for, and opaque", () => {
        const source = checkerboardTexture(64);
        expect(source.width).toBe(64);
        expect(source.height).toBe(64);
        expect(source.rgba.length).toBe(64 * 64 * 4);
        expect(source.rgba[3]).toBe(255);
    });

    it("marks each corner differently, so a flip or a transpose is visible", () => {
        // This is the whole point of the texture. A plain checkerboard is symmetric under a
        // vertical flip, which is exactly the fault most likely to be present.
        const source = checkerboardTexture(64);
        const last = 63;
        expect(dominant(at(source, 0, 0))).toBe("red");            // top-left
        expect(dominant(at(source, 0, last))).toBe("green");       // top-right
        expect(dominant(at(source, last, 0))).toBe("blue");        // bottom-left
        expect(dominant(at(source, last, last))).toBe("yellow");   // bottom-right
    });

    it("has a checker pattern between the corners", () => {
        const source = checkerboardTexture(64, 8);
        const middle = 32;
        // Two neighbouring checks at the centre, which no corner marker reaches.
        expect(at(source, middle, middle)).not.toEqual(at(source, middle, middle + 8));
    });
});
