/**
 * Telling the store where the view ended up.
 *
 * The camera owns where the view is. The store keeps a copy, because a great deal reads it - the
 * session writer, the sliders, the side-on widget - and because MoorhenWebMG reconciles from it:
 * an effect watches the store's origin, quaternion and zoom and, whenever they disagree with the
 * renderer, eases the camera to match.
 *
 * THE BUG THIS ENDS
 *
 * That reconciliation is only correct while the copy is current. A camera move that does not reach
 * the store leaves a disagreement behind, and the effect dutifully resolves it the wrong way - it
 * animates the camera back to the stale value. The symptom is not an error but a view that slides
 * away from where it was just put, a second or so later, which is a maddening thing to debug and
 * has now been found three times in three different features.
 *
 * Until now the copy was kept current by individual call sites calling onOriginChanged,
 * onZoomChanged or onQuatChanged by hand - from setOrigin, from setZoom, from drawScene, from
 * three places in the mouse handlers. That works for the movers that existed when it was written
 * and fails for every one added since, because nothing tells the author of a new mover that the
 * rule exists. A movie panel that moves the camera to a keyframe is exactly such a mover.
 *
 * So the echo moves to where it cannot be forgotten: one subscription to the camera, which fires
 * whenever the camera changes however it was changed. A new way to move the camera inherits it
 * without knowing it exists.
 *
 * WHY IT IS NOT A PERFORMANCE PROBLEM
 *
 * The controller notifies when the camera is set, released, turned, or arrives at the end of a
 * move - not on every frame of one. A driven movie samples the camera per frame without notifying
 * at all, so playing a movie dispatches nothing. A mouse drag notifies per event, which is the
 * rate the quaternion echo already ran at.
 */

/** Where the camera is, in the renderer's own convention: origin is the negated view centre. */
export interface ViewState {
    origin: ArrayLike<number>;
    quat: ArrayLike<number>;
    zoom: number;
}

/** What the store currently believes, in the same convention. */
export interface StoredView {
    origin: ArrayLike<number>;
    quat: ArrayLike<number>;
    zoom: number;
}

/** What needs dispatching. Absent fields are already in agreement and must not be dispatched. */
export interface ViewEcho {
    origin?: [number, number, number];
    quat?: [number, number, number, number];
    zoom?: number;
}

/**
 * How far apart two values may be before they count as disagreeing.
 *
 * The same tolerance MoorhenWebMG's reconciling effect uses, and that is the point rather than a
 * coincidence. If the echo were fussier than the effect it would dispatch values the effect does
 * not care about, waking React for nothing; if it were slacker, a difference large enough for the
 * effect to act on could go un-echoed - which is the bug this file exists to prevent, reintroduced
 * at the third decimal place.
 */
export const VIEW_EPSILON = 1e-5;

const differs = (a: number, b: number, epsilon: number) => !(Math.abs(a - b) < epsilon);

/**
 * What the store needs told, given where the camera is and what the store thinks.
 *
 * Pure, and returns only the fields that actually changed. The equality guard is what stops the
 * echo looping: the store feeds the reconciling effect, which writes back to the camera, which
 * notifies, which echoes - so dispatching a value that is already there would be a cycle rather
 * than an update. The same guard is why `echoSlabToStore` compares before dispatching.
 */
export function viewEcho(
    camera: ViewState, stored: StoredView, epsilon: number = VIEW_EPSILON,
): ViewEcho {
    const echo: ViewEcho = {};

    if ([0, 1, 2].some(i => differs(camera.origin[i], stored.origin?.[i] ?? NaN, epsilon))) {
        echo.origin = [camera.origin[0], camera.origin[1], camera.origin[2]];
    }
    if ([0, 1, 2, 3].some(i => differs(camera.quat[i], stored.quat?.[i] ?? NaN, epsilon))) {
        echo.quat = [camera.quat[0], camera.quat[1], camera.quat[2], camera.quat[3]];
    }
    if (differs(camera.zoom, stored.zoom, epsilon)) {
        echo.zoom = camera.zoom;
    }

    return echo;
}

/** Whether anything needs dispatching at all, so the caller can skip the common case cheaply. */
export const isSilent = (echo: ViewEcho): boolean =>
    echo.origin === undefined && echo.quat === undefined && echo.zoom === undefined;
