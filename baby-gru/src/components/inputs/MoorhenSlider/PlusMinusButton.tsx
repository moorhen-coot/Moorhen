import { useRef } from 'react';
import { MoorhenButton } from '..';
import { clampValue } from '../../misc/helpers';

type PlusMinusButtonProps = {
    step: number;
    setButtonIsDown?: (isDown: boolean) => void;
    externalValue: number;
    setExternalValue: (value: number) => void;
    minVal: number;
    maxVal: number;
    isDisabled?: boolean;
    logScale?: boolean;
};

export function PlusMinusButton(props: PlusMinusButtonProps) {
    const { step, minVal, maxVal, isDisabled, logScale = false } = props;
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const currentValueRef = useRef<number>(props.externalValue);
    currentValueRef.current = logScale ? Math.log10(props.externalValue) : props.externalValue;

    const buttonEffect = () => {
        const newValue = clampValue(
            logScale ? Math.pow(10, currentValueRef.current + step) : currentValueRef.current + step,
            minVal,
            maxVal
        );
        currentValueRef.current = newValue;
        props.setExternalValue(newValue);
    };

    const handleMouseDown = (): void => {
        buttonEffect();
        props.setButtonIsDown(true);

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
        props.setButtonIsDown(false);
    };

    return (
        <MoorhenButton
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            icon={step > 0 ? 'plus' : 'minus'}
            type="icon-only"
            size="small"
            disabled={isDisabled}
        />
    );
}
