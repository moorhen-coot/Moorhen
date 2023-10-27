import { useRef } from "react";
import { Form } from "react-bootstrap";
import { MoorhenMap } from "../../utils/MoorhenMap";
import { MoorhenMapSelect } from "../select/MoorhenMapSelect";
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
    const factorRef = useRef<HTMLInputElement>()
    const selectRef = useRef<HTMLSelectElement>(null)

    const panelContent = <>
        <Form.Group className='moorhen-form-group' controlId="MoorhenBlurMapMenuItem">
            <Form.Label>B-factor to apply</Form.Label>
            <Form.Control ref={factorRef} type="number" defaultValue={50.} />
        </Form.Group>
        <MoorhenMapSelect maps={maps} ref={selectRef} />
    </>


    const onCompleted = async () => {
        if (!selectRef.current.value) {
            return
        }
        
        const mapNo = parseInt(selectRef.current.value)
        const bFactor = parseFloat(factorRef.current.value)
        const newMap = new MoorhenMap(props.commandCentre, props.glRef)
        const selectedMap = maps.find(map => map.molNo === mapNo)

        if (!selectedMap) {
            return
        }

        const result = await props.commandCentre.current.cootCommand({
            returnType: 'status',
            command: 'sharpen_blur_map',
            commandArgs: [mapNo, bFactor, false]
        }, false) as moorhen.WorkerResponse<number>
        
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

