import { describe, expect, it } from "@jest/globals";
import { highlightSiblings } from "../../src/WebGLgComponents/highlightGroup";

describe("highlight groups", () => {
    it("finds the other visible buffers of the hovered one's group", () => {
        const buffers = [
            { pick_info: { highlight_group: "g" } },
            { pick_info: { highlight_group: "h" } },
            { pick_info: { highlight_group: "g" } },
            { visible: false, pick_info: { highlight_group: "g" } },
            null,
            { pick_info: {} },
        ];
        expect(highlightSiblings(buffers, 0)).toEqual([2]);
        expect(highlightSiblings(buffers, 2)).toEqual([0]);
        expect(highlightSiblings(buffers, 1)).toEqual([]);
        expect(highlightSiblings(buffers, 5)).toEqual([]);
        expect(highlightSiblings(buffers, 9)).toEqual([]);
    });
});
