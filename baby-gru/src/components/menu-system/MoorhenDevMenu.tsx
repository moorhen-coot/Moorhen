import { MenuItem } from "@mui/material";
import { useSnackbar } from "notistack";
import { Form, InputGroup } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { v4 as uuidv4 } from "uuid";
import { useRef, useState } from "react";
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
import { moorhen } from "../../types/moorhen";
import { modalKeys } from "../../utils/enums";
import { MoorhenToggle } from "../inputs";

export const MoorhenDevMenu = () => {
    const [overlaysOn, setOverlaysOn] = useState<boolean>(false);

    const customCid = useRef<string>("");

    const dispatch = useDispatch();
    const doOutline = useSelector((state: moorhen.State) => state.sceneSettings.doOutline);
    const { enqueueSnackbar } = useSnackbar();
    const useGemmi = useSelector((state: moorhen.State) => state.generalStates.useGemmi);

    const urlPrefix = usePaths().urlPrefix;
    // This is a bunch of examples of adding images (bitmap or svg), legends, paths in fractional coords on
    // a canvas layed over the top of the GL widget. SVG Paths are also supported, these are in absolute rather
    // fractional coords.

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
                        [0.7, 0.5],
                        [0.8, 0.9],
                        [0.6, 0.7],
                        [0.7, 0.5],
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
                        [0.0, 0.0],
                        [1.0, 1.0],
                    ],
                    drawStyle: "stroke",
                    uniqueId: uuidv4(),
                })
            );
            dispatch(
                addFracPathOverlay({
                    path: [
                        [0.4, 0.2],
                        [0.8, 0.6],
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
                        [0.2, 0.5],
                        [0.3, 0.9],
                        [0.1, 0.7],
                        [0.2, 0.5],
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
            <MenuItem
                onClick={evt => {
                    dispatch(showModal(modalKeys.VECTORS));
                    document.body.click();
                }}
            >
                Vectors
            </MenuItem>
            <MenuItem
                onClick={evt => {
                    dispatch(showModal(modalKeys.OVERLAYS2D));
                    document.body.click();
                }}
            >
                2D Overlays
            </MenuItem>
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
        </>
    );
};
