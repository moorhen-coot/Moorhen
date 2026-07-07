import { useDispatch } from "react-redux";
import { useId, Dispatch, SetStateAction, useState } from "react";
import { setShortCutsBlocked } from "../../../store/globalUISlice";
import { MoorhenTooltip } from "../../interface-base/Popovers/Tooltip";
import { MoorhenStack } from "../../interface-base/Stack/Stack";
import { clampValue } from "../../misc/helpers";
import { PlusMinusButton } from "../MoorhenSlider/PlusMinusButton";
import "./NumberInput.css";

type MoorhenNumberInputProps = {
    value: number | null;
    setValue?: (newVal: number) => void | Dispatch<SetStateAction<number>>;
    onChange?: (arg0: React.ChangeEvent<HTMLInputElement>) => void;
    waitReturn?: boolean;
    allowNegativeValues?: boolean;
    decimalDigits?: number;
    label?: string;
    disabled?: boolean;
    width?: string | number;
    minMax?: [number, number];
    type?: "default" | "number" | "numberForm" | "withButtons";
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
    const inputId = useId();
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

    const commitInputValue = () => {
        let valueToCommit = internalValue;
        const numericValue = Number(internalValue);
        if (minMax != null && !isNaN(numericValue) && isFinite(numericValue)) {
            valueToCommit = clampValue(numericValue, ...minMax).toString();
            if (valueToCommit !== internalValue) {
                setInternalValue(valueToCommit);
            }
        }

        if (checkIsValidInput(valueToCommit)) {
            props.setValue?.(Number(valueToCommit));
        }

        setIsUserInteracting(false);
        dispatch(setShortCutsBlocked(false));
    };

    const handleChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
        setIsUserInteracting(true);
        dispatch(setShortCutsBlocked(true));
        const newValue = evt.target.value;
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
            commitInputValue();
        }
    };

    const handleFocus = () => {
        setIsUserInteracting(true);
        dispatch(setShortCutsBlocked(true));
        setInternalValue(props.value?.toFixed(decimalDigits) ?? "");
    };

    const inputWidth = width ? width : `${3 + 0.6 * decimalDigits}rem`;
    const showButtons = type === "number" || type === "numberForm";
    if (showButtons) {
        if (!props.setValue) {
            console.warn("MoorhenNumberInput: 'setValue' prop is required when using displaying buttons");
        }
    }
    const buttonStyle: React.CSSProperties = {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "1rem",
        border: "1px solid var(--moorhen-border)",
        borderRadius: "0.2rem",
    };

    const input = (
        <MoorhenStack
            direction="row"
            flex={0}
            align="center"
            style={{
                width: "fit-content",
            }}
        >
            <input
                id={inputId}
                ref={ref}
                step={Math.pow(10, -decimalDigits)}
                disabled={disabled}
                value={displayValue}
                style={{ width: inputWidth, marginRight: showButtons ? "0.1rem" : 0, ...style }}
                className={`moorhen__input ${"moorhen__input__precise"} 
                ${type === "numberForm" ? "moorhen__input__number" : "moorhen__input__compact"} 
                ${checkIsValidInput(displayValue) ? "moorhen__input__valid" : "moorhen__input__invalid"} 
                ${disabled ? "disabled" : ""} ${className}`}
                onChange={handleChange}
                onKeyDown={handleReturn}
                onBlur={commitInputValue}
                onFocus={handleFocus}
            />

            {showButtons && (
                <MoorhenStack direction="column" align="center" style={{ marginLeft: "0.1rem" }}>
                    <PlusMinusButton
                        step={Math.pow(10, -decimalDigits)}
                        value={props.value}
                        setValue={props.setValue}
                        type="arrow"
                        style={buttonStyle}
                        isDisabled={disabled}
                    />
                    <PlusMinusButton
                        step={-Math.pow(10, -decimalDigits)}
                        value={props.value}
                        setValue={props.setValue}
                        type="arrow"
                        style={buttonStyle}
                        isDisabled={disabled}
                    />
                </MoorhenStack>
            )}
        </MoorhenStack>
    );

    return (
        <MoorhenStack direction={labelPosition === "left" ? "line" : "column"} align="center" style={{ flex: 0, ...style }}>
            {label ? (
                <label className="moorhen__input__label" htmlFor={inputId}>
                    {label}&nbsp;
                </label>
            ) : null}
            {tooltip ? <MoorhenTooltip tooltip={tooltip}>{input}</MoorhenTooltip> : input}
        </MoorhenStack>
    );
};
