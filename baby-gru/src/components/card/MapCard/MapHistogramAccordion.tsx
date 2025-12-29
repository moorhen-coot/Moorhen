import { ZoomInOutlined, ZoomOutOutlined } from "@mui/icons-material";
import { Checkbox, IconButton } from "@mui/material";
import { Chart, registerables } from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useRef, useState } from "react";
import { setContourLevel } from "../../../store/mapContourSettingsSlice";
import { libcootApi } from "../../../types/libcoot";
import { moorhen } from "../../../types/moorhen";
import { convertViewtoPx } from "../../../utils/utils";
import { MoorhenStack } from "../../interface-base";
import { MoorhenAccordion } from "../../interface-base/Accordion/Accordion";

Chart.register(...registerables);
Chart.register(annotationPlugin);

type MapHistogramProps = {
    map: moorhen.Map;
    currentContourLevel: number;
};

export const MapHistogramAccordion = (props: MapHistogramProps) => {
    const [histogramBusy, setHistogramBusy] = useState<boolean>(false);
    const [showHistogram, setShowHistogram] = useState<boolean>(false);
    const chartRef = useRef<Chart | null>(null);
    const [zoomFactor, setZoomFactor] = useState<number>(1);
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width);
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height);
    const [exponential, setExponential] = useState<boolean>(props.map.isEM); // set Y axis to logarithmic if EM map
    const [base, setBase] = useState<number>(1);
    const [binWidth, setBinWidth] = useState<number>(1);
    const dispatch = useDispatch();

    const parseHistogramData = (histogramData: libcootApi.HistogramInfoJS) => {
        const axisLabelsFontSize = convertViewtoPx(70, height) / 60;

        const handleClick = evt => {
            if (chartRef !== null && typeof chartRef !== "function") {
                const points = chartRef.current.getElementsAtEventForMode(evt, "nearest", { intersect: true }, true);
                if (points.length === 0) {
                    return;
                }
                const peakIndex = points[0].index;

                dispatch(
                    setContourLevel({
                        molNo: props.map.molNo,
                        contourLevel: histogramData.base + histogramData.bin_width * (peakIndex + 1),
                    })
                );
            }
        };

        const highestCount = Math.max(...histogramData.counts);
        const secondHighestCount = Math.max(...histogramData.counts.filter(count => count !== highestCount));
        const line_postion = Math.round((props.currentContourLevel - histogramData.base) / histogramData.bin_width) - 1;

        return {
            type: "bar",
            options: {
                plugins: {
                    legend: {
                        display: false,
                    },
                    annotation: {
                        annotations: {
                            verticalLine: {
                                type: "line",
                                xMin: line_postion,
                                xMax: line_postion,
                                borderColor: "darkgrey",
                                borderWidth: 2,
                            },
                        },
                    },
                },
                scales: {
                    y: {
                        max: secondHighestCount,
                        type: exponential ? "logarithmic" : "linear",
                        beginAtZero: exponential ? false : true,
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
                        ticks: {
                            callback: function (val, index) {
                                if (exponential) {
                                    return val.toExponential();
                                } else {
                                    return val === secondHighestCount ? highestCount : val;
                                }
                            },
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
                onClick: handleClick,
            },
            data: {
                labels: histogramData.counts.map((item, index) => {
                    const currentBinBase = histogramData.base + histogramData.bin_width * (index + 1);
                    return currentBinBase.toFixed(props.map.isEM ? 4 : 2);
                }),
                datasets: [
                    {
                        barPercentage: 1.0,
                        categoryPercentage: 1.0,
                        label: "Counts",
                        data: histogramData.counts,
                        backgroundColor: [isDark ? "rgba(100, 100, 100, 0.7)" : "rgba(204, 204, 204, 0.7)"],
                        borderColor: [isDark ? "rgba(100, 100, 100, 0.7)" : "rgba(204, 204, 204, 0.7)"],
                    },
                ],
            },
        };
    };

    const updateAnnotation = () => {
        if (chartRef !== null && typeof chartRef !== "function" && chartRef.current) {
            const chart = chartRef.current;
            const linePosition = Math.round((props.currentContourLevel - base) / binWidth) - 1;

            chart.options.plugins.annotation.annotations["verticalLine"] = {
                type: "line",
                xMin: linePosition,
                xMax: linePosition,
                borderColor: "darkgrey",
                borderWidth: 2,
            };
            chart.update();
        }
    };

    useEffect(() => {
        if (showHistogram) {
            updateAnnotation();
        }
    }, [props.currentContourLevel, base, binWidth, showHistogram]);

    useEffect(() => {
        const fetchHistogram = async () => {
            if (!showHistogram) {
                return;
            }

            setHistogramBusy(true);

            const histogram = await props.map.getHistogram(200, zoomFactor);
            const canvas = document.getElementById(`${props.map.molNo}-histogram`) as HTMLCanvasElement;
            const ctx = canvas.getContext("2d");
            const chartData = parseHistogramData(histogram);

            if (!chartData) {
                return;
            }

            if (chartRef !== null && typeof chartRef !== "function") {
                chartRef.current?.destroy();
                chartRef.current = new Chart(ctx, chartData as any);
                setBase(histogram.base);
                setBinWidth(histogram.bin_width);
            }

            setTimeout(() => {
                setHistogramBusy(false);
            }, 500);
        };

        fetchHistogram();
    }, [isDark, showHistogram, width, height, zoomFactor, exponential]);

    return (
        <MoorhenAccordion title="Histogram" onChange={isExpanded => setShowHistogram(isExpanded)}>
            <MoorhenStack style={{ display: "flex", marginTop: "0.5rem" }} gap={1} direction="horizontal">
                <div style={{ width: "95%", aspectRatio: "2/1" }}>
                    <canvas id={`${props.map.molNo}-histogram`}></canvas>
                </div>
                <MoorhenStack
                    style={{
                        display: "flex",
                        width: "1.5rem",
                        justifyContent: "center",
                        alignContent: "center",
                        alignItems: "center",
                        verticalAlign: "center",
                    }}
                    gap={1}
                    direction="vertical"
                >
                    <IconButton
                        onClick={() =>
                            setZoomFactor(prev => {
                                if (prev + 2 > 20) {
                                    return 20;
                                }
                                return prev + 2;
                            })
                        }
                    >
                        <ZoomInOutlined />
                    </IconButton>
                    x{zoomFactor}
                    <IconButton
                        onClick={() =>
                            setZoomFactor(prev => {
                                if (prev - 2 < 1) {
                                    return 1;
                                }
                                return prev - 2;
                            })
                        }
                    >
                        <ZoomOutOutlined />
                    </IconButton>
                </MoorhenStack>
            </MoorhenStack>
            <MoorhenStack
                style={{ display: "flex", margin: 0, padding: 0, height: 0, position: "relative", top: -15 }}
                gap={1}
                direction="horizontal"
            >
                <Checkbox checked={exponential} onChange={evt => setExponential(evt.target.checked)} size="small" />
                <span style={{ margin: "0.0rem", fontSize: "0.8rem" }}>
                    Log<sub>10</sub>(Y)
                </span>
            </MoorhenStack>
        </MoorhenAccordion>
    );
};
