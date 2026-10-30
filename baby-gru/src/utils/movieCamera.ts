/**
 * Lending the camera to a movie, and getting it back.
 *
 * A movie is the one thing that drives the camera frame by frame while something else - a store
 * effect, a centring request, the auto-clip policy - might reasonably want to drive it too. The
 * camera controller already knows how to settle that argument; this is the small amount of
 * bookkeeping that goes around it.
 *
 * THREE THINGS HAVE TO BE TRUE FOR THE LENGTH OF A MOVIE
 *
 * The movie holds the camera, so reconciliation defers to it. Before the controller existed this
 * was done by setting `animating` by hand, which worked because the one entry point that mattered
 * declined to start while it was set - a flag standing in for ownership, re-asserted every frame
 * because an arriving animation cleared it on the way out.
 *
 * The slab policy is manual. Under auto-clip the camera re-derives clip and fog from zoom on every
 * write, so a movie that authors its own slab would have it thrown away frame by frame. Nothing
 * noticed because no movie had authored a slab yet.
 *
 * And the view goes back exactly as it was, however the movie ends - finished, cancelled, or
 * thrown out of. The three copies of that restore logic it replaced are the reason this exists as
 * a function rather than as a comment.
 */

import { MovieSample, Movie, sampleMovie } from "./cameraPath";
import type { CameraState, CameraTarget, CameraController, SlabPolicy } from "../WebGLgComponents/cameraController";

/** A movie's hold on the camera. Release it in a `finally`. */
export interface CameraHold {
    /**
     * Drive the camera from a function of time in seconds, measured from the first frame.
     *
     * The controller is given the clock rather than reading one, so the same sampler serves a live
     * preview running on wall-clock time and an export stepping i/fps - the difference is only
     * what the renderer puts in `cameraTime`. Time is rebased on the first tick, so a sampler
     * always sees a movie starting at zero whichever clock it is being shown.
     */
    play(movie: Movie, onSample?: (sample: MovieSample) => void): void;
    /**
     * Put the camera somewhere directly, for a movie that computes its own frames rather than
     * sampling a Movie - a plain spin, say.
     *
     * An alternative to `play`, not a companion: a sampler, once set, is consulted on every tick
     * and would overwrite whatever this had just set.
     */
    set(target: CameraTarget): void;
    /** Hand the camera back: policy restored, view restored, driver released. */
    release(): void;
}

/** Only what this module touches, so the tests need no renderer. */
export interface CameraHost {
    cameraController: CameraController;
}

/** A sampled movie frame, as a target for the camera. Opacity is not the camera's business. */
export const cameraTargetFrom = (sample: MovieSample): CameraTarget => ({
    quat: [sample.quat[0], sample.quat[1], sample.quat[2], sample.quat[3]],
    origin: [sample.origin[0], sample.origin[1], sample.origin[2]],
    zoom: sample.zoom,
    clipFront: sample.clipFront,
    clipBack: sample.clipBack,
    fogFront: sample.fogFront,
    fogBack: sample.fogBack,
});

const copyOf = (state: Readonly<CameraState>): CameraState => ({
    ...state,
    quat: [...state.quat] as CameraState["quat"],
    origin: [...state.origin] as CameraState["origin"],
});

/**
 * Take the camera for a movie.
 *
 * @param restoreView  put the view back on release. A preview and an export both want this; a
 *                     movie being authored in a panel might not, since the point is to land on
 *                     the frame you were looking at.
 */
export function holdCameraForMovie(host: CameraHost, restoreView = true): CameraHold {
    const controller = host.cameraController;
    const wasLookingAt = copyOf(controller.state);
    const previousPolicy: SlabPolicy = controller.slabPolicy;

    const driver = controller.acquire("movie");
    controller.slabPolicy = { kind: "manual" };

    let released = false;

    return {
        play(movie: Movie, onSample?: (sample: MovieSample) => void) {
            let startedAt: number | null = null;
            driver.drive(seconds => {
                if (startedAt === null) startedAt = seconds;
                const sample = sampleMovie(movie, seconds - startedAt);
                // Everything else in the frame: the fades, and in time the scene's quantities.
                //
                // Here rather than in the caller's draw loop because this is the one place the
                // movie is sampled. A second sampler on another clock would drift from this one,
                // and the whole reason preview and export agree is that they differ only in which
                // clock is handed to the controller.
                onSample?.(sample);
                return cameraTargetFrom(sample);
            });
        },

        set(target: CameraTarget) {
            driver.set(target);
        },

        release() {
            if (released) return;
            released = true;
            // Policy first: a restored view should be settled under the policy the user had, not
            // under the manual one the movie needed.
            controller.slabPolicy = previousPolicy;
            if (restoreView) driver.set(wasLookingAt);
            driver.release();
        },
    };
}
