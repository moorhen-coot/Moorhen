import { useEffect, useState } from "react";
import { Form } from "react-bootstrap";
import Stack from '@mui/material/Stack';


type MoorhenPreciseInputPropsType = {
    onEnter?: (newVal: string) => void;
    allowNegativeValues?: boolean;
    setValue: number;
    decimalDigits?: number;
    label?: string;
    disabled?: boolean;
    width?: number;
};

export const MoorhenPreciseInput = (props: MoorhenPreciseInputPropsType) => {
    const defaultProps = {
        allowNegativeValues: false,
        decimalDigits: 2,
        label: "Input",
        disabled: false,
        width: 60,
    };

    const {
        allowNegativeValues,
        decimalDigits,
        label,
        disabled,
        width,
    } = {
        ...defaultProps,
        ...props,
    };

    const [value, setValue] = useState<string>(
        props.setValue.toFixed(decimalDigits)
    );

    useEffect(() => {
        setValue(props.setValue.toFixed(decimalDigits));
    }, [props.setValue]);

    const [isValidInput, setIsValidInput] = useState<boolean>(true);

    const checkIsValidInput = (input: string) => {
        if (isNaN(+input)) {
            return false;
        } else if (parseInt(input) === Infinity) {
            return false;
        } else if (!allowNegativeValues && parseInt(input) < 0) {
            return false;
        }
        return true;
    };

    const handleChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
        setValue(evt.target.value);
        const _isValid = checkIsValidInput(evt.target.value);
        setIsValidInput(_isValid);

    }

    const handleReturn = (evt: React.KeyboardEvent<HTMLInputElement>) => {
        if (evt.key === "Enter" && isValidInput) {
            props.onEnter?.(value);
        }
    }

    const normalBorder  = {                    
        borderColor:  "red",
        borderStyle:  "solid", 
        borderBottom: "1px solid red",}
    
    const errorBorder =  {                    
        borderColor:  "red",
        borderStyle:  "solid", 
        borderBottom:  "1px solid red",}

    return (
        <Stack 
            direction="row" 
            spacing={1}
            style= {{alignItems: "center"}}
            >
            <Form.Label
            >
                {label}
            </Form.Label>
            <Form.Control
                type="text"
                disabled={disabled}
                value={value}
                className={`
                    ${isValidInput ? 'moorhen-input-valid' : 'moorhen-input-invalid'}`}
                style = {{width: width}}
                onChange={handleChange}
                onKeyDown={handleReturn}
            />
        </Stack>
    );
};
