import { Delete, FileOpen } from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import { v4 as uuidv4 } from "uuid";
import { useEffect, useRef, useState } from "react";
import {
    addFracPathOverlay,
    addImageOverlay,
    addLatexOverlay,
    addSvgPathOverlay,
    addTextOverlay,
    removeFracPathOverlay,
    removeImageOverlay,
    removeLatexOverlay,
    removeSvgPathOverlay,
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
import { MoorhenButton, MoorhenColourPicker, MoorhenFileInput, MoorhenNumberInput, MoorhenSelect, MoorhenTextInput } from "../inputs";
import { MoorhenStack } from "../interface-base";
import { MoorhenDraggableModalBase } from "../interface-base/ModalBase/DraggableModalBase";

export const Moorhen2DCanvasObjectsModal = () => {
    const resizeNodeRef = useRef<HTMLDivElement>(null);

    const width = useSelector((state: moorhen.State) => state.sceneSettings.width);
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height);
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);

    const imageOverlays = useSelector((state: moorhen.State) => state.overlays.imageOverlayList);
    const latexOverlays = useSelector((state: moorhen.State) => state.overlays.latexOverlayList);
    const textOverlays = useSelector((state: moorhen.State) => state.overlays.textOverlayList);
    const svgPathOverlays = useSelector((state: moorhen.State) => state.overlays.svgPathOverlayList);
    const fracPathOverlays = useSelector((state: moorhen.State) => state.overlays.fracPathOverlayList);
    const availableFonts = useSelector((state: moorhen.State) => state.labelSettings.availableFonts);

    const dispatch = useDispatch();

    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor);
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

    interface RGBColour {
        r: number;
        g: number;
        b: number;
    }

    const [theOverlayObject, setOverlayObject] = useState<any>(newOverlayObject());
    const [selectedOption, setSelectedOption] = useState<string>("new");
    const [selectedFont, setSelectedFont] = useState<string>("serif");
    const [selectedDepth, setSelectedDepth] = useState<number>(0);
    const [selectedDrawStyle, setSelectedDrawStyle] = useState<string>("stroke");
    const [pathText, setPathText] = useState<string>("");
    const [gradientBoundaryText, setGradientBoundaryText] = useState<string>("0,0,1,1");
    const [positionText, setPositionText] = useState<string>("");
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
        }
    };

    const deleteCurrentObject = () => {
        let existingObject: Overlay2DLatexSrcFrac | Overlay2DTextFrac | Overlay2DImageSrcFrac | Overlay2DSvgPath | Overlay2DFracPath = null;
        existingObject = latexOverlays.find(element => element.uniqueId === theOverlayObject.uniqueId);
        if (existingObject) {
            dispatch(removeLatexOverlay(existingObject));
            setSelectedOption("new");
        }
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
    };

    const handleDelete = () => {
        deleteCurrentObject();
    };

    const handleApply = () => {
        const objectType = drawModeRef.current.value;
        if (vectorSelectRef.current.value !== "new") {
            deleteCurrentObject();
        }

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
            dispatch(
                addImageOverlay({
                    src: theOverlayObject.src,
                    x: new_x,
                    y: new_y,
                    width: theOverlayObject.width,
                    height: theOverlayObject.height,
                    uniqueId: theOverlayObject.uniqueId,
                    zIndex: theOverlayObject.zIndex,
                })
            );
        } else if (objectType === "latex") {
            dispatch(
                addLatexOverlay({
                    text: theOverlayObject.text,
                    x: theOverlayObject.x,
                    y: theOverlayObject.y,
                    height: theOverlayObject.height,
                    uniqueId: theOverlayObject.uniqueId,
                    zIndex: theOverlayObject.zIndex,
                })
            );
        } else if (objectType === "svgpath") {
            dispatch(
                addSvgPathOverlay({
                    path: theOverlayObject.path,
                    drawStyle: theOverlayObject.drawStyle,
                    strokeStyle: theOverlayObject.strokeStyle,
                    fillStyle: theOverlayObject.fillStyle,
                    lineWidth: theOverlayObject.lineWidth,
                    gradientStops: theOverlayObject.gradientStops,
                    gradientBoundary: gradientBoundary,
                    uniqueId: theOverlayObject.uniqueId,
                    zIndex: theOverlayObject.zIndex,
                })
            );
        } else if (objectType === "fracpath") {
            let arr: [number, number][] = [
                [0, 0],
                [1, 1],
            ];
            try {
                arr = pathText
                    .split(",")
                    .reduce(
                        (rows, key, index) =>
                            (index % 2 == 0 ? rows.push([parseFloat(key)]) : rows[rows.length - 1].push(parseFloat(key))) && rows,
                        []
                    );
            } catch (e) {
                console.log("Not a valid array of number pairs for fractional path points.");
            }
            if (theOverlayObject.drawStyle === "gradient")
                dispatch(
                    addFracPathOverlay({
                        path: arr,
                        drawStyle: theOverlayObject.drawStyle,
                        strokeStyle: theOverlayObject.strokeStyle,
                        lineWidth: theOverlayObject.lineWidth,
                        gradientStops: theOverlayObject.gradientStops,
                        gradientBoundary: gradientBoundary,
                        uniqueId: theOverlayObject.uniqueId,
                        zIndex: theOverlayObject.zIndex,
                    })
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
                dispatch(
                    addFracPathOverlay({
                        path: arr,
                        drawStyle: theOverlayObject.drawStyle,
                        strokeStyle: theOverlayObject.strokeStyle,
                        fillStyle: theOverlayObject.fillStyle,
                        lineWidth: theOverlayObject.lineWidth,
                        uniqueId: theOverlayObject.uniqueId,
                        zIndex: theOverlayObject.zIndex,
                    })
                );
            }
        }
        setSelectedOption(theOverlayObject.uniqueId);
    };

    const handleObjectChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        if (vectorSelectRef !== null && typeof vectorSelectRef !== "function") {
            vectorSelectRef.current.value = evt.target.value;
            if (vectorSelectRef.current.value === "new") {
                setSelectedOption("new");
                setPathText("");
                setPositionText("");
                setImageString("");
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
                    } else if (drawModeRef.current.value === "latex") {
                        existingObject = existingObject as Overlay2DLatexSrcFrac;
                        setPositionText(existingObject.x.toFixed(3) + ", " + existingObject.y.toFixed(3));
                        setOverlayObject(existingObject);
                    } else {
                        setOverlayObject(existingObject);
                    }
                    if (drawModeRef.current.value === "text") {
                        existingObject = existingObject as Overlay2DTextFrac;
                        if (existingObject.fontFamily && existingObject.text) {
                            if (availableFonts.includes(existingObject.fontFamily)) {
                                setSelectedFont(existingObject.fontFamily);
                            } else if (["serif", "sans-serif", "monospace", "cursive", "fantasy"].includes(existingObject.fontFamily)) {
                                setSelectedFont(existingObject.fontFamily);
                            } else {
                                setSelectedFont("serif");
                            }
                        }
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
                    if (drawModeRef.current.value !== "latex") {
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

    const combinedArrays = [...latexOverlays, ...imageOverlays, ...textOverlays, ...svgPathOverlays, ...fracPathOverlays];

    const headerContent = (
        <MoorhenStack inputGrid>
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
                        } else if (vec.type === "Image") {
                            return (
                                <option key={i} value={vec.uniqueId}>
                                    {"Image: " + vec.src.substring(0, 50)}
                                </option>
                            );
                        } else if (vec.text) {
                            return (
                                <option key={i} value={vec.uniqueId}>
                                    {"Text: " + vec.text.substring(0, 50)}
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
        </MoorhenStack>
    );

    const footer = (
        <>
            {vectorSelectRef.current && selectedOption !== "new" && (
                <MoorhenButton className="m-2" variant="danger" onClick={handleDelete}>
                    Delete
                </MoorhenButton>
            )}
            <MoorhenButton className="m-2" onClick={handleApply}>
                Apply
            </MoorhenButton>
        </>
    );

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

    const isDefaultNew = !drawModeRef || (drawModeRef !== null && typeof drawModeRef !== "function" && drawModeRef.current === null);

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

    useEffect(() => {
        console.log("useEffect (selectedDrawStyle)");
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

    const bodyContent = (
        <>
            {headerContent}
            <MoorhenStack inputGrid>
                <MoorhenSelect
                    label="Type"
                    ref={drawModeRef}
                    defaultValue="text"
                    onChange={evt => {
                        if (drawModeRef !== null && typeof drawModeRef !== "function") {
                            drawModeRef.current.value = evt.target.value;
                            updateObject({ drawMode: evt.target.value }, evt.target.value);
                        }
                    }}
                >
                    <option value="text">Text</option>
                    <option value="svgpath">SVG path</option>
                    <option value="fracpath">Fractional points path</option>
                    <option value="image">Image</option>
                    <option value="latex">Latex</option>
                </MoorhenSelect>
                {(isDefaultNew ||
                    (drawModeRef.current && (drawModeRef.current.value === "text" || drawModeRef.current.value === "latex"))) && (
                    <>
                        <MoorhenTextInput
                            label="Text"
                            text={theOverlayObject.text}
                            onChange={evt => {
                                updateObject({ text: evt.target.value }, drawModeRef.current.value);
                            }}
                        />

                        <MoorhenTextInput
                            label="Position"
                            text={positionText}
                            onChange={evt => {
                                setPositionText(evt.target.value);
                            }}
                            isInvalid={!checkPositionText()}
                        />
                        <MoorhenNumberInput
                            type="number"
                            label="Size"
                            value={
                                drawModeRef !== null && drawModeRef.current !== null && drawModeRef.current.value === "latex"
                                    ? theOverlayObject.height
                                    : theOverlayObject.fontPixelSize
                            }
                            onChange={evt => {
                                try {
                                    const h = parseFloat(evt.target.value);
                                    if (drawModeRef.current.value === "latex") updateObject({ height: h }, drawModeRef.current.value);
                                    else updateObject({ fontPixelSize: h }, drawModeRef.current.value);
                                } catch (e) {}
                            }}
                        />
                    </>
                )}
                {drawModeRef.current && drawModeRef.current.value === "svgpath" && (
                    <MoorhenTextInput
                        label="Path"
                        text={theOverlayObject.path}
                        onChange={evt => {
                            updateObject({ path: evt.target.value }, drawModeRef.current.value);
                        }}
                    />
                )}
                {drawModeRef.current && drawModeRef.current.value === "fracpath" && (
                    <MoorhenTextInput
                        label="Path"
                        text={pathText}
                        onChange={evt => {
                            setPathText(evt.target.value);
                        }}
                        isInvalid={!checkFracPathText()}
                    />
                )}
                {drawModeRef.current && drawModeRef.current.value === "image" && (
                    <>
                        <MoorhenFileInput
                            ref={inputFile}
                            accept=".jpeg,.jpg,.png,.bmp,.JPEG,.JPG,.PNG,.BMP"
                            onChange={e => {
                                console.log("Change", e.target.files);
                                upLoadNewImage(e.target.files[0]);
                            }}
                        />
                        <MoorhenTextInput
                            disabled
                            text={pathText}
                            onChange={evt => {
                                updateObject({ src: evt.target.value }, drawModeRef.current.value);
                            }}
                        />
                        {imageString && (
                            <MoorhenStack direction="line">
                                <img style={{ margin: "0.3rem" }} src={imageString} width="28" height="28" />
                                <MoorhenButton
                                    size="sm"
                                    style={{ margin: "0.1rem" }}
                                    onClick={() => {
                                        inputFile.current.click();
                                    }}
                                >
                                    <FileOpen />
                                </MoorhenButton>
                            </MoorhenStack>
                        )}
                        <MoorhenTextInput
                            label="Position"
                            text={positionText}
                            onChange={evt => {
                                setPositionText(evt.target.value);
                            }}
                            isInvalid={!checkPositionText()}
                        />
                        <MoorhenNumberInput
                            type="number"
                            label="Width"
                            value={theOverlayObject.width}
                            onChange={evt => {
                                try {
                                    const w = parseFloat(evt.target.value);
                                    updateObject({ width: w }, drawModeRef.current.value);
                                } catch (e) {}
                            }}
                        />
                        <MoorhenNumberInput
                            label="Height"
                            type="number"
                            value={theOverlayObject.height}
                            onChange={evt => {
                                try {
                                    const h = parseFloat(evt.target.value);
                                    updateObject({ height: h }, drawModeRef.current.value);
                                } catch (e) {}
                            }}
                        />
                    </>
                )}
                {drawModeRef.current && drawModeRef.current.value === "text" && (
                    <MoorhenSelect
                        label="Font"
                        value={selectedFont}
                        onChange={(evt: React.ChangeEvent<HTMLSelectElement>) => {
                            setSelectedFont(evt.target.value);
                            updateObject({ fontFamily: evt.target.value }, drawModeRef.current.value);
                        }}
                    >
                        {availableFonts.map(item => {
                            return (
                                <option key={item} value={item}>
                                    {item}
                                </option>
                            );
                        })}
                        <option key="serif" value="serif">
                            Serif
                        </option>
                        <option key="sans-serif" value="sans-serif">
                            Sans serif
                        </option>
                        <option key="monospace" value="monospace">
                            Monospace
                        </option>
                        <option key="cursive" value="cursive">
                            Cursive
                        </option>
                        <option key="fantasy" value="fantasy">
                            Fantasy
                        </option>
                    </MoorhenSelect>
                )}
                {drawModeRef.current &&
                    (drawModeRef.current.value === "text" ||
                        drawModeRef.current.value === "svgpath" ||
                        drawModeRef.current.value === "fracpath") && (
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
                                        drawModeRef.current.value
                                    );
                                } else if (!theOverlayObject.strokeStyle && theOverlayObject.fillStyle && evt.target.value === "stroke") {
                                    updateObject(
                                        {
                                            drawStyle: evt.target.value,
                                            strokeStyle: theOverlayObject.fillStyle,
                                        },
                                        drawModeRef.current.value
                                    );
                                } else {
                                    updateObject({ drawStyle: evt.target.value }, drawModeRef.current.value);
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
                    )}
                {drawModeRef.current &&
                    selectedDrawStyle === "stroke" &&
                    (drawModeRef.current.value === "text" ||
                        drawModeRef.current.value === "svgpath" ||
                        drawModeRef.current.value === "fracpath") && (
                        <MoorhenNumberInput
                            label="Line Width"
                            type="number"
                            value={theOverlayObject.lineWidth}
                            onChange={evt => {
                                updateObject({ lineWidth: evt.target.value }, drawModeRef.current.value);
                            }}
                        />
                    )}
                {selectedDrawStyle !== "gradient" &&
                    drawModeRef.current &&
                    (drawModeRef.current.value === "svgpath" ||
                        drawModeRef.current.value === "fracpath" ||
                        drawModeRef.current.value === "text") && (
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
                {selectedDrawStyle === "gradient" && drawModeRef.current.value !== "image" && (
                    <>
                        <MoorhenTextInput
                            label="Gradient boundaries"
                            text={gradientBoundaryText}
                            onChange={evt => {
                                setGradientBoundaryText(evt.target.value);
                            }}
                            isInvalid={!checkGradientBoundaryText()}
                        />
                        <MoorhenStack direction="line">Gradient stops</MoorhenStack>
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
                                    <MoorhenStack direction="line">
                                        <label></label>
                                        <MoorhenColourPicker
                                            colour={col}
                                            setColour={color => {
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
                                                /*
                                   setGradientStops([
                                     ...gradientStops.slice(0, istop),
                                     {stop:s.stop,colour:rgbToHex(color[0], color[1], color[2])+componentToHex(Math.floor(color[3]*255))},
                                     ...gradientStops.slice(istop+1)
                                   ]);
                                   */
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
                                        >
                                            <Delete />
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
                    </>
                )}
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
        </>
    );

    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.OVERLAYS2D}
            left={width / 6}
            top={height / 3}
            minHeight={50}
            minWidth={convertRemToPx(37)}
            maxHeight={convertViewtoPx(70, height)}
            maxWidth={convertViewtoPx(90, width)}
            enforceMaxBodyDimensions={true}
            overflowY="auto"
            overflowX="auto"
            headerTitle="2D Overlay objects"
            resizeNodeRef={resizeNodeRef}
            body={bodyContent}
            footer={footer}
        />
    );
};
