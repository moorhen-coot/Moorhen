import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useMenuMemory, useMenuStateMemory, dispatchMenuMemory } from "../../store/menusSlice";
import { MoorhenMapSelect } from "../select/MoorhenMapSelect";
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { Button, Form } from "react-bootstrap";
import { Checkbox, Stack } from "@mui/material";
import { MoorhenPreciseInput } from "../inputs/MoorhenPreciseInput";
import { Popover } from "@mui/material";
import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase"
import { modalKeys } from "../../utils/enums";
import { RgbColorPicker } from "react-colorful";
import { convertViewtoPx } from '../../utils/utils';
import FlipCameraAndroidIcon from '@mui/icons-material/FlipCameraAndroid';


const menu = "colour-map-by-other-map-menu-item";

export const MoorhenColourMapByOtherMapModal = (props: {
    glRef: React.RefObject<webGL.MGWebGL>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
}) => {
    const dispatch = useDispatch();    
    const maps = useSelector((state: moorhen.State) => state.maps);

    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)

    const [minMaxValue, setMinMaxValue] = useMenuStateMemory<[number, number]>(menu, "minMaxValue", [-1, 1]);
    const map1 = useMenuMemory<number>(menu, "map1", -999999);
    const map2 = useMenuMemory<number>(menu, "map2", -999999);

    const [colourTable, setColourTable] = useMenuStateMemory<[number, [number, number, number]][]>(
        menu,
        "colourTable",
        [
            [0.0, [255, 0, 0]],
            [0.5, [255, 255, 255]],
            [1.0, [0, 0, 255]],
        ],
        true
    );

    const mapSelectRef_1 = useRef<null | HTMLSelectElement>(null);
    const mapSelectRef_2 = useRef<null | HTMLSelectElement>(null);

    const [locRes, setLocRes] = useMenuStateMemory<boolean>(menu, "locRes", false, true);

    const handleDefaultColour = (_evt) => {
        if (!mapSelectRef_1.current || !mapSelectRef_1.current.value) {
            return;
        }
        const referenceMap = maps.find((map) => map.molNo === parseInt(mapSelectRef_1.current.value));

        
        if (!referenceMap) {
            return;
        }

        referenceMap.setOtherMapForColouring(null);
        referenceMap.drawMapContour();
    };

    const handleApply = () => {
        dispatchMenuMemory(dispatch, menu, [
            { key: "minMaxValue", value: minMaxValue },
            { key: "map1", value: mapSelectRef_1.current.value },
            { key: "map2", value: mapSelectRef_2.current.value },
        ]);

        if (!mapSelectRef_1.current.value || !mapSelectRef_2.current.value) {
            return;
        }

        const referenceMap = maps.find((map) => map.molNo === parseInt(mapSelectRef_1.current.value));
        const colouringMap = maps.find((map) => map.molNo === parseInt(mapSelectRef_2.current.value));

        if (!referenceMap || !colouringMap) {
            return;
        }

        referenceMap.setOtherMapForColouring(colouringMap.molNo, minMaxValue[0], minMaxValue[1]);
        referenceMap.drawMapContour();
    };

    const handleApplyColourTable = async () => {

        const response = await props.commandCentre.current.cootCommand(
            {
                command: "shim_set_colour_map_for_map_coloured_by_other_map",
                commandArgs: colourTable,
                returnType: "status",
            },
            false
        );
        if (!mapSelectRef_1.current || !mapSelectRef_1.current.value) {
            return;
        }
        handleApply();
    };

    const guessValues = async () => {
        if (!mapSelectRef_2 || !mapSelectRef_1.current) {
            return;
        }
        const colouringMap = maps.find((map) => map.molNo === parseInt(mapSelectRef_2.current.value));
        if (!colouringMap) {
            return;
        }
        const histogram = await colouringMap.getHistogram(400, 1);
        const secondNonZeroIndex = histogram.counts.findIndex((value, index, array) => {
            if (value !== 0) {
                const firstNonZeroIndex = array.findIndex((v) => v !== 0);
                return index > firstNonZeroIndex && value !== 0;
            }
            return false;
        });
        const suggestedMinVal = secondNonZeroIndex * histogram.bin_width;
        if (locRes) {
            setMinMaxValue([suggestedMinVal, suggestedMinVal + 1]);
        }
    };

    const defaultValues = () => {
        setMinMaxValue(locRes ? [2, 6] : [-4, 4]);
    };

    const panelContent = (
        <Stack direction="column" style={{ margin: "0.5rem" }} gap={1}>
            <Stack direction="column" style={{ margin: "0.5rem" }} gap={0}>
                <MoorhenMapSelect maps={maps} ref={mapSelectRef_1} label="Colour this map..." defaultValue={map1 || null} />                
                    <MoorhenMapSelect maps={maps} ref={mapSelectRef_2} label="By this map..." defaultValue={map2 || null} />
                    <span style={{ marginTop: "0rem", alignItems: "center", display: "flex" }}>
                    <Checkbox
                        checked={locRes}
                        onChange={(evt) => {
                            setLocRes(evt.target.checked);
                        }}
                    />
                    Local Resolution
                </span>
            </Stack>

            <Button variant="secondary" onClick={handleDefaultColour} style={{ marginLeft: "0.5rem" }}>
                Or reset to default colour
            </Button>

            <span style={{ marginTop: "0.5rem" }}>Set min and max values for the colour map:</span>
            {gradientSelector(colourTable, setColourTable)}
            <Stack Stack direction="row"  gap={1} alignItems="center" justifyContent="space-between" style={{ marginTop: "-1rem" }}>
                <MoorhenPreciseInput
                    value={minMaxValue[0]}
                    decimalDigits={2}
                    type="number"
                    setValue={(newVal) => {
                        setMinMaxValue([+newVal, minMaxValue[1]]);
                    }}

                />
                {Array.from({ length: colourTable.length - 2 }).map((_, i) => {
                    const fraction = (i + 1) / (colourTable.length - 1);
                    const value = minMaxValue[0] + fraction * (minMaxValue[1] - minMaxValue[0]);
                    return (
                        <span key={i} style={{ marginTop: "0.5rem" }}>
                            {value.toFixed(2)}
                        </span>
                    );
                })}
                <MoorhenPreciseInput
                    value={minMaxValue[1]}
                    minMax={locRes ? [1.0, 8.0] : [-4.0, 4.0]}
                    decimalDigits={2}
                    type="number"
                    setValue={(newVal) => {
                        setMinMaxValue([minMaxValue[0], +newVal]);
                    }}
                />
            </Stack>

            <Stack direction="row" justifyContent="center" style={{ marginTop: "0.5rem" }}></Stack>
                <Button variant="secondary" onClick={handleApplyColourTable} style={{ marginLeft: "0.5rem" }}>
                    Apply Colour Gradient
                </Button>
            <Stack direction="row" justifyContent="center" style={{ marginTop: "0.5rem" }}>
                <Button variant="secondary" onClick={defaultValues} style={{ marginLeft: "0.5rem" }}>
                    Default values
                </Button>
                <Button variant="secondary" onClick={guessValues} style={{ marginLeft: "0.5rem" }}>
                    Guess Values
                </Button>
            </Stack>
        </Stack>
    );

    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.COLOR_MAP_BY_MAP}
            body={panelContent}
            headerTitle="Colour map by other map..."
            left={width / 6}
            top={height / 6}
            minHeight={convertViewtoPx(15, height)}
            minWidth={convertViewtoPx(25, width)}
            maxHeight={convertViewtoPx(50, height)}
            maxWidth={convertViewtoPx(50, width)}
        />
    );
};


const gradientSelector = (colourTable, setColourTable) => {
        const [nOfPoints, setnOfPoints] = useState<number>(colourTable.length);
        const [internalColourTable, setInternalColourTable] = useState<[number, [number, number, number]][]>(colourTable);
        const [showColourPicker, setShowColourPicker] = useState<number>(-1);
        const [selectedPreset, setSelectedPreset] = useMenuStateMemory(menu, "gradientPresets", "red-white-blue", true);
        
        useEffect(() => {
            if (internalColourTable !== colourTable) {
                setColourTable(internalColourTable);
                setSelectedPreset("Custom");
            }
        }, [showColourPicker, nOfPoints]);

        const handlePointsChange = (newVal: number) => {
            setnOfPoints(newVal);
            const newColourTable: [number, [number, number, number]][] = [];
            for (let i = 0; i < newVal; i++) {
                const colour = internalColourTable[i] ? internalColourTable[i][1] : internalColourTable[internalColourTable.length - 1][1];
                const newColour: [number, [number, number, number]] = [i / (newVal - 1), [colour[0], colour[1], colour[2]]];
                newColourTable.push(newColour);
            }
            setInternalColourTable(newColourTable);
        };
        
        const handlePreset = (newVal: string | null) => {
            setSelectedPreset(newVal)
            if (newVal === "Custom") {
                return;
            }
            const newColourTable = gradientPresets[newVal] || [];
            setnOfPoints(newColourTable.length);
            setColourTable(newColourTable);
            setInternalColourTable(newColourTable);
        };

        const handleRevert = () => {
            const newColourTable: [number, [number, number, number]][] = [];
            for (let i = 0; i < nOfPoints; i++) {
                const colour = internalColourTable[nOfPoints - i - 1][1];
                const newColour: [number, [number, number, number]] = [i / (nOfPoints - 1), [colour[0], colour[1], colour[2]]];
                newColourTable.push(newColour);
            }
            setColourTable(newColourTable);
            setInternalColourTable(newColourTable);
        }

        const dropdown = (index) => {
            const handleColorChange = (selectedColour: { r: number; g: number; b: number }) => {
                const newColourTable: [number, [number, number, number]][] = [];
                for (let i = 0; i < internalColourTable.length; i++) {
                    let colour;
                    if (i === index) {
                        colour = [selectedColour.r, selectedColour.g, selectedColour.b];
                    } else {
                        colour = internalColourTable[i][1];
                    }
                    const colourEntry: [number, [number, number, number]] = [i / (internalColourTable.length - 1), [colour[0], colour[1], colour[2]]];
                    newColourTable.push(colourEntry);
                }
                setInternalColourTable(newColourTable);
            };

            return (
                <>
                    <div
                        onClick={() => setShowColourPicker(index)}
                        id={`colour-picker-${index}`}
                        style={{
                            marginLeft: "0.5rem",
                            width: "25px",
                            height: "25px",
                            borderRadius: "8px",
                            border: "2px solid rgb(255, 255, 255)",
                            boxShadow: "0 0 0 2px rgba(0, 0, 0, 0.2), inset 0 0 0 1px rgba(0, 0, 0, 0.15)",
                            cursor: "pointer",
                            backgroundColor: `rgb(${internalColourTable[index][1][0]},${internalColourTable[index][1][1]},${internalColourTable[index][1][2]})`,
                        }}
                    />
                    <Popover
                        anchorOrigin={{
                            vertical: "top",
                            horizontal: "left",
                        }}
                        transformOrigin={{
                            vertical: "bottom",
                            horizontal: "left",
                        }}
                        anchorEl={document.getElementById(`colour-picker-${index}`)}
                        open={showColourPicker === index}
                        onClose={() => setShowColourPicker(-1)}
                        sx={{
                            "& .MuiPaper-root": {
                                overflowY: "hidden",
                                borderRadius: "8px",
                            },
                        }}
                    >
                        <RgbColorPicker
                            color={{ r: internalColourTable[index][1][0], g: internalColourTable[index][1][1], b: internalColourTable[index][1][2] }}
                            onChange={handleColorChange}
                        />
                        <div
                            style={{
                                width: "100%",
                                display: "flex",
                                justifyContent: "center",
                                marginBottom: "0.1rem",
                            }}
                        >
                            <div className="moorhen-hex-input-decorator">#</div>
                        </div>
                    </Popover>
                </>
            );
        };

        const getColourGradientImage = () => {
            const gradient = `linear-gradient(to right, ${internalColourTable
                .map((colour) => `rgb(${colour[1][0]},${colour[1][1]},${colour[1][2]}) ${Math.round(colour[0] * 100)}%`)
                .join(", ")})`;
            return gradient;
        };
        const colourGradientImage = getColourGradientImage();

        return (
            <Stack direction="column" style={{ margin: "0.5rem" }} gap={2}>
                <Stack direction="row" gap={1} alignItems="center" justifyContent="Center">
                <MoorhenPreciseInput
                    value={nOfPoints}
                    minMax={[3, 7]}
                    decimalDigits={0}
                    type="number"
                    setValue={(newVal) => {
                        handlePointsChange(+newVal);
                    }}
                    label="Points: "
                />
                    Presets:
                    <Form.Select
                        value={selectedPreset}
                        onChange={(evt) => {
                            handlePreset(evt.target.value);
                        }}
                        style={{
                            width: "10rem",
                            marginLeft: "0.5rem",
                            backgroundColor: "white",
                            borderRadius: "8px",
                            border: "2px solid #fff",
                        }}
                    >
                        <option value={"Custom"}>Custom</option>
                        {Object.keys(gradientPresets).map((key) => (
                            <option key={key} value={key}>{key}</option>
                        ))}
                    </Form.Select>
                    <Button key="centre-on-map" size="sm" variant="outlined" onClick={handleRevert}>                
                        <FlipCameraAndroidIcon/>
                    </Button>
                </Stack>


                <Stack direction="column" style={{ margin: "0.5rem" }} gap={0.5}>
                <Stack direction="row"  gap={1} alignItems="center" justifyContent="space-between">
                    {Array.from({ length: internalColourTable.length }).map((_, i) => dropdown(i))}
                </Stack>
                <div
                    style={{
                        marginLeft: "0.2rem",
                        width: "100%",
                        height: "25px",
                        borderRadius: "8px",
                        border: "2px solid #fff",
                        boxShadow: "0 0 0 2px rgba(0, 0, 0, 0.2), inset 0 0 0 1px rgba(0, 0, 0, 0.15)",
                        backgroundImage: colourGradientImage,
                    }}
                />
                </Stack>
            </Stack>
        );
    };

const gradientPresets = {
    "red-white-blue": [
        [0.0, [255, 0, 0]],
        [0.5, [255, 255, 255]],
        [1.0, [0, 0, 255]],
    ],
    "red-white-blue-5": [
        [0.0, [255, 0, 0]],
        [0.25, [255, 128, 128]],
        [0.5, [255, 255, 255]],
        [0.75, [128, 128, 255]],
        [1.0, [0, 0, 255]],
    ],
    "pastel-red-white-blue": [
        [0.0, [255, 100, 100]],
        [0.5, [255, 255, 255]],
        [1.0, [100, 100, 255]],
    ],
    "green-white-blue": [
        [0.0, [0, 255, 0]],
        [0.5, [255, 255, 255]],
        [1.0, [0, 0, 255]],
    ],
    "green-white-blue-5": [
        [0.0, [0, 255, 0]],
        [0.25, [128, 255, 128]],
        [0.5, [255, 255, 255]],
        [0.75, [128, 128, 255]],
        [1.0, [0, 0, 255]],
    ],
    "heatmap": [
        [0.0, [0, 0, 255]],
        [0.25, [0, 255, 255]],
        [0.5, [0, 255, 0]],
        [0.75, [255, 255, 0]],
        [1.0, [255, 0, 0]],
    ],
    "rainbow": [
        [0.0,   [148, 0, 211]],
        [0.166, [75, 0, 130]],
        [0.333, [0, 0, 255]],
        [0.5,   [0, 255, 0]],
        [0.666, [255, 255, 0]],
        [0.833, [255, 127, 0]],
        [1.0,   [255, 0, 0]],
    ],
};