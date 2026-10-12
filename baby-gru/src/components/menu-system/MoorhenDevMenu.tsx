import { useDispatch, useSelector, useStore } from "react-redux";
import { v4 as uuidv4 } from "uuid";
import { useEffect, useRef, useState } from "react";
import { setOrigin } from "@/store";
import { RootState, setShownBottomPanel } from "@/store";
import { usePaths } from "../../InstanceManager";
import { setUseGemmi } from "../../store/generalStatesSlice";
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
import { MoorhenVector, addVectors, removeVectors, removeVectorsMatchingIDString } from "../../store/vectorsSlice";
import { moorhen } from "../../types/moorhen";
import { modalKeys } from "../../utils/enums";

import { readGzippedTextFile } from "../../utils/utils";
import { PreviewHandle, describeEncoderSupport, downloadMovie, previewMovie, recordMovieToMp4, recordSpinToMp4 } from "../../utils/MoorhenMovieSpike";
import { buildLigandTour } from "../../utils/ligandTour";
import { useMoorhenInstance } from "../../InstanceManager";
import { MoorhenFileInput, MoorhenNumberInput, MoorhenSlider, MoorhenToggle } from "../inputs";
import { MoorhenButton } from "../inputs/MoorhenButton/MoorhenButton";
import { MoorhenMenuItem, MoorhenStack } from "../interface-base";
import { MoorhenLinearProgress } from "../icons";



const newVector = () => {
    const aVector: MoorhenVector = {
        coordsMode: "atoms",
        labelMode: "none",
        labelText: "vector label",
        drawMode: "cylinder",
        arrowMode: "none",
        xFrom: 0.0,
        yFrom: 0.0,
        zFrom: 0.0,
        xTo: 0.0,
        yTo: 0.0,
        zTo: 0.0,
        cidFrom: "",
        cidTo: "",
        molFromUniqueId: "",
        molToUniqueId: "",
        uniqueId: uuidv4(),
        vectorColour: { r: 0, g: 0, b: 0 },
        textColour: { r: 0, g: 0, b: 0 },
    };
    return aVector;
};

export const MoorhenDevMenu = () => {
    // --- MP4 spike. See utils/MoorhenMovieSpike.ts; this is a harness, not a feature. ---
    const [spinMovieStatus, setSpinMovieStatus] = useState<string>("");
    const [spinMovieBusy, setSpinMovieBusy] = useState<boolean>(false);
    // The ScreenRecorder is borrowed purely because it already holds glRef; the spike needs the
    // WebGL component and nothing else, and this avoids threading a new ref through for a test.
    const videoRecorderRef = useMoorhenInstance().getVideoRecorderRef();
    // Read, not subscribed: the movie wants the values at the moment the button is pressed.
    const store = useStore<moorhen.State>();
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

        const scene = store.getState().sceneSettings;
        const movie = buildLigandTour(
            {
                quat: gl.myQuat,
                origin: [...gl.origin] as [number, number, number],
                zoom: gl.zoom,
                clipStart: scene.clipStart,
                clipEnd: scene.clipEnd,
                fogStart: scene.fogStart,
                fogEnd: scene.fogEnd,
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

    const [overlaysOn, setOverlaysOn] = useState<boolean>(false);
    const [vectorsOn, setVectorsOn] = useState<boolean>(false);
    const [testVectors, setTestVectors] = useState<MoorhenVector[]>([]);
    const [conKitFile1Contents, setConKitFile1Contents] = useState<string>("");
    const [conKitFile2Contents, setConKitFile2Contents] = useState<string>("");

    const dispatch = useDispatch();
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
            vec.uniqueId += "__TAG_DEV_TEST_VECTOR";
            vec.radius = 0.07 + i * 0.01;
            myVecs.push(vec);
        }
        setTestVectors(myVecs);
        return () => {
            //Remove all with "__DEV_TEST_VECTOR" in uniqueID. This gets around problem with stale state at unmount.
            dispatch(removeVectorsMatchingIDString("__TAG_DEV_TEST_VECTOR"));
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
