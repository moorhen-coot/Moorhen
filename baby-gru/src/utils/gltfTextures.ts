/**
 * Turning a glTF's materials into textures Moorhen can draw with.
 *
 * The images are PNGs or JPEGs, either in a bufferView or in a file beside the document, and the
 * browser decodes both in a line. That is why this is here rather than in C++: stb would have to
 * be compiled in, and a 2048-square image would then be a sixteen megabyte copy across embind for
 * no reason. So the importer hands back a bare material index per group and this works out what
 * that index means.
 *
 * What is read is `pbrMetallicRoughness.baseColorTexture` and nothing else. Normal, occlusion,
 * emissive and metallic-roughness maps all exist and none of them has anywhere to go: the mesh
 * shader samples one texture and multiplies it into the vertex colour.
 *
 * Nothing here fails an import. An image that cannot be decoded, a texture coordinate set we do
 * not read, a material with no image at all - each means that material's geometry draws in its
 * base colour, which is what it did before any of this existed. Geometry is worth more than
 * texture, and an import that refuses because one of fifteen images is a format the browser
 * dislikes would be a poor trade.
 */
import { arrayAt, dataUriBytes, gltfBufferReader, splitGltf, type Json } from "./gltfBuffers";
import { registerTexture, type TextureSource } from "../WebGLgComponents/textureRegistry";

/**
 * Decodes one encoded image into raw pixels.
 *
 * Injected so the rest of this can be tested: jsdom has neither createImageBitmap nor
 * OffscreenCanvas, and a test that had to provide both would be testing the browser.
 */
export type ImageDecode = (bytes: Uint8Array, mimeType: string) => Promise<TextureSource | null>;

/**
 * The browser's own decoder.
 *
 * Row 0 of what getImageData returns is the top row, which is the convention the texture registry
 * uploads to and the one glTF's coordinates assume, so nothing is flipped on the way through.
 */
export const decodeImageInBrowser: ImageDecode = async (bytes, mimeType) => {
    try {
        // Copied into a buffer of its own: `bytes` is usually a view onto a larger buffer, and
        // Blob would take the whole of it.
        const blob = new Blob([bytes.slice()], mimeType ? { type: mimeType } : undefined);
        const bitmap = await createImageBitmap(blob);
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const context = canvas.getContext("2d");
        if (!context) return null;
        context.drawImage(bitmap, 0, 0);
        const image = context.getImageData(0, 0, bitmap.width, bitmap.height);
        bitmap.close();
        return { width: image.width, height: image.height, rgba: new Uint8Array(image.data.buffer) };
    } catch (e) {
        console.warn("a glTF image could not be decoded", e);
        return null;
    }
};

/** The index a material's base colour texture names, or null if it has none we can use. */
const baseColourImageOf = (json: Json, material: Json): number | null => {
    const pbr = material.pbrMetallicRoughness;
    if (!pbr || typeof pbr !== "object") return null;
    const reference = (pbr as Json).baseColorTexture;
    if (!reference || typeof reference !== "object") return null;

    // TEXCOORD_1 and above are legal and we read only TEXCOORD_0, so a material asking for
    // another set would be textured with the wrong coordinates. Left plain instead.
    const set = (reference as Json).texCoord;
    if (typeof set === "number" && set !== 0) {
        console.warn(`a material uses TEXCOORD_${set}, which Moorhen does not read; drawn plain`);
        return null;
    }

    const textureIndex = (reference as Json).index;
    if (typeof textureIndex !== "number") return null;
    const texture = arrayAt(json, "textures")[textureIndex];
    if (!texture) return null;

    // `source` is absent when the image comes from an extension - KHR_texture_basisu, say - which
    // means an image we could not decode anyway.
    const source = texture.source;
    return typeof source === "number" ? source : null;
};

/**
 * A texture id for each material that has one.
 *
 * @param bytes - The .gltf or .glb as read.
 * @param available - Image and buffer files already in hand, keyed by the URI the document uses.
 * @param decode - How to turn encoded image bytes into pixels.
 * @returns material index -> texture id. Materials absent from it draw untextured.
 */
export const gltfMaterialTextures = async (
    bytes: ArrayBuffer,
    available: Map<string, Uint8Array>,
    decode: ImageDecode = decodeImageInBrowser
): Promise<Map<number, string>> => {
    const document = splitGltf(bytes);
    if (!document) return new Map();

    const { json } = document;
    const materials = arrayAt(json, "materials");
    const images = arrayAt(json, "images");
    if (materials.length === 0 || images.length === 0) return new Map();

    const { viewBytes } = gltfBufferReader(document, available);

    // By image rather than by material, so that several materials sharing one image - a common
    // thing in an exported scene - decode and upload it once.
    const byImage = new Map<number, string | null>();
    const byMaterial = new Map<number, string>();

    for (let m = 0; m < materials.length; m++) {
        const imageIndex = baseColourImageOf(json, materials[m]);
        if (imageIndex === null) continue;

        if (!byImage.has(imageIndex)) {
            byImage.set(imageIndex, await decodeImage(images[imageIndex], imageIndex, viewBytes, available, decode));
        }
        const id = byImage.get(imageIndex);
        if (id) byMaterial.set(m, id);
    }

    return byMaterial;
};

/** One image, decoded and registered, or null if it could not be. */
const decodeImage = async (
    image: Json | undefined,
    index: number,
    viewBytes: (index: unknown) => Uint8Array,
    available: Map<string, Uint8Array>,
    decode: ImageDecode
): Promise<string | null> => {
    if (!image) return null;

    let encoded: Uint8Array | null = null;
    const uri = image.uri;
    if (typeof uri === "string" && uri.length > 0) {
        encoded = dataUriBytes(uri);
        if (!encoded) {
            let decoded = uri;
            try {
                decoded = decodeURIComponent(uri);
            } catch { /* compare as written */ }
            encoded = available.get(decoded) ?? available.get(uri) ?? null;
            if (!encoded) {
                // Named, because the person can act on it: the file was simply not opened with
                // the glTF. The geometry still loads, so this is a warning rather than a refusal.
                console.warn(`the texture ${decoded} was not opened with this file; drawn plain`);
                return null;
            }
        }
    } else if (typeof image.bufferView === "number") {
        try {
            encoded = viewBytes(image.bufferView);
        } catch (e) {
            console.warn(`image ${index} could not be read`, e);
            return null;
        }
    }

    if (!encoded || encoded.byteLength === 0) return null;

    const mimeType = typeof image.mimeType === "string" ? image.mimeType : "";
    const source = await decode(encoded, mimeType);
    if (!source) return null;

    return registerTexture(source);
};
