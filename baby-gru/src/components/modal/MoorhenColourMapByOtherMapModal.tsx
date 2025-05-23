import { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useMenuMemory, useMenuStateMemory, dispatchMenuMemory } from "../../store/menusSlice";
import { MoorhenMapSelect } from "../select/MoorhenMapSelect";
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { Button } from "react-bootstrap";
import { Checkbox, Stack } from "@mui/material";
import { MoorhenPreciseInput } from "../inputs/MoorhenPreciseInput";
import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase"
import MoorhenGradientPicker from "../inputs/MoorhenGradientPicker";
import { modalKeys } from "../../utils/enums";
import { convertViewtoPx } from '../../utils/utils';
import { Chart, registerables } from "chart.js";
import { gradientPresets } from "../inputs/gradientPresets";

Chart.register(...registerables);

const menu = "colour-map-by-other-map-menu-item";

export const MoorhenColourMapByOtherMapModal = (props: {
    glRef: React.RefObject<webGL.MGWebGL>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
}) => {
    const dispatch = useDispatch();    
    const chartRef = useRef<Chart | null>(null);
    const maps = useSelector((state: moorhen.State) => state.maps);
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);

    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)

    const [minMaxValue, setMinMaxValue] = useMenuStateMemory<[number, number]>(menu, "minMaxValue", [-1, 1]);
    const map1 = useMenuMemory<number>(menu, "map1", -999999);
    const map2 = useMenuMemory<number>(menu, "map2", -999999);

    const [colourTable, setColourTable] = useMenuStateMemory<[number, [number, number, number]][]>(
        menu,
        "colourTable",
        (gradientPresets["Red White Blue"] as [number, [number, number, number]][]),
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
        const colouredMap = maps.find((map) => map.molNo === parseInt(mapSelectRef_1.current.value))
        const histogram = await colouredMap.getVerticesHistogram(parseInt(mapSelectRef_2.current.value))
        const min = Number(histogram.base.toPrecision(3));
        const max = Number((histogram.base + histogram.bin_width * histogram.counts.length).toPrecision(3));
        console.log("min", min, "max", max);
        setMinMaxValue([min, max]);
    };

    const defaultValues = () => {
        setMinMaxValue(locRes ? [2, 6] : [-4, 4]);
    };

    const getHistogram = async () => {
            const canvas = document.getElementById(`histogram`) as HTMLCanvasElement;
            const ctx = canvas.getContext("2d");
            const chartData = await parseHistogramData();

            if (chartRef !== null && typeof chartRef !== "function") {
                chartRef.current?.destroy();
                chartRef.current = new Chart(ctx, chartData as any);
            }

    }

    const parseHistogramData = async () => {
        const axisLabelsFontSize = convertViewtoPx(70, height) / 60;

        if (!mapSelectRef_2 || !mapSelectRef_1.current) {
            return;
        }
        const colouringMap = maps.find((map) => map.molNo === parseInt(mapSelectRef_2.current.value));
        if (!colouringMap) {
            return;
        }
        const colouredMap = maps.find((map) => map.molNo === parseInt(mapSelectRef_1.current.value))
        const histogram = await colouredMap.getVerticesHistogram(parseInt(mapSelectRef_2.current.value), 500)
        function movingAverage(data: number[], windowSize: number): number[] {
            const result = [];
            for (let i = 0; i < data.length; i++) {
                let start = Math.max(0, i - Math.floor(windowSize / 2));
                let end = Math.min(data.length, i + Math.ceil(windowSize / 2));
                let window = data.slice(start, end);
                let avg = window.reduce((sum, val) => sum + val, 0) / window.length;
                result.push(avg);
            }
            return result;
}


        return {
            type: "line",
            options: {
                plugins: {
                    legend: {
                        display: false,
                    },
                    },
                scales: {
                    y: {

                        type: "linear",
                        beginAtZero: true,
                        grid: {
                            display: true,
                            borderWidth: 0,
                        },
                        title: {
                            display: true,
                            font: { size: axisLabelsFontSize, family: "Helvetica", weight: 800 },
                            text: "Counts",
                            color: "black",
                        },

                    },
                    x: {
                        beginAtZero: true,
                        grid: {
                            display: false,
                            borderWidth: 0,
                        },
                        title: {
                            display: true,
                            font: { size: axisLabelsFontSize, family: "Helvetica", weight: 800 },
                            text: "Density value",
                            color: "black",
                        },
                    },
                },
            },
            data: {
                labels: histogram.counts.map((item, index) => {
                    const currentBinBase = histogram.base + histogram.bin_width * (index + 1);
                    return currentBinBase.toFixed(2);
                }),
                datasets: [
                    {
                        barPercentage: 1.0,
                        categoryPercentage: 1.0,
                        label: "Counts",
                        data: movingAverage(histogram.counts, 5),
                        backgroundColor: [isDark ? "rgba(100, 100, 100, 0.7)" : "rgba(204, 204, 204, 0.7)"],
                        borderColor: [isDark ? "rgba(100, 100, 100, 0.7)" : "rgba(204, 204, 204, 0.7)"],
                        fill: true,
                        pointRadius: 0,
                        
                    },
                ],
            },
        };
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
            <MoorhenGradientPicker
                colourTable={colourTable}
                setColourTable={setColourTable}
                menu={menu}
            />
            <Stack direction="row"  gap={1} alignItems="center" justifyContent="space-between" style={{ marginTop: "-1rem" }}>
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
                <Button variant="secondary" onClick={getHistogram} style={{ marginLeft: "0.5rem" }}>
                    Draw Histogram
                </Button>               
            </Stack>
            <div className="histogram-plot-div" style={{ width: "95%" }}>
                <canvas id={`histogram`}></canvas>
            </div>
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
            maxHeight={convertViewtoPx(60, height)}
            maxWidth={convertViewtoPx(50, width)}
        />
    );
};