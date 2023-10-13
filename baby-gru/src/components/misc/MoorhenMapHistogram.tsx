import { forwardRef, useEffect } from "react"
import { Chart, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation'
import { moorhen } from "../../types/moorhen";
import { libcootApi } from "../../types/libcoot";
import { convertViewtoPx } from "../../utils/MoorhenUtils";

Chart.register(...registerables);
Chart.register(annotationPlugin);

type MapHistogramProps = {
    map: moorhen.Map;
    showHistogram: boolean;
    windowWidth: number;
    windowHeight: number;
    isDark: boolean;
    setBusy: React.Dispatch<React.SetStateAction<boolean>>;
}

export const MoorhenMapHistogram = forwardRef<Chart, MapHistogramProps>((props, chartRef) => {

    const parseHistogramData = (histogramData: libcootApi.HistogramInfoJS) => {
        const axisLabelsFontSize = convertViewtoPx(70, props.windowHeight) / 60

        return {
            type: 'bar',
            options: {
                plugins : {
                    legend: {
                        display: false
                    },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: {
                        display: true,
                        borderWidth: 0
                    },
                    title: {
                        display: true,
                        font:{size: axisLabelsFontSize, family:'Helvetica', weight:800},
                        text: 'Counts',
                        color: props.isDark ? 'white' : 'black'
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
                        color: props.isDark ? 'white' : 'black'
                    }
                  }
                }
            },
            data: {
                labels: histogramData.counts.map((item, index) => {
                    const currentBinBase =  histogramData.base + histogramData.bin_width * (index + 1)
                    return  currentBinBase.toFixed(2)
                }),
                datasets: [{
                    barPercentage: 1.0,
                    categoryPercentage: 1.0,
                    label: 'Counts',
                    data: histogramData.counts,
                    backgroundColor: [
                        props.isDark ? 'rgba(100, 100, 100, 0.7)' : 'rgba(204, 204, 204, 0.7)'
                      ],
                      borderColor: [
                        props.isDark ? 'rgba(100, 100, 100, 0.7)' : 'rgba(204, 204, 204, 0.7)'
                      ],
                }],
            },
        };
    }

    useEffect(() => {
        const fetchHistogram = async () => {
            if (chartRef !== null && typeof chartRef !== 'function' && chartRef.current) {
                chartRef.current.destroy()
            }
    
            props.setBusy(true)

            if (!props.showHistogram) {
                return
            }

            const histogram = await props.map.getHistogram()
            
            const canvas = document.getElementById(`${props.map.molNo}-histogram`) as HTMLCanvasElement;
            const ctx = canvas.getContext("2d")
            const chartData = parseHistogramData(histogram)
            
            if (!chartData) {
                return
            }
    
            if (chartRef !== null && typeof chartRef !== 'function') {
                chartRef.current = new Chart(ctx, chartData as any);
            }

            setTimeout(() => {
                props.setBusy(false)
            }, 500)
            
        }
        fetchHistogram()
    }, [props.isDark, props.showHistogram, props.windowWidth])

    return  <div className="histogram-plot-div" style={{marginTop: '0.5rem'}}>
                <canvas id={`${props.map.molNo}-histogram`}></canvas>
            </div>
})
