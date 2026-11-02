/**
 * Turning a glTF's materials into textures Moorhen can draw with.
 *
 * The images are PNGs or JPEGs, either in a bufferView or in a file beside the document, and the
 * browser decodes both in a line. That is why this is here rather than in C++: stb would have to
 * be compiled in, and a 2048-square image would then be a sixteen megabyte copy across embind for
 * no reason. So the importer hands back a bare material index per group and this works out what
 * that index means.
 *
 * What is read is `pbrMetallicRoughness.baseColorTexture`, `normalTexture` (with its scale) and
 * `pbrMetallicRoughness.metallicRoughnessTexture` (with the metallic and roughness factors).
 * Occlusion and emissive maps exist too and have nowhere to go yet. The base colour is multiplied
 * into the vertex colour; the other two change how the surface is lit (see the mesh shaders).
 *
 * Nothing here fails an import. An image that cannot be decoded, a texture coordinate set we do
 * not read, a material with no image at all - each means that material's geometry draws in its
 * base colour, which is what it did before any of this existed. Geometry is worth more than
 * texture, and an import that refuses because one of fifteen images is a format the browser
 * dislikes would be a poor trade.
 */
import { arrayAt, dataUriBytes, gltfBufferReader, splitGltf, type Json } from "./gltfBuffers";
import { registerTexture, type SurfaceMaps, type TextureSource } from "../WebGLgComponents/textureRegistry";

/**
 * Decodes one encoded image into raw pixels.
 *
 * Injected so the rest of this can be tested: jsdom has neither createImageBitmap nor
 * OffscreenCanvas, and a test that had to provide both would be testing the browser.
 */
export type ImageDecode = (bytes: Uint8Array, mimeType: string, use?: ImageUse) => Promise<TextureSource | null>;

/**
 * What an image is for. A base colour is a picture and is decoded as one. A normal or
 * metallic-roughness map is numbers stored as pixels: any colour-space conversion the browser
 * would make for an embedded profile or gamma chunk, and any premultiplication by alpha, changes
 * those numbers, so it is decoded with both turned off.
 */
export type ImageUse = "colour" | "data";

/**
 * The browser's own decoder.
 *
 * Row 0 of what getImageData returns is the top row, which is the convention the texture registry
 * uploads to and the one glTF's coordinates assume, so nothing is flipped on the way through.
 */
export const decodeImageInBrowser: ImageDecode = async (bytes, mimeType, use = "colour") => {
    try {
        // Copied into a buffer of its own: `bytes` is usually a view onto a larger buffer, and
        // Blob would take the whole of it.
        const blob = new Blob([bytes.slice()], mimeType ? { type: mimeType } : undefined);
        const bitmap = use === "data"
            ? await createImageBitmap(blob, { colorSpaceConversion: "none", premultiplyAlpha: "none" })
            : await createImageBitmap(blob);
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

/**
 * The image a texture reference names - a material's baseColorTexture, normalTexture or
 * metallicRoughnessTexture - or null if it names none we can use.
 */
const imageOfReference = (json: Json, reference: unknown, what: string): number | null => {
    if (!reference || typeof reference !== "object") return null;

    // TEXCOORD_1 and above are legal and we read only TEXCOORD_0, so a map asking for another set
    // would be applied with the wrong coordinates. Left out instead.
    const set = (reference as Json).texCoord;
    if (typeof set === "number" && set !== 0) {
        console.warn(`a material's ${what} uses TEXCOORD_${set}, which Moorhen does not read; left out`);
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

const pbrOf = (material: Json): Json | null => {
    const pbr = material.pbrMetallicRoughness;
    return pbr && typeof pbr === "object" ? pbr as Json : null;
};

/** The index a material's base colour texture names, or null if it has none we can use. */
const baseColourImageOf = (json: Json, material: Json): number | null =>
    imageOfReference(json, pbrOf(material)?.baseColorTexture, "base colour texture");

/** A number from the document, or the format's default when it is absent or not a number. */
const numberOr = (value: unknown, fallback: number): number =>
    typeof value === "number" && Number.isFinite(value) ? value : fallback;

/** What one material is drawn with: a base colour texture, and maps. */
export interface GltfMaterial {
    baseColour?: string;
    maps?: SurfaceMaps;
}

/**
 * Each material's textures: the base colour, and the normal and metallic-roughness maps.
 *
 * @param bytes - The .gltf or .glb as read.
 * @param available - Image and buffer files already in hand, keyed by the URI the document uses.
 * @param decode - How to turn encoded image bytes into pixels.
 * @returns material index -> what it has. Materials absent from it draw untextured.
 */
export const gltfMaterials = async (
    bytes: ArrayBuffer,
    available: Map<string, Uint8Array>,
    decode: ImageDecode = decodeImageInBrowser
): Promise<Map<number, GltfMaterial>> => {
    const document = splitGltf(bytes);
    if (!document) return new Map();

    const { json } = document;
    const materials = arrayAt(json, "materials");
    const images = arrayAt(json, "images");
    if (materials.length === 0 || images.length === 0) return new Map();

    const { viewBytes } = gltfBufferReader(document, available);

    // By image and use rather than by material, so that several materials sharing one image - a
    // common thing in an exported scene - decode and upload it once.
    const byImage = new Map<string, string | null>();
    const registered = async (imageIndex: number | null, use: ImageUse): Promise<string | null> => {
        if (imageIndex === null) return null;
        const key = `${imageIndex}|${use}`;
        if (!byImage.has(key)) {
            byImage.set(key, await decodeImage(images[imageIndex], imageIndex, viewBytes, available, decode, use));
        }
        return byImage.get(key) ?? null;
    };

    const byMaterial = new Map<number, GltfMaterial>();
    for (let m = 0; m < materials.length; m++) {
        const material = materials[m];
        if (!material || typeof material !== "object") continue;
        const pbr = pbrOf(material);
        const entry: GltfMaterial = {};

        const baseColour = await registered(baseColourImageOf(json, material), "colour");
        if (baseColour) entry.baseColour = baseColour;

        const maps: SurfaceMaps = {};
        const normal = await registered(imageOfReference(json, material.normalTexture, "normal map"), "data");
        if (normal) {
            maps.normalTexture = normal;
            maps.normalScale = numberOr((material.normalTexture as Json).scale, 1);
        }
        const metallicRoughness = await registered(
            imageOfReference(json, pbr?.metallicRoughnessTexture, "metallic-roughness map"), "data");
        if (metallicRoughness) {
            // The factors only with their map: see SurfaceMaps for why.
            maps.metallicRoughnessTexture = metallicRoughness;
            maps.metallicFactor = numberOr(pbr?.metallicFactor, 1);
            maps.roughnessFactor = numberOr(pbr?.roughnessFactor, 1);
        }
        if (Object.keys(maps).length > 0) entry.maps = maps;

        if (entry.baseColour || entry.maps) byMaterial.set(m, entry);
    }

    return byMaterial;
};

/** One image, decoded and registered, or null if it could not be. */
const decodeImage = async (
    image: Json | undefined,
    index: number,
    viewBytes: (index: unknown) => Uint8Array,
    available: Map<string, Uint8Array>,
    decode: ImageDecode,
    use: ImageUse
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
    const source = await decode(encoded, mimeType, use);
    if (!source) return null;

    return registerTexture(source);
};
