import { forwardRef } from "react";
import { Form, FormSelect } from "react-bootstrap";
import { MoorhenMoleculeInterface } from "../../utils/MoorhenMolecule";

type MoorhenMoleculeSelectPropsType = {
    height: string;
    width: string;
    allowAny: boolean;
    label: string;
    molecules: MoorhenMoleculeInterface[];
    onChange?: (arg0: React.ChangeEvent<HTMLSelectElement>) => void;
}

export const MoorhenMoleculeSelect = forwardRef<HTMLSelectElement, MoorhenMoleculeSelectPropsType>((props, selectRef) => {
    return <Form.Group style={{ width: props.width, margin: '0.5rem', height:props.height }}>
        <Form.Label>{props.label}</Form.Label>
        <FormSelect size="sm" ref={selectRef} defaultValue={-999999} onChange={(evt) => {
            if (props.onChange) {
                props.onChange(evt)
            }
            if (selectRef !== null && typeof selectRef !== 'function') {
                selectRef.current.value = evt.target.value
            }
        }}>
            {props.allowAny && <option value={-999999} key={-999999}>Any molecule</option>}
            {props.molecules.map(molecule => 
                <option value={molecule.molNo} key={molecule.molNo}>{molecule.molNo}: {molecule.name}</option>
            )}
        </FormSelect>
    </Form.Group>
})

MoorhenMoleculeSelect.defaultProps = { height: '4rem', width: '20rem', allowAny: false, label: "Molecule" }