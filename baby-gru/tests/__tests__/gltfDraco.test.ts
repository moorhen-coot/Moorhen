/**
 * Rebuilding a Draco-compressed glTF as a plain one.
 *
 * The decoding is a library's job; the rebuilding is ours, and it is where a mistake would be
 * both easy and quiet - an accessor left pointing at the wrong view, a count off by one, bounds
 * that no longer describe the data. So the decoder is faked with geometry whose answer is known
 * in advance, and what is checked is the document that comes out: that every accessor which
 * pointed nowhere now points at real data of the right shape, that nothing which was already
 * correct has moved, and that the file no longer claims to need an extension it does not.
 *
 * The fake returns a tetrahedron. Small enough to write the expected numbers by hand, and it has
 * distinct values on every axis so a transposed or mis-strided read cannot pass by coincidence.
 */
import {
    decompressDracoGltf,
    type DracoDecode,
    type DracoDecoded,
} from "../../src/utils/gltfDraco";

const POSITIONS = [
    0, 0, 0,
    4, 0, 0,
    0, 8, 0,
    0, 0, 16,
];
const NORMALS = [
    0, 0, -1,
    0, -1, 0,
    -1, 0, 0,
    1, 1, 1,
];
const INDICES = [0, 2, 1, 0, 1, 3, 0, 3, 2, 1, 2, 3];

/** The ids the extension's attribute map will use; deliberately not 0 and 1. */
const POSITION_ID = 7;
const NORMAL_ID = 9;

const fakeDecoder = (options: { omit?: number } = {}): { decode: DracoDecode; seen: Uint8Array[] } => {
    const seen: Uint8Array[] = [];
    const decode: DracoDecode = (compressed, uniqueIds) => {
        seen.push(compressed);
        const attributes: DracoDecoded["attributes"] = new Map();
        for (const id of uniqueIds) {
            if (id === options.omit) continue;
            if (id === POSITION_ID) {
                attributes.set(id, { values: new Float32Array(POSITIONS), components: 3 });
            } else if (id === NORMAL_ID) {
                attributes.set(id, { values: new Float32Array(NORMALS), components: 3 });
            }
        }
        return { numPoints: 4, indices: new Uint32Array(INDICES), attributes };
    };
    return { decode, seen };
};

/** A document whose one primitive is Draco-compressed, with the blob wherever asked for. */
const compressedDocument = (options: {
    /** Bytes standing in for the compressed blob. */
    blob?: Uint8Array;
    /** Where the blob lives: embedded, in a named file, or in a .glb chunk. */
    where?: "data" | "file" | "chunk";
    /** Declare POSITION as a normalised short, as a quantizing exporter would. */
    quantized?: boolean;
} = {}) => {
    const blob = options.blob ?? new Uint8Array([0xd1, 0xa0, 0xc0, 0x01, 0x02, 0x03, 0x04, 0x05]);
    const where = options.where ?? "data";

    const json: Record<string, unknown> = {
        asset: { version: "2.0" },
        extensionsUsed: [DRACO, "KHR_materials_unlit"],
        extensionsRequired: [DRACO],
        scene: 0,
        scenes: [{ nodes: [0] }],
        nodes: [{ mesh: 0 }],
        buffers: [
            where === "data"
                ? { byteLength: blob.byteLength, uri: "data:application/octet-stream;base64," + base64(blob) }
                : where === "file"
                    ? { byteLength: blob.byteLength, uri: "compressed.bin" }
                    : { byteLength: blob.byteLength },
        ],
        bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: blob.byteLength }],
        accessors: [
            // Indices: no bufferView, as the extension requires.
            { componentType: 5123, count: 12, type: "SCALAR" },
            options.quantized
                ? { componentType: 5122, count: 4, type: "VEC3", normalized: true,
                    min: [-32767, -32767, -32767], max: [32767, 32767, 32767] }
                : { componentType: 5126, count: 4, type: "VEC3", min: [0, 0, 0], max: [1, 1, 1] },
            { componentType: 5126, count: 4, type: "VEC3" },
        ],
        meshes: [{
            primitives: [{
                mode: 4,
                indices: 0,
                attributes: { POSITION: 1, NORMAL: 2 },
                extensions: {
                    [DRACO]: {
                        bufferView: 0,
                        attributes: { POSITION: POSITION_ID, NORMAL: NORMAL_ID },
                    },
                },
            }],
        }],
    };

    const text = new TextEncoder().encode(JSON.stringify(json));
    if (where !== "chunk") {
        return {
            bytes: text.buffer.slice(text.byteOffset, text.byteOffset + text.byteLength) as ArrayBuffer,
            blob,
        };
    }

    // Wrap as a .glb, with the blob as the binary chunk.
    const jsonPadding = (4 - (text.byteLength % 4)) % 4;
    const binPadding = (4 - (blob.byteLength % 4)) % 4;
    const jsonLength = text.byteLength + jsonPadding;
    const binLength = blob.byteLength + binPadding;
    const total = 12 + 8 + jsonLength + 8 + binLength;
    const out = new Uint8Array(total);
    const view = new DataView(out.buffer);
    view.setUint32(0, 0x46546c67, true);
    view.setUint32(4, 2, true);
    view.setUint32(8, total, true);
    view.setUint32(12, jsonLength, true);
    view.setUint32(16, 0x4e4f534a, true);
    out.set(text, 20);
    out.fill(0x20, 20 + text.byteLength, 20 + jsonLength);
    view.setUint32(20 + jsonLength, binLength, true);
    view.setUint32(24 + jsonLength, 0x004e4942, true);
    out.set(blob, 28 + jsonLength);
    return { bytes: out.buffer as ArrayBuffer, blob };
};

const DRACO = "KHR_draco_mesh_compression";

function base64(bytes: Uint8Array): string {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
}

/** Reads back an accessor's data from the rewritten document and its sidecars. */
const readAccessor = (
    result: { gltf: Uint8Array; sidecars: { name: string; data: Uint8Array }[] },
    index: number
): { values: number[]; accessor: Record<string, any> } => {
    const json = JSON.parse(new TextDecoder().decode(result.gltf));
    const accessor = json.accessors[index];
    const view = json.bufferViews[accessor.bufferView];
    const buffer = json.buffers[view.buffer];
    const sidecar = result.sidecars.find(s => s.name === buffer.uri);
    if (!sidecar) throw new Error(`no sidecar for ${buffer.uri}`);

    const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[accessor.type as string] ?? 1;
    const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
    const total = accessor.count * components;
    // The sidecar is a copy, so its own alignment is not guaranteed; read through a fresh copy.
    const aligned = sidecar.data.slice(start, start + total * 4);
    const typed = accessor.componentType === 5126
        ? new Float32Array(aligned.buffer, aligned.byteOffset, total)
        : new Uint32Array(aligned.buffer, aligned.byteOffset, total);
    return { values: Array.from(typed), accessor };
};

describe("undoing Draco compression", () => {
    it("leaves a file with no Draco alone", () => {
        const text = new TextEncoder().encode(JSON.stringify({ asset: { version: "2.0" } }));
        const bytes = text.buffer.slice(0, text.byteLength) as ArrayBuffer;
        expect(decompressDracoGltf(bytes, new Map(), fakeDecoder().decode)).toBeNull();
    });

    it("hands the decoder the compressed bytes and the ids the extension names", () => {
        const { bytes, blob } = compressedDocument();
        const decoder = fakeDecoder();
        decompressDracoGltf(bytes, new Map(), decoder.decode);
        expect(decoder.seen).toHaveLength(1);
        expect(Array.from(decoder.seen[0])).toEqual(Array.from(blob));
    });

    it("writes the decoded positions where the accessor now points", () => {
        const { bytes } = compressedDocument();
        const result = decompressDracoGltf(bytes, new Map(), fakeDecoder().decode)!;
        const { values, accessor } = readAccessor(result, 1);
        expect(values).toEqual(POSITIONS);
        expect(accessor.componentType).toBe(5126);
        expect(accessor.count).toBe(4);
    });

    it("keeps the attributes apart rather than writing one over the other", () => {
        // Both are VEC3 of four points, so an offset mistake would give plausible numbers.
        const { bytes } = compressedDocument();
        const result = decompressDracoGltf(bytes, new Map(), fakeDecoder().decode)!;
        expect(readAccessor(result, 1).values).toEqual(POSITIONS);
        expect(readAccessor(result, 2).values).toEqual(NORMALS);
    });

    it("writes the indices, widened to uint32", () => {
        const { bytes } = compressedDocument();
        const result = decompressDracoGltf(bytes, new Map(), fakeDecoder().decode)!;
        const { values, accessor } = readAccessor(result, 0);
        expect(values).toEqual(INDICES);
        expect(accessor.componentType).toBe(5125);
        expect(accessor.count).toBe(12);
    });

    it("recomputes the bounds from the data it wrote", () => {
        const { bytes } = compressedDocument();
        const result = decompressDracoGltf(bytes, new Map(), fakeDecoder().decode)!;
        const { accessor } = readAccessor(result, 1);
        expect(accessor.min).toEqual([0, 0, 0]);
        expect(accessor.max).toEqual([4, 8, 16]);
    });

    it("turns a quantized attribute into plain floats, bounds and all", () => {
        // The declared type described how the values were stored, and they are not stored that
        // way any more. Leaving `normalized` would have the importer divide by 32767.
        const { bytes } = compressedDocument({ quantized: true });
        const result = decompressDracoGltf(bytes, new Map(), fakeDecoder().decode)!;
        const { values, accessor } = readAccessor(result, 1);
        expect(values).toEqual(POSITIONS);
        expect(accessor.componentType).toBe(5126);
        expect(accessor.normalized).toBeUndefined();
        expect(accessor.max).toEqual([4, 8, 16]);
    });

    it("stops saying it is compressed", () => {
        const { bytes } = compressedDocument();
        const result = decompressDracoGltf(bytes, new Map(), fakeDecoder().decode)!;
        const json = JSON.parse(new TextDecoder().decode(result.gltf));
        expect(json.meshes[0].primitives[0].extensions).toBeUndefined();
        // extensionsRequired held nothing else, so it goes entirely; extensionsUsed keeps the
        // unrelated one, because removing that would be a different claim about the file.
        expect(json.extensionsRequired).toBeUndefined();
        expect(json.extensionsUsed).toEqual(["KHR_materials_unlit"]);
    });

    it("reads the blob from an external file when that is where it is", () => {
        const { bytes, blob } = compressedDocument({ where: "file" });
        const decoder = fakeDecoder();
        const result = decompressDracoGltf(
            bytes, new Map([["compressed.bin", blob]]), decoder.decode);
        expect(Array.from(decoder.seen[0])).toEqual(Array.from(blob));
        expect(readAccessor(result!, 1).values).toEqual(POSITIONS);
    });

    it("says which file it needs when that file was not supplied", () => {
        const { bytes } = compressedDocument({ where: "file" });
        expect(() => decompressDracoGltf(bytes, new Map(), fakeDecoder().decode))
            .toThrow(/compressed\.bin/);
    });

    it("reads the blob from a .glb's binary chunk, and keeps that chunk as a file", () => {
        const { bytes, blob } = compressedDocument({ where: "chunk" });
        const decoder = fakeDecoder();
        const result = decompressDracoGltf(bytes, new Map(), decoder.decode)!;
        expect(Array.from(decoder.seen[0])).toEqual(Array.from(blob));
        // A .gltf cannot have a buffer with no uri, so the chunk had to become a named file -
        // with its bytes unchanged, which is what keeps offsets into it valid.
        const json = JSON.parse(new TextDecoder().decode(result.gltf));
        expect(typeof json.buffers[0].uri).toBe("string");
        const chunkFile = result.sidecars.find(s => s.name === json.buffers[0].uri);
        expect(chunkFile).toBeDefined();
        expect(Array.from(chunkFile!.data.subarray(0, blob.byteLength))).toEqual(Array.from(blob));
        expect(readAccessor(result, 1).values).toEqual(POSITIONS);
    });

    it("refuses rather than half-rebuilding when an attribute is missing", () => {
        // A decoder that returns no POSITION means the geometry is not there. Writing the rest
        // would give a document that parses and draws nothing in particular.
        const { bytes } = compressedDocument();
        expect(() => decompressDracoGltf(bytes, new Map(), fakeDecoder({ omit: POSITION_ID }).decode))
            .toThrow(/POSITION/);
    });

    it("leaves the extension in place if the rebuild throws", () => {
        const { bytes } = compressedDocument();
        const failing: DracoDecode = () => { throw new Error("corrupt"); };
        expect(() => decompressDracoGltf(bytes, new Map(), failing)).toThrow();
        // The input buffer must be unchanged, so a caller can still report it as compressed.
        const json = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes)));
        expect(json.meshes[0].primitives[0].extensions[DRACO]).toBeDefined();
    });

    it("does not disturb a buffer that was already readable", () => {
        // The appended buffer goes on the end and existing entries keep their index, so an
        // accessor that already pointed somewhere still points to the same place.
        const { bytes } = compressedDocument();
        const result = decompressDracoGltf(bytes, new Map(), fakeDecoder().decode)!;
        const json = JSON.parse(new TextDecoder().decode(result.gltf));
        expect(json.bufferViews[0]).toEqual({ buffer: 0, byteOffset: 0, byteLength: 8 });
        expect(json.buffers[0].uri).toContain("data:");
    });

    it("keeps every new view four-byte aligned", () => {
        // Float32Array and Uint32Array both need it, and a decoded mesh rarely lands on a
        // multiple of four by luck.
        const { bytes } = compressedDocument();
        const result = decompressDracoGltf(bytes, new Map(), fakeDecoder().decode)!;
        const json = JSON.parse(new TextDecoder().decode(result.gltf));
        for (const view of json.bufferViews.slice(1)) {
            expect(view.byteOffset % 4).toBe(0);
        }
    });
});
