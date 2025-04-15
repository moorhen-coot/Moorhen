import { useEffect, useState } from "react";
import { Form } from "react-bootstrap";
import Stack from '@mui/material/Stack';
import './inputs.css'


type MoorhenPreciseInputPropsType = {
    onEnter?: (newVal: string) => void;
    allowNegativeValues?: boolean;
    setValue: number;
    decimalDigits?: number;
    label?: string;
    disabled?: boolean;
    width?: string | number;
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

    return (
        <Stack 
            direction="row" 
            spacing={1}
            style= {{alignItems: "center"}}
            >
            {label}
            <Form.Control
                type="text"
                disabled={disabled}
                value={value}
                style = {{width: width? width : 2.5+ 0.6*decimalDigits +"rem"}}
                className={`precise-input ${isValidInput ? "valid" : "invalid"} ${disabled ? "disabled" : ""}`}
                onChange={handleChange}
                onKeyDown={handleReturn}
            />
        </Stack>
    );
};
