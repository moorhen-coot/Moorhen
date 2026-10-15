/**
 * Reading a glTF's JSON before handing it to the importer.
 *
 * Two questions are answered here, from one parse, both of which have to be answered on this
 * side of the worker:
 *
 *   Which other files does it need? A .gltf keeps its buffers and images in separate files named
 *   by relative URI - "scene.bin", "textures/wood.png" - and those have to be in the module's
 *   filesystem under those exact names before tinygltf looks for them. The only place they can
 *   come from is the selection the person made, so the names must be known here.
 *
 *   Is there something in it we cannot read at all? This one is here because of where tinygltf
 *   fails. Its post-parse pass over the primitives rejects an index accessor with no bufferView
 *   outright - "accessor[3] invalid bufferView" - and a Draco-compressed file is exactly that,
 *   since its indices live inside the compressed blob. So the whole load returns false and
 *   anything downstream of a successful parse never runs. The importer has the same checks in
 *   C++, and they are the backstop for LoadGltFromFile called from anywhere else, but they only
 *   see files that parse. This one sees the rest.
 *
 * What is deliberately not done here is fetching. A URI with a scheme - "https://...",
 * "file://..." - is returned like any other and left for the caller to refuse by name. Silently
 * going to the network for a file someone dragged in would be a surprising thing for a molecular
 * viewer to do, and the honest failure is a message saying which file was not supplied.
 */

const GLB_MAGIC = 0x46546c67; // "glTF"
const CHUNK_JSON = 0x4e4f534a; // "JSON"

/** The JSON of either form of glTF, or null if it cannot be found or parsed. */
const gltfJson = (bytes: ArrayBuffer): Record<string, unknown> | null => {
    const data = new Uint8Array(bytes);

    let text: string;
    if (data.byteLength >= 20 &&
        new DataView(data.buffer, data.byteOffset, data.byteLength).getUint32(0, true) === GLB_MAGIC) {
        // Binary: walk the chunks for the JSON one. Same walk as the winding correction does,
        // and for the same reason - the chunk table is the only way in.
        const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
        let offset = 12;
        let found: string | null = null;
        while (offset + 8 <= data.byteLength && found === null) {
            const length = view.getUint32(offset, true);
            const kind = view.getUint32(offset + 4, true);
            const start = offset + 8;
            if (start + length > data.byteLength) break;
            if (kind === CHUNK_JSON) {
                found = new TextDecoder().decode(data.subarray(start, start + length));
            }
            offset = start + length + (((-length % 4) + 4) % 4);
        }
        if (found === null) return null;
        text = found;
    } else {
        text = new TextDecoder().decode(data);
    }

    try {
        const parsed = JSON.parse(text);
        return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
    } catch {
        // A file that is not glTF at all, or is truncated. Not this function's business to
        // report: the loader will say so far more precisely once tinygltf has looked at it.
        return null;
    }
};

type Json = Record<string, unknown>;

/** A property of a JSON object, when it is an array; an empty array otherwise. */
const arrayAt = (json: Record<string, unknown>, key: string): Record<string, unknown>[] => {
    const value = json[key];
    if (!Array.isArray(value)) return [];
    return value.filter(entry => entry && typeof entry === "object") as Record<string, unknown>[];
};

/** Whether an extension is present on a glTF object. */
const hasExtension = (entry: Record<string, unknown>, name: string): boolean => {
    const extensions = entry.extensions;
    return !!extensions && typeof extensions === "object" && name in (extensions as object);
};

/** Whether an accessor index points at an accessor whose data can actually be reached. */
const accessorIsReachable = (json: Record<string, unknown>, index: unknown): boolean => {
    if (typeof index !== "number") return false;
    const accessor = arrayAt(json, "accessors")[index];
    if (!accessor) return false;
    return typeof accessor.bufferView === "number" && accessor.bufferView >= 0;
};

/**
 * The external files a glTF refers to, in the order it refers to them.
 *
 * Only `buffers` and `images` can name another file. Embedded `data:` URIs are skipped, since
 * they are already in hand, and a buffer with no `uri` is the binary chunk.
 *
 * @param bytes - The .gltf or .glb as read.
 * @returns Relative URIs, de-duplicated, percent-decoding undone.
 */
export const gltfExternalUris = (bytes: ArrayBuffer): string[] => {
    const json = gltfJson(bytes);
    if (!json) return [];

    const uris: string[] = [];
    const seen = new Set<string>();

    for (const key of ["buffers", "images"]) {
        for (const entry of arrayAt(json, key)) {
            const uri = entry.uri;
            if (typeof uri !== "string" || uri.length === 0) continue;
            if (uri.startsWith("data:")) continue;

            // glTF requires URIs to be percent-encoded, so a file called "my mesh.bin" appears
            // as "my%20mesh.bin" - and the File the person chose is called the former. Decoding
            // is wrapped because a stray "%" is a malformed URI that throws rather than failing
            // to match, and that would lose the rest of the list.
            let decoded = uri;
            try {
                decoded = decodeURIComponent(uri);
            } catch {
                /* leave it as written and let the name comparison decide */
            }

            if (seen.has(decoded)) continue;
            seen.add(decoded);
            uris.push(decoded);
        }
    }

    return uris;
};

/**
 * Whether Draco compression is standing between us and the geometry.
 *
 * True only when the geometry is genuinely out of reach. A file decompressed before it got here
 * may still carry the extension in its JSON, and treating that as compressed would mean refusing
 * exactly the files the decompression exists to make work.
 *
 * Either accessor settles it: the extension has the compressed attributes' own accessors omit
 * bufferView, and the index accessor is the one tinygltf trips over first.
 */
const dracoBlocksGeometry = (json: Json): boolean => {
    for (const mesh of arrayAt(json, "meshes")) {
        for (const primitive of arrayAt(mesh, "primitives")) {
            if (!hasExtension(primitive, "KHR_draco_mesh_compression")) continue;
            const attributes = primitive.attributes;
            const position = attributes && typeof attributes === "object"
                ? (attributes as Record<string, unknown>).POSITION
                : undefined;
            if (!accessorIsReachable(json, primitive.indices) ||
                !accessorIsReachable(json, position)) {
                return true;
            }
        }
    }
    return false;
};

/**
 * Whether this file needs decompressing before anything can read it.
 *
 * Asked before the decoder is loaded, so that a 190 KB WebAssembly module is fetched only for
 * the files that actually need it.
 *
 * @param bytes - The .gltf or .glb as read.
 */
export const gltfIsDracoCompressed = (bytes: ArrayBuffer): boolean => {
    const json = gltfJson(bytes);
    return json ? dracoBlocksGeometry(json) : false;
};

/**
 * Why this file cannot be read at all, or null if nothing stands in the way.
 *
 * The three cases are the ones where going ahead is worse than stopping. Draco and meshopt put
 * the geometry somewhere we cannot get at; sparse accessors we can read, but reading them
 * without applying the substitution the file asks for puts part of the mesh in the wrong place
 * and says nothing about it, which is the worst of the outcomes.
 *
 * Conservative by design. Nothing is reported on the strength of `extensionsRequired` alone,
 * because the commonest entry there is KHR_mesh_quantization - which the importer reads
 * perfectly - and refusing it would reject a large share of real files.
 *
 * @param bytes - The .gltf or .glb as read.
 * @returns A reason, worded for someone who is about to read it in a notification.
 */
export const gltfUnsupportedFeature = (bytes: ArrayBuffer): string | null => {
    const json = gltfJson(bytes);
    // Not glTF, or unparseable. The importer will say so with more authority than this can.
    if (!json) return null;

    // Still here although the loader now decompresses rather than refusing, because this is the
    // answer for anyone who cannot: the C++ importer reached directly, or a load where the
    // decoder itself could not be fetched.
    if (dracoBlocksGeometry(json)) {
        return "the geometry is Draco-compressed (KHR_draco_mesh_compression), " +
               "which Moorhen cannot yet read";
    }

    for (const view of arrayAt(json, "bufferViews")) {
        if (hasExtension(view, "EXT_meshopt_compression")) {
            return "the geometry is meshopt-compressed (EXT_meshopt_compression), " +
                   "which Moorhen cannot yet read";
        }
    }

    const accessors = arrayAt(json, "accessors");
    for (let index = 0; index < accessors.length; index++) {
        if (accessors[index].sparse) {
            return `accessor ${index} uses sparse storage, which Moorhen does not yet support`;
        }
    }

    return null;
};

/** Whether a URI points somewhere Moorhen will not go to fetch it. */
export const isRemoteUri = (uri: string): boolean => /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(uri);
