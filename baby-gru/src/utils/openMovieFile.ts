/**
 * Opening a .mhm, from wherever it arrives.
 *
 * A movie file can be opened from the movie panel's own button, from File -> Open, or by being
 * dropped on the window, and all three have to do the same thing - restore the scene, load the
 * document, show the panel. This is that thing, written once: the alternative is three copies of
 * an ordering that matters, which drift until two of the three ways in are subtly wrong.
 *
 * WHY THE SESSION GOES FIRST
 *
 * The document names objects by id and tours a camera path built against a particular scene.
 * Loading it before the session would leave a movie whose keyframes refer to things that are not
 * there yet and whose path flies around whatever happened to be open - which looks like the file
 * being wrong rather than being early.
 */

import type { MoorhenInstance } from "@/InstanceManager";
import { setMovieDocument, setMovieFileName, setShownSidePanel } from "@/store";
import { MOVIE_SCENE_ID } from "@/store/userScenesSlice";
import { MoorhenTimeCapsule } from "./MoorhenTimeCapsule";
import { MovieFileError, unpackMovie } from "./movieContainer";

/** What happened, in words fit to show someone - in a status line or in a snackbar. */
export interface OpenedMovie {
    ok: boolean;
    message: string;
    /** Whether the file brought a scene with it, and so replaced what was open. */
    restoredScene: boolean;
}

/**
 * Open a movie file: restore its scene, load its document, and show the movie panel.
 *
 * @param onProgress - called with each step, for a caller that has somewhere to put it. Opening a
 *     movie means decompressing a session and rebuilding a scene, which on a large structure is
 *     long enough that silence reads as nothing having happened.
 */
export async function openMovieFile(
    file: File,
    moorhenInstance: MoorhenInstance,
    onProgress: (message: string) => void = () => { /* nowhere to say it */ },
): Promise<OpenedMovie> {
    const dispatch = moorhenInstance.store.dispatch;
    try {
        onProgress(`Opening ${file.name}...`);
        const container = await unpackMovie(await file.arrayBuffer());

        let restoredScene = false;
        if (container.session) {
            onProgress("Restoring the scene the movie was made with...");
            const status = await MoorhenTimeCapsule.loadSessionFromArrayBuffer(
                container.session.buffer as ArrayBuffer, moorhenInstance);
            if (status !== 0) {
                // The document is deliberately not loaded here. A movie over the wrong scene is
                // worse than no movie: it plays, and everything it shows is wrong.
                return {
                    ok: false,
                    restoredScene: false,
                    message: status === MoorhenTimeCapsule.NEWER_VERSION_STATUS
                        ? `${file.name} opened, but its scene would not load. ${MoorhenTimeCapsule.NEWER_VERSION_MESSAGE}`
                        : `${file.name} opened, but its scene would not load`,
                };
            }
            restoredScene = true;
        }

        dispatch(setMovieDocument(container.movie));
        dispatch(setMovieFileName(file.name));
        // Show the movie scene, whichever one the session was saved on
        if (moorhenInstance.userScene.list.some(scene => scene.id === MOVIE_SCENE_ID)) {
            await moorhenInstance.userScene.select(MOVIE_SCENE_ID);
        }
        // Show the panel. Opening a movie with nothing visibly happening is the most likely way
        // to conclude that nothing did - and the panel is where every next thing is done.
        dispatch(setShownSidePanel("movie"));

        return {
            ok: true,
            restoredScene,
            message: restoredScene
                ? `Opened ${file.name} with its scene`
                : `Opened ${file.name}. It carries no scene, so it will play over this one.`,
        };
    } catch (err) {
        console.error(err);
        // A MovieFileError already says which thing is wrong with the file - a bad zip, a missing
        // description, a format from a later version. Anything else is a surprise, and should
        // look like one rather than being dressed up as a diagnosis.
        return {
            ok: false,
            restoredScene: false,
            message: err instanceof MovieFileError
                ? err.message
                : `Could not open ${file.name}: ${err instanceof Error ? err.message : String(err)}`,
        };
    }
}
