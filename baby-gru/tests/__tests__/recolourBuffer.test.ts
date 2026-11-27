/**
 * Recolouring a buffer without rebuilding it (DisplayBuffer.setVertexColours / setInfluence): the
 * new arrays are in place and the buffer is marked for upload again, which is what both renderers
 * watch - WebGL its isDirty, WebGPU its dataVersion.
 */
import { describe, expect, it } from "@jest/globals";
import { DisplayBuffer } from "../../src/WebGLgComponents/displayBuffer";

describe("recolouring a display buffer", () => {
    it("takes new vertex colours and asks to be uploaded again", () => {
        const buffer = new DisplayBuffer();
        buffer.triangleColours = [new Float32Array(8).fill(1)];
        buffer.isDirty = false;
        const before = buffer.dataVersion;
        const colours = new Float32Array([1, 0, 0, 1, 0, 0, 1, 1]);
        buffer.setVertexColours(colours);
        expect(buffer.triangleColours[0]).toBe(colours);
        expect(buffer.isDirty).toBe(true);
        expect(buffer.dataVersion).toBe(before + 1);
    });

    it("takes new hover shares as a new object, for WebGL's textures and WebGPU's cache alike", () => {
        const buffer = new DisplayBuffer();
        buffer.pick_info = {};
        buffer.isDirty = false;
        const influence = { weights: new Float32Array([1]), point_indexes: new Uint32Array([3]), index_offsets: new Uint32Array([1]) };
        buffer.setInfluence(influence);
        expect(buffer.pick_info.influence).toBe(influence);
        expect(buffer.pick_info.pending_influence).toBe(influence);
        expect(buffer.isDirty).toBe(true);
    });
});
