/**
 * The scene's modes, as a movie records them.
 *
 * MovieSceneSettings holds what a movie fixes once for its whole length - whether shadows run,
 * whether SSAO runs, how wide the depth-of-field blur is. The store holds the same things under
 * names that mostly agree and twice do not. This is the translation, in one place, so that a
 * mismatched field is a compile error here rather than a movie that quietly exports without the
 * edges the author could see on screen.
 *
 * The source is typed structurally rather than as the Redux slice, so nothing about movies has to
 * import the store - and so this can be tested with an object literal.
 */

import type { MovieSceneSettings } from "./movieDocument";

/** The fields of the scene-settings slice this needs, by the names the store uses. */
export interface SceneSettingsSource {
    doShadow: boolean;
    doSSAO: boolean;
    ssaoRadius: number;
    ssaoBias: number;
    doEdgeDetect: boolean;
    edgeDetectDepthScale: number;
    edgeDetectNormalScale: number;
    edgeDetectDepthThreshold: number;
    edgeDetectNormalThreshold: number;
    useOffScreenBuffers: boolean;
    /** The store's name for the depth-of-field blur width, which a movie calls blurRadius. */
    depthBlurRadius: number;
    doPerspectiveProjection: boolean;
}

/**
 * What the scene is set to now, as a movie would record it.
 *
 * @param eyeDistance  from the camera rather than the store. The camera owns it - it is what
 *                     makes a perspective view converge, and the controller writes it - so taking
 *                     it from the store would record whatever the store was last told rather than
 *                     what is being looked through.
 */
export const movieSceneFrom = (
    settings: SceneSettingsSource, eyeDistance: number,
): MovieSceneSettings => ({
    doShadow: settings.doShadow,
    doSSAO: settings.doSSAO,
    ssaoRadius: settings.ssaoRadius,
    ssaoBias: settings.ssaoBias,
    doEdgeDetect: settings.doEdgeDetect,
    edgeDetectDepthScale: settings.edgeDetectDepthScale,
    edgeDetectNormalScale: settings.edgeDetectNormalScale,
    edgeDetectDepthThreshold: settings.edgeDetectDepthThreshold,
    edgeDetectNormalThreshold: settings.edgeDetectNormalThreshold,
    useOffScreenBuffers: settings.useOffScreenBuffers,
    // The two that are not a straight copy. Both renamed deliberately when the movie document was
    // defined: "depthBlur" says how it is implemented, "blur radius" says what it does.
    blurRadius: settings.depthBlurRadius,
    doPerspectiveProjection: settings.doPerspectiveProjection,
    eyeDistance,
});
