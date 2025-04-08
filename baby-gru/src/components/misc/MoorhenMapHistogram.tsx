import { forwardRef, useEffect, useState } from "react"
import { Chart, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation'
import { moorhen } from "../../types/moorhen";
import { libcootApi } from "../../types/libcoot";
import { convertViewtoPx } from "../../utils/utils";
import { Row, Stack } from "react-bootstrap";
import { IconButton } from "@mui/material";
import { ZoomInOutlined, ZoomOutOutlined } from "@mui/icons-material";
import { useSelector } from "react-redux";

Chart.register(...registerables);
Chart.register(annotationPlugin);

type MapHistogramProps = {
    map: moorhen.Map;
    showHistogram: boolean;
    setMapContourLevel: (arg0: number) => void;
    setBusy: React.Dispatch<React.SetStateAction<boolean>>;
}

export const MoorhenMapHistogram = forwardRef<Chart, MapHistogramProps>((props, chartRef) => {
    const [zoomFactor, setZoomFactor] = useState<number>(1)
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)
    let exponential = props.map.isEM

    const parseHistogramData = (histogramData: libcootApi.HistogramInfoJS) => {
        const axisLabelsFontSize = convertViewtoPx(70, height) / 60

        const handleClick = (evt) => {
            if (chartRef !== null && typeof chartRef !== 'function') {
                const points = chartRef.current.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true)
                if (points.length === 0){
                    return
                }
                const peakIndex = points[0].index
                props.setMapContourLevel(histogramData.base + histogramData.bin_width * (peakIndex + 1))
            }
        }

        const highestCount = Math.max(...histogramData.counts)
        const secondHighestCount = Math.max(...histogramData.counts.filter(count => count !== highestCount))
        let mapLevel = props.map.getMapContourParams().contourLevel
        let currentLevelBin = Math.round((mapLevel - histogramData.base) / histogramData.bin_width)
        return {
            type: 'bar',
            options: {
                plugins : {
                    legend: {
                        display: false
                    },
                    annotation: {
                        annotations: {
                            verticalLine: {
                                type: 'line',
                                xMin: currentLevelBin,
                                xMax: currentLevelBin,
                                borderColor: 'darkgrey',
                                borderWidth: 2,
                            },
                        },
                    },

                },
                scales: {
                  y: {
                    max: secondHighestCount,
                    type: exponential ? 'logarithmic' : 'linear',
                    beginAtZero: exponential ? false : true,
                    grid: {
                        display: true,
                        borderWidth: 0
                    },
                    title: {
                        display: true,
                        font: {size: axisLabelsFontSize, family:'Helvetica', weight:800},
                        text: 'Counts',
                        color: 'black'
                    },
                    ticks: {
                        callback: function(val, index) {
                            if (exponential) { 
                                return val.toExponential();
                            } else {
                                return val === secondHighestCount ? highestCount : val;
                            }
                        }
                    }
                  },
                  x: {
                    beginAtZero: true,
                    grid: {
                        display:false,
                        borderWidth: 0
                    },
                    title: {
                        display: true,
                        font:{size: axisLabelsFontSize, family:'Helvetica', weight:800},
                        text: 'Density value',
                        color: 'black'
                    }
                  }
                },
                onClick: handleClick
            },
            data: {
                labels: histogramData.counts.map((item, index) => {
                    const currentBinBase =  histogramData.base + histogramData.bin_width * (index + 1)
                    return  currentBinBase.toFixed(props.map.isEM ? 4 : 2)
                }),
                datasets: [{
                    barPercentage: 1.0,
                    categoryPercentage: 1.0,
                    label: 'Counts',
                    data: histogramData.counts,
                    backgroundColor: [
                        isDark ? 'rgba(100, 100, 100, 0.7)' : 'rgba(204, 204, 204, 0.7)'
                      ],
                      borderColor: [
                        isDark ? 'rgba(100, 100, 100, 0.7)' : 'rgba(204, 204, 204, 0.7)'
                      ],
                }],
            },
        };
    }

    useEffect(() => {
        const fetchHistogram = async () => {   
            props.setBusy(true)

            if (!props.showHistogram) {
                return
            }

            const histogram = await props.map.getHistogram(200, zoomFactor)
            
            const canvas = document.getElementById(`${props.map.molNo}-histogram`) as HTMLCanvasElement;
            const ctx = canvas.getContext("2d")
            const chartData = parseHistogramData(histogram)
            
            if (!chartData) {
                return
            }
    
            if (chartRef !== null && typeof chartRef !== 'function') {
                chartRef.current?.destroy()
                chartRef.current = new Chart(ctx, chartData as any)
            }

            setTimeout(() => {
                props.setBusy(false)
            }, 500)
            
        }
        fetchHistogram()
    }, [isDark, props.showHistogram, width, height, zoomFactor])

    return <Row>
        <Stack style={{display: 'flex', marginTop: '0.5rem'}} gap={1} direction="horizontal">
            <div className="histogram-plot-div" style={{width: '95%'}}>
                <canvas id={`${props.map.molNo}-histogram`}></canvas>
            </div>
            <Stack style={{display: 'flex', width: '1.5rem', justifyContent: 'center', alignContent: 'center', alignItems: 'center', verticalAlign: 'center'}} gap={1} direction="vertical">
                <IconButton onClick={() => setZoomFactor((prev) => {
                    if (prev + 2 > 20) {
                        return 20
                    }
                    return prev + 2
                })}>
                    <ZoomInOutlined/>
                </IconButton>
                x{zoomFactor}
                <IconButton onClick={() => setZoomFactor((prev) => {
                    if (prev - 2 < 1) {
                        return 1
                    }
                    return prev - 2
                    })}>
                    <ZoomOutOutlined/>
                </IconButton>
            </Stack>
        </Stack>
    </Row>
})
