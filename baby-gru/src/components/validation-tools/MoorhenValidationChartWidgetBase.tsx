import { Chart, registerables } from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import { Col, Form, Row } from "react-bootstrap";
import { useSelector } from "react-redux";
import { Fragment, forwardRef, useEffect, useRef, useState } from "react";
import { usePersistentState } from "../../store/menusSlice";
import { moorhen } from "../../types/moorhen";
import { convertViewtoPx } from "../../utils/utils";
import { MoorhenMoleculeSelect } from "../inputs";
import { MoorhenChainSelect } from "../inputs/Selector/MoorhenChainSelect";
import { MoorhenMapSelect } from "../inputs/Selector/MoorhenMapSelect";

Chart.register(...registerables);
Chart.register(annotationPlugin);

type ValidationChartProps = {
    filterMapFunction?: (arg0: moorhen.Map) => boolean;
    fetchData: (arg0: number, arg1: number, arg2: string) => Promise<any>;
    getChart: (arg0: number, arg1: number, arg2: string, arg3: any) => any;
    extraControlForm?: React.JSX.Element;
    extraControlFormValue?: any;
    enableChainSelect?: boolean;
    chartId: string;
};

export const MoorhenValidationChartWidgetBase = forwardRef<Chart, ValidationChartProps>((props, chartRef) => {
    const {
        filterMapFunction = (arg0: moorhen.Map) => {
            return true;
        },
        extraControlForm = null,
        extraControlFormValue = null,
        enableChainSelect = true,
        chartId,
    } = props;

    const chainSelectRef = useRef<null | HTMLSelectElement>(null);
    const mapSelectRef = useRef<null | HTMLSelectElement>(null);
    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null);

    const [plotData, setPlotData] = useState(null);

    const [selectedModel, setSelectedModel] = usePersistentState<number | null>(chartId, "selectedModel", -99999, true);
    const [selectedMap, setSelectedMap] = usePersistentState<number | null>(chartId, "selectedMap", -99999, true);
    const [selectedChain, setSelectedChain] = usePersistentState<string | null>(chartId, "selectedChain", null, true);

    const updateMolNo = useSelector((state: moorhen.State) => state.moleculeMapUpdate.moleculeUpdate.molNo);
    const updateSwitch = useSelector((state: moorhen.State) => state.moleculeMapUpdate.moleculeUpdate.switch);
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height);
    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor);
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const maps = useSelector((state: moorhen.State) => state.maps);

    const handleModelChange = (selected: number) => {
        setSelectedModel(selected);
        setSelectedChain(chainSelectRef.current.value);
    };

    const handleMapChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedMap(parseInt(evt.target.value));
    };

    const handleChainChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedChain(evt.target.value);
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
        const filteredMaps = maps.filter(map => filterMapFunction(map));

        if (maps.length === 0 || filteredMaps.length === 0) {
            setSelectedMap(null);
        } else if (selectedMap === null) {
            setSelectedMap(filteredMaps[0].molNo);
        } else if (!filteredMaps.map(map => map.molNo).includes(selectedMap)) {
            setSelectedMap(filteredMaps[0].molNo);
        }
    }, [maps.length]);

    const fetchData = async () => {
        const newPlotData = await props.fetchData(selectedModel, selectedMap, enableChainSelect ? chainSelectRef.current.value : null);
        setPlotData(newPlotData);
    };

    useEffect(() => {
        fetchData();
    }, [selectedChain, selectedMap, selectedModel, extraControlFormValue]);

    useEffect(() => {
        if (selectedModel !== null && selectedModel === updateMolNo) {
            fetchData();
        }
    }, [updateSwitch]);

    useEffect(() => {
        if (chartRef !== null && typeof chartRef !== "function" && chartRef.current) {
            chartRef.current.destroy();
        }

        if (plotData === null) {
            return;
        }

        const canvas = document.getElementById(`${props.chartId}-canvas`) as HTMLCanvasElement;
        const ctx = canvas.getContext("2d");
        const chartData = props.getChart(selectedModel, selectedMap, enableChainSelect ? chainSelectRef.current.value : null, plotData);
        if (!chartData) {
            return;
        }

        if (chartRef !== null && typeof chartRef !== "function") {
            chartRef.current = new Chart(ctx, chartData);
        }
    }, [plotData, backgroundColor]);

    return (
        <Fragment>
            <Form style={{ padding: "0", margin: "0" }}>
                <Form.Group>
                    <Row style={{ padding: "0", margin: "0" }}>
                        <Col>
                            <MoorhenMoleculeSelect onSelect={handleModelChange} ref={moleculeSelectRef} selected={selectedModel} />
                        </Col>
                        {enableChainSelect && (
                            <Col>
                                <MoorhenChainSelect
                                    width=""
                                    onChange={handleChainChange}
                                    molecules={molecules}
                                    selectedCoordMolNo={selectedModel}
                                    allowedTypes={[1, 2]}
                                    ref={chainSelectRef}
                                    defaultValue={selectedChain}
                                />
                            </Col>
                        )}
                        <Col>
                            <MoorhenMapSelect
                                width=""
                                onChange={handleMapChange}
                                maps={maps}
                                ref={mapSelectRef}
                                filterFunction={filterMapFunction}
                                defaultValue={selectedMap}
                            />
                        </Col>
                        {extraControlForm}
                    </Row>
                </Form.Group>
            </Form>
            <div className="validation-plot-div">
                <div style={{ height: "100%" }} className="chartBox" id={`${props.chartId}-box`}>
                    <div
                        id={`${props.chartId}-container`}
                        className="validation-plot-container"
                        style={{ height: "100%", overflowX: "auto" }}
                    >
                        <div
                            style={{ height: "100%", minHeight: convertViewtoPx(45, height) }}
                            className="containerBody"
                            id={`${props.chartId}-container-body`}
                        >
                            <canvas id={`${props.chartId}-canvas`}></canvas>
                        </div>
                    </div>
                </div>
            </div>
        </Fragment>
    );
});
