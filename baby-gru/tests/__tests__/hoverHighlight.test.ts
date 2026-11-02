/**
 * What the WebGPU renderer lights for a hover (hoverHighlight.ts), against what drawCore decides
 * for WebGL: which section or instance of an instanced mesh, and which smooth mesh, point and
 * mask for the overlay. The drawing itself is tests/gpu/hover.gpu.spec.ts.
 */
import { describe, expect, it } from "@jest/globals";
import type { DisplayBuffer } from "../../src/WebGLgComponents/displayBuffer";
import { NO_HIGHLIGHT, WHOLE_MESH, hoverHighlight, type HoverSource } from "../../src/WebGPUComponents/hoverHighlight";
import { LEVEL_OWNER_MASKS } from "../../src/utils/pickLevel";

const buffer = (over: Record<string, unknown>): DisplayBuffer =>
    ({ id: "b", bufferTypes: ["TRIANGLES"], pick_info: {}, ...over }) as unknown as DisplayBuffer;

const source = (hoveridx: number, hover_point: number, extra: Partial<HoverSource> & { section?: { bufferId: string; section: number } } = {}): HoverSource => ({
    state: { hoveridx, hover_point },
    pickLevel: extra.pickLevel ?? 0,
    store: { getState: () => ({ hoveringStates: { hoveredSection: extra.section ?? null } }) },
});

const ribbon = buffer({
    id: "ribbon",
    pick_info: {
        pick_point_sections: [0, 0, 1, 2],
        section_ranges: [[0, 10], [10, 20], [20, 30]],
        section_level_ranges: [[[0, 10], [10, 20], [20, 30]], [[0, 20], [0, 20], [20, 30]]],
    },
});
const shapes = buffer({ id: "shapes", pick_info: { pick_point_instances: [0, 0, 1, 2] } });
const influence = { weights: [1], point_indexes: [0], index_offsets: [1] };
const surface = buffer({ id: "surface", pick_info: { owner_codes: new Uint32Array([0x00020005, 0x00020006]), influence } });
const metaballs = buffer({ id: "metaballs", pick_info: { pending_influence: influence } });
const cavity = buffer({ id: "cavity", pick_info: { highlight_whole: true } });

describe("hover highlight", () => {
    it("lights nothing with nothing hovered", () => {
        const h = hoverHighlight(source(-1, -1), [ribbon]);
        expect(h.overlay).toBeNull();
        expect(h.forBuffer(ribbon)).toEqual(NO_HIGHLIGHT);
    });

    it("lights the pointer's section, at the level's grain", () => {
        expect(hoverHighlight(source(0, 2), [ribbon]).forBuffer(ribbon)).toEqual({ instance: -1, from: 10, to: 20 });
        // Level 1: the section's range is its pair's.
        expect(hoverHighlight(source(0, 0, { pickLevel: 1 }), [ribbon]).forBuffer(ribbon)).toEqual({ instance: -1, from: 0, to: 20 });
        // Only in the hovered buffer.
        expect(hoverHighlight(source(1, 2), [shapes, ribbon]).forBuffer(shapes)).toEqual(NO_HIGHLIGHT);
    });

    it("lights the section the sequence viewer names, unless the pointer is on the buffer", () => {
        const asked = { section: { bufferId: "ribbon", section: 2 } };
        expect(hoverHighlight(source(-1, -1, asked), [ribbon]).forBuffer(ribbon)).toEqual({ instance: -1, from: 20, to: 30 });
        // The pointer wins; a pointer point with no section lights nothing, as in drawCore.
        expect(hoverHighlight(source(0, 0, asked), [ribbon]).forBuffer(ribbon)).toEqual({ instance: -1, from: 0, to: 10 });
        expect(hoverHighlight(source(-1, -1, { section: { bufferId: "other", section: 0 } }), [ribbon]).forBuffer(ribbon)).toEqual(NO_HIGHLIGHT);
    });

    it("lights a whole instance, through pick_point_instances where there is one", () => {
        expect(hoverHighlight(source(0, 2), [shapes]).forBuffer(shapes)).toEqual({ instance: 1, from: -1, to: -1 });
        const plain = buffer({ id: "plain" });
        expect(hoverHighlight(source(0, 3), [plain]).forBuffer(plain)).toEqual({ instance: 3, from: -1, to: -1 });
    });

    it("gives a smooth mesh's overlay its point's owner code and the level's mask", () => {
        const one = hoverHighlight(source(0, 1), [surface]).overlay;
        expect(one).toMatchObject({ buffer: surface, point: 0x00020006, mask: LEVEL_OWNER_MASKS[0] >>> 0, whole: false, influence });
        expect(hoverHighlight(source(0, 1, { pickLevel: 1 }), [surface]).overlay?.mask).toBe(LEVEL_OWNER_MASKS[1] >>> 0);
        // Without codes, the point's index, compared whole.
        expect(hoverHighlight(source(0, 3), [metaballs]).overlay).toMatchObject({ point: 3, mask: WHOLE_MESH, influence });
        // A cavity lights whole, without lists.
        expect(hoverHighlight(source(0, 0), [cavity]).overlay).toMatchObject({ point: WHOLE_MESH, mask: WHOLE_MESH, whole: true, influence: null });
    });

    it("lights a smooth mesh the sequence viewer names, by its section as the point", () => {
        const overlay = hoverHighlight(source(-1, -1, { section: { bufferId: "surface", section: 0 } }), [ribbon, surface]).overlay;
        expect(overlay).toMatchObject({ buffer: surface, point: 0x00020005 });
        // Not a cavity (no lists), and not when the pointer is on something.
        expect(hoverHighlight(source(-1, -1, { section: { bufferId: "cavity", section: 0 } }), [cavity]).overlay).toBeNull();
        expect(hoverHighlight(source(0, 1, { section: { bufferId: "surface", section: 0 } }), [ribbon, surface]).overlay).toBeNull();
    });

    it("finds nothing for a stale index, or a buffer whose first sub-buffer is not triangles", () => {
        expect(hoverHighlight(source(4, 0), [surface]).overlay).toBeNull();
        const lines = buffer({ bufferTypes: ["LINES"], pick_info: { influence } });
        expect(hoverHighlight(source(0, 0), [lines]).overlay).toBeNull();
    });
});
