import { useRef } from "react";
import { Form } from "react-bootstrap";
import { MoorhenMap } from "../../utils/MoorhenMap";
import { MoorhenMapSelect } from "../select/MoorhenMapSelect";
import { moorhen } from "../../types/moorhen";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";
import { webGL } from "../../types/mgWebGL";

export const MoorhenSharpenBlurMapMenuItem = (props: {
    maps: moorhen.Map[];
    changeMaps: (arg0: moorhen.MolChange<moorhen.Map>) => void;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
}) => {

    const factorRef = useRef<HTMLInputElement>()
    const selectRef = useRef<HTMLSelectElement>(null)

    const panelContent = <>
        <Form.Group style={{ width: '20rem', margin: '0.5rem' }} controlId="MoorhenBlurMapMenuItem" className="mb-3">
            <Form.Label>B-factor to apply</Form.Label>
            <Form.Control ref={factorRef} type="number" defaultValue={50.} />
        </Form.Group>
        <MoorhenMapSelect {...props} ref={selectRef} />
    </>


    const onCompleted = async () => {
        if (!selectRef.current.value) {
            return
        }
        
        const mapNo = parseInt(selectRef.current.value)
        const bFactor = parseFloat(factorRef.current.value)
        const newMap = new MoorhenMap(props.commandCentre, props.glRef)

        const result = await props.commandCentre.current.cootCommand({
            returnType: 'status',
            command: 'sharpen_blur_map',
            commandArgs: [mapNo, bFactor, false]
        }, false) as moorhen.WorkerResponse<number>
        
        if (result.data.result.result !== -1) {
            newMap.molNo = result.data.result.result
            newMap.name = `Map ${mapNo} blurred by ${bFactor}`
            const oldMaps = props.maps.filter(map => map.molNo === mapNo)
            newMap.isDifference = oldMaps[0].isDifference
            props.changeMaps({ action: 'Add', item: newMap })
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

