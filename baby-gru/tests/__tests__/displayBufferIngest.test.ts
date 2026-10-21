/**
 * Turning worker output into DisplayBuffers, without and then with a WebGL context.
 *
 * Two things changed together and are checked here. Ingestion no longer needs a context: the GL
 * handles are placeholders until buildBuffers makes them (glResources.ts). And the per-vertex data
 * stays in typed arrays instead of being unpacked into plain ones and packed again for upload.
 *
 * The jsondata below has the shapes CootWorker.ts returns for "mesh_perm" and "lines_mesh".
 */
import { describe, expect, it, jest } from "@jest/globals";
import { createWebGLBuffers } from "../../src/WebGLgComponents/createWebGLBuffers";
import { appendOtherData, buildBuffers } from "../../src/WebGLgComponents/buildBuffers";
import {
    GL_SLOT_ARRAYS, hasPendingGLResources, isPendingGLBuffer, pendingGLBuffer, realiseGLResources,
} from "../../src/WebGLgComponents/glResources";

// appendOtherData reads window.devicePixelRatio for the label font.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).window = (global as any).window ?? { devicePixelRatio: 1 };

/** Two triangles sharing an edge, as the worker sends a solid map contour. */
const meshJson = () => ({
    prim_types: [["TRIANGLES"]],
    vert_tri: [[new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0])]],
    norm_tri: [[new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1])]],
    col_tri: [[new Float32Array([1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1])]],
    idx_tri: [[new Uint32Array([0, 1, 2, 1, 3, 2])]],
});

/** Two line segments, as the worker sends a map drawn as lines. */
const linesJson = (typed: boolean) => {
    const v = [0, 0, 0, 1, 0, 0, 1, 1, 0];
    const n = [0, 0, 1, 0, 0, 1, 0, 0, 1];
    const c = [1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1];
    const i = [0, 1, 1, 2];
    return {
        prim_types: [["LINES"]], useIndices: [[true]],
        vert_tri: [[typed ? new Float32Array(v) : v]],
        norm_tri: [[typed ? new Float32Array(n) : n]],
        col_tri: [[typed ? new Float32Array(c) : c]],
        idx_tri: [[typed ? new Uint32Array(i) : i]],
    };
};

/** Enough of a WebGL2 context to record what buildBuffers does with it. */
const makeGl = () => {
    let next = 0;
    const gl = {
        ARRAY_BUFFER: 1, ELEMENT_ARRAY_BUFFER: 2, STATIC_DRAW: 3, DYNAMIC_DRAW: 4,
        TEXTURE_2D: 5, TEXTURE_MIN_FILTER: 6, TEXTURE_MAG_FILTER: 7, TEXTURE_WRAP_S: 8,
        TEXTURE_WRAP_T: 9, NEAREST: 10, CLAMP_TO_EDGE: 11, R32F: 12, RED: 13, FLOAT: 14,
        R32UI: 15, RED_INTEGER: 16, UNSIGNED_INT: 17, MAX_TEXTURE_SIZE: 18,
        createBuffer: jest.fn(() => ({ glBuffer: next++ })),
        createTexture: jest.fn(() => ({ glTexture: next++ })),
        bindBuffer: jest.fn(),
        bufferData: jest.fn(),
        bindTexture: jest.fn(),
        texParameteri: jest.fn(),
        texImage2D: jest.fn(),
        getParameter: jest.fn(() => 4096),
    };
    return gl;
};

const makeStore = (glCtx: unknown) => ({
    getState: () => ({
        glRef: { glCtx, isWebGL2: true, displayBuffers: [], labelBuffers: [], texturedShapes: [] },
        mapContourSettings: { mapLineWidth: 1 },
        labelSettings: { GLLabelsFontFamily: "helvetica", GLLabelsFontSize: 18 },
    }),
    dispatch: jest.fn(),
});

describe("ingesting worker output", () => {
    it("keeps the data as typed arrays, copied rather than shared", () => {
        const json = meshJson();
        const buffer = createWebGLBuffers(json, 0);
        expect(buffer.triangleVertices[0]).toBeInstanceOf(Float32Array);
        expect(buffer.triangleNormals[0]).toBeInstanceOf(Float32Array);
        expect(buffer.triangleColours[0]).toBeInstanceOf(Float32Array);
        expect(buffer.triangleIndexs[0]).toBeInstanceOf(Uint32Array);
        expect(Array.from(buffer.triangleVertices[0])).toEqual(Array.from(json.vert_tri[0][0]));
        expect(Array.from(buffer.triangleIndexs[0])).toEqual([0, 1, 2, 1, 3, 2]);
        // A copy: recolouring the buffer must not reach back into the jsondata, which the
        // difference-map path splits into two buffers.
        expect(buffer.triangleColours[0]).not.toBe(json.col_tri[0][0]);
        buffer.triangleColours[0][0] = 0.25;
        expect(json.col_tri[0][0][0]).toBe(1);
    });

    it("converts plain arrays, including numeric strings as parseFloat did", () => {
        const buffer = createWebGLBuffers({
            prim_types: [["TRIANGLES"]],
            vert_tri: [[["0", "1.5", "2", 3, 4, 5, 6, 7, 8]]],
            norm_tri: [[[0, 0, 1, 0, 0, 1, 0, 0, 1]]],
            col_tri: [[[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]]],
            idx_tri: [[["0", 1, 2]]],
        }, 0);
        expect(buffer.triangleVertices[0]).toBeInstanceOf(Float32Array);
        expect(Array.from(buffer.triangleVertices[0]).slice(0, 3)).toEqual([0, 1.5, 2]);
        expect(Array.from(buffer.triangleIndexs[0])).toEqual([0, 1, 2]);
    });

    it("leaves placeholders carrying the counts the draw code reads", () => {
        const buffer = createWebGLBuffers(meshJson(), 0);
        expect(isPendingGLBuffer(buffer.triangleVertexPositionBuffer[0])).toBe(true);
        expect(buffer.triangleVertexPositionBuffer[0].numItems).toBe(4);
        expect(buffer.triangleVertexNormalBuffer[0].numItems).toBe(4);
        expect(buffer.triangleColourBuffer[0].numItems).toBe(4);
        // The index count, not a vertex count.
        expect(buffer.triangleVertexIndexBuffer[0].numItems).toBe(6);
        expect(buffer.isDirty).toBe(true);
    });

    it("still marks a buffer transparent from its first vertex's alpha", () => {
        const json = meshJson();
        expect(createWebGLBuffers(json, 0).transparent).toBe(false);
        json.col_tri[0][0][3] = 0.5;
        expect(createWebGLBuffers(json, 0).transparent).toBe(true);
    });

    it("reads each instance array and supplementary entry once", () => {
        // These blocks used to appear twice in createWebGLBuffers, so every instanced sub-buffer
        // was copied twice and given a second, never-used, set of GL buffers.
        const buffer = createWebGLBuffers({
            prim_types: [["PERFECT_SPHERES"]],
            vert_tri: [[new Float32Array([0, 0, 0])]],
            norm_tri: [[new Float32Array([0, 0, 1])]],
            col_tri: [[new Float32Array([1, 1, 1, 1])]],
            idx_tri: [[new Uint32Array([0])]],
            instance_origins: [[new Float32Array([0, 0, 0, 5, 5, 5])]],
            instance_sizes: [[new Float32Array([1, 1, 1, 2, 2, 2])]],
            instance_orientations: [[new Float32Array(32)]],
            radii: [[[1.5]]],
            sizes: [[[0.3]]],
        }, 0);
        expect(buffer.triangleInstanceOriginBuffer).toHaveLength(1);
        expect(buffer.triangleInstanceSizeBuffer).toHaveLength(1);
        expect(buffer.triangleInstanceOrientationBuffer).toHaveLength(1);
        expect(buffer.triangleInstanceOriginBuffer[0].numItems).toBe(2);
        expect(buffer.triangleInstanceOrientationBuffer[0].numItems).toBe(2);
        expect(buffer.supplementary.radii).toHaveLength(1);
        expect(buffer.primitiveSizes).toHaveLength(1);
    });

    it("holds influence data back until there is a context to make textures in", () => {
        const buffer = createWebGLBuffers({
            ...meshJson(),
            pick_info: {
                pick_points: [[0, 0, 0]],
                influence_weights: new Float32Array([1, 0.5]),
                influence_point_indexes: new Uint32Array([0, 0]),
                influence_index_offsets: new Uint32Array([0, 1, 2, 2, 2]),
            },
        }, 0);
        expect(buffer.pick_info.pending_influence).toBeDefined();
        expect(buffer.pick_info.influence_weights_texture).toBeUndefined();
        expect(buffer.pick_info.pick_points).toEqual([[0, 0, 0]]);
        expect(hasPendingGLResources(buffer)).toBe(true);

        const gl = makeGl();
        realiseGLResources(gl, buffer);
        expect(buffer.pick_info.pending_influence).toBeUndefined();
        expect(buffer.pick_info.influence_weights_texture).toBeDefined();
        expect(buffer.pick_info.influence_point_indexes_texture).toBeDefined();
        expect(buffer.pick_info.influence_index_offsets_texture).toBeDefined();
        expect(gl.createTexture).toHaveBeenCalledTimes(3);
    });

    it("produces display buffers from appendOtherData with no WebGL context", () => {
        const buffers = appendOtherData(meshJson(), makeStore(null) as never, true);
        expect(buffers).toHaveLength(1);
        expect(buffers[0].triangleVertices[0]).toBeInstanceOf(Float32Array);
        expect(hasPendingGLResources(buffers[0])).toBe(true);
    });
});

describe("realising GL resources", () => {
    it("replaces every placeholder, keeping the counts, and only once", () => {
        const buffer = createWebGLBuffers(meshJson(), 0);
        const gl = makeGl();
        const slots = GL_SLOT_ARRAYS.reduce((n, name) => n + buffer[name].length, 0);
        expect(realiseGLResources(gl, buffer)).toBe(slots);
        expect(isPendingGLBuffer(buffer.triangleVertexPositionBuffer[0])).toBe(false);
        expect(buffer.triangleVertexPositionBuffer[0].numItems).toBe(4);
        expect(buffer.triangleVertexIndexBuffer[0].numItems).toBe(6);
        expect(hasPendingGLResources(buffer)).toBe(false);
        expect(realiseGLResources(gl, buffer)).toBe(0);
        expect(gl.createBuffer).toHaveBeenCalledTimes(slots);
    });

    it("keeps a placeholder when the context cannot make a buffer", () => {
        const buffer = { ...Object.fromEntries(GL_SLOT_ARRAYS.map(name => [name, []])) } as never;
        (buffer as { triangleVertexPositionBuffer: unknown[] }).triangleVertexPositionBuffer.push(pendingGLBuffer(3));
        const lost = { createBuffer: () => null };
        expect(realiseGLResources(lost, buffer)).toBe(0);
        expect(hasPendingGLResources(buffer)).toBe(true);
    });
});

describe("buildBuffers", () => {
    it("does nothing without a context, and leaves the buffers to be built later", () => {
        const buffer = createWebGLBuffers(meshJson(), 0);
        expect(() => buildBuffers([buffer], makeStore(null) as never)).not.toThrow();
        expect(buffer.isDirty).toBe(true);
        expect(hasPendingGLResources(buffer)).toBe(true);
    });

    it("binds only real buffers, and uploads the typed arrays without repacking", () => {
        const buffer = createWebGLBuffers(meshJson(), 0);
        const gl = makeGl();
        buildBuffers([buffer], makeStore(gl) as never);

        expect(buffer.isDirty).toBe(false);
        expect(hasPendingGLResources(buffer)).toBe(false);
        for (const [, bound] of gl.bindBuffer.mock.calls) {
            expect(isPendingGLBuffer(bound)).toBe(false);
        }
        const uploaded = gl.bufferData.mock.calls.map(call => call[1]);
        expect(uploaded).toContain(buffer.triangleVertices[0]);
        expect(uploaded).toContain(buffer.triangleIndexs[0]);
    });

    it("realises slots a branch does not upload to", () => {
        // PERFECT_SPHERES uploads instance data only, but the draw code binds its vertex buffers.
        const buffer = createWebGLBuffers({
            prim_types: [["PERFECT_SPHERES"]],
            vert_tri: [[new Float32Array([0, 0, 0])]],
            norm_tri: [[new Float32Array([0, 0, 1])]],
            col_tri: [[new Float32Array([1, 1, 1, 1])]],
            idx_tri: [[new Uint32Array([0])]],
            instance_origins: [[new Float32Array([0, 0, 0])]],
            instance_sizes: [[new Float32Array([1, 1, 1])]],
        }, 0);
        buildBuffers([buffer], makeStore(makeGl()) as never);
        expect(hasPendingGLResources(buffer)).toBe(false);
    });

    it("draws the same thick lines from typed arrays as from plain ones", () => {
        const uploads = (typed: boolean) => {
            const gl = makeGl();
            const buffer = createWebGLBuffers(linesJson(typed), 0);
            buildBuffers([buffer], makeStore(gl) as never);
            return gl.bufferData.mock.calls.map(call => Array.from(call[1] as ArrayLike<number>));
        };
        const fromTyped = uploads(true);
        expect(fromTyped.length).toBeGreaterThan(0);
        expect(fromTyped).toEqual(uploads(false));
    });
});
