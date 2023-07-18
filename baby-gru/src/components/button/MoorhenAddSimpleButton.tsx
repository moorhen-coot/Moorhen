import React, { useCallback, useRef } from "react"
import { moorhen } from "../../types/moorhen";
import { MoorhenEditButtonBase } from "./MoorhenEditButtonBase";
import { Button, Container, Form, FormSelect } from "react-bootstrap";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";

export const MoorhenAddSimpleButton = (props: moorhen.EditButtonProps) => {
    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null)
    const molTypeSelectRef = useRef<null | HTMLSelectElement>(null)
    const molTypes = ['HOH', 'SO4', 'PO4', 'GOL', 'CIT', 'EDO', 'IOD', 'NA', 'CA']

    const onTypeSelectedCallback = useCallback(async () => {
        if (molTypeSelectRef.current?.value && moleculeSelectRef.current?.value) {
            const selectedMolecule = props.molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value))
            await selectedMolecule.addLigandOfType(molTypeSelectRef.current.value)
            props.setSelectedButtonIndex(null)
            const scoresUpdateEvent: moorhen.ScoresUpdateEvent = new CustomEvent("scoresUpdate", { detail: { origin: props.glRef.current.origin, modifiedMolecule: selectedMolecule.molNo } })
            document.dispatchEvent(scoresUpdateEvent)
        }
    }, [props.molecules, props.glRef])
    
    const MoorhenAddSimplePanel = (props: {
        molecules: moorhen.Molecule[]; 
        moleculeSelectRef: React.RefObject<HTMLSelectElement>;
        onTypeSelectedCallback: (arg0: string) => Promise<void>;
    }) => {
        return <Container>
            <Form.Group>
                <Form.Label>Add...</Form.Label>
                <FormSelect size="sm" ref={molTypeSelectRef} defaultValue={'HOH'} style={{width: '100%', margin: '0.5rem'}}>
                    {molTypes.map(type => {return <option value={type} key={type}>{type}</option>})}
                </FormSelect>
            </Form.Group>
            <MoorhenMoleculeSelect {...props} allowAny={false} ref={props.moleculeSelectRef} width="100%" />
            <Button onClick={onTypeSelectedCallback}>
                OK
            </Button>
        </Container>
    }   
        
    return <MoorhenEditButtonBase
                toolTipLabel="Add simple"
                setToolTip={props.setToolTip}
                buttonIndex={props.buttonIndex}
                selectedButtonIndex={props.selectedButtonIndex}
                setSelectedButtonIndex={props.setSelectedButtonIndex}
                needsMapData={false}
                prompt={<MoorhenAddSimplePanel
                    {...props}
                    onTypeSelectedCallback={onTypeSelectedCallback}
                    moleculeSelectRef={moleculeSelectRef}
                />}
                icon={<img style={{ width: '100%', height: '100%' }} className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/atom-at-pointer.svg`} alt='add...' />}
                {...props}
            />
    
}
