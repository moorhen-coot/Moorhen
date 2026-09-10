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

    function findCrossing(data, threshold = 0.143) {
        for (let i = 1; i < data.length; i++) {
            const y1 = data[i - 1].y;
            const y2 = data[i].y;

            if ((y1 - threshold) * (y2 - threshold) <= 0) {
                const t = (threshold - y1) / (y2 - y1);

                return data[i - 1].x +
                       t * (data[i].x - data[i - 1].x);
            }
        }

        return null;
    }

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

        const threshold = 0.143;
        const freq2 = findCrossing(plotData);
        const frequency = Math.sqrt(freq2);
        const resolution = 1 / frequency;

        console.log(freq2,frequency,resolution)

        const thresholdData = plotData.map(p => ({
             x: p.x,
             y: threshold
        }));

       const maxFreq2 = Math.max(...plotData.map(p => p.x));
       const maxFreq = Math.sqrt(maxFreq2);

        chartRef.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels: plotData.map(row => row.x.toFixed(3)),
            datasets: [
              {
                data: plotData,
                  borderColor: "blue",
                  backgroundColor: "blue",
              },
              {
                  label: "0.143 threshold",
                  data: thresholdData,
                  borderColor: "black",
                  backgroundColor: "black",
                  borderDash: [4, 4],
                  pointRadius: 0
              }
            ]
          },
          options: {
              scales: {
                x: {
                  type: "linear",
                  min: 0,
                  max: maxFreq2,
                  ticks: {
                    count: 10,
                    callback: value => Math.sqrt(Number(value)).toFixed(3)
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
                  title: {
                      display: true,
                      text: `Calculated FSC Resolution: ${resolution.toFixed(2)} Å`
                  },
                  annotation: {
                      annotations: {
                          resolutionLine: {
                              type: 'line',
                              xMin: freq2,
                              xMax: freq2,
                              borderColor: 'green',
                              borderWidth: 2
                          }
                      }
                  },
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
                                return `${Math.sqrt(context.parsed.x).toFixed(3)}, ${context.parsed.y.toFixed(3)}`;
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
