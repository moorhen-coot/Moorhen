import { useEffect, useRef} from 'react';
import { MoorhenButton } from '..';
import { clampValue } from '../../misc/helpers';

type PlusMinusButtonProps = {
    step: number;
    setButtonIsDown?: (isDown: boolean) => void;
    value: number;
    setValue: (value: number) => void;
    minVal: number;
    maxVal: number;
    isDisabled?: boolean;
    logScale?: boolean;
    allowedValues?: number[];
};

export function PlusMinusButton(props: PlusMinusButtonProps) {
    const { step, minVal, maxVal, isDisabled, logScale = false, allowedValues = null } = props;
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const valueRef = useRef(props.value);

    const buttonEffect = () => {
        let newValue: number;
        if (allowedValues ){
            const currentIndex = allowedValues.findIndex(val => val === valueRef.current);
            newValue = allowedValues[currentIndex +step]
            console.log("current index", currentIndex, "new value", newValue)
        } else {
        newValue = clampValue(
            logScale ? Math.pow(10, Math.log10(valueRef.current) + step) : valueRef.current + step,
            minVal,
            maxVal
        );}
        valueRef.current = newValue;
        props.setValue(newValue);
    };


    const handleMouseDown = (): void => {
        valueRef.current = props.value;
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

    useEffect(() => {
        return () => {
            clearInterval(intervalRef.current);
            clearTimeout(timeoutRef.current);
        };
    }, []);

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
