import { useCallback, useRef, useState } from "react"
import { Button } from "react-bootstrap"
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { useSelector, useDispatch } from 'react-redux';
import { addMolecule } from "../../store/moleculesSlice";
import { MoorhenCidInputForm } from "../inputs/MoorhenCidInputForm";
import { clearResidueSelection } from "../../store/generalStatesSlice";

export const MoorhenCopyFragmentUsingCidMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
    monomerLibraryPath: string;
}) => {

    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null)
    const cidFormRef = useRef<null |HTMLInputElement>(null)
    
    const [cid, setCid] = useState<string>("")
    const [invalidCid, setInvalidCid] = useState<boolean>(false)
    
    const dispatch = useDispatch()
    const residueSelection = useSelector((state: moorhen.State) => state.generalStates.residueSelection)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)

    const createSelection = useCallback(async () => {
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
            const newMolecule = await molecule.copyFragmentUsingCid(selectedCid, true)
            dispatch( addMolecule(newMolecule) )
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
        <MoorhenCidInputForm margin={'0.5rem'} width="95%" label="Selection to copy" onChange={(evt) => setCid(evt.target.value)} ref={cidFormRef} invalidCid={invalidCid} allowUseCurrentSelection={true}/> 
        <Button variant="primary" onClick={createSelection}>
            OK
        </Button>
    </>

    return <MoorhenBaseMenuItem
        id='copy-fragment-menu-item'
        popoverPlacement='right'
        popoverContent={panelContent}
        menuItemText="Copy fragment..."
        showOkButton={false}
        onCompleted={() => {}}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}
