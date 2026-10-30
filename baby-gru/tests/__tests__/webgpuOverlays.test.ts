/**
 * The GPU-free halves of the overlays both renderers draw: the label instances read from a glyph
 * atlas, which atlases are drawn how, and the FPS meter's and measuring lines' segments
 * (overlayGeometry, shared by the WebGL and WebGPU renderers).
 */
import { describe, expect, it } from "@jest/globals";
import * as mat4 from "gl-matrix/mat4";
import { TEXT_INSTANCE_FLOATS, packTextInstances, textBatchesOf } from "../../src/WebGPUComponents/textLayer";
import type { TextAtlasSource } from "../../src/WebGPUComponents/textLayer";
import { fpsMeterSegments, lineMeasureSegments } from "../../src/WebGLgComponents/mgWebGLParts/overlayGeometry";

const atlas = (over: Partial<TextAtlasSource> = {}): TextAtlasSource => ({
    canvasBig: { width: 8, height: 8 } as unknown as OffscreenCanvas,
    nBigTextures: 2,
    bigTextureTexOrigins: [[1, 2, 3], [4, 5, 6]],
    bigTextureScalings: [[1, 1, 1], [2, 2, 1]],
    bigTextureTexOffsets: [[0, 0.5, 0, 0.25], [0.5, 0.5, 0.25, 0.25]],
    bigTextureScreenOffsets: [[0, 0, 0, 0], [1, 0, 0, 3]],
    ...over,
});

describe("packTextInstances", () => {
    it("packs each label's origin, size, atlas offsets and screen offset", () => {
        const { data, count } = packTextInstances(atlas());
        expect(count).toBe(2);
        expect(Array.from(data.slice(TEXT_INSTANCE_FLOATS, 2 * TEXT_INSTANCE_FLOATS))).toEqual([4, 5, 6, 2, 2, 1, 0.5, 0.5, 0.25, 0.25, 1, 0, 0, 3]);
    });

    it("skips removed labels, as recreateBigTextureBuffers' flat() does, and draws nBigTextures", () => {
        const removed = atlas({
            nBigTextures: 1,
            bigTextureTexOrigins: [[], [4, 5, 6]],
            bigTextureScalings: [[], [2, 2, 1]],
            bigTextureTexOffsets: [[], [0.5, 0.5, 0.25, 0.25]],
            bigTextureScreenOffsets: [[], [1, 0, 0, 3]],
        });
        const { data, count } = packTextInstances(removed);
        expect(count).toBe(1);
        expect(data[0]).toBe(4);
    });
});

describe("textBatchesOf", () => {
    it("draws measurements, labels and 2D overlays in WebGL's order, on top unless labels are in the scene", () => {
        const [a, b, c] = [atlas(), atlas(), atlas()];
        const source = { measureTextCanvasTexture: a, labelsTextCanvasTexture: b, measureText2DCanvasTexture: c };
        expect(textBatchesOf(source).map(t => [t.atlas, t.onTop])).toEqual([[a, true], [b, true], [c, true]]);
        expect(textBatchesOf({ ...source, atomLabelDepthMode: true }).map(t => t.onTop)).toEqual([false, false, true]);
    });
});

describe("overlayGeometry", () => {
    it("draws the FPS meter as a box and a bar a frame, coloured by frame time", () => {
        const { vertices, colours } = fpsMeterSegments([10, 20, 40, 300]);
        expect(vertices.length / 6).toBe(4 + 4);
        expect(colours.length).toBe(vertices.length / 3 * 4);
        // The 300 ms bar is capped at 200 ms - full height, 10 units - and red.
        expect(vertices[vertices.length - 2] - vertices[vertices.length - 5]).toBeCloseTo(10, 6);
        expect(colours.slice(-4)).toEqual([0.8, 0.2, 0.2, 1.0]);
    });

    it("draws a measuring point as a little box, and joins points, in the plane of the view centre", () => {
        const unrotated = mat4.create();
        const one = lineMeasureSegments([{ x: 0, y: 0 }], [-1, -2, -3], 1, 1, unrotated, [1, 1, 1, 1]);
        expect(one.vertices.length / 6).toBe(4);
        const two = lineMeasureSegments([{ x: 0, y: 0 }, { x: 5, y: -2 }], [-1, -2, -3], 2, 1.5, unrotated, [0, 0, 0, 1]);
        expect(two.vertices.length / 6).toBe(9);
        // The joining line, last: from the first point to the second (y flipped), at the view centre.
        expect(two.vertices.slice(-6)).toEqual([1, 2, 3, 1 + 5 * 2 * 1.5, 2 + 2 * 2, 3]);
        // White on a dark background.
        expect(two.colours.slice(0, 4)).toEqual([1, 1, 1, 1]);
    });
});
