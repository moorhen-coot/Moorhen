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
import { gltfMaterials, gltfMaterialTextures, type ImageDecode, type ImageUse } from "../../src/utils/gltfTextures";
import { getTextureSource } from "../../src/WebGLgComponents/textureRegistry";

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);

/** A decoder that records what it was asked and returns a 1x1 image. */
const recordingDecode = () => {
    const seen: { bytes: Uint8Array; mimeType: string; use?: ImageUse }[] = [];
    const decode: ImageDecode = async (bytes, mimeType, use) => {
        seen.push({ bytes, mimeType, use });
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

describe("finding a material's normal and metallic-roughness maps", () => {
    /** Three images beside the document: wood (colour), bumps (normals), grain (metallic-roughness). */
    const files = new Map([["wood.png", PNG_BYTES], ["bumps.png", PNG_BYTES], ["grain.png", PNG_BYTES]]);
    const threeImages = {
        textures: [{ source: 0 }, { source: 1 }, { source: 2 }],
        images: [{ uri: "wood.png" }, { uri: "bumps.png" }, { uri: "grain.png" }],
    };

    it("reads all three, with the normal scale and the metallic and roughness factors", async () => {
        const { decode } = recordingDecode();
        const materials = await gltfMaterials(asGltf({
            materials: [{
                pbrMetallicRoughness: {
                    baseColorTexture: { index: 0 }, metallicRoughnessTexture: { index: 2 },
                    metallicFactor: 0.25, roughnessFactor: 0.5,
                },
                normalTexture: { index: 1, scale: 0.8 },
            }],
            ...threeImages,
        }), files, decode);

        const material = materials.get(0);
        expect(material?.baseColour).toBeDefined();
        expect(material?.maps).toEqual({
            normalTexture: expect.any(String), normalScale: 0.8,
            metallicRoughnessTexture: expect.any(String), metallicFactor: 0.25, roughnessFactor: 0.5,
        });
        // Three different images, three different textures.
        expect(new Set([material?.baseColour, material?.maps?.normalTexture, material?.maps?.metallicRoughnessTexture]).size).toBe(3);
    });

    it("decodes the maps as data and the base colour as colour", async () => {
        // A colour profile or gamma chunk would otherwise be applied to numbers that are not colours.
        const { decode, seen } = recordingDecode();
        await gltfMaterials(asGltf({
            materials: [{
                pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicRoughnessTexture: { index: 2 } },
                normalTexture: { index: 1 },
            }],
            ...threeImages,
        }), files, decode);
        expect(seen.map(s => s.use)).toEqual(["colour", "data", "data"]);
    });

    it("gives glTF's defaults when the scale and factors are absent", async () => {
        const { decode } = recordingDecode();
        const materials = await gltfMaterials(asGltf({
            materials: [{ pbrMetallicRoughness: { metallicRoughnessTexture: { index: 2 } }, normalTexture: { index: 1 } }],
            ...threeImages,
        }), files, decode);
        expect(materials.get(0)).toEqual({
            maps: {
                normalTexture: expect.any(String), normalScale: 1,
                metallicRoughnessTexture: expect.any(String), metallicFactor: 1, roughnessFactor: 1,
            },
        });
    });

    it("leaves the factors out without their map", async () => {
        // glTF's default metallic factor is 1, so applying factors to a material with no map would
        // turn every plain imported mesh to dark metal.
        const { decode } = recordingDecode();
        const materials = await gltfMaterials(asGltf({
            materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 1, roughnessFactor: 0.1 } }],
            ...threeImages,
        }), files, decode);
        expect(materials.get(0)?.maps).toBeUndefined();
    });

    it("decodes an image used both as colour and as data once each way", async () => {
        const { decode, seen } = recordingDecode();
        const materials = await gltfMaterials(asGltf({
            materials: [
                { pbrMetallicRoughness: { baseColorTexture: { index: 0 } } },
                { normalTexture: { index: 0 } },
                { normalTexture: { index: 0 } },
            ],
            textures: [{ source: 0 }],
            images: [{ uri: "wood.png" }],
        }), files, decode);
        expect(seen.map(s => s.use)).toEqual(["colour", "data"]);
        expect(materials.get(1)?.maps?.normalTexture).toBe(materials.get(2)?.maps?.normalTexture);
        expect(materials.get(1)?.maps?.normalTexture).not.toBe(materials.get(0)?.baseColour);
    });

    it("skips a map asking for a coordinate set we do not read", async () => {
        const { decode } = recordingDecode();
        const materials = await gltfMaterials(asGltf({
            materials: [{ normalTexture: { index: 1, texCoord: 1 } }],
            ...threeImages,
        }), files, decode);
        expect(materials.size).toBe(0);
    });

    it("still gives the base colour alone through gltfMaterialTextures", async () => {
        const { decode } = recordingDecode();
        const textures = await gltfMaterialTextures(asGltf({
            materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 } }, normalTexture: { index: 1 } }, { normalTexture: { index: 1 } }],
            ...threeImages,
        }), files, decode);
        expect([...textures.keys()]).toEqual([0]);
    });
});
