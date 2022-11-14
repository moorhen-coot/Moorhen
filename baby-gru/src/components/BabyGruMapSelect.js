import { forwardRef } from "react";
import { Form, FormSelect } from "react-bootstrap";

export const BabyGruMapSelect = forwardRef((props, selectRef) => {

    const handleChange = (newChain) => {
        if (props.onChange) {
            props.onChange(newChain)
        }
    }

    return <Form.Group style={{ width: props.width, margin: '0.5rem' }}>
        <Form.Label>{props.label}</Form.Label>
        <FormSelect size="sm" ref={selectRef} defaultValue={-999999} onChange={handleChange}>
            {props.maps ? props.maps.map(map => <option key={map.mapMolNo} value={map.mapMolNo}>{map.mapName}</option>) : null}
        </FormSelect>
    </Form.Group>
})

BabyGruMapSelect.defaultProps = { width: '20rem', maps:null, label: "Map" }