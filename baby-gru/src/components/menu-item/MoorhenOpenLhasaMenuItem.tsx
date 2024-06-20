import { useCallback, useRef, useState } from "react"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { MoorhenLigandSelect } from "../select/MoorhenLigandSelect"
import { useDispatch, useSelector } from "react-redux"
import { moorhen } from "../../types/moorhen"
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect"
import { modalKeys } from "../../utils/enums"
import { showModal } from "../../store/modalsSlice"
import { Form, InputGroup } from "react-bootstrap"
import { setLhasaInputLigandInfo } from "../../store/lhasaSlice"

export const MoorhenOpenLhasaMenuItem = (props) => {

    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)

    const [selectedCoordMolNo, setSelectedCoordMolNo] = useState<number>(molecules[0]?.molNo ?? null)
    const [loadLigandSwitch, setLoadLigandSwitch] = useState<boolean>(false)

    const loadLigandSwitchRef = useRef<HTMLInputElement | null>(null)
    const ligandSelectRef = useRef<HTMLSelectElement | null>(null)
    const moleculeSelectRef = useRef<HTMLSelectElement | null>(null)

    const dispatch = useDispatch()

    const handleMoleculeChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedCoordMolNo(parseInt(evt.target.value))
    }

    const panelContent = <>
        <MoorhenMoleculeSelect ref={moleculeSelectRef} molecules={molecules} onChange={handleMoleculeChange} disabled={!loadLigandSwitch}/>
        <MoorhenLigandSelect ref={ligandSelectRef} molecules={molecules} selectedCoordMolNo={selectedCoordMolNo} disabled={!loadLigandSwitch}/>
        <InputGroup>
            <Form.Check 
                ref={loadLigandSwitchRef}
                type="switch"
                label={'Load a ligand from Moorhen'}
                checked={loadLigandSwitch}
                onChange={ () => setLoadLigandSwitch( (prev) => !prev ) }/>
        </InputGroup>
    </>

    const onCompleted = useCallback(() => {
        if (loadLigandSwitchRef.current.checked) {
            const selectedMolecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value))
            if (selectedMolecule) {
                const selectedLigand = selectedMolecule.ligands.find(ligand => ligand.cid === ligandSelectRef.current.value)
                if (selectedLigand) {
                    console.log(">>>>> HI!!!")
                    dispatch( setLhasaInputLigandInfo({ ligandName: selectedLigand.resName, cid: selectedLigand.cid, moleculeMolNo: selectedMolecule.molNo }) )
                } else {
                    console.log(">>> HA...")
                    console.log(selectedMolecule.ligands)
                    console.log(ligandSelectRef.current.value)
                }
            }
        }
        dispatch(showModal(modalKeys.LHASA))
    }, [molecules])

    return  <MoorhenBaseMenuItem
        id='open-lhasa-menu-item'
        popoverContent={panelContent}
        menuItemText="Open ligand builder..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}/>
}