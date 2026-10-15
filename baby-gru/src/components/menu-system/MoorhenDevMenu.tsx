import { useDispatch, useSelector, useStore } from "react-redux";
import { SOURCE_DEV_TEST, TAG_SOURCE } from "../../utils/tags";
import { v4 as uuidv4 } from "uuid";
import { newVector } from "../../utils/vectorFactories";
import { useEffect, useRef, useState } from "react";
import { setOrigin } from "@/store";
import { RootState, setShownBottomPanel } from "@/store";
import { useMoorhenInstance, usePaths } from "../../InstanceManager";
import { checkerboardTexture, registerTexture } from "../../WebGLgComponents/textureRegistry";
import { centreOfObject } from "../../store/threeDObjectsSlice";
import {
    instrumentGl,
    measuredTrianglesPerFrame,
    renderStats,
    triangleBreakdownText,
    uninstrumentGl,
} from "../../WebGLgComponents/mgWebGLParts/renderStats";
import { setUseGemmi } from "../../store/generalStatesSlice";
import { setPeelOpaqueSeparately } from "../../store/sceneSettingsSlice";
import { showModal } from "../../store/modalsSlice";
import {
    addCallback,
    addFracPathOverlay,
    addImageOverlay,
    addLatexOverlay,
    addSvgPathOverlay,
    addTextOverlay,
    emptyOverlays,
} from "../../store/overlaysSlice";
import { setDoOutline } from "../../store/sceneSettingsSlice";
import { MoorhenVector, addVectors, removeVectors, removeVectorsByTag } from "../../store/vectorsSlice";
import { moorhen } from "../../types/moorhen";
import { modalKeys } from "../../utils/enums";

import { readGzippedTextFile } from "../../utils/utils";
import { PreviewHandle, describeEncoderSupport, downloadMovie, previewMovie, recordMovieToMp4, recordSpinToMp4 } from "../../utils/MoorhenMovieSpike";
import { buildLigandTour } from "../../utils/ligandTour";
import { MOVIE_EXTENSION, MovieFileError, packMovie, unpackMovie } from "../../utils/movieContainer";
import { DEFAULT_OUTPUT, documentDuration, documentFrameCount, emptyMovie, movieProblems } from "../../utils/movieDocument";
import type { MovieDocument } from "../../utils/movieDocument";
import { movieSceneFrom } from "../../utils/movieSceneSettings";
import { MoorhenTimeCapsule } from "../../utils/MoorhenTimeCapsule";
import { moorhensession } from "../../protobuf/MoorhenSession";
import { doDownload } from "../../utils/utils";
import { MoorhenFileInput, MoorhenNumberInput, MoorhenSlider, MoorhenToggle } from "../inputs";
import { MoorhenButton } from "../inputs/MoorhenButton/MoorhenButton";
import { MoorhenMenuItem, MoorhenStack } from "../interface-base";
import { MoorhenLinearProgress } from "../icons";




/**
 * A flat square carrying the test checkerboard, for checking the texture path by eye.
 *
 * The corner colours are the test. A checkerboard on its own is symmetric under a horizontal
 * flip, a vertical flip and a transpose, so the commonest texture fault there is - an inverted V
 * axis - would look entirely correct. With the quad in the xy plane and the default view looking
 * down -z with +y up, the corners should read:
 *
 *     red    top-left        green  top-right
 *     blue   bottom-left     yellow bottom-right
 *
 * Any other arrangement says what went wrong: red and blue swapped is a V flip, red and green
 * swapped is a U flip, green and blue swapped is a transpose.
 *
 * The object's colour is white so the texture shows unmodulated - it multiplies the vertex
 * colour, so any other colour would tint it.
 */
const addTexturedQuadTo = (moorhenInstance: ReturnType<typeof useMoorhenInstance>) => {
    const texture = registerTexture(checkerboardTexture());
    const half = 15;

    const uniqueId = moorhenInstance.object.create({
        type: "mesh",
        colour: "#ffffff",
        origin: [0, 0, 0],
        vertices: [-half, -half, 0, half, -half, 0, half, half, 0, -half, half, 0],
        indices: [0, 1, 2, 0, 2, 3],
        normals: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
        // Bottom-left, bottom-right, top-right, top-left - v increasing downwards, because v=0
        // is the top of the image.
        texCoords: [0, 1, 1, 1, 1, 0, 0, 0],
        texture,
        tags: { [TAG_SOURCE]: SOURCE_DEV_TEST },
    });

    const created = moorhenInstance.object.get(uniqueId);
    if (created) {
        const [x, y, z] = centreOfObject(created);
        moorhenInstance.centerOnCoordinate(x, y, z);
    }
    return uniqueId;
};

/**
 * Three planes sharing one texture, which is the instanced case.
 *
 * Three rather than one because one plane would be drawn instanced too and would look identical
 * to the non-instanced quad - it would not show whether the texture coordinate is advancing per
 * vertex or per instance. Three side by side do: if the attribute's divisor were wrong, each
 * plane would be a single flat colour taken from one texel of its own, instead of three copies
 * of the whole checkerboard.
 *
 * All three carry the same texture id, so they share a group and go out as one instanced draw -
 * which is the thing being tested. Give one of them a different texture and it becomes a second
 * group, because the texture is part of the group key.
 */
const addTexturedPlanesTo = (moorhenInstance: ReturnType<typeof useMoorhenInstance>) => {
    const texture = registerTexture(checkerboardTexture());
    const ids: string[] = [];

    for (const x of [-22, 0, 22]) {
        ids.push(moorhenInstance.object.create({
            type: "plane",
            colour: "#ffffff",
            origin: [x, 0, 0],
            scalexyz: [18, 18, 1],
            texture,
            tags: { [TAG_SOURCE]: SOURCE_DEV_TEST },
        }));
    }

    const first = moorhenInstance.object.get(ids[0]);
    if (first) {
        moorhenInstance.centerOnCoordinate(0, 0, 0);
    }
    return ids;
};

/**
 * One mesh object in two parts, each with a different texture.
 *
 * This is the shape a multi-material glTF will arrive in: one thing to select, centre on and
 * delete, drawn as two sub-buffers because a texture belongs to a sub-buffer. The two
 * checkerboards differ in how fine they are, so it is obvious at a glance that each part got its
 * own texture rather than both getting the first one.
 *
 * Both still carry the corner markers, so a flip in either part is as visible as before. And
 * because it is one object, clicking either square should select the whole thing - the pick
 * bounds are computed over both parts, not just the first.
 */
const addTwoPartMeshTo = (moorhenInstance: ReturnType<typeof useMoorhenInstance>) => {
    const coarse = registerTexture(checkerboardTexture(256, 4));
    const fine = registerTexture(checkerboardTexture(256, 16));
    const square = (x: number) => ({
        vertices: [x - 10, -10, 0, x + 10, -10, 0, x + 10, 10, 0, x - 10, 10, 0],
        indices: [0, 1, 2, 0, 2, 3],
        normals: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
        texCoords: [0, 1, 1, 1, 1, 0, 0, 0],
    });

    const uniqueId = moorhenInstance.object.create({
        type: "mesh",
        colour: "#ffffff",
        origin: [0, 0, 0],
        // The flat fields are not read when parts are given, but the type requires them.
        vertices: [],
        indices: [],
        parts: [
            { ...square(-11), texture: coarse },
            { ...square(11), texture: fine },
        ],
        tags: { [TAG_SOURCE]: SOURCE_DEV_TEST },
    });

    const created = moorhenInstance.object.get(uniqueId);
    if (created) {
        const [x, y, z] = centreOfObject(created);
        moorhenInstance.centerOnCoordinate(x, y, z);
    }
    return uniqueId;
};

export const MoorhenDevMenu = () => {
    // --- MP4 spike. See utils/MoorhenMovieSpike.ts; this is a harness, not a feature. ---
    const [spinMovieStatus, setSpinMovieStatus] = useState<string>("");
    const [spinMovieBusy, setSpinMovieBusy] = useState<boolean>(false);
    // The ScreenRecorder is borrowed purely because it already holds glRef; the spike needs the
    // WebGL component and nothing else, and this avoids threading a new ref through for a test.
    const videoRecorderRef = useMoorhenInstance().getVideoRecorderRef();
    // Read, not subscribed, for both of the things below that want it: the movie wants the values
    // at the moment the button is pressed, and the buffer report is one-shot - selecting the
    // buffer list would re-render this menu every time any of them changed.
    const store = useStore<RootState>();
    // A running preview, so the same button can stop it.
    const previewRef = useRef<PreviewHandle | null>(null);
    // Lets the canvas be watched during an export, to judge whether it still lurches.
    const [seeThroughCover, setSeeThroughCover] = useState<boolean>(false);

    const checkEncoderSupport = async () => {
        const glRef = videoRecorderRef.current?.glRef;
        const canvas = glRef?.current?.getCanvasRef()?.current;
        if (!canvas) {
            setSpinMovieStatus("No canvas yet");
            return;
        }
        // Mediabunny names codec families, not profile/level strings - it picks those itself.
        const codecs = ["avc", "hevc", "vp9", "av1", "vp8"] as const;
        const lines: string[] = [];
        for (const codec of codecs) {
            const { detail } = await describeEncoderSupport(canvas.width, canvas.height, codec);
            lines.push(detail);
        }
        console.log(lines.join("\n"));
        setSpinMovieStatus(`${canvas.width}x${canvas.height}: see console for ${codecs.length} codecs`);
    };

    const exportSpinMovie = async (size?: { width: number; height: number }) => {
        const glRef = videoRecorderRef.current?.glRef;
        if (!glRef?.current) {
            setSpinMovieStatus("No WebGL component yet");
            return;
        }
        setSpinMovieBusy(true);
        setSpinMovieStatus("Rendering frame 0...");
        try {
            const result = await recordSpinToMp4(glRef, {
                ...size,
                coverOpacity: seeThroughCover ? 0.12 : 1,
                onProgress: (done, total) => {
                    if (done % 10 === 0 || done === total) setSpinMovieStatus(`Rendering frame ${done} of ${total}...`);
                },
            });
            downloadMovie(result.blob);
            const movieSeconds = result.frames / result.fps;
            const summary =
                `${result.frames} frames, ${result.width}x${result.height}, ${result.codec}, ` +
                `${(result.blob.size / 1e6).toFixed(1)} MB, ` +
                `${movieSeconds.toFixed(1)}s of movie in ${result.elapsedSeconds.toFixed(1)}s of rendering ` +
                `(${(result.frames / result.elapsedSeconds).toFixed(1)} fps while encoding)`;
            // Also to the console: the panel's status line disappears with the menu, and this is
            // the number worth comparing between machines.
            console.log(`[movie spike] ${summary}`);
            setSpinMovieStatus(summary);
        } catch (err) {
            console.error(err);
            setSpinMovieStatus(`Failed: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setSpinMovieBusy(false);
        }
    };
    /**
     * Fly in to the first ligand of the first molecule, turn around it, fly back out.
     *
     * The starting keyframe is read from the live renderer and the store rather than from defaults,
     * so the movie begins exactly where the view is when the button is pressed and ends there too.
     */
    /**
     * The ligand tour for whatever is loaded, starting from the view as it is right now.
     *
     * Shared by preview and export so the two cannot drift: a preview that showed a different
     * movie from the one that gets written would be worse than having no preview.
     */
    const buildCurrentLigandTour = async () => {
        const glRef = videoRecorderRef.current?.glRef;
        const gl = glRef?.current;
        if (!gl) return { error: "No WebGL component yet" } as const;

        const molecule = store.getState().molecules.moleculeList[0];
        if (!molecule) return { error: "Load a molecule first" } as const;

        const ligand = molecule.ligands?.[0];
        if (!ligand) return { error: `No ligands in ${molecule.name}` } as const;

        const atoms = await molecule.gemmiAtomsForCid(ligand.cid);
        if (!atoms?.length) return { error: `No atoms for ${ligand.cid}` } as const;

        // The slab comes from the camera, which holds it as offsets from the view centre - the
        // same convention a keyframe uses. It used to be read from the store, which holds clip
        // relative and fog absolute, so a keyframe built here disagreed with one built by the
        // controller's asKeyframe while both claimed to be the same type.
        const camera = gl.cameraController.state;
        const movie = buildLigandTour(
            {
                quat: gl.myQuat,
                origin: [...gl.origin] as [number, number, number],
                zoom: gl.zoom,
                clipFront: camera.clipFront,
                clipBack: camera.clipBack,
                fogFront: camera.fogFront,
                fogBack: camera.fogBack,
            },
            atoms);

        return { glRef, movie, label: `${ligand.cid} (${atoms.length} atoms)` } as const;
    };

    const previewLigandTour = async () => {
        if (previewRef.current) {
            previewRef.current.stop();
            return;
        }
        setSpinMovieStatus("Finding a ligand...");
        const built = await buildCurrentLigandTour();
        if ("error" in built) {
            setSpinMovieStatus(built.error);
            return;
        }
        setSpinMovieBusy(true);
        try {
            const handle = previewMovie(built.glRef, built.movie, {
                onProgress: (seconds, total) =>
                    setSpinMovieStatus(`Previewing ${built.label}: ${seconds.toFixed(1)}s of ${total.toFixed(1)}s`),
            });
            previewRef.current = handle;
            const result = await handle.finished;
            const expected = Math.round(result.elapsedSeconds * 60);
            setSpinMovieStatus(
                `${result.stopped ? "Stopped after" : "Previewed"} ${result.elapsedSeconds.toFixed(1)}s, ` +
                `${result.drawnFrames} frames drawn ` +
                `(${(result.drawnFrames / Math.max(result.elapsedSeconds, 1e-6)).toFixed(0)} fps; ` +
                `a 60 Hz display would have shown ${expected})`);
        } finally {
            previewRef.current = null;
            setSpinMovieBusy(false);
        }
    };

    const exportLigandTour = async () => {
        setSpinMovieStatus("Finding a ligand...");
        const built = await buildCurrentLigandTour();
        if ("error" in built) {
            setSpinMovieStatus(built.error);
            return;
        }
        const { glRef, movie } = built;

        setSpinMovieBusy(true);
        try {
            setSpinMovieStatus(`Touring ${built.label}...`);
            const result = await recordMovieToMp4(glRef, movie, {
                width: 1920,
                height: 1080,
                coverOpacity: seeThroughCover ? 0.12 : 1,
                onProgress: (done, total) => {
                    if (done % 10 === 0 || done === total) setSpinMovieStatus(`Rendering frame ${done} of ${total}...`);
                },
            });
            downloadMovie(result.blob, "moorhen_ligand_tour.mp4");
            const summary =
                `${built.label}: ${result.frames} frames, ${result.width}x${result.height}, ` +
                `${(result.blob.size / 1e6).toFixed(1)} MB, ` +
                `${(result.frames / result.fps).toFixed(1)}s of movie in ${result.elapsedSeconds.toFixed(1)}s`;
            console.log(`[movie spike] ${summary}`);
            setSpinMovieStatus(summary);
        } catch (err) {
            console.error(err);
            setSpinMovieStatus(`Failed: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setSpinMovieBusy(false);
        }
    };
    // --- end MP4 spike ---

    // --- Movie document and .mhm container. Also a harness, but of the real format rather than
    // the spike's: it exercises movieDocument, movieContainer and the session seam end to end,
    // so that the panel in #162 is wiring something already known to work. ---
    const [movieStatus, setMovieStatus] = useState<string>("No movie built yet");
    const [movieBusy, setMovieBusy] = useState<boolean>(false);
    // The document under test. A ref rather than state: nothing renders from it except the status
    // line, which is set explicitly, and a re-render per keystroke of a 1920x1080 movie is waste.
    const movieRef = useRef<MovieDocument | null>(null);
    const openMovieInputRef = useRef<HTMLInputElement | null>(null);

    const describeMovie = (document: MovieDocument, prefix: string) => {
        const problems = movieProblems(document);
        const summary =
            `${prefix}: "${document.name}", ${document.path.keyframes.length} keyframes, ` +
            `${documentDuration(document).toFixed(1)}s, ${documentFrameCount(document)} frames at ` +
            `${document.output.fps}fps, ${document.output.width}x${document.output.height}`;
        return problems.length > 0 ? `${summary} - PROBLEMS: ${problems.join("; ")}` : summary;
    };

    /**
     * The ligand tour, as a movie document in the saveable format.
     *
     * The same path the spike builds, wrapped in the scene and output settings that make it a
     * document rather than a bare camera path - which is the whole difference between something
     * that can be previewed and something that can be saved and reopened.
     */
    const buildMovieDocument = async () => {
        const built = await buildCurrentLigandTour();
        if ("error" in built) {
            setMovieStatus(built.error);
            return;
        }

        const document = emptyMovie(`Ligand tour - ${built.label}`);
        document.path = built.movie;
        document.scene = movieSceneFrom(
            store.getState().sceneSettings,
            built.glRef.current.cameraController.state.eyeDistance);
        document.output = { ...DEFAULT_OUTPUT };

        movieRef.current = document;
        setMovieStatus(describeMovie(document, "Built"));
    };

    /**
     * The movie and the scene it was authored against, as one file.
     *
     * With the session embedded, because that is the case worth proving: a movie that opens on a
     * machine which has never seen the data. fetchSession and the protobuf encode here are the
     * same three lines ManageSession uses to write a .pb, which is what makes the session entry
     * in the container something loadSessionFromArrayBuffer can read back without ceremony.
     */
    const saveMovieFile = async () => {
        const document = movieRef.current;
        if (!document) {
            setMovieStatus("Build a movie first");
            return;
        }
        setMovieBusy(true);
        try {
            setMovieStatus("Fetching the session...");
            const timeCapsule = moorhenInstance.getTimeCapsuleRef().current;
            const sessionData = await timeCapsule.fetchSession(true);
            const sessionBytes = moorhensession.Session
                .encode(moorhensession.Session.fromObject(sessionData)).finish();

            setMovieStatus("Packing...");
            const blob = await packMovie(
                { movie: document, session: sessionBytes },
                { type: "blob", writtenBy: "MoorhenDevMenu" }) as Blob;

            doDownload([blob], `moorhen_movie${MOVIE_EXTENSION}`);
            setMovieStatus(
                `Saved ${(blob.size / 1e6).toFixed(2)} MB ` +
                `(session ${(sessionBytes.length / 1e6).toFixed(2)} MB before compression)`);
        } catch (err) {
            console.error(err);
            setMovieStatus(`Failed: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setMovieBusy(false);
        }
    };

    /**
     * A movie file, opened and played.
     *
     * The round trip, which is the point of the exercise: if the session restores and the movie
     * plays over it, the format carries everything it needs to. The session is restored first and
     * waited for, since previewing a camera path over a scene that is still loading would say
     * nothing about either.
     */
    const openMovieFile = async (file: File) => {
        setMovieBusy(true);
        try {
            setMovieStatus(`Opening ${file.name}...`);
            const container = await unpackMovie(await file.arrayBuffer());
            movieRef.current = container.movie;

            if (container.session) {
                setMovieStatus("Restoring the session the movie was made with...");
                const status = await MoorhenTimeCapsule.loadSessionFromArrayBuffer(
                    container.session.buffer as ArrayBuffer, moorhenInstance);
                if (status === -1) {
                    setMovieStatus("The movie opened, but its session would not load");
                    return;
                }
            }

            setMovieStatus(describeMovie(container.movie,
                container.session ? "Opened with its session" : "Opened (no session in the file)"));

            const glRef = videoRecorderRef.current?.glRef;
            if (!glRef?.current) return;
            const handle = previewMovie(glRef, container.movie.path, {
                onProgress: (seconds, total) =>
                    setMovieStatus(`Playing: ${seconds.toFixed(1)}s of ${total.toFixed(1)}s`),
            });
            previewRef.current = handle;
            await handle.finished;
            setMovieStatus(describeMovie(container.movie, "Played"));
        } catch (err) {
            console.error(err);
            // A MovieFileError already says which thing was wrong with the file; anything else is
            // a surprise and deserves to look like one.
            setMovieStatus(err instanceof MovieFileError
                ? err.message
                : `Failed: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            previewRef.current = null;
            setMovieBusy(false);
        }
    };
    // --- end movie document harness ---

    const [overlaysOn, setOverlaysOn] = useState<boolean>(false);
    const [vectorsOn, setVectorsOn] = useState<boolean>(false);
    const [testVectors, setTestVectors] = useState<MoorhenVector[]>([]);
    const [conKitFile1Contents, setConKitFile1Contents] = useState<string>("");
    const [conKitFile2Contents, setConKitFile2Contents] = useState<string>("");

    const dispatch = useDispatch();
    const moorhenInstance = useMoorhenInstance();
    const addTexturedQuad = () => {
        addTexturedQuadTo(moorhenInstance);
        document.body.click();
    };
    const addTexturedPlanes = () => {
        addTexturedPlanesTo(moorhenInstance);
        document.body.click();
    };
    const addTwoPartMesh = () => {
        addTwoPartMeshTo(moorhenInstance);
        document.body.click();
    };

    // Separate from the FPS meter on purpose. Counting adds a wrapper call to every GL call, so
    // having it on changes the frame time it is reporting - the comparison worth making is the
    // meter alone against the meter with this on, which needs them to be two switches.
    const [countingDraws, setCountingDraws] = useState<boolean>(renderStats.enabled);
    const [syncingGpu, setSyncingGpu] = useState<boolean>(renderStats.syncGpu);
    const glCtx = useSelector((state: RootState) => state.glRef.glCtx);
    const peelOpaqueSeparately = useSelector((state: moorhen.State) => state.sceneSettings.peelOpaqueSeparately);
    const doOutline = useSelector((state: moorhen.State) => state.sceneSettings.doOutline);
    const useGemmi = useSelector((state: moorhen.State) => state.generalStates.useGemmi);
    const toggleValidationPanel = useSelector((state: RootState) => state.bottomPanels.shownBottomPanel === "validation");
    const [sliderValue, setSliderValue] = useState(1);
    const [sliderValue2, setSliderValue2] = useState(9);
    useEffect(() => {
        dispatch(removeVectors(testVectors));
        const myVecs: MoorhenVector[] = [];
        for (let i = 0; i < 10; i++) {
            const vec = newVector();
            vec.xTo = 10;
            vec.yTo = i * 2;
            vec.yFrom = i * 2;
            vec.coordsMode = "points";
            vec.arrowMode = "both";
            vec.tags = { [TAG_SOURCE]: SOURCE_DEV_TEST };
            vec.radius = 0.07 + i * 0.01;
            myVecs.push(vec);
        }
        setTestVectors(myVecs);
        return () => {
            // Removing by tag rather than by the vectors in state: the point of doing it this
            // way is that it does not depend on `testVectors` being current at unmount, which
            // it is not. Previously the tag was appended to each uniqueId and matched as a
            // substring; it is a tag now, and nothing else carries this one.
            dispatch(removeVectorsByTag({ [TAG_SOURCE]: SOURCE_DEV_TEST }));
        };
    }, []);

    const urlPrefix = usePaths().urlPrefix;
    // This is a bunch of examples of adding images (bitmap or svg), legends, paths in fractional coords on
    // a canvas layed over the top of the GL widget. SVG Paths are also supported, these are in absolute rather
    // fractional coords.

    const loadGzippedFiles = async (files: FileList) => {
        for (const file of files) {
            const fileContents = await readGzippedTextFile(file);
            console.log(fileContents);
        }
    };

    const exampleCallBack = (ctx, backgroundColor, cbWidth, cbHeight, scale) => {
        const bright_y = backgroundColor[0] * 0.299 + backgroundColor[1] * 0.587 + backgroundColor[2] * 0.114;
        if (bright_y < 0.5) {
            ctx.fillStyle = "white";
        } else {
            ctx.fillStyle = "black";
        }
        ctx.font = 20 * scale + "px Arial";
        ctx.fillText("I am written by a callback", 0.5 * cbWidth, 0.5 * cbHeight);
    };

    const loadVectorsBunch = async evt => {
        dispatch(removeVectors(testVectors));
        setVectorsOn(evt.target.checked);
        if (evt.target.checked) {
            dispatch(addVectors(testVectors));
        }
    };

    const loadExampleOverlays = async evt => {
        dispatch(emptyOverlays());
        setOverlaysOn(evt.target.checked);
        if (evt.target.checked) {
            const base64Image =
                "data:image/png;base64,   iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==   ";
            dispatch(
                addImageOverlay({
                    src: base64Image,
                    x: 0.8,
                    y: 0.15,
                    width: 20,
                    height: 20,
                    uniqueId: uuidv4(),
                })
            );
            dispatch(
                addImageOverlay({
                    src: `${urlPrefix}/pixmaps/axes_xyz.svg`,
                    x: 0.35,
                    y: 0.75,
                    width: 100,
                    height: 100,
                    uniqueId: uuidv4(),
                })
            );
            dispatch(
                addImageOverlay({
                    src: `${urlPrefix}/pixmaps/MoorhenLogo.png`,
                    x: 0.75,
                    y: 0.15,
                    width: 30,
                    height: 30,
                    uniqueId: uuidv4(),
                })
            );
            dispatch(
                addImageOverlay({
                    src: `${urlPrefix}/pixmaps/axes_xyz.svg`,
                    x: 0.25,
                    y: 0.25,
                    width: 100,
                    height: 100,
                    uniqueId: uuidv4(),
                })
            );
            dispatch(
                addTextOverlay({
                    text: "Red text",
                    x: 0.15,
                    y: 0.5,
                    fontFamily: "sans-serif",
                    fontPixelSize: 108,
                    fillStyle: "#ff000044",
                    uniqueId: uuidv4(),
                })
            );
            dispatch(
                addTextOverlay({
                    zIndex: 1,
                    text: "Text",
                    x: 0.15,
                    y: 0.75,
                    fontFamily: "serif",
                    fontPixelSize: 48,
                    uniqueId: uuidv4(),
                })
            );
            dispatch(
                addTextOverlay({
                    text: "Stroke text",
                    x: 0.65,
                    y: 0.75,
                    fontFamily: "serif",
                    fontPixelSize: 48,
                    drawStyle: "stroke",
                    strokeStyle: "blue",
                    uniqueId: uuidv4(),
                })
            );
            dispatch(
                addSvgPathOverlay({
                    path: "M10 10 h 80 v 80 h -80 Z",
                    drawStyle: "stroke",
                    strokeStyle: "magenta",
                    uniqueId: uuidv4(),
                })
            );
            dispatch(
                addSvgPathOverlay({
                    path: "M100 10 h 80 v 80 h -80 Z",
                    drawStyle: "fill",
                    fillStyle: "orange",
                    uniqueId: uuidv4(),
                })
            );
            dispatch(
                addSvgPathOverlay({
                    path: "M610 300 h 80 v 80 h -80 Z",
                    drawStyle: "stroke",
                    strokeStyle: "green",
                    lineWidth: 6,
                    uniqueId: uuidv4(),
                })
            );
            dispatch(
                addFracPathOverlay({
                    path: [0.7, 0.5, 0.8, 0.9, 0.6, 0.7, 0.7, 0.5],
                    drawStyle: "fill",
                    fillStyle: "#00ffff77",
                    uniqueId: uuidv4(),
                })
            );
            const gradientStops = [];
            gradientStops.push({ stop: 0, colour: "red" });
            gradientStops.push({ stop: 0.35, colour: "yellow" });
            gradientStops.push({ stop: 0.5, colour: "green" });
            gradientStops.push({ stop: 0.65, colour: "cyan" });
            gradientStops.push({ stop: 0.8, colour: "blue" });
            gradientStops.push({ stop: 1.0, colour: "purple" });
            dispatch(
                addSvgPathOverlay({
                    path: "M190 10 h 480 v 80 h -480 Z",
                    gradientStops,
                    gradientBoundary: [190, 0, 670, 0],
                    drawStyle: "gradient",
                    uniqueId: uuidv4(),
                })
            );
            dispatch(
                addSvgPathOverlay({
                    path: "M10 100 v 480 h 80 v -480 Z",
                    gradientStops,
                    gradientBoundary: [0, 100, 0, 580],
                    drawStyle: "gradient",
                    uniqueId: uuidv4(),
                })
            );
            dispatch(
                addFracPathOverlay({
                    path: [0.0, 0.0, 1.0, 1.0],
                    drawStyle: "stroke",
                    uniqueId: uuidv4(),
                })
            );
            dispatch(
                addFracPathOverlay({
                    path: [0.4, 0.2, 0.8, 0.6],
                    drawStyle: "stroke",
                    strokeStyle: "red",
                    lineWidth: 8,
                    uniqueId: uuidv4(),
                })
            );
            dispatch(
                addFracPathOverlay({
                    path: [0.2, 0.5, 0.3, 0.9, 0.1, 0.7, 0.2, 0.5],
                    gradientStops,
                    gradientBoundary: [0.1, 0, 0.3, 0],
                    drawStyle: "gradient",
                    uniqueId: uuidv4(),
                })
            );
            dispatch(addCallback(exampleCallBack));
            const input = String.raw`{{\rm{\color{red}Some}\ colour}} {\color{pink}\int}_{\color{blue}-\infty}^{\infty} e^{-x^2} \, dx = \sqrt{\pi}`;
            const input2 = String.raw`\displaystyle  \sum_{i}^{\infty} \Pi{\sqrt{\pi}\sqrt{\pi}}`;
            dispatch(
                addLatexOverlay({
                    zIndex: 1,
                    text: input,
                    x: 0.3,
                    y: 0.25,
                    height: 60,
                    uniqueId: uuidv4(),
                })
            );
            dispatch(
                addLatexOverlay({
                    text: input2,
                    x: 0.4,
                    y: 0.65,
                    height: 80,
                    uniqueId: uuidv4(),
                })
            );
        }
    };

    const origin = useSelector((state: RootState) => state.sceneSettings.origin);

    // const tomogramTest = () => {
    //     enqueueSnackbar("tomogram", {
    //         variant: "tomogram",
    //         persist: true,
    //         mapMolNo: 0,
    //         anchorOrigin: { vertical: "bottom", horizontal: "center" },
    //     });
    // };

    return (
        <MoorhenStack>
            {/* <MoorhenMenuItem onClick={tomogramTest}>Tomogram...</MoorhenMenuItem> */}
            <MoorhenStack card>
                MP4 spike
                <span style={{ fontSize: "0.8rem" }}>{spinMovieStatus}</span>
                <MoorhenButton onClick={checkEncoderSupport}>What will this machine encode?</MoorhenButton>
                <MoorhenToggle
                    label="Watch the canvas while recording"
                    checked={seeThroughCover}
                    onChange={() => setSeeThroughCover(value => !value)}
                />
                <MoorhenButton onClick={() => exportSpinMovie()} disabled={spinMovieBusy}>
                    {spinMovieBusy ? "Rendering..." : "Export 360° spin as MP4 (window size)"}
                </MoorhenButton>
                <MoorhenButton onClick={() => exportSpinMovie({ width: 1920, height: 1080 })} disabled={spinMovieBusy}>
                    {spinMovieBusy ? "Rendering..." : "Export 360° spin as MP4 (1920×1080)"}
                </MoorhenButton>
                <MoorhenButton onClick={previewLigandTour} disabled={spinMovieBusy && !previewRef.current}>
                    {previewRef.current ? "Stop preview" : "Preview ligand tour"}
                </MoorhenButton>
                <MoorhenButton onClick={exportLigandTour} disabled={spinMovieBusy}>
                    {spinMovieBusy ? "Rendering..." : "Export ligand tour as MP4"}
                </MoorhenButton>
            </MoorhenStack>
            <MoorhenStack card>
                Movie document (.mhm)
                <span style={{ fontSize: "0.8rem" }}>{movieStatus}</span>
                <MoorhenButton onClick={buildMovieDocument} disabled={movieBusy}>
                    Build ligand tour as a movie document
                </MoorhenButton>
                <MoorhenButton onClick={saveMovieFile} disabled={movieBusy}>
                    {movieBusy ? "Working..." : "Save movie with its session (.mhm)"}
                </MoorhenButton>
                <MoorhenButton onClick={() => openMovieInputRef.current?.click()} disabled={movieBusy}>
                    {movieBusy ? "Working..." : "Open a .mhm, restore its session, play it"}
                </MoorhenButton>
                <input
                    ref={openMovieInputRef}
                    type="file"
                    accept={MOVIE_EXTENSION}
                    style={{ display: "none" }}
                    onChange={event => {
                        const file = event.target.files?.[0];
                        // Cleared so that choosing the same file twice still fires a change,
                        // which is exactly what re-testing a round trip wants to do.
                        event.target.value = "";
                        if (file) void openMovieFile(file);
                    }}
                />
            </MoorhenStack>
            Origin: x: {origin[0].toFixed(1)} y: {origin[1].toFixed(1)} z: {origin[2].toFixed(1)}
            <MoorhenStack card>
                set Origin
                <MoorhenNumberInput
                    value={origin[0]}
                    setValue={val => {
                        dispatch(setOrigin([val, origin[1], origin[2]]));
                    }}
                />
                <MoorhenNumberInput
                    value={origin[1]}
                    setValue={val => {
                        dispatch(setOrigin([origin[0], val, origin[2]]));
                    }}
                />
                <MoorhenNumberInput
                    value={origin[2]}
                    setValue={val => {
                        dispatch(setOrigin([origin[0], origin[1], val]));
                    }}
                />
            </MoorhenStack>
            <MoorhenMenuItem
                onClick={() => {
                    dispatch(showModal({ key: modalKeys.VECTORS }));
                    document.body.click();
                }}
            >
                Vectors
            </MoorhenMenuItem>
            <MoorhenMenuItem
                onClick={() => {
                    dispatch(showModal({ key: modalKeys.OVERLAYS2D }));
                    document.body.click();
                }}
            >
                2D Overlays
            </MoorhenMenuItem>
            <MoorhenMenuItem onClick={addTexturedQuad}>Textured quad (test)</MoorhenMenuItem>
            <MoorhenMenuItem onClick={addTexturedPlanes}>Textured planes, instanced (test)</MoorhenMenuItem>
            <MoorhenMenuItem onClick={addTwoPartMesh}>Two-part textured mesh (test)</MoorhenMenuItem>
            <MoorhenToggle
                type="switch"
                checked={countingDraws}
                label="Count draws and GL state (needs the FPS meter on)"
                onChange={() => {
                    if (!glCtx) return;
                    if (countingDraws) uninstrumentGl(glCtx);
                    else instrumentGl(glCtx);
                    setCountingDraws(!countingDraws);
                }}
            />
            <MoorhenToggle
                type="switch"
                checked={syncingGpu}
                label="Wait for the GPU each frame (slow; diagnostic only)"
                onChange={() => {
                    renderStats.syncGpu = !syncingGpu;
                    setSyncingGpu(!syncingGpu);
                }}
            />
            <MoorhenToggle
                type="switch"
                checked={peelOpaqueSeparately}
                label="Draw opaque geometry once when depth peeling"
                onChange={() => {
                    dispatch(setPeelOpaqueSeparately(!peelOpaqueSeparately));
                }}
            />
            <MoorhenMenuItem
                onClick={() => {
                    const buffers = store.getState().glRef.displayBuffers ?? [];
                    console.log(
                        "Triangles by representation\n" +
                        triangleBreakdownText(buffers, measuredTrianglesPerFrame())
                    );
                }}
            >
                Log triangles by representation
            </MoorhenMenuItem>
            <hr></hr>
            <MoorhenToggle
                type="switch"
                checked={useGemmi}
                onChange={() => {
                    dispatch(setUseGemmi(!useGemmi));
                }}
                label="Use gemmi for reading/writing coord files"
            />
            <hr></hr>
            <MoorhenToggle
                type="switch"
                checked={doOutline}
                onChange={() => {
                    dispatch(setDoOutline(!doOutline));
                }}
                label="Outlines"
            />
            <MoorhenToggle
                type="switch"
                checked={overlaysOn}
                onChange={evt => {
                    loadExampleOverlays(evt);
                }}
                label="Load example 2D overlays"
            />
            <MoorhenToggle
                type="switch"
                checked={vectorsOn}
                onChange={evt => {
                    loadVectorsBunch(evt);
                }}
                label="Load a bunch of vectors"
            />
            <hr />
            <MoorhenFileInput
                label="Load gzipped files"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    loadGzippedFiles(e.target.files);
                }}
            />
            <MoorhenToggle
                type="switch"
                checked={doOutline}
                onChange={() => {
                    dispatch(setDoOutline(!doOutline));
                }}
                label="Outlines"
            />
            <MoorhenToggle
                type="switch"
                checked={toggleValidationPanel}
                onChange={() => {
                    dispatch(setShownBottomPanel(toggleValidationPanel ? "sequences-viewer" : "validation"));
                }}
                label="Show validation panel"
            />

        </MoorhenStack>
    );
};
