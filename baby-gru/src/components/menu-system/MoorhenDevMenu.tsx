import { MenuItem, Button } from "@mui/material";
import { useSnackbar } from "notistack";
import { Form, InputGroup } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { v4 as uuidv4 } from "uuid";
import { useEffect, useRef, useState } from "react";
import { RootState, setShownBottomPanel } from "@/store";
import { usePaths } from "../../InstanceManager";
import { setUseGemmi } from "../../store/generalStatesSlice";
import { showModal } from "../../store/modalsSlice";
import { MoorhenVector, addVectors, removeVectors, removeVectorsMatchingIDString } from "../../store/vectorsSlice";
import { readGzippedTextFile } from "../../utils/utils";
import { useCommandCentre } from "../../InstanceManager";
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
import { moorhen } from "../../types/moorhen";
import { modalKeys } from "../../utils/enums";
import { MoorhenToggle } from "../inputs";
import { ImportNOERestraints } from "../menu-item/ImportNOERestraints"
import { MoorhenButton } from "../inputs/MoorhenButton/MoorhenButton";

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
        molNoFrom: 0,
        molNoTo: 0,
        uniqueId: uuidv4(),
        vectorColour: { r: 0, g: 0, b: 0 },
        textColour: { r: 0, g: 0, b: 0 },
    };
    return aVector;
};

export const MoorhenDevMenu = () => {
    const [overlaysOn, setOverlaysOn] = useState<boolean>(false);
    const [vectorsOn, setVectorsOn] = useState<boolean>(false);
    const [testVectors, setTestVectors] = useState<MoorhenVector[]>([]);
    const [conKitFile1Contents, setConKitFile1Contents] = useState<string>("");
    const [conKitFile2Contents, setConKitFile2Contents] = useState<string>("");

    const commandCentre = useCommandCentre();

    const customCid = useRef<string>("");
    const conKitFile1Ref = useRef<null | HTMLInputElement>(null);
    const conKitFile2Ref = useRef<null | HTMLInputElement>(null);

    const dispatch = useDispatch();
    const doOutline = useSelector((state: moorhen.State) => state.sceneSettings.doOutline);
    const { enqueueSnackbar } = useSnackbar();
    const useGemmi = useSelector((state: moorhen.State) => state.generalStates.useGemmi);
    const toggleValidationPanel = useSelector((state: RootState) => state.globalUI.shownBottomPanel === "validation");

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
                    path: [
                        0.7, 0.5,
                        0.8, 0.9,
                        0.6, 0.7,
                        0.7, 0.5,
                    ],
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
                    path: [
                        0.0, 0.0,
                        1.0, 1.0,
                    ],
                    drawStyle: "stroke",
                    uniqueId: uuidv4(),
                })
            );
            dispatch(
                addFracPathOverlay({
                    path: [
                        0.4, 0.2,
                        0.8, 0.6,
                    ],
                    drawStyle: "stroke",
                    strokeStyle: "red",
                    lineWidth: 8,
                    uniqueId: uuidv4(),
                })
            );
            dispatch(
                addFracPathOverlay({
                    path: [
                        0.2, 0.5,
                        0.3, 0.9,
                        0.1, 0.7,
                        0.2, 0.5,
                    ],
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

    const tomogramTest = () => {
        enqueueSnackbar("tomogram", {
            variant: "tomogram",
            persist: true,
            mapMolNo: 0,
            anchorOrigin: { vertical: "bottom", horizontal: "center" },
        });
    };

    return (
        <>
            <MenuItem onClick={tomogramTest}>Tomogram...</MenuItem>
            <hr></hr>
            <InputGroup className="moorhen-input-group-check">
                <MoorhenToggle
                    type="switch"
                    checked={useGemmi}
                    onChange={() => {
                        dispatch(setUseGemmi(!useGemmi));
                    }}
                    label="Use gemmi for reading/writing coord files"
                />
            </InputGroup>

            <hr></hr>
            <InputGroup className="moorhen-input-group-check">
                <MoorhenToggle
                    type="switch"
                    checked={doOutline}
                    onChange={() => {
                        dispatch(setDoOutline(!doOutline));
                    }}
                    label="Outlines"
                />
            </InputGroup>
            <InputGroup className="moorhen-input-group-check">
                <MoorhenToggle
                    type="switch"
                    checked={overlaysOn}
                    onChange={evt => {
                        loadExampleOverlays(evt);
                    }}
                    label="Load example 2D overlays"
                />
            </InputGroup>
            <MoorhenToggle
                type="switch"
                checked={toggleValidationPanel}
                onChange={() => {
                    dispatch(setShownBottomPanel(toggleValidationPanel ? "sequences-viewer" : "validation"));
                }}
                label="Show validation panel"
            />
            <InputGroup className="moorhen-input-group-check">
                <MoorhenToggle
                    type="switch"
                    checked={vectorsOn}
                    onChange={evt => {
                        loadVectorsBunch(evt);
                    }}
                    label="Load a bunch of vectors"
                />
            </InputGroup>
            <MenuItem>
                <Form.Control
                    type="file"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        loadGzippedFiles(e.target.files);
                    }}
                />
                Gzipped Text Read test
            </MenuItem>

            <MenuItem>
                    <ImportNOERestraints/>
            </MenuItem>
        </>
    );
};
