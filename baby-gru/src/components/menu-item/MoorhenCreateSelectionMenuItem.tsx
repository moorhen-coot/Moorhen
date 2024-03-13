import { useRef, useState } from "react"
import { Button, Form } from "react-bootstrap"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { useDispatch, useSelector } from 'react-redux';
import { setResidueSelection, setShowResidueSelection } from "../../store/generalStatesSlice";
import { MoorhenCidInputForm } from "../form/MoorhenCidInputForm";

export const MoorhenCreateSelectionMenuItem = (props: {
    glRef: React.RefObject<webGL.MGWebGL>;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
}) => {

    const dispatch = useDispatch()
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)

    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null)
    const cidFormRef = useRef<null | HTMLInputElement>(null)
    
    const [cid, setCid] = useState<string>("")
    const [invalidCid, setInvalidCid] = useState<boolean>(false)

    const createSelection = async () => {
        const selectedCid = cidFormRef.current.value
        if (!selectedCid || !moleculeSelectRef.current.value) {
            return
        }
        
        const molecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value))
        if (!molecule) {
            return
        }
        
        let newSelection: moorhen.ResidueSelection
        try {
            newSelection = await molecule.parseCidIntoSelection(selectedCid)
        } catch (err) {
            console.log(err)
            setInvalidCid(true)
            return
        }

        if (!newSelection) {
            setInvalidCid(true)
            return
        }   

        setInvalidCid(false)
        await molecule.drawResidueSelection(selectedCid)
        dispatch( setResidueSelection(newSelection) )
        dispatch( setShowResidueSelection(true) )
        document.body.click()
    }

    const panelContent = <>
        <MoorhenMoleculeSelect ref={moleculeSelectRef} molecules={molecules} width='20rem'/>
        <MoorhenCidInputForm margin={'0.5rem'} width="95%" onChange={(evt) => setCid(evt.target.value)} ref={cidFormRef} invalidCid={invalidCid}/> 
        <Button variant="primary" onClick={createSelection}>
            OK
        </Button>
    </>

    return <MoorhenBaseMenuItem
        id='create-selection-menu-item'
        popoverContent={panelContent}
        menuItemText="Create a selection..."
        onCompleted={() => {}}
        showOkButton={false}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}
