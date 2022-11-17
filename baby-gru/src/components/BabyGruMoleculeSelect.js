import { forwardRef } from "react";
import { Form, FormSelect } from "react-bootstrap";

export const BabyGruMoleculeSelect = forwardRef((props, selectRef) => {
    return <Form.Group style={{ width: props.width, margin: '0.5rem', height:props.height }}>
        <Form.Label>{props.label}</Form.Label>
        <FormSelect size="sm" ref={selectRef} defaultValue={-999999} onChange={(val) => {
            if (props.onChange) {
                props.onChange(val)
            }
        }}>
            {props.allowAny && <option value={-999999} key={-999999}>Any molecule</option>}
            {props.molecules
                .map(molecule => <option value={molecule.molNo} key={molecule.molNo}>{molecule.molNo}: {molecule.name}</option>
                )}
        </FormSelect>
    </Form.Group>
})

BabyGruMoleculeSelect.defaultProps = { height: '4rem', width: '20rem', allowAny: false, label: "Molecule" }