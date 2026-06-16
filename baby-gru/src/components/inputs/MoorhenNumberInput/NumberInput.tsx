import { useDispatch } from "react-redux";
import { useRef, useState } from "react";
import { setShortCutsBlocked } from "../../../store/globalUISlice";
import { MoorhenTooltip } from "../../interface-base/Popovers/Tooltip";
import { MoorhenStack } from "../../interface-base/Stack/Stack";
import { clampValue } from "../../misc/helpers";
import "./NumberInput.css";


type MoorhenNumberInputProps = {
    value: number | null;
    setValue?: (newVal: number) => void;
    onChange?: (arg0: React.ChangeEvent<HTMLInputElement>) => void;
    waitReturn?: boolean;
    allowNegativeValues?: boolean;
    decimalDigits?: number;
    label?: string;
    disabled?: boolean;
    width?: string | number;
    minMax?: [number, number];
    type?: string;
    labelPosition?: "top" | "left";
    style?: React.CSSProperties;
    ref?: React.Ref<HTMLInputElement>;
    integer?: boolean;
    tooltip?: string;
    className?: string;
};

/**
 * MoorhenNumberInput component props
 *
 * @prop {number | null | undefined} value
 *   The current value of the input. Can be a number, null, or undefined.
 *
 * @prop {function} setValue
 *   Callback to update the value in the parent component. Receives the new value as a string. Returns void.
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
 * @prop {number[]} [minMax]
 *   Minimum and maximum [number,number] allowed values for the input.
 *
 * @prop {string} [type="standard" | "number" | "numberForm"]
 *   This is something of a misnomer, as it is always a number input, but it can be set to number to get the clicky arrows next to the input.
 *   this might be changed for a future version, with the same button as sliders and same step behaviour.
 *
 * @returns {JSX.Element}
 *   A React component that renders a precise input field with validation and optional label.
 */
export const MoorhenNumberInput = (props: MoorhenNumberInputProps) => {
    const {
        allowNegativeValues = true,
        integer = false,
        label = "",
        disabled = false,
        width,
        waitReturn = false,
        minMax = null,
        type = "standard",
        labelPosition = "left",
        style,
        ref = null,
        tooltip = null,
        className = "",
    } = props;

    const decimalDigits = integer ? 0 : (props.decimalDigits ?? 2);
    const [isUserInteracting, setIsUserInteracting] = useState<boolean>(false);
    const [internalValue, setInternalValue] = useState<string>(props.value?.toFixed(decimalDigits));
    const isValidRef = useRef<boolean>(true);
    const dispatch = useDispatch();

    let displayValue: string = "";
    if (!isUserInteracting) {
        displayValue = props.value?.toFixed(decimalDigits);
    } else {
        displayValue = internalValue;
    }

    const checkIsValidInput = (input: string) => {
        if (input === "") {
            return false;
        }
        const value = Number(input);
        if (isNaN(value)) {
            return false;
        } else if (!isFinite(value)) {
            return false;
        } else if (!allowNegativeValues && value < 0) {
            return false;
        } else if (minMax != null) {
            if (value < minMax[0] || value > minMax[1]) {
                return false;
            }
        }
        return true;
    };

    isValidRef.current = checkIsValidInput(displayValue);

    const handleChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
        setIsUserInteracting(true);
        dispatch(setShortCutsBlocked(true));
        let newValue = evt.target.value;
        if (minMax) {
            newValue = clampValue(Number(evt.target.value), ...minMax).toString();
        }
        setInternalValue(newValue);
        const _isValid = checkIsValidInput(newValue);
        if (_isValid && !waitReturn) {
            props.setValue?.(Number(newValue));
        }
        if (props.onChange) props.onChange(evt);
    };

    const handleReturn = (evt: React.KeyboardEvent<HTMLInputElement>) => {
        if (evt.key === "Enter") {
            evt.preventDefault();
            if (checkIsValidInput(internalValue)) {
                props.setValue?.(Number(internalValue));
            }
            setIsUserInteracting(false);
            dispatch(setShortCutsBlocked(false));
        }
    };

    const handleBlur = () => {
        setIsUserInteracting(false);
        dispatch(setShortCutsBlocked(false));
    };

    const inputWidth = width ? width : `${2 + 0.6 * decimalDigits + (type === "text" ? 0 : 1.1)}rem`;
    const formType = type === "number" ? "number" : type === "numberForm" ? "number" : "text";

    const input = (
        <input
            id="input"
            ref={ref}
            type={formType}
            step={Math.pow(10, -decimalDigits)}
            disabled={disabled}
            value={displayValue}
            style={{ width: inputWidth }}
            className={`moorhen__input ${"moorhen__input__precise"} 
                ${type === "numberForm" ? "moorhen__input__number" : "moorhen__input__compact"} 
                ${isValidRef.current ? "moorhen__input__valid" : "moorhen__input__invalid"} 
                ${disabled ? "disabled" : ""} ${className}`}
            onChange={handleChange}
            onKeyDown={handleReturn}
            onBlur={handleBlur}
            onFocus={() => dispatch(setShortCutsBlocked(true))}
        />
    );

    return (
        <MoorhenStack direction={labelPosition === "left" ? "line" : "column"} align="center" style={{ flex: 0, ...style }}>
            {label ? (
                <label className="moorhen__input__label" htmlFor="input">
                    {label}&nbsp;
                </label>
            ) : null}
            {tooltip ? <MoorhenTooltip tooltip={tooltip}>{input}</MoorhenTooltip> : input}
        </MoorhenStack>
    );
};