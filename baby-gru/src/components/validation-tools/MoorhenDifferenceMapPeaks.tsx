import { useCallback, useRef, useState } from "react"
import { Col, Form } from 'react-bootstrap';
import { Chart, ChartEvent, ChartType, TooltipItem, registerables } from 'chart.js';
import { MoorhenSlider } from '../misc/MoorhenSlider' 
import annotationPlugin from 'chartjs-plugin-annotation'
import { convertViewtoPx} from '../../utils/utils';
import { moorhen } from "../../types/moorhen";
import { libcootApi } from "../../types/libcoot";
import { MoorhenValidationChartWidgetBase } from "./MoorhenValidationChartWidgetBase";
import { useSelector } from "react-redux";
import { useDispatch } from 'react-redux';
import { setOrigin } from "../../store/glRefSlice"

Chart.register(...registerables);
Chart.register(annotationPlugin);

interface Props extends moorhen.CollectedProps {
    chartId: string;
}

export const MoorhenDifferenceMapPeaks = (props: Props) => {

    const dispatch = useDispatch()
    const chartRef = useRef(null);
    
    const [selectedRmsd, setSelectedRmsd] = useState<number>(4.5)
    const [mapRmsd, setMapRmsd] = useState<number>(4.5)

    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)

    const plugin = {
        id: 'custom_bar_borders',
        afterDatasetsDraw: (chart, args, options) => {
            const {ctx} = chart;
            ctx.save();
            ctx.lineWidth = convertViewtoPx(35, width) / 250;
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

    const filterMapFunction = (map: moorhen.Map) => map.isDifference

    const colourPalette = (value: number) => {
        let gfrac = ( 1 / value)
        if (value > 0) {
            return 'rgb(0, ' + Math.floor(155 + (100 * gfrac)) + ', 0)'
        } else {
            return 'rgb(' + Math.floor(155 - (100 * gfrac)) + ', 0, 0)'
        }

    }

    const fetchData = async(selectedModel: number, selectedMap: number, selectedChain: string) => {
        if (selectedModel === null || selectedMap === null || selectedRmsd === null) {
            setMapRmsd(null)
            return null
        }

        let promises = [
            props.commandCentre.current.cootCommand({
                message:'coot_command',
                command: "difference_map_peaks", 
                returnType:'interesting_places_data',
                commandArgs:[selectedMap, selectedModel, selectedRmsd], 
            }, false),
            props.commandCentre.current.cootCommand({
                message:'coot_command',
                command: "get_map_rmsd_approx", 
                returnType:'float',
                commandArgs:[selectedMap], 
            }, false)
        ] as [Promise<moorhen.WorkerResponse<libcootApi.InterestingPlaceDataJS[]>>, Promise<moorhen.WorkerResponse<number>>]

        let responses = await Promise.all(promises)
        let newPlotData = responses[0].data.result.result.reverse()
        let newMapRmsd = responses[1].data.result.result
        setMapRmsd(newMapRmsd)
        return newPlotData

    }

    const getChart = useCallback((selectedModel: number, selectedMap: number, selectedChain: string, plotData: libcootApi.InterestingPlaceDataJS[]) => {
        
        const handleClick = (evt: ChartEvent) => {
            if (chartRef.current === null){
                return
            }
    
            const points = chartRef.current.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
            
            if (points.length === 0){
                return;
            }
            
            const peakIndex = points[0].index
            dispatch(setOrigin([-plotData[peakIndex].coordX, -plotData[peakIndex].coordY, -plotData[peakIndex].coordZ]))
        }
    
        const setTooltipTitle = (args: TooltipItem<ChartType>[]) => {
            if (!chartRef.current || selectedRmsd === null || mapRmsd === null){
                return;
            }
            
            const peakIndex = args[0].dataIndex
            return [
                `# ${peakIndex + 1}`,
                `Position (${plotData[peakIndex].coordX.toFixed(2)}, ${plotData[peakIndex].coordY.toFixed(2)}, ${plotData[peakIndex].coordZ.toFixed(2)})`,
                `Height ${(plotData[peakIndex].featureValue / mapRmsd).toFixed(2)}`
            ]
        }

        let labels = plotData.map((peak, idx) => idx % 10 === 0 ? idx : '')
        const barWidth = convertViewtoPx(35, width) / 40
        const tooltipFontSize = 12
        const axisLabelsFontSize = convertViewtoPx(70, height) / 60
        
        const containerBody = document.getElementById(`${props.chartId}-container-body`)
        containerBody.style.width = (labels.length*barWidth)+ "px";
        
        let scales = {
            x: {
                stacked: false,
                beginAtZero: true,
                display: true,
                ticks: {
                    color: isDark ? 'white' : 'black',
                    font:{size: barWidth, family:'Helvetica'},
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
                    font:{size: axisLabelsFontSize, family:'Helvetica', weight: 800},
                    text: 'Difference Map Peaks',
                    color: isDark ? 'white' : 'black'
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

        return {
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
                    },
                    annotation: {
                        annotations: {
                            thresholdLine: {
                                type: 'line',
                                mode: 'horizontal',
                                scaleID: 'y-axis-0',
                                yMin: 0,
                                yMax: 0,
                                borderColor: 'black',
                                borderWidth: 2,
                            }
                        }  
                    },    
                },
                onClick: handleClick,
                responsive: true,
                maintainAspectRatio: false,
                barThickness: 'flex',
                scales: scales
            }            
        }
    }, [width, height, props.chartId, isDark])

    return <MoorhenValidationChartWidgetBase
                ref={chartRef}
                chartId={props.chartId}
                fetchData={fetchData}
                getChart={getChart} 
                filterMapFunction={filterMapFunction}
                enableChainSelect={false}
                extraControlForm={
                    <Col style={{justifyContent:'center', alignContent:'center', alignItems:'center', display:'flex'}}>
                        <Form.Group controlId="rmsdSlider" style={{margin:'0.5rem', width: '100%'}}>
                            <MoorhenSlider minVal={2.5} maxVal={7.0} logScale={false} sliderTitle="RMSD" initialValue={4.5} externalValue={selectedRmsd} setExternalValue={setSelectedRmsd}/>
                        </Form.Group>
                    </Col>
                }
                extraControlFormValue={selectedRmsd}
            />
}
