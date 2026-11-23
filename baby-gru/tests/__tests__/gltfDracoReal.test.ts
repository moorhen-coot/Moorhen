/**
 * The decoder adapter, against real Draco data.
 *
 * gltfDraco.test.ts checks the rebuilding with a fake decoder, which is the right way round for
 * that: it pins our arithmetic without a WebAssembly module in the loop. But it cannot catch a
 * misunderstanding of Draco's own API - reading the wrong heap, asking for the wrong data type,
 * looking attributes up by the wrong kind of id - because the fake answers whatever is asked.
 *
 * So this compresses a cube with Draco's encoder and decompresses it through the real decoder and
 * the real rebuild. The library is the same one the browser gets; only how it is loaded differs,
 * which is why the adapter takes an already-loaded module.
 *
 * It skips rather than fails if the package is absent, since the rest of the glTF work does not
 * depend on it being installed.
 */
import { decompressDracoGltf } from "../../src/utils/gltfDraco";
import { decodeWith } from "../../src/utils/gltfDracoDecoder";
import type { DecoderModule, EncoderModule } from "draco3d";

// Eight corners of a unit cube, with deliberately asymmetric coordinates so that a transposed
// or mis-strided read cannot pass by looking plausible.
const POSITIONS = new Float32Array([
    0, 0, 0,
    2, 0, 0,
    2, 3, 0,
    0, 3, 0,
    0, 0, 5,
    2, 0, 5,
    2, 3, 5,
    0, 3, 5,
]);
const FACES = new Uint32Array([
    0, 2, 1, 0, 3, 2,
    4, 5, 6, 4, 6, 7,
    0, 1, 5, 0, 5, 4,
    1, 2, 6, 1, 6, 5,
    2, 3, 7, 2, 7, 6,
    3, 0, 4, 3, 4, 7,
]);

let draco3dgltf: { createDecoderModule: Function; createEncoderModule: Function } | null = null;
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    draco3dgltf = require("draco3dgltf");
} catch {
    draco3dgltf = null;
}

const describeIfInstalled = draco3dgltf ? describe : describe.skip;

describeIfInstalled("the Draco adapter against the real library", () => {
    let decoderModule: DecoderModule;
    let encoderModule: EncoderModule;

    beforeAll(async () => {
        decoderModule = await draco3dgltf!.createDecoderModule({});
        encoderModule = await draco3dgltf!.createEncoderModule({});
    }, 60000);

    /** The cube, encoded as Draco would be found inside a glTF, with its attribute id. */
    const encodeCube = (): { bytes: Uint8Array; positionId: number } => {
        const builder = new encoderModule.MeshBuilder();
        const mesh = new encoderModule.Mesh();
        builder.AddFacesToMesh(mesh, FACES.length / 3, FACES);
        const positionId = builder.AddFloatAttribute(
            mesh, encoderModule.POSITION, POSITIONS.length / 3, 3, POSITIONS);

        const encoder = new encoderModule.Encoder();
        // No quantization, so the decoded positions come back exactly. Quantization is covered
        // separately below, where approximate is the right expectation.
        encoder.SetAttributeQuantization(encoderModule.POSITION, 0);
        const encoded = new encoderModule.DracoInt8Array();
        const length = encoder.EncodeMeshToDracoBuffer(mesh, encoded);
        expect(length).toBeGreaterThan(0);

        const out = new Uint8Array(length);
        for (let i = 0; i < length; i++) out[i] = encoded.GetValue(i) & 0xff;

        encoderModule.destroy(encoded);
        encoderModule.destroy(encoder);
        encoderModule.destroy(mesh);
        encoderModule.destroy(builder);
        return { bytes: out, positionId };
    };

    /** A glTF whose one primitive is the encoded cube, with the blob embedded as a data: URI. */
    const documentFor = (blob: Uint8Array, positionId: number): ArrayBuffer => {
        let binary = "";
        for (const byte of blob) binary += String.fromCharCode(byte);
        const json = {
            asset: { version: "2.0" },
            extensionsUsed: ["KHR_draco_mesh_compression"],
            extensionsRequired: ["KHR_draco_mesh_compression"],
            scene: 0,
            scenes: [{ nodes: [0] }],
            nodes: [{ mesh: 0 }],
            buffers: [{
                byteLength: blob.byteLength,
                uri: "data:application/octet-stream;base64," + Buffer.from(binary, "binary").toString("base64"),
            }],
            bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: blob.byteLength }],
            accessors: [
                { componentType: 5123, count: FACES.length, type: "SCALAR" },
                { componentType: 5126, count: POSITIONS.length / 3, type: "VEC3" },
            ],
            meshes: [{
                primitives: [{
                    mode: 4,
                    indices: 0,
                    attributes: { POSITION: 1 },
                    extensions: {
                        KHR_draco_mesh_compression: {
                            bufferView: 0,
                            attributes: { POSITION: positionId },
                        },
                    },
                }],
            }],
        };
        const text = new TextEncoder().encode(JSON.stringify(json));
        return text.buffer.slice(text.byteOffset, text.byteOffset + text.byteLength) as ArrayBuffer;
    };

    it("round-trips a cube through the real encoder, decoder and rebuild", () => {
        const encoded = encodeCube();
        const result = decompressDracoGltf(
            documentFor(encoded.bytes, encoded.positionId),
            new Map(),
            decodeWith(decoderModule)
        );
        expect(result).not.toBeNull();

        const json = JSON.parse(new TextDecoder().decode(result!.gltf));
        const sidecar = result!.sidecars.find(s => s.name === json.buffers[json.bufferViews[
            json.accessors[1].bufferView].buffer].uri)!;
        const view = json.bufferViews[json.accessors[1].bufferView];
        const bytes = sidecar.data.slice(view.byteOffset, view.byteOffset + view.byteLength);
        const positions = new Float32Array(bytes.buffer, bytes.byteOffset, json.accessors[1].count * 3);

        expect(json.accessors[1].count).toBe(POSITIONS.length / 3);
        expect(json.accessors[1].componentType).toBe(5126);

        // Draco reorders vertices, so the cube is compared as a set of corners rather than in
        // the order it went in. Sorting makes that comparison independent of the ordering.
        const corner = (values: Float32Array | number[], i: number) =>
            [values[3 * i], values[3 * i + 1], values[3 * i + 2]].join(",");
        const got = Array.from({ length: 8 }, (_, i) => corner(positions, i)).sort();
        const wanted = Array.from({ length: 8 }, (_, i) => corner(POSITIONS, i)).sort();
        expect(got).toEqual(wanted);
    }, 60000);

    it("recovers the same triangles, as a set of corner triples", () => {
        const encoded = encodeCube();
        const result = decompressDracoGltf(
            documentFor(encoded.bytes, encoded.positionId),
            new Map(),
            decodeWith(decoderModule)
        )!;

        const json = JSON.parse(new TextDecoder().decode(result.gltf));
        const read = (index: number) => {
            const accessor = json.accessors[index];
            const view = json.bufferViews[accessor.bufferView];
            const uri = json.buffers[view.buffer].uri;
            const sidecar = result.sidecars.find(s => s.name === uri)!;
            return sidecar.data.slice(view.byteOffset, view.byteOffset + view.byteLength);
        };

        const indexBytes = read(0);
        const indices = new Uint32Array(indexBytes.buffer, indexBytes.byteOffset, json.accessors[0].count);
        const positionBytes = read(1);
        const positions = new Float32Array(
            positionBytes.buffer, positionBytes.byteOffset, json.accessors[1].count * 3);

        expect(json.accessors[0].componentType).toBe(5125);
        expect(indices.length).toBe(FACES.length);

        // Each triangle as its three corners, sorted within the triangle and across the set, so
        // that neither Draco's vertex reordering nor its face ordering matters - only the shape.
        const triangles = (idx: ArrayLike<number>, pos: ArrayLike<number>) => {
            const out: string[] = [];
            for (let t = 0; t < idx.length; t += 3) {
                const corners = [0, 1, 2].map(c => {
                    const v = idx[t + c];
                    return `${pos[3 * v]},${pos[3 * v + 1]},${pos[3 * v + 2]}`;
                }).sort();
                out.push(corners.join("|"));
            }
            return out.sort();
        };

        expect(triangles(indices, positions)).toEqual(triangles(FACES, POSITIONS));
    }, 60000);

    it("reports a corrupt blob rather than returning nonsense", () => {
        const blob = new Uint8Array([0xd1, 0xa0, 0xc0, 0x01, 1, 2, 3, 4, 5, 6, 7, 8]);
        expect(() => decompressDracoGltf(
            documentFor(blob, 0), new Map(), decodeWith(decoderModule)
        )).toThrow();
    }, 60000);
});
