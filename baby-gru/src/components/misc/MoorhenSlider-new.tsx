import { useEffect, useState, useRef } from "react";
import { MoorhenPreciseInput } from "../select/MoorhenPreciseInput";
import { AddCircleOutline, RemoveCircleOutline } from "@mui/icons-material";
import { IconButton } from "@mui/material";
import { useSelector } from "react-redux";
import { moorhen } from "../../types/moorhen";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Slider from "@mui/material/Slider";
import { clampValue } from "./helpers";

type MoorhenSliderProps = {
    logScale?: boolean;
    minVal?: number;
    maxVal?: number;
    initialValue: number;
    externalValue: number;
    setExternalValue?: (arg0: number) => void;
    allowExternalFeedback?: boolean;
    allowFloats?: boolean;
    showSliderTitle?: boolean;
    sliderTitle?: string;
    decimalPlaces?: number;
    showMinMaxVal?: boolean;
    showButtons?: boolean;
    factorButtons?: number;
    isDisabled?: boolean;
    usePreciseInput?: boolean;
    piParameters?: { decimalDigits: number; width: number };
};

export const MoorhenSlider = (props: MoorhenSliderProps) => {
    const isDark = useSelector(
        (state: moorhen.State) => state.sceneSettings.isDark
    );

    const defaultProps = {
        minVal: 0,
        maxVal: 100,
        logScale: false,
        showMinMaxVal: true,
        incrementButton: null,
        isDisabled: false,
        allowFloats: true,
        showSliderTitle: true,
        decimalPlaces: 3,
        decrementButton: null,
        allowExternalFeedback: true,
        usePreciseInput: false,
        showButtons: true,
        factorButtons: 1,
        piParameters: { decimalDigits: 2, width: 60 },
    };

    const {
        logScale,
        minVal,
        maxVal,
        initialValue,
        allowExternalFeedback,
        allowFloats,
        showSliderTitle,
        sliderTitle,
        decimalPlaces,
        showMinMaxVal,
        isDisabled,
        usePreciseInput,
        showButtons,
        factorButtons,
        piParameters,
    } = { ...defaultProps, ...props };

    const convertValueToScale = (
        logScale: boolean,
        minVal: number,
        maxVal: number,
        value: number
    ) => {
        if (logScale) {
            return (
                100 *
                ((Math.log10(value) - Math.log10(minVal)) /
                    (Math.log10(maxVal) - Math.log10(minVal)))
            );
        } else {
            return (100 * (value - minVal)) / (maxVal - minVal);
        }
    };

    const initValue = convertValueToScale(
        logScale,
        minVal,
        maxVal,
        initialValue
    );
    const [value, setValue] = useState<number>(initValue);
    const [externalValue, setExternalValue] = useState<number>(
        props.externalValue
    );

    useEffect(() => {
        if (props.externalValue !== externalValue) {
            props.setExternalValue?.(externalValue);
        }
    }, [externalValue]);

    /**
     * This hook is necessary if we want the slider position to update when the value changes due to external
     * components. However this can slow down things so better not to use it unless this is expected.
     */
    useEffect(() => {
        if (allowExternalFeedback) {
            setValue(
                convertValueToScale(logScale, minVal, maxVal, externalValue)
            );
        }
    }, [props.externalValue]);

    const handleChange = (event: Event, newValue: number) => {
        console.log("something");

        setValue(allowFloats ? newValue : Math.round(newValue));

        let newVal: number;
        if (logScale) {
            const log10MaxVal = Math.log10(maxVal);
            const log10MinVal = Math.log10(Math.max(minVal, 0.00000001));
            const log10NewVal =
                log10MinVal + (newValue / 100) * (log10MaxVal - log10MinVal);
            newVal = Math.pow(10, log10NewVal);
            if (!allowFloats) {
                newVal = Math.round(newVal);
            }
        } else if (allowFloats) {
            newVal = minVal + (newValue / 100) * (maxVal - minVal);
        } else {
            newVal = Math.round(minVal + (newValue / 100) * (maxVal - minVal));
        }
        setExternalValue(newVal);
    };

    const drawTitle = () => {
        if (!showSliderTitle) {
            return;
        }
        if (!usePreciseInput) {
            return (
                <span>
                    {sliderTitle}:{" "}
                    {allowFloats
                        ? props.externalValue.toFixed(decimalPlaces)
                        : props.externalValue}
                </span>
            );
        } else
            return (
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "center", // Center horizontally
                        alignItems: "center", // Center vertically
                        width: "100%", // Ensure it spans the full width of the container
                    }}
                >
                    <MoorhenPreciseInput
                        allowNegativeValues={minVal < 0}
                        label={sliderTitle + ":"}
                        setValue={props.externalValue}
                        onEnter={(newVal) => setExternalValue(+newVal)}
                        decimalDigits={piParameters.decimalDigits}
                        width={piParameters.width}
                    />
                </Box>
            );
    };

    const changeButton = (factor: number) => {
        if (!showButtons) {
            return;
        }
        const intervalRef = useRef(null);

        const handleMouseDown = () => {
            setExternalValue((current) =>
                clampValue(current + factor, minVal, maxVal)
            );

            intervalRef.current = setInterval(() => {
                setExternalValue((current) =>
                    clampValue(current + factor, minVal, maxVal)
                );
            }, 100);
        };

        const handleMouseUp = () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };

        return (
            <IconButton
                style={{ padding: 0, color: isDark ? "white" : "black" }}
                onClick={() => setExternalValue((current) => current + factor)}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {factor > 0 ? <AddCircleOutline /> : <RemoveCircleOutline />}
            </IconButton>
        );
    };

    return (
        <Box
            sx={{
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
            }}
        >
            {drawTitle()}
            <Stack
                spacing={2}
                direction="row"
                sx={{ mb: 1 }}
                alignItems="center"
            >
                {showMinMaxVal && minVal}
                {changeButton(-factorButtons)}
                <Slider
                    disabled={isDisabled}
                    value={value}
                    onChange={handleChange}
                />
                {changeButton(+factorButtons)}
                {showMinMaxVal && maxVal}
            </Stack>
        </Box>
    );
};
