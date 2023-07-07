import { Fragment, forwardRef, useEffect, useRef, useState } from "react"
import { Col, Row, Form } from 'react-bootstrap';
import { Chart, registerables } from 'chart.js';
import { MoorhenChainSelect } from '../select/MoorhenChainSelect'
import { MoorhenMapSelect } from '../select/MoorhenMapSelect'
import { MoorhenMoleculeSelect } from '../select/MoorhenMoleculeSelect'
import { gemmi } from "../../types/gemmi";
import annotationPlugin from 'chartjs-plugin-annotation'
import { moorhen } from "../../types/moorhen";

Chart.register(...registerables);
Chart.register(annotationPlugin);

type ValidationChartProps = {
    molecules: moorhen.Molecule[];
    maps: moorhen.Map[];
    filterMapFunction?: (arg0: moorhen.Map) => boolean;
    fetchData: (arg0: number, arg1: number, arg2: string) => Promise<any>;
    getChart: (arg0: number, arg1: number, arg2: string, arg3: any) => any;
    dropdownId: number;
    accordionDropdownId: number;
    showSideBar: boolean;
    backgroundColor: [number, number, number, number];
    sideBarWidth: number;
    extraControlForm?: JSX.Element;
    extraControlFormValue?: any;
    enableChainSelect?: boolean;
}

export const MoorhenValidationChartWidgetBase = forwardRef<Chart, ValidationChartProps>((props, chartRef) => {
    const chainSelectRef = useRef<null | HTMLSelectElement>(null);
    const mapSelectRef = useRef<null | HTMLSelectElement>(null);
    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null);
    const [plotData, setPlotData] = useState(null)
    const [selectedModel, setSelectedModel] = useState<number | null>(null)
    const [selectedMap, setSelectedMap] = useState<number | null>(null)
    const [selectedChain, setSelectedChain] = useState<string | null>(null)
    const [cachedGemmiStructure, setCachedGemmiStructure] = useState<null | gemmi.Structure>(null)


    const handleModelChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedModel(parseInt(evt.target.value))
        setSelectedChain(chainSelectRef.current.value)
    }

    const handleMapChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedMap(parseInt(evt.target.value))
    }

    const handleChainChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedChain(evt.target.value)
    }

    useEffect(() => {
        if (props.molecules.length === 0) {
            setSelectedModel(null)
        } else if (selectedModel === null) {
            setSelectedModel(props.molecules[0].molNo)
        } else if (!props.molecules.map(molecule => molecule.molNo).includes(selectedModel)) {
            setSelectedModel(props.molecules[0].molNo)
        }

    }, [props.molecules.length])

    useEffect(() => {
        const filteredMaps = props.maps.filter(map => props.filterMapFunction(map))

        if (props.maps.length === 0 || filteredMaps.length === 0) {
            setSelectedMap(null)
        } else if (selectedMap === null) {
            setSelectedMap(filteredMaps[0].molNo)
        } else if (!filteredMaps.map(map => map.molNo).includes(selectedMap)) {
            setSelectedMap(filteredMaps[0].molNo)
        }

    }, [props.maps.length])
    
    useEffect(() => {
        if (selectedModel !== null) {
            let selectedMoleculeIndex = props.molecules.findIndex(molecule => molecule.molNo === selectedModel);
            if (selectedMoleculeIndex !== -1 && props.molecules[selectedMoleculeIndex]){
                setCachedGemmiStructure(props.molecules[selectedMoleculeIndex].gemmiStructure)
            }
        }
    })
    
    useEffect(() => {
        const fetchData = async () => {
            const newPlotData = await props.fetchData(selectedModel, selectedMap, props.enableChainSelect ? chainSelectRef.current.value : null)
            setPlotData(newPlotData)
        }
        fetchData()

    }, [selectedChain, selectedMap, selectedModel, cachedGemmiStructure, props.extraControlFormValue])

    useEffect(() => {
        if (chartRef !== null && typeof chartRef !== 'function' && chartRef.current) {
            chartRef.current.destroy()
        }

        if (props.dropdownId !== props.accordionDropdownId || !props.showSideBar || plotData === null) {
            return;
        }
        
        const canvas = document.getElementById('myChart') as HTMLCanvasElement;
        const ctx = canvas.getContext("2d")
        const chartData = props.getChart(selectedModel, selectedMap, props.enableChainSelect ? chainSelectRef.current.value : null, plotData)
        if (!chartData) {
            return
        }

        if (chartRef !== null && typeof chartRef !== 'function') {
            chartRef.current = new Chart(ctx, chartData);
        }
        

    }, [plotData, props.backgroundColor, props.sideBarWidth, props.showSideBar, props.accordionDropdownId])

    return <Fragment>
                <Form style={{ padding:'0', margin: '0' }}>
                    <Form.Group>
                        <Row style={{ padding:'0', margin: '0' }}>
                            <Col>
                                <MoorhenMoleculeSelect width="" onChange={handleModelChange} molecules={props.molecules} ref={moleculeSelectRef}/>
                            </Col>
                            {props.enableChainSelect &&
                            <Col>
                                <MoorhenChainSelect width="" onChange={handleChainChange} molecules={props.molecules} selectedCoordMolNo={selectedModel} allowedTypes={[1, 2]} ref={chainSelectRef}/>
                            </Col>
                            }
                            <Col>
                                <MoorhenMapSelect width="" onChange={handleMapChange} maps={props.maps} ref={mapSelectRef} filterFunction={props.filterMapFunction}/>
                            </Col>
                            {props.extraControlForm}
                        </Row>
                    </Form.Group>
                </Form>
                <div className="validation-plot-div" >
                    <div style={{height: '100%'}} className="chartBox" id="myChartBox">
                        <div className="validation-plot-container" style={{height: '100%', overflowX:'scroll'}}>
                            <div style={{height: '100%'}} className="containerBody" id="myContainerBody">
                                <canvas id="myChart"></canvas>
                            </div>
                        </div>
                    </div>
                <canvas id="myChartAxis"></canvas>
                </div>               
            </Fragment>

})

MoorhenValidationChartWidgetBase.defaultProps = {filterMapFunction: (maps: moorhen.Map) => {return true}, extraControlForm: null, extraControlFormValue: null, enableChainSelect: true}