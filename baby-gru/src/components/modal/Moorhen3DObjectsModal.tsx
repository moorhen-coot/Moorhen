import { useDispatch, useSelector } from "react-redux";
import { v4 as uuidv4 } from "uuid";
import { useRef, useState } from "react";
import {
    addTextOverlay,
    removeTextOverlay,
} from "../../store/overlaysSlice";
import type {
    Overlay2DFracPath,
    Overlay2DImageSrcFrac,
    Overlay2DLatexSrcFrac,
    Overlay2DSvgPath,
    Overlay2DTextFrac,
} from "../../store/overlaysSlice";
import { moorhen } from "../../types/moorhen";
import { modalKeys } from "../../utils/enums";
import { componentToHex, convertRemToPx, convertViewtoPx, getHexForCanvasColourName, hexToRGB, rgbToHex } from "../../utils/utils";
import { MoorhenButton, MoorhenColourPicker, MoorhenSelect, MoorhenTextInput } from "../inputs";
import { MoorhenStack } from "../interface-base";
import { MoorhenDraggableModalBase } from "../interface-base/ModalBase/DraggableModalBase";

export const Moorhen3DObjects = () => {

    const imageOverlays = useSelector((state: moorhen.State) => state.overlays.imageOverlayList);
    const latexOverlays = useSelector((state: moorhen.State) => state.overlays.latexOverlayList);
    const textOverlays = useSelector((state: moorhen.State) => state.overlays.textOverlayList);
    const svgPathOverlays = useSelector((state: moorhen.State) => state.overlays.svgPathOverlayList);
    const fracPathOverlays = useSelector((state: moorhen.State) => state.overlays.fracPathOverlayList);
    const [drawMode, setDrawMode] = useState("text");
    const [objectNew, setObjectNew] = useState(true);

    const dispatch = useDispatch();

    const vectorSelectRef = useRef<null | HTMLSelectElement>(null);
    const drawModeRef = useRef<null | HTMLSelectElement>(null);

    const newOverlayObject = () => {
        const anOverlayObject = {
            drawMode: "text",
            path: "",
            src: "",
            text: "",
            drawStyle: "stroke",
            strokeStyle: "black",
            fillStyle: "black",
            gradientStops: [],
            gradientBoundary: [0, 0, 1, 1],
            width: 20,
            height: 20,
            x: 0,
            y: 0,
            fontPixelSize: 20,
            fontFamily: "serif",
            lineWidth: 1,
            zIndex: 0,
            uniqueId: uuidv4(),
        };
        return anOverlayObject;
    };

    const [theOverlayObject, setOverlayObject] = useState<any>(newOverlayObject());
    const [selectedOption, setSelectedOption] = useState<string>("new");
    const [selectedDrawStyle, setSelectedDrawStyle] = useState<string>("stroke");
    const [pathText, setPathText] = useState<string>("");
    const [positionText, setPositionText] = useState<string>("");
    const [selectedAlpha, setSelectedAlpha] = useState<number>(1.0);

    const deleteCurrentObject = () => {
        let existingObject: Overlay2DLatexSrcFrac | Overlay2DTextFrac | Overlay2DImageSrcFrac | Overlay2DSvgPath | Overlay2DFracPath = null;
        existingObject = textOverlays.find(element => element.uniqueId === theOverlayObject.uniqueId);
        if (existingObject) {
            dispatch(removeTextOverlay(existingObject));
            setSelectedOption("new");
        }
    };

    const handleDelete = () => {
        deleteCurrentObject();
    };

    const handleApply = () => {
        const objectType = drawModeRef.current.value;
        if (vectorSelectRef.current.value !== "new") {
            deleteCurrentObject();
        }

        if (objectType === "text") {
            let [new_x, new_y] = [0, 1];
            try {
                const [_new_x, _new_y] = positionText.split(",").map(a => parseFloat(a));
                if (!Number.isNaN(_new_x) && !Number.isNaN(_new_y)) {
                    new_x = _new_x;
                    new_y = _new_y;
                } else {
                    console.log("Not a valid number pair in text position.", positionText.split(","));
                }
            } catch (e) {
                console.log("Not a valid number pair in text position.");
            }
            dispatch(
                addTextOverlay({
                    strokeStyle: theOverlayObject.strokeStyle,
                    fillStyle: theOverlayObject.fillStyle,
                    text: theOverlayObject.text,
                    x: new_x,
                    y: new_y,
                    fontFamily: theOverlayObject.fontFamily,
                    fontPixelSize: theOverlayObject.fontPixelSize,
                    drawStyle: theOverlayObject.drawStyle,
                    lineWidth: theOverlayObject.lineWidth,
                    uniqueId: theOverlayObject.uniqueId,
                    zIndex: theOverlayObject.zIndex,
                })
            );
        }
        setSelectedOption(theOverlayObject.uniqueId);
    };

    const updateObject = (
        {
            drawMode = undefined,
            path = undefined,
            src = undefined,
            text = undefined,
            drawStyle = undefined,
            strokeStyle = undefined,
            fillStyle = undefined,
            gradientStops = undefined,
            gradientBoundary = undefined,
            width = undefined,
            height = undefined,
            x = undefined,
            y = undefined,
            fontPixelSize = undefined,
            fontFamily = undefined,
            lineWidth = undefined,
            zIndex = undefined,
            uniqueId = undefined,
        },
        objectType
    ) => {
        const newObject = {
            drawMode: objectType !== undefined ? objectType : theOverlayObject.drawMode,
            path: path !== undefined ? path : theOverlayObject.path,
            src: src !== undefined ? src : theOverlayObject.src,
            text: text !== undefined ? text : theOverlayObject.text,
            drawStyle: drawStyle !== undefined ? drawStyle : theOverlayObject.drawStyle,
            strokeStyle: strokeStyle !== undefined ? strokeStyle : theOverlayObject.strokeStyle,
            fillStyle: fillStyle !== undefined ? fillStyle : theOverlayObject.fillStyle,
            gradientStops: gradientStops !== undefined ? gradientStops : theOverlayObject.gradientStops,
            gradientBoundary: gradientBoundary !== undefined ? gradientBoundary : theOverlayObject.gradientBoundary,
            width: width !== undefined ? width : theOverlayObject.width,
            height: height !== undefined ? height : theOverlayObject.height,
            x: x !== undefined ? x : theOverlayObject.x,
            y: y !== undefined ? y : theOverlayObject.y,
            fontPixelSize: fontPixelSize !== undefined ? fontPixelSize : theOverlayObject.fontPixelSize,
            fontFamily: fontFamily !== undefined ? fontFamily : theOverlayObject.fontFamily,
            lineWidth: lineWidth !== undefined ? lineWidth : theOverlayObject.lineWidth,
            zIndex: zIndex !== undefined ? zIndex : theOverlayObject.zIndex,
            uniqueId: uniqueId !== undefined ? uniqueId : theOverlayObject.uniqueId,
        };
        setOverlayObject(newObject);
    };

    const handleObjectChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        if (vectorSelectRef !== null && typeof vectorSelectRef !== "function") {
            vectorSelectRef.current.value = evt.target.value;
            if (vectorSelectRef.current.value === "new") {
                setSelectedOption("new");
                setPathText("");
                setPositionText("");
                updateObject(newOverlayObject(), "text");
                if (drawModeRef !== null && typeof drawModeRef !== "function") drawModeRef.current.value = "text";
            } else {
                try {
                    let existingObject:
                        | Overlay2DLatexSrcFrac
                        | Overlay2DTextFrac
                        | Overlay2DImageSrcFrac
                        | Overlay2DSvgPath
                        | Overlay2DFracPath = null;
                    existingObject = latexOverlays.find(element => element.uniqueId === evt.target.value);
                    if (existingObject) {
                        if (drawModeRef !== null && typeof drawModeRef !== "function") drawModeRef.current.value = "latex";
                    }
                    if (!existingObject) {
                        existingObject = imageOverlays.find(element => element.uniqueId === evt.target.value);
                        if (existingObject) {
                            if (drawModeRef !== null && typeof drawModeRef !== "function") drawModeRef.current.value = "image";
                        }
                    }
                    if (!existingObject) {
                        existingObject = textOverlays.find(element => element.uniqueId === evt.target.value);
                        if (existingObject) {
                            if (drawModeRef !== null && typeof drawModeRef !== "function") drawModeRef.current.value = "text";
                        }
                    }
                    if (!existingObject) {
                        existingObject = svgPathOverlays.find(element => element.uniqueId === evt.target.value);
                        if (existingObject) {
                            if (drawModeRef !== null && typeof drawModeRef !== "function") drawModeRef.current.value = "svgpath";
                        }
                    }
                    if (!existingObject) {
                        existingObject = fracPathOverlays.find(element => element.uniqueId === evt.target.value);
                        if (existingObject) {
                            if (drawModeRef !== null && typeof drawModeRef !== "function") drawModeRef.current.value = "fracpath";
                        }
                    }

                    setSelectedOption(existingObject.uniqueId);
                    setPathText("");
                    setPositionText("");

                    if(drawModeRef.current.value === "text") {
                        existingObject = existingObject as Overlay2DTextFrac;
                        setPositionText(existingObject.x.toFixed(3) + ", " + existingObject.y.toFixed(3));
                        if (existingObject.lineWidth === undefined) {
                            setOverlayObject(
                                Object.assign({}, existingObject, {
                                    lineWidth: 1,
                                })
                            );
                        } else {
                            setOverlayObject(existingObject);
                        }
                    } else {
                        setOverlayObject(existingObject);
                    }
                    if (
                        drawModeRef.current.value === "text" ||
                        drawModeRef.current.value === "svgpath" ||
                        drawModeRef.current.value === "fracpath"
                    ) {
                        existingObject = existingObject as Overlay2DTextFrac | Overlay2DSvgPath | Overlay2DFracPath;
                        if (existingObject.drawStyle) {
                            setSelectedDrawStyle(existingObject.drawStyle);
                        } else {
                            setSelectedDrawStyle("fill");
                        }
                    }
                } catch (e) {
                    console.log("Some problem?");
                    console.log(e);
                }
            }
        }
    };

    const handleColorChange = (color: string) => {
        updateObject({ strokeStyle: color, fillStyle: color }, drawModeRef.current.value);
    };

    const combinedArrays = [...textOverlays, ...svgPathOverlays];

    const headerContent = (
        <MoorhenSelect ref={vectorSelectRef} label="Object"
            onChange={(evt) => {
                setObjectNew(evt.target.value==="new");
                handleObjectChange(evt)}}
            value={selectedOption}>
            <option value="new">New</option>
            {combinedArrays.length > 0 &&
                combinedArrays.map((vec, i) => {
                    if (vec.type === "SvgPath") {
                        return (
                            <option key={i} value={vec.uniqueId}>
                                {"SVG path: " + vec.path.substring(0, 50)}
                            </option>
                        );
                    } else {
                        return (
                            <option key={i} value={vec.uniqueId}>
                                {vec.uniqueId}
                            </option>
                        );
                    }
                })}
        </MoorhenSelect>
    );

    const footer = (
        <>
            <MoorhenStack direction="line">
                {!objectNew && (
                    <MoorhenButton className="m-2" variant="danger" onClick={handleDelete}>
                        Delete
                    </MoorhenButton>
                )}
                <MoorhenButton className="m-2" onClick={handleApply}>
                    Apply
                </MoorhenButton>
            </MoorhenStack>
        </>
    );

    let existingColour = null;
    if (theOverlayObject.fillStyle && theOverlayObject.fillStyle !== "gradient") {
        if (theOverlayObject.fillStyle.startsWith("#") && theOverlayObject.fillStyle.length === 9) {
            existingColour = hexToRGB(getHexForCanvasColourName(theOverlayObject.fillStyle.substring(0, 7)));
        } else {
            existingColour = hexToRGB(getHexForCanvasColourName(theOverlayObject.fillStyle));
        }
    }
    if (theOverlayObject.strokeStyle && theOverlayObject.strokeStyle !== "gradient") {
        if (theOverlayObject.strokeStyle.startsWith("#") && theOverlayObject.strokeStyle.length === 9) {
            existingColour = hexToRGB(getHexForCanvasColourName(theOverlayObject.strokeStyle.substring(0, 7)));
        } else {
            existingColour = hexToRGB(getHexForCanvasColourName(theOverlayObject.strokeStyle));
        }
    }

    if (existingColour && existingColour.length === 4 && isNaN(existingColour[3]))
        existingColour[3] = !isNaN(selectedAlpha) ? selectedAlpha : 1.0;
    if (existingColour && existingColour.length === 3) existingColour[3] = !isNaN(selectedAlpha) ? selectedAlpha : 1.0;

    const checkPositionText = () => {
        let isOk: boolean = false;
        try {
            const [_new_x, _new_y] = positionText.split(",").map(a => parseFloat(a));
            if (!Number.isNaN(_new_x) && !Number.isNaN(_new_y) && !(_new_x === undefined) && !(_new_y === undefined)) {
                isOk = true;
            } else {
                console.log("Not a valid number pair in text position.", positionText);
            }
        } catch (e) {
            console.log("Not a valid number pair in text position.");
        }
        return isOk;
    };

    return (
        <>
            <MoorhenStack direction="column" inputGrid style={{ padding: "1rem" }}>
                {headerContent}
                <MoorhenSelect
                    label="Type"
                    ref={drawModeRef}
                    defaultValue="text"
                    onChange={(evt) => {
                        setDrawMode(evt.target.value)
                        updateObject({ drawMode: evt.target.value }, evt.target.value);
                    }}
                >
                    <option value="text">Text</option>
                </MoorhenSelect>

                {drawMode === "text" && 
                    <>
                        <MoorhenTextInput
                            label="Position"
                            text={positionText}
                            onChange={evt => {
                                setPositionText(evt.target.value);
                            }}
                            isInvalid={!checkPositionText()}
                            style={{ height: "2rem", margin: "0.3rem" }}
                        />
                    </>
                }
                {drawMode === "text" && (
                        <MoorhenStack direction="line">
                            <span>Colour</span>
                            <MoorhenColourPicker
                                colour={existingColour !== null ? existingColour : [1, 0, 0, selectedAlpha]}
                                setColour={color => {
                                    setSelectedAlpha(color[3]);
                                    handleColorChange(rgbToHex(color[0], color[1], color[2]) + componentToHex(Math.floor(color[3] * 255)));
                                }}
                                useAlpha={true}
                                position="bottom"
                                tooltip="Change colour"
                            />
                            {selectedAlpha < 0.99 && <div>(Opacity {selectedAlpha.toFixed(2)})</div>}
                        </MoorhenStack>
                    )}
            </MoorhenStack>
            {footer}
        </>
    );
};

export const Moorhen2DCanvasObjectsModal = () => {
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width);
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height);
    const resizeNodeRef = useRef<HTMLDivElement>(null);
    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.OVERLAYS2D}
            left={width / 6}
            top={height / 3}
            minHeight={50}
            minWidth={convertRemToPx(25)}
            maxHeight={convertViewtoPx(70, height)}
            maxWidth={convertViewtoPx(90, width)}
            enforceMaxBodyDimensions={true}
            overflowY="auto"
            overflowX="auto"
            headerTitle="3D objects"
            resizeNodeRef={resizeNodeRef}
            body={<Moorhen3DObjects />}
            footer={null}
        />
    );
};
