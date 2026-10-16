/**
 * Authoring a movie.
 *
 * A vertical list of keyframes with the segments between them, because the panel is tall and
 * narrow. A horizontal timeline is the usual shape for this, and it is the wrong one here: screens
 * are wider than they are tall, which is exactly why Moorhen puts its panels at the sides, and a
 * horizontal timeline squeezed into a 450px column would show about three keyframes.
 *
 * Reading downwards also makes the structure visible. A keyframe card is a view; between two of
 * them sits the segment that gets from one to the other, with its own duration and motion. That is
 * the model - separate lists with one segment per gap - rather than a diagram of it, so deleting a
 * keyframe visibly merges two segments into one.
 *
 * WHAT IS NOT HERE
 *
 * The movie's own scene settings - shadows, SSAO, edge detection - are in the scene settings
 * panel, because they are the scene's settings and a movie simply records them. Only the things
 * that vary *within* a movie are edited here.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector, useStore } from "react-redux";
import { MoorhenStack } from "@/components/interface-base";
import { MoorhenButton, MoorhenSelect, MoorhenSlider, MoorhenTextInput } from "@/components/inputs";
import { MoorhenNumberInput } from "@/components/inputs";
import { RootState } from "@/store";
import {
    addObjectToMovie, appendKeyframe, removeKeyframe, removeObjectFromMovie, reorderKeyframe,
    selectKeyframe, setMovieDocument, setMovieFileName, setMovieName, spreadSceneFromKeyframe,
    updateKeyframe, updateMotion, updateMovieOutput, updateObjectOpacity, updateSegment,
} from "@/store";
import { useMoorhenInstance } from "@/InstanceManager";
import { documentDuration, documentFrameCount, movieProblems } from "@/utils/movieDocument";
import { animatedObjects } from "@/utils/movieEditing";
import { applySample, captureKeyframe } from "@/utils/sceneKeyframe";
import { drawThenCapture } from "@/utils/keyframeThumbnail";
import { fadeableObjects, sceneHostFrom, type NamedFadeable, type SceneHostInputs } from "@/utils/sceneHostAdapter";
import { downloadMovie, previewMovie, recordMovieToMp4, type PreviewHandle } from "@/utils/moviePlayer";
import { MOVIE_EXTENSION, MovieFileError, packMovie, unpackMovie } from "@/utils/movieContainer";
import { MoorhenTimeCapsule } from "@/utils/MoorhenTimeCapsule";
import { moorhensession } from "@/protobuf/MoorhenSession";
import { doDownload } from "@/utils/utils";
import type { Motion, MovieSample } from "@/utils/cameraPath";
import { SidePanelContainer } from "../utils/SidePanelContainer";

const MOTIONS: Motion["kind"][] = ["move", "hold", "spin", "rock"];

export const MoviePanel = () => {
    const dispatch = useDispatch();
    const store = useStore<RootState>();
    const moorhenInstance = useMoorhenInstance();

    const document = useSelector((state: RootState) => state.movie.document);
    const selected = useSelector((state: RootState) => state.movie.selected);
    // The file this movie was last saved to or opened from. Shown rather than merely recorded:
    // once a movie can be saved and reopened, "which one am I editing" is a real question.
    const fileName = useSelector((state: RootState) => state.movie.fileName);
    const molecules = useSelector((state: RootState) => state.molecules.moleculeList);
    const threeDObjects = useSelector((state: RootState) => state.threeDObjects.objects);
    const displayBuffers = useSelector((state: RootState) => state.glRef.displayBuffers);

    const [status, setStatus] = useState<string>("");
    // Both: the ref is what stop() is called on, and the flag is what the button renders from.
    // A ref alone would not re-render, so the button would stay saying "Play" while playing.
    const previewRef = useRef<PreviewHandle | null>(null);
    const [playing, setPlaying] = useState<boolean>(false);
    // Saving, opening and exporting all take long enough to need the panel to say so, and none of
    // them should be startable twice.
    const [busy, setBusy] = useState<boolean>(false);
    const openInputRef = useRef<HTMLInputElement | null>(null);
    const glRef = moorhenInstance.getVideoRecorderRef().current?.glRef;

    /**
     * The live scene, in the shape captureKeyframe wants.
     *
     * Rebuilt whenever the scene changes rather than held, because what is fadeable changes as
     * molecules and representations come and go - and a stale host would offer a slider for a
     * representation that has been deleted.
     */
    const hostInputs: SceneHostInputs | null = useMemo(() => glRef ? {
        glRef,
        molecules,
        threeDObjects,
        displayBuffers,
        // Read at the moment of capture rather than subscribed: a keyframe records what the scene
        // was when the button was pressed.
        get sceneSettings() { return store.getState().sceneSettings; },
        writeScene: () => { /* applying a sample is #163's business; capture does not write. */ },
        redraw: () => glRef.current?.drawScene(),
    } as SceneHostInputs : null, [glRef, molecules, threeDObjects, displayBuffers, store]);

    const fadeable: NamedFadeable[] = useMemo(
        () => hostInputs ? fadeableObjects(hostInputs) : [], [hostInputs]);
    const fadeableById = useMemo(
        () => new Map(fadeable.map(object => [object.id, object])), [fadeable]);

    const keyframes = document.path.keyframes;
    const segments = document.path.segments;
    const problems = movieProblems(document);
    const movieObjects = animatedObjects(document);

    /**
     * What to do with each frame of a playing movie, beyond the camera.
     *
     * applySample is what puts the fades on the scene, and until now nothing called it outside its
     * tests: playback drove the camera and dropped the opacity half of every sample on the floor,
     * so an authored fade was saved correctly, reloaded correctly, and never seen.
     *
     * The fadeable list is gathered once, when play starts, rather than on every frame. Rebuilding
     * it per frame means walking every molecule's representations and filtering the display buffers
     * sixty times a second, which is the sort of thing this renderer is careful not to do - and the
     * set of objects cannot change while a movie is playing anyway.
     */
    const playbackApplier = useCallback(() => {
        if (!hostInputs) return undefined;

        // No redraw from inside a fade, which is not an optimisation but a correctness fix.
        //
        // A sample is produced from *inside* drawScene: the renderer ticks the camera at the top
        // of a frame, the controller asks the movie's sampler where to be, and this runs. Setting
        // an opacity normally asks for a redraw - right when a slider moves, catastrophic here,
        // because that redraw re-enters drawScene, which ticks again, which samples again at a
        // slightly later time. During a fade every nested sample differs from the last, so the
        // "unchanged, skip it" guard never fires and the recursion only unwinds once the fade
        // stops changing. A whole segment was being consumed inside one animation frame, which
        // looked like the fade-in being skipped with the odd frame of it flashing past.
        //
        // The player draws every frame itself, so there is nothing to ask for.
        const quiet: SceneHostInputs = { ...hostInputs, redraw: () => { /* the player draws */ } };
        const host = sceneHostFrom(quiet);
        const objects = fadeableObjects(quiet);
        const frozen = { ...host, fadeable: () => objects };
        return (sample: MovieSample) => applySample(frozen, sample);
    }, [hostInputs]);

    /**
     * The scene as a keyframe, picture and all.
     *
     * The picture is taken here rather than inside captureKeyframe because captureKeyframe knows
     * nothing about canvases - it takes a host of plain values so it can be tested without a
     * renderer, and a DOM dependency would end that.
     */
    const capture = useCallback(() => {
        if (!hostInputs) return null;
        const keyframe = captureKeyframe(sceneHostFrom(hostInputs));
        const gl = glRef?.current;
        const thumbnail = gl ? drawThenCapture(gl) : undefined;
        return thumbnail ? { ...keyframe, thumbnail } : keyframe;
    }, [hostInputs, glRef]);

    const addFromView = () => {
        const keyframe = capture();
        if (!keyframe) {
            setStatus("No 3D view yet");
            return;
        }
        dispatch(appendKeyframe(keyframe));
        setStatus(`Keyframe ${keyframes.length + 1} captured`);
    };

    const updateFromView = (index: number) => {
        const keyframe = capture();
        if (!keyframe) return;
        dispatch(updateKeyframe({ index, keyframe }));
        setStatus(`Keyframe ${index + 1} updated to this view`);
    };

    /**
     * Put the camera where a keyframe says, so it can be judged and corrected.
     *
     * Through a hold rather than by writing the camera directly, for the same reason a movie does:
     * the camera has one owner. `restoreView` is false here - the whole point is to land on the
     * keyframe and stay there - and the hold is released immediately, which leaves the view where
     * it was put and hands the camera back to whatever wants it next.
     */
    const goTo = (index: number) => {
        const keyframe = keyframes[index];
        const gl = glRef?.current;
        if (!keyframe || !gl) return;
        dispatch(selectKeyframe(index));

        // Through moveCameraTo rather than a movie hold, which is what this used to do and was
        // wrong twice over.
        //
        // A hold *acquires* the camera, and acquiring supersedes whatever was driving it. That is
        // right for a movie, which is meant to take over, and wrong for a button that should put
        // the view somewhere and get out of the way - it cancelled any move in flight and left the
        // camera between owners. moveCameraTo instead declines when another driver is active.
        //
        // And its instant branch redraws. The hold did not, so the camera was moved and the screen
        // was not: the view only caught up when something else happened to cause a frame, which
        // from the outside looked like the button doing nothing until the mouse entered the canvas.
        const controller = gl.cameraController;
        const previousPolicy = controller.slabPolicy;
        // The keyframe's own slab, not one re-derived from its zoom by the auto policy. The policy
        // is a plain field that is consulted on the next write, so putting it back straight away
        // costs nothing here and leaves the user's auto-clip setting in force for whatever they do
        // next.
        controller.slabPolicy = { kind: "manual" };
        try {
            gl.moveCameraTo({
                // Copied element by element: these come out of Redux, which freezes state in
                // development, and the camera writes its arrays in place.
                quat: [keyframe.quat[0], keyframe.quat[1], keyframe.quat[2], keyframe.quat[3]],
                origin: [keyframe.origin[0], keyframe.origin[1], keyframe.origin[2]],
                zoom: keyframe.zoom,
                clipFront: keyframe.clipFront,
                clipBack: keyframe.clipBack,
                fogFront: keyframe.fogFront,
                fogBack: keyframe.fogBack,
            }, { kind: "instant" });
        } finally {
            controller.slabPolicy = previousPolicy;
        }

        // And the fades. Opening a keyframe should show the keyframe, not its camera angle over
        // whatever the scene happens to be faded to - otherwise judging a fade means pressing Play
        // and watching it go past.
        //
        // Only what this keyframe names, which is the rule playback follows too: an object the
        // movie says nothing about is the scene's business, not the movie's.
        const fades = keyframe.opacity ?? {};
        fadeable.forEach(object => {
            const wanted = fades[object.id];
            if (wanted !== undefined && object.opacity !== wanted) object.setOpacity(wanted);
        });
    };

    const play = async () => {
        if (previewRef.current) {
            previewRef.current.stop();
            return;
        }
        if (!glRef?.current) {
            setStatus("No 3D view yet");
            return;
        }
        if (keyframes.length < 2) {
            setStatus("A movie needs at least two keyframes");
            return;
        }
        try {
            const handle = previewMovie(glRef, document.path, {
                onSample: playbackApplier(),
                // Stay where the movie ends. previewMovie restores the view by
                // default, which is right for "show me this once"; here the playing is the work,
                // and snapping back to wherever Play was pressed reads as the movie undoing
                // itself.
                restoreView: false,
                onProgress: (seconds, total) =>
                    setStatus(`Playing ${seconds.toFixed(1)}s of ${total.toFixed(1)}s`),
            });
            previewRef.current = handle;
            setPlaying(true);
            await handle.finished;
            setStatus("Played");
        } finally {
            previewRef.current = null;
            setPlaying(false);
        }
    };

    /**
     * The movie and the scene it was authored against, as one file.
     *
     * The session goes in. A movie without one is a few kilobytes of camera path that needs the
     * right scene already open to mean anything; with one it opens anywhere, which is what makes
     * it a saved movie rather than a note to self. The three lines that fetch and encode the
     * session are the ones ManageSession uses to write a .pb, so what lands in the container is
     * exactly what loadSessionFromArrayBuffer reads back.
     */
    const saveMovie = async () => {
        setBusy(true);
        try {
            setStatus("Fetching the session...");
            const timeCapsule = moorhenInstance.getTimeCapsuleRef().current;
            const sessionData = await timeCapsule.fetchSession(true);
            const sessionBytes = moorhensession.Session
                .encode(moorhensession.Session.fromObject(sessionData)).finish();

            setStatus("Packing...");
            const blob = await packMovie(
                { movie: document, session: sessionBytes },
                { type: "blob", writtenBy: "Moorhen" }) as Blob;

            const name = (document.name || "moorhen_movie").replace(/[^\w.-]+/g, "_");
            doDownload([blob], `${name}${MOVIE_EXTENSION}`);
            dispatch(setMovieFileName(`${name}${MOVIE_EXTENSION}`));
            setStatus(`Saved ${(blob.size / 1e6).toFixed(2)} MB`);
        } catch (err) {
            console.error(err);
            setStatus(`Could not save: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setBusy(false);
        }
    };

    /**
     * A movie file, opened.
     *
     * The session is restored first and waited for. Loading the document without its scene would
     * leave a movie whose keyframes name objects that are not there, and whose camera path tours
     * whatever happens to be open - which looks like the file being wrong rather than being early.
     */
    const openMovie = async (file: File) => {
        setBusy(true);
        try {
            setStatus(`Opening ${file.name}...`);
            const container = await unpackMovie(await file.arrayBuffer());

            if (container.session) {
                setStatus("Restoring the scene the movie was made with...");
                const status = await MoorhenTimeCapsule.loadSessionFromArrayBuffer(
                    container.session.buffer as ArrayBuffer, moorhenInstance);
                if (status === -1) {
                    setStatus("The movie opened, but its scene would not load");
                    return;
                }
            }

            dispatch(setMovieDocument(container.movie));
            dispatch(setMovieFileName(file.name));
            setStatus(container.session
                ? `Opened ${file.name} with its scene`
                : `Opened ${file.name}. It carries no scene, so it will play over this one.`);
        } catch (err) {
            console.error(err);
            // A MovieFileError already says which thing is wrong with the file; anything else is a
            // surprise and should look like one.
            setStatus(err instanceof MovieFileError
                ? err.message
                : `Could not open: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setBusy(false);
        }
    };

    /**
     * The movie, rendered out as an MP4.
     *
     * Refused outright when the document has problems, rather than started and failed somewhere in
     * the middle: an odd output width is rejected by some encoders and silently cropped by others,
     * and finding that out after waiting for a render is the worst way to learn it.
     */
    const exportMovie = async () => {
        if (problems.length > 0) {
            setStatus(`Cannot export: ${problems.join("; ")}`);
            return;
        }
        if (!glRef?.current) {
            setStatus("No 3D view yet");
            return;
        }
        setBusy(true);
        try {
            const result = await recordMovieToMp4(glRef, document.path, {
                onSample: playbackApplier(),
                width: document.output.width,
                height: document.output.height,
                fps: document.output.fps,
                onProgress: (done, total) => {
                    if (done % 10 === 0 || done === total) {
                        setStatus(`Rendering frame ${done} of ${total}...`);
                    }
                },
            });
            const name = (document.name || "moorhen_movie").replace(/[^\w.-]+/g, "_");
            downloadMovie(result.blob, `${name}.mp4`);
            setStatus(
                `${result.frames} frames, ${result.width}x${result.height}, ` +
                `${(result.blob.size / 1e6).toFixed(1)} MB, rendered in ` +
                `${result.elapsedSeconds.toFixed(1)}s`);
        } catch (err) {
            console.error(err);
            setStatus(`Could not export: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setBusy(false);
        }
    };

    const keyframeCard = (index: number) => {
        const keyframe = keyframes[index];
        const isSelected = selected === index;
        // Only what this keyframe actually animates, with a picker to introduce more. A molecule
        // with ribbons, bonds and a surface would otherwise put three rows in every card whether
        // or not the movie touches them.
        const faded = Object.keys(keyframe.opacity ?? {}).sort();

        return (
            <div
                key={index}
                className="moorhen__movie-keyframe"
                // The whole card opens the frame. A "Go to" button beside "Update" and "Delete"
                // read as a third thing you might do to the keyframe, when it is really the one
                // thing you do with it; clicking the card is what people try first anyway.
                onClick={() => goTo(index)}
                style={{
                    border: isSelected ? "2px solid var(--moorhen-primary, #3f51b5)" : "1px solid #ccc",
                    borderRadius: "6px", padding: "0.5rem", marginBottom: "0.25rem",
                    cursor: isSelected ? "default" : "pointer",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <strong style={{ flex: 1 }}>Keyframe {index + 1}</strong>
                    {/* Buttons inside a clickable card have to stop the click reaching it, or
                        deleting a keyframe would first open it. */}
                    <MoorhenButton onClick={event => { event.stopPropagation(); updateFromView(index); }}>
                        Update
                    </MoorhenButton>
                    <MoorhenButton
                        variant="danger"
                        onClick={event => { event.stopPropagation(); dispatch(removeKeyframe(index)); }}
                    >
                        Delete
                    </MoorhenButton>
                </div>

                {keyframe.thumbnail ? (
                    <img
                        src={keyframe.thumbnail}
                        alt={`Keyframe ${index + 1}`}
                        // Full width of the card, its own aspect ratio, and never a drag target -
                        // the card beneath it is what responds to a click.
                        style={{
                            display: "block", width: "100%", height: "auto",
                            borderRadius: "4px", pointerEvents: "none",
                        }}
                        draggable={false}
                    />
                ) : (
                    // A movie written by hand, opened from an older file, or a shot whose picture
                    // could not be taken. The numbers are poor but they are not nothing.
                    <div style={{ fontSize: "0.75rem", opacity: 0.75 }}>
                        zoom {keyframe.zoom.toFixed(3)} · centre{" "}
                        {keyframe.origin.map(value => (-value).toFixed(1)).join(", ")}
                    </div>
                )}

                {isSelected && (
                    <MoorhenStack>
                        <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
                            <MoorhenButton onClick={event => { event.stopPropagation(); dispatch(spreadSceneFromKeyframe(index)); }}>
                                Scene to all
                            </MoorhenButton>
                            <span style={{ flex: 1 }} />
                            <MoorhenButton
                                type="icon-only"
                                icon="MatSymArrowUpward"
                                disabled={index === 0}
                                onClick={event => { event.stopPropagation(); dispatch(reorderKeyframe({ from: index, to: index - 1 })); }}
                            />
                            <MoorhenButton
                                type="icon-only"
                                icon="MatSymArrowDownward"
                                disabled={index === keyframes.length - 1}
                                onClick={event => { event.stopPropagation(); dispatch(reorderKeyframe({ from: index, to: index + 1 })); }}
                            />
                        </div>

                        {faded.map(id => (
                            <div key={id} style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
                                 onClick={event => event.stopPropagation()}>
                                <MoorhenSlider
                                    sliderTitle={fadeableById.get(id)?.label ?? `${id.slice(0, 8)} (not in this scene)`}
                                    minVal={0}
                                    maxVal={1}
                                    decimalPlaces={2}
                                    value={keyframe.opacity?.[id] ?? 1}
                                    setValue={value => {
                                        // Present at every keyframe first, solid where it is not
                                        // already mentioned. An object the movie animates at one
                                        // keyframe and not the next is not interpolated between
                                        // them - it is set at one and left alone at the other - so
                                        // fading it here and saying nothing elsewhere means it
                                        // simply stays faded for the rest of the movie. Filling
                                        // the gaps with 1 is what makes this a fade rather than a
                                        // one-way change, and introduceObject only fills gaps, so
                                        // keyframes that already say something keep saying it.
                                        dispatch(addObjectToMovie({ id, value: 1 }));
                                        dispatch(updateObjectOpacity({ index, id, value: value as number }));
                                        // And show it. The slider edits the movie, which is a
                                        // description of what will happen later; without this the
                                        // control appeared to do nothing until you pressed Play.
                                        // The keyframe being edited is the one on screen, so
                                        // applying it live is both honest and what you want.
                                        fadeableById.get(id)?.setOpacity(value as number);
                                    }}
                                />
                                <MoorhenButton
                                    type="icon-only"
                                    icon="MatSymClose"
                                    variant="danger"
                                    onClick={event => {
                                        event.stopPropagation();
                                        // Out of the movie entirely, so the scene has it back:
                                        // put it back to solid rather than leaving it wherever the
                                        // fade had got to.
                                        dispatch(removeObjectFromMovie(id));
                                        fadeableById.get(id)?.setOpacity(1);
                                    }}
                                />
                            </div>
                        ))}

                        {/* Wrapped rather than given its own handler: MoorhenSelect takes no
                            onClick, and a select inside a clickable card must not re-open it. */}
                        <div onClick={event => event.stopPropagation()}>
                        {/* An empty picker is indistinguishable from a broken one, so say which.
                            There are two ways to have nothing to offer and they want different
                            answers. */}
                        {fadeable.length === 0 ? (
                            <span style={{ fontSize: "0.8rem", opacity: 0.8 }}>
                                {glRef?.current?.supportsObjectFading === false
                                    ? "This browser is using WebGL1, where objects cannot be faded."
                                    : "Nothing here can be faded yet. Load a molecule, or add a mesh object."}
                            </span>
                        ) : fadeable.every(object => movieObjects.includes(object.id)) ? (
                            <span style={{ fontSize: "0.8rem", opacity: 0.8 }}>
                                Every object in the scene is already in the movie.
                            </span>
                        ) : (
                        <MoorhenSelect
                            label="Fade an object"
                            value=""
                            onChange={event => {
                                const id = event.target.value;
                                if (!id) return;
                                // Introduced at the opacity it has right now, at every keyframe,
                                // so that picking an object changes nothing about how the movie
                                // looks. It used to go in at zero everywhere, which meant
                                // choosing an object made it vanish from every keyframe but this
                                // one - a surprising amount to happen on a selection.
                                //
                                // Every keyframe, because an object the movie mentions at one and
                                // not the next is not interpolated between them.
                                dispatch(addObjectToMovie({ id, value: fadeableById.get(id)?.opacity ?? 1 }));
                            }}
                        >
                            <option value="">Choose...</option>
                            {fadeable
                                .filter(object => !movieObjects.includes(object.id))
                                .map(object => (
                                    <option key={object.id} value={object.id}>{object.label}</option>
                                ))}
                        </MoorhenSelect>
                        )}
                        </div>
                    </MoorhenStack>
                )}
            </div>
        );
    };

    const segmentRow = (index: number) => {
        const segment = segments[index];
        if (!segment) return null;
        return (
            <div
                key={`segment-${index}`}
                style={{
                    display: "flex", alignItems: "center", gap: "0.25rem",
                    padding: "0.25rem 1rem", marginBottom: "0.25rem",
                    borderLeft: "3px solid #bbb",
                }}
            >
                <MoorhenNumberInput
                    label="s"
                    width="4rem"
                    decimalDigits={1}
                    value={segment.seconds}
                    setValue={value => {
                        dispatch(updateSegment({ index, change: { seconds: value } }));
                    }}
                />
                <MoorhenSelect
                    inline
                    value={segment.motion.kind}
                    onChange={event =>
                        dispatch(updateMotion({ index, motion: { kind: event.target.value } as Motion }))}
                >
                    {MOTIONS.map(kind => <option key={kind} value={kind}>{kind}</option>)}
                </MoorhenSelect>
            </div>
        );
    };

    return (
        <SidePanelContainer title="Movie">
            <MoorhenStack>
                <MoorhenTextInput
                    label="Name"
                    text={document.name}
                    setText={name => dispatch(setMovieName(name))}
                />

                <div style={{ fontSize: "0.8rem" }}>
                    {keyframes.length} keyframes · {documentDuration(document).toFixed(1)}s ·{" "}
                    {documentFrameCount(document)} frames at {document.output.fps}fps
                    {fileName && <> · {fileName}</>}
                </div>
                {problems.length > 0 && (
                    <div style={{ fontSize: "0.8rem", color: "var(--moorhen-warning, #b26a00)" }}>
                        {problems.join("; ")}
                    </div>
                )}
                {status && <div style={{ fontSize: "0.8rem", opacity: 0.8 }}>{status}</div>}

                {/* Three jobs, three groups, in the order they are done: build the movie, watch
                    it, then get it out. Lumping Play in with "Add keyframe" and Export in with
                    the file buttons made each row a list of unrelated things. */}
                <MoorhenButton onClick={addFromView}>Add keyframe from this view</MoorhenButton>

                <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
                    <MoorhenButton onClick={play}>{playing ? "Stop" : "Play"}</MoorhenButton>
                    <MoorhenButton onClick={exportMovie} disabled={busy || problems.length > 0}>
                        Export MP4…
                    </MoorhenButton>
                    <span style={{ flex: 1 }} />
                    <MoorhenButton onClick={() => openInputRef.current?.click()} disabled={busy}>
                        Open…
                    </MoorhenButton>
                    <MoorhenButton onClick={saveMovie} disabled={busy}>Save…</MoorhenButton>
                </div>
                <input
                    ref={openInputRef}
                    type="file"
                    accept={MOVIE_EXTENSION}
                    style={{ display: "none" }}
                    onChange={event => {
                        const file = event.target.files?.[0];
                        // Cleared so that choosing the same file twice still fires a change, which
                        // is exactly what reopening a movie you have just saved wants to do.
                        event.target.value = "";
                        if (file) void openMovie(file);
                    }}
                />

                <details>
                    <summary style={{ cursor: "pointer", fontSize: "0.85rem" }}>Output</summary>
                    {/* Folded away because these are set once and then left alone, while the
                        keyframe list below is where the work happens. */}
                    <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
                        <MoorhenNumberInput
                            label="fps" width="4rem" value={document.output.fps}
                            setValue={fps => { dispatch(updateMovieOutput({ fps })); }}
                        />
                        <MoorhenNumberInput
                            label="width" width="5rem" value={document.output.width}
                            setValue={width => { dispatch(updateMovieOutput({ width })); }}
                        />
                        <MoorhenNumberInput
                            label="height" width="5rem" value={document.output.height}
                            setValue={height => { dispatch(updateMovieOutput({ height })); }}
                        />
                    </div>
                </details>

                {!glRef?.current?.supportsObjectFading && (
                    <div style={{ fontSize: "0.8rem", color: "var(--moorhen-warning, #b26a00)" }}>
                        This browser is using WebGL1, where objects cannot be faded. The camera
                        will move; opacity will have no effect.
                    </div>
                )}

                {keyframes.length === 0
                    ? <span>No keyframes yet. Set up a view and add one.</span>
                    : keyframes.map((_, index) => (
                        <div key={`frame-${index}`}>
                            {keyframeCard(index)}
                            {index < segments.length && segmentRow(index)}
                        </div>
                    ))}
            </MoorhenStack>
        </SidePanelContainer>
    );
};
