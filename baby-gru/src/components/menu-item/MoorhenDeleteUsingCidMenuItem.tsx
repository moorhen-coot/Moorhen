import { useCallback, useRef, useState } from "react"
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect"
import { Button } from "react-bootstrap"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { useDispatch, useSelector } from 'react-redux';
import { MoorhenCidInputForm } from "../inputs/MoorhenCidInputForm";
import { clearResidueSelection } from "../../store/generalStatesSlice";
import { triggerUpdate } from "../../store/moleculeMapUpdateSlice";
import { removeMolecule } from "../../store/moleculesSlice";

export const MoorhenDeleteUsingCidMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
}) => {

    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null)
    const cidFormRef = useRef<null |HTMLInputElement>(null)
    
    const [cid, setCid] = useState<string>("")
    const [invalidCid, setInvalidCid] = useState<boolean>(false)
    
    const dispatch = useDispatch()
    const residueSelection = useSelector((state: moorhen.State) => state.generalStates.residueSelection)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)

    const deleteSelection = useCallback(async () => {
        const selectedCid = cidFormRef.current.value
        if (!selectedCid || !moleculeSelectRef.current.value) {
            return
        }
        
        const molecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value))
        if (!molecule) {
            return
        }

        const isValidSelection = await molecule.isValidSelection(selectedCid)
        if (!isValidSelection) {
            setInvalidCid(true)
            return
        }

        try {
            setInvalidCid(false)
            const result = await molecule.deleteCid(selectedCid)
            if (result.second < 1) {
                console.log('Empty molecule detected, deleting it now...')
                molecule.delete()
                dispatch( removeMolecule(molecule) )
            } else {
                dispatch( triggerUpdate(molecule.molNo) )
            }
            props.setPopoverIsShown(false)
            document.body.click()
            if (selectedCid === residueSelection.cid) {
                dispatch( clearResidueSelection() )
            }
        } catch (err) {
            setInvalidCid(true)
            console.warn(err)
        }
    }, [residueSelection, molecules])

    const panelContent = <>
        <MoorhenMoleculeSelect molecules={molecules} label="From molecule" allowAny={false} ref={moleculeSelectRef} />
        <MoorhenCidInputForm margin={'0.5rem'} width="95%" label="Selection to delete" onChange={(evt) => setCid(evt.target.value)} ref={cidFormRef} invalidCid={invalidCid} allowUseCurrentSelection={true}/> 
        <Button variant="primary" onClick={deleteSelection}>
            OK
        </Button>
    </>

    return <MoorhenBaseMenuItem
        popoverPlacement='right'
        popoverContent={panelContent}
        menuItemText="Delete atom selection..."
        onCompleted={() => {}}
        showOkButton={false}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}
