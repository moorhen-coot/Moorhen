/**
 * Which instanced meshes are drawn per pixel (impostors.ts): unit spheres and unit cylinders, told
 * by their vertices and normals; and the planner choosing them only with the switch on, and only
 * where they qualify.
 */
import { afterEach, describe, expect, it } from "@jest/globals";
import {
    type ImpostorShape, TWO_PASS_OVERLAP, capBits, impostorOverlap, impostorSetting, impostorShape, twoPasses,
} from "../../src/WebGPUComponents/impostors";
import { planPreview } from "../../src/WebGPUComponents/previewScene";
import type { DisplayBuffer } from "../../src/WebGLgComponents/displayBuffer";

/** An octahedron on the unit sphere: six vertices, normals along them. */
const octahedron = () => {
    const v = [1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1];
    return { vertices: new Float32Array(v), normals: new Float32Array(v) };
};

/** A unit cylinder of n sides along z, 0 to 1, with caps if asked. */
const tube = (n = 8, caps = false) => {
    const v: number[] = [], nm: number[] = [];
    for (let j = 0; j < n; j++) {
        const a = (2 * Math.PI * j) / n;
        v.push(Math.cos(a), Math.sin(a), 0, Math.cos(a), Math.sin(a), 1);
        nm.push(Math.cos(a), Math.sin(a), 0, Math.cos(a), Math.sin(a), 0);
    }
    if (caps) { v.push(0, 0, 0, 0, 0, 1); nm.push(0, 0, -1, 0, 0, 1); }
    return { vertices: new Float32Array(v), normals: new Float32Array(nm) };
};

describe("impostorShape", () => {
    it("knows a unit sphere, normals out or in", () => {
        const { vertices, normals } = octahedron();
        expect(impostorShape(vertices, normals)).toEqual({ kind: "sphere" });
        const inward = octahedron();
        expect(impostorShape(inward.vertices, inward.normals.map(x => -x))).toEqual({ kind: "sphere" });
    });

    it("knows a unit cylinder, and which ends are capped", () => {
        const open = tube();
        expect(impostorShape(open.vertices, open.normals)).toEqual({ kind: "cylinder", end: 1, startCap: false, endCap: false });
        const capped = tube(8, true);
        const shape = impostorShape(capped.vertices, capped.normals);
        expect(shape).toEqual({ kind: "cylinder", end: 1, startCap: true, endCap: true });
        expect(capBits(shape!)).toBe(3);
    });

    it("knows Coot's cylinder, which runs to z = -1 (cylinder.cc turns its template round)", () => {
        const coot = tube(8, true);
        for (let i = 1; i < coot.vertices.length; i += 3) { coot.vertices[i] *= -1; coot.vertices[i + 1] *= -1; coot.normals[i] *= -1; coot.normals[i + 1] *= -1; }
        const shape = impostorShape(coot.vertices, coot.normals);
        expect(shape).toEqual({ kind: "cylinder", end: -1, startCap: true, endCap: true });
        expect(capBits(shape!)).toBe(7);
    });

    it("refuses anything else: off the sphere, normals across it, a fatter tube, too few vertices", () => {
        const off = octahedron();
        off.vertices[0] = 1.2;
        expect(impostorShape(off.vertices, off.normals)).toBeNull();
        const across = octahedron();
        across.normals.set([0, 1, 0], 0);
        expect(impostorShape(across.vertices, across.normals)).toBeNull();
        const fat = tube();
        fat.vertices[0] = 1.5;
        expect(impostorShape(fat.vertices, fat.normals)).toBeNull();
        expect(impostorShape(new Float32Array([0, 0, 1]), new Float32Array([0, 0, 1]))).toBeNull();
    });
});

describe("planPreview with impostors", () => {
    afterEach(() => { impostorSetting.enabled = false; });

    const buffer = (over: Record<string, unknown> = {}): DisplayBuffer => {
        const { vertices, normals } = octahedron();
        return {
            visible: true, alphaMultiplier: 1, bufferTypes: ["TRIANGLES"],
            triangleVertices: [vertices], triangleNormals: [normals],
            triangleIndexs: [new Uint32Array([0, 2, 4, 1, 3, 5])],
            triangleColours: [new Float32Array(8).fill(1)],
            triangleInstanceOrigins: [new Float32Array(6)], triangleInstanceSizes: [new Float32Array(6).fill(1)],
            triangleInstanceOrientations: [new Float32Array(32)],
            supplementary: { instance_use_colors: [true] }, symmetryMatrices: [],
            ...over,
        } as unknown as DisplayBuffer;
    };

    it("draws qualifying instanced spheres per pixel only with the switch on", () => {
        expect(planPreview([buffer()]).draws[0].impostor).toBeNull();
        impostorSetting.enabled = true;
        const plan = planPreview([buffer()]);
        expect(plan.draws[0].impostor).toEqual({ kind: "sphere" });
        expect(plan.impostors).toBe(2);
        expect(plan.triangles).toBe(24);
    });

    it("keeps meshes for anything transparent or coloured per vertex", () => {
        impostorSetting.enabled = true;
        expect(planPreview([buffer({ transparent: true })]).draws[0].impostor).toBeNull();
        expect(planPreview([buffer({ supplementary: { instance_use_colors: [false] }, triangleColours: [new Float32Array(24).fill(1)] })]).draws[0].impostor).toBeNull();
    });
});

describe("how deep the impostors overlap (impostorOverlap) and the passes they take", () => {
    afterEach(() => { impostorSetting.passes = "auto"; });
    // Orthographic, 10 A up and down from the centre in view, depth 0 to 1 over z from -50 to 50 (the
    // eye looking down -z); the view the identity.
    const ortho = [0.1, 0, 0, 0, 0, 0.1, 0, 0, 0, 0, -0.01, 0, 0, 0, 0.5, 1];
    const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    const turns = (n: number) => new Float32Array(Array.from({ length: n }, () => identity).flat());
    const draw = (shape: ImpostorShape, origins: number[], sizes: number[], over: Record<string, unknown> = {}) => ({
        buffer: { triangleInstanceOrigins: [origins], triangleInstanceSizes: [sizes], triangleInstanceOrientations: [turns(origins.length / 3)] },
        index: 0, instanceCount: origins.length / 3, copies: [], transparent: false, impostor: shape, ...over,
    });
    const sphere: ImpostorShape = { kind: "sphere" };

    it("is the spheres' discs' area over the picture's", () => {
        // 100 x 100 pixels over 20 A: 5 pixels an Angstrom, so a sphere of 2 A covers pi x 10^2 pixels.
        const overlap = impostorOverlap([draw(sphere, [0, 0, 0, 1, 1, 0], [2, 2, 2, 2, 2, 2])], ortho, identity, 100, 100);
        expect(overlap).toBeCloseTo(2 * Math.PI * 100 / 10000);
    });

    it("counts a cylinder's side as well as its round, and copies, and leaves out what is out of the slab or view", () => {
        const cylinder: ImpostorShape = { kind: "cylinder", end: 1, startCap: false, endCap: false };
        // Radius 1, 4 A long across the view (the template's z turned along x): 5 px radius, 20 px long.
        const across = draw(cylinder, [0, 0, 0], [1, 1, 4]);
        across.buffer.triangleInstanceOrientations = [new Float32Array([0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1])];
        expect(impostorOverlap([across], ortho, identity, 100, 100))
            .toBeCloseTo((Math.PI * 25 + 2 * 5 * 20) / 10000);
        const one = impostorOverlap([draw(sphere, [0, 0, 0], [1, 1, 1])], ortho, identity, 100, 100);
        expect(impostorOverlap([draw(sphere, [0, 0, 0], [1, 1, 1], { copies: [identity, identity] })], ortho, identity, 100, 100)).toBeCloseTo(3 * one);
        expect(impostorOverlap([draw(sphere, [0, 0, 80], [1, 1, 1])], ortho, identity, 100, 100)).toBe(0);
        expect(impostorOverlap([draw(sphere, [30, 0, 0], [1, 1, 1])], ortho, identity, 100, 100)).toBe(0);
        expect(impostorOverlap([draw(sphere, [0, 0, 0], [1, 1, 1], { transparent: true })], ortho, identity, 100, 100)).toBe(0);
    });

    it("takes two passes where they overlap deeply, if left to itself", () => {
        expect(twoPasses(TWO_PASS_OVERLAP)).toBe(true);
        expect(twoPasses(TWO_PASS_OVERLAP / 2)).toBe(false);
        impostorSetting.passes = "two";
        expect(twoPasses(0)).toBe(true);
        impostorSetting.passes = "one";
        expect(twoPasses(100)).toBe(false);
    });
});
