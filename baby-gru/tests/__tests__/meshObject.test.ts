/**
 * The mesh object: geometry rather than parameters.
 *
 * Every other shape is described and built. This one carries its own triangles, which makes it
 * the odd one out in three ways worth testing: it does not go through the mesh instancer, it
 * supplies its own per-vertex colours, and its centre and extent have to be worked out from the
 * vertices rather than from a radius.
 *
 * Why not instanced: the instancer shares one mesh between placements and gives each a single
 * colour. A mesh whose vertices are individually coloured - which is what a glTF COLOR_0 gives -
 * cannot survive that, so it is emitted as a plain buffer, as a cavity or a molecular surface is,
 * and picked whole by the same wholeMeshPickInfo.
 */
import { centreOfObject, extentOfObject, MeshObject, ThreeDObject } from "../../src/store/threeDObjectsSlice";
import { getBuffersForShapes } from "../../src/WebGLgComponents/threeDObjectsDraw";
import { newObjectOfType, OBJECT_TYPES } from "../../src/utils/threeDObjectFactories";

(globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas = class {
    getContext() {
        let value = "#000000";
        return {
            set fillStyle(v: string) {
                value = /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : "#000000";
            },
            get fillStyle() {
                return value;
            }
        };
    }
};

/** A unit square in the z = 0 plane, two triangles, four vertices. */
const square = (extra: Partial<MeshObject> = {}): MeshObject => ({
    ...newObjectOfType("mesh"),
    vertices: [0, 0, 0, 2, 0, 0, 2, 2, 0, 0, 2, 0],
    indices: [0, 1, 2, 0, 2, 3],
    ...extra
}) as MeshObject;

const meshBuffers = async (obj: ThreeDObject) =>
    (await getBuffersForShapes([obj])) as {
        vert_tri: number[][][];
        norm_tri: number[][][];
        col_tri: number[][][];
        idx_tri: number[][][];
        pick_info?: { pick_points: number[][]; instance_tags?: string[]; highlight_whole?: boolean };
    }[];

describe("the type is registered like any other", () => {
    test("mesh is one of the shapes create accepts", () => {
        expect(OBJECT_TYPES).toContain("mesh");
    });

    test("a default mesh is drawable rather than empty", () => {
        // Same reasoning as the two-point default path: `create({ type: "mesh" })` should give
        // something you can see, not an invisible placeholder.
        const mesh = newObjectOfType("mesh");
        expect(mesh.vertices.length).toBeGreaterThanOrEqual(9);
        expect(mesh.indices.length % 3).toBe(0);
        expect(mesh.indices.length).toBeGreaterThan(0);
    });
});

describe("where it is and how big", () => {
    test("the centre is the mean vertex, offset by the origin", () => {
        const mesh = square({ origin: [10, 0, 0] });
        expect(centreOfObject(mesh)).toEqual([11, 1, 0]);
    });

    test("scale moves the centre too", () => {
        expect(centreOfObject(square({ origin: [0, 0, 0], scale: 3 }))).toEqual([3, 3, 0]);
    });

    test("the extent reaches the furthest vertex from the centre", () => {
        // Corners of a 2x2 square are sqrt(2) from its middle.
        expect(extentOfObject(square())).toBeCloseTo(Math.SQRT2, 6);
        expect(extentOfObject(square({ scale: 2 }))).toBeCloseTo(2 * Math.SQRT2, 6);
    });

    test("an empty mesh does not produce NaN", () => {
        const empty = square({ vertices: [], indices: [] });
        expect(centreOfObject(empty)).toEqual([0, 0, 0]);
        expect(extentOfObject(empty)).toBe(0);
    });
});

describe("drawing", () => {
    test("a mesh is emitted as a plain buffer, not as an instanced draw", async () => {
        const buffers = await meshBuffers(square());
        expect(buffers).toHaveLength(1);
        // The instanced path produces inst_* fields; this is the plain triangle shape that a
        // cavity or a molecular surface arrives in.
        expect(buffers[0].vert_tri[0][0]).toHaveLength(12);
        expect(buffers[0].idx_tri[0][0]).toEqual([0, 1, 2, 0, 2, 3]);
    });

    test("vertices are placed by the origin and sized by the scale", async () => {
        const buffers = await meshBuffers(square({ origin: [100, 0, 0], scale: 2 }));
        expect(buffers[0].vert_tri[0][0].slice(0, 6)).toEqual([100, 0, 0, 104, 0, 0]);
    });

    test("per-vertex colours are kept as given", async () => {
        const colours = [
            1, 0, 0, 1,
            0, 1, 0, 1,
            0, 0, 1, 1,
            1, 1, 0, 1
        ];
        const buffers = await meshBuffers(square({ colours }));
        expect(buffers[0].col_tri[0][0]).toEqual(colours);
    });

    test("and a mesh without them takes the object's colour, four components per vertex", async () => {
        const buffers = await meshBuffers(square({ colour: "#00ff00ff" }));
        const col = buffers[0].col_tri[0][0];
        expect(col).toHaveLength(16);
        expect(col.slice(0, 4)).toEqual(col.slice(4, 8));
        expect(col.slice(0, 4)).toEqual(col.slice(12, 16));
    });

    test("colours of the wrong length are ignored rather than half-used", async () => {
        // A file that supplied RGB where RGBA was expected would otherwise shear the colours
        // across the vertices.
        const buffers = await meshBuffers(square({ colours: [1, 0, 0, 1, 0, 1, 0, 1] }));
        expect(buffers[0].col_tri[0][0]).toHaveLength(16);
    });

    test("normals are computed from the faces when the mesh brings none", async () => {
        // The square lies in z = 0 wound anticlockwise, so every normal is +z.
        const buffers = await meshBuffers(square());
        const normals = buffers[0].norm_tri[0][0];
        expect(normals).toHaveLength(12);
        for (let v = 0; v < 4; v++) {
            expect(normals[3 * v]).toBeCloseTo(0, 6);
            expect(normals[3 * v + 1]).toBeCloseTo(0, 6);
            expect(normals[3 * v + 2]).toBeCloseTo(1, 6);
        }
    });

    test("supplied normals are used unchanged", async () => {
        const normals = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0];
        const buffers = await meshBuffers(square({ normals }));
        expect(buffers[0].norm_tri[0][0]).toEqual(normals);
    });

    test("a vertex no triangle uses points somewhere, rather than at NaN", async () => {
        const withStray = square({
            vertices: [0, 0, 0, 2, 0, 0, 2, 2, 0, 0, 2, 0, 9, 9, 9],
            indices: [0, 1, 2]
        });
        const normals = (await meshBuffers(withStray))[0].norm_tri[0][0];
        expect(normals.slice(12, 15).every(Number.isFinite)).toBe(true);
    });

    test("an empty or degenerate mesh draws nothing at all", async () => {
        expect(await getBuffersForShapes([square({ vertices: [], indices: [] })])).toEqual([]);
        expect(await getBuffersForShapes([square({ indices: [] })])).toEqual([]);
    });
});

/**
 * A mesh split into parts is still one object, so the two questions the handles ask - where is it
 * and how big is it - have to be answered over all of it. Answering from the first part alone
 * would put a multi-material model's centre off to one side of itself, and its extent short.
 */
describe("a mesh in several parts", () => {
    const twoSquares = (): MeshObject => ({
        ...newObjectOfType("mesh"),
        origin: [0, 0, 0],
        vertices: [],
        indices: [],
        parts: [
            { vertices: [0, 0, 0, 2, 0, 0, 2, 2, 0, 0, 2, 0], indices: [0, 1, 2, 0, 2, 3] },
            { vertices: [10, 0, 0, 12, 0, 0, 12, 2, 0, 10, 2, 0], indices: [0, 1, 2, 0, 2, 3] },
        ],
    }) as MeshObject;

    test("its centre is the mean over every part, not the first", () => {
        // Eight vertices spanning x = 0 to 12, so the mean x is 6 - between the two squares.
        // Taking only the first part would give 1.
        const [x, y, z] = centreOfObject(twoSquares());
        expect(x).toBeCloseTo(6);
        expect(y).toBeCloseTo(1);
        expect(z).toBeCloseTo(0);
    });

    test("its extent reaches the furthest part", () => {
        const extent = extentOfObject(twoSquares());
        // The furthest corner from (6,1,0) is (12,2,0) or (0,0,0): hypot(6,1) = 6.08.
        expect(extent).toBeCloseTo(Math.hypot(6, 1));
    });

    test("origin and scale apply to every part alike", () => {
        const scaled = { ...twoSquares(), origin: [100, 0, 0], scale: 2 } as MeshObject;
        const [x] = centreOfObject(scaled);
        expect(x).toBeCloseTo(100 + 6 * 2);
    });

    test("a one-piece mesh answers both exactly as before", () => {
        // meshParts presents the flat fields as a single part, so nothing built before parts
        // existed sees any change.
        const plain = square();
        expect(centreOfObject(plain)).toEqual(centreOfObject({ ...plain }));
        const [x, y] = centreOfObject(plain);
        expect(x).toBeCloseTo(1);
        expect(y).toBeCloseTo(1);
    });
});

describe("picking", () => {
    test("it is picked as one whole object, centred on its centroid", async () => {
        const buffers = await meshBuffers(square({ origin: [10, 0, 0] }));
        expect(buffers[0].pick_info?.highlight_whole).toBe(true);
        expect(buffers[0].pick_info?.pick_points).toEqual([[11, 1, 0]]);
    });

    test("and carries its object id, so a click can be traced back", async () => {
        const mesh = square({ uniqueId: "my-mesh" });
        const buffers = await meshBuffers(mesh);
        expect(buffers[0].pick_info?.instance_tags).toEqual(["my-mesh"]);
    });

    test("the tag kind follows the caller, as for every other shape", async () => {
        const buffers = (await getBuffersForShapes([square()], { tagKind: "dnatco-residue" })) as {
            pick_info?: { instance_tag_kind?: string };
        }[];
        expect(buffers[0].pick_info?.instance_tag_kind).toBe("dnatco-residue");
    });
});

describe("meshes and other shapes together", () => {
    test("a scene of both draws both, and only the mesh is uninstanced", async () => {
        const buffers = (await getBuffersForShapes([
            newObjectOfType("sphere") as ThreeDObject,
            square() as ThreeDObject
        ])) as { vert_tri?: unknown; instance_origins?: unknown }[];

        expect(buffers).toHaveLength(2);
        // Both carry vert_tri - an instanced draw puts its shared mesh there too - so what
        // separates them is instance_origins, which only an instanced draw has.
        const instanced = buffers.filter(b => b.instance_origins !== undefined);
        const plain = buffers.filter(b => b.instance_origins === undefined);
        expect(instanced).toHaveLength(1);
        expect(plain).toHaveLength(1);
        expect(plain[0].vert_tri).toBeDefined();
    });
});
