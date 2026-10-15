/**
 * A failed glTF import has to say why.
 *
 * The importer works out something specific - which extension it could not read, which accessor
 * it could not use - and that reason has only one way out of C++: the mesh's name, since
 * simple_mesh_t carries nothing but `status` and `name`. It then has to survive two more hops to
 * reach the person, and before this test it survived neither. loadGltfFile replaced it with "No
 * mesh could be read from <file>", and autoOpenFiles replaced that with "Failed to load mesh
 * <file>" and logged the rest to a console nobody has open.
 *
 * Both of those read as complaints about the file, which is the opposite of what is true: the
 * file said exactly what it needed and Moorhen cannot do it yet. So what is pinned here is the
 * whole chain, not the wording - that the specific reason arrives, and that the generic fallback
 * is used only when there is genuinely nothing specific to say.
 */
import { loadGltfFile } from "../../src/utils/FileLoading";
import type { MoorhenInstance } from "../../src/InstanceManager/MoorhenInstance";
import { createDracoDecode } from "../../src/utils/gltfDracoDecoder";
import { gltfMaterialTextures } from "../../src/utils/gltfTextures";
import type { DracoDecode } from "../../src/utils/gltfDraco";

// The real one fetches the decoder over HTTP from Moorhen's asset directory, which no test can
// do. What the decoder itself produces is covered against the real library in
// gltfDracoReal.test.ts; what matters here is that the loader reaches for it at the right moment
// and sends on what comes back.
jest.mock("../../src/utils/gltfDracoDecoder", () => ({ createDracoDecode: jest.fn() }));

// Decoding an image needs createImageBitmap and OffscreenCanvas, which jsdom has not. What the
// resolution does is covered on its own in gltfTextures.test.ts; here the map it produces is
// supplied directly, so these tests are about how the loader joins it to the geometry.
jest.mock("../../src/utils/gltfTextures", () => ({ gltfMaterialTextures: jest.fn() }));
const mockedCreateDracoDecode = createDracoDecode as jest.MockedFunction<typeof createDracoDecode>;
const mockedGltfMaterialTextures =
    gltfMaterialTextures as jest.MockedFunction<typeof gltfMaterialTextures>;

/** A file object with just enough of the File interface for the function under test. */
const fakeFile = (name: string, bytes?: ArrayBuffer): File =>
    ({ name, arrayBuffer: async () => bytes ?? new ArrayBuffer(8) }) as unknown as File;

/** A .gltf whose buffer lives in a separate file. */
const gltfNeeding = (uri: string): ArrayBuffer => {
    const text = new TextEncoder().encode(JSON.stringify({
        asset: { version: "2.0" },
        buffers: [{ uri, byteLength: 4 }],
    }));
    return text.buffer.slice(text.byteOffset, text.byteOffset + text.byteLength) as ArrayBuffer;
};

/** Where the loader looks for the decoder; real instances always carry these. */
const paths = { urlPrefix: "/MoorhenAssets", monomerLibraryPath: "" };

/** An instance whose worker returns one prepared reply. */
const instanceReturning = (result: unknown): MoorhenInstance =>
    ({
        paths,
        commandCentre: {
            cootCommand: async () => ({ data: { result: { status: "Completed", result } } }),
        },
    }) as unknown as MoorhenInstance;

/** An instance that records what it was asked, and reports a trivial failure. */
const recordingInstance = () => {
    const calls: unknown[][] = [];
    const instance = {
        paths,
        commandCentre: {
            cootCommand: async (command: { commandArgs: unknown[] }) => {
                calls.push(command.commandArgs);
                return { data: { result: { status: "Completed", result: { status: 0, name: "" } } } };
            },
        },
    } as unknown as MoorhenInstance;
    return { instance, calls };
};

describe("a refused glTF import", () => {
    it("passes on the reason the importer gave, not a generic failure", async () => {
        const instance = instanceReturning({
            status: 0,
            name: "glTF import failed: the geometry is Draco-compressed "
                + "(KHR_draco_mesh_compression), which Moorhen cannot yet read",
        });

        await expect(loadGltfFile(fakeFile("compressed.glb"), instance)).rejects.toContain(
            "KHR_draco_mesh_compression"
        );
    });

    it("names the file alongside the reason", async () => {
        const instance = instanceReturning({
            status: 0,
            name: "glTF import failed: accessor 3 uses sparse storage, which Moorhen does not yet support",
        });

        const rejection = await loadGltfFile(fakeFile("sparse.glb"), instance).catch(e => e);
        expect(rejection).toContain("sparse.glb");
        expect(rejection).toContain("accessor 3");
        // The C++ prefix is for the console, where the message has no context. Here the file name
        // supplies it, so repeating "glTF import failed" would just be noise.
        expect(rejection).not.toContain("glTF import failed");
    });

    it("falls back to the generic wording when the mesh carries no reason", async () => {
        const instance = instanceReturning({ status: 0, name: "" });

        await expect(loadGltfFile(fakeFile("mystery.glb"), instance)).rejects.toContain(
            "No mesh could be read"
        );
    });

    it("does not mistake a mesh that is merely absent for one with a reason", async () => {
        const instance = instanceReturning(undefined);

        await expect(loadGltfFile(fakeFile("gone.glb"), instance)).rejects.toContain(
            "No mesh could be read"
        );
    });

    it("reports the reason even when status never arrives", async () => {
        // The shape the worker actually returned until this was found: simpleMeshToMeshData
        // forwards the five buffer arrays and nothing else, so `status` was undefined and the
        // status check could not fire. The reason has to survive the next check down as well.
        const instance = instanceReturning({
            name: "glTF import failed: File not found : Box0.bin",
            prim_types: [["TRIANGLES"]],
            vert_tri: [[new Float32Array(0)]],
            idx_tri: [[new Uint32Array(0)]],
        });

        const rejection = await loadGltfFile(fakeFile("Box.gltf"), instance).catch(e => e);
        expect(rejection).toContain("Box0.bin");
        expect(rejection).not.toContain("contained no triangles");
    });

    it("still says 'no triangles' when there is genuinely nothing to add", async () => {
        const instance = instanceReturning({
            status: 1,
            name: "",
            prim_types: [["TRIANGLES"]],
            vert_tri: [[new Float32Array(0)]],
            idx_tri: [[new Uint32Array(0)]],
        });

        await expect(loadGltfFile(fakeFile("empty.glb"), instance)).rejects.toContain(
            "contained no triangles"
        );
    });

    it("still reports a worker exception by its console message", async () => {
        const instance = {
            commandCentre: {
                cootCommand: async () => ({
                    data: { result: { status: "Exception", consoleMessage: "worker fell over" } },
                }),
            },
        } as unknown as MoorhenInstance;

        await expect(loadGltfFile(fakeFile("boom.glb"), instance)).rejects.toContain(
            "worker fell over"
        );
    });
});

/**
 * A .gltf's buffers and images are separate files, and the worker can only write what it is
 * given. The failure to avoid is the quiet one: sending the .gltf alone, having tinygltf find no
 * buffer, and reporting something that sounds like a fault in a file that is perfectly correct.
 */
describe("a glTF whose buffer is in another file", () => {
    it("says which file is missing, by name", async () => {
        const { instance } = recordingInstance();
        const file = fakeFile("scene.gltf", gltfNeeding("scene.bin"));

        const rejection = await loadGltfFile(file, instance, [file]).catch(e => e);
        expect(rejection).toContain("scene.bin");
        expect(rejection).toContain("scene.gltf");
    });

    it("does not reach the worker at all when a file is missing", async () => {
        const { instance, calls } = recordingInstance();
        const file = fakeFile("scene.gltf", gltfNeeding("scene.bin"));

        await loadGltfFile(file, instance, [file]).catch(() => undefined);
        expect(calls).toHaveLength(0);
    });

    it("passes the buffer through under the name the glTF uses for it", async () => {
        const { instance, calls } = recordingInstance();
        const file = fakeFile("scene.gltf", gltfNeeding("scene.bin"));
        const bin = fakeFile("scene.bin", new Uint8Array([1, 2, 3, 4]).buffer as ArrayBuffer);

        await loadGltfFile(file, instance, [file, bin]).catch(() => undefined);

        expect(calls).toHaveLength(1);
        const sidecars = calls[0][2] as { name: string; data: Uint8Array }[];
        expect(sidecars).toHaveLength(1);
        // The name has to be the URI, not the File's own name: that is what tinygltf will look
        // for in the directory.
        expect(sidecars[0].name).toBe("scene.bin");
        expect(Array.from(sidecars[0].data)).toEqual([1, 2, 3, 4]);
    });

    it("matches a subdirectory URI against a flatly chosen file", async () => {
        // Picking files from a dialog loses the folder structure, so "textures/wood.png" has to
        // be satisfiable by a File simply called "wood.png" - written back under the full URI.
        const { instance, calls } = recordingInstance();
        const file = fakeFile("scene.gltf", gltfNeeding("textures/wood.png"));
        const texture = fakeFile("wood.png", new Uint8Array([9]).buffer as ArrayBuffer);

        await loadGltfFile(file, instance, [file, texture]).catch(() => undefined);

        const sidecars = calls[0][2] as { name: string }[];
        expect(sidecars[0].name).toBe("textures/wood.png");
    });

    it("refuses a remote URI rather than fetching it", async () => {
        const { instance, calls } = recordingInstance();
        const file = fakeFile("scene.gltf", gltfNeeding("https://example.org/scene.bin"));
        // Even a local file of that name must not be silently substituted for the URL.
        const decoy = fakeFile("scene.bin", new ArrayBuffer(4));

        const rejection = await loadGltfFile(file, instance, [file, decoy]).catch(e => e);
        expect(rejection).toContain("https://example.org/scene.bin");
        expect(calls).toHaveLength(0);
    });

    it("sends no sidecars for a self-contained .glb", async () => {
        const { instance, calls } = recordingInstance();
        const file = fakeFile("whole.glb");

        await loadGltfFile(file, instance, [file]).catch(() => undefined);
        expect(calls[0][2]).toEqual([]);
    });
});

/**
 * The importer returns one group per material, and each becomes one part of a single object.
 *
 * One object because the file is one thing to select, centre on and delete; several parts because
 * a texture belongs to a material and a sub-buffer draws with one texture. What is checked here is
 * that the material index is what joins the two halves - the geometry from the worker and the
 * images decoded on this side.
 */
describe("a glTF with several materials", () => {
    /** A worker reply with one group per material. */
    const groups = (...spec: { material: number; textured?: boolean; vertices?: number }[]) => ({
        status: 1,
        name: "",
        groups: spec.map(({ material, textured, vertices = 3 }) => ({
            vertices: new Float32Array(vertices * 3),
            normals: new Float32Array(vertices * 3),
            colours: new Float32Array(vertices * 4),
            indices: new Uint32Array([0, 1, 2]),
            texCoords: textured ? new Float32Array(vertices * 2) : new Float32Array(0),
            material,
        })),
    });

    /** The object the loader created, from the spy on object.create. */
    const createdObject = (calls: unknown[][]) => calls[0][0] as { parts: { texture?: string }[] };

    const instanceCapturing = (result: unknown, textures: Map<number, string> = new Map()) => {
        const created: unknown[][] = [];
        const instance = {
            paths,
            commandCentre: {
                cootCommand: async () => ({ data: { result: { status: "Completed", result } } }),
            },
            object: {
                create: (...args: unknown[]) => { created.push(args); return "object-1"; },
                get: () => undefined,
            },
            centerOnCoordinate: () => undefined,
        } as unknown as MoorhenInstance;
        mockedGltfMaterialTextures.mockResolvedValue(textures);
        return { instance, created };
    };

    beforeEach(() => mockedGltfMaterialTextures.mockReset());

    it("makes one part per group, inside one object", async () => {
        const { instance, created } = instanceCapturing(groups({ material: 0 }, { material: 1 }));
        await loadGltfFile(fakeFile("two.glb"), instance).catch(e => { throw e; });
        expect(created).toHaveLength(1);
        expect(createdObject(created).parts).toHaveLength(2);
    });

    it("gives each part the texture its own material named", async () => {
        const { instance, created } = instanceCapturing(
            groups({ material: 0, textured: true }, { material: 1, textured: true }),
            new Map([[0, "tex-for-0"], [1, "tex-for-1"]])
        );
        await loadGltfFile(fakeFile("two.glb"), instance);
        expect(createdObject(created).parts.map(p => p.texture)).toEqual(["tex-for-0", "tex-for-1"]);
    });

    it("leaves a part untextured when its material has no image", async () => {
        // Materials are sparse: a scene may have one textured material among fifteen plain ones,
        // and the plain ones must not pick up a neighbour's texture.
        const { instance, created } = instanceCapturing(
            groups({ material: 0, textured: true }, { material: 1, textured: true }),
            new Map([[1, "tex-for-1"]])
        );
        await loadGltfFile(fakeFile("two.glb"), instance);
        expect(createdObject(created).parts.map(p => p.texture)).toEqual([undefined, "tex-for-1"]);
    });

    it("drops the coordinates when there is not one pair per vertex", async () => {
        // The attribute would be read past the end of its buffer otherwise.
        const reply = groups({ material: 0, textured: true });
        reply.groups[0].texCoords = new Float32Array(2);   // one pair for three vertices
        const { instance, created } = instanceCapturing(reply, new Map([[0, "tex-for-0"]]));
        await loadGltfFile(fakeFile("short.glb"), instance);
        const part = createdObject(created).parts[0] as { texture?: string; texCoords?: number[] };
        expect(part.texture).toBeUndefined();
        expect(part.texCoords).toBeUndefined();
    });

    it("ignores a group with no geometry", async () => {
        const reply = groups({ material: 0 }, { material: 1, vertices: 0 });
        reply.groups[1].indices = new Uint32Array(0);
        const { instance, created } = instanceCapturing(reply);
        await loadGltfFile(fakeFile("one.glb"), instance);
        expect(createdObject(created).parts).toHaveLength(1);
    });

    it("reports no triangles when every group was empty", async () => {
        const { instance } = instanceCapturing({ status: 1, name: "", groups: [] });
        await expect(loadGltfFile(fakeFile("empty.glb"), instance)).rejects.toContain(
            "contained no triangles"
        );
    });
});

/**
 * Draco is decompressed on the way in rather than refused, and the decoder is only fetched for
 * files that need it - it is 190 KB of WebAssembly that most imports have no use for.
 */
describe("a Draco-compressed glTF", () => {
    /** A document whose geometry is compressed: its accessors have no bufferView. */
    const dracoGltf = (): ArrayBuffer => {
        const text = new TextEncoder().encode(JSON.stringify({
            asset: { version: "2.0" },
            extensionsRequired: ["KHR_draco_mesh_compression"],
            buffers: [{ byteLength: 4, uri: "data:application/octet-stream;base64,AAAAAA==" }],
            bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 4 }],
            accessors: [{ componentType: 5123, count: 3, type: "SCALAR" },
                        { componentType: 5126, count: 3, type: "VEC3" }],
            meshes: [{
                primitives: [{
                    mode: 4,
                    indices: 0,
                    attributes: { POSITION: 1 },
                    extensions: {
                        KHR_draco_mesh_compression: { bufferView: 0, attributes: { POSITION: 0 } },
                    },
                }],
            }],
        }));
        return text.buffer.slice(text.byteOffset, text.byteOffset + text.byteLength) as ArrayBuffer;
    };

    /** A decode that returns one triangle, standing in for the real decoder. */
    const triangleDecode: DracoDecode = () => ({
        numPoints: 3,
        indices: new Uint32Array([0, 1, 2]),
        attributes: new Map([[0, { values: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), components: 3 }]]),
    });

    beforeEach(() => mockedCreateDracoDecode.mockReset());

    it("does not fetch the decoder for a file that does not need it", async () => {
        const { instance } = recordingInstance();
        await loadGltfFile(fakeFile("plain.glb"), instance, []).catch(() => undefined);
        expect(mockedCreateDracoDecode).not.toHaveBeenCalled();
    });

    it("decompresses it and sends a plain document on", async () => {
        mockedCreateDracoDecode.mockResolvedValue(triangleDecode);
        const { instance, calls } = recordingInstance();
        const file = fakeFile("squashed.gltf", dracoGltf());

        await loadGltfFile(file, instance, [file]).catch(() => undefined);

        expect(mockedCreateDracoDecode).toHaveBeenCalledTimes(1);
        expect(calls).toHaveLength(1);
        const [payload, name, sidecars] = calls[0] as [Uint8Array, string, { name: string }[]];
        const sent = JSON.parse(new TextDecoder().decode(payload));
        expect(sent.meshes[0].primitives[0].extensions).toBeUndefined();
        expect(sent.extensionsRequired).toBeUndefined();
        expect(typeof sent.accessors[1].bufferView).toBe("number");
        // The rewrite emits JSON with its buffers as files, so the worker has to pick the JSON
        // parser - which it does by extension.
        expect(name).toMatch(/\.gltf$/);
        expect(sidecars.some(s => s.name.endsWith(".bin"))).toBe(true);
    });

    it("says so when the decoder cannot be fetched", async () => {
        mockedCreateDracoDecode.mockRejectedValue(
            new Error("the Draco decoder is missing from this installation"));
        const { instance, calls } = recordingInstance();
        const file = fakeFile("squashed.gltf", dracoGltf());

        const rejection = await loadGltfFile(file, instance, [file]).catch(e => e);
        expect(rejection).toContain("Draco decoder is missing");
        expect(calls).toHaveLength(0);
    });

    it("passes on a decode failure rather than sending a half-built document", async () => {
        mockedCreateDracoDecode.mockResolvedValue(() => {
            throw new Error("the compressed geometry could not be decoded (corrupt)");
        });
        const { instance, calls } = recordingInstance();
        const file = fakeFile("broken.gltf", dracoGltf());

        const rejection = await loadGltfFile(file, instance, [file]).catch(e => e);
        expect(rejection).toContain("could not be decoded");
        expect(calls).toHaveLength(0);
    });
});
