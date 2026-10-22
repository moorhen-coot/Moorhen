/**
 * The scene's modes, as a movie records them.
 *
 * A translation between two sets of names that mostly agree. The interesting cases are the two
 * that do not, because a field copied to the wrong name does not fail - it exports a movie without
 * the outline or the blur the author could see on screen, which is only noticed after waiting for
 * the render.
 */
import { describe, expect, it } from "@jest/globals";
import { movieSceneFrom, type SceneSettingsSource } from "../../src/utils/movieSceneSettings";
import { DEFAULT_SCENE } from "../../src/utils/movieDocument";

const storeSettings: SceneSettingsSource = {
    doShadow: true,
    doSSAO: true,
    ssaoRadius: 2.5,
    ssaoBias: 0.05,
    doEdgeDetect: true,
    edgeDetectDepthScale: 1.5,
    edgeDetectNormalScale: 2.5,
    edgeDetectDepthThreshold: 0.75,
    edgeDetectNormalThreshold: 0.25,
    doOutline: true,
    useOffScreenBuffers: true,
    depthBlurRadius: 7,
    doPerspectiveProjection: true,
};

describe("recording the scene's modes", () => {
    it("carries the renamed blur radius across", () => {
        // depthBlurRadius -> blurRadius. The store's name says how it is implemented; the
        // movie's says what it does.
        expect(movieSceneFrom(storeSettings, 250).blurRadius).toBe(7);
    });

    it("takes the eye distance from the camera, not the store", () => {
        // The camera owns it - it is what makes a perspective view converge, and the controller
        // writes it - so the store would only report what it was last told.
        expect(movieSceneFrom(storeSettings, 180).eyeDistance).toBe(180);
    });

    it("records every mode the scene is in", () => {
        expect(movieSceneFrom(storeSettings, 250)).toEqual({
            doShadow: true, doSSAO: true, ssaoRadius: 2.5, ssaoBias: 0.05,
            doEdgeDetect: true, edgeDetectDepthScale: 1.5, edgeDetectNormalScale: 2.5,
            edgeDetectDepthThreshold: 0.75, edgeDetectNormalThreshold: 0.25,
            doOutline: true, useOffScreenBuffers: true, blurRadius: 7,
            doPerspectiveProjection: true, eyeDistance: 250,
        });
    });

    it("fills in exactly the fields a movie document expects", () => {
        // The guard against the two drifting apart: a field added to MovieSceneSettings and not
        // here would otherwise arrive as undefined and quietly switch its feature off.
        expect(Object.keys(movieSceneFrom(storeSettings, 250)).sort())
            .toEqual(Object.keys(DEFAULT_SCENE).sort());
    });
});
