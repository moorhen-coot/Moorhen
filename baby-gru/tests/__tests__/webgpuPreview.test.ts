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
    FRAME_FLOATS, MeshChunk, PreviewCameraSource, describeSkipped, effectSettings, frameUniforms, planMeshChunks, planPreview, previewCameraFrame,
    hoverSphereRadius, interactiveGlow, interactiveModel, symmetryCopyGrey,
} from "../../src/WebGPUComponents/previewScene";
import { MAX_GBUFFER_SIDE, effectMargin, gbufferScale, ssaoKernel, stepInTexels } from "../../src/WebGPUComponents/effectPasses";
import { SHADOW_BIAS, casterBounds, shadowCamera, shadowFrameUniforms } from "../../src/WebGPUComponents/shadowMap";
import { transparentLayers } from "../../src/WebGPUComponents/depthPeel";

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

/** Perfect spheres as a ball-and-stick buffer arrives: origin, size (x3) and colour per sphere. */
const spheres = (over: Record<string, unknown> = {}) => createWebGLBuffers({
    prim_types: [["PERFECT_SPHERES"]],
    vert_tri: [[new Float32Array([0, 0, 0, 3, 0, 0])]],
    norm_tri: [[new Float32Array([0, 0, 0, 3, 0, 0])]],
    col_tri: [[new Float32Array([1, 0, 0, 1, 0, 0, 1, 1])]],
    idx_tri: [[new Uint32Array([0, 1])]],
    instance_origins: [[new Float32Array([0, 0, 0, 3, 0, 0])]],
    instance_sizes: [[new Float32Array([0.5, 0.5, 0.5, 0.7, 0.7, 0.7])]],
    instance_orientations: [[new Float32Array(32)]],
    instance_use_colors: [[true]],
    ...over,
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

    it("draws nothing for an instanced mesh with no instances, and does not call it skipped", () => {
        // As getVectorsBuffers makes them when there are no vectors: the cylinder template, no colours.
        const empty = createWebGLBuffers({
            prim_types: [["TRIANGLES"]],
            vert_tri: [[new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])]],
            norm_tri: [[new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1])]],
            col_tri: [[new Float32Array([])]],
            idx_tri: [[new Uint32Array([0, 1, 2])]],
            instance_origins: [[new Float32Array([])]],
            instance_sizes: [[new Float32Array([])]],
            instance_orientations: [[new Float32Array([])]],
        }, 0);
        const plan = planPreview([empty]);
        expect(plan.draws).toHaveLength(0);
        expect(plan.skipped).toEqual({});
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

    it("draws perfect spheres, one per instance, coloured per sphere", () => {
        const buffer = spheres();
        buffer.setCustomColour([0, 1, 0, 1]);
        const plan = planPreview([buffer]);
        expect(plan.draws).toHaveLength(1);
        expect(plan.draws[0]).toMatchObject({ primitive: "spheres", instanced: true, colourSource: "instance", instanceCount: 2 });
        expect(plan.spheres).toBe(2);
        expect(plan.triangles).toBe(0);
        expect(plan.skipped).toEqual({});
    });

    it("reports spheres it cannot draw, and why", () => {
        const noColours = spheres({ col_tri: [[new Float32Array([1, 0, 0, 1])]] });
        const noSizes = spheres({ instance_sizes: [[new Float32Array([0.5])]] });
        const plan = planPreview([noColours, noSizes]);
        expect(plan.draws).toHaveLength(0);
        expect(plan.skipped).toEqual({
            "PERFECT_SPHERES without a colour per sphere": 1,
            "PERFECT_SPHERES without a size per sphere": 1,
        });
    });

    it("draws the hover highlight, at the hover size once that is past the default", () => {
        const hover = spheres();
        hover.isHoverBuffer = true;
        expect(planPreview([hover]).draws).toHaveLength(1);
        const at = (hoverSize?: number) => hoverSphereRadius(camera({ store: { getState: () => ({ glRef: { hoverSize } }) } }));
        expect(at(undefined)).toBeNull();
        expect(at(0.27)).toBeNull();
        expect(at(0.5)).toBeCloseTo(0.9, 6);
        expect(hoverSphereRadius(camera())).toBeNull();
    });

    it("draws LINES between index pairs or vertex pairs, and lit NORMALLINES only with indices", () => {
        const indexed = triangle({ prim_types: [["LINES"]], idx_tri: [[new Uint32Array([0, 1, 1, 2])]] });
        indexed.supplementary = { useIndices: [true] };
        const paired = triangle({ prim_types: [["LINES"]] });
        paired.supplementary = { useIndices: [false] };
        const lit = triangle({ prim_types: [["NORMALLINES"]], idx_tri: [[new Uint32Array([0, 1, 1, 2, 2, 0])]] });
        lit.supplementary = { useIndices: [true] };
        const litWithout = triangle({ prim_types: [["NORMALLINES"]] });
        litWithout.supplementary = {};
        const plan = planPreview([indexed, paired, lit, litWithout]);
        expect(plan.draws.map(d => [d.primitive, d.indexCount, d.vertexCount])).toEqual([
            ["lines", 4, 3], ["lines", 0, 2], ["lit-lines", 6, 3],
        ]);
        expect(plan.segments).toBe(2 + 1 + 3);
        expect(plan.skipped).toEqual({ "NORMALLINES without indices": 1 });
    });

    it("draws what is being dragged, moving and glowing as drawCore does, except lit lines", () => {
        const drag = [0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 2, 0, 0, 1];
        const mesh = triangle();
        mesh.transformMatrixInteractive = drag;
        const balls = spheres();
        balls.transformMatrixInteractive = drag;
        const lines = triangle({ prim_types: [["LINES"]] });
        lines.supplementary = { useIndices: [false] };
        lines.transformMatrixInteractive = drag;
        const lit = triangle({ prim_types: [["NORMALLINES"]], idx_tri: [[new Uint32Array([0, 1])]] });
        lit.supplementary = { useIndices: [true] };
        lit.transformMatrixInteractive = drag;
        const plan = planPreview([mesh, balls, lines, lit]);
        expect(plan.draws.map(d => [d.primitive, d.moving, d.glow])).toEqual([
            ["triangles", true, true], ["spheres", true, true], ["lines", true, false], ["lit-lines", false, false],
        ]);
        expect(plan.skipped).toEqual({});
    });

    it("turns a dragged buffer about its centre: transformOriginInteractive less the view origin", () => {
        // A quarter turn about z and a shift of 2 in x, about the point (1, 1, 0); view origin (-3, 0, 0).
        const model = interactiveModel([0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 2, 0, 0, 1], [-2, 1, 0], [-3, 0, 0]);
        const apply = (p: number[]) => [0, 1, 2].map(r => model[r] * p[0] + model[4 + r] * p[1] + model[8 + r] * p[2] + model[12 + r]);
        // The centre itself only shifts; a point 1 to its right goes to 1 above it, then shifts.
        expect(apply([1, 1, 0]).map(x => Math.round(x * 1e6) / 1e6)).toEqual([3, 1, 0]);
        expect(apply([2, 1, 0]).map(x => Math.round(x * 1e6) / 1e6)).toEqual([3, 2, 0]);
    });

    it("pulses a dragged buffer's ambient light once a second", () => {
        expect(interactiveGlow(5000)).toBeCloseTo(0, 6);
        expect(interactiveGlow(5500)).toBeCloseTo(1, 6);
        expect(interactiveGlow(5250)).toBeCloseTo(Math.SQRT1_2, 6);
        expect(interactiveGlow(4750)).toBeCloseTo(Math.SQRT1_2, 6);
    });

    it("reports what it cannot draw yet", () => {
        const lines = triangle({ prim_types: [["LINE_STRIP"]] });
        const moved = triangle();
        moved.setTransformMatrix([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
        const badColours = triangle({ col_tri: [[new Float32Array([1, 0, 0, 1])]] });
        const plan = planPreview([lines, moved, badColours]);
        expect(plan.draws).toHaveLength(0);
        expect(plan.skipped).toEqual({
            LINE_STRIP: 1,
            "TRIANGLES with a transform matrix": 1,
            "TRIANGLES without one colour per vertex": 1,
        });
        expect(plan.skippedSubBuffers.map(s => s.why)).toEqual(["LINE_STRIP", "TRIANGLES with a transform matrix", "TRIANGLES without one colour per vertex"]);
        expect(describeSkipped({ LINES: 1, PERFECT_SPHERES: 3 })).toBe("PERFECT_SPHERES ×3, LINES ×1");
    });

    it("draws symmetry copies besides the original, grey unless the buffer says otherwise", () => {
        const shift = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 10, 0, 0, 1];
        const buffer = triangle();
        buffer.symmetryMatrices = [shift, shift] as never;
        const plan = planPreview([buffer]);
        expect(plan.draws).toHaveLength(1);
        expect(plan.draws[0].copies).toHaveLength(2);
        expect(plan.draws[0].greyCopies).toBe(true);
        expect(plan.triangles).toBe(3);
        expect(plan.skipped).toEqual({});

        const biomolecule = spheres();
        biomolecule.symmetryMatrices = [shift] as never;
        biomolecule.changeColourWithSymmetry = false;
        const [draw] = planPreview([biomolecule]).draws;
        expect(draw).toMatchObject({ primitive: "spheres", greyCopies: false });
        expect(planPreview([biomolecule]).spheres).toBe(4);
    });

    it("grey copies are darker on a light background, as drawBuffer has them", () => {
        expect(symmetryCopyGrey([1, 1, 1, 1])).toEqual([0.3, 0.3, 0.3, 1]);
        expect(symmetryCopyGrey([0, 0, 0, 1])).toEqual([0.5, 0.5, 0.5, 1]);
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

    it("gives the screen's right and up in model space, for sphere impostors, and the clip planes", () => {
        const still = frameUniforms(camera(), 100, 100);
        expect(Array.from(still.slice(60, 63))).toEqual([1, 0, 0]);
        expect(Array.from(still.slice(64, 67))).toEqual([0, 1, 0]);
        expect(Array.from(still.slice(68, 76))).toEqual([0, 0, -1, -230, 0, 0, 1, 270]);
        // A half turn about y: the viewer's right is the model's -x; up stays.
        const turned = frameUniforms(camera({ myQuat: [0, 1, 0, 0] }), 100, 100);
        expect(turned[60]).toBeCloseTo(-1, 6);
        expect(turned[65]).toBeCloseTo(1, 6);
    });

    it("leaves the effects off, read across the whole target, until the renderer says otherwise", () => {
        const data = frameUniforms(camera(), 200, 100);
        expect(Array.from(data.slice(76, 80))).toEqual([0, 0, 0, 0]);
        expect(Array.from(data.slice(80, 84))).toEqual(Array.from(new Float32Array([0, 0, 1 / 200, 1 / 100])));
        // No shadow: an identity shadow matrix and no texel size, bias or softness.
        expect(Array.from(data.slice(84, 100))).toEqual([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
        expect(Array.from(data.slice(100, 104))).toEqual([0, 0, 0, 0]);
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

describe("effectSettings", () => {
    it("is nothing when the scene has no effects on", () => {
        expect(effectSettings(camera())).toEqual({ ssao: null, shadow: null, edges: null });
    });

    it("takes occlusion's radius and strength (ssaoBias) as WebGL does", () => {
        expect(effectSettings(camera({ doSSAO: true, ssaoRadius: 3, ssaoBias: 1.5 })).ssao).toEqual({ radius: 3, strength: 1.5 });
    });

    it("turns WebGL's g-buffer texel steps into pixels, keeping 0 as off", () => {
        const edges = effectSettings(camera({ doEdgeDetect: true, depthThreshold: 1.3, normalThreshold: 0.5, scaleDepth: 2, scaleNormal: 0 })).edges;
        expect(edges).toEqual({ depthThreshold: 1.3, normalThreshold: 0.5, depthStep: 0.5, normalStep: 0 });
        expect(effectSettings(camera({ doEdgeDetect: true, scaleDepth: 6, scaleNormal: 1 })).edges).toMatchObject({ depthStep: 1.5, normalStep: 0.25 });
    });
});

describe("the g-buffer's scale", () => {
    const edges = { depthThreshold: 1.3, normalThreshold: 0.5, depthStep: 0.5, normalStep: 0 };

    it("is twice the image for edges, as fine as WebGL's g-buffer over an ordinary window, and 1 for occlusion alone", () => {
        expect(gbufferScale({ ssao: null, shadow: null, edges }, 1280, 647)).toBe(2);
        expect(gbufferScale({ ssao: { radius: 2, strength: 1 }, shadow: null, edges: null }, 1280, 647)).toBe(1);
    });

    it("drops to keep the g-buffer within its largest side, never below 1", () => {
        expect(gbufferScale({ ssao: null, shadow: null, edges }, 3840, 2160) * 3840).toBeCloseTo(MAX_GBUFFER_SIDE, 6);
        expect(gbufferScale({ ssao: null, shadow: null, edges }, 9000, 100)).toBe(1);
        // A snapshot tile with edges and the largest margin still gets the whole 2.
        expect(gbufferScale({ ssao: null, shadow: null, edges }, 1024 + 2 * 512, 1024 + 2 * 512)).toBe(2);
    });

    it("takes the steps to whole texels, at least one, 0 staying off", () => {
        expect(stepInTexels(0.5, 2)).toBe(1);
        expect(stepInTexels(1.5, 2)).toBe(3);
        expect(stepInTexels(0.25, 2)).toBe(1);
        expect(stepInTexels(0.5, 1.07)).toBe(1);
        expect(stepInTexels(0, 2)).toBe(0);
    });
});

describe("the effects' margin and kernel", () => {
    it("reaches as far as occlusion can, on screen, and no margin without effects", () => {
        expect(effectMargin({ ssao: null, shadow: null, edges: null }, 10)).toBe(0);
        const withRadius = effectMargin({ ssao: { radius: 2, strength: 1 }, shadow: null, edges: null }, 10);
        expect(withRadius).toBeGreaterThanOrEqual(2 * 10);
        expect(effectMargin({ ssao: { radius: 2, strength: 1 }, shadow: null, edges: null }, 20)).toBeGreaterThan(withRadius);
        expect(effectMargin({ ssao: { radius: 1000, strength: 1 }, shadow: null, edges: null }, 100)).toBe(512);
    });

    it("samples the hemisphere above the surface, out to the radius, the same every time", () => {
        const { samples, noise } = ssaoKernel();
        expect(samples).toHaveLength(32 * 4);
        for (let i = 0; i < 32; i++) {
            const [x, y, z] = samples.slice(4 * i, 4 * i + 3);
            expect(z).toBeGreaterThanOrEqual(0);
            expect(Math.hypot(x, y, z)).toBeLessThanOrEqual(1 + 1e-6);
        }
        // Stratified: the last is longer than the first.
        expect(Math.hypot(...samples.slice(124, 127))).toBeGreaterThan(Math.hypot(...samples.slice(0, 3)));
        expect(noise).toHaveLength(16 * 4);
        expect(Array.from(ssaoKernel().samples)).toEqual(Array.from(samples));
    });
});

describe("the shadow map's camera", () => {
    const turned = (): PreviewCameraSource => {
        const q = [0.3, -0.5, 0.2, 0];
        q[3] = Math.sqrt(1 - q[0] * q[0] - q[1] * q[1] - q[2] * q[2]);
        return camera({ myQuat: q, origin: [-3, 4, 5], zoom: 0.5, light_positions: [25, 25, 50, 1] });
    };

    it("looks from the light the scene is lit by, however the view is turned", () => {
        const light = shadowCamera(turned(), null, 1.5);
        const lit = frameUniforms(turned(), 300, 200).slice(32, 35);
        light.eyeDir.forEach((c, i) => expect(c).toBeCloseTo(lit[i], 5));
    });

    it("takes the view centre to the middle of the map, at a depth inside it", () => {
        const source = turned();
        const light = shadowCamera(source, null, 1.5);
        const centre = [-source.origin[0], -source.origin[1], -source.origin[2], 1];
        const m = light.textureMatrix;
        const p = [0, 1, 2, 3].map(r => m[r] * centre[0] + m[4 + r] * centre[1] + m[8 + r] * centre[2] + m[12 + r]);
        expect(p[0] / p[3]).toBeCloseTo(0.5, 5);
        expect(p[1] / p[3]).toBeCloseTo(0.5, 5);
        expect(p[2] / p[3]).toBeGreaterThan(0);
        expect(p[2] / p[3]).toBeLessThan(1);
    });

    it("fits the molecules when they are smaller than the view", () => {
        const wide = shadowCamera(camera({ zoom: 4 }), null, 1);
        const fitted = shadowCamera(camera({ zoom: 4 }), { min: [-1, -2, -3], max: [1, 2, 3] }, 1);
        // A narrower box is a larger scale in the projection.
        expect(Math.abs(fitted.projection[0])).toBeGreaterThan(Math.abs(wide.projection[0]));
    });

    it("clips at the camera's front clip distance along the light, as WebGL's shadow pass does", () => {
        // In the map's 0..1 depth, a model-space point.
        const depthAt = (m: Float32Array, p: number[]) =>
            (m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]) / (m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15]);
        // fogClipOffset 250 and gl_clipPlane0[3] -230: the front plane 20 A in front of the centre.
        const source = camera();
        const light = shadowCamera(source, null, 1);
        const centre = [-source.origin[0], -source.origin[1], -source.origin[2]];
        const at = (d: number) => centre.map((c, i) => c + d * light.eyeDir[i]);
        expect(depthAt(light.textureMatrix, at(20))).toBeCloseTo(0, 5);
        expect(depthAt(light.textureMatrix, at(19))).toBeGreaterThan(0);
        // The bias grows as the range shrinks, to stay the distance in angstrom that WebGL's
        // 0.005 is of its unclipped range, which runs from 1 A in front of the light's eye.
        expect(light.bias).toBeGreaterThan(SHADOW_BIAS);
        const v = light.view;
        const eyeDistance = -(v[2] * centre[0] + v[6] * centre[1] + v[10] * centre[2] + v[14]);
        const range = 1 / Math.abs(depthAt(light.textureMatrix, at(1)) - depthAt(light.textureMatrix, at(0)));
        const far = eyeDistance - 20 + range;
        expect(light.bias * range).toBeCloseTo(SHADOW_BIAS * (far - 1), 5);
    });

    it("draws the shadow pass from the light, clipping nothing", () => {
        const light = shadowCamera(turned(), null, 1);
        const u = shadowFrameUniforms(light);
        expect(Array.from(u.slice(0, 16))).toEqual(Array.from(light.projection));
        expect(Array.from(u.slice(16, 32))).toEqual(Array.from(light.view));
        expect(Array.from(u.slice(68, 76))).toEqual([0, 0, 0, 1, 0, 0, 0, 1]);
    });
});

describe("casterBounds", () => {
    const withAtoms = (atoms: { x: number; y: number; z: number }[], visible = true) =>
        ({ visible, atoms } as unknown as DisplayBuffer);

    it("boxes the atoms of what is visible, and nothing without atoms", () => {
        const found = casterBounds([withAtoms([{ x: 1, y: 2, z: 3 }, { x: -1, y: 5, z: 0 }]), withAtoms([{ x: 100, y: 0, z: 0 }], false)], null);
        expect(found.bounds).toEqual({ min: [-1, 2, 0], max: [1, 5, 3] });
        expect(casterBounds([withAtoms([])], null).bounds).toBeNull();
    });

    it("keeps its answer while the same atom arrays are drawn", () => {
        const atoms = [{ x: 1, y: 2, z: 3 }];
        const first = casterBounds([withAtoms(atoms)], null);
        expect(casterBounds([withAtoms(atoms)], first)).toBe(first);
        expect(casterBounds([withAtoms([...atoms])], first)).not.toBe(first);
    });
});

describe("transparentLayers", () => {
    const withLayers = (depthPeelLayers?: number) => ({ store: { getState: () => ({ sceneSettings: { depthPeelLayers } }) } });

    it("peels depthPeelLayers less the opaque layer, as WebGL counts them, 3 by default", () => {
        expect(transparentLayers({}, true)).toBe(3);
        expect(transparentLayers(withLayers(4), true)).toBe(3);
        expect(transparentLayers(withLayers(6), true)).toBe(5);
        // Never none while something is transparent.
        expect(transparentLayers(withLayers(1), true)).toBe(1);
    });

    it("peels nothing without transparency, or with order-independent transparency off", () => {
        expect(transparentLayers(withLayers(4), false)).toBe(0);
        expect(transparentLayers({ ...withLayers(4), doOrderIndependentTransparency: false }, true)).toBe(0);
        expect(transparentLayers({ doOrderIndependentTransparency: true }, true)).toBe(3);
    });
});
