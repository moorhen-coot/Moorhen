/**
 * A textured mesh reaching the buffer protocol.
 *
 * The renderer end of this can only be judged by looking at it, so what is pinned here is the
 * data: that texture coordinates and a material arrive in the same [[...]] shape as everything
 * else, and - more important - that they are withheld whenever they would be wrong. An attribute
 * pointed at a buffer with fewer coordinates than vertices reads past the end of it, so a
 * mismatch has to mean "draw it untextured" rather than "draw it and hope".
 */
import { getBuffersForShapes } from "../../src/WebGLgComponents/threeDObjectsDraw";
import { MeshObject, ThreeDObject } from "../../src/store/threeDObjectsSlice";
import { newObjectOfType } from "../../src/utils/threeDObjectFactories";
import { getDisc, getPlane, getTetrahedron, getTorus } from "../../src/WebGLgComponents/shapeGeometry";

// jsdom has no OffscreenCanvas, and resolving a CSS colour name goes through one. The same shim
// is in meshObject.test.ts; the colours are incidental to what is tested here either way.
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

/** A unit square of two triangles, with whatever overrides a case needs. */
const square = (overrides: Partial<MeshObject> = {}): ThreeDObject => ({
    ...newObjectOfType("mesh"),
    type: "mesh",
    origin: [0, 0, 0],
    vertices: [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0],
    indices: [0, 1, 2, 0, 2, 3],
    ...overrides,
} as ThreeDObject);

const emitted = async (obj: ThreeDObject) =>
    (await getBuffersForShapes([obj])) as {
        vert_tri: number[][][];
        tex_tri?: number[][][];
        materials?: { baseColourTexture?: string }[][];
    }[];

const SQUARE_UVS = [0, 1, 1, 1, 1, 0, 0, 0];

describe("texture coordinates and a material on a mesh", () => {
    it("are emitted when the mesh has both", async () => {
        const buffers = await emitted(square({ texCoords: SQUARE_UVS, texture: "tex-1" }));
        expect(buffers).toHaveLength(1);
        expect(buffers[0].tex_tri?.[0][0]).toEqual(SQUARE_UVS);
        expect(buffers[0].materials?.[0][0]).toEqual({ baseColourTexture: "tex-1" });
    });

    it("sit beside the geometry in the same nesting as the rest", async () => {
        // The protocol is jsondata.key[idat][sub-buffer]; getting the depth wrong here would be
        // read as one coordinate per sub-buffer rather than one array per sub-buffer.
        const buffers = await emitted(square({ texCoords: SQUARE_UVS, texture: "tex-1" }));
        expect(buffers[0].tex_tri).toHaveLength(1);
        expect(buffers[0].tex_tri?.[0]).toHaveLength(1);
        expect(buffers[0].tex_tri?.[0][0]).toHaveLength(buffers[0].vert_tri[0][0].length / 3 * 2);
    });

    it("are absent for an ordinary untextured mesh", async () => {
        const buffers = await emitted(square());
        expect(buffers[0].tex_tri).toBeUndefined();
        expect(buffers[0].materials).toBeUndefined();
    });

    it("are withheld when there is no texture to sample", async () => {
        // Coordinates with nothing to look up are not useful, and claiming a material with no
        // texture in it would have the draw code enable the attribute for nothing.
        const buffers = await emitted(square({ texCoords: SQUARE_UVS }));
        expect(buffers[0].tex_tri).toBeUndefined();
        expect(buffers[0].materials).toBeUndefined();
    });

    it("are withheld when there is no coordinate for every vertex", async () => {
        // The dangerous case: three pairs for four vertices. Pointing the attribute at this
        // reads past the end of the buffer for the fourth.
        const buffers = await emitted(square({ texCoords: [0, 0, 1, 0, 1, 1], texture: "tex-1" }));
        expect(buffers[0].tex_tri).toBeUndefined();
        expect(buffers[0].materials).toBeUndefined();
    });

    it("are withheld when there are too many coordinates", async () => {
        // Equally a disagreement between the two, and equally not something to guess at.
        const buffers = await emitted(square({ texCoords: [...SQUARE_UVS, 0.5, 0.5], texture: "tex-1" }));
        expect(buffers[0].tex_tri).toBeUndefined();
    });

    it("leaves the geometry exactly as it was", async () => {
        // Adding a texture must not disturb anything that was already right, so the positions,
        // normals, colours and indices of a textured mesh match the untextured one.
        const plain = await emitted(square());
        const textured = await emitted(square({ texCoords: SQUARE_UVS, texture: "tex-1" }));
        for (const key of ["vert_tri", "norm_tri", "col_tri", "idx_tri"] as const) {
            expect((textured[0] as Record<string, unknown>)[key])
                .toEqual((plain[0] as Record<string, unknown>)[key]);
        }
    });

    it("does not disturb the pick information", async () => {
        const buffers = (await getBuffersForShapes([square({ texCoords: SQUARE_UVS, texture: "t" })])) as {
            pick_info?: { highlight_whole?: boolean; instance_tags?: string[] };
        }[];
        expect(buffers[0].pick_info?.highlight_whole).toBe(true);
    });
});

/**
 * The generated shapes get their coordinates from their generator, not from the object - the
 * object has no geometry to map. Only the plane has a mapping so far, because a square onto a
 * rectangle is unambiguous and unwrapping a torus or an icosahedron is not.
 */
describe("texture coordinates on a generated shape", () => {
    it("gives the plane one pair per vertex", () => {
        const plane = getPlane();
        expect(plane.texCoords).toBeDefined();
        expect(plane.texCoords).toHaveLength((plane.vertices.length / 3) * 2);
    });

    it("maps the square onto the whole image, with v increasing downwards", () => {
        // The mesh spans -0.5 to 0.5 on each axis. v = 0 is the top of the image, so the corner
        // at +y - the top of the shape - must be at v = 0, not v = 1. Getting this backwards is
        // the flip that a plain checkerboard cannot reveal.
        const plane = getPlane();
        const uvAt = (vertex: number) => [plane.texCoords[2 * vertex], plane.texCoords[2 * vertex + 1]];
        const xyAt = (vertex: number) => [plane.vertices[3 * vertex], plane.vertices[3 * vertex + 1]];

        for (let v = 0; v < 4; v++) {   // the +z face is the first four vertices
            const [x, y] = xyAt(v);
            expect(uvAt(v)).toEqual([x + 0.5, 0.5 - y]);
        }
    });

    it("mirrors the back face so the image is not backwards from behind", () => {
        const plane = getPlane();
        const count = plane.vertices.length / 3;
        for (let v = count / 2; v < count; v++) {
            const x = plane.vertices[3 * v];
            const y = plane.vertices[3 * v + 1];
            expect(plane.texCoords[2 * v]).toBeCloseTo(0.5 - x);
            expect(plane.texCoords[2 * v + 1]).toBeCloseTo(0.5 - y);
        }
    });

    it.each([
        ["disc", () => getDisc(16)],
        ["tetrahedron", () => getTetrahedron()],
        ["torus", () => getTorus(0.3, 16, 16)],
    ])("leaves %s without coordinates rather than inventing a mapping", (_name, build) => {
        expect(build().texCoords).toBeUndefined();
    });
});

/** A plane object, which goes through the instancer rather than being emitted directly. */
const plane = (overrides: Record<string, unknown> = {}): ThreeDObject => ({
    ...newObjectOfType("plane"),
    type: "plane",
    origin: [0, 0, 0],
    scalexyz: [10, 10, 1],
    ...overrides,
} as ThreeDObject);

describe("a textured instanced shape", () => {
    it("emits coordinates and a material", async () => {
        const buffers = (await getBuffersForShapes([plane({ texture: "tex-1" })])) as {
            tex_tri?: number[][][];
            materials?: { baseColourTexture?: string }[][];
            instance_origins?: number[][][];
        }[];
        expect(buffers).toHaveLength(1);
        expect(buffers[0].instance_origins).toBeDefined();   // it really is the instanced path
        expect(buffers[0].tex_tri?.[0][0].length).toBeGreaterThan(0);
        expect(buffers[0].materials?.[0][0]).toEqual({ baseColourTexture: "tex-1" });
    });

    it("emits none for an untextured plane", async () => {
        const buffers = (await getBuffersForShapes([plane()])) as { tex_tri?: unknown }[];
        expect(buffers[0].tex_tri).toBeUndefined();
    });

    it("shares one instanced draw between planes with the same texture", async () => {
        // The point of instancing. Three planes, one mesh, one texture, one buffer.
        const buffers = (await getBuffersForShapes([
            plane({ origin: [-20, 0, 0], texture: "tex-1" }),
            plane({ origin: [0, 0, 0], texture: "tex-1" }),
            plane({ origin: [20, 0, 0], texture: "tex-1" }),
        ])) as { instance_origins: number[][][] }[];

        expect(buffers).toHaveLength(1);
        expect(buffers[0].instance_origins[0][0]).toHaveLength(9);   // three origins
    });

    it("splits planes with different textures into separate draws", async () => {
        // A group is one draw call with one mesh, so it can only have one texture. If the
        // texture were not part of the group key these would merge and the second plane would
        // silently wear the first one's texture.
        const buffers = (await getBuffersForShapes([
            plane({ origin: [-20, 0, 0], texture: "tex-1" }),
            plane({ origin: [20, 0, 0], texture: "tex-2" }),
        ])) as { materials?: { baseColourTexture?: string }[][] }[];

        expect(buffers).toHaveLength(2);
        expect(buffers.map(b => b.materials?.[0][0].baseColourTexture).sort())
            .toEqual(["tex-1", "tex-2"]);
    });

    it("ignores a texture on a shape whose geometry has no mapping", async () => {
        // A torus has no unambiguous unwrapping, so its generator supplies no coordinates. The
        // texture is dropped rather than sampled with an unfed attribute, which would paint
        // every instance one flat colour.
        const buffers = (await getBuffersForShapes([
            { ...newObjectOfType("torus"), origin: [0, 0, 0], texture: "tex-1" } as ThreeDObject,
        ])) as { tex_tri?: unknown; materials?: unknown }[];
        expect(buffers[0].tex_tri).toBeUndefined();
        expect(buffers[0].materials).toBeUndefined();
    });
});
