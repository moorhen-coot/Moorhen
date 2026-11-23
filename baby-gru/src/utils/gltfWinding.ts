/**
 * Turning an inside-out glTF export the right way round.
 *
 * Coot's exporters do not agree with each other about winding, which is the thing to know before
 * using this. Measured on real exports of the same build:
 *
 *     export_metaballs_as_gltf                   signed volume -101.7   inside-out
 *     export_map_molecule_as_gltf                signed volume -227.0   inside-out
 *     export_molecular_representation_as_gltf    signed volume  822.6   standard
 *     export_model_molecule_as_gltf (bonds)      signed volume  166.6   standard
 *
 * All four measured, and they fall into two groups. The inside-out pair are the isosurface
 * generators - metaballs and map contours, both marching over a grid - while the two that come
 * out standard build their geometry from parts. That is a tidy enough split to be suggestive
 * rather than conclusive: the flag below is still set per path from the measurement, not
 * inferred from the grouping.
 *
 * So this is applied per export path, by the caller, and never to everything. An earlier version
 * applied it to every glTF export on the strength of one measurement, and inverted M2T - which
 * had been correct all along.
 *
 * (That first measurement was of a metaballs export misread as a molecular surface, and a whole
 * explanation was built on it about M2T's "mesh_perm3" compensation reaching the screen but not
 * the file. The observation was right and the attribution was wrong.)
 *
 * It is not obvious from looking, which is why it went unnoticed: a viewer that lights both faces
 * and culls neither shades a uniformly reversed surface quite plausibly, so such files look right
 * almost everywhere. They are wrong all the same, and anything that respects the convention -
 * Moorhen's own mesh import, for one - shows the inside.
 *
 * Both halves of the correction are needed. Measured on the metaballs export:
 *
 *     as exported                          volume   -101.7   agree 16916/16916
 *     reverse winding only                 volume    101.7   agree     0/16916
 *     negate normals only                  volume   -101.7   agree     0/16916
 *     reverse winding AND negate normals    volume   101.7   agree 16916/16916
 *
 * Either alone leaves the file internally inconsistent - the winding saying one thing and the
 * normals the other - which is worse than being uniformly reversed, because then no viewer can
 * paper over it.
 *
 * Done to the bytes here rather than in Coot: Coot's meshes have assorted histories and some of
 * their permutations exist for Moorhen's own sake, so which of them is "wrong" is not a question
 * to settle by changing Coot internals.
 *
 * outputs/wf/sel/gltfwinding.py measures any file, which is how each line above was obtained.
 */

const GLB_MAGIC = 0x46546c67; // "glTF"
const CHUNK_JSON = 0x4e4f534a; // "JSON"
const CHUNK_BIN = 0x004e4942; // "BIN\0"

const MODE_TRIANGLES = 4;

const COMPONENT_BYTES: Record<number, number> = {
    5120: 1, // byte
    5121: 1, // unsigned byte
    5122: 2, // short
    5123: 2, // unsigned short
    5125: 4, // unsigned int
    5126: 4, // float
};

const COMPONENT_COUNT: Record<string, number> = {
    SCALAR: 1,
    VEC2: 2,
    VEC3: 3,
    VEC4: 4,
};

type Accessor = {
    bufferView?: number;
    byteOffset?: number;
    componentType: number;
    count: number;
    type: string;
};

type Gltf = {
    accessors?: Accessor[];
    bufferViews?: { buffer: number; byteOffset?: number; byteLength: number; byteStride?: number }[];
    meshes?: { primitives?: { mode?: number; indices?: number; attributes?: Record<string, number> }[] }[];
};

/** Where an accessor's data starts in the binary blob, and how far apart its elements are. */
const layoutOf = (gltf: Gltf, index: number) => {
    const accessor = gltf.accessors?.[index];
    if (!accessor || accessor.bufferView === undefined) return null;
    const view = gltf.bufferViews?.[accessor.bufferView];
    if (!view) return null;

    const componentBytes = COMPONENT_BYTES[accessor.componentType];
    const components = COMPONENT_COUNT[accessor.type];
    if (!componentBytes || !components) return null;

    return {
        start: (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0),
        // An interleaved view states its stride; a tightly packed one does not.
        stride: view.byteStride || componentBytes * components,
        componentBytes,
        components,
        componentType: accessor.componentType,
        count: accessor.count,
    };
};

/**
 * Swap the second and third index of every triangle, in place.
 *
 * Reversing the winding is a permutation within each triple, so nothing changes size and the
 * buffer can be edited where it lies - which is why the JSON needs no rewriting at all.
 */
const reverseWinding = (bin: DataView, gltf: Gltf, accessorIndex: number): boolean => {
    const layout = layoutOf(gltf, accessorIndex);
    if (!layout || layout.components !== 1) return false;

    const read = (at: number): number => {
        switch (layout.componentType) {
            case 5121: return bin.getUint8(at);
            case 5123: return bin.getUint16(at, true);
            case 5125: return bin.getUint32(at, true);
            default: return NaN;
        }
    };
    const write = (at: number, value: number) => {
        switch (layout.componentType) {
            case 5121: bin.setUint8(at, value); break;
            case 5123: bin.setUint16(at, value, true); break;
            case 5125: bin.setUint32(at, value, true); break;
        }
    };
    if (Number.isNaN(read(layout.start))) return false;

    // Whole triangles only. A count that is not a multiple of three is a malformed file, and the
    // trailing one or two indices are left alone rather than being folded into a neighbour.
    const triangles = Math.floor(layout.count / 3);
    for (let t = 0; t < triangles; t++) {
        const second = layout.start + (3 * t + 1) * layout.stride;
        const third = layout.start + (3 * t + 2) * layout.stride;
        const held = read(second);
        write(second, read(third));
        write(third, held);
    }
    return true;
};

/** Negate every component of a float accessor, in place. */
const negateNormals = (bin: DataView, gltf: Gltf, accessorIndex: number): boolean => {
    const layout = layoutOf(gltf, accessorIndex);
    // Only float normals are touched. A quantised NORMAL would need its own handling, and
    // silently misreading one would be worse than leaving it.
    if (!layout || layout.componentType !== 5126) return false;

    for (let e = 0; e < layout.count; e++) {
        for (let c = 0; c < layout.components; c++) {
            const at = layout.start + e * layout.stride + c * layout.componentBytes;
            bin.setFloat32(at, -bin.getFloat32(at, true), true);
        }
    }
    return true;
};

/**
 * Reverse the winding and negate the normals of every triangle primitive in a .glb.
 *
 * The binary chunk is edited in place and the JSON is untouched, so the result is the same file
 * with the geometry turned the right way round - same length, same structure, same accessors.
 *
 * An accessor shared between primitives is handled once. Two primitives sharing one NORMAL
 * accessor would otherwise have it negated twice, which would quietly put it back as it was.
 *
 * @param bytes - The exported .glb.
 * @returns The corrected bytes, or the input unchanged if it is not a .glb this can edit.
 */
export const correctExportedGltf = (bytes: ArrayBuffer): ArrayBuffer => {
    const corrected = reverseExportedGltfWinding(new Uint8Array(bytes));
    return corrected.buffer.slice(
        corrected.byteOffset,
        corrected.byteOffset + corrected.byteLength
    ) as ArrayBuffer;
};

export const reverseExportedGltfWinding = (bytes: Uint8Array): Uint8Array => {
    const out = new Uint8Array(bytes); // a copy, so a caller's buffer is never altered underfoot
    const view = new DataView(out.buffer, out.byteOffset, out.byteLength);

    if (out.byteLength < 20 || view.getUint32(0, true) !== GLB_MAGIC) {
        // Not a .glb. The exporters only produce .glb for glTF, so this is not a case to handle
        // silently wrongly - it is a case to leave alone.
        return bytes;
    }

    let offset = 12;
    let json: Gltf | null = null;
    let binStart = -1;
    let binLength = 0;
    while (offset + 8 <= out.byteLength) {
        const length = view.getUint32(offset, true);
        const kind = view.getUint32(offset + 4, true);
        const start = offset + 8;
        if (kind === CHUNK_JSON && json === null) {
            try {
                json = JSON.parse(new TextDecoder().decode(out.subarray(start, start + length)));
            } catch {
                return bytes;
            }
        } else if (kind === CHUNK_BIN && binStart < 0) {
            binStart = start;
            binLength = length;
        }
        offset = start + length + ((-length % 4) + 4) % 4;
    }

    if (!json || binStart < 0 || !json.meshes) return bytes;

    const bin = new DataView(out.buffer, out.byteOffset + binStart, binLength);
    const windingDone = new Set<number>();
    const normalsDone = new Set<number>();

    for (const mesh of json.meshes) {
        for (const primitive of mesh.primitives ?? []) {
            if ((primitive.mode ?? MODE_TRIANGLES) !== MODE_TRIANGLES) continue;

            const indices = primitive.indices;
            if (indices !== undefined && !windingDone.has(indices)) {
                if (reverseWinding(bin, json, indices)) windingDone.add(indices);
            }
            // An unindexed primitive draws its vertices in order, so its winding lives in the
            // POSITION accessor and reversing it would mean moving vertex data about. Coot's
            // exporters always write indices, so that case is left rather than half-handled.

            const normal = primitive.attributes?.NORMAL;
            if (normal !== undefined && !normalsDone.has(normal)) {
                if (negateNormals(bin, json, normal)) normalsDone.add(normal);
            }
        }
    }

    return out;
};
