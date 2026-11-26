import { useDispatch, useSelector } from "react-redux";
import { v4 as uuidv4 } from "uuid";
import { useEffect, useRef, useState } from "react";
import {
    addFracPathOverlay,
    addImageOverlay,
    addSvgPathOverlay,
    addTextOverlay,
    removeFracPathOverlay,
    removeImageOverlay,
    removeSvgPathOverlay,
    removeTextOverlay,
    addShapeOverlay,
    removeShapeOverlay,
    updateOverlay,
    newCircleOverlay,
    newLineOverlay,
    newPolygonOverlay,
    regularPolygonPoints,
} from "../../store/overlaysSlice";
import { setSelected2DObject } from "../../store/generalStatesSlice";
import { boxOfPoints, pairsOf } from "../../utils/overlay2DGeometry";
import type {
    Overlay2DShape,
    Overlay2DFracPath,
    Overlay2DImageSrcFrac,
    Overlay2DSvgPath,
    Overlay2DTextFrac,
} from "../../store/overlaysSlice";
import { moorhen } from "../../types/moorhen";
import { modalKeys } from "../../utils/enums";
import { componentToHex, convertRemToPx, convertViewtoPx, getHexForCanvasColourName, hexToRGB, rgbToHex } from "../../utils/utils";
import { MoorhenButton, MoorhenColourPicker, MoorhenCoordinateInput, MoorhenFileInput, MoorhenNumberInput, MoorhenSelect, MoorhenTextInput, MoorhenTextStyleEditor, MoorhenToggle } from "../inputs";
import type { MoorhenTextStyle } from "../../utils/textStyle";
import { MoorhenStack } from "../interface-base";
import { MoorhenDraggableModalBase } from "../interface-base/ModalBase/DraggableModalBase";
import { ModalComponentProps } from "../interface-base/ModalBase/ModalsContainer";

export const Moorhen2DCanvasObjects = (props: ModalComponentProps) => {
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);

    const imageOverlays = useSelector((state: moorhen.State) => state.overlays.imageOverlayList);
    const textOverlays = useSelector((state: moorhen.State) => state.overlays.textOverlayList);
    const svgPathOverlays = useSelector((state: moorhen.State) => state.overlays.svgPathOverlayList);
    const fracPathOverlays = useSelector((state: moorhen.State) => state.overlays.fracPathOverlayList);
    const shapeOverlays = useSelector((state: moorhen.State) => state.overlays.shapeOverlayList);
    const selected2DObjectId = useSelector((state: moorhen.State) => state.generalStates.selected2DObjectId);

    const dispatch = useDispatch();

    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor);
    const viewWidth = useSelector((state: moorhen.State) => state.sceneSettings.GlViewportWidth);
    const viewHeight = useSelector((state: moorhen.State) => state.sceneSettings.GlViewportHeight);
    const defaultBondSmoothness = useSelector((state: moorhen.State) => state.sceneSettings.defaultBondSmoothness);

    const vectorSelectRef = useRef<null | HTMLSelectElement>(null);
    const drawModeRef = useRef<null | HTMLSelectElement>(null);
    const pathRef = useRef<null | HTMLInputElement>(null);

    const newOverlayObject = () => {
        const anOverlayObject = {
            drawMode: "text",
            path: "",
            src: "",
            text: "",
            // New objects start as text, which is filled; see the Type select for paths.
            drawStyle: "fill",
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
            latex: false,
            // The shapes', from their own defaults.
            radiusX: 40,
            radiusY: 40,
            rotation: 0,
            sides: 4,
            points: regularPolygonPoints(4, 40),
            x1: 0.4,
            y1: 0.5,
            x2: 0.6,
            y2: 0.5,
            arrowStart: false,
            arrowEnd: true,
            uniqueId: uuidv4(),
        };
        return anOverlayObject;
    };

    interface RGBColour {
        r: number;
        g: number;
        b: number;
    }

    /**
     * The type being edited. Kept as state as well as in the Type select, so that what is shown
     * follows it on render rather than by reading the select through its ref.
     */
    const [drawMode, setDrawModeState] = useState<string>("text");
    const setDrawMode = (mode: string) => {
        if (drawModeRef.current) drawModeRef.current.value = mode;
        setDrawModeState(mode);
    };
    const [theOverlayObject, setOverlayObject] = useState<any>(newOverlayObject());
    /** The stored object last loaded into the panel, to tell when the handles have changed it. */
    const lastLoadedRef = useRef<unknown>(null);
    const [selectedOption, setSelectedOption] = useState<string>("new");
    const [selectedDepth, setSelectedDepth] = useState<number>(0);
    const [selectedDrawStyle, setSelectedDrawStyle] = useState<string>("fill");
    const [pathText, setPathText] = useState<string>("");
    const [gradientBoundaryText, setGradientBoundaryText] = useState<string>("0,0,1,1");
    const [positionText, setPositionText] = useState<string>("0.1, 0.9");
    const [selectedAlpha, setSelectedAlpha] = useState<number>(1.0);
    const [imageString, setImageString] = useState<string>("");
    const inputFile = useRef(null);

    const upLoadNewImage = async (fn: File) => {
        const buf = await fn.arrayBuffer();
        const ubuf = new Uint8Array(buf);
        const base64String = btoa(ubuf.reduce((data, byte) => data + String.fromCharCode(byte), ""));
        let imageFormat = "";
        if (ubuf[0] === 137 && ubuf[1] === 80 && ubuf[2] === 78 && ubuf[3] === 71) imageFormat = "png";
        else if (ubuf[0] === 255 && ubuf[1] === 216 && ubuf[2] === 255) imageFormat = "jpeg";
        else if (ubuf[0] === 66 && ubuf[1] === 77) imageFormat = "bmp";
        console.log("Detected image format:", imageFormat);
        if (imageFormat) {
            const base64Image = "data:image/" + imageFormat + ";base64,   " + base64String;
            setPathText("[Image Data]");
            updateObject({ src: base64Image }, drawModeRef.current.value);
            setImageString(base64Image);
            // Its own size, so that it keeps its proportions; but not bigger than half the view,
            // where a photograph's thousands of pixels would put most of it off the screen.
            const img = new window.Image();
            img.onload = () => {
                const limit = 0.5 * Math.min(viewWidth || 1000, viewHeight || 1000);
                const shrink = Math.min(1, limit / Math.max(img.naturalWidth, img.naturalHeight, 1));
                updateObject({ width: Math.round(img.naturalWidth * shrink), height: Math.round(img.naturalHeight * shrink) }, "image");
            };
            img.src = base64Image.replace(";base64,   ", ";base64,");
        }
    };

    const deleteCurrentObject = () => {
        let existingObject: Overlay2DTextFrac | Overlay2DImageSrcFrac | Overlay2DSvgPath | Overlay2DFracPath = null;
        existingObject = imageOverlays.find(element => element.uniqueId === theOverlayObject.uniqueId);
        if (existingObject) {
            dispatch(removeImageOverlay(existingObject));
            setSelectedOption("new");
        }
        existingObject = textOverlays.find(element => element.uniqueId === theOverlayObject.uniqueId);
        if (existingObject) {
            dispatch(removeTextOverlay(existingObject));
            setSelectedOption("new");
        }
        existingObject = svgPathOverlays.find(element => element.uniqueId === theOverlayObject.uniqueId);
        if (existingObject) {
            dispatch(removeSvgPathOverlay(existingObject));
            setSelectedOption("new");
        }
        existingObject = fracPathOverlays.find(element => element.uniqueId === theOverlayObject.uniqueId);
        if (existingObject) {
            dispatch(removeFracPathOverlay(existingObject));
            setSelectedOption("new");
        }
        if (shapeOverlays.some(element => element.uniqueId === theOverlayObject.uniqueId)) {
            dispatch(removeShapeOverlay({ uniqueId: theOverlayObject.uniqueId }));
            setSelectedOption("new");
        }
    };

    const isShapeType = (objectType: string) => objectType === "circle" || objectType === "polygon" || objectType === "line";

    /** The shape the panel is editing, as it would be stored. */
    const shapeFromPanel = (objectType: string): Overlay2DShape => {
        const o = theOverlayObject;
        const common = { uniqueId: o.uniqueId, zIndex: o.zIndex };
        const paint = {
            drawStyle: (o.drawStyle === "stroke" ? "stroke" : "fill") as "fill" | "stroke",
            fillStyle: o.fillStyle,
            strokeStyle: o.strokeStyle,
            lineWidth: o.lineWidth,
        };
        if (objectType === "line") {
            return newLineOverlay({ ...common, x1: o.x1, y1: o.y1, x2: o.x2, y2: o.y2, arrowStart: !!o.arrowStart, arrowEnd: !!o.arrowEnd, strokeStyle: o.strokeStyle, lineWidth: o.lineWidth });
        }
        const [x, y] = position2D;
        if (objectType === "circle") {
            return newCircleOverlay({ ...common, ...paint, x, y, radiusX: o.radiusX, radiusY: o.radiusY, rotation: o.rotation ?? 0 });
        }
        return newPolygonOverlay({ ...common, ...paint, x, y, sides: o.sides, points: o.points, rotation: o.rotation ?? 0 });
    };

    const handleDelete = () => {
        deleteCurrentObject();
    };

    /** Which panel type an object in the store is, or null if it is not there. */
    const storedTypeOf = (uniqueId: string): string | null => {
        if (textOverlays.some(o => o.uniqueId === uniqueId)) return "text";
        if (imageOverlays.some(o => o.uniqueId === uniqueId)) return "image";
        if (svgPathOverlays.some(o => o.uniqueId === uniqueId)) return "svgpath";
        if (fracPathOverlays.some(o => o.uniqueId === uniqueId)) return "fracpath";
        const shape = shapeOverlays.find(o => o.uniqueId === uniqueId);
        return shape ? shape.type.toLowerCase() : null;
    };

    const handleApply = () => {
        const objectType = drawModeRef.current.value;
        if (isShapeType(objectType)) {
            // Changed in place when it exists, so it keeps its place in the drawing order.
            const shape = shapeFromPanel(objectType);
            if (shapeOverlays.some(element => element.uniqueId === shape.uniqueId)) {
                dispatch(updateOverlay({ uniqueId: shape.uniqueId, changes: { ...shape } }));
            } else {
                if (vectorSelectRef.current.value !== "new") deleteCurrentObject();
                dispatch(addShapeOverlay(shape));
            }
            setSelectedOption(shape.uniqueId);
            dispatch(setSelected2DObject(shape.uniqueId));
            // Not the stored object itself, so the next change to the lists reloads it from the
            // store - and from then on, a drag by the handles shows up here.
            lastLoadedRef.current = {};
            return;
        }
        // An existing object of the same type is changed in place. Deleting it and adding it again
        // put it last in its list - on top of everything else at its depth - and lost whatever
        // the panel does not hold: where the handles had moved an SVG path to, how far text or an
        // image had been turned. Only a change of type needs a new object.
        const existingType = vectorSelectRef.current.value !== "new" ? storedTypeOf(theOverlayObject.uniqueId) : null;
        const inPlace = existingType === objectType;
        if (vectorSelectRef.current.value !== "new" && !inPlace) {
            deleteCurrentObject();
        }
        const put = <T extends { uniqueId: string }>(add: (o: T) => { type: string; payload: unknown }, o: T) =>
            dispatch(inPlace ? updateOverlay({ uniqueId: o.uniqueId, changes: { ...o } }) : add(o));

        let gradientBoundary = theOverlayObject.gradientBoundary;

        if (selectedDrawStyle === "gradient" && !gradientBoundary) {
            if (checkGradientBoundaryText) {
                const arr = gradientBoundaryText.split(",").map(a => parseFloat(a));
                gradientBoundary = arr;
            } else {
                gradientBoundary = [0, 0, 1, 1];
            }
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
            put(
                addTextOverlay, {
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
                    latex: !!theOverlayObject.latex,
                }
            );
        } else if (objectType === "image") {
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
            put(
                addImageOverlay, {
                    src: theOverlayObject.src,
                    x: new_x,
                    y: new_y,
                    width: theOverlayObject.width,
                    height: theOverlayObject.height,
                    uniqueId: theOverlayObject.uniqueId,
                    zIndex: theOverlayObject.zIndex,
                }
            );
        } else if (objectType === "svgpath") {
            put(
                addSvgPathOverlay, {
                    path: theOverlayObject.path,
                    drawStyle: theOverlayObject.drawStyle,
                    strokeStyle: theOverlayObject.strokeStyle,
                    fillStyle: theOverlayObject.fillStyle,
                    lineWidth: theOverlayObject.lineWidth,
                    gradientStops: theOverlayObject.gradientStops,
                    gradientBoundary: gradientBoundary,
                    uniqueId: theOverlayObject.uniqueId,
                    zIndex: theOverlayObject.zIndex,
                }
            );
        } else if (objectType === "fracpath") {
            let arr: number[] = [0, 0, 1, 1];
            try {
                arr = pathText.split(",").map(v => parseFloat(v));
            } catch (e) {
                console.log("Not a valid array of number pairs for fractional path points.");
            }
            if (theOverlayObject.drawStyle === "gradient")
                put(
                    addFracPathOverlay, {
                        path: arr,
                        drawStyle: theOverlayObject.drawStyle,
                        strokeStyle: theOverlayObject.strokeStyle,
                        lineWidth: theOverlayObject.lineWidth,
                        gradientStops: theOverlayObject.gradientStops,
                        gradientBoundary: gradientBoundary,
                        uniqueId: theOverlayObject.uniqueId,
                        zIndex: theOverlayObject.zIndex,
                    }
                );
            else {
                console.log("dispatch(addFracPathOverlay,", {
                    path: arr,
                    drawStyle: theOverlayObject.drawStyle,
                    strokeStyle: theOverlayObject.strokeStyle,
                    fillStyle: theOverlayObject.fillStyle,
                    lineWidth: theOverlayObject.lineWidth,
                    uniqueId: theOverlayObject.uniqueId,
                    zIndex: theOverlayObject.zIndex,
                });
                put(
                    addFracPathOverlay, {
                        path: arr,
                        drawStyle: theOverlayObject.drawStyle,
                        strokeStyle: theOverlayObject.strokeStyle,
                        fillStyle: theOverlayObject.fillStyle,
                        lineWidth: theOverlayObject.lineWidth,
                        uniqueId: theOverlayObject.uniqueId,
                        zIndex: theOverlayObject.zIndex,
                    }
                );
            }
        }
        setSelectedOption(theOverlayObject.uniqueId);
        dispatch(setSelected2DObject(theOverlayObject.uniqueId));
        lastLoadedRef.current = {};
    };

    const handleObjectChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        if (vectorSelectRef !== null && typeof vectorSelectRef !== "function") {
            vectorSelectRef.current.value = evt.target.value;
            if (vectorSelectRef.current.value === "new") {
                setSelectedOption("new");
                setPathText("");
                setPositionText("0.1, 0.9");
                setImageString("");
                setOverlayObject(newOverlayObject());
                setSelectedDrawStyle("fill");
                setSelectedDepth(0);
                setSelectedAlpha(1.0);
                lastLoadedRef.current = null;
                dispatch(setSelected2DObject(null));
                setDrawMode("text");
            } else {
                try {
                    let existingObject: Overlay2DTextFrac | Overlay2DImageSrcFrac | Overlay2DSvgPath | Overlay2DFracPath | Overlay2DShape = null;
                    {
                        existingObject = imageOverlays.find(element => element.uniqueId === evt.target.value);
                        if (existingObject) {
                            setDrawMode("image");
                        }
                    }
                    if (!existingObject) {
                        existingObject = textOverlays.find(element => element.uniqueId === evt.target.value);
                        if (existingObject) {
                            setDrawMode("text");
                        }
                    }
                    if (!existingObject) {
                        existingObject = svgPathOverlays.find(element => element.uniqueId === evt.target.value);
                        if (existingObject) {
                            setDrawMode("svgpath");
                        }
                    }
                    if (!existingObject) {
                        existingObject = fracPathOverlays.find(element => element.uniqueId === evt.target.value);
                        if (existingObject) {
                            setDrawMode("fracpath");
                        }
                    }
                    if (!existingObject) {
                        existingObject = shapeOverlays.find(element => element.uniqueId === evt.target.value);
                        if (existingObject) {
                            setDrawMode(existingObject.type.toLowerCase());
                        }
                    }
                    lastLoadedRef.current = existingObject;
                    dispatch(setSelected2DObject(existingObject.uniqueId));

                    setSelectedOption(existingObject.uniqueId);
                    setPathText("");
                    setPositionText("");

                    if (drawModeRef.current.value === "image") {
                        existingObject = existingObject as Overlay2DImageSrcFrac;
                        if (existingObject.x && existingObject.y)
                            setPositionText(existingObject.x.toFixed(3) + ", " + existingObject.y.toFixed(3));
                        if (existingObject.src.startsWith("data:image")) {
                            setPathText("[Image Data]");
                            setImageString(existingObject.src);
                        } else if (existingObject.src.length > 0) {
                            setPathText(existingObject.src);
                            setImageString(existingObject.src);
                        }
                        setOverlayObject(existingObject);
                    } else if (drawModeRef.current.value === "fracpath") {
                        existingObject = existingObject as Overlay2DFracPath;
                        if (existingObject.path) {
                            setPathText(
                                existingObject.path
                                    .flat()
                                    .map(number => number.toFixed(3))
                                    .toString()
                            );
                        }
                        if (existingObject.lineWidth === undefined) {
                            setOverlayObject(
                                Object.assign({}, existingObject, {
                                    lineWidth: 1,
                                })
                            );
                        } else {
                            setOverlayObject(existingObject);
                        }
                    } else if (drawModeRef.current.value === "svgpath") {
                        existingObject = existingObject as Overlay2DSvgPath;
                        if (existingObject.path) {
                            setPathText(existingObject.path);
                        }
                        if (existingObject.lineWidth === undefined) {
                            setOverlayObject(
                                Object.assign({}, existingObject, {
                                    lineWidth: 1,
                                })
                            );
                        } else {
                            setOverlayObject(existingObject);
                        }
                    } else if (drawModeRef.current.value === "text") {
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
                    } else if (isShapeType(drawModeRef.current.value)) {
                        const shape = existingObject as Overlay2DShape;
                        if (shape.type !== "Line") setPositionText(shape.x.toFixed(3) + ", " + shape.y.toFixed(3));
                        // Over the defaults, so that every shape's fields exist if the type is changed.
                        setOverlayObject({ ...newOverlayObject(), ...shape, uniqueId: shape.uniqueId });
                        setSelectedDrawStyle(shape.type !== "Line" && shape.drawStyle === "stroke" ? "stroke" : "fill");
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
                        if (drawModeRef.current.value !== "text") {
                            existingObject = existingObject as Overlay2DSvgPath | Overlay2DFracPath;
                            if (existingObject.gradientBoundary) {
                                if (drawModeRef.current.value === "svgpath")
                                    setGradientBoundaryText(existingObject.gradientBoundary.flat().toString());
                                else
                                    setGradientBoundaryText(
                                        existingObject.gradientBoundary
                                            .flat()
                                            .map(number => number.toFixed(3))
                                            .toString()
                                    );
                            }
                        }
                    }
                    if (existingObject.zIndex === undefined) {
                        setSelectedDepth(0);
                        setOverlayObject(Object.assign({}, existingObject, { zIndex: 0 }));
                    } else {
                        setSelectedDepth(existingObject.zIndex);
                    }
                    if (drawModeRef.current.value !== "image") {
                        existingObject = existingObject as Overlay2DTextFrac | Overlay2DSvgPath | Overlay2DFracPath;
                        if (existingObject.fillStyle && existingObject.fillStyle !== "gradient") {
                            if (existingObject.fillStyle.startsWith("#") && existingObject.fillStyle.length === 9) {
                                try {
                                    setSelectedAlpha(parseInt(existingObject.fillStyle.substring(7), 16) / 255);
                                } catch (e) {
                                    setSelectedAlpha(1.0);
                                }
                            } else {
                                setSelectedAlpha(1.0);
                            }
                        }

                        if (existingObject.strokeStyle && existingObject.strokeStyle !== "gradient") {
                            if (existingObject.strokeStyle.startsWith("#") && existingObject.strokeStyle.length === 9) {
                                try {
                                    setSelectedAlpha(parseInt(existingObject.strokeStyle.substring(7), 16) / 255);
                                } catch (e) {
                                    setSelectedAlpha(1.0);
                                }
                            } else {
                                setSelectedAlpha(1.0);
                            }
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

    const combinedArrays = [...imageOverlays, ...textOverlays, ...svgPathOverlays, ...fracPathOverlays, ...shapeOverlays];

    const headerContent = (
        <MoorhenSelect ref={vectorSelectRef} label="Object" onChange={handleObjectChange} value={selectedOption}>
            <option value="new">New</option>
            {combinedArrays.length > 0 &&
                combinedArrays.map((vec, i) => {
                    if (vec.type === "SvgPath") {
                        return (
                            <option key={i} value={vec.uniqueId}>
                                {"SVG path: " + vec.path.substring(0, 50)}
                            </option>
                        );
                    } else if (vec.type === "FracPath") {
                        return (
                            <option key={i} value={vec.uniqueId}>
                                {"Fractional points path: " +
                                    vec.path
                                        .flat()
                                        .map(number => number.toFixed(3))
                                        .toString()
                                        .substring(0, 50)}
                            </option>
                        );
                    } else if (vec.type === "Circle" || vec.type === "Polygon" || vec.type === "Line") {
                        const where = vec.type === "Line" ? vec.x1.toFixed(2) + ", " + vec.y1.toFixed(2) : vec.x.toFixed(2) + ", " + vec.y.toFixed(2);
                        const what = vec.type === "Polygon" ? `Polygon (${vec.sides} sides)` : vec.type;
                        return (
                            <option key={i} value={vec.uniqueId}>
                                {what + " at " + where}
                            </option>
                        );
                    } else if (vec.type === "Image") {
                        return (
                            <option key={i} value={vec.uniqueId}>
                                {"Image: " + vec.src.substring(0, 50)}
                            </option>
                        );
                    } else if (vec.text) {
                        return (
                            <option key={i} value={vec.uniqueId}>
                                {(vec.latex ? "LaTeX: " : "Text: ") + vec.text.substring(0, 50)}
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
                {vectorSelectRef.current && selectedOption !== "new" && (
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

    /**
     * Change some fields of the object being edited, keeping the rest. Fields given as undefined
     * are left as they were, as they always have been here.
     */
    const updateObject = (changes: Record<string, any>, objectType?: string) => {
        const defined = Object.fromEntries(Object.entries(changes).filter(([, value]) => value !== undefined));
        setOverlayObject(prev => ({ ...prev, ...defined, drawMode: objectType !== undefined ? objectType : prev.drawMode }));
    };

    /** Text overlays keep separate fill and stroke colours; the editor shows one, which sets both. */
    const textStyle: MoorhenTextStyle = {
        text: theOverlayObject.text ?? "",
        latex: !!theOverlayObject.latex,
        fontFamily: theOverlayObject.fontFamily,
        fontPixelSize: theOverlayObject.fontPixelSize,
        colour: (theOverlayObject.drawStyle === "stroke" ? theOverlayObject.strokeStyle : theOverlayObject.fillStyle) || undefined,
        drawStyle: theOverlayObject.drawStyle === "stroke" ? "stroke" : "fill",
        lineWidth: theOverlayObject.lineWidth,
    };

    const handleTextStyleChange = (changes: Partial<MoorhenTextStyle>) => {
        const { colour, drawStyle, ...rest } = changes;
        const update: Record<string, unknown> = { ...rest };
        if (colour !== undefined) {
            update.fillStyle = colour;
            update.strokeStyle = colour;
        }
        if (drawStyle !== undefined) {
            update.drawStyle = drawStyle;
            setSelectedDrawStyle(drawStyle);
        }
        updateObject(update, "text");
    };


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

    useEffect(() => {
        if (selectedDrawStyle === "gradient" && !theOverlayObject.gradientBoundary) {
            if (checkGradientBoundaryText) {
                const arr = gradientBoundaryText.split(",").map(a => parseFloat(a));
                updateObject({ gradientBoundary: arr.flat() }, drawModeRef.current.value);
            } else {
                updateObject({ gradientBoundary: [0, 0, 1, 1] }, drawModeRef.current.value);
            }
        }
        if (selectedDrawStyle === "gradient" && !theOverlayObject.gradientStops) {
            updateObject({ gradientStops: [{ stop: 0.0, colour: "black" }] }, drawModeRef.current.value);
        }
    }, [selectedDrawStyle]);

    useEffect(() => {
        //console.log("useEffect (gradientBoundaryText)")
        try {
            const arr = gradientBoundaryText
                .split(",")
                .reduce(
                    (rows, key, index) =>
                        (index % 2 == 0 ? rows.push([parseFloat(key)]) : rows[rows.length - 1].push(parseFloat(key))) && rows,
                    []
                );
            if (arr.length > 1 && arr.flat().length % 2 === 0) {
                if (!arr.flat().includes(Number.NaN)) updateObject({ gradientBoundary: arr.flat() }, drawModeRef.current.value);
            }
        } catch (e) {
            console.log("Not a valid array of number pairs for fractional path points.");
        }
    }, [gradientBoundaryText]);

    const checkGradientBoundaryText = () => {
        let isOk: boolean = false;
        try {
            const arr = gradientBoundaryText
                .split(",")
                .reduce(
                    (rows, key, index) =>
                        (index % 2 == 0 ? rows.push([parseFloat(key)]) : rows[rows.length - 1].push(parseFloat(key))) && rows,
                    []
                );
            if (arr.length > 1 && arr.flat().length % 2 === 0) {
                if (!arr.flat().includes(Number.NaN)) isOk = true;
            }
        } catch (e) {
            console.log("Not a valid array of number pairs for fractional path points.");
        }
        return isOk;
    };

    const checkFracPathText = () => {
        let isOk: boolean = false;
        try {
            const arr = pathText
                .split(",")
                .reduce(
                    (rows, key, index) =>
                        (index % 2 == 0 ? rows.push([parseFloat(key)]) : rows[rows.length - 1].push(parseFloat(key))) && rows,
                    []
                );
            if (arr.length > 1 && arr.flat().length % 2 === 0) {
                if (!arr.flat().includes(Number.NaN)) isOk = true;
            }
        } catch (e) {
            console.log("Not a valid array of number pairs for fractional path points.");
        }
        return isOk;
    };

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

    // Follow an object picked in the view.
    useEffect(() => {
        if (!selected2DObjectId || selected2DObjectId === selectedOption) return;
        handleObjectChange({ target: { value: selected2DObjectId } } as React.ChangeEvent<HTMLSelectElement>);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected2DObjectId]);

    // Take on changes made by the handles to the object shown, so that Apply does not put back
    // where it was before it was dragged.
    useEffect(() => {
        if (selectedOption === "new" || !lastLoadedRef.current) return;
        const all: { uniqueId: string }[] = [...textOverlays, ...imageOverlays, ...svgPathOverlays, ...fracPathOverlays, ...shapeOverlays];
        const stored = all.find(o => o.uniqueId === selectedOption);
        if (stored && stored !== lastLoadedRef.current) {
            handleObjectChange({ target: { value: selectedOption } } as React.ChangeEvent<HTMLSelectElement>);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [textOverlays, imageOverlays, svgPathOverlays, fracPathOverlays, shapeOverlays]);

    const drawModeNow = drawMode;
    const isTextObject = drawModeNow === "text";
    const isImageObject = drawModeNow === "image";
    const isPathObject = drawModeNow === "svgpath" || drawModeNow === "fracpath";
    const isShapeObject = drawModeNow === "circle" || drawModeNow === "polygon" || drawModeNow === "line";

    /** Half the polygon's larger extent: its radius when regular. */
    const polygonSize = (() => {
        const [minX, minY, maxX, maxY] = boxOfPoints(pairsOf(theOverlayObject.points ?? []));
        return Math.max(maxX - minX, maxY - minY) / 2 || 40;
    })();
    const setPolygonSize = (size: number) => {
        if (!(size > 0)) return;
        const factor = size / polygonSize;
        updateObject({ points: (theOverlayObject.points as number[]).map(v => v * factor) }, "polygon");
    };
    // Changing the number of sides makes it regular again, at the size it is now.
    const setPolygonSides = (sides: number) => {
        const n = Math.max(3, Math.min(64, Math.round(sides)));
        updateObject({ sides: n, points: regularPolygonPoints(n, polygonSize) }, "polygon");
    };

    // Text and images are placed by a fraction of the view, held as "x, y" text for handleApply.
    const parsedPosition = positionText.split(",").map(a => parseFloat(a));
    const position2D = parsedPosition.length === 2 && parsedPosition.every(Number.isFinite) ? parsedPosition : [0.1, 0.9];

    return (
        <>
            <MoorhenStack card inputGrid>
                {headerContent}
                <MoorhenSelect
                    label="Type"
                    ref={drawModeRef}
                    defaultValue="text"
                    onChange={evt => {
                        if (drawModeRef !== null && typeof drawModeRef !== "function") {
                            setDrawMode(evt.target.value);
                            if (selectedOption === "new") {
                                // A new object takes its type's default style: text filled, a
                                // path outlined (filling an open path closes it up).
                                const drawStyle = evt.target.value === "svgpath" || evt.target.value === "fracpath" ? "stroke" : "fill";
                                setSelectedDrawStyle(drawStyle);
                                updateObject({ drawMode: evt.target.value, drawStyle }, evt.target.value);
                                // Shapes start in the middle of the view rather than in its corner.
                                if (evt.target.value === "circle" || evt.target.value === "polygon") setPositionText("0.5, 0.5");
                            } else {
                                updateObject({ drawMode: evt.target.value }, evt.target.value);
                            }
                        }
                    }}
                >
                    <option value="text">Text</option>
                    <option value="svgpath">SVG path</option>
                    <option value="fracpath">Fractional points path</option>
                    <option value="image">Image</option>
                    <option value="circle">Circle</option>
                    <option value="polygon">Polygon</option>
                    <option value="line">Line</option>
                </MoorhenSelect>
            </MoorhenStack>
            {(isTextObject || isImageObject) && (
                <MoorhenCoordinateInput
                    title="Position (fraction of the view)"
                    labels={["x", "y"]}
                    decimalDigits={3}
                    value={position2D}
                    onChange={([x, y]) => setPositionText(`${x}, ${y}`)}
                />
            )}
            {isTextObject && (
                <MoorhenStack card inputGrid>
                    <MoorhenTextStyleEditor value={textStyle} onChange={handleTextStyleChange} />
                </MoorhenStack>
            )}
            {isImageObject && (
                <>
                    <MoorhenStack card>
                        <MoorhenStack direction="line">
                            <MoorhenFileInput
                                ref={inputFile}
                                accept=".jpeg,.jpg,.png,.bmp,.JPEG,.JPG,.PNG,.BMP"
                                onChange={e => {
                                    console.log("Change", e.target.files);
                                    upLoadNewImage(e.target.files[0]);
                                }}
                            />
                            {/* <MoorhenTextInput
                                disabled
                                text={pathText}
                                label="Image file"
                                onChange={evt => {
                                    updateObject({ src: evt.target.value }, drawModeRef.current.value);
                                }}
                                style={{ height: "2rem", margin: "0.1rem" }}
                            /> */}
                            {imageString && (
                                    <img
                                        style={{ width: "1.5rem", height: "1.5rem", margin: "0.3rem" }}
                                        src={imageString}
                                        width="28"
                                        height="28"
                                    />

                            )}
                        </MoorhenStack>
                    </MoorhenStack>
                    <MoorhenCoordinateInput
                        title="Size (pixels)"
                        labels={["width", "height"]}
                        allowNegativeValues={false}
                        value={[theOverlayObject.width, theOverlayObject.height]}
                        onChange={([width, height]) => updateObject({ width, height }, "image")}
                    />
                </>
            )}
            {isPathObject && (
                <MoorhenStack card inputGrid>
                    {drawModeNow === "svgpath" && (
                        <MoorhenTextInput
                            label="Path"
                            text={theOverlayObject.path}
                            onChange={evt => {
                                updateObject({ path: evt.target.value }, drawModeNow);
                            }}
                        />
                    )}
                    {drawModeNow === "fracpath" && (
                        <MoorhenTextInput
                            label="Path"
                            text={pathText}
                            onChange={evt => {
                                setPathText(evt.target.value);
                            }}
                            isInvalid={!checkFracPathText()}
                        />
                    )}
                    {
                            <MoorhenSelect
                                label="Draw Style"
                                value={selectedDrawStyle}
                                onChange={(evt: React.ChangeEvent<HTMLSelectElement>) => {
                                    setSelectedDrawStyle(evt.target.value);
                                    if (!theOverlayObject.fillStyle && theOverlayObject.strokeStyle && evt.target.value === "fill") {
                                        updateObject(
                                            {
                                                drawStyle: evt.target.value,
                                                fillStyle: theOverlayObject.strokeStyle,
                                            },
                                            drawModeNow
                                        );
                                    } else if (!theOverlayObject.strokeStyle && theOverlayObject.fillStyle && evt.target.value === "stroke") {
                                        updateObject(
                                            {
                                                drawStyle: evt.target.value,
                                                strokeStyle: theOverlayObject.fillStyle,
                                            },
                                            drawModeNow
                                        );
                                    } else {
                                        updateObject({ drawStyle: evt.target.value }, drawModeNow);
                                    }
                                }}
                            >
                                <option key="stroke" value="stroke">
                                    Outline
                                </option>
                                <option key="fill" value="fill">
                                    Filled
                                </option>
                                <option key="gradient" value="gradient">
                                    Gradient
                                </option>
                            </MoorhenSelect>
                        }
                    {selectedDrawStyle === "stroke" && (
                            <MoorhenNumberInput
                                label="Line Width"
                                type="number"
                                value={theOverlayObject.lineWidth ? theOverlayObject.lineWidth : 1.0}
                                onChange={evt => {
                                    updateObject({ lineWidth: parseFloat(evt.target.value) }, drawModeNow);
                                }}
                            />
                        )}
                    {selectedDrawStyle !== "gradient" && (
                            <MoorhenStack direction="line">
                                <label>Colour</label>
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
            )}
            {(drawModeNow === "circle" || drawModeNow === "polygon") && (
                <MoorhenCoordinateInput
                    title="Centre (fraction of the view)"
                    labels={["x", "y"]}
                    decimalDigits={3}
                    value={position2D}
                    onChange={([x, y]) => setPositionText(`${x}, ${y}`)}
                />
            )}
            {drawModeNow === "line" && (
                <>
                    <MoorhenCoordinateInput
                        title="Start (fraction of the view)"
                        labels={["x", "y"]}
                        decimalDigits={3}
                        value={[theOverlayObject.x1, theOverlayObject.y1]}
                        onChange={([x1, y1]) => updateObject({ x1, y1 }, "line")}
                    />
                    <MoorhenCoordinateInput
                        title="End (fraction of the view)"
                        labels={["x", "y"]}
                        decimalDigits={3}
                        value={[theOverlayObject.x2, theOverlayObject.y2]}
                        onChange={([x2, y2]) => updateObject({ x2, y2 }, "line")}
                    />
                </>
            )}
            {drawModeNow === "circle" && (
                <MoorhenCoordinateInput
                    title="Radius (pixels)"
                    labels={["x", "y"]}
                    allowNegativeValues={false}
                    value={[theOverlayObject.radiusX, theOverlayObject.radiusY]}
                    onChange={([radiusX, radiusY]) => updateObject({ radiusX: Math.max(1, radiusX), radiusY: Math.max(1, radiusY) }, "circle")}
                />
            )}
            {isShapeObject && (
                <MoorhenStack card inputGrid>
                    {drawModeNow === "polygon" && (
                        <MoorhenNumberInput label="Sides" type="number" integer minMax={[3, 64]} value={theOverlayObject.sides} setValue={setPolygonSides} />
                    )}
                    {drawModeNow === "polygon" && (
                        <MoorhenNumberInput label="Size (pixels)" type="number" minMax={[1, 5000]} value={polygonSize} setValue={setPolygonSize} />
                    )}
                    {drawModeNow !== "line" && (
                        <MoorhenNumberInput
                            label="Rotation (degrees)"
                            type="number"
                            minMax={[-360, 360]}
                            value={theOverlayObject.rotation ?? 0}
                            setValue={rotation => updateObject({ rotation }, drawModeNow)}
                        />
                    )}
                    {drawModeNow !== "line" && (
                        <MoorhenSelect
                            label="Style"
                            value={selectedDrawStyle === "stroke" ? "stroke" : "fill"}
                            onChange={evt => {
                                setSelectedDrawStyle(evt.target.value);
                                updateObject({ drawStyle: evt.target.value }, drawModeNow);
                            }}
                        >
                            <option value="fill">Filled</option>
                            <option value="stroke">Outline</option>
                        </MoorhenSelect>
                    )}
                    {(drawModeNow === "line" || selectedDrawStyle === "stroke") && (
                        <MoorhenNumberInput
                            label="Line width"
                            type="number"
                            minMax={[0.1, 100]}
                            value={theOverlayObject.lineWidth ?? 1}
                            setValue={lineWidth => updateObject({ lineWidth }, drawModeNow)}
                        />
                    )}
                    {drawModeNow === "line" && (
                        <>
                            <span>Arrow at start</span>
                            <MoorhenToggle label="" checked={!!theOverlayObject.arrowStart} onChange={evt => updateObject({ arrowStart: evt.target.checked }, "line")} />
                            <span>Arrow at end</span>
                            <MoorhenToggle label="" checked={!!theOverlayObject.arrowEnd} onChange={evt => updateObject({ arrowEnd: evt.target.checked }, "line")} />
                        </>
                    )}
                    <span>Colour</span>
                    <MoorhenColourPicker
                        colour={existingColour !== null ? existingColour : [0, 0, 0, selectedAlpha]}
                        setColour={color => {
                            setSelectedAlpha(color[3]);
                            handleColorChange(rgbToHex(color[0], color[1], color[2]) + componentToHex(Math.floor(color[3] * 255)));
                        }}
                        useAlpha={true}
                        position="bottom"
                        tooltip="Change colour"
                    />
                </MoorhenStack>
            )}
            {selectedDrawStyle === "gradient" && drawModeRef.current.value !== "image" && drawModeRef.current.value !== "text" && (
                <MoorhenStack direction="column" card>
                    <MoorhenTextInput
                        label="Gradient boundaries"
                        text={gradientBoundaryText}
                        onChange={evt => {
                            setGradientBoundaryText(evt.target.value);
                        }}
                        isInvalid={!checkGradientBoundaryText()}
                        style={{ height: "2rem", margin: "0.3rem" }}
                    />
                    <div>Gradient stops</div>
                    {theOverlayObject.gradientStops &&
                        theOverlayObject.gradientStops.map((s, istop) => {
                            let col;
                            let alpha = 1.0;
                            if (s.colour.startsWith("#") && s.colour.length === 9) {
                                col = hexToRGB(getHexForCanvasColourName(s.colour.substring(0, 7)));
                                alpha = parseInt(s.colour.substring(7), 16) / 255;
                            } else {
                                col = hexToRGB(getHexForCanvasColourName(s.colour));
                            }
                            return (
                                <MoorhenStack inputGrid gridWidth={3}>
                                    <label></label>
                                    <MoorhenColourPicker
                                        colour={col}
                                        setColour={color => {
                                            if (color.length === 4 && isNaN(color[3])) color[3] = 1.0;
                                            if (color.length === 3) color.push(1.0);
                                            console.log(color);
                                            updateObject(
                                                {
                                                    gradientStops: [
                                                        ...theOverlayObject.gradientStops.slice(0, istop),
                                                        {
                                                            stop: s.stop,
                                                            colour:
                                                                rgbToHex(color[0], color[1], color[2]) +
                                                                componentToHex(Math.floor(color[3] * 255)),
                                                        },
                                                        ...theOverlayObject.gradientStops.slice(istop + 1),
                                                    ],
                                                },
                                                drawModeRef.current.value
                                            );
                                        }}
                                        useAlpha={true}
                                        position="bottom"
                                        tooltip="Change colour"
                                    />
                                    {alpha < 0.99 && <div>(Opacity {alpha.toFixed(2)})</div>}
                                    {alpha >= 0.99 && <div></div>}
                                    <MoorhenNumberInput
                                        type="number"
                                        minMax={[0.0, 1.0]}
                                        decimalDigits={2}
                                        value={s.stop}
                                        onChange={evt => {
                                            updateObject(
                                                {
                                                    gradientStops: [
                                                        ...theOverlayObject.gradientStops.slice(0, istop),
                                                        {
                                                            stop: parseFloat(evt.target.value),
                                                            colour: s.colour,
                                                        },
                                                        ...theOverlayObject.gradientStops.slice(istop + 1),
                                                    ],
                                                },
                                                drawModeRef.current.value
                                            );
                                        }}
                                    />
                                    <MoorhenButton
                                        size="sm"
                                        style={{ margin: "0.1rem" }}
                                        onClick={() => {
                                            updateObject(
                                                {
                                                    gradientStops: [
                                                        ...theOverlayObject.gradientStops.slice(0, istop),
                                                        ...theOverlayObject.gradientStops.slice(istop + 1),
                                                    ],
                                                },
                                                drawModeRef.current.value
                                            );
                                        }}
                                        icon="MatSymDelete"
                                    >
                                    </MoorhenButton>
                                </MoorhenStack>
                            );
                        })}
                    <MoorhenStack direction="line">
                        <label></label>
                        <MoorhenButton
                            size="sm"
                            style={{ margin: "0.1rem" }}
                            onClick={() => {
                                updateObject(
                                    {
                                        gradientStops: [
                                            ...theOverlayObject.gradientStops,
                                            {
                                                stop: 0.0,
                                                colour: "black",
                                            },
                                        ],
                                    },
                                    drawModeRef.current.value
                                );
                            }}
                        >
                            Add new colour
                        </MoorhenButton>
                    </MoorhenStack>
                </MoorhenStack>
            )}
            <MoorhenStack card inputGrid>
                <MoorhenSelect
                    label="Z-depth"
                    value={selectedDepth}
                    onChange={(evt: React.ChangeEvent<HTMLSelectElement>) => {
                        setSelectedDepth(parseInt(evt.target.value));
                        updateObject({ zIndex: parseInt(evt.target.value) }, drawModeRef.current.value);
                    }}
                >
                    <option key="0" value="0">
                        0
                    </option>
                    <option key="1" value="1">
                        1
                    </option>
                    <option key="2" value="2">
                        2
                    </option>
                    <option key="3" value="3">
                        3
                    </option>
                    <option key="4" value="4">
                        4
                    </option>
                </MoorhenSelect>
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
            headerTitle="2D Overlay objects"
            resizeNodeRef={resizeNodeRef}
            body={<Moorhen2DCanvasObjects />}
            footer={null}
        />
    );
};
