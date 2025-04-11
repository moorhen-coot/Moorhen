import { useEffect, useState } from "react";
import { Form, Stack } from "react-bootstrap";

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

    const [currentValue, setCurrentValue] = useState<string>(
        props.setValue.toFixed(decimalDigits)
    );
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
        if (!_isValid) {
            console.log("Invalid input");
        }
    }

    const handleReturn = (evt: React.KeyboardEvent<HTMLInputElement>) => {
        if (evt.key === "Enter" && isValidInput) {
            props.onEnter?.(value);
        }
    }

    return (
        <Stack 
            direction="horizontal" 
            gap={1} 
            >
            <Form.Label
                style={{
                    color: disabled ? "grey" : "",
                    padding: 0, 
                    margin: 0,  
                    display: "inline", 
                }}
            >
                {label}
            </Form.Label>
            <Form.Control
                type="text"
                disabled={disabled}
                value={value}
                style={{
                    color: disabled ? "grey" : "",
                    borderColor: isValidInput ? "#ced4da" : "red",
                    borderStyle: isValidInput ? "none" : "solid", 
                    borderBottom: isValidInput ?"2px solid #ced4da" : "1px solid red",
                    height: 30,
                    width:  width,
                    padding: 2,
                    margin: 0,                
                }}
                onChange={handleChange}
                onKeyDown={handleReturn}
            />
        </Stack>
    );
};
