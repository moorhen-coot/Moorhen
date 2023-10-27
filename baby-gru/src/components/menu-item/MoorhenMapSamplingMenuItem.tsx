import { Slider } from "@mui/material";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";
import { useEffect, useState } from "react";
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { useDispatch, useSelector } from "react-redux";
import { setDefaultMapSamplingRate } from "../../store/mapSettingsSlice";

const convertPercentageToSamplingRate = (oldValue: number, reverse: boolean = false) => {
    let [oldMax, oldMin, newMax, newMin]: number[] = []
    if (reverse) {
        [oldMax, oldMin, newMax, newMin] = [4.0, 1.5, 100, 1]
    } else {
        [oldMax, oldMin, newMax, newMin] = [100, 1, 4.0, 1.5]
    }
    
    const oldRange = (oldMax - oldMin)
    const newRange = (newMax - newMin)
    const newValue = (((oldValue - oldMin) * newRange) / oldRange) + newMin

    return newValue
}

const samplingRateMarks = [1, 13, 25, 40, 60, 80, 100]

export const MoorhenMapSamplingMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>; 
    popoverPlacement?: "left" | "right";
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
}) => {

    const dispatch = useDispatch()
    const maps = useSelector((state: moorhen.State) => state.maps)
    const defaultMapSamplingRate = useSelector((state: moorhen.State) => state.mapSettings.defaultMapSamplingRate)

    const [mapSampling, setMapSampling] = useState<number>(convertPercentageToSamplingRate(defaultMapSamplingRate, true))

    useEffect(() => {
        const setMapSamplingRate = async () => {
            let newSamplingRate = convertPercentageToSamplingRate(mapSampling)

            if (newSamplingRate !== defaultMapSamplingRate) {
                await props.commandCentre.current.cootCommand({
                    command: 'set_map_sampling_rate',
                    commandArgs: [newSamplingRate],
                    returnType: 'status'
                }, false)
           
                dispatch(
                    setDefaultMapSamplingRate(newSamplingRate)
                )
           
                if (maps.length > 0) {
                    await Promise.all(
                        maps.filter(map => !map.isEM && map.hasReflectionData).map(async(map: moorhen.Map) => {
                            const reflectionData = await map.fetchReflectionData()
                            await props.commandCentre.current.cootCommand({
                                returnType: "status",
                                command: 'shim_replace_map_by_mtz_from_file',
                                commandArgs: [map.molNo, reflectionData.data.result.mtzData, map.selectedColumns]
                            }, true) as moorhen.WorkerResponse<number>
                            return map.doCootContour(...props.glRef.current.origin.map(coord => -coord) as [number, number, number], map.mapRadius, map.contourLevel)
                        })
                    )
                }
            }
        }
        
        setMapSamplingRate()

     }, [mapSampling])
    
    const panelContent =
        <div style={{width: '17rem', padding: '1rem'}}>
            <span>Map sampling rate</span>
            <Slider
                aria-label="Map sampling rate"
                value={mapSampling}
                onChange={(evt, value: number) => { setMapSampling(value) }}
                valueLabelFormat={(value) => {
                    const samplingRate = convertPercentageToSamplingRate(value)
                    return samplingRate.toFixed(1).toString()
                }}
                getAriaValueText={(value) => {
                    const samplingRate = convertPercentageToSamplingRate(value)
                    return samplingRate.toFixed(1).toString()
                }}
                step={null}
                valueLabelDisplay="auto"
                marks={samplingRateMarks.map(mark => {return {value: mark, label:  convertPercentageToSamplingRate(mark).toFixed(1).toString()}})}
            />
        </div>

    return <MoorhenBaseMenuItem
        popoverPlacement={props.popoverPlacement}
        popoverContent={panelContent}
        showOkButton={false}
        menuItemText={"Set map sampling rate..."}
        setPopoverIsShown={props.setPopoverIsShown}
        onCompleted={() => {}}
    />
}

MoorhenMapSamplingMenuItem.defaultProps = {
    popoverPlacement: 'right'
}