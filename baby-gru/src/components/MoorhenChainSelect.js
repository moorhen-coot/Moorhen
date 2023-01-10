import { forwardRef } from "react";
import { Form, FormSelect } from "react-bootstrap";

export const MoorhenChainSelect = forwardRef((props, selectRef) => {
    
    const handleChange = (newChain) => {
        if (props.onChange) {
            props.onChange(newChain)
        }
    }

    const getChainOptions = (selectedCoordMolNo) => {
        let selectedMolecule = props.molecules.find(molecule => molecule.molNo == selectedCoordMolNo)
        if (selectedMolecule) {
            return selectedMolecule.sequences.map(sequence => props.allowedTypes.includes(sequence.type.value) ? <option value={sequence.chain} key={`${selectedMolecule.molNo}_${sequence.chain}`}>{sequence.chain}</option> : null)
        }
        
    }

    return <Form.Group style={{ width: props.width, margin: '0.5rem', height:props.height }}>
        <Form.Label>{props.label}</Form.Label>
        <FormSelect size="sm" ref={selectRef} defaultValue={''} onChange={handleChange}>
            {props.selectedCoordMolNo !== null ? getChainOptions(props.selectedCoordMolNo) :  null}
        </FormSelect>
    </Form.Group>
})

// props.allowedTypes refers to gemmi::PolymerType member values -> https://project-gemmi.github.io/python-api/gemmi.html#PolymerType
MoorhenChainSelect.defaultProps = { allowedTypes:[1, 2, 3, 4, 5], height: '4rem', width: '20rem', molecule:null, label: "Chain" }