/**
 * Finding the files a glTF needs beside it.
 *
 * A .gltf is usually not self-contained: its geometry lives in a separate buffer file named by
 * relative URI, and until those names are known on this side of the worker there is nothing to
 * put in the filesystem for tinygltf to find. So this pins what counts as an external file and,
 * just as importantly, what does not - an embedded data: URI is already in hand, and a .glb's
 * buffer with no uri at all is the binary chunk.
 */
import { gltfExternalUris, gltfUnsupportedFeature, isRemoteUri } from "../../src/utils/gltfInspect";

/** A .gltf as bytes, from its JSON. */
const asGltf = (json: unknown): ArrayBuffer => {
    const text = new TextEncoder().encode(JSON.stringify(json));
    return text.buffer.slice(text.byteOffset, text.byteOffset + text.byteLength) as ArrayBuffer;
};

/** A .glb wrapping the same JSON, so both containers can be checked against one expectation. */
const asGlb = (json: unknown): ArrayBuffer => {
    const text = new TextEncoder().encode(JSON.stringify(json));
    const padding = (4 - (text.byteLength % 4)) % 4;
    const jsonLength = text.byteLength + padding;
    const total = 12 + 8 + jsonLength;

    const out = new Uint8Array(total);
    const view = new DataView(out.buffer);
    view.setUint32(0, 0x46546c67, true); // "glTF"
    view.setUint32(4, 2, true);
    view.setUint32(8, total, true);
    view.setUint32(12, jsonLength, true);
    view.setUint32(16, 0x4e4f534a, true); // "JSON"
    out.set(text, 20);
    out.fill(0x20, 20 + text.byteLength, 20 + jsonLength); // JSON chunks pad with spaces
    return out.buffer;
};

describe("the external files a glTF refers to", () => {
    it("finds a buffer named by relative URI", () => {
        expect(gltfExternalUris(asGltf({ buffers: [{ uri: "scene.bin", byteLength: 4 }] })))
            .toEqual(["scene.bin"]);
    });

    it("finds them in a .glb as well as a .gltf", () => {
        // Rare but legal: a .glb may still point outside itself.
        const json = { buffers: [{ uri: "external.bin", byteLength: 4 }] };
        expect(gltfExternalUris(asGlb(json))).toEqual(["external.bin"]);
    });

    it("ignores a buffer with no uri, which is the binary chunk", () => {
        expect(gltfExternalUris(asGlb({ buffers: [{ byteLength: 4 }] }))).toEqual([]);
    });

    it("ignores an embedded data: URI", () => {
        expect(gltfExternalUris(asGltf({
            buffers: [{ uri: "data:application/octet-stream;base64,AAAA", byteLength: 3 }],
        }))).toEqual([]);
    });

    it("collects images as well as buffers, in that order", () => {
        expect(gltfExternalUris(asGltf({
            buffers: [{ uri: "scene.bin" }],
            images: [{ uri: "wood.png" }, { uri: "metal.jpg" }],
        }))).toEqual(["scene.bin", "wood.png", "metal.jpg"]);
    });

    it("decodes percent-encoding, because that is what the chosen file is called", () => {
        // glTF requires the URI to be encoded; the File the person picked is "my mesh.bin".
        expect(gltfExternalUris(asGltf({ buffers: [{ uri: "my%20mesh.bin" }] })))
            .toEqual(["my mesh.bin"]);
    });

    it("survives a malformed encoding rather than losing the rest of the list", () => {
        const uris = gltfExternalUris(asGltf({
            buffers: [{ uri: "100%.bin" }, { uri: "good.bin" }],
        }));
        expect(uris).toContain("good.bin");
        expect(uris).toHaveLength(2);
    });

    it("mentions a shared file once", () => {
        expect(gltfExternalUris(asGltf({
            buffers: [{ uri: "shared.bin" }, { uri: "shared.bin" }],
        }))).toEqual(["shared.bin"]);
    });

    it("keeps a URI with a directory component intact", () => {
        expect(gltfExternalUris(asGltf({ images: [{ uri: "textures/wood.png" }] })))
            .toEqual(["textures/wood.png"]);
    });

    it("returns nothing for something that is not glTF at all", () => {
        const junk = new TextEncoder().encode("ATOM      1  N   MET A   1");
        expect(gltfExternalUris(junk.buffer as ArrayBuffer)).toEqual([]);
    });

    it("returns nothing for a truncated .glb rather than throwing", () => {
        expect(gltfExternalUris(new Uint8Array([0x67, 0x6c, 0x54, 0x46, 2, 0, 0, 0]).buffer as ArrayBuffer))
            .toEqual([]);
    });
});

/**
 * The importer has the same three checks in C++, and they are tested there. These exist because
 * of where tinygltf gives up: its post-parse pass rejects an index accessor with no bufferView,
 * which is precisely what a Draco file has, so the load fails with "accessor[3] invalid
 * bufferView" and nothing downstream of a successful parse ever runs. Everything below therefore
 * has to be answered from the JSON alone.
 */
describe("spotting a feature the importer cannot read", () => {
    /** A primitive whose indices and POSITION are compressed, so their accessors have no view. */
    const dracoGltf = () => asGltf({
        asset: { version: "2.0" },
        extensionsUsed: ["KHR_draco_mesh_compression"],
        extensionsRequired: ["KHR_draco_mesh_compression"],
        accessors: [{ componentType: 5123, count: 36, type: "SCALAR" },
                    { componentType: 5126, count: 24, type: "VEC3" }],
        meshes: [{
            primitives: [{
                mode: 4,
                indices: 0,
                attributes: { POSITION: 1 },
                extensions: { KHR_draco_mesh_compression: { bufferView: 0, attributes: { POSITION: 0 } } },
            }],
        }],
    });

    it("names Draco rather than letting tinygltf complain about a bufferView", () => {
        expect(gltfUnsupportedFeature(dracoGltf())).toContain("KHR_draco_mesh_compression");
    });

    it("does not refuse a Draco primitive whose geometry is reachable", () => {
        // What a decompressed file looks like: the extension is still recorded, but the
        // accessors now point at real views. Refusing this would reject the very files that
        // decompression is meant to make work.
        expect(gltfUnsupportedFeature(asGltf({
            accessors: [{ bufferView: 0, componentType: 5123, count: 3, type: "SCALAR" },
                        { bufferView: 1, componentType: 5126, count: 3, type: "VEC3" }],
            meshes: [{
                primitives: [{
                    mode: 4,
                    indices: 0,
                    attributes: { POSITION: 1 },
                    extensions: { KHR_draco_mesh_compression: {} },
                }],
            }],
        }))).toBeNull();
    });

    it("names meshopt compression", () => {
        expect(gltfUnsupportedFeature(asGltf({
            bufferViews: [{ buffer: 0, byteLength: 8, extensions: { EXT_meshopt_compression: {} } }],
        }))).toContain("EXT_meshopt_compression");
    });

    it("names a sparse accessor by index", () => {
        const reason = gltfUnsupportedFeature(asGltf({
            accessors: [
                { bufferView: 0, componentType: 5126, count: 3, type: "VEC3" },
                { bufferView: 1, componentType: 5126, count: 3, type: "VEC3", sparse: { count: 1 } },
            ],
        }));
        expect(reason).toContain("sparse");
        expect(reason).toContain("accessor 1");
    });

    it("passes an ordinary file without comment", () => {
        expect(gltfUnsupportedFeature(asGltf({
            asset: { version: "2.0" },
            accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3" }],
            meshes: [{ primitives: [{ mode: 4, attributes: { POSITION: 0 } }] }],
        }))).toBeNull();
    });

    it("does not refuse a quantized file, whatever extensionsRequired says", () => {
        // KHR_mesh_quantization is nearly always required and is read correctly, so a blanket
        // check on extensionsRequired would reject a large share of real files.
        expect(gltfUnsupportedFeature(asGltf({
            extensionsRequired: ["KHR_mesh_quantization"],
            accessors: [{ bufferView: 0, componentType: 5122, count: 3, type: "VEC3" }],
            meshes: [{ primitives: [{ mode: 4, attributes: { POSITION: 0 } }] }],
        }))).toBeNull();
    });

    it("finds it in a .glb too", () => {
        const bytes = asGlb(JSON.parse(new TextDecoder().decode(dracoGltf())));
        expect(gltfUnsupportedFeature(bytes)).toContain("KHR_draco_mesh_compression");
    });

    it("says nothing about a file it cannot parse", () => {
        const junk = new TextEncoder().encode("not glTF");
        expect(gltfUnsupportedFeature(junk.buffer as ArrayBuffer)).toBeNull();
    });
});

describe("recognising a URI Moorhen will not fetch", () => {
    it.each(["https://example.org/scene.bin", "http://example.org/a.bin", "file:///tmp/a.bin"])(
        "treats %s as remote",
        uri => expect(isRemoteUri(uri)).toBe(true)
    );

    it.each(["scene.bin", "textures/wood.png", "./scene.bin", "my mesh.bin"])(
        "treats %s as a local name",
        uri => expect(isRemoteUri(uri)).toBe(false)
    );
});
