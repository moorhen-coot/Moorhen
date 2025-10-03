import { useRef, useState } from 'react';
import '../../MoorhenStack.css';
import './MoorhenPreciseInput.css';

type MoorhenPreciseInputPropsType = {
    value: number | null;
    setValue: (newVal: string) => void;
    waitReturn?: boolean;
    allowNegativeValues?: boolean;
    decimalDigits?: number;
    label?: string;
    disabled?: boolean;
    width?: string | number;
    minMax?: [number, number];
    type?: string;
    labelPosition?: 'top' | 'left';
};

/**
 * MoorhenPreciseInput component props
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
export const MoorhenPreciseInput = (props: MoorhenPreciseInputPropsType) => {
    const {
        allowNegativeValues = true,
        decimalDigits = 2,
        label = '',
        disabled = false,
        width,
        waitReturn = false,
        minMax = null,
        type = 'standard',
    } = props;

    const [isUserInteracting, setIsUserInteracting] = useState<boolean>(false);
    const [internalValue, setInternalValue] = useState<string>(props.value?.toFixed(decimalDigits));
    const isValidRef = useRef<boolean>(true);

    let displayValue: string = '';
    if (!isUserInteracting) {
        displayValue = props.value?.toFixed(decimalDigits);
    } else {
        displayValue = internalValue;
    }

    const checkIsValidInput = (input: string) => {
        if (input === '') {
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
        setInternalValue(evt.target.value);
        const _isValid = checkIsValidInput(evt.target.value);
        if (_isValid && !waitReturn) {
            props.setValue?.(evt.target.value);
        }
    };

    const handleReturn = (evt: React.KeyboardEvent<HTMLInputElement>) => {
        if (evt.key === 'Enter') {
            evt.preventDefault();
            if (checkIsValidInput(internalValue)) {
                props.setValue?.(internalValue);
            }
            setIsUserInteracting(false);
        }
    };

    const handleBlur = () => {
        setIsUserInteracting(false);
    };

    const inputWidth = width ? width : `${2 + 0.6 * decimalDigits + (type === 'text' ? 0 : 1.1)}rem`;
    const formType = type === 'number' ? 'number' : type === 'numberForm' ? 'number' : 'text';

    return (
        <div className={`${props.labelPosition === 'top' ? 'moorhen__label__column' : 'moorhen__label__row'}`}>
            {label ? (
                <label className="moorhen__input__label" htmlFor="input">
                    {label}&nbsp;
                </label>
            ) : null}
            <input
                id="input"
                type={formType}
                step={Math.pow(10, -decimalDigits)}
                disabled={disabled}
                value={displayValue}
                style={{ width: inputWidth }}
                className={`moorhen__input ${'moorhen__input__precise'} 
                ${type === 'numberForm' ? 'moorhen__input__number' : 'moorhen__input__compact'} 
                ${isValidRef.current ? 'moorhen__input__valid' : 'moorhen__input__invalid'} 
                ${disabled ? 'moorhen__input__disabled' : ''}`}
                onChange={handleChange}
                onKeyDown={handleReturn}
                onBlur={handleBlur}
            />
        </div>
    );
};
