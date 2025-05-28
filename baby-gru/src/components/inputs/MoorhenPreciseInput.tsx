import { useEffect, useState, useRef } from "react";
import { Form } from "react-bootstrap";
import Stack from '@mui/material/Stack';
import './inputs.css'

/**
 * MoorhenPreciseInput component props
 *
 * @prop {number | null | undefined} value
 *   The current value of the input. Can be a number, null, or undefined.
 *
 * @prop {(newVal: string) => void} setValue
 *   Callback to update the value in the parent component. Receives the new value as a string.
 *
 * @prop {boolean} [waitReturn=false]
 *   If true, only updates value when the user presses Enter. Otherwise, updates on every valid change.
 *
 * @prop {boolean} [allowNegativeValues=true]
 *   If false, negative values are not allowed.
 *
 * @prop {number} [decimalDigits=2]
 *   Number of decimal digits to display and allow for input.
 *
 * @prop {string} [label]
 *   Optional label to display next to the input.
 *
 * @prop {boolean} [disabled=false]
 *   If true, disables the input.
 *
 * @prop {string | number} [width]
 *   Width of the input field (e.g., "4rem" or 100).
 *
 * @prop {[number, number]} [minMax]
 *   Minimum and maximum allowed values for the input.
 *
 * @prop {string} [type="text"]
 *   This is something of a misnomer, as it is always a number input, but it can be set to number to get the clicky arrows next to the input.
 *   this might be changed for a future version, with the same button as sliders and same step behaviour.  
 * 
 * @returns {JSX.Element}
 *   A React component that renders a precise input field with validation and optional label.
 */

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

    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (type !== "number") {
            return;
        }
        function handleClickOutside(event: MouseEvent) {
            if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
                setIsUserInteracting(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

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
                ref={inputRef}
                type={type}
                step={Math.pow(10, -decimalDigits)}
                disabled={disabled}
                value={internalValue}
                style={{ width: inputWidth, marginLeft: "0.2rem" }}
                className={`precise-input ${isValidInput ? "valid" : "invalid"} ${disabled ? "disabled" : ""}`}
                onChange={handleChange}
                onKeyDown={handleReturn}
                onBlur={handleBlur}               
            />
        </Stack>
    );
};
