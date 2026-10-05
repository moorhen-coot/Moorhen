/**
 * Turning a Draco-compressed glTF into an ordinary one.
 *
 * KHR_draco_mesh_compression puts a primitive's geometry in a compressed blob and leaves its
 * accessors pointing nowhere - no bufferView at all. Nothing downstream can read that: tinygltf
 * rejects the file outright during its post-parse pass, which is where "accessor[3] invalid
 * bufferView" comes from. So the compression is undone here, before the file reaches the worker,
 * and what the importer receives is a plain glTF it already knows how to read.
 *
 * Three decisions shape this, each taken to keep the rewrite small:
 *
 *   Nothing that already exists is moved. The decompressed data goes into one new buffer appended
 *   to the document, with new bufferViews of its own. Every existing buffer, bufferView and
 *   byteOffset is left exactly as it was, so there is no arithmetic to get wrong on data that was
 *   already correct - only the handful of accessors that pointed nowhere are repointed.
 *
 *   Everything comes out as float32, and indices as uint32. A compressed attribute may have been
 *   declared as a normalised short; the decoder hands back dequantised values, so writing them
 *   back into the original narrow type would mean re-quantising, and getting that subtly wrong
 *   is the kind of fault that shows up as a slightly wrong shape rather than an error. Floats
 *   cost space in a file that exists for a few milliseconds and are what the importer reads most
 *   directly. `normalized` is cleared with the type, and min/max are recomputed, since the old
 *   ones were in storage units and would now be meaningless.
 *
 *   The output is always a .gltf with sidecar buffers, even when the input was a .glb. A .glb's
 *   binary chunk becomes a sidecar file holding the same bytes, which keeps every offset into it
 *   valid while avoiding the business of re-laying-out chunks around a JSON blob that has changed
 *   length. Image URIs are left untouched, so textures resolve from the import directory exactly
 *   as they did.
 *
 * The decoder itself is injected. Decoding is somebody else's library and a large WebAssembly
 * module; the rebuilding is ours and is where the mistakes would be, so it is kept separately
 * testable against geometry whose answer is known in advance.
 */

const GLB_MAGIC = 0x46546c67; // "glTF"
const CHUNK_JSON = 0x4e4f534a; // "JSON"
const CHUNK_BIN = 0x004e4942; // "BIN\0"

const COMPONENT_TYPE_FLOAT = 5126;
const COMPONENT_TYPE_UNSIGNED_INT = 5125;

const DRACO_EXTENSION = "KHR_draco_mesh_compression";

/** How many components each glTF accessor type has. */
const COMPONENT_COUNT: Record<string, number> = {
    SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16,
};

/** One attribute as the decoder produced it: dequantised values, interleaved by component. */
export type DracoAttribute = { values: Float32Array; components: number };

/** What a decoder returns for one compressed blob. */
export type DracoDecoded = {
    /** Vertices in the decoded mesh, which becomes each rewritten accessor's count. */
    numPoints: number;
    /** Triangle indices, three per face. */
    indices: Uint32Array;
    /** Decoded attributes by their Draco unique id - the values the extension's map holds. */
    attributes: Map<number, DracoAttribute>;
};

/**
 * Decodes one Draco blob.
 *
 * @param compressed - The bytes of the bufferView the extension points at.
 * @param uniqueIds - The Draco attribute ids wanted, from the extension's attribute map.
 * @throws If the blob cannot be decoded. Callers treat that as the file being unreadable.
 */
export type DracoDecode = (compressed: Uint8Array, uniqueIds: number[]) => DracoDecoded;

/** A buffer file the rewritten glTF will need beside it. */
export type SyntheticSidecar = { name: string; data: Uint8Array };

export type DecompressedGltf = {
    /** The rewritten document, as .gltf text. */
    gltf: Uint8Array;
    /** Buffers the rewritten document refers to and that did not exist as files before. */
    sidecars: SyntheticSidecar[];
};

/** A prefix nothing in a real file will collide with, for the buffers this invents. */
const SYNTHETIC_PREFIX = "__moorhen_";

type Json = Record<string, unknown>;

const asArray = (value: unknown): Json[] =>
    Array.isArray(value) ? value.filter(e => e && typeof e === "object") as Json[] : [];

/** The JSON and the binary chunk of either form of glTF. */
const split = (bytes: ArrayBuffer): { json: Json; chunk: Uint8Array | null } | null => {
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
            // Copied rather than referenced, because it becomes a file of its own.
            chunk = data.slice(start, start + length);
        }
        offset = start + length + (((-length % 4) + 4) % 4);
    }
    return json ? { json, chunk } : null;
};

/** The bytes of a data: URI, or null if it is not one this can decode. */
const dataUriBytes = (uri: string): Uint8Array | null => {
    if (!uri.startsWith("data:")) return null;
    const comma = uri.indexOf(",");
    if (comma < 0) return null;
    const payload = uri.slice(comma + 1);
    if (!uri.slice(0, comma).includes(";base64")) return null;
    try {
        const binary = atob(payload);
        const out = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
        return out;
    } catch {
        return null;
    }
};

/**
 * Rewrite a Draco-compressed glTF as a plain one.
 *
 * @param bytes - The .gltf or .glb as read.
 * @param available - Buffer files already in hand, keyed by the URI the document uses. The
 *     compressed blob is often in one of these rather than in the document itself.
 * @param decode - The decoder.
 * @returns The rewritten document and the buffers it needs, or null if there was no Draco to
 *     undo - in which case the caller should use the original bytes untouched.
 * @throws If the file is compressed but cannot be rebuilt, with a reason worth showing.
 */
export const decompressDracoGltf = (
    bytes: ArrayBuffer,
    available: Map<string, Uint8Array>,
    decode: DracoDecode
): DecompressedGltf | null => {
    const parsed = split(bytes);
    if (!parsed) return null;
    const { json, chunk } = parsed;

    const meshes = asArray(json.meshes);
    const compressedPrimitives = meshes.flatMap(mesh => asArray(mesh.primitives))
        .filter(primitive => {
            const extensions = primitive.extensions;
            return !!extensions && typeof extensions === "object" && DRACO_EXTENSION in extensions;
        });
    if (compressedPrimitives.length === 0) return null;

    const buffers = asArray(json.buffers);
    const bufferViews = asArray(json.bufferViews);
    const accessors = asArray(json.accessors);

    // A buffer's bytes, from the binary chunk, an embedded data: URI, or a file already read.
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
        if (!supplied) throw new Error(`${decoded} is needed to decompress this file`);
        return supplied;
    };

    const viewBytes = (index: unknown): Uint8Array => {
        if (typeof index !== "number") throw new Error("the compressed data has no bufferView");
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

    // Everything decoded goes here, and becomes one appended buffer. Collected as chunks and
    // joined once, so nothing is copied repeatedly as it grows.
    const appended: Uint8Array[] = [];
    let appendedLength = 0;

    /** Appends data on a four-byte boundary and returns the new bufferView's index. */
    const addView = (data: Uint8Array): number => {
        const padding = (4 - (appendedLength % 4)) % 4;
        if (padding > 0) {
            appended.push(new Uint8Array(padding));
            appendedLength += padding;
        }
        const offset = appendedLength;
        appended.push(data);
        appendedLength += data.byteLength;
        bufferViews.push({ buffer: buffers.length, byteOffset: offset, byteLength: data.byteLength });
        return bufferViews.length - 1;
    };

    /** Points an accessor at freshly written float data, with its bounds recomputed. */
    const rewriteFloatAccessor = (index: unknown, attribute: DracoAttribute, count: number) => {
        if (typeof index !== "number" || !accessors[index]) return;
        const accessor = accessors[index];
        const declared = typeof accessor.type === "string" ? COMPONENT_COUNT[accessor.type] : undefined;
        // The accessor's declared width wins: an attribute Draco stored with more components than
        // the document asks for is read to the document's shape, not the decoder's.
        const components = declared ?? attribute.components;
        const values = new Float32Array(count * components);
        for (let point = 0; point < count; point++) {
            for (let c = 0; c < components; c++) {
                values[point * components + c] = c < attribute.components
                    ? attribute.values[point * attribute.components + c]
                    : 0;
            }
        }

        accessor.bufferView = addView(new Uint8Array(values.buffer, values.byteOffset, values.byteLength));
        accessor.byteOffset = 0;
        accessor.componentType = COMPONENT_TYPE_FLOAT;
        accessor.count = count;
        // The old type said how the values were stored, and they are no longer stored that way.
        delete accessor.normalized;

        // POSITION requires min and max, and the old pair was in the units of the old type.
        const min = new Array<number>(components).fill(Number.POSITIVE_INFINITY);
        const max = new Array<number>(components).fill(Number.NEGATIVE_INFINITY);
        for (let point = 0; point < count; point++) {
            for (let c = 0; c < components; c++) {
                const value = values[point * components + c];
                if (value < min[c]) min[c] = value;
                if (value > max[c]) max[c] = value;
            }
        }
        if (count > 0) {
            accessor.min = min;
            accessor.max = max;
        } else {
            delete accessor.min;
            delete accessor.max;
        }
    };

    for (const primitive of compressedPrimitives) {
        const extensions = primitive.extensions as Json;
        const extension = extensions[DRACO_EXTENSION];
        if (!extension || typeof extension !== "object") continue;
        const { bufferView, attributes } = extension as { bufferView?: unknown; attributes?: unknown };

        const wanted = attributes && typeof attributes === "object"
            ? attributes as Record<string, unknown>
            : {};
        const names = Object.keys(wanted).filter(name => typeof wanted[name] === "number");
        const uniqueIds = names.map(name => wanted[name] as number);

        const decoded = decode(viewBytes(bufferView), uniqueIds);

        for (const name of names) {
            const attribute = decoded.attributes.get(wanted[name] as number);
            if (!attribute) {
                throw new Error(`the compressed data has no ${name} attribute`);
            }
            const primitiveAttributes = primitive.attributes;
            const accessorIndex = primitiveAttributes && typeof primitiveAttributes === "object"
                ? (primitiveAttributes as Record<string, unknown>)[name]
                : undefined;
            rewriteFloatAccessor(accessorIndex, attribute, decoded.numPoints);
        }

        // Indices come out as uint32 whatever they were: a decoded mesh may have more vertices
        // than a 16-bit index can reach, and widening is free here.
        if (typeof primitive.indices === "number" && accessors[primitive.indices]) {
            const accessor = accessors[primitive.indices];
            const indices = decoded.indices;
            accessor.bufferView = addView(
                new Uint8Array(indices.buffer, indices.byteOffset, indices.byteLength));
            accessor.byteOffset = 0;
            accessor.componentType = COMPONENT_TYPE_UNSIGNED_INT;
            accessor.count = indices.length;
            accessor.type = "SCALAR";
            delete accessor.normalized;
            delete accessor.min;
            delete accessor.max;
        }

        // Removed last, so that a throw above leaves the document saying it is still compressed
        // rather than claiming to be readable.
        delete extensions[DRACO_EXTENSION];
        if (Object.keys(extensions).length === 0) delete primitive.extensions;
    }

    // Buffers with no uri cannot survive as a .gltf, so the chunk becomes a file. The bytes are
    // unchanged, which is what keeps every existing byteOffset into it correct.
    const sidecars: SyntheticSidecar[] = [];
    buffers.forEach((buffer, index) => {
        const uri = buffer.uri;
        if (typeof uri === "string" && uri.length > 0) return;
        if (!chunk) return;
        const name = `${SYNTHETIC_PREFIX}chunk${index}.bin`;
        buffer.uri = name;
        buffer.byteLength = chunk.byteLength;
        sidecars.push({ name, data: chunk });
    });

    if (appendedLength > 0) {
        const joined = new Uint8Array(appendedLength);
        let at = 0;
        for (const part of appended) {
            joined.set(part, at);
            at += part.byteLength;
        }
        const name = `${SYNTHETIC_PREFIX}draco.bin`;
        buffers.push({ uri: name, byteLength: joined.byteLength });
        sidecars.push({ name, data: joined });
    }

    json.buffers = buffers;
    json.bufferViews = bufferViews;
    json.accessors = accessors;

    // The document no longer uses the extension, and leaving it in extensionsRequired would have
    // a conforming reader refuse a file that is now perfectly ordinary.
    for (const key of ["extensionsUsed", "extensionsRequired"]) {
        const listed = json[key];
        if (!Array.isArray(listed)) continue;
        const remaining = listed.filter(name => name !== DRACO_EXTENSION);
        if (remaining.length > 0) json[key] = remaining;
        else delete json[key];
    }

    return { gltf: new TextEncoder().encode(JSON.stringify(json)), sidecars };
};
