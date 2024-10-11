import { Slider } from "@mui/material";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";
import { useEffect, useState } from "react";
import { moorhen } from "../../types/moorhen";
import { useDispatch, useSelector } from "react-redux";
import { setDefaultMapSamplingRate, setMapLineWidth } from "../../store/mapContourSettingsSlice";
import { Form, InputGroup } from "react-bootstrap";
import { MoorhenSlider } from "../misc/MoorhenSlider";
import { setDefaultMapLitLines, setDefaultMapSurface, setReContourMapOnlyOnMouseUp } from "../../store/mapContourSettingsSlice";

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

export const MapContourSettingsMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>; 
    popoverPlacement?: "left" | "right";
    commandCentre: React.RefObject<moorhen.CommandCentre>;
}) => {

    const maps = useSelector((state: moorhen.State) => state.maps)
    const defaultMapSamplingRate = useSelector((state: moorhen.State) => state.mapContourSettings.defaultMapSamplingRate)
    const mapLineWidth = useSelector((state: moorhen.State) => state.mapContourSettings.mapLineWidth)
    const visibleMaps = useSelector((state: moorhen.State) => state.mapContourSettings.visibleMaps)
    const defaultMapLitLines = useSelector((state: moorhen.State) => state.mapContourSettings.defaultMapLitLines)
    const defaultMapSurface = useSelector((state: moorhen.State) => state.mapContourSettings.defaultMapSurface)
    const reContourMapOnlyOnMouseUp = useSelector((state: moorhen.State) => state.mapContourSettings.reContourMapOnlyOnMouseUp)

    const [mapSampling, setMapSampling] = useState<number>(convertPercentageToSamplingRate(defaultMapSamplingRate, true))

    const dispatch = useDispatch()

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
                            if (visibleMaps.includes(map.molNo)) {
                                return map.drawMapContour()
                            } else {
                                return Promise.resolve()
                            }
                        })
                    )
                }
            }
        }
        
        setMapSamplingRate()

     }, [mapSampling])

    const panelContent = <>
        <InputGroup className='moorhen-input-group-check'>
            <Form.Check 
                type="switch"
                checked={defaultMapLitLines}
                onChange={() => {
                    if(!defaultMapLitLines) {
                        dispatch( setDefaultMapSurface(false) )
                    }
                    dispatch( setDefaultMapLitLines(!defaultMapLitLines) )
                }}
                label="Show maps as lit lines by default"/>
        </InputGroup>
        <InputGroup className='moorhen-input-group-check'>
            <Form.Check 
                type="switch"
                checked={defaultMapSurface}
                onChange={() => {
                    if(!defaultMapSurface) {
                        dispatch( setDefaultMapLitLines(false) )
                    }
                    dispatch( setDefaultMapSurface(!defaultMapSurface) )
                }}
                label="Show maps as surface by default"/>
        </InputGroup>
        <InputGroup className='moorhen-input-group-check'>
            <Form.Check 
                type="switch"
                checked={reContourMapOnlyOnMouseUp}
                onChange={() => {dispatch( setReContourMapOnlyOnMouseUp(!reContourMapOnlyOnMouseUp) )}}
                label="Recontour maps only on mouse up"/>
        </InputGroup>
        <hr></hr>
        <Form.Group controlId="mapLineWidthSlider" style={{ paddingLeft: '0.5rem', paddingRight: '0.5rem' }}>
            <MoorhenSlider
            minVal={0.1}
            maxVal={1.5}
            logScale={true}
            sliderTitle="Map lines thickness"
            initialValue={mapLineWidth}
            externalValue={mapLineWidth}
            showMinMaxVal={false}
            setExternalValue={(val: number) => dispatch(setMapLineWidth(val))}/>
        </Form.Group>
        <div style={{padding: '0.5rem'}}>
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
    </>

    return <MoorhenBaseMenuItem
        popoverPlacement={props.popoverPlacement ?? "right"}
        popoverContent={panelContent}
        showOkButton={false}
        menuItemText={"Map contour settings..."}
        setPopoverIsShown={props.setPopoverIsShown}
        onCompleted={() => {}}
    />
}
