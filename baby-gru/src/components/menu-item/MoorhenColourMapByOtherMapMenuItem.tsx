import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useMenuMemory, useMenuStateMemory, dispatchMenuMemory } from "../../store/menusSlice";
import { MoorhenMapSelect } from "../select/MoorhenMapSelect";
import { moorhen } from "../../types/moorhen";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";
import { webGL } from "../../types/mgWebGL";
import { Button } from "react-bootstrap";
import { Checkbox, Stack } from "@mui/material";
import { MoorhenSlider } from "../inputs/MoorhenSlider-new";
import { MoorhenPreciseInput } from "../inputs/MoorhenPreciseInput";
import { Popover } from "@mui/material";
import { HexColorInput, RgbColorPicker } from "react-colorful";
import zIndex from "@mui/material/styles/zIndex";

export const MoorhenColourMapByOtherMapMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    glRef: React.RefObject<webGL.MGWebGL>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
}) => {
    const dispatch = useDispatch();
    const menu = "colour-map-by-other-map-menu-item";
    const maps = useSelector((state: moorhen.State) => state.maps);

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

    const handleCancel = (_evt) => {
        document.body.click();
    };

    const gradientSelector = () => {
        const [nOfPoints, setnOfPoints] = useState<number>(colourTable.length);

        const handlePointsChange = (newVal: number) => {
            setnOfPoints(newVal);
            const newColourTable = [];
            for (let i = 0; i < newVal; i++) {
                const colour = colourTable[i] ? colourTable[i][1] : [0, 0, 0];
                const newColour = [i / (newVal - 1), [colour[0], colour[1], colour[2]]];
                newColourTable.push(newColour);
            }
            setColourTable(newColourTable);
        };

        const [showColourPicker, setShowColourPicker] = useState<number>(-1);

        const dropdown = (index) => {
            const handleColorChange = (selectedColour: { r: number; g: number; b: number }) => {
                const newColourTable = [];
                for (let i = 0; i < colourTable.length; i++) {
                    let colour;
                    if (i === index) {
                        colour = [selectedColour.r, selectedColour.g, selectedColour.b];
                    } else {
                        colour = colourTable[i][1];
                    }
                    const colourEntry = [i / (colourTable.length - 1), [colour[0], colour[1], colour[2]]];
                    newColourTable.push(colourEntry);
                }
                setColourTable(newColourTable);
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
                            border: "3px solid #fff",
                            boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(0, 0, 0, 0.1)",
                            cursor: "pointer",
                            backgroundColor: `rgb(${colourTable[index][1][0]},${colourTable[index][1][1]},${colourTable[index][1][2]})`,
                        }}
                    />
                    <Popover
                        anchorOrigin={{
                            vertical: "bottom",
                            horizontal: "left",
                        }}
                        transformOrigin={{
                            vertical: "top",
                            horizontal: "left",
                        }}
                        anchorEl={document.getElementById(`colour-picker-${index}`)}
                        open={showColourPicker === index}
                        onClose={() => setShowColourPicker(-1)}
                        sx={{
                            "& .MuiPaper-root": {
                                overflowY: "hidden",
                                borderRadius: "8px",
                                zIndex: 99999,
                            },
                        }}
                    >
                        <RgbColorPicker
                            color={{ r: colourTable[index][1][0], g: colourTable[index][1][1], b: colourTable[index][1][2] }}
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

        return (
            <Stack direction="column" style={{ margin: "0.5rem" }} gap={1}>
                <MoorhenPreciseInput
                    value={nOfPoints}
                    minMax={[3, 7]}
                    decimalDigits={0}
                    type="number"
                    setValue={(newVal) => {
                        handlePointsChange(+newVal);
                    }}
                    label="Number of points"
                />
                <Stack direction="row" style={{ margin: "0.5rem" }} gap={1} alignItems="center" justifyContent="center">
                    {Array.from({ length: colourTable.length }).map((_, i) => dropdown(i))}
                </Stack>
                <Button variant="secondary" onClick={handleSetColourRamp} style={{ marginLeft: "0.5rem" }}>
                    Apply Colour Gradient
                </Button>
            </Stack>
        );
    };

    const handleDefaultColour = (_evt) => {
        if (!mapSelectRef_1.current.value) {
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

    const handleSelectorChange = () => {
        guessValues();
    };

    useEffect(() => {
        if (locRes) {
            guessValues();
        }
    }, [locRes]);

    const handleSetColourRamp = async () => {
        const response = await props.commandCentre.current.cootCommand(
            {
                command: "shim_set_colour_map_for_map_coloured_by_other_map",
                commandArgs: colourTable,
                returnType: "status",
            },
            false
        );
    };

    const panelContent = (
        <Stack direction="column" style={{ margin: "0.5rem" }} gap={1}>
            <Stack direction="column" style={{ margin: "0.5rem" }} gap={0}>
                <MoorhenMapSelect maps={maps} ref={mapSelectRef_1} label="Colour this map..." defaultValue={map1 || null} />
                <MoorhenMapSelect maps={maps} ref={mapSelectRef_2} label="By this map..." defaultValue={map2 || null} onChange={handleSelectorChange} />
            </Stack>
            <span style={{ marginTop: "0.5rem" }}>
                <Checkbox checked={locRes} onChange={(evt) => setLocRes(evt.target.checked)} />
                Local resolution map
            </span>

            <Button variant="secondary" onClick={handleDefaultColour} style={{ marginLeft: "0.5rem" }}>
                Or reset to default colour
            </Button>

            <span style={{ marginTop: "0.5rem" }}>Set min and max values for the colour map:</span>

            <MoorhenSlider
                externalValue={minMaxValue}
                minVal={locRes ? 1.0 : -4.0}
                maxVal={locRes ? 8.0 : 4.0}
                decimalPlaces={2}
                setExternalValue={(value) => {
                    setMinMaxValue(value as [number, number]);
                }}
                sliderTitle={"Levels"}
                usePreciseInput={true}
                piMinMax={null}
            />

            {gradientSelector()}

            <Stack direction="row" justifyContent="center" style={{ marginTop: "0.5rem" }}>
                <Button variant="primary" onClick={handleApply}>
                    Apply
                </Button>
                <Button variant="secondary" onClick={guessValues} style={{ marginLeft: "0.5rem" }}>
                    Default values
                </Button>
                <Button variant="danger" onClick={handleCancel} style={{ marginLeft: "0.5rem" }}>
                    Close
                </Button>
            </Stack>
        </Stack>
    );

    return (
        <MoorhenBaseMenuItem
            id="colour-map-by-other-map-menu-item"
            popoverContent={panelContent}
            menuItemText="Colour map by other map..."
            showOkButton={false}
            setPopoverIsShown={props.setPopoverIsShown}
        />
    );
};
