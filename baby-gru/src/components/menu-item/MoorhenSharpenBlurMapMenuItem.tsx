import { useRef, useState } from "react";
import { Form, InputGroup } from "react-bootstrap";
import { batch, useDispatch, useSelector } from "react-redux";
import { Store } from "@reduxjs/toolkit";
import { MoorhenMap } from "../../utils/MoorhenMap";
import { MoorhenMapSelect } from "../select/MoorhenMapSelect";
import { MoorhenNumberForm } from "../select/MoorhenNumberForm"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { addMap } from "../../store/mapsSlice";
import { hideMap, setContourLevel, setMapAlpha, setMapRadius, setMapStyle } from "../../store/mapContourSettingsSlice";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";

export const MoorhenSharpenBlurMapMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
    store: Store;
}) => {

    const dispatch = useDispatch()
    const maps = useSelector((state: moorhen.State) => state.maps)
    
    const factorRef = useRef<string>(null)
    const resampleFactorRef = useRef<string>(null)
    const selectRef = useRef<HTMLSelectElement>(null)
    const useResampleSwitchRef = useRef<HTMLInputElement>(null)
    
    const [useResample, setUseResample] = useState<boolean>(false)

    const panelContent = <>
        <MoorhenMapSelect maps={maps} ref={selectRef} />
        <MoorhenNumberForm ref={factorRef} label="B-factor to apply" defaultValue={50.} allowNegativeValues={true}/>
        <InputGroup className='moorhen-input-group-check' style={{width: '100%'}}>
            <Form.Check 
                ref={useResampleSwitchRef}
                type="switch"
                checked={useResample}
                onChange={() => { setUseResample((prev) => !prev) }}
                label="Use resample"/>
        </InputGroup>
        {useResample && <MoorhenNumberForm ref={resampleFactorRef} label="Resampling factor" defaultValue={1.4}/> }
    </>

    const onCompleted = async () => {
        if (!selectRef.current.value || !factorRef.current || (useResampleSwitchRef.current.checked && !resampleFactorRef.current)) {
            console.warn('Unable to sharpen/blur map, invalid input...')
            return
        }
        
        const mapNo = parseInt(selectRef.current.value)
        const bFactor = parseFloat(factorRef.current)
        const newMap = new MoorhenMap(props.commandCentre, props.glRef, props.store)
        const selectedMap = maps.find(map => map.molNo === mapNo)

        if (!selectedMap) {
            return
        }

        let result: moorhen.WorkerResponse<number>
        if (!useResampleSwitchRef.current.checked) {
            result = await props.commandCentre.current.cootCommand({
                returnType: 'int',
                command: 'sharpen_blur_map',
                commandArgs: [mapNo, bFactor, false]
            }, false) as moorhen.WorkerResponse<number>
        } else {
            const resampleFactor = parseFloat(resampleFactorRef.current)
            result = await props.commandCentre.current.cootCommand({
                returnType: 'int',
                command: 'sharpen_blur_map_with_resample',
                commandArgs: [mapNo, bFactor, resampleFactor, false]
            }, false) as moorhen.WorkerResponse<number>
        }
        
        if (result.data.result.result !== -1) {
            newMap.molNo = result.data.result.result
            newMap.name = `Map ${mapNo} ${bFactor < 0 ? "sharpened" : "blurred"} by ${bFactor}`
            await newMap.getSuggestedSettings()
            newMap.isDifference = selectedMap.isDifference
            const { mapRadius, contourLevel, mapAlpha, mapStyle } = selectedMap.getMapContourParams()
            batch(() => {
                dispatch( setMapRadius({ molNo: newMap.molNo, radius: mapRadius }) )
                dispatch( setContourLevel({ molNo: newMap.molNo, contourLevel: contourLevel }) )
                dispatch( setMapAlpha({ molNo: newMap.molNo, alpha: mapAlpha }) )
                dispatch( setMapStyle({ molNo: newMap.molNo, style: mapStyle }) )
                dispatch( hideMap(selectedMap) )
                dispatch( addMap(newMap) )    
            })
        }

        return result
    }

    return <MoorhenBaseMenuItem
        id='sharpen-blur-map-menu-item'
        popoverContent={panelContent}
        menuItemText="Sharpen/Blur map..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

