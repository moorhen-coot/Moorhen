import { useRef } from "react";
import { useSelector } from "react-redux";
import { moorhen } from "../../../types/moorhen";
import { AddCircleOutline, RemoveCircleOutline } from "@mui/icons-material";
import { IconButton } from "@mui/material";
import { clampValue } from "../../misc/helpers";

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
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);
    const { step, minVal, maxVal, isDisabled, logScale = false } = props;
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const currentValueRef = useRef<number>(props.externalValue);
    currentValueRef.current = logScale ? Math.log10(props.externalValue) : props.externalValue;

    const buttonEffect = () => {
        const newValue = clampValue(logScale ? Math.pow(10, currentValueRef.current + step) : currentValueRef.current + step, minVal, maxVal);
        currentValueRef.current = newValue;
        props.setExternalValue(newValue);
    };

    const handleMouseDown = (): void => {
        buttonEffect();
        props.setButtonIsDown(true);

        intervalRef.current = setInterval(() => {
            buttonEffect();
        }, 100);
    };

    const handleMouseUp = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        props.setButtonIsDown(false);
    };

    return (
        <IconButton
            sx={{ padding: 0, color: isDark ? "white" : "black" }}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            disabled={isDisabled}
        >
            {step > 0 ? <AddCircleOutline /> : <RemoveCircleOutline />}
        </IconButton>
    );
}
