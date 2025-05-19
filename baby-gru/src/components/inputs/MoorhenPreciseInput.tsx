import { useEffect, useState } from "react";
import { Form } from "react-bootstrap";
import Stack from '@mui/material/Stack';
import './inputs.css'
import { number } from "prop-types";

type MoorhenPreciseInputPropsType = {
    value: number | null | undefined;
    setValue: (newVal: string) => void;
    waitReturn?: boolean;
    allowNegativeValues?: boolean;
    decimalDigits?: number;
    label?: string;
    disabled?: boolean;
    width?: string | number;
    minMax?: [number, number] 
    type?: string;
};

export const MoorhenPreciseInput = (props: MoorhenPreciseInputPropsType) => {

    const {
        allowNegativeValues = true,
        decimalDigits = 2,
        label = "",
        disabled = false,
        width,
        waitReturn = false,
        minMax = null,
        type = "text"
    } = props;

    const [isValidInput, setIsValidInput] = useState<boolean>(true);
    const [internalValue, setInternalValue] = useState<string>("");
    const [isUserInteracting, setIsUserInteracting] = useState<boolean>(false);

    useEffect(() => {
        if (!isUserInteracting) {
            if (props.value === undefined || props.value === null) {
                setInternalValue("");
                setIsValidInput(false);
            } else {
                setInternalValue(Number(props.value).toFixed(decimalDigits));
                setIsValidInput(true);
            }
        }
    }, [props.value, isUserInteracting]);

    const checkIsValidInput = (input: string) => {
        const value = parseFloat(input);
        if (isNaN(value)) {
            return false;
        } else if (!isFinite(value)) {
            return false;
        } else if (!allowNegativeValues && value < 0) {
            return false;
        } else if (minMax != null) {
            if (value < minMax[0] || value > minMax[1]) {
                return false
            }}   
        return true;
    };

    const handleChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
        setIsUserInteracting(true); // Mark user as interacting
        setInternalValue(evt.target.value);
        const _isValid = checkIsValidInput(evt.target.value);
        setIsValidInput(_isValid);
        if (_isValid && !waitReturn) {
            props.setValue?.(evt.target.value);
        }
    };

    const handleReturn = (evt: React.KeyboardEvent<HTMLInputElement>) => {
        if (evt.key === "Enter") {
            evt.preventDefault();
            if (isValidInput) {
                props.setValue?.(internalValue);
            }
            setIsUserInteracting(false); 
        }
    };

    const handleBlur = () => {
        setIsUserInteracting(false); 
    };

    const inputWidth = width ? width : `${2.5 + 0.6 * decimalDigits + (type === "text" ? 0 : 1.1)}rem`;

    return (
        <Stack 
            direction="row" 
            spacing={1}
            style={{ alignItems: "center" }}
        >
            {label && label}
            <Form.Control
                type={type}
                disabled={disabled}
                value={internalValue}
                style={{ width: inputWidth, marginLeft: "0.2rem" }}
                className={`precise-input ${isValidInput ? "valid" : "invalid"} ${disabled ? "disabled" : ""}`}
                onChange={handleChange}
                onKeyDown={handleReturn}
                onBlur={handleBlur} // Handle blur to reset interaction state
            />
        </Stack>
    );
};
