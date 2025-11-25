import { SnackbarKey, useSnackbar } from "notistack";
import { Button, Col, Form, InputGroup, Row } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { useCallback, useEffect, useRef, useState } from "react";
import { clearResidueSelection, setResidueSelection } from "../../store/generalStatesSlice";
import { setRequestDrawScene } from "../../store/glRefSlice";
import { moorhen } from "../../types/moorhen";
import { convertRemToPx, paeToImageData, resizeImageData } from "../../utils/utils";
import { MoorhenButton } from "../inputs";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";

interface MoorhenPAEProps {
    resizeTrigger?: boolean;
    size?: { width: number; height: number };
}

const getOffsetRect = (elem: HTMLCanvasElement) => {
    const box = elem.getBoundingClientRect();
    const body = document.body;
    const docElem = document.documentElement;

    const scrollTop = window.pageYOffset || docElem.scrollTop || body.scrollTop;
    const scrollLeft = window.pageXOffset || docElem.scrollLeft || body.scrollLeft;
    const clientTop = docElem.clientTop || body.clientTop || 0;
    const clientLeft = docElem.clientLeft || body.clientLeft || 0;
    const top = box.top + scrollTop - clientTop;
    const left = box.left + scrollLeft - clientLeft;

    return { top: Math.round(top), left: Math.round(left) };
};

export const MoorhenPAEPlot = (props: MoorhenPAEProps) => {
    const dispatch = useDispatch();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const canvasLegendRef = useRef<HTMLCanvasElement>(null);
    const moleculeSelectRef = useRef<HTMLSelectElement>(null);

    const [selectedModel, setSelectedModel] = useState<null | number>(null);
    const [plotData, setPlotData] = useState<null | ImageData>(null);
    const [maxPAE, setMaxPAE] = useState<number>(100);
    const [clickX, setClickX] = useState<number>(-1);
    const [clickY, setClickY] = useState<number>(-1);
    const [moveX, setMoveX] = useState<number>(-1);
    const [moveY, setMoveY] = useState<number>(-1);
    const [releaseX, setReleaseX] = useState<number>(-1);
    const [releaseY, setReleaseY] = useState<number>(-1);
    const [dragMode, setDragMode] = useState<string | null>(null);
    const [queryText, setQueryText] = useState<string>("");
    const [mouseHeldDown, setMouseHeldDown] = useState<boolean>(false);
    const [paeModeButtonState, setPaeModeButtonState] = useState<string>("uniprot");
    const [dataName, setDataName] = useState<string>("");
    const [currentSnackId, setCurrentSnackId] = useState<SnackbarKey | null>(null);
    const [cursorMode, setCursorMode] = useState<string>("drag");
    const [panXY, setPanXY] = useState<{ x: number; y: number }>({ x: -1, y: -1 });

    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height);
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width);
    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor);
    const bright_y = backgroundColor[0] * 0.299 + backgroundColor[1] * 0.587 + backgroundColor[2] * 0.114;

    const { enqueueSnackbar, closeSnackbar } = useSnackbar();

    const axesSpace = 75;

    const clearRubberBand = () => {
        setClickX(-1);
        setClickY(-1);
        setMoveX(-1);
        setMoveY(-1);
        setReleaseX(-1);
        setReleaseY(-1);
    };
    const upLoadPaeFile = async (fn: File) => {
        if (!fn) return;
        const text = await fn.text();
        if (!text) return;
        try {
            const pae = JSON.parse(text);
            if (pae) {
                const imgData = await paeToImageData(pae[0]);
                if (pae[0].max_predicted_aligned_error) setMaxPAE(pae[0].max_predicted_aligned_error);
                clearRubberBand();
                setPlotData(imgData);
                let uniprotID = "";
                if (fn.name.startsWith("AF-") && fn.name.indexOf("-F1-") > -1) {
                    uniprotID = fn.name.substring(3, fn.name.indexOf("-F1"));
                }
                setDataName(uniprotID);
            }
        } catch (e) {
            console.log(e);
            enqueueSnackbar("Failed to parse file " + fn.name + " as PAE", { variant: "error" });
        }
    };

    const fetchDataFromEBI = async (uniprotID: string) => {
        const infoUrl = `https://alphafold.ebi.ac.uk/api/prediction/${uniprotID}`;

        try {
            const infoResponse = await fetch(infoUrl);
            if (infoResponse.ok) {
                const infoJson = await infoResponse.json();
                let bestEntry: number = -1;
                if (infoJson.length > 0) {
                    bestEntry = 0;
                    for (const modelEntry of infoJson) {
                        if (modelEntry.entryId === `AF-${uniprotID}-F1`) {
                            break;
                        }
                        bestEntry++;
                    }
                    if (bestEntry > infoJson.length) bestEntry = 0;
                    const paeDocUrl = infoJson[bestEntry].paeDocUrl;
                    const paeResponse = await fetch(paeDocUrl);
                    if (paeResponse.ok) {
                        const data = await paeResponse.json();
                        const imgData = await paeToImageData(data[0]);
                        if (data[0].max_predicted_aligned_error) setMaxPAE(data[0].max_predicted_aligned_error);
                        clearRubberBand();
                        setPlotData(imgData);
                        setDataName(uniprotID);
                    } else {
                        console.log(paeResponse);
                        enqueueSnackbar("Failed to fetch PAE file for name: " + uniprotID, { variant: "error" });
                    }
                }
            }
        } catch (e) {
            enqueueSnackbar(`Cannot find EBI AlphaFold server entry for ${uniprotID}`, { variant: "error" });
            console.log(`Cannot fetch json info from EBI/AF server for ${uniprotID}`);
        }
    };

    const fetchDataForLoadedMolecule = async () => {
        if (selectedModel !== null && selectedModel > -1 && molecules.length > 0) {
            const matchMols = molecules.filter(mol => {
                return mol.molNo === selectedModel;
            });
            if (matchMols.length > 0) {
                const uniprotID = matchMols[0].name;
                fetchDataFromEBI(uniprotID);
            }
        }
    };

    const fetchData = async () => {
        const uniprotID = queryText;
        fetchDataFromEBI(uniprotID);
    };

    const getXY = evt => {
        if (!canvasRef || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const offset = getOffsetRect(canvas);
        let x: number;
        let y: number;

        if (evt.pageX || evt.pageY) {
            x = evt.pageX;
            y = evt.pageY;
        } else {
            x = evt.clientX;
            y = evt.clientY;
        }
        x -= offset.left;
        y -= offset.top;

        return [x, y];
    };

    const handleModeChange = (event, type) => {
        setPaeModeButtonState(type);
    };

    const handleMouseMove = useCallback(
        evt => {
            if (!canvasRef || !canvasRef.current) return;
            const canvas = canvasRef.current;

            const [x, y] = getXY(evt);

            if (cursorMode === "pan" && mouseHeldDown) {
                setPanXY({ x, y });
                const resizedSize = Math.min(canvas.width, canvas.height - axesSpace);
                const xFracDiff = (x - panXY.x) / resizedSize;
                const yFracDiff = (y - panXY.y) / resizedSize;
                if (dragMode === "normal") {
                    setClickX(clickX + xFracDiff);
                    setClickY(clickY + yFracDiff);
                    setReleaseX(releaseX + xFracDiff);
                    setReleaseY(releaseY + yFracDiff);
                } else if (dragMode === "left" || dragMode === "top-left" || dragMode === "bottom-left") {
                    if (clickX < releaseX) {
                        if (Math.abs(clickX + xFracDiff - releaseX) > 0.02) setClickX(clickX + xFracDiff);
                    } else {
                        if (Math.abs(releaseX + xFracDiff - clickX) > 0.02) setReleaseX(releaseX + xFracDiff);
                    }
                }
                if (dragMode === "right" || dragMode === "bottom-right") {
                    if (clickX > releaseX) {
                        if (Math.abs(clickX + xFracDiff - releaseX) > 0.02) setClickX(clickX + xFracDiff);
                    } else {
                        if (Math.abs(releaseX + xFracDiff - clickX) > 0.02) setReleaseX(releaseX + xFracDiff);
                    }
                }
                if (dragMode === "top" || dragMode === "top-left") {
                    if (clickY < releaseY) {
                        if (Math.abs(clickY + yFracDiff - releaseY) > 0.02) setClickY(clickY + yFracDiff);
                    } else {
                        if (Math.abs(releaseY + yFracDiff - clickY) > 0.02) setReleaseY(releaseY + yFracDiff);
                    }
                }
                if (dragMode === "bottom" || dragMode === "bottom-left" || dragMode === "bottom-right") {
                    if (clickY > releaseY) {
                        if (Math.abs(clickY + yFracDiff - releaseY) > 0.02) setClickY(clickY + yFracDiff);
                    } else {
                        if (Math.abs(releaseY + yFracDiff - clickY) > 0.02) setReleaseY(releaseY + yFracDiff);
                    }
                }
                return;
            }

            if (x > axesSpace && y < canvas.height - axesSpace) {
                const resizedSize = Math.min(canvas.width, canvas.height - axesSpace);

                const xFrac = (x - axesSpace) / resizedSize;
                const yFrac = y / resizedSize;

                if (
                    currentSnackId &&
                    ((xFrac > clickX && xFrac < releaseX) || (xFrac < clickX && xFrac > releaseX)) &&
                    ((yFrac > clickY && yFrac < releaseY) || (yFrac < clickY && yFrac > releaseY))
                ) {
                    if (Math.abs(xFrac - clickX) < 0.04 || Math.abs(xFrac - releaseX) < 0.04) {
                        if (Math.abs(yFrac - clickY) < 0.04 || Math.abs(yFrac - releaseY) < 0.04) {
                            const minX = Math.min(clickX, releaseX);
                            const minY = Math.min(clickY, releaseY);
                            let left = false;
                            let top = false;
                            if (Math.abs(minX - xFrac) < 0.04) {
                                left = true;
                            }
                            if (Math.abs(minY - yFrac) < 0.04) {
                                top = true;
                            }
                            if (left && top) {
                                canvas.style.cursor = "nwse-resize";
                                setDragMode("top-left");
                            } else if (left && !top) {
                                canvas.style.cursor = "nesw-resize";
                                setDragMode("bottom-left");
                            } else if (!left && !top) {
                                canvas.style.cursor = "nwse-resize";
                                setDragMode("bottom-right");
                            } else {
                                canvas.style.cursor = "auto";
                            }
                        } else {
                            const minX = Math.min(clickX, releaseX);
                            canvas.style.cursor = "ew-resize";
                            if (Math.abs(minX - xFrac) < 0.04) {
                                setDragMode("left");
                            } else {
                                setDragMode("right");
                            }
                        }
                    } else if (Math.abs(yFrac - clickY) < 0.04 || Math.abs(yFrac - releaseY) < 0.04) {
                        const minY = Math.min(clickY, releaseY);
                        canvas.style.cursor = "ns-resize";
                        if (Math.abs(minY - yFrac) < 0.04) {
                            setDragMode("top");
                        } else {
                            setDragMode("bottom");
                        }
                    } else {
                        canvas.style.cursor = "grab";
                        setDragMode("normal");
                    }
                } else {
                    canvas.style.cursor = "auto";
                }

                setMoveX(xFrac);
                setMoveY(yFrac);
            }
        },
        [plotData, currentSnackId, cursorMode, panXY, mouseHeldDown, clickX, clickY, releaseX, releaseY, dragMode]
    );

    const handleMouseUp = useCallback(
        async evt => {
            setMouseHeldDown(false);

            if (!canvasRef || !canvasRef.current) return;
            const canvas = canvasRef.current;

            const [x, y] = getXY(evt);

            if (x > axesSpace && y < canvas.height - axesSpace) {
                const resizedSize = Math.min(canvas.width, canvas.height - axesSpace);
                let xFrac = (x - axesSpace) / resizedSize;
                let yFrac = y / resizedSize;
                if (cursorMode === "pan") {
                    xFrac = releaseX;
                    yFrac = releaseY;
                }
                setReleaseX(xFrac);
                setReleaseY(yFrac);
                if (Math.abs((clickX - xFrac) * plotData.width) > 1 && Math.abs((clickY - yFrac) * plotData.height)) {
                    const minRes = Math.round(
                        Math.min(clickX * plotData.width, clickY * plotData.height, xFrac * plotData.width, yFrac * plotData.height)
                    );
                    const maxRes = Math.round(
                        Math.max(clickX * plotData.width, clickY * plotData.height, xFrac * plotData.width, yFrac * plotData.height)
                    );
                    if (molecules.length > 0 && dataName !== "") {
                        const matchMols = molecules.filter(mol => {
                            return mol.name === dataName;
                        });
                        if (matchMols.length > 0) {
                            const newSelection: moorhen.ResidueSelection = {
                                molecule: matchMols[0],
                                first: "/1/A/" + minRes + "/CA",
                                second: "/1/A/" + maxRes + "/CA",
                                cid: "/*/A/" + minRes + "-" + maxRes + "/*",
                                isMultiCid: false,
                                label: "/*/A/" + minRes + "-" + maxRes + "/*",
                            };
                            dispatch(setResidueSelection(newSelection));
                            matchMols[0].drawResidueSelection(newSelection.cid as string);
                            const snackId = await enqueueSnackbar("residue-selection", { variant: "residueSelection", persist: true });
                            setCurrentSnackId(snackId);
                        }
                    }
                } else {
                    if (currentSnackId) {
                        dispatch(clearResidueSelection());
                        await closeSnackbar(currentSnackId);
                        dispatch(setRequestDrawScene(true));
                        setCurrentSnackId(null);
                    }
                }
            }
        },
        [plotData, clickX, clickY, props.size, plotData, molecules, cursorMode, releaseX, releaseY]
    );

    const handleMouseDown = useCallback(
        evt => {
            if (!canvasRef || !canvasRef.current) return;
            const canvas = canvasRef.current;

            const [x, y] = getXY(evt);

            if (
                canvas.style.cursor === "grab" ||
                canvas.style.cursor === "ew-resize" ||
                canvas.style.cursor === "ns-resize" ||
                canvas.style.cursor === "nwse-resize" ||
                canvas.style.cursor === "nesw-resize"
            ) {
                setCursorMode("pan");
                setPanXY({ x, y });
                setMouseHeldDown(true);
                return;
            }
            setCursorMode("drag");

            if (x > axesSpace && y < canvas.height - axesSpace) {
                const resizedSize = Math.min(canvas.width, canvas.height - axesSpace);
                const xFrac = (x - axesSpace) / resizedSize;
                const yFrac = y / resizedSize;
                setClickX(xFrac);
                setClickY(yFrac);
                setMouseHeldDown(true);
            }
        },
        [plotData, cursorMode]
    );

    useEffect(() => {
        canvasRef.current.addEventListener("mousemove", handleMouseMove, false);
        canvasRef.current.addEventListener("mousedown", handleMouseDown, false);
        canvasRef.current.addEventListener("mouseup", handleMouseUp, false);

        return () => {
            if (canvasRef.current !== null) {
                canvasRef.current.removeEventListener("mousemove", handleMouseMove);
                canvasRef.current.removeEventListener("mousedown", handleMouseDown);
                canvasRef.current.removeEventListener("mouseup", handleMouseUp);
            }
        };
    }, [canvasRef, handleMouseMove, handleMouseUp, handleMouseDown]);

    useEffect(() => {
        const plotTheLegend = async () => {
            if (!canvasLegendRef || !canvasLegendRef.current) return;
            const canvas = canvasLegendRef.current;
            const ctx = canvas.getContext("2d");
            if (!ctx || !plotData) return;

            ctx.save();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const grad = ctx.createLinearGradient(axesSpace, 0, canvas.width, 0);
            grad.addColorStop(0, "#006900");
            grad.addColorStop(0.5, "#80b480");
            grad.addColorStop(1, "white");

            if (bright_y > 0.5) {
                ctx.strokeStyle = "black";
                ctx.fillStyle = grad;
            } else {
                ctx.strokeStyle = "white";
                ctx.fillStyle = grad;
            }

            const tm = ctx.measureText("30");
            const tHeight = tm.actualBoundingBoxDescent + tm.actualBoundingBoxAscent;

            ctx.beginPath();
            ctx.moveTo(axesSpace, 0);
            ctx.lineTo(axesSpace, canvas.height - 2.5 * tHeight);
            ctx.lineTo(canvas.width, canvas.height - 2.5 * tHeight);
            ctx.lineTo(canvas.width, 0);
            ctx.lineTo(axesSpace, 0);
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(axesSpace, 0);
            ctx.lineTo(axesSpace, canvas.height - 2.5 * tHeight);
            ctx.lineTo(canvas.width, canvas.height - 2.5 * tHeight);
            ctx.lineTo(canvas.width, 0);
            ctx.lineTo(axesSpace, 0);
            ctx.stroke();

            if (bright_y > 0.5) {
                ctx.fillStyle = "black";
            } else {
                ctx.fillStyle = "white";
            }

            ctx.font = "16px arial";
            for (let ival = 0; ival < maxPAE; ival += 5) {
                const tm = ctx.measureText("" + Math.floor(ival).toFixed(0));
                const tWidth = tm.width;
                const frac = ival / maxPAE;
                const yval = frac * (canvas.width - axesSpace) + axesSpace - tWidth / 2;
                ctx.fillText("" + Math.floor(ival).toFixed(0), yval, canvas.height);
            }

            ctx.restore();
        };
        plotTheLegend();
    }, [plotData, backgroundColor, isDark, height, width, props.size]);

    useEffect(() => {
        const plotTheData = async () => {
            if (!canvasRef || !canvasRef.current) return;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d");
            if (!ctx || !plotData) return;

            const resizeImgData = await resizeImageData(
                plotData,
                Math.min(canvas.width, canvas.height - axesSpace),
                Math.min(canvas.width, canvas.height - axesSpace)
            );
            ctx.save();
            ctx.lineWidth = 2;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (bright_y > 0.5) {
                ctx.strokeStyle = "black";
                ctx.fillStyle = "black";
            } else {
                ctx.strokeStyle = "white";
                ctx.fillStyle = "white";
            }
            ctx.putImageData(resizeImgData, axesSpace, 0);
            ctx.beginPath();
            ctx.moveTo(axesSpace, 0);
            ctx.lineTo(axesSpace, canvas.height - axesSpace);
            ctx.lineTo(canvas.width, canvas.height - axesSpace);
            ctx.lineTo(canvas.width, 0);
            ctx.lineTo(axesSpace, 0);
            ctx.stroke();

            if (mouseHeldDown && !(cursorMode === "pan")) {
                ctx.beginPath();
                ctx.moveTo(axesSpace + clickX * resizeImgData.width, clickY * resizeImgData.height);
                ctx.lineTo(axesSpace + clickX * resizeImgData.width, moveY * resizeImgData.height);
                ctx.lineTo(axesSpace + moveX * resizeImgData.width, moveY * resizeImgData.height);
                ctx.lineTo(axesSpace + moveX * resizeImgData.width, clickY * resizeImgData.height);
                ctx.lineTo(axesSpace + clickX * resizeImgData.width, clickY * resizeImgData.height);
                ctx.stroke();
                ctx.save();
                ctx.fillStyle = "#ffffff77";
                ctx.moveTo(axesSpace + clickX * resizeImgData.width, clickY * resizeImgData.height);
                ctx.lineTo(axesSpace + clickX * resizeImgData.width, moveY * resizeImgData.height);
                ctx.lineTo(axesSpace + moveX * resizeImgData.width, moveY * resizeImgData.height);
                ctx.lineTo(axesSpace + moveX * resizeImgData.width, clickY * resizeImgData.height);
                ctx.lineTo(axesSpace + clickX * resizeImgData.width, clickY * resizeImgData.height);
                ctx.fill();
                ctx.restore();
            }
            if (
                (!mouseHeldDown || cursorMode === "pan") &&
                Math.abs((releaseX - clickX) * resizeImgData.width) > 1 &&
                Math.abs((releaseY - clickY) * resizeImgData.height) > 1
            ) {
                ctx.beginPath();
                ctx.moveTo(axesSpace + clickX * resizeImgData.width, clickY * resizeImgData.height);
                ctx.lineTo(axesSpace + clickX * resizeImgData.width, releaseY * resizeImgData.height);
                ctx.lineTo(axesSpace + releaseX * resizeImgData.width, releaseY * resizeImgData.height);
                ctx.lineTo(axesSpace + releaseX * resizeImgData.width, clickY * resizeImgData.height);
                ctx.lineTo(axesSpace + clickX * resizeImgData.width, clickY * resizeImgData.height);
                ctx.stroke();
                ctx.save();
                ctx.fillStyle = "#ffffff77";
                ctx.beginPath();
                ctx.moveTo(axesSpace + clickX * resizeImgData.width, clickY * resizeImgData.height);
                ctx.lineTo(axesSpace + clickX * resizeImgData.width, releaseY * resizeImgData.height);
                ctx.lineTo(axesSpace + releaseX * resizeImgData.width, releaseY * resizeImgData.height);
                ctx.lineTo(axesSpace + releaseX * resizeImgData.width, clickY * resizeImgData.height);
                ctx.lineTo(axesSpace + clickX * resizeImgData.width, clickY * resizeImgData.height);
                ctx.fill();
                ctx.restore();
                if (!mouseHeldDown) {
                    const maxX = Math.max(axesSpace + clickX * resizeImgData.width, axesSpace + releaseX * resizeImgData.width);
                    const minY = Math.min(clickY * resizeImgData.height, releaseY * resizeImgData.height);
                    ctx.save();
                    ctx.fillStyle = "#ffffff";
                    ctx.beginPath();
                    ctx.arc(maxX, minY, 10, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.restore();
                    ctx.save();
                    ctx.strokeStyle = "black";
                    ctx.beginPath();
                    ctx.moveTo(maxX - 5, minY - 5);
                    ctx.lineTo(maxX + 5, minY + 5);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(maxX - 5, minY + 5);
                    ctx.lineTo(maxX + 5, minY - 5);
                    ctx.stroke();
                    ctx.restore();
                }
            }

            ctx.font = "16px arial";
            for (let ires = 0; ires < plotData.height; ires += 100) {
                const tm = ctx.measureText("  " + ires);
                const tWidth = tm.width;
                ctx.fillText(
                    "" + ires,
                    axesSpace - tWidth,
                    (ires / plotData.height) * resizeImgData.height + tm.actualBoundingBoxDescent + tm.actualBoundingBoxAscent
                );
            }
            for (let ires = 0; ires < plotData.width; ires += 100) {
                const tm = ctx.measureText("" + ires);
                const tWidth = tm.width;
                const tHeight = tm.actualBoundingBoxDescent + tm.actualBoundingBoxAscent;
                ctx.fillText(
                    "" + ires,
                    axesSpace + tWidth + (ires / plotData.height) * resizeImgData.height - tWidth / 2,
                    resizeImgData.height + 2 * tHeight
                );
            }
            const tm = ctx.measureText("Scored residue");
            const tWidth = tm.width;
            const tHeight = tm.actualBoundingBoxDescent + tm.actualBoundingBoxAscent;
            ctx.fillText("Scored residue", resizeImgData.width / 2 + axesSpace - tWidth / 2, canvas.height - tHeight);
            ctx.restore();
            ctx.save();
            ctx.font = "16px arial";
            const tmVert = ctx.measureText("Aligned residue");
            const tWidthVert = tmVert.width;
            const tHeightVert = tmVert.actualBoundingBoxDescent + tm.actualBoundingBoxAscent;
            if (bright_y > 0.5) {
                ctx.strokeStyle = "black";
                ctx.fillStyle = "black";
            } else {
                ctx.strokeStyle = "white";
                ctx.fillStyle = "white";
            }
            ctx.translate(axesSpace / 2, resizeImgData.height / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText("Aligned residue", -tWidthVert / 2, -tHeightVert);
            ctx.restore();
        };
        plotTheData();
    }, [plotData, backgroundColor, isDark, height, width, props.size, clickX, clickY, moveX, moveY, releaseX, releaseY]);

    useEffect(() => {
        if (molecules.length === 0) {
            setSelectedModel(null);
        } else if (selectedModel === null) {
            setSelectedModel(molecules[0].molNo);
        } else if (!molecules.map(molecule => molecule.molNo).includes(selectedModel)) {
            setSelectedModel(molecules[0].molNo);
        }
    }, [molecules.length]);

    const handleModelChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedModel(parseInt(evt.target.value));
    };

    const plotHeight = props.size.height - convertRemToPx(18);
    const plotWidth = props.size.width - convertRemToPx(3);
    const plotSize = Math.min(plotWidth, plotHeight);

    return (
        <>
            <Row style={{ textAlign: "left" }}>
                <Col sm={3}>Data source</Col>
                <InputGroup as={Col} className="mb-3">
                    <Form.Check
                        inline
                        label="Alphafold EBI search"
                        name="paetypegroup"
                        type="radio"
                        checked={paeModeButtonState === "uniprot"}
                        onChange={e => {
                            handleModeChange(e, "uniprot");
                        }}
                    />
                    <Form.Check
                        inline
                        label="PAE File"
                        name="paetypegroup"
                        type="radio"
                        checked={paeModeButtonState === "paefile"}
                        onChange={e => {
                            handleModeChange(e, "paefile");
                        }}
                    />
                    <Form.Check
                        inline
                        label="Loaded molecule"
                        name="paetypegroup"
                        type="radio"
                        checked={paeModeButtonState === "molecule"}
                        onChange={e => {
                            handleModeChange(e, "molecule");
                        }}
                    />
                </InputGroup>
            </Row>

            {paeModeButtonState === "uniprot" && (
                <Row style={{ textAlign: "left", marginBottom: "0.2rem" }} className="align-items-centre">
                    <Form
                        onSubmit={evt => {
                            evt.preventDefault();
                            fetchData();
                        }}
                    >
                        <Form.Group as={Row} className="mb-3" controlId="formAFUniProt">
                            <Col sm={3}>
                                <Form.Label>UniProt</Form.Label>
                            </Col>
                            <Col sm={4}>
                                <Form.Control
                                    type="text"
                                    placeholder="e.g. Q12XU1"
                                    value={queryText}
                                    onChange={evt => {
                                        setQueryText(evt.target.value);
                                    }}
                                />
                            </Col>
                            <Col sm={4}>
                                <MoorhenButton variant="secondary" disabled={queryText.length === 0} size="sm" onClick={fetchData}>
                                    Fetch and plot
                                </MoorhenButton>
                            </Col>
                        </Form.Group>
                    </Form>
                </Row>
            )}
            {paeModeButtonState === "paefile" && (
                <Row style={{ marginBottom: "0.1rem" }}>
                    <Form.Group style={{ width: "20rem", margin: "0.5rem", padding: "0rem" }} controlId="uploadPAE" className="mb-3">
                        <Form.Control
                            type="file"
                            multiple={false}
                            accept=".json,.JSON,.pae,.PAE"
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                upLoadPaeFile(e.target.files[0]);
                            }}
                        />
                    </Form.Group>
                </Row>
            )}
            {paeModeButtonState === "molecule" && (
                <Row>
                    <Col sm={3}>Molecule</Col>
                    <Col sm={4}>
                        <MoorhenMoleculeSelect
                            label={null}
                            width=""
                            defaultValue={selectedModel}
                            onChange={handleModelChange}
                            molecules={molecules}
                            ref={moleculeSelectRef}
                            height="3rem"
                            margin="0rem"
                        />
                    </Col>
                    <Col sm={4}>
                        <MoorhenButton
                            variant="secondary"
                            size="sm"
                            disabled={selectedModel === null || molecules.length === 0 || selectedModel < 0}
                            onClick={fetchDataForLoadedMolecule}
                        >
                            Fetch and plot
                        </MoorhenButton>
                    </Col>
                </Row>
            )}
            <Row>
                <Col>
                    <div>
                        <canvas height={plotSize} width={plotSize} ref={canvasRef}></canvas>
                    </div>
                </Col>
            </Row>
            <Row>
                <Col>
                    <div>
                        <canvas height={50} width={plotSize} ref={canvasLegendRef}></canvas>
                    </div>
                </Col>
            </Row>
        </>
    );
};
