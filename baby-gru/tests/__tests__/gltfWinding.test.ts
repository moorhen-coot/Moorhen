/**
 * Correcting the winding of Moorhen's own glTF exports.
 *
 * Coot's meshes are wound clockwise seen from outside with normals to match, Moorhen compensates
 * on screen via "mesh_perm3", and the glTF exporters write the Coot mesh verbatim - so the files
 * came out inside-out. The correction has to do both halves, and the measurement that settles
 * that is in the module's own comment: reversing the winding alone, or negating the normals
 * alone, leaves the file internally inconsistent, which is worse than being uniformly reversed
 * because then no viewer can paper over it.
 *
 * So the test checks both invariants together, by the two measurements that are independent of
 * the shape of the mesh:
 *
 *   the signed volume, (1/6) sum a . (b x c), positive when the winding is counter-clockwise
 *   seen from outside, which is what glTF asks for;
 *
 *   and whether each triangle's winding agrees with its vertex normals.
 *
 * A tetrahedron is enough for that, and small enough to write out by hand.
 */
import { reverseExportedGltfWinding } from "../../src/utils/gltfWinding";

/** A tetrahedron wound inside-out, with normals agreeing with that winding. */
const makeGlb = (options: {
    /** Build it the right way round instead, to check the correction is not unconditional. */
    outward?: boolean;
    /** Leave out the NORMAL attribute. */
    noNormals?: boolean;
    /** Two primitives sharing one NORMAL accessor, to catch a double negation. */
    sharedNormals?: boolean;
    /** Indices as unsigned bytes rather than shorts. */
    byteIndices?: boolean;
    /** A non-triangle mode, which must be left alone. */
    mode?: number;
} = {}): Uint8Array => {
    const positions = [1, 1, 1, 1, -1, -1, -1, 1, -1, -1, -1, 1];
    // Wound so that the signed volume comes out NEGATIVE with these positions - that is the
    // state a Moorhen export arrives in, and the thing being corrected. (The obvious ordering,
    // [0,1,2, 0,3,1, 0,2,3, 1,3,2], is the outward one and gives +2.67; this is its reverse.)
    const inward = [0, 2, 1, 0, 1, 3, 0, 3, 2, 1, 2, 3];
    const reverseTriples = (f: number[]) => f.map((_, i, a) => a[i - (i % 3) + [0, 2, 1][i % 3]]);
    const faces = options.outward ? reverseTriples(inward) : inward;
    // Vertex normals pointing inward, to match the inward winding (or outward if flipped).
    const sign = options.outward ? 1 : -1;
    const normals = [0, 1, 2, 3].flatMap(v => {
        const n = [positions[3 * v], positions[3 * v + 1], positions[3 * v + 2]];
        const len = Math.hypot(...n);
        return n.map(c => (sign * c) / len);
    });

    const posBytes = new Uint8Array(new Float32Array(positions).buffer);
    const norBytes = new Uint8Array(new Float32Array(normals).buffer);
    const idxBytes = options.byteIndices
        ? new Uint8Array(faces)
        : new Uint8Array(new Uint16Array(faces).buffer);

    const parts = [posBytes, norBytes, idxBytes];
    const offsets: number[] = [];
    let at = 0;
    for (const part of parts) {
        offsets.push(at);
        at += part.byteLength + ((-part.byteLength % 4) + 4) % 4;
    }
    const bin = new Uint8Array(at);
    parts.forEach((part, i) => bin.set(part, offsets[i]));

    const attributes: Record<string, number> = { POSITION: 0 };
    if (!options.noNormals) attributes.NORMAL = 1;
    const primitive = {
        mode: options.mode ?? 4,
        attributes,
        indices: 2
    };
    const gltf = {
        asset: { version: "2.0" },
        scene: 0,
        scenes: [{ nodes: [0] }],
        nodes: [{ mesh: 0 }],
        // Two primitives sharing accessors: negating NORMAL twice would undo it.
        meshes: [{ primitives: options.sharedNormals ? [primitive, { ...primitive }] : [primitive] }],
        buffers: [{ byteLength: bin.byteLength }],
        bufferViews: [
            { buffer: 0, byteOffset: offsets[0], byteLength: posBytes.byteLength },
            { buffer: 0, byteOffset: offsets[1], byteLength: norBytes.byteLength },
            { buffer: 0, byteOffset: offsets[2], byteLength: idxBytes.byteLength }
        ],
        accessors: [
            { bufferView: 0, componentType: 5126, count: 4, type: "VEC3" },
            { bufferView: 1, componentType: 5126, count: 4, type: "VEC3" },
            {
                bufferView: 2,
                componentType: options.byteIndices ? 5121 : 5123,
                count: faces.length,
                type: "SCALAR"
            }
        ]
    };

    const jsonBytes = new TextEncoder().encode(JSON.stringify(gltf));
    const pad = (n: number) => ((-n % 4) + 4) % 4;
    const jsonPadded = jsonBytes.byteLength + pad(jsonBytes.byteLength);
    const binPadded = bin.byteLength + pad(bin.byteLength);
    const total = 12 + 8 + jsonPadded + 8 + binPadded;

    const out = new Uint8Array(total);
    const view = new DataView(out.buffer);
    view.setUint32(0, 0x46546c67, true);
    view.setUint32(4, 2, true);
    view.setUint32(8, total, true);
    view.setUint32(12, jsonPadded, true);
    view.setUint32(16, 0x4e4f534a, true);
    out.set(jsonBytes, 20);
    out.fill(0x20, 20 + jsonBytes.byteLength, 20 + jsonPadded); // JSON pads with spaces
    const binHeader = 20 + jsonPadded;
    view.setUint32(binHeader, binPadded, true);
    view.setUint32(binHeader + 4, 0x004e4942, true);
    out.set(bin, binHeader + 8);
    return out;
};

/** The two shape-independent measurements, read back out of a .glb. */
const measure = (bytes: Uint8Array) => {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = 12;
    let gltf: any = null;
    let binStart = -1;
    while (offset + 8 <= bytes.byteLength) {
        const length = view.getUint32(offset, true);
        const kind = view.getUint32(offset + 4, true);
        if (kind === 0x4e4f534a) gltf = JSON.parse(new TextDecoder().decode(bytes.subarray(offset + 8, offset + 8 + length)));
        if (kind === 0x004e4942) binStart = offset + 8;
        offset += 8 + length + ((-length % 4) + 4) % 4;
    }
    const bin = new DataView(bytes.buffer, bytes.byteOffset + binStart);
    const readVec3 = (accessorIndex: number) => {
        const a = gltf.accessors[accessorIndex];
        const v = gltf.bufferViews[a.bufferView];
        const out: number[][] = [];
        for (let e = 0; e < a.count; e++) {
            const base = (v.byteOffset ?? 0) + e * 12;
            out.push([0, 1, 2].map(c => bin.getFloat32(base + 4 * c, true)));
        }
        return out;
    };
    const prim = gltf.meshes[0].primitives[0];
    const pos = readVec3(prim.attributes.POSITION);
    const nor = prim.attributes.NORMAL !== undefined ? readVec3(prim.attributes.NORMAL) : null;
    const ia = gltf.accessors[prim.indices];
    const iv = gltf.bufferViews[ia.bufferView];
    const idx: number[] = [];
    for (let e = 0; e < ia.count; e++) {
        const at = (iv.byteOffset ?? 0) + e * (ia.componentType === 5121 ? 1 : 2);
        idx.push(ia.componentType === 5121 ? bin.getUint8(at) : bin.getUint16(at, true));
    }

    const cross = (p: number[], q: number[]) => [
        p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]
    ];
    const dot = (p: number[], q: number[]) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];

    let volume = 0;
    let agree = 0;
    let disagree = 0;
    for (let t = 0; t + 2 < idx.length; t += 3) {
        const [a, b, c] = [pos[idx[t]], pos[idx[t + 1]], pos[idx[t + 2]]];
        volume += dot(a, cross(b, c)) / 6;
        if (!nor) continue;
        const face = cross([0, 1, 2].map(i => b[i] - a[i]), [0, 1, 2].map(i => c[i] - a[i]));
        const vn = [0, 1, 2].map(i => nor[idx[t]][i] + nor[idx[t + 1]][i] + nor[idx[t + 2]][i]);
        dot(face, vn) > 0 ? agree++ : disagree++;
    }
    return { volume, agree, disagree, normals: nor, indices: idx, positions: pos };
};

describe("an inside-out export is corrected", () => {
    test("the fixture really is inside-out to begin with, or this proves nothing", () => {
        const before = measure(makeGlb());
        expect(before.volume).toBeLessThan(0);
        expect(before.agree).toBe(4);
        expect(before.disagree).toBe(0);
    });

    test("the signed volume becomes positive", () => {
        const after = measure(reverseExportedGltfWinding(makeGlb()));
        expect(after.volume).toBeGreaterThan(0);
    });

    test("and the normals still agree with the winding", () => {
        // The half that catches doing only one of the two. Either alone gives 0 agreeing.
        const after = measure(reverseExportedGltfWinding(makeGlb()));
        expect(after.agree).toBe(4);
        expect(after.disagree).toBe(0);
    });

    test("the file keeps its size, vertex count and triangle count", () => {
        const input = makeGlb();
        const output = reverseExportedGltfWinding(input);
        expect(output.byteLength).toBe(input.byteLength);
        const after = measure(output);
        expect(after.positions).toHaveLength(4);
        expect(after.indices).toHaveLength(12);
    });

    test("positions are untouched; only winding and normals change", () => {
        const before = measure(makeGlb());
        const after = measure(reverseExportedGltfWinding(makeGlb()));
        expect(after.positions).toEqual(before.positions);
        expect(after.normals).toEqual(before.normals!.map(n => n.map(c => -c)));
    });

    test("the caller's buffer is not altered underfoot", () => {
        const input = makeGlb();
        const copy = new Uint8Array(input);
        reverseExportedGltfWinding(input);
        expect(Array.from(input)).toEqual(Array.from(copy));
    });
});

describe("what it leaves alone", () => {
    test("a primitive that is not a triangle list is untouched", () => {
        // mode 5 is a triangle strip: reversing a strip's winding is not an index permutation,
        // so guessing would corrupt it.
        const input = makeGlb({ mode: 5 });
        expect(Array.from(reverseExportedGltfWinding(input))).toEqual(Array.from(input));
    });

    test("something that is not a glb comes back unchanged", () => {
        const notGlb = new TextEncoder().encode("this is not a glb file at all, not even close");
        expect(reverseExportedGltfWinding(notGlb)).toBe(notGlb);
    });

    test("a truncated glb is refused rather than half-edited", () => {
        const input = makeGlb().subarray(0, 16);
        expect(reverseExportedGltfWinding(input)).toBe(input);
    });
});

describe("the awkward cases", () => {
    test("byte indices work as well as short ones", () => {
        const after = measure(reverseExportedGltfWinding(makeGlb({ byteIndices: true })));
        expect(after.volume).toBeGreaterThan(0);
        expect(after.agree).toBe(4);
    });

    test("a mesh with no normals still has its winding reversed", () => {
        const before = measure(makeGlb({ noNormals: true }));
        const after = measure(reverseExportedGltfWinding(makeGlb({ noNormals: true })));
        expect(before.volume).toBeLessThan(0);
        expect(after.volume).toBeGreaterThan(0);
    });

    test("an accessor shared by two primitives is corrected once, not twice", () => {
        // Negating a shared NORMAL accessor per-primitive would put it back as it was, and
        // reversing a shared index accessor twice likewise.
        const after = measure(reverseExportedGltfWinding(makeGlb({ sharedNormals: true })));
        expect(after.volume).toBeGreaterThan(0);
        expect(after.agree).toBe(4);
        expect(after.disagree).toBe(0);
    });

    test("correcting an already-correct file does reverse it, so it is not idempotent", () => {
        // Worth stating: this is a fix applied at one known point, not a normalise-anything
        // function. Applying it twice returns to where it started.
        const once = reverseExportedGltfWinding(makeGlb());
        const twice = reverseExportedGltfWinding(once);
        expect(measure(once).volume).toBeGreaterThan(0);
        expect(measure(twice).volume).toBeLessThan(0);
    });
});
