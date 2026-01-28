import { Chart, registerables } from "chart.js";
import { useDispatch, useSelector } from "react-redux";
import { use, useEffect, useRef } from "react";
import { setClipEnd, setClipStart, setMapStyle, setResetClippingFogging } from "@/store";
import { useCommandCentre } from "../../InstanceManager";
import { dispatchPersistentStates, usePersistent, usePersistentState } from "../../store/menusSlice";
import { moorhen } from "../../types/moorhen";
import { modalKeys } from "../../utils/enums";
import { convertViewtoPx } from "../../utils/utils";
import { MoorhenButton, MoorhenGradientPicker } from "../inputs";
import { gradientPresets } from "../inputs/MoorhenGradientPicker/gradientPresets";
import { MoorhenMapSelect } from "../inputs/Selector/MoorhenMapSelect";
import { MoorhenStack } from "../interface-base";
import { MoorhenDraggableModalBase } from "../interface-base/ModalBase/DraggableModalBase";

Chart.register(...registerables);

export const MoorhenColourMapByOtherMapModal = () => {
    const menu = "colour-map-by-other-map-menu-item";
    const dispatch = useDispatch();
    const chartRef = useRef<Chart | null>(null);
    const maps = useSelector((state: moorhen.State) => state.maps);
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);
    const commandCentre = useCommandCentre();
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height);

    //const [minMaxValue, setMinMaxValue] = useState<number> ([-1, 1])
    // const [minMaxValue, setMinMaxValue] = usePersistentState<[number, number]>(menu, "minMaxValue", [-1, 1], false);
    const defaultMin = 2;
    const defaultMax = 6;
    const openLocResFolderRef = useRef<boolean>(false);

    const [minValue, setMinValue] = usePersistentState<number>(menu, "minValue", defaultMin);
    const [maxValue, setMaxValue] = usePersistentState<number>(menu, "maxValue", defaultMax);

    const map1 = usePersistent<number>(menu, "map1", maps.find(map => map.name.endsWith("_locres_filtered.mrc"))?.molNo ?? -1);
    const map2 = usePersistent<number>(menu, "map2", maps.find(map => map.name.endsWith("_locres.mrc"))?.molNo ?? -1);

    useEffect(() => {
        const openLocResFolder = async () => {
            if (minValue === defaultMin && maxValue === defaultMax && map1 !== -1 && map2 !== -1) {
                await guessValues();
                openLocResFolderRef.current = true;
            }
        };
        openLocResFolder();
    }, []);

    const colourTableRef = useRef<[number, [number, number, number]][]>(
        gradientPresets["Pool Party"] as [number, [number, number, number]][]
    );
    const [colourTable, setColourTable] = usePersistentState<[number, [number, number, number]][]>(
        menu,
        "colourTable",
        gradientPresets["Pool Party"] as [number, [number, number, number]][],
        true
    );
    colourTableRef.current = colourTable;

    const mapSelectRef_1 = useRef<null | HTMLSelectElement>(null);
    const mapSelectRef_2 = useRef<null | HTMLSelectElement>(null);

    const handleDefaultColour = () => {
        if (!mapSelectRef_1.current || !mapSelectRef_1.current.value) {
            return;
        }
        const referenceMap = maps.find(map => map.molNo === parseInt(mapSelectRef_1.current.value));

        if (!referenceMap) {
            return;
        }

        referenceMap.setOtherMapForColouring(null);
        referenceMap.drawMapContour();
    };

    const handleApply = () => {
        dispatchPersistentStates(dispatch, menu, [
            { key: "minValue", value: minValue },
            { key: "maxValue", value: minValue },
            { key: "map1", value: mapSelectRef_1.current.value },
            { key: "map2", value: mapSelectRef_2.current.value },
        ]);

        if (!mapSelectRef_1.current.value || !mapSelectRef_2.current.value) {
            return;
        }

        const referenceMap = maps.find(map => map.molNo === parseInt(mapSelectRef_1.current.value));
        const colouringMap = maps.find(map => map.molNo === parseInt(mapSelectRef_2.current.value));

        if (!referenceMap || !colouringMap) {
            return;
        }

        referenceMap.setOtherMapForColouring(colouringMap.molNo, minValue, maxValue);
        referenceMap.drawMapContour();
    };

    const handleApplyColourTable = async () => {
        await commandCentre.current.cootCommand(
            {
                command: "shim_set_colour_map_for_map_coloured_by_other_map",
                commandArgs: colourTableRef.current,
                returnType: "status",
            },
            false
        );
        if (!mapSelectRef_1.current || !mapSelectRef_1.current.value) {
            return;
        }
        handleApply();
    };

    useEffect(() => {
        if (openLocResFolderRef.current) {
            handleApplyColourTable();
            getHistogram();
            dispatch(setClipStart(1000));
            dispatch(setClipEnd(1000));
            dispatch(setResetClippingFogging(false));
            dispatch(
                setMapStyle({
                    molNo: Number(mapSelectRef_1.current.value),
                    style: "solid",
                })
            );
            openLocResFolderRef.current = false;
        }
    }, [minValue, maxValue]);

    const guessValues = async () => {
        if (!mapSelectRef_2 || !mapSelectRef_1.current) {
            return;
        }
        const colouringMap = maps.find(map => map.molNo === parseInt(mapSelectRef_2.current.value));
        if (!colouringMap) {
            return;
        }
        const colouredMap = maps.find(map => map.molNo === parseInt(mapSelectRef_1.current.value));
        const histogram = await colouredMap.getVerticesHistogram(parseInt(mapSelectRef_2.current.value));
        const min = Number(histogram.base.toPrecision(3));
        const max = Number((histogram.base + histogram.bin_width * histogram.counts.length).toPrecision(3));
        console.log("min", min, "max", max);
        setMinValue(min);
        setMaxValue(max);
    };

    const getHistogram = async () => {
        const canvas = document.getElementById(`histogram`) as HTMLCanvasElement;
        const ctx = canvas.getContext("2d");
        const chartData = await parseHistogramData();

        if (chartRef !== null && typeof chartRef !== "function") {
            chartRef.current?.destroy();
            chartRef.current = new Chart(ctx, chartData as any);
        }
    };

    const parseHistogramData = async () => {
        const axisLabelsFontSize = convertViewtoPx(70, height) / 60;

        if (!mapSelectRef_2 || !mapSelectRef_1.current) {
            return;
        }
        const colouringMap = maps.find(map => map.molNo === parseInt(mapSelectRef_2.current.value));
        if (!colouringMap) {
            return;
        }
        const colouredMap = maps.find(map => map.molNo === parseInt(mapSelectRef_1.current.value));
        const histogram = await colouredMap.getVerticesHistogram(parseInt(mapSelectRef_2.current.value), 500);
        function movingAverage(data: number[], windowSize: number): number[] {
            const result = [];
            for (let i = 0; i < data.length; i++) {
                const start = Math.max(0, i - Math.floor(windowSize / 2));
                const end = Math.min(data.length, i + Math.ceil(windowSize / 2));
                const window = data.slice(start, end);
                const avg = window.reduce((sum, val) => sum + val, 0) / window.length;
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
        <MoorhenStack gap="0.5rem">
            <MoorhenStack inputGrid>
                <MoorhenMapSelect maps={maps} ref={mapSelectRef_1} label="Colour this map..." defaultValue={map1 || null} />
                <MoorhenMapSelect maps={maps} ref={mapSelectRef_2} label="By this map..." defaultValue={map2 || null} />
            </MoorhenStack>

            <MoorhenButton variant="secondary" onClick={handleDefaultColour} style={{ marginLeft: "0.5rem" }}>
                Or reset to default colour
            </MoorhenButton>

            <span style={{ marginTop: "0.5rem" }}>Set min and max values for the colour map:</span>
            <MoorhenGradientPicker
                colourTable={colourTable}
                setColourTable={setColourTable}
                menu={menu}
                minValue={minValue}
                setMinValue={setMinValue}
                setMaxValue={setMaxValue}
                maxValue={maxValue}
                // modifyValues
            />
            {/* <MoorhenStack direction="row" gap={1} align="center" justify="space-between" style={{ marginTop: "-1rem" }}>
                <MoorhenNumberInput
                    value={minMaxValue[0]}
                    decimalDigits={2}
                    type="number"
                    setValue={newVal => {
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
                <MoorhenNumberInput
                    value={minMaxValue[1]}
                    minMax={[-10.0, 10.0]}
                    decimalDigits={2}
                    type="number"
                    setValue={newVal => {
                        setMinMaxValue([minMaxValue[0], +newVal]);
                    }}
                />
            </MoorhenStack> */}

            <MoorhenButton variant="secondary" onClick={handleApplyColourTable} style={{ marginLeft: "0.5rem" }}>
                Apply Colour Gradient
            </MoorhenButton>
            <MoorhenStack direction="row" justify="center" style={{ marginTop: "0.5rem" }}>
                <MoorhenButton
                    variant="secondary"
                    onClick={() => {
                        setMinValue(2);
                        setMaxValue(6);
                    }}
                    style={{ marginLeft: "0.5rem" }}
                >
                    Default values
                </MoorhenButton>
                <MoorhenButton variant="secondary" onClick={guessValues} style={{ marginLeft: "0.5rem" }}>
                    Guess Values
                </MoorhenButton>
                <MoorhenButton variant="secondary" onClick={getHistogram} style={{ marginLeft: "0.5rem" }}>
                    Draw Histogram
                </MoorhenButton>
            </MoorhenStack>
            <div className="histogram-plot-div" style={{ width: "95%" }}>
                <canvas id={`histogram`}></canvas>
            </div>
        </MoorhenStack>
    );

    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.COLOR_MAP_BY_MAP}
            body={panelContent}
            headerTitle="Colour map by other map..."
            left={100}
            top={100}
            initialHeight={600}
            initialWidth={440}
            minHeight={220}
            minWidth={360}
            maxHeight={600}
            maxWidth={500}
        />
    );
};
