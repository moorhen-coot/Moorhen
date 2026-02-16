import { Chart, ChartEvent, ChartType, TooltipItem, registerables } from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import { useDispatch, useSelector } from "react-redux";
import { useCallback, useRef } from "react";
import { useCommandCentre } from "../../InstanceManager";
import { setHoveredAtom } from "../../store/hoveringStatesSlice";
import { libcootApi } from "../../types/libcoot";
import { moorhen } from "../../types/moorhen";
import { residueCodesOneToThree } from "../../utils/enums";
import { convertViewtoPx, getResidueInfo } from "../../utils/utils";
import { MoorhenValidationChartWidgetBase } from "./MoorhenValidationChartWidgetBase";

Chart.register(...registerables);
Chart.register(annotationPlugin);

const colourPalettes = {
    density_correlation_analysis: value => {
        return "rgb(255, 255, " + Math.floor(256 * value) + ")";
    },
    density_fit_analysis: value => {
        return "rgb(0, " + Math.floor(256 * value) + ", 255)";
    },
    rotamer_analysis: value => {
        return "rgb(" + Math.floor(256 * value) + ", 255, 132)";
    },
    ramachandran_analysis: value => {
        return "rgb(" + Math.floor(256 * value) + ", 132, 255)";
    },
    peptide_omega_analysis: value => {
        return "rgb(" + Math.floor(256 * value) + ", 132, 132)";
    },
};

const metricInfoScaling = {
    density_correlation_analysis: value => {
        return Math.min(Math.max(value, 0), 1);
    },
    density_fit_analysis: value => {
        return value;
    },
    rotamer_analysis: value => {
        // ??
        return (Math.min(Math.max(value, 50), 80) - 50) / 30;
    },
    ramachandran_analysis: value => {
        // probability density turned into a score...
        return Math.min(1 / value, 50) / 50;
    },
    peptide_omega_analysis: value => {
        // deviation from ideal 180 peptide omega angle
        return value;
    },
};

export const MoorhenValidation = (props: { chartId: string }) => {
    const dispatch = useDispatch();
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height);
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width);
    const commandCentre = useCommandCentre();

    const chartRef = useRef(null);

    const plugin = {
        id: "custom_bar_borders",
        afterDatasetsDraw: (chart, args, options) => {
            const { ctx } = chart;
            ctx.save();
            ctx.lineWidth = convertViewtoPx(35, width) / 250;
            for (let datasetIndex = 0; datasetIndex < chart._metasets.length; datasetIndex++) {
                if (chart._metasets[datasetIndex].data.length > 0 && chart._metasets[datasetIndex].data[0]["$context"].raw < 0) {
                    ctx.beginPath();
                    ctx.moveTo(chart._metasets[datasetIndex].data[0].x, chart._metasets[datasetIndex].data[0].base);
                    ctx.lineTo(
                        chart._metasets[datasetIndex].data[chart._metasets[datasetIndex].data.length - 1].x,
                        chart._metasets[datasetIndex].data[0].base
                    );
                    ctx.stroke();
                } else if (chart._metasets[datasetIndex].data.length > 0 && chart._metasets[datasetIndex].data[0]["$context"].raw >= 0) {
                    ctx.beginPath();
                    ctx.moveTo(chart._metasets[datasetIndex].data[0].x, chart._metasets[datasetIndex].data[0].base);
                    ctx.lineTo(
                        chart._metasets[datasetIndex].data[chart._metasets[datasetIndex].data.length - 1].x,
                        chart._metasets[datasetIndex].data[0].base
                    );
                    ctx.stroke();
                }
                for (let dataPoint = 0; dataPoint < chart._metasets[datasetIndex].data.length; dataPoint++) {
                    ctx.beginPath();
                    if (chart._metasets[datasetIndex].data[dataPoint]["$context"].raw < 0) {
                        ctx.rect(
                            chart._metasets[datasetIndex].data[dataPoint].x - chart._metasets[datasetIndex].data[dataPoint].width / 2,
                            chart._metasets[datasetIndex].data[dataPoint].y,
                            chart._metasets[datasetIndex].data[dataPoint].width,
                            chart._metasets[datasetIndex].data[dataPoint].height * -1
                        );
                    } else {
                        ctx.rect(
                            chart._metasets[datasetIndex].data[dataPoint].x - chart._metasets[datasetIndex].data[dataPoint].width / 2,
                            chart._metasets[datasetIndex].data[dataPoint].y,
                            chart._metasets[datasetIndex].data[dataPoint].width,
                            chart._metasets[datasetIndex].data[dataPoint].height
                        );
                    }
                    ctx.stroke();
                }
            }
            ctx.restore();
        },
    };

    const getSequenceData = (selectedMolNo: number, selectedChain: string) => {
        const selectedMolecule = molecules.find(molecule => molecule.molNo === selectedMolNo);
        if (selectedMolecule) {
            const sequenceData = selectedMolecule.sequences.find(sequence => sequence.chain === selectedChain);
            if (sequenceData) {
                return sequenceData.sequence;
            }
        }
    };

    const getAvailableMetrics = (selectedModel: number, selectedMap: number, selectedChain: string) => {
        const allMetrics = [
            {
                command: "density_correlation_analysis",
                returnType: "validation_data",
                chainID: selectedChain,
                commandArgs: [selectedModel, selectedMap],
                needsMapData: true,
                displayName: "Dens. Corr.",
            },
            {
                command: "density_fit_analysis",
                returnType: "validation_data",
                chainID: selectedChain,
                commandArgs: [selectedModel, selectedMap],
                needsMapData: true,
                displayName: "Dens. Fit",
            },
            {
                command: "rotamer_analysis",
                returnType: "validation_data",
                chainID: selectedChain,
                commandArgs: [selectedModel],
                needsMapData: false,
                displayName: "Rota.",
            },
            {
                command: "ramachandran_analysis",
                returnType: "validation_data",
                chainID: selectedChain,
                commandArgs: [selectedModel],
                needsMapData: false,
                displayName: "Rama.",
            },
            {
                command: "peptide_omega_analysis",
                returnType: "validation_data",
                chainID: selectedChain,
                commandArgs: [selectedModel],
                needsMapData: false,
                displayName: "Pept. Omega",
            },
        ];

        const currentlyAvailable = [];
        allMetrics.forEach(metric => {
            if ((metric.needsMapData && selectedMap === null) || selectedModel === null || selectedChain === null) {
                return;
            }
            currentlyAvailable.push(metric);
        });

        return currentlyAvailable;
    };

    const fetchData = async (selectedModel: number, selectedMap: number, selectedChain: string) => {
        if (selectedModel === null || selectedChain === null) {
            return null;
        }
        const availableMetrics = getAvailableMetrics(selectedModel, selectedMap, selectedChain);

        const promises: Promise<moorhen.WorkerResponse<libcootApi.ValidationInformationJS[]>>[] = [];
        availableMetrics.forEach(metric => {
            const inputData = { message: "coot_command", ...metric };
            promises.push(commandCentre.current.cootCommand(inputData, false));
        });
        const responses = await Promise.all(promises);

        const newPlotData: libcootApi.ValidationInformationJS[][] = [];
        responses.forEach(response => {
            newPlotData.push(response.data.result.result);
        });

        return newPlotData;
    };

    const getChart = useCallback(
        (selectedModel: number, selectedMap: number, selectedChain: string, plotData: libcootApi.ValidationInformationJS[][]) => {
            const handleClick = (evt: ChartEvent) => {
                if (chartRef.current === null) {
                    return;
                }

                const points = chartRef.current.getElementsAtEventForMode(evt, "nearest", { intersect: true }, true);

                if (points.length === 0) {
                    return;
                }

                const residueIndex = points[0].index;
                const selectedMolecule = molecules.find(molecule => molecule.molNo === selectedModel);
                if (selectedMolecule) {
                    const clickedResidue = getResidueInfo(molecules, selectedMolecule.molNo, selectedChain, residueIndex);
                    if (clickedResidue) {
                        selectedMolecule.centreOn(
                            `/*/${clickedResidue.chain}/${clickedResidue.seqNum}-${clickedResidue.seqNum}/*`,
                            true,
                            true
                        );
                    }
                }
            };

            const setTooltipTitle = (args: TooltipItem<ChartType>[]) => {
                if (!chartRef.current) {
                    return;
                }

                const residueIndex = args[0].dataIndex;
                const selectedMolecule = molecules.find(molecule => molecule.molNo === selectedModel);
                if (selectedMolecule) {
                    const clickedResidue = getResidueInfo(molecules, selectedMolecule.molNo, selectedChain, residueIndex);
                    if (clickedResidue) {
                        dispatch(
                            setHoveredAtom({
                                molecule: selectedMolecule,
                                cid: `//${clickedResidue.chain}/${clickedResidue.seqNum}(${residueCodesOneToThree[clickedResidue.resCode]})/`,
                                atomInfo: null,
                            })
                        );
                        return `${clickedResidue.seqNum} (${residueCodesOneToThree[clickedResidue.resCode]})`;
                    }
                }

                return "UNK";
            };

            const sequenceData = getSequenceData(selectedModel, selectedChain);
            if (!sequenceData) {
                return;
            }

            const labels = [];
            sequenceData.forEach((residue, index) => {
                if (index % 10 !== 0) {
                    labels.push(residue.resCode);
                } else {
                    labels.push([residue.resCode, residue.resNum]);
                }
            });

            const barWidth = convertViewtoPx(35, width) / 40;
            const tooltipFontSize = 12;
            const axisLabelsFontSize = convertViewtoPx(70, height) / 60;

            const containerBody = document.getElementById(`${props.chartId}-container-body`);
            containerBody.style.width = labels.length * barWidth + "px";

            const scales = {
                x: {
                    stacked: true,
                    beginAtZero: true,
                    display: true,
                    ticks: {
                        color: isDark ? "white" : "black",
                        font: { size: barWidth, family: "Helvetica" },
                        maxRotation: 0,
                        minRotation: 0,
                        autoSkip: false,
                    },
                    grid: {
                        display: false,
                        borderWidth: 1,
                        borderColor: "black",
                    },
                },
            };

            const datasets = [];
            const availableMetrics = getAvailableMetrics(selectedModel, selectedMap, selectedChain);
            for (let methodIndex = 0; methodIndex < plotData.length; methodIndex++) {
                if (!plotData[methodIndex]) {
                    continue;
                }
                const metricScale = metricInfoScaling[availableMetrics[methodIndex].command];
                const palette = colourPalettes[availableMetrics[methodIndex].command];
                datasets.push({
                    label: availableMetrics[methodIndex].displayName,
                    data: sequenceData.map(currentResidue => {
                        const residue = plotData[methodIndex].find(res => res.seqNum === currentResidue.resNum);
                        if (residue) {
                            return metricScale(residue.value);
                        } else {
                            return null;
                        }
                    }),
                    backgroundColor: sequenceData.map(currentResidue => {
                        const residue = plotData[methodIndex].find(res => res.seqNum === currentResidue.resNum);
                        if (residue) {
                            const gFrac = 1.0 - metricScale(residue.value);
                            return palette(gFrac);
                        } else {
                            return null;
                        }
                    }),
                    borderWidth: 0,
                    clip: false,
                    yAxisID: methodIndex > 0 ? "y" + (methodIndex + 1) : "y",
                });
                scales[methodIndex > 0 ? "y" + (methodIndex + 1) : "y"] = {
                    display: true,
                    ticks: { display: false },
                    stack: "demo",
                    stackWeight: 1,
                    beginAtZero: true,
                    title: {
                        display: true,
                        font: { size: axisLabelsFontSize, family: "Helvetica", weight: 800 },
                        text: availableMetrics[methodIndex].displayName,
                        color: isDark ? "white" : "black",
                    },
                    grid: {
                        display: false,
                        borderWidth: 0,
                    },
                };
            }

            return {
                plugins: [plugin],
                type: "bar",
                data: {
                    labels: labels,
                    datasets: datasets,
                },
                options: {
                    plugins: {
                        legend: {
                            display: false,
                        },
                        tooltip: {
                            backgroundColor: "#ddd",
                            borderColor: "black",
                            borderWidth: 1,
                            displayColors: false,
                            titleColor: "black",
                            bodyColor: "black",
                            footerColor: "black",
                            callbacks: {
                                title: setTooltipTitle,
                            },
                            titleFont: {
                                size: tooltipFontSize,
                                family: "Helvetica",
                            },
                            bodyFont: {
                                size: tooltipFontSize,
                                family: "Helvetica",
                            },
                            footerFont: {
                                family: "Helvetica",
                            },
                        },
                    },
                    onClick: handleClick,
                    responsive: true,
                    maintainAspectRatio: false,
                    barThickness: "flex",
                    scales: scales,
                },
            };
        },
        [isDark, width, height]
    );

    return <MoorhenValidationChartWidgetBase ref={chartRef} fetchData={fetchData} getChart={getChart} chartId={props.chartId} />;
};
