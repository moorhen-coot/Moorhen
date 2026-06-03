import { useEffect, useRef} from 'react';
import { MoorhenButton } from '..';
import { clampValue } from '../../misc/helpers';

type PlusMinusButtonProps = {
    step: number;
    setButtonIsDown?: (isDown: boolean) => void;
    value: number | null | undefined;
    setValue?: (value: number) => void;
    minVal?: number;
    maxVal?: number;
    isDisabled?: boolean;
    logScale?: boolean;
    allowedValues?: number[];
    type?: "arrow" | "round";
    style?: React.CSSProperties;
};

export function PlusMinusButton(props: PlusMinusButtonProps) {
    const { step, minVal, maxVal, isDisabled, logScale = false, allowedValues = null } = props;
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const valueRef = useRef<number>(props.value ?? 0);

    const clampIfBounded = (value: number): number => {
        if (minVal === undefined || maxVal === undefined) {
            return value;
        }
        return clampValue(value, minVal, maxVal);
    };

    const buttonEffect = () => {
        if (!props.setValue) {
            return;
        }

        let newValue: number;
        if (allowedValues ){
            const currentIndex = allowedValues.findIndex(val => val === valueRef.current);
            const nextIndex = currentIndex + step;
            newValue = allowedValues[nextIndex] ?? valueRef.current;
        } else {
            const steppedValue = logScale
                ? Math.pow(10, Math.log10(valueRef.current) + step)
                : valueRef.current + step;
            newValue = clampIfBounded(steppedValue);
        }

        valueRef.current = newValue;
        props.setValue(newValue);
    };


    const handleMouseDown = (): void => {
        valueRef.current = props.value ?? 0;
        buttonEffect();
        props.setButtonIsDown?.(true);

        timeoutRef.current = setTimeout(() => {
            intervalRef.current = setInterval(() => {
                buttonEffect();
            }, 100);
        }, 500);
    };

    const handleMouseUp = () => {
        clearInterval(intervalRef.current);
        clearTimeout(timeoutRef.current);
        intervalRef.current = null;
        props.setButtonIsDown?.(false);
    };

    useEffect(() => {
        return () => {
            clearInterval(intervalRef.current);
            clearTimeout(timeoutRef.current);
        };
    }, []);

    const icon = props.type === "arrow" ? (step > 0 ? 'MatSymChevronUp' : 'MatSymChevronDown') : (step > 0 ? 'plus' : 'minus');

    return (
        <MoorhenButton
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            icon={icon}
            type="icon-only"
            size="small"
            disabled={isDisabled}
            style={{ opacity: isDisabled ? 0.6 : 1, ...props.style }}
        />
    );
}
