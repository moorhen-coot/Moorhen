import { useSelector } from "react-redux";
import { Button } from "react-bootstrap";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSnackbar } from "notistack";
import { MoorhenLigandSelect } from "../select/MoorhenLigandSelect";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { moorhen } from "../../types/moorhen";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"

export const MoorhenMatchLigandsMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
}) => {

    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)

    const [selectedRefMolNo, setSelectedRefMolNo] = useState<number>(null)
    const [selectedMovingMolNo, setSelectedMovingMolNo] = useState<number>(null)
    
    const refMoleculeSelectRef = useRef<null | HTMLSelectElement>(null)
    const movingMoleculeSelectRef = useRef<null | HTMLSelectElement>(null)
    const refLigandSelectRef = useRef<null | HTMLSelectElement>(null)
    const movingLigandSelectRef = useRef<null | HTMLSelectElement>(null)

    const { enqueueSnackbar } = useSnackbar()

    useEffect(() => {
        if (molecules.length === 0) {
            setSelectedRefMolNo(null)
            setSelectedMovingMolNo(null)
            return
        }

        if (selectedRefMolNo === null || !molecules.map(molecule => molecule.molNo).includes(selectedRefMolNo)) {
            setSelectedRefMolNo(molecules[0].molNo)
        }

        if (selectedMovingMolNo === null || !molecules.map(molecule => molecule.molNo).includes(selectedMovingMolNo)) {
            setSelectedMovingMolNo(molecules[0].molNo)
        }

    }, [molecules])

    const matchLigands = useCallback(async () => {
        if (!refMoleculeSelectRef.current?.value || !movingMoleculeSelectRef.current?.value || !refLigandSelectRef.current?.value || !movingLigandSelectRef.current?.value) {
            return
        }

        const movingMolecule = molecules.find(molecule => molecule.molNo === parseInt(movingMoleculeSelectRef.current.value))
        const referenceMolecule = molecules.find(molecule => molecule.molNo === parseInt(refMoleculeSelectRef.current.value))

        if (!movingMolecule || !referenceMolecule || referenceMolecule.molNo === movingMolecule.molNo) {
            return
        }

        document.body.click()
        
        enqueueSnackbar("accept-reject-matching-ligand", {
            variant: "acceptRejectMatchingLigand",
            persist: true,
            movingLigandCid: movingLigandSelectRef.current.value,
            refLigandCid: refLigandSelectRef.current.value,
            movingMolNo: movingMolecule.molNo,
            refMolNo: referenceMolecule.molNo,
            commandCentre: props.commandCentre,
        })

    }, [molecules])

    const panelContent = <>
        <MoorhenMoleculeSelect label="Reference molecule" molecules={molecules} allowAny={false} ref={refMoleculeSelectRef} onChange={(evt) => setSelectedRefMolNo(parseInt(evt.target.value))}/>
        <MoorhenLigandSelect ref={refLigandSelectRef} label="Reference ligand" molecules={molecules} selectedCoordMolNo={selectedRefMolNo}/>
        <MoorhenMoleculeSelect label="Moving molecule" molecules={molecules} allowAny={false} ref={movingMoleculeSelectRef} onChange={(evt) => setSelectedMovingMolNo(parseInt(evt.target.value))}/>
        <MoorhenLigandSelect ref={movingLigandSelectRef} label="Moving ligand" molecules={molecules} selectedCoordMolNo={selectedMovingMolNo}/>
        <Button variant="primary" onClick={matchLigands}>
            OK
        </Button>
    </>

    return <MoorhenBaseMenuItem
            popoverContent={panelContent}
            menuItemText={"Match ligands..."}
            setPopoverIsShown={props.setPopoverIsShown}
            onCompleted={() => {}}
            showOkButton={false}/>
}