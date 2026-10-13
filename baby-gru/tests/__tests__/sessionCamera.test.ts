/**
 * Reading and writing the camera in a saved session.
 *
 * The requirement is blunt: an old file must look the same as it always did. So the tests are
 * built from the values a real session actually contains - the shipped defaults, and the shape
 * MoorhenTimeCapsule writes - rather than from round numbers chosen to make the arithmetic tidy.
 */
import { describe, expect, it } from "@jest/globals";
import { LEGACY_EYE_DISTANCE, SessionCamera, cameraFromSession, sessionFromCamera } from "../../src/utils/sessionCamera";

/**
 * A session as MoorhenTimeCapsule writes one, from the shipped defaults.
 *
 * sceneSettings has fogClipOffset 250, fogStart 242, fogEnd 271, clipStart 8, clipEnd 21 after a
 * molecule has been loaded at zoom 1 - and the capsule negates clipStart on the way out.
 */
const defaultSession = (overrides: Partial<SessionCamera> = {}): SessionCamera => ({
    origin: [-10, -20, -30],
    zoom: 1,
    quat4: [0, 0, 0, -1],
    fogStart: 242,
    fogEnd: 271,
    clipStart: -8,
    clipEnd: 21,
    ...overrides,
});

describe("an old session, with no eye distance recorded", () => {
    it("assumes the one value that ever round-tripped", () => {
        expect(cameraFromSession(defaultSession()).eyeDistance).toBe(LEGACY_EYE_DISTANCE);
    });

    it("turns absolute fog into offsets from the centre", () => {
        const camera = cameraFromSession(defaultSession());
        expect(camera.fogFront).toBe(8);     // 250 - 242
        expect(camera.fogBack).toBe(21);     // 271 - 250
    });

    it("un-negates the clip the capsule negated", () => {
        const camera = cameraFromSession(defaultSession());
        expect(camera.clipFront).toBe(8);
        expect(camera.clipBack).toBe(21);
    });

    it("agrees fog and clip describe the same slab, as auto-clip always made them", () => {
        // Both derive from zoom * 8 and zoom * 21 in execAutoClipFogByZoom. Expressed as offsets
        // they are literally the same two numbers, which is the simplification being banked here.
        const camera = cameraFromSession(defaultSession());
        expect(camera.fogFront).toBe(camera.clipFront);
        expect(camera.fogBack).toBe(camera.clipBack);
    });

    it("carries the view across untouched", () => {
        const camera = cameraFromSession(defaultSession());
        expect(camera.origin).toEqual([-10, -20, -30]);
        expect(camera.zoom).toBe(1);
        expect(camera.quat).toEqual([0, 0, 0, -1]);
    });

    it("handles a session saved at a different zoom", () => {
        // zoom 2.5 under auto-clip: clip 20/52.5, fog 230/302.5 from an eye at 250.
        const camera = cameraFromSession(defaultSession({
            zoom: 2.5, clipStart: -20, clipEnd: 52.5, fogStart: 230, fogEnd: 302.5,
        }));
        expect(camera.clipFront).toBe(20);
        expect(camera.clipBack).toBe(52.5);
        expect(camera.fogFront).toBe(20);
        expect(camera.fogBack).toBe(52.5);
    });

    it("handles a session where the user moved fog away from clip by hand", () => {
        // The old sliders stay live with auto-clip on, so these files exist.
        const camera = cameraFromSession(defaultSession({ fogStart: 200, fogEnd: 400 }));
        expect(camera.fogFront).toBe(50);
        expect(camera.fogBack).toBe(150);
        expect(camera.clipFront).toBe(8);
    });
});

describe("a session that records its eye distance", () => {
    it("uses it instead of the legacy assumption", () => {
        const camera = cameraFromSession(defaultSession({
            eyeDistance: 400, fogStart: 392, fogEnd: 421,
        }));
        expect(camera.eyeDistance).toBe(400);
        expect(camera.fogFront).toBe(8);
        expect(camera.fogBack).toBe(21);
    });

    it("is the fix for the bug the eye-distance control introduced", () => {
        // Saved with the eye at 400, this file used to come back with fog measured against 250:
        // fogFront would have been 250 - 392 = -142, putting fog behind the viewer.
        const session = defaultSession({ eyeDistance: 400, fogStart: 392, fogEnd: 421 });
        const withTheField = cameraFromSession(session);
        const withoutIt = cameraFromSession({ ...session, eyeDistance: undefined });

        expect(withTheField.fogFront).toBe(8);
        expect(withoutIt.fogFront).toBe(-142);
    });
});

describe("writing one back", () => {
    it("round-trips a camera exactly", () => {
        const original = cameraFromSession(defaultSession());
        const returned = cameraFromSession(sessionFromCamera(original));
        expect(returned).toEqual(original);
    });

    it("round-trips at a non-default eye distance too", () => {
        const original = cameraFromSession(defaultSession({
            eyeDistance: 375, fogStart: 300, fogEnd: 500,
        }));
        expect(cameraFromSession(sessionFromCamera(original))).toEqual(original);
    });

    it("still writes the old absolute fog and negated clip", () => {
        // So a file written by this version stays readable by an older one, which will ignore the
        // new field and assume 250 - exactly what it did before, so nothing gets worse.
        const session = sessionFromCamera(cameraFromSession(defaultSession()));
        expect(session.fogStart).toBe(242);
        expect(session.fogEnd).toBe(271);
        expect(session.clipStart).toBe(-8);
        expect(session.clipEnd).toBe(21);
    });

    it("records the eye distance it used", () => {
        const camera = cameraFromSession(defaultSession({ eyeDistance: 400, fogStart: 392, fogEnd: 421 }));
        expect(sessionFromCamera(camera).eyeDistance).toBe(400);
    });
});

describe("an old file read by an old version, after this change", () => {
    it("is unchanged if it never passes through here", () => {
        // Nothing rewrites existing files. The migration happens on read, in memory, and the only
        // difference on the way back out is one additional field.
        const session = defaultSession();
        const before = JSON.parse(JSON.stringify(session));
        cameraFromSession(session);
        expect(session).toEqual(before);
    });
});
