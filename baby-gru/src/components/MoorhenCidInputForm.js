import { forwardRef } from "react";
import { Form } from "react-bootstrap";

export const MoorhenCidInputForm = forwardRef((props, cidFormRef) => {

    const handleChange = (newChain) => {
        if (props.onChange) {
            props.onChange(newChain)
        }
    }

    return  <Form.Group style={{ width: props.width, margin: '0.1rem', height:props.height }}>
                <Form.Label>{props.label}</Form.Label>
                <Form.Control size="sm" type='text' placeholder={props.placeholder} defaultValue={props.defaultValue} style={{width: "100%"}} onChange={handleChange} ref={cidFormRef}/>
            </Form.Group>

})

MoorhenCidInputForm.defaultProps = { height: '4rem', width: '20rem', label: "Selection CID", placeholder: "", defaultValue: "" }
