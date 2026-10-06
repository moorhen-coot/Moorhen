/**
 * The two triangle fragment shaders must differ in exactly one way: the discards.
 *
 * A fragment shader that can discard forces the hardware to shade before resolving depth, so
 * early-Z - and, on Apple's tile-based hardware, the whole hidden-surface-removal architecture -
 * is switched off for the entire program. Measured at 8% on an immediate-mode renderer and 40%
 * on Metal, on a scene where you look through a dozen layers of ribbon.
 *
 * The danger in carrying two variants is that they drift. They are composed from one body with a
 * flag precisely so they cannot, and these tests hold that: same uniforms, same varyings, same
 * everything, differing only by one contiguous block. If someone edits the shader and only one
 * variant changes, that is a link failure or a silently wrong picture in whichever mode is less
 * often used - and since the fast one is used during ordinary model building and the other only
 * under perspective or while depth peeling, a divergence could sit unnoticed for a long time.
 */
import { describe, expect, it } from "@jest/globals";
import {
    triangle_fragment_shader_source,
    triangle_fragment_shader_source_fast,
} from "../../src/WebGLgComponents/webgl-2/triangle-fragment-shader.js";

const slow = triangle_fragment_shader_source;
const fast = triangle_fragment_shader_source_fast;

const occurrences = (text: string, needle: string) => text.split(needle).length - 1;

/** Everything a shader declares at the top: uniforms, ins and outs. */
const declarations = (src: string) =>
    (src.match(/^\s*(?:uniform|in|out)\s+.*;$/gm) ?? []).map(line => line.trim()).sort();

describe("the fast triangle fragment shader", () => {
    it("contains no discard at all", () => {
        // Not "fewer discards" - one reachable discard anywhere in the program is enough to
        // disable early depth rejection for all of it, so the only useful number here is zero.
        expect(occurrences(fast, "discard")).toBe(0);
    });

    it("leaves the full variant with its discards", () => {
        // Two clip plane tests and one depth peel test.
        expect(occurrences(slow, "discard;")).toBe(3);
    });

    it("drops the clip plane tests, which the projection already enforces", () => {
        expect(slow).toMatch(/dot\(eyePos, clipPlane0\)<0\.0/);
        expect(fast).not.toMatch(/dot\(eyePos, clipPlane0\)/);
        expect(fast).not.toMatch(/dot\(eyePos, clipPlane1\)/);
    });

    it("drops the depth peel test, which only matters while peeling", () => {
        expect(fast).not.toMatch(/peelNumber>0/);
    });

    it("declares exactly what the other declares", () => {
        // The uniforms and varyings must match even where the fast variant no longer uses them:
        // these three programs share a vertex shader, and a GL ES 3.0 program fails to link if a
        // statically used fragment `in` has no matching vertex `out`. Dropping a declaration here
        // is the same class of mistake that broke the thick-line program once before.
        expect(declarations(fast)).toEqual(declarations(slow));
    });

    it("is still a GL ES 3.0 shader", () => {
        expect(fast.startsWith("#version 300 es")).toBe(true);
    });

    it("differs from the full variant by exactly one contiguous block", () => {
        const marker = "void main(void) {";
        const headOf = (s: string) => s.slice(0, s.indexOf(marker) + marker.length);
        const tailOf = (s: string) => s.slice(s.indexOf(marker) + marker.length);

        expect(headOf(fast)).toEqual(headOf(slow));
        // The fast body is the full body with one block cut out of the front of main().
        expect(tailOf(slow).endsWith(tailOf(fast))).toBe(true);

        const removed = tailOf(slow).slice(0, tailOf(slow).length - tailOf(fast).length);
        expect(removed).toMatch(/clipPlane0/);
        expect(removed).toMatch(/peelNumber/);
        expect(occurrences(removed, "discard;")).toBe(3);
    });

    it("keeps the lighting, fog and texture work identical", () => {
        // A spot check that the cut took only the discards: these are the parts that decide what
        // the pixel actually looks like, and they must be present and identical in both.
        for (const fragment of ["fogFactor", "hasBaseColourTexture", "specularPower", "vHighlight"]) {
            expect(occurrences(fast, fragment)).toBe(occurrences(slow, fragment));
        }
    });
});
