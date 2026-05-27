import { useEffect, useRef} from 'react';
import { MoorhenButton } from '..';
import { clampValue } from '../../misc/helpers';
import { useStateWithRef } from '@/hooks/useStateWithRef';

type PlusMinusButtonProps = {
    step: number;
    setButtonIsDown?: (isDown: boolean) => void;
    value: number;
    setValue: (value: number) => void;
    minVal: number;
    maxVal: number;
    isDisabled?: boolean;
    logScale?: boolean;
};

export function PlusMinusButton(props: PlusMinusButtonProps) {
    const { step, minVal, maxVal, isDisabled, logScale = false } = props;
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const valueRef = useRef(props.value);
    useEffect(() => {
        valueRef.current = props.value;
    }, [props.value]);

    const buttonEffect = () => {
        const newValue = clampValue(
            logScale ? Math.pow(10, valueRef.current + step) : valueRef.current + step,
            minVal,
            maxVal
        );
        valueRef.current = newValue;
        props.setValue(newValue);
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
            style={isDisabled ? { opacity: 0.6 } : {}}
        />
    );
}
