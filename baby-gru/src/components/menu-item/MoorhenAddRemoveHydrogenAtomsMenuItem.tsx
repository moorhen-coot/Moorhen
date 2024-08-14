import { useCallback, useRef } from "react";
import { Form, Button } from "react-bootstrap";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { useSelector } from 'react-redux';

export const MoorhenAddRemoveHydrogenAtomsMenuItem = (props: {
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
    popoverPlacement?: 'left' | 'right'
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
    
    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)

    const handleClick = useCallback(async (cootCommand: string) => {
        if (moleculeSelectRef.current !== null && moleculeSelectRef.current.value) {
            const selectedMolNo = parseInt(moleculeSelectRef.current.value)
            await props.commandCentre.current.cootCommand({
                message: 'coot_command',
                command: cootCommand,
                returnType: 'status',
                commandArgs: [selectedMolNo],
                changesMolecules: [selectedMolNo]
            }, true)
            const selectedMolecule = molecules.find(molecule => molecule.molNo === selectedMolNo)
            selectedMolecule.setAtomsDirty(true)
            selectedMolecule.redraw()
            document.body.click()
        }
        document.body.click()
    }, [moleculeSelectRef, molecules, props.commandCentre])

    const panelContent = <Form.Group>
        <MoorhenMoleculeSelect {...props} molecules={molecules} label="Molecule" allowAny={false} ref={moleculeSelectRef} />
        <Button className="mx-2" variant='primary' onClick={() => handleClick('add_hydrogen_atoms')}>
            Add
        </Button>
        <Button className="mx-2" variant='danger' onClick={() => handleClick('delete_hydrogen_atoms')}>
            Remove
        </Button>
    </Form.Group>


    return <MoorhenBaseMenuItem
        id='add-hydrogens-menu-item'
        popoverPlacement={props.popoverPlacement ?? "right"}
        popoverContent={panelContent}
        menuItemText="Add/Remove hydrogen atoms..."
        setPopoverIsShown={props.setPopoverIsShown}
        showOkButton={false}
    />

}
