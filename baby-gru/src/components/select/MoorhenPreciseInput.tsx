import React, { forwardRef, useEffect, useState } from "react";
import { Form } from "react-bootstrap";

type MoorhenPreciseInputPropsType = {
    onEnter?: (newVal: string) => void;
    allowNegativeValues?: boolean;
    setValue: number;
    decimalDigits?: number;
    label?: string;
    disabled?: boolean;
    width?: string;
    margin?: string;
    padding?: string;
};

export const MoorhenPreciseInput = (props: MoorhenPreciseInputPropsType) => {
    const defaultProps = {
        allowNegativeValues: false,
        decimalDigits: 2,
        label: "Input",
        disabled: false,
        width: "",
        margin: "",
        padding: "",
    };

    const {
        allowNegativeValues,
        decimalDigits,
        label,
        disabled,
        width,
        margin,
        padding,
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

    return (
        <Form.Group
            className="moorhen-form-group"
            controlId="MoorhenNumberForm"
            style={{
                padding: 0,
                margin: margin,
                width: width,
                display: "flex",
                alignItems: "center",
            }}
        >
            <Form.Label
                style={{ color: disabled ? "grey" : "", padding: 0, margin: 0 }}
            >
                {label}
            </Form.Label>
            <Form.Control
                type="text"
                defaultValue={currentValue}
                disabled={disabled}
                value={value}
                style={{
                    color: disabled ? "grey" : "",
                    borderColor: isValidInput ? "#ced4da" : "red",
                    borderBottom: "1px solid #ced4da",
                    height: 30,
                    width: 60,
                    padding: 5,
                    borderStyle: isValidInput ? "none" : "solid",                 
                }}
                onChange={(evt) => {
                    setValue(evt.target.value);
                    const _isValid = checkIsValidInput(evt.target.value);
                    setIsValidInput(_isValid);
                    if (!_isValid) {
                        console.log("Invalid input");
                    }
                }}
                onKeyDown={(evt) => {
                    if (evt.key === "Enter" && isValidInput) {
                        props.onEnter?.(value);
                    }
                }}
            />
        </Form.Group>
    );
};
