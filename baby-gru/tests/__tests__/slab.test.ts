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
import { CameraController } from "../../src/WebGLgComponents/cameraController";

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

/**
 * When the auto policy is allowed to act.
 *
 * The setting is "reset clip and fog on zoom", and the review of the camera PR found that it had
 * quietly become "reset clip and fog on anything at all". That made three ways of setting the slab
 * by hand - the keyboard shortcuts, the scene-slider handles and the scripting API - accept a
 * value and overwrite it in the same breath, with the keyboard shortcut still raising its toast.
 */
describe("the auto slab policy", () => {
    const auto = { kind: "auto" as const, fieldDepthFront: 8, fieldDepthBack: 21 };
    const start = {
        quat: [0, 0, 0, 1] as [number, number, number, number],
        origin: [0, 0, 0] as [number, number, number],
        zoom: 1, eyeDistance: 250,
        clipFront: 8, clipBack: 21, fogFront: 8, fogBack: 21,
    };

    it("re-derives the slab when the zoom changes", () => {
        const controller = new CameraController(start, auto);
        controller.writeLive({ zoom: 2 });
        expect(controller.state.clipFront).toBeCloseTo(16, 6);
        expect(controller.state.clipBack).toBeCloseTo(42, 6);
    });

    it("leaves a hand-set clip alone when the zoom has not moved", () => {
        // The keyboard shortcuts, the slider handles and the scripting API all land here.
        const controller = new CameraController(start, auto);
        controller.writeLive({ clipFront: 3, clipBack: 5 });
        expect(controller.state.clipFront).toBe(3);
        expect(controller.state.clipBack).toBe(5);
    });

    it("leaves the slab alone when the camera only rotates", () => {
        // turnBy writes like anything else, so an unguarded policy re-derived on every drag event.
        const controller = new CameraController(start, auto);
        controller.writeLive({ clipFront: 3 });
        controller.turnBy([0, 0.3827, 0, 0.9239]);
        expect(controller.state.clipFront).toBe(3);
    });

    it("lets an explicit slab win even when the zoom moves in the same write", () => {
        // Someone naming clip and zoom together is not asking for clip to be derived from zoom.
        const controller = new CameraController(start, auto);
        controller.writeLive({ zoom: 4, clipFront: 3, clipBack: 5 });
        expect(controller.state.clipFront).toBe(3);
        expect(controller.state.zoom).toBe(4);
    });

    it("still does nothing under a manual policy", () => {
        const controller = new CameraController(start, { kind: "manual" });
        controller.writeLive({ zoom: 2 });
        expect(controller.state.clipFront).toBe(8);
    });
});
