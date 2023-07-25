import { forwardRef } from "react";
import { Form, FormSelect } from "react-bootstrap";
import { moorhen } from "../../types/moorhen";

type MoorhenChainSelectPropsType = {
    allowedTypes?: number[];
    height?: string;
    width?: string;
    margin?: string;
    label?: string;
    molecules: moorhen.Molecule[];
    selectedCoordMolNo: number;
    onChange?: (arg0: React.ChangeEvent<HTMLSelectElement>) => void;
}

export const MoorhenChainSelect = forwardRef<HTMLSelectElement, MoorhenChainSelectPropsType>((props, selectRef) => {
    
    const handleChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        if (props.onChange) {
            props.onChange(evt)
        }
        if(selectRef !== null && typeof selectRef !== 'function') selectRef.current.value = evt.target.value
    }

    const getChainOptions = (selectedCoordMolNo: number): JSX.Element[] => {
        let selectedMolecule = props.molecules.find(molecule => molecule.molNo === selectedCoordMolNo)
        if (selectedMolecule) {
            return selectedMolecule.sequences.map(sequence => props.allowedTypes.includes(sequence.type) ? <option value={sequence.chain} key={`${selectedMolecule.molNo}_${sequence.chain}`}>{sequence.chain}</option> : null)
        }
        
    }

    return <Form.Group style={{ width: props.width, margin: props.margin, height:props.height }}>
        <Form.Label>{props.label}</Form.Label>
        <FormSelect size="sm" ref={selectRef} defaultValue={''} onChange={handleChange}>
            {props.selectedCoordMolNo !== null ? getChainOptions(props.selectedCoordMolNo) :  null}
        </FormSelect>
    </Form.Group>
})

// props.allowedTypes refers to gemmi::PolymerType member values -> https://project-gemmi.github.io/python-api/gemmi.html#PolymerType
MoorhenChainSelect.defaultProps = { allowedTypes: [1, 2, 3, 4, 5], height: '4rem', width: '20rem', label: "Chain", margin: '0.5rem' }
