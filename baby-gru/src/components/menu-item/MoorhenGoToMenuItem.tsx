import { useRef, useState } from "react"
import { Form } from "react-bootstrap"
import { cidToSpec } from "../../utils/utils"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { useSelector } from 'react-redux';
import { useSnackbar } from "notistack";

export const MoorhenGoToMenuItem = (props: {
    glRef: React.RefObject<webGL.MGWebGL>;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
}) => {

    const cidRef = useRef<null | HTMLInputElement>(null)
    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null)
    
    const [cid, setCid] = useState<string>("")
    
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    
    const { enqueueSnackbar } = useSnackbar()

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

        const molecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value))
        if (!molecule) {
            enqueueSnackbar("Not a valid molecule", {variant: "warning"})
            return
        }
        
        let residueSpec: moorhen.ResidueSpec
        try {
            residueSpec = cidToSpec(selectedCid)
            if (!residueSpec.chain_id || !residueSpec.res_no) {
                enqueueSnackbar("Unable to parse CID", {variant: "warning"})
            } else {
                molecule.centreOn(`/${residueSpec.mol_no ? residueSpec.mol_no : '*'}/${residueSpec.chain_id}/${residueSpec.res_no}-${residueSpec.res_no}/*`, true, true)
            }
        } catch (err) {
            console.log(err)
            enqueueSnackbar("Unable to parse CID", {variant: "warning"})
            return
        }
    }

    return <MoorhenBaseMenuItem
        id='go-to-menu-item'
        popoverContent={panelContent}
        menuItemText="Go to..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}
