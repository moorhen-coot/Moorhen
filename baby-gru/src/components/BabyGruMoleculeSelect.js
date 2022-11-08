import { forwardRef } from "react";
import { Form, FormSelect } from "react-bootstrap";

export const BabyGruMoleculeSelect = forwardRef((props, selectRef) => {
    return <Form.Group style={{ width: '20rem', margin: '0.5rem' }}>
        <Form.Label>Molecule</Form.Label>
        <FormSelect size="sm" ref={selectRef} defaultValue={-999999} onChange={(val) => {
            if (props.onChange) {
                props.onChange(val)
            }
        }}>
            {props.allowAny && <option value={-999999} key={-999999}>Any molecule</option>}
            {props.molecules
                .map(molecule => <option value={molecule.coordMolNo} key={molecule.coordMolNo}>{molecule.name}</option>
                )}
        </FormSelect>
    </Form.Group>
})
BabyGruMoleculeSelect.defaultProps = { allowAny: false }