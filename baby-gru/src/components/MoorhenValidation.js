import { Fragment, useEffect, useRef, useState } from "react"
import { Col, Row, Form } from 'react-bootstrap';
import { Chart, registerables } from 'chart.js';
import { MoorhenChainSelect } from './MoorhenChainSelect'
import { MoorhenMapSelect } from './MoorhenMapSelect'
import { MoorhenMoleculeSelect } from './MoorhenMoleculeSelect'
import { residueCodesOneToThree } from '../utils/MoorhenUtils'

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

const colourPalettes = {
    density_correlation_analysis: (value) => {return 'rgb(255, 255, '+ parseInt(256 * value) + ')'},
    density_fit_analysis: (value) => {return 'rgb(0, ' + parseInt(256 * value) + ', 255)'},
    rotamer_analysis: (value) => {return 'rgb(' + parseInt(256 * value) + ', 255, 132)'},
    ramachandran_analysis: (value) => {return 'rgb(' + parseInt(256 * value) + ', 132, 255)'},
    peptide_omega_analysis: (value) => {return 'rgb(' + parseInt(256 * value) + ', 132, 132)'},
}

const metricInfoScaling = {
    density_correlation_analysis: (value) => {return value},
    density_fit_analysis: (value) => {return 1. / value},
    rotamer_analysis: (value) => {return 1. / value},
    ramachandran_analysis: (value) => {return Math.log(value)},
    peptide_omega_analysis: (value) => {return value - 180},
}

export const MoorhenValidation = (props) => {
    const chartCardRef = useRef();
    const chartBoxRef = useRef();
    const containerRef = useRef();
    const containerBodyRef = useRef();
    const canvasRef = useRef();
    const chainSelectRef = useRef();
    const mapSelectRef = useRef();
    const moleculeSelectRef = useRef();
    const chartRef = useRef(null);
    const [plotData, setPlotData] = useState(null)
    const [selectedModel, setSelectedModel] = useState(null)
    const [selectedMap, setSelectedMap] = useState(null)
    const [selectedChain, setSelectedChain] = useState(null)
    const [cachedGemmiStructure, setCachedGemmiStructure] = useState(null)

    const getSequenceData = () => {
        let selectedMolecule = props.molecules.find(molecule => molecule.molNo == selectedModel)
        if (selectedMolecule) {
            let sequenceData = selectedMolecule.sequences.find(sequence => sequence.chain == chainSelectRef.current.value)
            if (sequenceData) {
                return sequenceData.sequence
            }    
        }
    }

    const getAvailableMetrics = () => {
        const allMetrics = [
            {command: "density_correlation_analysis", returnType:'validation_data', chainID: chainSelectRef.current.value, commandArgs:[selectedModel, selectedMap], needsMapData: true, displayName:'Density Corr.'},
            {command: "density_fit_analysis", returnType:'validation_data', chainID: chainSelectRef.current.value, commandArgs:[selectedModel, selectedMap], needsMapData: true, displayName:'Density Fit'},            
            {command: "rotamer_analysis", returnType:'validation_data', chainID: chainSelectRef.current.value, commandArgs:[selectedModel], needsMapData: false, displayName:'Rotamers'},
            {command: "ramachandran_analysis", returnType:'validation_data', chainID: chainSelectRef.current.value, commandArgs:[selectedModel], needsMapData: false, displayName:'Ramachandran'},
            {command: "peptide_omega_analysis", returnType:'validation_data', chainID: chainSelectRef.current.value, commandArgs:[selectedModel], needsMapData: false, displayName:'Pept. Omega'},
        ]    
        
        let currentlyAvailable = []
        allMetrics.forEach(metric => {
            if ((metric.needsMapData && selectedMap === null) || selectedModel === null || chainSelectRef.current.value === null) {
                return
            }
            currentlyAvailable.push(metric)
        })
        
        return currentlyAvailable
    }

    const handleModelChange = (evt) => {
        console.log(`Selected model ${evt.target.value}`)
        setSelectedModel(evt.target.value)
        setSelectedChain(chainSelectRef.current.value)
    }

    const handleMapChange = (evt) => {
        console.log(`Selected map ${evt.target.value}`)
        setSelectedMap(evt.target.value)
    }

    const handleChainChange = (evt) => {
        console.log(`Selected chain ${evt.target.value}`)
        setSelectedChain(evt.target.value)
    }

    const getResidueInfo = (selectedMolecule, residueIndex) => {
        const sequenceData =  getSequenceData()
        const {resNum, resCode} = sequenceData[residueIndex];

        if(resNum && resNum > -1){
            return {
                modelIndex: 0,
                molName: selectedMolecule.name, 
                chain: chainSelectRef.current.value,
                seqNum: resNum,
                resCode: resCode
            }
        }
    }

    const handleClick = (evt) => {
        if (chartRef.current === null){
            return
        }

        const points = chartRef.current.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
        
        if (points.length === 0){
            return;
        }
        
        const residueIndex = points[0].index
        const selectedMolecule = props.molecules.find(molecule => molecule.molNo == selectedModel)
        if(selectedMolecule) {
            const clickedResidue = getResidueInfo(selectedMolecule, residueIndex)
            if (clickedResidue) {
                selectedMolecule.centreOn(props.glRef, `/*/${clickedResidue.chain}/${clickedResidue.seqNum}-${clickedResidue.seqNum}/*`)
            }
        }
    }

    const setTooltipTitle = (args) => {
        if (!chartRef.current){
            return;
        }
        
        const residueIndex = args[0].dataIndex
        const selectedMolecule = props.molecules.find(molecule => molecule.molNo == selectedModel)
        if(selectedMolecule) {
            const clickedResidue = getResidueInfo(selectedMolecule, residueIndex)
            if (clickedResidue) {
                props.setHoveredAtom({
                    molecule: selectedMolecule,
                    cid:  `//${clickedResidue.chain}/${clickedResidue.seqNum}(${residueCodesOneToThree[clickedResidue.resCode]})/`
                })
                return `${clickedResidue.seqNum} (${residueCodesOneToThree[clickedResidue.resCode]})`
            }
        }
        
        return "UNK"
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
        if (props.maps.length === 0) {
            setSelectedMap(null)
        } else if (selectedMap === null) {
            setSelectedMap(props.maps[0].molNo)
        } else if (!props.maps.map(map => map.molNo).includes(selectedMap)) {
            setSelectedMap(props.maps[0].molNo)
        }

    }, [props.maps.length])
    
    useEffect(() => {
        if (selectedModel !== null) {
            let selectedMoleculeIndex = props.molecules.findIndex(molecule => molecule.molNo == selectedModel);
            if (selectedMoleculeIndex != -1 && props.molecules[selectedMoleculeIndex]){
                setCachedGemmiStructure(props.molecules[selectedMoleculeIndex].gemmiStructure)
            }
        }
    })
    
    useEffect(() => {
        async function fetchData(availableMetrics) {
            let promises = []
            availableMetrics.forEach(metric => {
                const inputData = { message:'coot_command', ...metric }
                promises.push(props.commandCentre.current.cootCommand(inputData))
            })
            let responses = await Promise.all(promises) 
            
            let newPlotData = []
            responses.forEach(response => {
                newPlotData.push(response.data.result.result)
            })
            setPlotData(newPlotData)
        }

        if (selectedModel === null || chainSelectRef.current.value === null) {
            setPlotData(null)
            return
        }
        
        let availableMetrics = getAvailableMetrics()
        fetchData(availableMetrics)   

    }, [selectedChain, selectedMap, selectedModel, cachedGemmiStructure])

    useEffect(() => {
        if (chartRef.current) {
            chartRef.current.destroy()
        }

        if (chainSelectRef.current.value === null || selectedModel === null || !props.toolAccordionBodyHeight || !props.showSideBar || plotData === null) {
            return;
        }

        let sequenceData =  getSequenceData()
        if (!sequenceData) {
            return
        }
        
        let labels = []
        sequenceData.forEach((residue, index) => {
            if (index % 10 !== 0) {
                labels.push(residue.resCode)
            } else {
                labels.push([residue.resCode, residue.resNum])
            }
        })
       
        const barWidth = props.sideBarWidth / 40
        const tooltipFontSize = 12
        const axisLabelsFontSize = props.toolAccordionBodyHeight / 60
        
        const containerBody = document.getElementById('myContainerBody')
        containerBody.style.width = (labels.length*barWidth)+ "px";
        let ctx = document.getElementById("myChart").getContext("2d")
        
        let scales = {
            x: {
                stacked: true,
                beginAtZero: true,
                display:true,
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
            }
        }

        let datasets = []
        let availableMetrics = getAvailableMetrics()
        for(let methodIndex=0; methodIndex < plotData.length; methodIndex++){
            if (!plotData[methodIndex]) {
                continue
            }
            let metricScale = metricInfoScaling[availableMetrics[methodIndex].command]
            let palette = colourPalettes[availableMetrics[methodIndex].command]
            datasets.push({
                label: availableMetrics[methodIndex].displayName,
                data: sequenceData.map(currentResidue => {
                    let residue = plotData[methodIndex].find(res => res.seqNum == currentResidue.resNum)
                    if (residue) {
                        return metricScale(residue.value)
                    } else {
                        return null
                    }
                }),
                backgroundColor: sequenceData.map(currentResidue => {
                    let residue = plotData[methodIndex].find(res => res.seqNum == currentResidue.resNum)
                    if (residue) {
                        let gFrac = 1.0 - metricScale(residue.value)
                        return palette(gFrac)
                    } else {
                        return null
                    }
                }),
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
                    font:{size:axisLabelsFontSize, family:'Helvetica', weight:800},
                    text: availableMetrics[methodIndex].displayName,
                    color: props.darkMode ? 'white' : 'black'
                },
                grid: {
                    display:false,
                    borderWidth: 0
                }           
            }
        }
      
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
                            size:tooltipFontSize,
                            family:'Helvetica'
                        },
                        bodyFont: {
                            size:tooltipFontSize,
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
                                <MoorhenChainSelect width="" onChange={handleChainChange} molecules={props.molecules} selectedCoordMolNo={selectedModel} allowedTypes={[1, 2]} ref={chainSelectRef}/>
                            </Col>
                            <Col>
                                <MoorhenMapSelect width="" onChange={handleMapChange} maps={props.maps} ref={mapSelectRef}/>
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
