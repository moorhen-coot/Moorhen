/**
 * The two directions between a live scene and a movie.
 *
 * Capture reads the scene into a keyframe. Apply writes a sampled frame back. Everything a movie
 * does to a scene passes through one of them, so they are the place where "what a keyframe means"
 * stops being a comment on a type and becomes behaviour.
 *
 * WHAT A HOST IS
 *
 * Neither function touches the renderer, the store or React. They take a host that exposes only
 * what they need - the camera, the fadeable objects, and the scene's animatable quantities - in
 * the same way movieCamera takes a CameraHost. The adapter that builds one of these out of
 * MGWebGL, the Redux store and the molecule list belongs with the movie panel; keeping it out of
 * here is what lets a movie be exercised without a GL context.
 *
 * THE CAMERA IS CAPTURED BUT NOT APPLIED
 *
 * An asymmetry worth stating, because it looks like an omission. Capture reads the camera freely:
 * reading cannot race anything. Applying is different - the camera has one owner, and a movie
 * drives it by holding it (holdCameraForMovie) so that reconciliation, centring and the auto-slab
 * defer for the movie's duration. If this module also wrote the camera it would be a second
 * writer, which is precisely what the controller exists to prevent. So applySample writes
 * everything except the camera, and the hold writes the camera.
 */

import type { CameraState } from "../WebGLgComponents/cameraController";
import { clampFade, isFaded } from "../WebGLgComponents/objectFade";
import type { Keyframe, MovieSample, SceneKeyframe, Vec3 } from "./cameraPath";

/**
 * One thing a movie can fade, as this module needs to see it.
 *
 * The grain is a molecule *representation* rather than a molecule, because that is the grain at
 * which the renderer can actually do it: a representation owns its buffers, so fading it is one
 * uniform per buffer and no geometry is touched. It is also the grain people want - a surface
 * dissolving to leave the ribbons it was wrapped around is the shot that makes this feature worth
 * having. A whole molecule fading is then every one of its representations fading, which is a
 * grouping the panel can offer without this module knowing about it.
 *
 * A 3D object of type `mesh` is fadeable on the same terms, since it too owns its buffer.
 *
 * NOT EVERYTHING IN A SCENE CAN FADE
 *
 * 3D primitives - spheres, cylinders and the rest - are batched across objects into shared
 * instanced buffers, so one of them cannot be faded without splitting a batch, and splitting
 * batches is the opposite of what the instancer is for. They are simply not offered here. The
 * same is true of every object in a WebGL1 context, where the shaders have no fade uniform at all
 * (MGWebGL.supportsObjectFading). In both cases the honest thing is for the host to leave the
 * object out, and for the panel to say so, rather than for a movie to record fades that will not
 * happen.
 */
export interface FadeableObject {
    /**
     * Stable across a save and a reload.
     *
     * A representation's uniqueId now survives a session round trip, which it did not until
     * recently; a movie keyed on the ids it used to mint afresh would have lost every fade the
     * moment the session was reopened.
     */
    id: string;
    /** How solid it is at this moment, 0 to 1. */
    opacity: number;
    /** Make it this solid. */
    setOpacity(value: number): void;
}

/**
 * The scene's animatable quantities, read and written whole.
 *
 * Whole rather than field by field because that is how a keyframe holds them, and because the
 * host - which will be dispatching to a store - can then decide for itself how to batch the
 * writes. Modes are absent on purpose: whether shadows or SSAO are on belongs to the movie's
 * settings, since there is no halfway between on and off to interpolate.
 */
export interface SceneQuantities {
    read(): SceneKeyframe;
    write(scene: SceneKeyframe): void;
}

export interface SceneHost {
    /** Where the camera is now. Read only; writing it is the camera hold's business. */
    cameraState(): Readonly<CameraState>;
    /** Everything in the scene that a movie could fade, now. */
    fadeable(): FadeableObject[];
    scene: SceneQuantities;
}

/**
 * The scene as a keyframe.
 *
 * The camera and the scene's quantities are recorded in full: they have one value each, that value
 * is always interesting, and a movie that held the camera to account while letting the lighting
 * drift with whatever the user last touched would be worse than useless.
 *
 * OPACITY IS RECORDED ONLY WHERE SOMETHING IS ACTUALLY FADED
 *
 * This used to record every fadeable object, on the same "a captured keyframe has an answer for
 * everything" reasoning. In the panel that was plainly wrong. Every keyframe listed every
 * representation of every molecule, all sitting at 1.00, so the list was long and said nothing -
 * and because the picker offers objects the movie does not yet animate, there were never any left
 * to offer and "Fade an object" was permanently empty.
 *
 * Absent already means the right thing: not animated, so left as the scene has it. An object at
 * full opacity is exactly that. Recording it added a row to the UI and a line to the file to say
 * "unchanged", and converted a design of "only what differs, with a picker for the rest" into
 * "everything, always".
 *
 * An object that is faded *anywhere* is still present at every keyframe, because introduceObject
 * puts it in all of them - which is what makes a fade interpolate rather than jump.
 */
export const captureKeyframe = (host: SceneHost): Keyframe => {
    const camera = host.cameraState();
    const opacity: Record<string, number> = {};
    host.fadeable().forEach(object => {
        const fade = clampFade(object.opacity);
        if (isFaded(fade)) opacity[object.id] = fade;
    });

    return {
        // Copied, not referenced. The controller hands back its live arrays so that in-place
        // mutation keeps working for the renderer; a keyframe that held one would quietly follow
        // the camera around instead of remembering where it was.
        quat: [camera.quat[0], camera.quat[1], camera.quat[2], camera.quat[3]],
        origin: [camera.origin[0], camera.origin[1], camera.origin[2]] as Vec3,
        zoom: camera.zoom,
        clipFront: camera.clipFront,
        clipBack: camera.clipBack,
        fogFront: camera.fogFront,
        fogBack: camera.fogBack,
        opacity,
        scene: { ...host.scene.read() },
    };
};

/**
 * A sampled frame, written back to the scene.
 *
 * Everything except the camera; see the note at the top of this file.
 *
 * ABSENT MEANS UNTOUCHED, IN BOTH MAPS
 *
 * An object the sample says nothing about keeps the opacity the user gave it, and a scene quantity
 * the sample omits is left alone. That is what makes a camera-only movie - a ligand tour, say -
 * playable over whatever the user has on screen, instead of asserting a lighting rig and a set of
 * opacities it never chose. It also means an object added to the scene after a movie was authored
 * simply carries on being itself rather than snapping to invisible.
 *
 * The converse case - an id in the sample with nothing in the scene answering to it, because the
 * object was deleted - is silently ignored. There is nothing useful to do about it mid-frame, and
 * a movie that outlives one of its objects should still play.
 */
export const applySample = (host: SceneHost, sample: MovieSample): void => {
    const wanted = sample.opacity ?? {};
    host.fadeable().forEach(object => {
        const value = wanted[object.id];
        if (value === undefined) return;
        const fade = clampFade(value);
        // Nothing is gained by writing an opacity that is already set, and something is lost: in
        // the renderer this ends in setAlphaMultiplier, which decides whether a buffer counts as
        // transparent and so whether it joins the depth-peeling layers. Held frames and the long
        // flat stretches of an eased fade are the common case, not the rare one.
        if (object.opacity !== fade) object.setOpacity(fade);
    });

    if (sample.scene && Object.keys(sample.scene).length > 0) {
        host.scene.write(sample.scene);
    }
};
