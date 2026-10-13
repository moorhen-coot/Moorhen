/**
 * Working out which image a glTF material wants.
 *
 * The chain is four hops - material -> baseColorTexture -> texture -> image -> bytes - and every
 * one of them is optional in the format, so most of what this checks is the ways it legitimately
 * stops short. None of those is an error: a material that names no image, or names one we cannot
 * decode, draws in its base colour, which is what it did before textures existed. Refusing an
 * import because one of fifteen images is a format the browser dislikes would be a poor trade.
 *
 * The decoder is injected. jsdom has neither createImageBitmap nor OffscreenCanvas, and a test
 * that supplied both would be testing the browser rather than this.
 */
import { gltfMaterialTextures, type ImageDecode } from "../../src/utils/gltfTextures";
import { getTextureSource } from "../../src/WebGLgComponents/textureRegistry";

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);

/** A decoder that records what it was asked and returns a 1x1 image. */
const recordingDecode = () => {
    const seen: { bytes: Uint8Array; mimeType: string }[] = [];
    const decode: ImageDecode = async (bytes, mimeType) => {
        seen.push({ bytes, mimeType });
        return { width: 1, height: 1, rgba: new Uint8Array([seen.length, 0, 0, 255]) };
    };
    return { decode, seen };
};

const asGltf = (json: unknown): ArrayBuffer => {
    const text = new TextEncoder().encode(JSON.stringify(json));
    return text.buffer.slice(text.byteOffset, text.byteOffset + text.byteLength) as ArrayBuffer;
};

/** A document with one material pointing at one image, however that image is supplied. */
const document = (image: Record<string, unknown>, extra: Record<string, unknown> = {}) => asGltf({
    asset: { version: "2.0" },
    materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }],
    textures: [{ source: 0 }],
    images: [image],
    ...extra,
});

describe("finding a material's texture", () => {
    it("decodes an image given as a file beside the document", async () => {
        const { decode, seen } = recordingDecode();
        const textures = await gltfMaterialTextures(
            document({ uri: "wood.png", mimeType: "image/png" }),
            new Map([["wood.png", PNG_BYTES]]),
            decode
        );

        expect(textures.get(0)).toBeDefined();
        expect(Array.from(seen[0].bytes)).toEqual(Array.from(PNG_BYTES));
        expect(seen[0].mimeType).toBe("image/png");
        expect(getTextureSource(textures.get(0)!)).toBeDefined();
    });

    it("decodes an image embedded as a data URI", async () => {
        const { decode, seen } = recordingDecode();
        let binary = "";
        for (const byte of PNG_BYTES) binary += String.fromCharCode(byte);
        const textures = await gltfMaterialTextures(
            document({ uri: "data:image/png;base64," + btoa(binary) }),
            new Map(),
            decode
        );
        expect(textures.get(0)).toBeDefined();
        expect(Array.from(seen[0].bytes)).toEqual(Array.from(PNG_BYTES));
    });

    it("decodes an image held in a bufferView", async () => {
        // How a .glb carries its images, and a .gltf can too.
        let binary = "";
        for (const byte of PNG_BYTES) binary += String.fromCharCode(byte);
        const { decode, seen } = recordingDecode();
        const textures = await gltfMaterialTextures(
            document({ bufferView: 0, mimeType: "image/png" }, {
                buffers: [{ byteLength: PNG_BYTES.length, uri: "data:application/octet-stream;base64," + btoa(binary) }],
                bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: PNG_BYTES.length }],
            }),
            new Map(),
            decode
        );
        expect(textures.get(0)).toBeDefined();
        expect(Array.from(seen[0].bytes)).toEqual(Array.from(PNG_BYTES));
    });

    it("decodes a shared image once and gives both materials the same texture", async () => {
        // Common in an exported scene, and decoding twice would upload the same pixels twice.
        const { decode, seen } = recordingDecode();
        const textures = await gltfMaterialTextures(asGltf({
            materials: [
                { pbrMetallicRoughness: { baseColorTexture: { index: 0 } } },
                { pbrMetallicRoughness: { baseColorTexture: { index: 1 } } },
            ],
            textures: [{ source: 0 }, { source: 0 }],
            images: [{ uri: "shared.png" }],
        }), new Map([["shared.png", PNG_BYTES]]), decode);

        expect(seen).toHaveLength(1);
        expect(textures.get(0)).toBe(textures.get(1));
    });

    it("skips a material with no base colour texture", async () => {
        const { decode } = recordingDecode();
        const textures = await gltfMaterialTextures(asGltf({
            materials: [{ pbrMetallicRoughness: { baseColorFactor: [1, 0, 0, 1] } }],
            images: [{ uri: "wood.png" }],
        }), new Map([["wood.png", PNG_BYTES]]), decode);
        expect(textures.size).toBe(0);
    });

    it("skips a material asking for a coordinate set we do not read", async () => {
        // TEXCOORD_1 is legal and the importer reads only TEXCOORD_0, so texturing it would use
        // the wrong coordinates - visibly wrong, and wrong in a way that looks like our bug.
        const { decode } = recordingDecode();
        const textures = await gltfMaterialTextures(asGltf({
            materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0, texCoord: 1 } } }],
            textures: [{ source: 0 }],
            images: [{ uri: "wood.png" }],
        }), new Map([["wood.png", PNG_BYTES]]), decode);
        expect(textures.size).toBe(0);
    });

    it("skips a texture whose image comes from an extension", async () => {
        // KHR_texture_basisu and friends put the image somewhere `source` does not point, and it
        // would be a format the browser cannot decode anyway.
        const { decode } = recordingDecode();
        const textures = await gltfMaterialTextures(asGltf({
            materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }],
            textures: [{ extensions: { KHR_texture_basisu: { source: 0 } } }],
            images: [{ uri: "wood.ktx2" }],
        }), new Map([["wood.ktx2", PNG_BYTES]]), decode);
        expect(textures.size).toBe(0);
    });

    it("carries on when the image file was not opened with the glTF", async () => {
        // The geometry is still worth having, so this is a warning rather than a refusal.
        const { decode, seen } = recordingDecode();
        const textures = await gltfMaterialTextures(
            document({ uri: "missing.png" }), new Map(), decode);
        expect(textures.size).toBe(0);
        expect(seen).toHaveLength(0);
    });

    it("carries on when the decoder cannot read the image", async () => {
        const failing: ImageDecode = async () => null;
        const textures = await gltfMaterialTextures(
            document({ uri: "wood.png" }), new Map([["wood.png", PNG_BYTES]]), failing);
        expect(textures.size).toBe(0);
    });

    it("returns nothing for a file with no materials or no images", async () => {
        const { decode } = recordingDecode();
        expect((await gltfMaterialTextures(asGltf({ asset: { version: "2.0" } }), new Map(), decode)).size)
            .toBe(0);
    });

    it("returns nothing for something that is not glTF at all", async () => {
        const { decode } = recordingDecode();
        const junk = new TextEncoder().encode("ATOM      1  N   MET A   1");
        expect((await gltfMaterialTextures(junk.buffer as ArrayBuffer, new Map(), decode)).size).toBe(0);
    });
});
