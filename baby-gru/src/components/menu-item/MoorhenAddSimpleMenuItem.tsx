import { useRef, useCallback } from "react";
import { Form, FormSelect } from "react-bootstrap";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { useSelector } from 'react-redux';

export const MoorhenAddSimpleMenuItem = (props: {
    glRef: React.RefObject<webGL.MGWebGL>
    popoverPlacement?: 'left' | 'right'
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
}) => {

    const molTypeSelectRef = useRef<HTMLSelectElement | null>(null)
    const moleculeSelectRef = useRef<HTMLSelectElement | null>(null)

    const molecules = useSelector((state: moorhen.State) => state.molecules)

    const molTypes = ['HOH', 'SO4', 'PO4', 'GOL', 'CIT', 'EDO', 'IOD', 'NA', 'CA']

    const panelContent = <>
        <Form.Group className='moorhen-form-group' controlId="MoorhenAddSimpleMenuItem">
            <Form.Label>Add...</Form.Label>
            <FormSelect size="sm" ref={molTypeSelectRef} defaultValue={'HOH'}>
                {molTypes.map(type => {return <option value={type} key={type}>{type}</option>})}
            </FormSelect>
        </Form.Group>
        <MoorhenMoleculeSelect {...props} molecules={molecules} allowAny={false} ref={moleculeSelectRef} />
    </>


    const onCompleted = useCallback(async () => {
        const selectedMolecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value))
        if (selectedMolecule) {
            await selectedMolecule.addLigandOfType(molTypeSelectRef.current.value)
            const scoresUpdateEvent: moorhen.ScoresUpdateEvent = new CustomEvent("scoresUpdate", { detail: { origin: props.glRef.current.origin, modifiedMolecule: selectedMolecule.molNo } })
            document.dispatchEvent(scoresUpdateEvent)    
        }
    }, [props.glRef, molecules])

    return <MoorhenBaseMenuItem
        id='add-simple-menu-item'
        popoverContent={panelContent}
        menuItemText="Add simple..."
        onCompleted={onCompleted}
        popoverPlacement={props.popoverPlacement}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

MoorhenAddSimpleMenuItem.defaultProps = { popoverPlacement: "right" }

