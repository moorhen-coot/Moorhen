import { useRef, useState } from "react";
import { Form, InputGroup } from "react-bootstrap";
import { MoorhenMap } from "../../utils/MoorhenMap";
import { MoorhenMapSelect } from "../select/MoorhenMapSelect";
import { MoorhenNumberForm } from "../select/MoorhenNumberForm"
import { moorhen } from "../../types/moorhen";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";
import { webGL } from "../../types/mgWebGL";
import { useDispatch, useSelector } from "react-redux";
import { addMap } from "../../store/mapsSlice";

export const MoorhenSharpenBlurMapMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
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
        <MoorhenNumberForm ref={factorRef} defaultValue={50.} label="B-factor to apply" />
        <InputGroup className='moorhen-input-group-check' style={{width: '100%'}}>
            <Form.Check 
                ref={useResampleSwitchRef}
                type="switch"
                checked={useResample}
                onChange={() => { setUseResample((prev) => !prev) }}
                label="Use resample"/>
        </InputGroup>
        {useResample && <MoorhenNumberForm ref={resampleFactorRef} defaultValue={1.4} label="Resampling factor"/> }
    </>

    const onCompleted = async () => {
        if (!selectRef.current.value || !factorRef.current || (useResampleSwitchRef.current.checked && !resampleFactorRef.current)) {
            console.warn('Unable to sharpen/blur map, invalid input...')
            return
        }
        
        const mapNo = parseInt(selectRef.current.value)
        const bFactor = parseFloat(factorRef.current)
        const newMap = new MoorhenMap(props.commandCentre, props.glRef)
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
            newMap.name = `Map ${mapNo} blurred by ${bFactor}`
            await newMap.getSuggestedSettings()
            newMap.isDifference = selectedMap.isDifference
            newMap.suggestedContourLevel = selectedMap.contourLevel
            newMap.suggestedRadius = selectedMap.mapRadius
            dispatch( addMap(newMap) )
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

