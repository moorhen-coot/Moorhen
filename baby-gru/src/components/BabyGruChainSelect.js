import { forwardRef } from "react";
import { Form, FormSelect } from "react-bootstrap";

export const BabyGruChainSelect = forwardRef((props, selectRef) => {
    
    const handleChange = (newChain) => {
        if (props.onChange) {
            props.onChange(newChain)
        }
    }

    const getChainOptions = (selectedCoordMolNo) => {
        let selectedMolecule = props.molecules.find(molecule => molecule.coordMolNo == selectedCoordMolNo)
        if (selectedMolecule) {
            return selectedMolecule.cachedAtoms.sequences.map(sequence => <option value={sequence.chain} key={`${selectedMolecule.coordMolNo}_${sequence.chain}`}>{sequence.chain}</option>)
        }
        
    }

    return <Form.Group style={{ width: props.width, margin: '0.5rem' }}>
        <Form.Label>{props.label}</Form.Label>
        <FormSelect size="sm" ref={selectRef} defaultValue={''} onChange={handleChange}>
            {props.selectedCoordMolNo !== null ? getChainOptions(props.selectedCoordMolNo) :  null}
        </FormSelect>
    </Form.Group>
})

BabyGruChainSelect.defaultProps = { width: '20rem', molecule:null, label: "Chain" }