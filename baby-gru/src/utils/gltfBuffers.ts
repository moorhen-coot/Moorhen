/**
 * Getting at the bytes a glTF refers to.
 *
 * Both forms of the format, and all three places the data can be: a .glb's binary chunk, an
 * embedded data: URI, or a file beside the document. Every part of the glTF handling needs this -
 * finding which files are required, undoing Draco compression, decoding the images for textures -
 * and three copies of the same resolution would be three chances for them to disagree about, say,
 * whether a percent-encoded URI matches the file the person actually chose.
 */

const GLB_MAGIC = 0x46546c67; // "glTF"
const CHUNK_JSON = 0x4e4f534a; // "JSON"
const CHUNK_BIN = 0x004e4942; // "BIN\0"

export type Json = Record<string, unknown>;

export type GltfDocument = {
    json: Json;
    /** The .glb binary chunk, or null for a .gltf. */
    chunk: Uint8Array | null;
};

/** A property of a JSON object, when it is an array of objects; an empty array otherwise. */
export const arrayAt = (json: Json, key: string): Json[] => {
    const value = json[key];
    if (!Array.isArray(value)) return [];
    return value.filter(entry => entry && typeof entry === "object") as Json[];
};

/** The JSON and the binary chunk of either form of glTF, or null if it is neither. */
export const splitGltf = (bytes: ArrayBuffer): GltfDocument | null => {
    const data = new Uint8Array(bytes);
    const isBinary = data.byteLength >= 20 &&
        new DataView(data.buffer, data.byteOffset, data.byteLength).getUint32(0, true) === GLB_MAGIC;

    if (!isBinary) {
        try {
            const parsed = JSON.parse(new TextDecoder().decode(data));
            return parsed && typeof parsed === "object" ? { json: parsed, chunk: null } : null;
        } catch {
            return null;
        }
    }

    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    let offset = 12;
    let json: Json | null = null;
    let chunk: Uint8Array | null = null;
    while (offset + 8 <= data.byteLength) {
        const length = view.getUint32(offset, true);
        const kind = view.getUint32(offset + 4, true);
        const start = offset + 8;
        if (start + length > data.byteLength) break;
        if (kind === CHUNK_JSON && json === null) {
            try {
                json = JSON.parse(new TextDecoder().decode(data.subarray(start, start + length)));
            } catch {
                return null;
            }
        } else if (kind === CHUNK_BIN && chunk === null) {
            // Copied rather than referenced, because callers may outlive the input buffer.
            chunk = data.slice(start, start + length);
        }
        offset = start + length + (((-length % 4) + 4) % 4);
    }
    return json ? { json, chunk } : null;
};

/** The bytes of a base64 data: URI, or null if it is not one this can decode. */
export const dataUriBytes = (uri: string): Uint8Array | null => {
    if (!uri.startsWith("data:")) return null;
    const comma = uri.indexOf(",");
    if (comma < 0) return null;
    if (!uri.slice(0, comma).includes(";base64")) return null;
    try {
        const binary = atob(uri.slice(comma + 1));
        const out = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
        return out;
    } catch {
        return null;
    }
};

/**
 * Reads buffers and bufferViews of one document.
 *
 * @param document - From splitGltf.
 * @param available - Buffer and image files already in hand, keyed by the URI the document uses.
 * @throws If something referred to cannot be found, naming it - a missing file is the commonest
 *     case and the person can act on knowing which one.
 */
export const gltfBufferReader = (document: GltfDocument, available: Map<string, Uint8Array>) => {
    const { json, chunk } = document;
    const buffers = arrayAt(json, "buffers");
    const bufferViews = arrayAt(json, "bufferViews");

    const bufferBytes = (index: number): Uint8Array => {
        const buffer = buffers[index];
        if (!buffer) throw new Error(`the file refers to buffer ${index}, which it does not define`);
        const uri = buffer.uri;
        if (typeof uri !== "string" || uri.length === 0) {
            if (!chunk) throw new Error(`buffer ${index} has no uri and the file has no binary chunk`);
            return chunk;
        }
        const embedded = dataUriBytes(uri);
        if (embedded) return embedded;
        let decoded = uri;
        try {
            decoded = decodeURIComponent(uri);
        } catch { /* compare as written */ }
        const supplied = available.get(decoded) ?? available.get(uri);
        if (!supplied) throw new Error(`${decoded} is needed and was not supplied`);
        return supplied;
    };

    const viewBytes = (index: unknown): Uint8Array => {
        if (typeof index !== "number") throw new Error("a bufferView index is missing");
        const view = bufferViews[index];
        if (!view) throw new Error(`the file refers to bufferView ${index}, which it does not define`);
        const data = bufferBytes(typeof view.buffer === "number" ? view.buffer : -1);
        const start = typeof view.byteOffset === "number" ? view.byteOffset : 0;
        const length = typeof view.byteLength === "number" ? view.byteLength : 0;
        if (start + length > data.byteLength) {
            throw new Error(`bufferView ${index} runs past the end of its buffer`);
        }
        return data.subarray(start, start + length);
    };

    return { bufferBytes, viewBytes, buffers, bufferViews };
};
