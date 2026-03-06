import { Chart, TooltipItem, registerables } from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import { useDispatch, useSelector } from "react-redux";
import { Fragment, useEffect, useRef, useState } from "react";
import { useCommandCentre } from "../../InstanceManager";
import { setHoveredAtom } from "../../store/hoveringStatesSlice";
import { libcootApi } from "../../types/libcoot";
import { moorhen } from "../../types/moorhen";
import { residueCodesOneToThree } from "../../utils/enums";
import { convertViewtoPx, getResidueInfo } from "../../utils/utils";
import { MoorhenButton } from "../inputs";
import { MoorhenMoleculeSelect } from "../inputs";
import { MoorhenChainSelect } from "../inputs/Selector/MoorhenChainSelect";
import { MoorhenMapSelect } from "../inputs/Selector/MoorhenMapSelect";
import { MoorhenStack } from "../interface-base";

Chart.register(...registerables);
Chart.register(annotationPlugin);

export const MoorhenMMRRCCPlot = () => {
    const commandCentre = useCommandCentre();
    const chartCardRef = useRef<HTMLDivElement>(null);
    const chartBoxRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const containerBodyRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chainSelectRef = useRef<null | HTMLSelectElement>(null);
    const mapSelectRef = useRef<null | HTMLSelectElement>(null);
    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null);
    const chartRef = useRef<null | Chart>(null);

    const [plotData, setPlotData] = useState<null | libcootApi.MMRCCStatsJS>(null);
    const [selectedModel, setSelectedModel] = useState<null | number>(null);
    const [selectedMap, setSelectedMap] = useState<null | number>(null);
    const [selectedChain, setSelectedChain] = useState<null | string>(null);

    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height);
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width);
    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor);
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const maps = useSelector((state: moorhen.State) => state.maps);
    const dispatch = useDispatch();

    const getSequenceData = () => {
        const selectedMolecule = molecules.find(molecule => molecule.molNo === selectedModel);
        if (selectedMolecule) {
            const sequenceData = selectedMolecule.sequences.find(sequence => sequence.chain === chainSelectRef.current.value);
            if (sequenceData) {
                return sequenceData.sequence;
            }
        }
    };

    const handleMapChange = evt => {
        setSelectedMap(parseInt(evt.target.value));
    };

    const handleChainChange = evt => {
        setSelectedChain(evt.target.value);
    };

    const handleClick = evt => {
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
            const clickedResidue = getResidueInfo(molecules, selectedMolecule.molNo, chainSelectRef.current.value, residueIndex);
            if (clickedResidue) {
                selectedMolecule.centreOn(`/*/${clickedResidue.chain}/${clickedResidue.seqNum}-${clickedResidue.seqNum}/*`, true, true);
            }
        }
    };

    const setTooltipTitle = (args: TooltipItem<"line">[]) => {
        if (!chartRef.current) {
            return;
        }

        const residueIndex = args[0].dataIndex;
        const selectedMolecule = molecules.find(molecule => molecule.molNo === selectedModel);
        if (selectedMolecule) {
            const clickedResidue = getResidueInfo(molecules, selectedMolecule.molNo, chainSelectRef.current.value, residueIndex);
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

    const fetchData = async () => {
        const response = (await commandCentre.current.cootCommand(
            {
                message: "coot_command",
                command: "mmrrcc",
                returnType: "mmrrcc_stats",
                commandArgs: [
                    parseInt(moleculeSelectRef.current.value),
                    chainSelectRef.current.value,
                    parseInt(mapSelectRef.current.value),
                ],
            },
            false
        )) as moorhen.WorkerResponse<libcootApi.MMRCCStatsJS>;

        setPlotData(response.data.result.result);

        if (selectedModel === null || chainSelectRef.current.value === null || selectedMap === null) {
            setPlotData(null);
            return;
        }
    };

    useEffect(() => {
        if (molecules.length === 0) {
            setSelectedModel(null);
        } else if (selectedModel === null) {
            setSelectedModel(molecules[0].molNo);
        } else if (!molecules.map(molecule => molecule.molNo).includes(selectedModel)) {
            setSelectedModel(molecules[0].molNo);
        }
    }, [molecules.length]);

    useEffect(() => {
        if (maps.length === 0) {
            setSelectedMap(null);
        } else if (selectedMap === null) {
            setSelectedMap(maps[0].molNo);
        } else if (!maps.map(map => map.molNo).includes(selectedMap)) {
            setSelectedMap(maps[0].molNo);
        }
    }, [maps.length]);

    useEffect(() => {
        if (chartRef.current) {
            chartRef.current.destroy();
        }

        if (chainSelectRef.current.value === null || selectedModel === null || plotData === null) {
            return;
        }

        const sequenceData = getSequenceData();
        if (!sequenceData) {
            return;
        }

        const labels: ([string, number] | string)[] = [];
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

        const containerBody = document.getElementById("mmrrcc-container-body");
        containerBody.style.width = labels.length * barWidth + "px";
        const canvas = document.getElementById("mmrrcc-chart-canvas") as HTMLCanvasElement;
        const ctx = canvas.getContext("2d");

        const scales = {
            x: {
                stacked: true,
                beginAtZero: true,
                display: true,
                ticks: {
                    color: isDark ? "white" : "black",
                    font: {
                        size: barWidth,
                        family: "Helvetica",
                    },
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
            y: {
                display: true,
                ticks: { display: true },
                beginAtZero: true,
                title: {
                    display: true,
                    font: { size: axisLabelsFontSize, family: "Helvetica" },
                    text: "Correlation",
                    color: isDark ? "white" : "black",
                },
                grid: {
                    display: true,
                },
            },
        };

        const datasets: {
            label: string;
            data: (number | null)[];
            clip: number | false;
            fill: boolean;
            borderColor: string;
            tension: number;
        }[] = [];

        for (const metric of Object.keys(plotData)) {
            if (!plotData[metric]) {
                continue;
            }

            datasets.push({
                label: metric,
                data: sequenceData.map(currentResidue => {
                    const residue = plotData[metric].find(res => parseInt(res.resNum) === currentResidue.resNum);
                    if (residue) {
                        return residue.correlation;
                    } else {
                        return null;
                    }
                }),
                clip: false,
                fill: false,
                borderColor: metric === "All atoms" ? "black" : "blue",
                tension: 0.1,
            });
        }

        chartRef.current = new Chart(ctx, {
            type: "line",
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
                    annotation: {
                        annotations: {
                            thresholdLine: {
                                type: "line",
                                scaleID: "y-axis-0",
                                yMin: 0.4,
                                yMax: 0.4,
                                borderColor: "red",
                                borderWidth: 1,
                            },
                        },
                    },
                },
                onClick: handleClick,
                responsive: true,
                maintainAspectRatio: false,
                scales: scales,
            },
        });
    }, [plotData, backgroundColor, isDark, height, width]);

    return (
        <>
            <MoorhenStack inputGrid gridWidth={3}>
                <MoorhenMoleculeSelect onSelect={sel => setSelectedModel(sel)} ref={moleculeSelectRef} />
                <MoorhenChainSelect
                    width=""
                    onChange={handleChainChange}
                    molecules={molecules}
                    selectedCoordMolNo={selectedModel}
                    allowedTypes={[1, 2]}
                    ref={chainSelectRef}
                />

                <MoorhenMapSelect width="" onChange={handleMapChange} maps={maps} ref={mapSelectRef} />
                <MoorhenButton variant="secondary" size="lg" onClick={fetchData}>
                    Plot
                </MoorhenButton>
            </MoorhenStack>
            <div ref={chartCardRef} className="validation-plot-div">
                <div ref={chartBoxRef} style={{ height: "100%" }} className="chartBox" id="mmrrcc-chart-box">
                    <div ref={containerRef} className="validation-plot-container" style={{ height: "100%", overflowX: "auto" }}>
                        <div
                            ref={containerBodyRef}
                            style={{ height: "100%", minHeight: convertViewtoPx(45, height) }}
                            className="containerBody"
                            id="mmrrcc-container-body"
                        >
                            <canvas ref={canvasRef} id="mmrrcc-chart-canvas"></canvas>
                        </div>
                    </div>
                </div>
                <canvas id="mmrrcc-chart-axis"></canvas>
            </div>
        </>
    );
};
