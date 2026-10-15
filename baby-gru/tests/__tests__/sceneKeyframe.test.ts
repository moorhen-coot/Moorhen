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

    it("records every fadeable object, not only the faded ones", () => {
        // A keyframe captured from a live scene is complete. Recording only what happened to be
        // translucent would let everything else drift between keyframes.
        const frame = captureKeyframe(hostWith([fadeable("ribbons"), fadeable("surface", 0.4)]));
        expect(frame.opacity).toEqual({ ribbons: 1, surface: 0.4 });
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
    it("puts the scene back as it was", () => {
        // The round trip that the movie panel's "update this keyframe" depends on.
        const surface = fadeable("surface", 0.4);
        const ribbons = fadeable("ribbons", 1);
        const host = hostWith([surface, ribbons], { specularPower: 32 });
        const frame = captureKeyframe(host);

        surface.setOpacity(1);
        ribbons.setOpacity(0);
        host.scene.write({ specularPower: 8 });

        applySample(host, { ...frame, opacity: frame.opacity!, scene: frame.scene! } as MovieSample);

        expect(surface.opacity).toBe(0.4);
        expect(ribbons.opacity).toBe(1);
        expect(host.scene.read().specularPower).toBe(32);
    });
});
