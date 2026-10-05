import { useDispatch, useSelector } from "react-redux";
import { SOURCE_DEV_TEST, TAG_SOURCE } from "../../utils/tags";
import { v4 as uuidv4 } from "uuid";
import { newVector } from "../../utils/vectorFactories";
import { useEffect, useState } from "react";
import { setOrigin } from "@/store";
import { RootState, setShownBottomPanel } from "@/store";
import { useMoorhenInstance, usePaths } from "../../InstanceManager";
import { checkerboardTexture, registerTexture } from "../../WebGLgComponents/textureRegistry";
import { centreOfObject } from "../../store/threeDObjectsSlice";
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
import { MoorhenVector, addVectors, removeVectors, removeVectorsByTag } from "../../store/vectorsSlice";
import { moorhen } from "../../types/moorhen";
import { modalKeys } from "../../utils/enums";

import { readGzippedTextFile } from "../../utils/utils";
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

export const MoorhenDevMenu = () => {
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
