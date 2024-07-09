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
    const defaultProps = { 
        allowNegativeValues: false, label: 'Input', disabled: false, width: '', margin: '', padding: ''
    }

    const {
        allowNegativeValues, label, disabled, width, margin, padding
    } = { ...defaultProps, ...props }

    const [currentValue, setCurrentValue] = useState<string>(props.defaultValue.toString())
    const [isValidInput, setIsValidInput] = useState<boolean>(true)

    const checkIsValidInput = (input: string) => {
        if (isNaN(parseInt(input))) {
            return false
        } else if (parseInt(input) === Infinity) {
            return false
        } else if (!allowNegativeValues && parseInt(input) < 0) {
            return false
        } 
        return true
    }

    useEffect(() => {
        if (formRef !== null && typeof formRef !== 'function') {
            formRef.current = props.defaultValue.toString()
        }
    }, [])
    
    return  <Form.Group className='moorhen-form-group' controlId="MoorhenNumberForm" style={{padding: padding, margin: margin, width: width}}>
                <Form.Label style={{color: disabled ? 'grey' : ''}}>{label}</Form.Label>
                <Form.Control type="number" value={currentValue} disabled={disabled}
                style={{color: disabled ? 'grey' : '', borderColor: isValidInput ? '#ced4da' : 'red'}}
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
                        props.onChange?.(evt.target.value)
                    }
                }} />
            </Form.Group>
})
