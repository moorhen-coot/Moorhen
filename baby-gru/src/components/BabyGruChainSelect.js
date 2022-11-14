import { forwardRef } from "react";
import { Form, FormSelect } from "react-bootstrap";

export const BabyGruChainSelect = forwardRef((props, selectRef) => {
    
    const handleChange = (newChain) => {
        if (props.onChange) {
            props.onChange(newChain)
        }
    }

    return <Form.Group style={{ width: '20rem', margin: '0.5rem' }}>
        <Form.Label>{props.label}</Form.Label>
        <FormSelect size="sm" ref={selectRef} defaultValue={''} onChange={handleChange}>
            { props.molecule ? props.molecule.sequnces.map(sequence => <option value={sequence.chain} key={`${props.molecule.coordMolNo}_${sequence.chain}`}>{sequence.chain}</option>) :  null}
        </FormSelect>
    </Form.Group>
})

BabyGruChainSelect.defaultProps = { molecule:null, label: "Chain" }