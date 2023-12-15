import { useRef, useState } from "react"
import { Form } from "react-bootstrap"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { useDispatch, useSelector } from 'react-redux';
import { setResidueSelection, setShowResidueSelection } from "../../store/generalStatesSlice";

export const MoorhenCreateSelectionMenuItem = (props: {
    glRef: React.RefObject<webGL.MGWebGL>;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
}) => {

    const dispatch = useDispatch()
    const molecules = useSelector((state: moorhen.State) => state.molecules)

    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null)
    const cidRef = useRef<null | HTMLInputElement>(null)
    
    const [cid, setCid] = useState<string>("")

    const panelContent = <>
        <MoorhenMoleculeSelect ref={moleculeSelectRef} molecules={molecules} width='20rem'/>
        <Form.Group className='moorhen-form-group' controlId="cid">
            <Form.Label>Atom selection</Form.Label>
            <Form.Control ref={cidRef} type="text" value={cid} onChange={(e) => {
                setCid(e.target.value)
            }} />
        </Form.Group>
    </>

    const onCompleted = async () => {
        const selectedCid = cidRef.current.value
        if (!selectedCid || !moleculeSelectRef.current.value) {
            return
        }
        
        const molecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value))
        if (!molecule) {
            return
        }
        const newSelection = await molecule.parseCidIntoSelection(selectedCid)
        if (!newSelection) {
            return
        }

        await molecule.drawResidueSelection(selectedCid)
        dispatch( setResidueSelection(newSelection) )
        dispatch( setShowResidueSelection(true) )
    }

    return <MoorhenBaseMenuItem
        id='create-selection-menu-item'
        popoverContent={panelContent}
        menuItemText="Create a selection..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}
