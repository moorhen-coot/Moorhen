import { useRef, useState } from "react"
import { Form } from "react-bootstrap"
import { cidToSpec } from "../../utils/MoorhenUtils"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { useSelector } from 'react-redux';

export const MoorhenGoToMenuItem = (props: {
    glRef: React.RefObject<webGL.MGWebGL>;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
}) => {

    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null)
    const cidRef = useRef<null | HTMLInputElement>(null)
    const [cid, setCid] = useState<string>("")
    const molecules = useSelector((state: moorhen.State) => state.molecules)

    const panelContent = <>
        <MoorhenMoleculeSelect ref={moleculeSelectRef} molecules={molecules} width='20rem'/>
        <Form.Group className='moorhen-form-group' controlId="cid">
            <Form.Label>Atom selection</Form.Label>
            <Form.Control ref={cidRef} type="text" value={cid} onChange={(e) => {
                setCid(e.target.value)
            }} />
        </Form.Group>
    </>

    const onCompleted = () => {
        const selectedCid = cidRef.current.value
        if (!selectedCid || !moleculeSelectRef.current.value) {
            return
        }
        
        let residueSpec: moorhen.ResidueSpec
        try {
            residueSpec = cidToSpec(selectedCid)
        } catch (err) {
            console.log(err)
            console.log('Unable to parse CID')
            return
        }

        const molecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value))
        
        if (!residueSpec.chain_id || !residueSpec.res_no || !molecule) {
            return
        }

        molecule.centreOn(`/${residueSpec.mol_no ? residueSpec.mol_no : '*'}/${residueSpec.chain_id}/${residueSpec.res_no}-${residueSpec.res_no}/*`)
    }

    return <MoorhenBaseMenuItem
        id='go-to-menu-item'
        popoverContent={panelContent}
        menuItemText="Go to..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}
