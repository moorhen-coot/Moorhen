import { forwardRef } from "react";
import { Form } from "react-bootstrap";

export const MoorhenCidInputForm = forwardRef((props, cidFormRef) => {

    const handleChange = (evt) => {
        if (props.onChange) {
            props.onChange(evt.target.value)
        }
        cidFormRef.current.value = evt.target.value
    }

    return  <Form.Group style={{ width: props.width, margin: props.margin, height:props.height }}>
                <Form.Label>{props.label}</Form.Label>
                <Form.Control size="sm" type='text' placeholder={props.placeholder} defaultValue={props.defaultValue} style={{width: "100%"}} onChange={handleChange} ref={cidFormRef}/>
            </Form.Group>

})

MoorhenCidInputForm.defaultProps = { height: '4rem', width: '20rem', margin: '0.1rem', label: "Selection CID", placeholder: "", defaultValue: "", margin: '0.1rem'}
