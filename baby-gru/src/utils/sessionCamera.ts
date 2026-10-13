/**
 * Reading a camera out of a saved session, and writing one back.
 *
 * The session format has three conventions that the camera no longer uses, and they have to be
 * translated at this boundary rather than carried inwards. Old files must look the same as they
 * always did, so every one of these is a documented fact about what is on disk, not a preference.
 *
 * 1. FOG IS ABSOLUTE, CLIP IS RELATIVE
 *
 *    A session stores `fogStart` and `fogEnd` as distances from the eye - 242 and 271 for the
 *    defaults - while `clipStart` and `clipEnd` are distances from the view centre. Same two
 *    boundaries, two conventions, which is the inconsistency the camera now removes.
 *
 * 2. CLIP IS STORED NEGATED
 *
 *    MoorhenTimeCapsule writes `sceneSettings.clipStart * -1`. It is read back through
 *    `set_clip_range(-clipStart, clipEnd)`, so the two negations cancel and nobody ever noticed.
 *
 * 3. THE EYE DISTANCE IS NOT STORED AT ALL
 *
 *    `fogClipOffset` is read into a local when a session is written and then left out of
 *    viewDataSession, which has no field for it. So fog was saved as a distance from an eye whose
 *    position was not saved.
 *
 *    That was harmless while the value never moved from 250 - and it did not, until the
 *    perspective eye-distance control was added, which can change it. A session saved with the
 *    eye at 400 therefore restores its fog against 250 and comes back wrong. That is a bug we
 *    introduced; writing the field fixes it going forward.
 *
 *    For files that predate the field, 250 is not a guess: it is the only value that ever
 *    round-tripped correctly, because any other was already being discarded on load.
 */

import type { CameraState, Quat, Vec3 } from "../WebGLgComponents/cameraController";

/**
 * The eye distance assumed for a session that does not record one.
 *
 * The historical default, and the only value for which an old file's fog numbers mean what they
 * say.
 */
export const LEGACY_EYE_DISTANCE = 250;

/** The camera fields as they appear in a saved session. */
export interface SessionCamera {
    origin: Vec3;
    zoom: number;
    quat4: number[];
    /** Distance from the eye. */
    fogStart: number;
    /** Distance from the eye. */
    fogEnd: number;
    /** Distance in front of the view centre, stored negated. */
    clipStart: number;
    /** Distance behind the view centre. */
    clipEnd: number;
    /** Absent in sessions written before the camera owned it. */
    eyeDistance?: number;
}

/**
 * Convert a saved session's camera into the camera's own terms.
 *
 * Everything comes back as an offset from the view centre, and the eye distance is explicit.
 */
export function cameraFromSession(session: SessionCamera): CameraState {
    const eyeDistance = session.eyeDistance ?? LEGACY_EYE_DISTANCE;

    return {
        quat: [session.quat4[0], session.quat4[1], session.quat4[2], session.quat4[3]] as Quat,
        origin: [...session.origin] as Vec3,
        zoom: session.zoom,
        eyeDistance,
        // Un-negate: the file holds -clipStart, and set_clip_range negated it again on the way in.
        clipFront: -session.clipStart,
        clipBack: session.clipEnd,
        // Absolute distances from the eye become offsets from the centre. A default session has
        // fogStart 242 against an eye at 250, which is 8 in front - the same number clipFront
        // already held, as it should be.
        fogFront: eyeDistance - session.fogStart,
        fogBack: session.fogEnd - eyeDistance,
    };
}

/**
 * Write a camera back in the session's terms.
 *
 * Deliberately still writes the old absolute fog and negated clip, so a session saved by this
 * version remains readable by an older one. `eyeDistance` is added, which older versions ignore -
 * and ignoring it leaves them exactly where they were, since they assumed 250 regardless.
 */
export function sessionFromCamera(camera: CameraState): SessionCamera {
    return {
        origin: [...camera.origin] as Vec3,
        zoom: camera.zoom,
        quat4: [...camera.quat],
        fogStart: camera.eyeDistance - camera.fogFront,
        fogEnd: camera.eyeDistance + camera.fogBack,
        clipStart: -camera.clipFront,
        clipEnd: camera.clipBack,
        eyeDistance: camera.eyeDistance,
    };
}
