import { Fragment, useCallback, useEffect, useRef, useState } from "react"
import { Col, Row, Form } from 'react-bootstrap';
import { Chart, registerables } from 'chart.js';
import { BabyGruChainSelect } from './BabyGruChainSelect'
import { BabyGruMapSelect } from './BabyGruMapSelect'
import { BabyGruMoleculeSelect } from './BabyGruMoleculeSelect'
import { BabyGruMap } from "../utils/BabyGruMap";


Chart.register(...registerables);

function  range(start, stop, step=1) {
    var result = [];
    for (var i = start; step > 0 ? i < stop : i > stop; i += step) {
        result.push(i);
    }
  return result;
}

const plugin = {
    id: 'custom_bar_borders',
    afterDatasetsDraw: (chart, args, options) => {
        const {ctx} = chart;
        ctx.save();
        ctx.lineWidth = 3;
        for(let datasetIndex=0; datasetIndex<chart._metasets.length; datasetIndex++){
          for(let dataPoint=0; dataPoint<chart._metasets[datasetIndex].data.length; dataPoint++){
            ctx.beginPath();
            if(chart._metasets[datasetIndex]._dataset.label == 'Ramachandran'){
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

const metricInfoScaling = {
    density_fit: 1,
    bVals:100
}

export const BabyGruValidationPlot = (props) => {
    const chartCardRef = useRef();
    const chartBoxRef = useRef();
    const containerRef = useRef();
    const containerBodyRef = useRef();
    const canvasRef = useRef();
    const chainSelectRef = useRef();
    const mapSelectRef = useRef();
    const moleculeSelectRef = useRef();
    const [plotData, setPlotData] = useState(null)
    const [selectedModel, setSelectedModel] = useState(null)
    const [selectedMap, setSelectedMap] = useState(null)
    const [selectedChain, setSelectedChain] = useState(null)
    const [currentChart, setCurrentChart] = useState(null)
    
    const getAvailableMetrics = () => {
        const allMetrics = [
            {command: "density_fit_analysis", returnType:'density_fit', chainID: selectedChain, commandArgs:[selectedModel, selectedMap], needsMapData: true, displayName:'Density Fit'},
            {command: "get_bvals", returnType:'getBVals', needsMapData: false}
        ]    
        
        let currentlyAvailable = []
        allMetrics.forEach(metric => {
            if (metric.needsMapData && selectedMap !== null && selectedModel !== null && selectedChain !== null) {
                currentlyAvailable.push(metric)
            } else if (selectedModel !== null && selectedChain !== null) {
                currentlyAvailable.push(metric)
            }
        })
        
        return currentlyAvailable
    }

    useEffect(() => {
        if (props.molecules.length === 0) {
            setSelectedModel(null)
        } else if (selectedModel === null) {
            setSelectedModel(props.molecules[0].coordMolNo)
        } else if (!props.molecules.map(molecule => molecule.coordMolNo).includes(selectedModel)) {
            setSelectedModel(props.molecules[0].coordMolNo)
        }

    }, [props.molecules.length])

    useEffect(() => {
        if (props.maps.length === 0) {
            setSelectedMap(null)
        } else if (selectedMap === null) {
            setSelectedMap(props.maps[0].mapMolNo)
        } else if (!props.maps.map(map => map.mapMolNo).includes(selectedMap)) {
            setSelectedMap(props.maps[0].mapMolNo)
        }

    }, [props.maps.length])

    const handleModelChange = (evt) => {
        console.log(`Selected model ${evt.target.value}`)
        setSelectedModel(evt.target.value)
    }

    const handleMapChange = (evt) => {
        console.log(`Selected map ${evt.target.value}`)
        setSelectedMap(evt.target.value)
    }

    const handleChainChange = (evt) => {
        console.log(`Selected chain ${evt.target.value}`)
        setSelectedChain(evt.target.value)
    }
    
    useEffect(() => {
        async function fetchData(availableMetrics) {
            let promises = []
            availableMetrics.forEach(metric => {
                const inputData = { message:'coot_command', ...metric }
                promises.push(props.commandCentre.current.cootCommand(inputData)    )
            })
            let responses = await Promise.all(promises) 
            
            let newPlotData = []
            responses.forEach(response => {
                newPlotData.push(response.data.result.result)
            })
            setPlotData(newPlotData)
        }

        if (selectedModel === null || selectedChain === null) {
                return
        }
        let availableMetrics = getAvailableMetrics()
        fetchData(availableMetrics)   

    }, [selectedChain, selectedMap, selectedModel])


    useEffect(() => {

        if (selectedChain === null || selectedMap === null || selectedModel === null) {
            return;
        }
        
        let availableMetrics = getAvailableMetrics()
        let chartData = {};

        console.log('AVAILABLE METRICS')
        console.log(availableMetrics)
        console.log('PLOT DATA')
        console.log(plotData)

        // First loop to define residue numbers inside chartData object because some methods might output more residues than others
        for(let methodIndex=0; methodIndex < availableMetrics.length; methodIndex++){
            if (!(plotData[methodIndex])){
                continue;
            }
            for(let residueIndex=0; residueIndex < plotData[methodIndex].length; residueIndex++){
                let seqNum = plotData[methodIndex][residueIndex].seqNum;
                if (!(seqNum in chartData)) {
                    // Initialise arrays with dimensions determined by the number of available metrics and filled with null
                    chartData[seqNum] = {
                        data: Array(availableMetrics.length).fill(null),
                        backgroundColor: Array(availableMetrics.length).fill(null),
                    };
                }
           }
        }

        console.log('AFTER FIRST LOOP')
        console.log(chartData)

        // Second loop to populate dictionary
        for(let seqNum in chartData){
            for(let methodIndex=0; methodIndex < plotData.length; methodIndex++){
                if (!(plotData[methodIndex])){
                    continue;
                }
                let returnType = availableMetrics[methodIndex].returnType
                let residueIndex = plotData[methodIndex].findIndex(item => item.seqNum == seqNum);
                if (residueIndex !== -1){
                    let gFrac = 1.0 - plotData[methodIndex][residueIndex].value / metricInfoScaling[returnType];
                    chartData[seqNum].data[methodIndex] = plotData[methodIndex][residueIndex].value / metricInfoScaling[returnType];
                    chartData[seqNum].backgroundColor[methodIndex] = 'rgb(255, ' + parseInt(256 * gFrac) + ', 0)';
                }
            }
        }

        
        console.log('AFTER SECOND LOOP!')
        console.log(chartData)

        // Third loop to create list of objects passed to chart.js
        let datasets = []
        let labels =  Object.keys(chartData).sort((a, b) => a - b)
        let scales = {
            x: {
                stacked: true,
                beginAtZero: true,
                display:true,
                ticks: {color: props.darkMode ? 'white' : 'black',
                        font:{size:20, family:'sans-serif-mono'},
                        maxRotation: 0, 
                        minRotation: 0,
                        autoSkip: false,                                
                },
                grid: {
                  display:false,
                  borderWidth: 1,
                  borderColor: 'black'
                },
            }
        }
        for(let methodIndex=0; methodIndex < plotData.length; methodIndex++){
            datasets.push({
                label: availableMetrics[methodIndex].displayName,
                data: labels.map(seqNum => chartData[seqNum].data[methodIndex]),
                backgroundColor: labels.map(seqNum => chartData[seqNum].backgroundColor[methodIndex]),
                borderWidth: 0,
                clip: false,
                yAxisID: methodIndex > 0 ? 'y' + (methodIndex + 1) : 'y',
            })
            scales[methodIndex > 0 ? 'y' + (methodIndex + 1) : 'y'] = {
                display: true,
                ticks: {display:false},
                stack: 'demo',
                stackWeight: 1,
                beginAtZero: true,
                title: {
                    display: true,
                    font:{size:15, family:'sans-serif', weight:800},
                    text: availableMetrics[methodIndex].displayName,
                    color: props.darkMode ? 'white' : 'black'
                },
                grid: {
                    display:false,
                    borderWidth: 0
                }           
            }
        }

        console.log('AFTER THIRD LOOP')
        console.log(datasets, labels)

        for (const residueIndex of range(labels, 10)) {
          labels[residueIndex] = [labels[residueIndex], residueIndex]
        }
       
        const containerBody = document.getElementById('myContainerBody')
        containerBody.style.width = (labels.length*24)+ "px";
        let ctx = document.getElementById("myChart").getContext("2d")

        if (currentChart) {
            currentChart.destroy()
        }

        let chart = new Chart(ctx, {
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
                    footerColor: 'black'}
                },
                responsive: true,
                maintainAspectRatio: false,
                barThickness: 'flex',
                scales: scales
            }            
        });

        setCurrentChart(chart)

    }, [plotData, props.darkMode])

    return <Fragment>
                <Form style={{ padding: '0.5rem', margin: '0' }}>
                    <Form.Group>
                        <Row>
                        <Col>
                            <BabyGruMoleculeSelect width="" onChange={handleModelChange} molecules={props.molecules} ref={moleculeSelectRef}/>
                        </Col>
                        <Col>
                            <BabyGruChainSelect width="" molecules={props.molecules} onChange={handleChainChange} selectedCoordMolNo={selectedModel} ref={chainSelectRef}/>
                        </Col>
                        <Col>
                            <BabyGruMapSelect width="" onChange={handleMapChange} maps={props.maps} ref={mapSelectRef}/>
                        </Col>
                        </Row>
                    </Form.Group>
                </Form>
                <div ref={chartCardRef} className="validation-plot-div">
                    <div ref={chartBoxRef} style={{height: '100%'}} className="chartBox">
                        <div ref={containerRef} className="container" style={{height: '100%', overflowX:'scroll'}}>
                            <div ref={containerBodyRef} style={{height: '100%'}} className="containerBody" id="myContainerBody">
                                <canvas ref={canvasRef} id="myChart"></canvas>
                            </div>
                        </div>
                    </div>
                <canvas id="myChartAxis"></canvas>
                </div>               
            </Fragment>

}
