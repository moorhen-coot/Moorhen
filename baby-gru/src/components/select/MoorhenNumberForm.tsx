import { forwardRef, useEffect, useState } from "react";
import { Form } from "react-bootstrap";

type MoorhenNumberFormPropsType = {
    onChange?: (newVal: string) => void;
    allowNegativeValues?: boolean;
    defaultValue: number;
    label?: string;
    disabled?: boolean;
    width?: string;
    margin?: string;
    padding?: string;
}

export const MoorhenNumberForm = forwardRef<string, MoorhenNumberFormPropsType>((props, formRef) => {
    const [currentValue, setCurrentValue] = useState<string>(props.defaultValue.toString())
    const [isValidInput, setIsValidInput] = useState<boolean>(true)

    const checkIsValidInput = (input: string) => {
        if (isNaN(parseInt(input))) {
            return false
        } else if (parseInt(input) === Infinity) {
            return false
        } else if (!props.allowNegativeValues && parseInt(input) < 0) {
            return false
        } 
        return true
    }

    useEffect(() => {
        if (formRef !== null && typeof formRef !== 'function') {
            formRef.current = props.defaultValue.toString()
        }
    }, [])
    
    return  <Form.Group className='moorhen-form-group' controlId="MoorhenNumberForm" style={{padding: props.padding, margin: props.margin, width: props.width}}>
                <Form.Label style={{color: props.disabled ? 'grey' : ''}}>{props.label}</Form.Label>
                <Form.Control type="number" value={currentValue} disabled={props.disabled}
                style={{color: props.disabled ? 'grey' : '', borderColor: isValidInput ? '#ced4da' : 'red'}}
                onChange={(evt) => {
                    if (formRef !== null && typeof formRef !== 'function') {
                        const _isValid = checkIsValidInput(evt.target.value)
                        if (_isValid) {
                            formRef.current = evt.target.value
                        } else {
                            formRef.current = ""
                        }
                        setCurrentValue(evt.target.value)
                        setIsValidInput(_isValid)
                        props.onChange(evt.target.value)
                    }
                }} />
            </Form.Group>
})

MoorhenNumberForm.defaultProps = { 
    allowNegativeValues: false, label: 'Input', onChange: () => {}, disabled: false, width: '', margin: '', padding: ''
 }
