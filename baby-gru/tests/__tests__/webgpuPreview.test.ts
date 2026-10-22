/**
 * The GPU-free half of the WebGPU preview: what it chooses to draw, and the uniforms it packs.
 *
 * The rendering itself needs a WebGPU device and is checked by eye in the browser. What can go
 * wrong quietly is here: a mesh drawn with the wrong colour source (the rules for that are spread
 * across drawTriangles and drawBuffer), something skipped without being reported, or the light
 * coming from a different direction than in the WebGL view.
 */
import { describe, expect, it } from "@jest/globals";
import { DisplayBuffer } from "../../src/WebGLgComponents/displayBuffer";
import { createWebGLBuffers } from "../../src/WebGLgComponents/createWebGLBuffers";
import { viewProjection } from "../../src/WebGLgComponents/mgWebGLParts/projection";
import {
    FRAME_FLOATS, MeshChunk, PreviewCameraSource, describeSkipped, frameUniforms, planMeshChunks, planPreview, previewCameraFrame,
} from "../../src/WebGPUComponents/previewScene";

const triangle = (over: Record<string, unknown> = {}) => createWebGLBuffers({
    prim_types: [["TRIANGLES"]],
    vert_tri: [[new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])]],
    norm_tri: [[new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1])]],
    col_tri: [[new Float32Array([1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1])]],
    idx_tri: [[new Uint32Array([0, 1, 2])]],
    ...over,
}, 0);

/** Two cube-ish instances sharing one triangle, as an instanced shape buffer arrives. */
const instanced = (instanceColours: boolean) => createWebGLBuffers({
    prim_types: [["TRIANGLES"]],
    vert_tri: [[new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])]],
    norm_tri: [[new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1])]],
    col_tri: [[new Float32Array(instanceColours ? [1, 0, 0, 1, 0, 1, 0, 1] : [1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1])]],
    idx_tri: [[new Uint32Array([0, 1, 2])]],
    instance_origins: [[new Float32Array([0, 0, 0, 5, 0, 0])]],
    instance_sizes: [[new Float32Array([1, 1, 1, 1, 1, 1])]],
    instance_orientations: [[new Float32Array(32)]],
    instance_use_colors: instanceColours ? [[true]] : undefined,
}, 0);

describe("planPreview", () => {
    it("draws a plain mesh with its vertex colours", () => {
        const plan = planPreview([triangle()]);
        expect(plan.draws).toHaveLength(1);
        expect(plan.draws[0]).toMatchObject({ instanced: false, colourSource: "vertex", indexCount: 3, vertexCount: 3 });
        expect(plan.triangles).toBe(1);
        expect(plan.skipped).toEqual({});
    });

    it("uses a custom colour over vertex colours", () => {
        const buffer = triangle();
        buffer.setCustomColour([0, 0, 1, 1]);
        expect(planPreview([buffer]).draws[0].colourSource).toBe("uniform");
    });

    it("lets per-instance colours win over a custom colour, as drawBuffer does", () => {
        const buffer = instanced(true);
        buffer.setCustomColour([0, 0, 1, 1]);
        const [draw] = planPreview([buffer]).draws;
        expect(draw).toMatchObject({ instanced: true, colourSource: "instance", instanceCount: 2 });
    });

    it("counts instances in the triangle total", () => {
        const plan = planPreview([instanced(false)]);
        expect(plan.draws[0].colourSource).toBe("vertex");
        expect(plan.triangles).toBe(2);
    });

    it("routes transparent and faded buffers to the blended pass", () => {
        const seeThrough = triangle({ col_tri: [[new Float32Array([1, 0, 0, 0.5, 1, 0, 0, 0.5, 1, 0, 0, 0.5])]] });
        const faded = triangle();
        faded.setAlphaMultiplier(0.5);
        const solid = triangle();
        const plan = planPreview([seeThrough, faded, solid]);
        expect(plan.draws.map(d => d.transparent)).toEqual([true, true, false]);
    });

    it("leaves out what is hidden or faded to nothing, without calling it skipped", () => {
        const hidden = triangle();
        hidden.visible = false;
        const gone = triangle();
        gone.setAlphaMultiplier(0);
        const plan = planPreview([hidden, gone]);
        expect(plan.draws).toHaveLength(0);
        expect(plan.skipped).toEqual({});
    });

    it("reports what it cannot draw yet", () => {
        const spheres = triangle({ prim_types: [["PERFECT_SPHERES"]] });
        const lines = triangle({ prim_types: [["LINES"]] });
        const moved = triangle();
        moved.setTransformMatrix([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
        const badColours = triangle({ col_tri: [[new Float32Array([1, 0, 0, 1])]] });
        const plan = planPreview([spheres, lines, moved, badColours]);
        expect(plan.draws).toHaveLength(0);
        expect(plan.skipped).toEqual({
            PERFECT_SPHERES: 1,
            LINES: 1,
            "TRIANGLES with a transform matrix": 1,
            "TRIANGLES without one colour per vertex": 1,
        });
        expect(describeSkipped({ LINES: 1, PERFECT_SPHERES: 3 })).toBe("PERFECT_SPHERES ×3, LINES ×1");
    });

    it("draws the original of a buffer with symmetry copies, and says the copies are missing", () => {
        const buffer = triangle();
        buffer.symmetryMatrices = [[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]] as never;
        const plan = planPreview([buffer]);
        expect(plan.draws).toHaveLength(1);
        expect(plan.skipped["symmetry copies (original drawn)"]).toBe(1);
    });
});

const camera = (over: Partial<PreviewCameraSource> = {}): PreviewCameraSource => ({
    myQuat: [0, 0, 0, 1],
    origin: [-1, -2, -3],
    zoom: 1,
    fogClipOffset: 250,
    gl_clipPlane0: [0, 0, -1, -230],
    gl_clipPlane1: [0, 0, 1, 270],
    gl_fog_start: 250,
    gl_fog_end: 290,
    doPerspectiveProjection: false,
    light_positions: [10, 10, 60, 1],
    light_colours_ambient: [0.2, 0.2, 0.2, 1],
    light_colours_diffuse: [0.6, 0.6, 0.6, 1],
    light_colours_specular: [0.4, 0.4, 0.4, 1],
    specularPower: 64,
    background_colour: [0.1, 0.2, 0.3, 1],
    ...over,
});

describe("frameUniforms", () => {
    it("carries the WebGPU-depth camera for the preview's own shape", () => {
        const data = frameUniforms(camera(), 800, 400);
        expect(data).toHaveLength(FRAME_FLOATS);
        const expected = viewProjection(previewCameraFrame(camera(), 800, 400), "zeroToOne");
        expect(Array.from(data.slice(0, 16))).toEqual(Array.from(new Float32Array(expected.projection)));
        expect(Array.from(data.slice(16, 32))).toEqual(Array.from(new Float32Array(expected.view)));
        expect(previewCameraFrame(camera(), 800, 400).aspect).toBe(2);
    });

    it("puts the light and eye in model space, as setLightUniforms and screenZ do", () => {
        // Unrotated, model space is eye space: the light is the light position, normalised.
        const still = frameUniforms(camera(), 100, 100);
        const length = Math.hypot(10, 10, 60);
        expect(still[32]).toBeCloseTo(10 / length, 6);
        expect(still[34]).toBeCloseTo(60 / length, 6);
        expect(Array.from(still.slice(36, 39))).toEqual([0, 0, 1]);

        // A half turn about y takes the viewer's +z to the model's -z.
        const turned = frameUniforms(camera({ myQuat: [0, 1, 0, 0] }), 100, 100);
        expect(turned[38]).toBeCloseTo(-1, 6);
        expect(turned[34]).toBeCloseTo(-60 / length, 6);
    });

    it("packs colours, fog and specular power", () => {
        const data = frameUniforms(camera(), 100, 100);
        expect(Array.from(data.slice(52, 56))).toEqual(Array.from(new Float32Array([0.1, 0.2, 0.3, 1])));
        expect(Array.from(data.slice(56, 59))).toEqual([250, 290, 64]);
    });

    it("never hands the shader a zero-width fog range", () => {
        const data = frameUniforms(camera({ gl_fog_start: 290, gl_fog_end: 290 }), 100, 100);
        expect(data[57]).toBeGreaterThan(data[56]);
    });

    it("leaves the caller's quaternion alone", () => {
        const q = [0, 1, 0, 0];
        frameUniforms(camera({ myQuat: q }), 100, 100);
        expect(q).toEqual([0, 1, 0, 0]);
    });
});

describe("DisplayBuffer.dataVersion", () => {
    it("moves whenever the buffer is marked dirty, and not when it is cleaned", () => {
        const buffer = new DisplayBuffer();
        const start = buffer.dataVersion;
        buffer.isDirty = false;
        expect(buffer.dataVersion).toBe(start);
        expect(buffer.isDirty).toBe(false);
        buffer.isDirty = true;
        expect(buffer.dataVersion).toBe(start + 1);
        expect(buffer.isDirty).toBe(true);
    });
});

describe("planMeshChunks", () => {
    /** A strip of `n` quads, vertices numbered along it: neighbouring triangles, neighbouring vertices. */
    const strip = (n: number) => {
        const indices: number[] = [];
        for (let i = 0; i < n; i++) {
            const a = 2 * i;
            indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
        return { indices: Uint32Array.from(indices), vertexCount: 2 * n + 2 };
    };
    /** The triangles the chunks draw, as mesh vertex numbers, in order. */
    const drawn = (indices: Uint32Array, chunks: MeshChunk[]) => chunks.flatMap(chunk => {
        const own = chunk.remap ? Array.from(chunk.remap.indices) : Array.from(indices.subarray(chunk.firstIndex, chunk.firstIndex + chunk.indexCount));
        return own.map(i => chunk.remap ? chunk.remap.vertices[i] : i);
    });

    it("leaves a mesh within the limits whole", () => {
        const { indices, vertexCount } = strip(10);
        expect(planMeshChunks(indices, vertexCount, 1000, 1000)).toEqual([{ firstIndex: 0, indexCount: 60, firstVertex: 0, vertexCount: 22 }]);
    });

    it("splits by indices and vertices into windows, whole triangles each, nothing copied", () => {
        const { indices, vertexCount } = strip(100);
        for (const [maxIndices, maxVertices] of [[61, 10_000], [10_000, 25], [32, 9]]) {
            const chunks = planMeshChunks(indices, vertexCount, maxIndices, maxVertices);
            expect(chunks.length).toBeGreaterThan(1);
            for (const chunk of chunks) {
                expect(chunk.remap).toBeUndefined();
                expect(chunk.indexCount % 3).toBe(0);
                expect(chunk.indexCount).toBeLessThanOrEqual(maxIndices);
                expect(chunk.vertexCount).toBeLessThanOrEqual(maxVertices);
                const own = indices.subarray(chunk.firstIndex, chunk.firstIndex + chunk.indexCount);
                own.forEach(v => {
                    expect(v).toBeGreaterThanOrEqual(chunk.firstVertex);
                    expect(v).toBeLessThan(chunk.firstVertex + chunk.vertexCount);
                });
            }
            expect(drawn(indices, chunks)).toEqual(Array.from(indices));
        }
    });

    it("renumbers chunks whose vertices are too spread out for a window", () => {
        const { indices, vertexCount } = strip(100);
        // Number the vertices backwards in halves, so that neighbouring triangles are far apart.
        const scattered = indices.map(v => (v % 2 === 0 ? v / 2 : vertexCount - 1 - (v - 1) / 2));
        const chunks = planMeshChunks(scattered, vertexCount, 30, 12);
        expect(chunks.some(chunk => chunk.remap)).toBe(true);
        for (const chunk of chunks) {
            expect(chunk.indexCount).toBeLessThanOrEqual(30);
            expect(chunk.vertexCount).toBeLessThanOrEqual(12);
        }
        expect(drawn(scattered, chunks)).toEqual(Array.from(scattered));
    });
});
