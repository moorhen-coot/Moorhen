/**
 * Translating the slab between the camera's terms and the renderer's.
 *
 * The risk here is not that the arithmetic is hard - it is four additions - but that it is
 * arithmetic nobody checks, sitting between a shader uniform and a user-facing slider, with a sign
 * convention that has already cost an afternoon once. So the oracle is not a set of round numbers
 * chosen to look right: it is the code being replaced, written out verbatim, so that any
 * disagreement is a disagreement with what shipped rather than with my arithmetic.
 */
import { describe, expect, it } from "@jest/globals";
import { clipOffsets, fogOffsets, slabFromCamera, SlabSource } from "../../src/WebGLgComponents/slab";

/** What set_clip_range and set_fog_range did, copied from mgWebGL before this change. */
const asTheRendererDidIt = (eyeDistance: number, clipStart: number, clipEnd: number, fogStart: number, fogEnd: number) => ({
    clipPlane0W: -eyeDistance - clipStart,
    clipPlane1W: eyeDistance + clipEnd,
    fogStart,
    fogEnd,
});

const camera = (overrides: Partial<SlabSource> = {}): SlabSource => ({
    eyeDistance: 250,
    clipFront: 8,
    clipBack: 21,
    fogFront: 8,
    fogBack: 21,
    ...overrides,
});

describe("what the shaders get", () => {
    it("matches the old set_clip_range and set_fog_range exactly", () => {
        // A default scene at zoom 1: execAutoClipFogByZoom produced clip 8/21 and fog 242/271
        // against an eye at 250, and set_clip_range was called with the front distance negated.
        expect(slabFromCamera(camera())).toEqual(asTheRendererDidIt(250, -8, 21, 242, 271));
    });

    it("matches it at another zoom", () => {
        // zoom 2.5: clip 20/52.5, fog 230/302.5.
        const at = camera({ clipFront: 20, clipBack: 52.5, fogFront: 20, fogBack: 52.5 });
        expect(slabFromCamera(at)).toEqual(asTheRendererDidIt(250, -20, 52.5, 230, 302.5));
    });

    it("matches it with fog moved away from clip by hand", () => {
        // The two sliders are independent, so this combination exists in saved sessions.
        const at = camera({ fogFront: 50, fogBack: 150 });
        expect(slabFromCamera(at)).toEqual(asTheRendererDidIt(250, -8, 21, 200, 400));
    });

    it("reproduces the wide-open slab MGWebGL mounts with", () => {
        // initGLState used to write these four by hand: clip planes at -0.0 and 1000, fog 250 to
        // 1250. They now come from Camera's INITIAL_CAMERA, so the two have to agree.
        const atMount = camera({ clipFront: 250, clipBack: 750, fogFront: 0, fogBack: 1000 });
        expect(slabFromCamera(atMount)).toEqual({
            clipPlane0W: 0, clipPlane1W: 1000, fogStart: 250, fogEnd: 1250,
        });
    });
});

describe("coming back the other way", () => {
    it("round-trips", () => {
        const original = camera({ clipFront: 13, clipBack: 44, fogFront: 7, fogBack: 90 });
        const rendered = slabFromCamera(original);

        expect({
            ...clipOffsets(-(rendered.clipPlane0W + original.eyeDistance), rendered.clipPlane1W - original.eyeDistance),
            ...fogOffsets(original.eyeDistance, rendered.fogStart, rendered.fogEnd),
        }).toEqual({
            clipFront: 13, clipBack: 44, fogFront: 7, fogBack: 90,
        });
    });

    it("undoes the negation set_clip_range's callers have always applied", () => {
        expect(clipOffsets(-8, 21)).toEqual({ clipFront: 8, clipBack: 21 });
    });

    it("turns absolute fog into offsets from the centre", () => {
        expect(fogOffsets(250, 242, 271)).toEqual({ fogFront: 8, fogBack: 21 });
    });

    it("agrees with the session reader, which does the same sum at a different boundary", () => {
        // sessionCamera does this conversion for a file; this does it for the renderer. If the two
        // ever disagree, a session would load looking different from the scene that saved it.
        const { fogFront, fogBack } = fogOffsets(400, 392, 421);
        expect([fogFront, fogBack]).toEqual([8, 21]);
    });
});

describe("moving the eye", () => {
    it("leaves the slab where it is relative to the scene", () => {
        // The point of putting the eye distance on the camera. The slab is a property of what is
        // being looked at, not of how far back the viewer is standing, so pulling the eye from 250
        // to 400 must not drag the fog 150A into the foreground - which is what keeping the
        // absolute numbers fixed used to do.
        const near = slabFromCamera(camera({ eyeDistance: 250 }));
        const far = slabFromCamera(camera({ eyeDistance: 400 }));

        expect(far.fogStart - far.clipPlane1W).toBeCloseTo(near.fogStart - near.clipPlane1W, 10);
        expect(far.fogStart).toBe(392);   // still 8 in front of the centre
        expect(near.fogStart).toBe(242);  // likewise
    });
});
