import { useRef, useState } from "react"
import { Button, Form } from "react-bootstrap"
import { useDispatch, useSelector } from 'react-redux';
import { useSnackbar } from "notistack";
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { setResidueSelection } from "../../store/generalStatesSlice";
import { MoorhenCidInputForm } from "../inputs/MoorhenCidInputForm";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"

export const MoorhenCreateSelectionMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
}) => {

    const dispatch = useDispatch()

    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)

    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null)
    const cidFormRef = useRef<null | HTMLInputElement>(null)
    
    const [cid, setCid] = useState<string>("")
    const [invalidCid, setInvalidCid] = useState<boolean>(false)

    const { enqueueSnackbar } = useSnackbar()

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
            enqueueSnackbar("Unable to parse CID", {variant: 'warning'})
            return
        }

        if (!newSelection) {
            setInvalidCid(true)
            enqueueSnackbar("Unable to parse CID", {variant: 'warning'})
            return
        }   

        setInvalidCid(false)
        await molecule.drawResidueSelection(selectedCid)
        dispatch( setResidueSelection(newSelection) )
        enqueueSnackbar("residue-selection", {variant: "residueSelection", persist: true})
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
