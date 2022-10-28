import { Fragment, useEffect, useRef, useState } from "react"
import { Col, Row, Form } from 'react-bootstrap';
import { Ramachandran } from "../WebGL/Ramachandran"
import { cootCommand, postCootMessage } from "../BabyGruUtils"
import { inspect } from 'util'
import { Chart, registerables } from 'chart.js';
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
        console.log(chart);
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


export const BabyGruDensityFit = (props) => {
    const chartCardRef = useRef();
    const chartBoxRef = useRef();
    const containerRef = useRef();
    const containerBodyRef = useRef();
    const canvasRef = useRef();
    const [selectedModel, setSelectedModel] = useState(null)
    const [selectedMap, setSelectedMap] = useState(null)
    const [selectedChain, setSelectedChain] = useState(null)
    const [currentChart, setCurrentChart] = useState(null)

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


    useEffect(() => {

        if (selectedChain === null || selectedMap === null || selectedModel === null) {
            return;
        }
        
        console.log('DRAW!!!')
        
        const alphabet = "ACDEFGHIKLMNPQRSTVWY"
        let labels = range(1, 1000).map(item => alphabet[Math.floor(Math.random() * alphabet.length)]);
        for (const residueIndex of range(0, 1000, 10)) {
          labels[residueIndex] = [labels[residueIndex], residueIndex]
        }
        let data1 = labels.map(item => Math.random());
        let data2 = labels.map(item => Math.random());
        let data3 = labels.map(item => Math.random());
        let backgroundColor1 = data1.map(item => 'rgb(255, '+parseInt(256*(1.0-item))+', 0)');
        let backgroundColor2 = data2.map(item => 'rgb(0, '+parseInt(256*(1.0-item))+', 255)');
        let backgroundColor3 = data2.map(item => 'rgb(0, 255,'+parseInt(256*(1.0-item))+')');
        
        const containerBody = document.getElementById('myContainerBody')
        containerBody.style.width = (labels.length*24)+ "px";
        let ctx = document.getElementById("myChart").getContext("2d")

        if (currentChart) {
            currentChart.destroy()
        }

        let chart = new Chart();
        setCurrentChart(chart)



    }, [selectedChain, selectedMap, selectedModel])

    
    
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


    return <Fragment>
                <Form style={{marginTop:'1rem'}}>
                    <Form.Group>
                        <Row>
                        <Col>
                            <Form.Select value={selectedModel} onChange={handleModelChange} >
                            {props.molecules.map(molecule => {
                                return <option key={molecule.coordMolNo} value={molecule.coordMolNo}>{molecule.name}</option>
                            })}
                            </Form.Select>
                        </Col>
                        <Col>
                            <Form.Control required type="text" onChange={handleChainChange} placeholder="Chain id" value={selectedChain} />
                        </Col>
                        <Col>
                            <Form.Select value={selectedMap} onChange={handleMapChange} >
                            {props.maps.map(map => {
                                return <option key={map.mapMolNo} value={map.mapMolNo}>{map.name}</option>
                            })}
                            </Form.Select>
                        </Col>
                        </Row>
                    </Form.Group>
                </Form>
                <div className="chartCard">
                    <div className="chartBox">
                        <div className="container">
                            <div className="containerBody" id="myContainerBody">
                                <canvas id="myChart"></canvas>
                            </div>
                        </div>
                    </div>
                <canvas id="myChartAxis" height="200px" width="0"></canvas>
                </div>               
            </Fragment>

}
