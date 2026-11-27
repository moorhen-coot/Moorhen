import { Chart, registerables } from "chart.js";
import { useDispatch, useSelector } from "react-redux";
import { use, useEffect, useRef, useState } from "react";
import { setAutoClip, setAutoFog, setClipEnd, setClipStart } from "@/store";
import { setPrimaryMapRepresentation } from "@/store/mapRepresentationsSlice";
import { dispatchPersistentStates, usePersistent, usePersistentState } from "../../store/menusSlice";
import { moorhen } from "../../types/moorhen";
import { modalKeys } from "../../utils/enums";
import { convertViewtoPx } from "../../utils/utils";
import { MoorhenButton, MoorhenGradientPicker, MoorhenGradientPickerButton } from "../inputs";
import { gradientPresets } from "../inputs/MoorhenGradientPicker/gradientPresets";
import { MoorhenMapSelect } from "../inputs/Selector/MoorhenMapSelect";
import {
    LOCAL_RESOLUTION_DENSITY,
    LOCAL_RESOLUTION_VALUES,
    colourByMapChanges,
    guessColourByMapRange,
    plainColourChanges,
} from "../../utils/colourByMap";
import { MoorhenStack } from "../interface-base";
import { MoorhenDraggableModalBase } from "../interface-base/ModalBase/DraggableModalBase";
import { ModalComponentProps } from "../interface-base/ModalBase/ModalsContainer";

Chart.register(...registerables);

export const MoorhenColourMapByOtherMapModal = (props: ModalComponentProps) => {
    const menu = "colour-map-by-other-map-menu-item";
    const dispatch = useDispatch();
    const chartRef = useRef<Chart | null>(null);
    // A ref, not document.getElementById: inside the web component the canvas is in a shadow root
    const histogramCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const maps = useSelector((state: moorhen.State) => state.maps);
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height);
    // Docked, the modal is narrow: the gradient picker opens from a button, towards the view
    const [docked, setDocked] = useState<"left" | "right" | null>(props.openDocked ?? null);

    //const [minMaxValue, setMinMaxValue] = useState<number> ([-1, 1])
    // const [minMaxValue, setMinMaxValue] = usePersistentState<[number, number]>(menu, "minMaxValue", [-1, 1], false);
    const defaultMin = 2;
    const defaultMax = 6;

    const [minValue, setMinValue] = usePersistentState<number>(menu, "minValue", defaultMin);
    const [maxValue, setMaxValue] = usePersistentState<number>(menu, "maxValue", defaultMax);

    // RELION's local resolution maps: the filtered density, coloured by the local resolution (the newest ones loaded)
    const findLast = (pattern: RegExp) => [...maps].reverse().find(map => pattern.test(map.name));
    const locResDensity = () => findLast(LOCAL_RESOLUTION_DENSITY);
    const locResValues = () => findLast(LOCAL_RESOLUTION_VALUES);
    const map1 = usePersistent<number>(menu, "map1", locResDensity()?.molNo ?? -1);
    const map2 = usePersistent<number>(menu, "map2", locResValues()?.molNo ?? -1);

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

        // The map's display record changes, which redraws it
        dispatch(setPrimaryMapRepresentation({ mapUid: referenceMap.uniqueId, changes: plainColourChanges }));
    };

    /** Colour the first map by the second, from `range` (the inputs' unless given: state set just before is not read yet) */
    const handleApply = (range: { min: number; max: number } = { min: minValue, max: maxValue }) => {
        dispatchPersistentStates(dispatch, menu, [
            { key: "minValue", value: range.min },
            { key: "maxValue", value: range.max },
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

        // The other map, its range and the gradient are the map's own (its display record, map-display.md): maps
        // coloured with different gradients each keep theirs. Changing the record redraws the map.
        dispatch(
            setPrimaryMapRepresentation({
                mapUid: referenceMap.uniqueId,
                changes: colourByMapChanges(colouringMap, range, colourTableRef.current),
            })
        );
    };

    const handleApplyColourTable = () => {
        if (!mapSelectRef_1.current || !mapSelectRef_1.current.value) {
            return;
        }
        handleApply();
    };

    /**
     * A RELION local resolution folder was opened (FileLoading: modalProps.localResolutionFolder), or the modal opened
     * on such maps never set up: pick the two maps, guess the range, colour the density with it, show the histogram, and
     * draw it as a surface with the clipping wide open. In one go, the range passed on: the gradient used to be left
     * unapplied, the apply waiting on state the guess had not set yet.
     */
    const setUpLocalResolution = async () => {
        const density = locResDensity();
        const values = locResValues();
        if (!density || !values || !mapSelectRef_1.current || !mapSelectRef_2.current) {
            return;
        }
        mapSelectRef_1.current.value = String(density.molNo);
        mapSelectRef_2.current.value = String(values.molNo);
        const range = await guessValues();
        if (!range) {
            return;
        }
        handleApply(range);
        dispatch(setClipStart(1000));
        dispatch(setClipEnd(1000));
        dispatch(setAutoFog(false));
        dispatch(setAutoClip(false));
        dispatch(setPrimaryMapRepresentation({ mapUid: density.uniqueId, changes: { style: "solid" } }));
        await getHistogram();
    };

    useEffect(() => {
        const fromFolder = props.modalProps?.localResolutionFolder === true;
        const neverSetUp = minValue === defaultMin && maxValue === defaultMax && map1 !== -1 && map2 !== -1;
        if (fromFolder || neverSetUp) {
            void setUpLocalResolution();
        }
        // Again for each folder opened while the modal is open: each showModal call brings new modalProps
    }, [props.modalProps]);

    const guessValues = async (): Promise<{ min: number; max: number } | null> => {
        if (!mapSelectRef_2.current || !mapSelectRef_1.current) {
            return null;
        }
        const colouringMap = maps.find(map => map.molNo === parseInt(mapSelectRef_2.current.value));
        const colouredMap = maps.find(map => map.molNo === parseInt(mapSelectRef_1.current.value));
        if (!colouringMap || !colouredMap) {
            return null;
        }
        const range = await guessColourByMapRange(colouredMap, colouringMap);
        if (range) {
            setMinValue(range.min);
            setMaxValue(range.max);
        }
        return range;
    };

    const getHistogram = async () => {
        const ctx = histogramCanvasRef.current?.getContext("2d");
        if (!ctx) {
            return;
        }
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

            {docked ? (
                <MoorhenStack gap="0.2rem" style={{ marginTop: "0.5rem" }}>
                    <span>Colour gradient (click to edit, with its range):</span>
                    <MoorhenGradientPickerButton
                        ariaLabel="Colour gradient"
                        popoverPlacement={docked === "right" ? "left" : "right"}
                        style={{ boxSizing: "border-box" }}
                        colourTable={colourTable}
                        setColourTable={setColourTable}
                        menu={menu}
                        minValue={minValue}
                        setMinValue={setMinValue}
                        setMaxValue={setMaxValue}
                        maxValue={maxValue}
                        modifyValues
                    />
                    <MoorhenStack direction="row" justify="space-between" style={{ fontSize: "0.8rem" }}>
                        <span>{minValue}</span>
                        <span>{maxValue}</span>
                    </MoorhenStack>
                </MoorhenStack>
            ) : (
                <>
                    <span style={{ marginTop: "0.5rem" }}>Set min and max values for the colour map:</span>
                    <MoorhenGradientPicker
                        colourTable={colourTable}
                        setColourTable={setColourTable}
                        menu={menu}
                        minValue={minValue}
                        setMinValue={setMinValue}
                        setMaxValue={setMaxValue}
                        maxValue={maxValue}
                        modifyValues
                    />
                </>
            )}
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

            <MoorhenButton variant="secondary" onClick={() => handleApplyColourTable()} style={{ marginLeft: "0.5rem" }}>
                Apply Colour Gradient
            </MoorhenButton>
            <MoorhenStack direction="row" justify="center" gap="0.5rem" style={{ marginTop: "0.5rem", flexWrap: "wrap" }}>
                <MoorhenButton
                    variant="secondary"
                    onClick={() => {
                        setMinValue(2);
                        setMaxValue(6);
                    }}
                >
                    Default values
                </MoorhenButton>
                <MoorhenButton variant="secondary" onClick={() => void guessValues()}>
                    Guess Values
                </MoorhenButton>
                <MoorhenButton variant="secondary" onClick={getHistogram}>
                    Draw Histogram
                </MoorhenButton>
            </MoorhenStack>
            <div className="histogram-plot-div" style={{ width: "95%" }}>
                <canvas id={`histogram`} ref={histogramCanvasRef}></canvas>
            </div>
        </MoorhenStack>
    );

    return (
        <MoorhenDraggableModalBase
            allowDocking={true}
            modalId={modalKeys.COLOR_MAP_BY_MAP}
            body={panelContent}
            headerTitle="Colour map by other map..."
            openDocked={props.openDocked}
            onDock={setDocked}
        />
    );
};
