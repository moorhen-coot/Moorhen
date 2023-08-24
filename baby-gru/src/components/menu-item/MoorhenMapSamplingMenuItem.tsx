import { Slider } from "@mui/material";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";
import { useEffect, useState } from "react";
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";

export const MoorhenMapSamplingMenuItem = (props: {
    setDefaultMapSamplingRate: React.Dispatch<React.SetStateAction<number>>;
    defaultMapSamplingRate: number;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>; 
    popoverPlacement?: "left" | "right";
    maps: moorhen.Map[];
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
}) => {

    const [mapSampling, setMapSampling] = useState<number>(props.defaultMapSamplingRate === 1.8 ? 1 : props.defaultMapSamplingRate === 2.5 ? 50 : 100);

    useEffect(() => {
        const setMapSamplingRate = async () => {
            let newSamplingRate: number
            switch (mapSampling) {
                case 1:
                    newSamplingRate = 1.8
                    break
                case 50:
                    newSamplingRate = 2.5
                    break
                case 100:
                    newSamplingRate = 4.0
                    break
                default:
                    newSamplingRate = 1.8
                    break
            }

            if (newSamplingRate !== props.defaultMapSamplingRate) {
                await props.commandCentre.current.cootCommand({
                    command: 'set_map_sampling_rate',
                    commandArgs: [newSamplingRate],
                    returnType: 'status'
                }, false)
           
                props.setDefaultMapSamplingRate(newSamplingRate)
           
                if (props.maps.length > 0) {
                    await Promise.all(
                        props.maps.filter(map => !map.isEM && map.hasReflectionData).map(async(map: moorhen.Map) => {
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
        <div style={{width: '15rem', padding: '1rem'}}>
            <Slider
                aria-label="Map sampling rate"
                value={mapSampling}
                onChange={(evt, value: number) => { setMapSampling(value) }}
                valueLabelFormat={(value) => {
                    switch(value) {
                        case 1:
                            return "Coarse"
                        case 50:
                            return "Nice"
                        default: 
                            return "Smooth"
                    }
                }}
                getAriaValueText={(value) => {
                    switch(value) {
                        case 1:
                            return "Coarse"
                        case 50:
                            return "Nice"
                        default: 
                            return "Smooth"
                    }
                }}
                step={null}
                valueLabelDisplay="auto"
                marks={[
                    {value: 1, label: 'Coarse'},
                    {value: 50, label: 'Nice'},
                    {value: 100, label: 'Smooth'}
                ]}
            />
        </div>

    return <MoorhenBaseMenuItem
        popoverPlacement={props.popoverPlacement}
        popoverContent={panelContent}
        menuItemText={"Set map sampling rate..."}
        setPopoverIsShown={props.setPopoverIsShown}
        onCompleted={() => {}}
    />
}

MoorhenMapSamplingMenuItem.defaultProps = {
    popoverPlacement: 'right'
}