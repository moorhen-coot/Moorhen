import { useDispatch, useSelector } from "react-redux"
import { useCallback, useRef } from "react"
import { ChartEvent, ChartType, TooltipItem } from "chart.js"
import { moorhen } from "../../types/moorhen"
import { getResidueInfo } from "../../utils/utils"
import { libcootApi } from "../../types/libcoot"
import { setHoveredAtom } from "../../moorhen"
import { residueCodesOneToThree } from "../../utils/enums"
import { MoorhenValidationChartWidgetBase } from "./MoorhenValidationChartWidgetBase"

export const MoorhenQScore = (props: moorhen.CollectedProps) => {

    const chartRef = useRef(null)

    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)

    const dispatch = useDispatch()

    const fetchData = async (selectedModel: number, selectedMap: number, selectedChain: string): Promise<libcootApi.ValidationInformationJS[]> => {
        if (selectedModel === null || selectedChain === null || selectedChain === null) {
            return null
        }
        const result = await props.commandCentre.current.cootCommand({
            command: 'get_q_score',
            commandArgs: [selectedModel, selectedMap],
            returnType: "validation_data"
        }, false) as moorhen.WorkerResponse<libcootApi.ValidationInformationJS[]>
        
        return result.data.result.result.filter(item => item.chainId === selectedChain)
    }

    const getSequenceData = useCallback((selectedMolNo: number, selectedChain: string) => {
        const selectedMolecule = molecules.find(molecule => molecule.molNo === selectedMolNo)
        if (selectedMolecule) {
            const sequenceData = selectedMolecule.sequences.find(sequence => sequence.chain === selectedChain)
            if (sequenceData) {
                return sequenceData.sequence
            }    
        }
    }, [molecules])

    const getChart = useCallback((selectedModel: number, selectedMap: number, selectedChain: string, plotData: libcootApi.ValidationInformationJS[]) => {

        const handleClick = (evt: ChartEvent) => {
            if (chartRef.current === null){
                return
            }
    
            const points = chartRef.current.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
            
            if (points.length === 0){
                return;
            }
            
            const residueIndex = points[0].index
            const selectedMolecule = molecules.find(molecule => molecule.molNo === selectedModel)
            if(selectedMolecule) {
                const clickedResidue = getResidueInfo(molecules, selectedMolecule.molNo, selectedChain, residueIndex)
                if (clickedResidue) {
                    selectedMolecule.centreOn(`/*/${clickedResidue.chain}/${clickedResidue.seqNum}-${clickedResidue.seqNum}/*`, true, true)
                }
            }
        }
    
        const setTooltipTitle = (args: TooltipItem<ChartType>[]) => {
            if (!chartRef.current){
                return;
            }
            
            const residueIndex = args[0].dataIndex
            const selectedMolecule = molecules.find(molecule => molecule.molNo === selectedModel)
            if(selectedMolecule) {
                const clickedResidue = getResidueInfo(molecules, selectedMolecule.molNo, selectedChain, residueIndex)
                if (clickedResidue) {
                    dispatch(
                        setHoveredAtom({
                            molecule: selectedMolecule,
                            cid:  `//${clickedResidue.chain}/${clickedResidue.seqNum}(${residueCodesOneToThree[clickedResidue.resCode]})/`
                        })
                    )
                    return `${clickedResidue.seqNum} (${residueCodesOneToThree[clickedResidue.resCode]})`
                }
            }
            
            return "UNK"
        }

        const datasets = [{
            label: "Q-Score",
            data: plotData.map(item => item.value),
            fill: false,
            tension: 1,
            borderColor: 'rgb(75, 192, 192)',
        }]


        const sequenceData =  getSequenceData(selectedModel, selectedChain)
        if (!sequenceData) {
            return
        }

        const labels = []
        sequenceData.forEach((residue, index) => {
            if (index % 10 !== 0) {
                labels.push(residue.resCode)
            } else {
                labels.push([residue.resCode, residue.resNum])
            }
        })
            
        const scales = {
            x: {
                ticks: {
                    color: isDark ? 'white' : 'black',
                },
                grid: {
                    display: false,
                    borderWidth: 1,
                    borderColor: isDark ? 'white' : 'black',
                },
            },
            y: {
                ticks: {
                    color: isDark ? 'white' : 'black',
                },
                grid: {
                    display: true,
                    borderWidth: 1,
                    borderColor: isDark ? 'white' : 'black',
                    color: isDark ? 'white' : 'black',
                },
            }
        }

        return {
            type: "line",
            data: {
                labels: labels,
                datasets: datasets
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
                            size: 12,
                            family:'Helvetica'
                        },
                        bodyFont: {
                            size: 12,
                            family:'Helvetica'
                        },
                        footerFont: {
                            family:'Helvetica'
                        }
                    }
                },
                onClick: handleClick,
                scales: scales,
                responsive: true,
                maintainAspectRatio: false,
            }
        }
    }, [getSequenceData, molecules, isDark])

    return <MoorhenValidationChartWidgetBase
                ref={chartRef}
                fetchData={fetchData}
                getChart={getChart} 
                chartId={"qscore-plot-chart"}
            />
}