import { Fragment, useEffect, useRef, useState } from "react"
import { Chart, registerables } from 'chart.js'
import annotationPlugin from 'chartjs-plugin-annotation'
import { MoorhenMapSelect } from '../inputs/Selector/MoorhenMapSelect'
import { convertViewtoPx } from '../../utils/utils'
import { useSelector } from "react-redux"
import { moorhen } from "../../types/moorhen"
import { MoorhenButton } from "@/components/inputs"
import { useMoorhenInstance } from "../../InstanceManager";
import { MoorhenStack } from "../interface-base";

Chart.register(...registerables);
Chart.register(annotationPlugin);

export const MoorhenFourierShellCorrelationPlot = () => {
    const moorhenInstance = useMoorhenInstance();
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
    const maps = useSelector((state: moorhen.State) => state.maps)

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
        
        const response = await moorhenInstance.commandCentre.cootCommand({
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
    }, [maps])

    useEffect(() => {

        if (chartRef.current) {
            chartRef.current.destroy()
        }

        if (plotData === null) {
            return;
        }

        const tooltipFontSize = 12

        const canvas = document.getElementById("fsc-chart-canvas") as HTMLCanvasElement
        const ctx = canvas.getContext("2d")

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
              scales: {
                x: {
                  ticks: {
                    callback: function(value) {
                        const x = Number(this.getLabelForValue(parseFloat(String(value))))
                        return Math.sqrt(x).toFixed(3);
                    }
                  },
                  title: {
                      display: true,
                      text: "Spatial frequency (Å⁻¹)"
                  }
                },
                y: {
                  title: {
                      display: true,
                      text: "Correlation"
                  }
                }
              },
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
                        },
                        callbacks: {
                        title: () => '',
                            label: function(context) {
                                 return `${Math.sqrt(parseFloat(context.label)).toFixed(3)}, ${context.parsed.y.toFixed(3)}`;
                            }
                       }
                    },
              },
          }
        });

    }, [plotData, backgroundColor, isDark, height, width])

    return  <Fragment>
                <MoorhenStack gap="0.5rem">
                    <MoorhenMapSelect label="Map 1" onChange={handleMap1Change} maps={maps} ref={map1SelectRef}/>
                    <MoorhenMapSelect label="Map 2" onChange={handleMap2Change} maps={maps} ref={map2SelectRef}/>
                </MoorhenStack>
                    <MoorhenButton variant="secondary" size='lg' onClick={fetchData} style={{ marginLeft: "0.5rem" }}>
                        Plot
                    </MoorhenButton>
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
