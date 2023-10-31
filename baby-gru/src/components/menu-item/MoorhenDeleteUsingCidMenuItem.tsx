import { useRef, useState } from "react"
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect"
import { Form } from "react-bootstrap"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { useSelector } from 'react-redux';

export const MoorhenDeleteUsingCidMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
}) => {

    const fromRef = useRef<null | HTMLSelectElement>(null)
    const cidRef = useRef<null |HTMLInputElement>(null)
    const [cid, setCid] = useState<string>("")
    const molecules = useSelector((state: moorhen.State) => state.molecules)

    const panelContent = <>
        <MoorhenMoleculeSelect molecules={molecules} label="From molecule" allowAny={false} ref={fromRef} />
        <Form.Group className='moorhen-form-group' controlId="cid">
            <Form.Label>Selection to delete</Form.Label>
            <Form.Control ref={cidRef} type="text" value={cid} onChange={(e) => {
                setCid(e.target.value)
            }} />
        </Form.Group>

    </>

    const onCompleted = async () => {
        if (!fromRef.current || !fromRef.current.value) {
            return
        }

        const fromMolecule = molecules.find(molecule => molecule.molNo === parseInt(fromRef.current.value))
        const cidToDelete = cidRef.current.value

        if (!fromMolecule || !cidToDelete) {
            return
        }

        await fromMolecule.deleteCid(cidToDelete)
        
        props.setPopoverIsShown(false)
    }

    return <MoorhenBaseMenuItem
        popoverPlacement='right'
        popoverContent={panelContent}
        menuItemText="Delete atom selection..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}
