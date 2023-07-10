import { useRef, useState } from "react"
import { Form } from "react-bootstrap"
import { cidToSpec } from "../../utils/MoorhenUtils"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";

export const MoorhenGoToMenuItem = (props: {
    molecules: moorhen.Molecule[];
    glRef: React.RefObject<webGL.MGWebGL>;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
}) => {

    const cidRef = useRef<null | HTMLInputElement>(null)
    const [cid, setCid] = useState<string>("")

    const panelContent = <>
        <Form.Group style={{ width: '20rem', margin: '0.5rem' }} controlId="cid" className="mb-3">
            <Form.Label>Residue CID</Form.Label>
            <Form.Control ref={cidRef} type="text" value={cid} onChange={(e) => {
                setCid(e.target.value)
            }} />
        </Form.Group>
    </>

    const onCompleted = () => {
        const selectedCid = cidRef.current.value
        if (!selectedCid || props.molecules.length === 0) {
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

        const molecule = residueSpec.mol_name ? props.molecules.find(molecule => molecule.name === residueSpec.mol_name) : props.molecules[0]
        
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
