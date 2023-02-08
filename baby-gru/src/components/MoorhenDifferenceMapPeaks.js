import { Fragment, useEffect, useRef, useState } from "react"
import { Col, Row, Form } from 'react-bootstrap';
import { Chart, registerables } from 'chart.js';
import { MoorhenMapSelect } from './MoorhenMapSelect'
import { MoorhenMoleculeSelect } from './MoorhenMoleculeSelect'
import MoorhenSlider from './MoorhenSlider' 

Chart.register(...registerables);

const plugin = {
    id: 'custom_bar_borders',
    afterDatasetsDraw: (chart, args, options) => {
        const {ctx} = chart;
        ctx.save();
        ctx.lineWidth = 3;
        for(let datasetIndex=0; datasetIndex<chart._metasets.length; datasetIndex++){
          for(let dataPoint=0; dataPoint<chart._metasets[datasetIndex].data.length; dataPoint++){
            ctx.beginPath();
            if(chart._metasets[datasetIndex].data[dataPoint]['$context'].raw < 0){
              ctx.rect(chart._metasets[datasetIndex].data[dataPoint].x-chart._metasets[datasetIndex].data[dataPoint].width/2, chart._metasets[datasetIndex].data[dataPoint].y, chart._metasets[datasetIndex].data[dataPoint].width, chart._metasets[datasetIndex].data[dataPoint].height*-1);
            } else {
              ctx.rect(chart._metasets[datasetIndex].data[dataPoint].x-chart._metasets[datasetIndex].data[dataPoint].width/2, chart._metasets[datasetIndex].data[dataPoint].y, chart._metasets[datasetIndex].data[dataPoint].width, chart._metasets[datasetIndex].data[dataPoint].height);

            }
            ctx.stroke();
          }
        }
      ctx.restore();
    },
}


export const MoorhenDifferenceMapPeaks = (props) => {
    const chartCardRef = useRef();
    const chartBoxRef = useRef();
    const containerRef = useRef();
    const containerBodyRef = useRef();
    const canvasRef = useRef();
    const mapSelectRef = useRef();
    const moleculeSelectRef = useRef();
    const chartRef = useRef(null);
    const [plotData, setPlotData] = useState(null)
    const [selectedModel, setSelectedModel] = useState(null)
    const [selectedMap, setSelectedMap] = useState(null)
    const [cachedGemmiStructure, setCachedGemmiStructure] = useState(null)
    const [selectedRmsd, setSelectedRmsd] = useState(4.5)
    const [mapRmsd, setMapRmsd] = useState(null)
    
    const getDifferenceMaps = () => {
        let differenceMaps = []
        
        if (props.maps) {
            props.maps.forEach(map => {
                if(map.isDifference){
                    differenceMaps.push(map)
                }
            })
        }

        return differenceMaps

    }

    const colourPalette = (value) => {
        let gfrac = ( 1 / value)
        if (value > 0) {
            return 'rgb(0, ' + parseInt(155 + (100 * gfrac)) + ', 0)'
        } else {
            return 'rgb(' + parseInt(155 - (100 * gfrac)) + ', 0, 0)'
        }

    }

    const handleModelChange = (evt) => {
        console.log(`Selected model ${evt.target.value}`)
        setSelectedModel(parseInt(evt.target.value))
    }

    const handleMapChange = (evt) => {
        console.log(`Selected map ${evt.target.value}`)
        setSelectedMap(parseInt(evt.target.value))
    }

    const handleClick = (evt) => {
        if (chartRef.current === null){
            return
        }

        const points = chartRef.current.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
        
        if (points.length === 0){
            return;
        }
        
        const peakIndex = points[0].index
        props.glRef.current.setOriginAnimated([-plotData[peakIndex].coordX, -plotData[peakIndex].coordY, -plotData[peakIndex].coordZ])
    }

    const setTooltipTitle = (args) => {
        if (!chartRef.current){
            return;
        }
        
        const peakIndex = args[0].dataIndex
        return [
            `Position (${plotData[peakIndex].coordX.toFixed(2)}, ${plotData[peakIndex].coordY.toFixed(2)}, ${plotData[peakIndex].coordZ.toFixed(2)})`,
            `Height ${(plotData[peakIndex].featureValue / mapRmsd).toFixed(2)}`
        ]
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
        const differenceMaps = getDifferenceMaps()

        if (props.maps.length === 0 || differenceMaps.length === 0) {
            setSelectedMap(null)
        } else if (selectedMap === null) {
            setSelectedMap(differenceMaps[0].molNo)
        } else if (!differenceMaps.map(map => map.molNo).includes(selectedMap)) {
            setSelectedMap(differenceMaps[0].molNo)
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
        async function fetchData() {
            let promises = [
                props.commandCentre.current.cootCommand({
                    message:'coot_command',
                    command: "difference_map_peaks", 
                    returnType:'interesting_places_data',
                    commandArgs:[selectedMap, selectedModel, selectedRmsd], 
                }),
                props.commandCentre.current.cootCommand({
                    message:'coot_command',
                    command: "get_map_rmsd_approx", 
                    returnType:'float',
                    commandArgs:[selectedMap], 
                })
            ]
    
            let responses = await Promise.all(promises)
            let newPlotData = responses[0].data.result.result
            let newMapRmsd = responses[1].data.result.result
            setMapRmsd(newMapRmsd)
            setPlotData(newPlotData)
        }

        if (selectedModel === null || selectedMap === null || selectedRmsd === null) {
            setMapRmsd(null)
            setPlotData(null)
            return
        }
            
        fetchData()

    }, [selectedMap, selectedModel, cachedGemmiStructure, selectedRmsd])

    useEffect(() => {
        if (chartRef.current) {
            chartRef.current.destroy()
        }

        if (selectedMap === null || selectedModel === null || selectedRmsd === null || plotData === null || mapRmsd === null || !props.toolAccordionBodyHeight || !props.showSideBar) {
            return;
        }
       
        let labels = plotData.map((peak, idx) => idx % 10 === 0 ? idx : '')
       
        const barWidth = props.sideBarWidth / 40
        const tooltipFontSize = 12
        const axisLabelsFontSize = props.toolAccordionBodyHeight / 60
        
        const containerBody = document.getElementById('myContainerBody')
        containerBody.style.width = (labels.length*barWidth)+ "px";
        let ctx = document.getElementById("myChart").getContext("2d")
        
        let scales = {
            x: {
                stacked: false,
                beginAtZero: true,
                display: true,
                ticks: {color: props.darkMode ? 'white' : 'black',
                        font:{size:barWidth, family:'Helvetica'},
                        maxRotation: 0, 
                        minRotation: 0,
                        autoSkip: false,                                
                },
                grid: {
                  display:false,
                  borderWidth: 1,
                  borderColor: 'black'
                },
            },
            y: {
                display: true,
                ticks: {display:false},
                beginAtZero: true,
                title: {
                    display: true,
                    font:{size:axisLabelsFontSize, family:'Helvetica', weight:800},
                    text: 'Difference Map Peaks',
                    color: props.darkMode ? 'white' : 'black'
                },
                grid: {
                    display:false,
                    borderWidth: 0
                }    
            }
        }

        let datasets = [{
            label: 'Difference Map Peaks',
            data: plotData.map(peak => peak.featureValue),
            backgroundColor: plotData.map(peak => colourPalette(peak.featureValue)),
            borderWidth: 0,
            clip: false,
        }]

        chartRef.current = new Chart(ctx, {
            plugins: [plugin],
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets,
            },
            options: {
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#ddd',
                        borderColor: 'black',
                        borderWidth: 1,
                        displayColors: false,
                        titleColor: 'black',
                        bodyColor: 'black',
                        footerColor: 'black',
                        callbacks: {
                            title: setTooltipTitle,
                        },
                        titleFont: {
                            size: tooltipFontSize,
                            family:'Helvetica'
                        },
                        bodyFont: {
                            size: 0,
                            family:'Helvetica'
                        },
                        footerFont: {
                            family:'Helvetica'
                        }
                    }
                },
                onClick: handleClick,
                responsive: true,
                maintainAspectRatio: false,
                barThickness: 'flex',
                scales: scales
            }            
        });

    }, [plotData, props.darkMode, props.toolAccordionBodyHeight, props.sideBarWidth, props.showSideBar])

    return <Fragment>
                <Form style={{ padding:'0', margin: '0' }}>
                    <Form.Group>
                        <Row style={{ padding:'0', margin: '0' }}>
                            <Col>
                                <MoorhenMoleculeSelect width="" onChange={handleModelChange} molecules={props.molecules} ref={moleculeSelectRef}/>
                            </Col>
                            <Col>
                                <MoorhenMapSelect filterFunction={(map) => map.isDifference} width="" onChange={handleMapChange} maps={props.maps} ref={mapSelectRef}/>
                            </Col>
                            <Col style={{justifyContent:'center', alignContent:'center', alignItems:'center', display:'flex'}}>
                                <Form.Group controlId="rmsdSlider" style={{margin:'0.5rem', width: '100%'}}>
                                    <MoorhenSlider minVal={2.5} maxVal={7.0} logScale={false} sliderTitle="RMSD" intialValue={4.5} externalValue={selectedRmsd} setExternalValue={setSelectedRmsd}/>
                                </Form.Group>
                            </Col>
                        </Row>
                    </Form.Group>
                </Form>
                <div ref={chartCardRef} className="validation-plot-div" >
                    <div ref={chartBoxRef} style={{height: '100%'}} className="chartBox" id="myChartBox">
                        <div ref={containerRef} className="validation-plot-container" style={{height: '100%', overflowX:'scroll'}}>
                            <div ref={containerBodyRef} style={{height: '100%'}} className="containerBody" id="myContainerBody">
                                <canvas ref={canvasRef} id="myChart"></canvas>
                            </div>
                        </div>
                    </div>
                <canvas id="myChartAxis"></canvas>
                </div>               
            </Fragment>

}
