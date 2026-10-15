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
import { RootState, setOrigin, setQuat, setZoom } from "@/store";
import {
    addObjectToMovie, appendKeyframe, removeKeyframe, removeObjectFromMovie, reorderKeyframe,
    selectKeyframe, setMovieName, spreadSceneFromKeyframe, updateKeyframe, updateMotion,
    updateObjectOpacity, updateSegment,
} from "@/store";
import { useMoorhenInstance } from "@/InstanceManager";
import { documentDuration, documentFrameCount, movieProblems } from "@/utils/movieDocument";
import { animatedObjects } from "@/utils/movieEditing";
import { captureKeyframe } from "@/utils/sceneKeyframe";
import { fadeableObjects, sceneHostFrom, type NamedFadeable, type SceneHostInputs } from "@/utils/sceneHostAdapter";
import { previewMovie, type PreviewHandle } from "@/utils/MoorhenMovieSpike";
import type { Motion } from "@/utils/cameraPath";
import { SidePanelContainer } from "../utils/SidePanelContainer";

const MOTIONS: Motion["kind"][] = ["move", "hold", "spin", "rock"];

export const MoviePanel = () => {
    const dispatch = useDispatch();
    const store = useStore<RootState>();
    const moorhenInstance = useMoorhenInstance();

    const document = useSelector((state: RootState) => state.movie.document);
    const selected = useSelector((state: RootState) => state.movie.selected);
    const molecules = useSelector((state: RootState) => state.molecules.moleculeList);
    const threeDObjects = useSelector((state: RootState) => state.threeDObjects.objects);
    const displayBuffers = useSelector((state: RootState) => state.glRef.displayBuffers);

    const [status, setStatus] = useState<string>("");
    // Both: the ref is what stop() is called on, and the flag is what the button renders from.
    // A ref alone would not re-render, so the button would stay saying "Play" while playing.
    const previewRef = useRef<PreviewHandle | null>(null);
    const [playing, setPlaying] = useState<boolean>(false);
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
     * Leave the store agreeing with where the camera actually is.
     *
     * MoorhenWebMG keeps a reconciling effect on [zoom, quat, origin] that compares the store
     * against the renderer and, on any disagreement, *eases the camera back to the store*. So a
     * programmatic move that does not update the store does not move the camera: it moves it and
     * is then animated back a moment later.
     *
     * This is the half of the camera migration that has not happened yet. The controller's
     * `settle` exists to replace that effect with one that defers to whoever is driving, and
     * nothing calls it yet - so until it does, every mover here has to end with this. One function
     * rather than two copies, so that it is one thing to delete when settle lands.
     */
    const agreeWithCamera = useCallback(() => {
        const camera = glRef?.current?.cameraController.state;
        if (!camera) return;
        dispatch(setOrigin([camera.origin[0], camera.origin[1], camera.origin[2]]));
        dispatch(setQuat([camera.quat[0], camera.quat[1], camera.quat[2], camera.quat[3]]));
        dispatch(setZoom(camera.zoom));
    }, [glRef, dispatch]);

    const capture = useCallback(() => {
        if (!hostInputs) return null;
        return captureKeyframe(sceneHostFrom(hostInputs));
    }, [hostInputs]);

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

        // After the move rather than before, so that when the reconciling effect runs the store
        // and the camera already agree and it has nothing to do. See agreeWithCamera.
        agreeWithCamera();
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
                // Stay where the movie ends. The spike's preview button restores the view by
                // default, which is right for "show me this once"; here the playing is the work,
                // and snapping back to wherever Play was pressed reads as the movie undoing
                // itself.
                restoreView: false,
                // While the camera is still held, so the reconciling effect never gets a chance
                // to see the store disagreeing and ease the view back.
                onEnd: agreeWithCamera,
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
                style={{
                    border: isSelected ? "2px solid var(--moorhen-primary, #3f51b5)" : "1px solid #ccc",
                    borderRadius: "6px", padding: "0.5rem", marginBottom: "0.25rem",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <strong style={{ flex: 1 }}>Keyframe {index + 1}</strong>
                    <MoorhenButton onClick={() => goTo(index)}>Go to</MoorhenButton>
                    <MoorhenButton onClick={() => updateFromView(index)}>Update</MoorhenButton>
                    <MoorhenButton onClick={() => dispatch(removeKeyframe(index))}>Delete</MoorhenButton>
                </div>

                <div style={{ fontSize: "0.75rem", opacity: 0.75 }}>
                    zoom {keyframe.zoom.toFixed(3)} · centre{" "}
                    {keyframe.origin.map(value => (-value).toFixed(1)).join(", ")} · clip{" "}
                    {keyframe.clipFront.toFixed(0)}/{keyframe.clipBack.toFixed(0)} · fog{" "}
                    {keyframe.fogFront.toFixed(0)}/{keyframe.fogBack.toFixed(0)}
                </div>

                {isSelected && (
                    <MoorhenStack>
                        <div style={{ display: "flex", gap: "0.25rem" }}>
                            <MoorhenButton onClick={() => dispatch(spreadSceneFromKeyframe(index))}>
                                Apply this frame&apos;s scene to all
                            </MoorhenButton>
                            {index > 0 && (
                                <MoorhenButton onClick={() => dispatch(reorderKeyframe({ from: index, to: index - 1 }))}>
                                    Move up
                                </MoorhenButton>
                            )}
                            {index < keyframes.length - 1 && (
                                <MoorhenButton onClick={() => dispatch(reorderKeyframe({ from: index, to: index + 1 }))}>
                                    Move down
                                </MoorhenButton>
                            )}
                        </div>

                        {faded.map(id => (
                            <div key={id} style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                <MoorhenSlider
                                    sliderTitle={fadeableById.get(id)?.label ?? `${id.slice(0, 8)} (not in this scene)`}
                                    minVal={0}
                                    maxVal={1}
                                    decimalPlaces={2}
                                    value={keyframe.opacity?.[id] ?? 1}
                                    setValue={value =>
                                        dispatch(updateObjectOpacity({ index, id, value: value as number }))}
                                />
                                <MoorhenButton onClick={() => dispatch(removeObjectFromMovie(id))}>×</MoorhenButton>
                            </div>
                        ))}

                        <MoorhenSelect
                            label="Fade an object"
                            value=""
                            onChange={event => {
                                const id = event.target.value;
                                if (!id) return;
                                // Introduced at zero everywhere, then set to whatever it is now at
                                // this keyframe - so adding an object does not change what the
                                // movie looks like here, and does hide it in the frames before.
                                dispatch(addObjectToMovie({ id, value: 0 }));
                                dispatch(updateObjectOpacity({
                                    index, id, value: fadeableById.get(id)?.opacity ?? 1,
                                }));
                            }}
                        >
                            <option value="">Choose...</option>
                            {fadeable
                                .filter(object => !movieObjects.includes(object.id))
                                .map(object => (
                                    <option key={object.id} value={object.id}>{object.label}</option>
                                ))}
                        </MoorhenSelect>
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
                </div>
                {problems.length > 0 && (
                    <div style={{ fontSize: "0.8rem", color: "var(--moorhen-warning, #b26a00)" }}>
                        {problems.join("; ")}
                    </div>
                )}
                {status && <div style={{ fontSize: "0.8rem", opacity: 0.8 }}>{status}</div>}

                <div style={{ display: "flex", gap: "0.25rem" }}>
                    <MoorhenButton onClick={addFromView}>Add keyframe from this view</MoorhenButton>
                    <MoorhenButton onClick={play}>{playing ? "Stop" : "Play"}</MoorhenButton>
                </div>

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
