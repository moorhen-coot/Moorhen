import { useRef, useState } from "react"
import { Form } from "react-bootstrap"
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { useSelector, useDispatch } from 'react-redux';
import { addMolecule } from "../../store/moleculesSlice";

export const MoorhenCopyFragmentUsingCidMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
    monomerLibraryPath: string;
}) => {

    const fromRef = useRef<null | HTMLSelectElement>(null)
    const cidRef = useRef<null |HTMLInputElement>(null)
    
    const [cid, setCid] = useState<string>("")
    
    const dispatch = useDispatch()
    const molecules = useSelector((state: moorhen.State) => state.molecules)

    const panelContent = <>
        <MoorhenMoleculeSelect molecules={molecules} label="From molecule" allowAny={false} ref={fromRef} />
        <Form.Group className='moorhen-form-group' controlId="cid">
            <Form.Label>Selection to copy</Form.Label>
            <Form.Control ref={cidRef} type="text" value={cid} onChange={(e) => {
                setCid(e.target.value)
            }} />
        </Form.Group>

    </>

    const onCompleted = async () => {
        const fromMolecule = molecules.find(molecule => molecule.molNo === parseInt(fromRef.current.value))
        const cidToCopy = cidRef.current.value

        if (!fromMolecule || !cidToCopy) {
            return
        }

        const newMolecule = await fromMolecule.copyFragmentUsingCid(cidToCopy, true)
        dispatch( addMolecule(newMolecule) )
        props.setPopoverIsShown(false)
    }

    return <MoorhenBaseMenuItem
        id='copy-fragment-menu-item'
        popoverPlacement='right'
        popoverContent={panelContent}
        menuItemText="Copy fragment..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}
