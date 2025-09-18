import { Fragment, useEffect, useRef, useState } from "react"
import { Col, Row, Form, Button } from 'react-bootstrap'
import { Chart, TooltipItem, registerables } from 'chart.js'
import annotationPlugin from 'chartjs-plugin-annotation'
import { MoorhenChainSelect } from '../select/MoorhenChainSelect'
import { MoorhenMapSelect } from '../select/MoorhenMapSelect'
import { MoorhenMoleculeSelect } from '../select/MoorhenMoleculeSelect'
import { getResidueInfo, convertViewtoPx } from '../../utils/utils'
import { residueCodesOneToThree } from "../../utils/enums"
import { useDispatch, useSelector } from "react-redux"
import { setHoveredAtom } from "../../store/hoveringStatesSlice"
import { moorhen } from "../../types/moorhen"
import { libcootApi } from "../../types/libcoot"

Chart.register(...registerables);
Chart.register(annotationPlugin);

export const MoorhenFourierShellCorrelationPlot = (props: {
    commandCentre: React.RefObject<moorhen.CommandCentre>;
}) => {
    const chartCardRef = useRef<HTMLDivElement>(null);
    const chartBoxRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const containerBodyRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const map1SelectRef = useRef<null | HTMLSelectElement>(null);
    const map2SelectRef = useRef<null | HTMLSelectElement>(null);
    const chartRef = useRef<null | Chart>(null);

    const [plotData, setPlotData] = useState<null | {x:number,y:number}[]>(null)
    const [selectedMap1, setSelectedMap1] = useState<null | number>(null)
    const [selectedMap2, setSelectedMap2] = useState<null | number>(null)

    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    const maps = useSelector((state: moorhen.State) => state.maps)
    const dispatch = useDispatch()

    const handleMap1Change = (evt) => {
        setSelectedMap1(parseInt(evt.target.value))
    }

    const handleMap2Change = (evt) => {
        setSelectedMap2(parseInt(evt.target.value))
    }

    const fetchData = async () => {

        if (selectedMap1 === null ||selectedMap2 === null) {
            setPlotData(null)
            return
        }
        
        let response = await props.commandCentre.current.cootCommand({
            message: 'coot_command',
            command: 'fourier_shell_correlation',
            returnType: 'fsc_result',
            commandArgs: [parseInt(map1SelectRef.current.value), parseInt(map2SelectRef.current.value) ],
        }, false) as moorhen.WorkerResponse<{x:number,y:number}[]>

        const data = response.data.result.result.filter((f)=>{return (!Number.isNaN(f.x)&&!Number.isNaN(f.y)) ? f : null})

        setPlotData(data)

    }

    useEffect(() => {
        if (maps.length === 0) {
            setSelectedMap1(null)
            setSelectedMap2(null)
        } else if (selectedMap1 === null) {
            setSelectedMap1(maps[0].molNo)
        } else if (!maps.map(map => map.molNo).includes(selectedMap1)) {
            setSelectedMap1(maps[0].molNo)
        }

        if (maps.length > 1) {
            if (selectedMap2 === null) {
                setSelectedMap2(maps[1].molNo)
            }
        }

    }, [maps.length])

    useEffect(() => {

        if (chartRef.current) {
            chartRef.current.destroy()
        }

        if (plotData === null) {
            return;
        }

        const barWidth = convertViewtoPx(35, width) / 40
        const tooltipFontSize = 12
        const axisLabelsFontSize = convertViewtoPx(70, height) / 60

        const containerBody = document.getElementById('fsc-container-body')
        //containerBody.style.width = (labels.length*barWidth)+ "px";
        const canvas = document.getElementById("fsc-chart-canvas") as HTMLCanvasElement
        let ctx = canvas.getContext("2d")

        chartRef.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels: plotData.map(row => row.x.toExponential(3)),
            datasets: [
              {
                data: plotData.map(row => row.y)
              }
            ]
          },
          options: {
              plugins: {
                  legend: {
                      display: false,
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
                        },
                        titleFont: {
                            size: tooltipFontSize,
                            family: 'Helvetica'
                        },
                        bodyFont: {
                            size: tooltipFontSize,
                            family: 'Helvetica'
                        },
                        footerFont: {
                            family: 'Helvetica'
                        }
                    },
              },
          }
        });

    }, [plotData, backgroundColor, isDark, height, width])

    return  <Fragment>
                <Form style={{ padding:'0', margin: '0' }}>
                    <Form.Group>
                        <Row style={{ padding:'0', margin: '0' }}>
                            <Col>
                                <MoorhenMapSelect label="Map 1" width="" onChange={handleMap1Change} maps={maps} ref={map1SelectRef}/>
                            </Col>
                            <Col>
                                <MoorhenMapSelect label="Map 2" width="" onChange={handleMap2Change} maps={maps} ref={map2SelectRef}/>
                            </Col>
                            <Col style={{ display:'flex', alignItems: 'center', alignContent: 'center', verticalAlign: 'center'}}>
                                <Button variant="secondary" size='lg' onClick={fetchData} style={{width: '80%', marginTop:'10%'}}>
                                    Plot
                                </Button>
                            </Col>
                        </Row>
                    </Form.Group>
                </Form>
                <div ref={chartCardRef} className="validation-plot-div" >
                    <div ref={chartBoxRef} style={{height: '100%'}} className="chartBox" id="fsc-chart-box">
                        <div ref={containerRef} className="validation-plot-container" style={{height: '100%', overflowX: 'auto'}}>
                            <div ref={containerBodyRef} style={{height: '100%', minHeight: convertViewtoPx(45, height)}} className="containerBody" id="fsc-container-body">
                                <canvas ref={canvasRef} id="fsc-chart-canvas"></canvas>
                            </div>
                        </div>
                    </div>
                <canvas id="fsc-chart-axis"></canvas>
                </div>
            </Fragment>

}
