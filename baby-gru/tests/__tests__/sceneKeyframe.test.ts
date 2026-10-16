/**
 * Capturing a scene into a keyframe, and writing a sampled frame back.
 *
 * The rules being checked are the ones that decide whether a movie is playable over a scene it
 * was not authored against - which is the normal case, since a session is reopened, molecules are
 * added, and the user has been turning things on and off in between.
 */
import { describe, expect, it } from "@jest/globals";
import { applySample, captureKeyframe, type FadeableObject, type SceneHost } from "../../src/utils/sceneKeyframe";
import type { MovieSample, SceneKeyframe } from "../../src/utils/cameraPath";
import type { CameraState } from "../../src/WebGLgComponents/cameraController";

const CAMERA: CameraState = {
    quat: [0, 0, 0, 1],
    origin: [1, 2, 3],
    zoom: 0.5,
    eyeDistance: 250,
    clipFront: 10,
    clipBack: 20,
    fogFront: 8,
    fogBack: 21,
};

const fadeable = (id: string, opacity = 1): FadeableObject => {
    const object = {
        id,
        opacity,
        writes: 0,
        setOpacity(value: number) { object.opacity = value; object.writes++; },
    };
    return object as FadeableObject & { writes: number };
};

const hostWith = (objects: FadeableObject[], scene: SceneKeyframe = {}) => {
    let held: SceneKeyframe = { ...scene };
    const host: SceneHost & { written: SceneKeyframe[] } = {
        cameraState: () => CAMERA,
        fadeable: () => objects,
        scene: {
            read: () => held,
            write: (next) => { held = { ...held, ...next }; host.written.push(next); },
        },
        written: [],
    };
    return host;
};

const sampleWith = (
    opacity: Record<string, number>, scene: SceneKeyframe = {},
): MovieSample => ({
    quat: [0, 0, 0, 1], origin: [0, 0, 0], zoom: 1,
    clipFront: 10, clipBack: 20, fogFront: 8, fogBack: 21,
    opacity, scene,
});

describe("capturing a keyframe", () => {
    it("records where the camera is, as offsets", () => {
        const frame = captureKeyframe(hostWith([]));
        expect(frame.origin).toEqual([1, 2, 3]);
        expect(frame.zoom).toBe(0.5);
        expect(frame).toMatchObject({ clipFront: 10, clipBack: 20, fogFront: 8, fogBack: 21 });
    });

    it("copies the camera's arrays rather than holding them", () => {
        // The controller returns its live arrays so the renderer can mutate them in place. A
        // keyframe holding one would follow the camera around instead of remembering a view.
        const frame = captureKeyframe(hostWith([]));
        expect(frame.origin).not.toBe(CAMERA.origin);
        expect(frame.quat).not.toBe(CAMERA.quat);
    });

    it("records only the objects that are actually faded", () => {
        // This used to record every fadeable object, including the solid ones. In the panel that
        // meant every keyframe listed every representation at 1.00, saying nothing, and left the
        // "fade an object" picker with nothing to offer - it offers what the movie does not yet
        // animate, and the movie claimed to animate everything.
        const frame = captureKeyframe(hostWith([fadeable("ribbons"), fadeable("surface", 0.4)]));
        expect(frame.opacity).toEqual({ surface: 0.4 });
    });

    it("says nothing about opacity when nothing is faded", () => {
        // Absent already means "not animated, left as the scene has it", which is exactly true of
        // a solid object. Recording it would be a line to say "unchanged".
        const frame = captureKeyframe(hostWith([fadeable("ribbons"), fadeable("bonds")]));
        expect(frame.opacity).toEqual({});
    });

    it("does not mistake an interpolator's near-miss for a fade", () => {
        // The same 0.99 threshold the renderer uses to decide whether a buffer is transparent.
        const frame = captureKeyframe(hostWith([fadeable("ribbons", 0.999999)]));
        expect(frame.opacity).toEqual({});
    });

    it("takes a copy of the scene, so later edits do not rewrite history", () => {
        const host = hostWith([], { specularPower: 32 });
        const frame = captureKeyframe(host);
        host.scene.write({ specularPower: 64 });
        expect(frame.scene).toEqual({ specularPower: 32 });
    });
});

describe("applying a sample", () => {
    it("fades the objects it names", () => {
        const surface = fadeable("surface");
        applySample(hostWith([surface]), sampleWith({ surface: 0.25 }));
        expect(surface.opacity).toBe(0.25);
    });

    it("leaves an object the movie says nothing about alone", () => {
        // What makes a camera-only tour playable over whatever is on screen: it must not assert
        // opacities it never chose. It is also what happens to a molecule loaded after the movie
        // was authored - it carries on being itself rather than snapping to invisible.
        const newcomer = fadeable("loaded-later", 1);
        applySample(hostWith([newcomer]), sampleWith({ surface: 0 }));
        expect(newcomer.opacity).toBe(1);
    });

    it("ignores an id with nothing left to answer to it", () => {
        // The object was deleted after the movie was made. There is nothing useful to do about it
        // mid-frame, and the movie should still play.
        expect(() => applySample(hostWith([]), sampleWith({ gone: 0.5 }))).not.toThrow();
    });

    it("does not write an opacity that is already set", () => {
        // This ends in setAlphaMultiplier, which decides whether a buffer joins the depth-peeling
        // layers. Held frames and the flat ends of an eased fade are the common case.
        const surface = fadeable("surface", 0.5) as FadeableObject & { writes: number };
        applySample(hostWith([surface]), sampleWith({ surface: 0.5 }));
        expect(surface.writes).toBe(0);
    });

    it("pulls an interpolator's overshoot back into range", () => {
        const surface = fadeable("surface");
        applySample(hostWith([surface]), sampleWith({ surface: 1.4 }));
        expect(surface.opacity).toBe(1);
    });

    it("writes the scene quantities the sample carries", () => {
        const host = hostWith([], { specularPower: 32 });
        applySample(host, sampleWith({}, { specularPower: 64 }));
        expect(host.written).toEqual([{ specularPower: 64 }]);
    });

    it("does not touch the scene for a movie that does not animate it", () => {
        // Same rule as opacity, and the reason a ligand tour can be played over any lighting.
        const host = hostWith([], { specularPower: 32 });
        applySample(host, sampleWith({}));
        expect(host.written).toEqual([]);
    });

    it("leaves the camera to its owner", () => {
        // The asymmetry: capture reads the camera, apply does not write it. A movie drives the
        // camera by holding it, and a second writer is what the controller exists to prevent.
        const host = hostWith([]);
        const reads: number[] = [];
        host.cameraState = () => { reads.push(1); return CAMERA; };
        applySample(host, sampleWith({}));
        expect(reads).toHaveLength(0);
    });
});

describe("a captured keyframe, applied back", () => {
    it("puts back the camera, the scene, and the fades it recorded", () => {
        // The round trip that the movie panel's "update this keyframe" depends on.
        const surface = fadeable("surface", 0.4);
        const host = hostWith([surface], { specularPower: 32 });
        const frame = captureKeyframe(host);

        surface.setOpacity(1);
        host.scene.write({ specularPower: 8 });

        applySample(host, { ...frame, opacity: frame.opacity!, scene: frame.scene! } as MovieSample);

        expect(surface.opacity).toBe(0.4);
        expect(host.scene.read().specularPower).toBe(32);
    });

    it("leaves alone an object that was solid when the keyframe was taken", () => {
        // Not an omission: a solid object is one the movie does not animate, and the rule for an
        // object a movie says nothing about is that the scene keeps it. Fading it afterwards is
        // the user's business, and a keyframe captured before they did so has no opinion on it.
        const ribbons = fadeable("ribbons", 1);
        const host = hostWith([ribbons]);
        const frame = captureKeyframe(host);

        ribbons.setOpacity(0.2);
        applySample(host, { ...frame, opacity: frame.opacity ?? {}, scene: {} } as MovieSample);

        expect(ribbons.opacity).toBe(0.2);
    });
});
