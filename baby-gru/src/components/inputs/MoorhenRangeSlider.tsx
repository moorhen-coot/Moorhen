import { useEffect, useState, useRef } from "react";
import { MoorhenPreciseInput } from "./MoorhenPreciseInput";
import { useSelector } from "react-redux";
import { moorhen } from "../../types/moorhen";
import { AddCircleOutline, RemoveCircleOutline } from "@mui/icons-material";
import { IconButton } from "@mui/material";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Slider from "@mui/material/Slider";
import { clampValue } from "../misc/helpers";
import './inputs.css';

type MoorhenSliderProps = {
    logScale?: boolean;
    minVal?: number;
    maxVal?: number;
    externalValue: [number ,number];
    setExternalValue?: (arg0: [number ,number]) => void;
    showSliderTitle?: boolean;
    sliderTitle?: string;
    decimalPlaces?: number;
    showMinMaxVal?: boolean;
    showButtons?: boolean;
    stepButtons?: number;
    isDisabled?: boolean;
    usePreciseInput?: boolean;
    piWidth?: string | number;
};

export const MoorhenRangeSlider = (props: MoorhenSliderProps) => {
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
        showSliderTitle: true,
        decimalPlaces: 0,
        decrementButton: null,
        allowExternalFeedback: true,
        usePreciseInput: false,
        showButtons: true,
    };

    const {
        minVal,
        maxVal,
        logScale,
        decimalPlaces,
        showSliderTitle,
        sliderTitle,
        showMinMaxVal,
        isDisabled,
        usePreciseInput,
        showButtons,
        stepButtons,
        piWidth,
    } = { ...defaultProps, ...props };

    const [value, setValue] = useState<[number ,number]>(props.externalValue); // internal value
    const [externalValue, setExternalValue] = useState<[number ,number]>(
        props.externalValue
    );

    const precision = Math.pow(10, - decimalPlaces);

    useEffect(() => {
        if (props.externalValue !== externalValue) {
            props.setExternalValue?.(externalValue);
        }
    }, [externalValue]);
    

    const handleChange = (event: Event, newValue: [number ,number]) => {
        setValue(newValue); // internal value is not changed for logscale

        if (logScale) {
            newValue = [Math.pow(10, newValue[0]), Math.pow(10, newValue[1])];
        }
        setExternalValue(newValue);
    };

    const drawTitle = () => {
        if (!showSliderTitle) {
            return <></>;
        }
        if (!usePreciseInput) {
            return (
                <span>
                    {sliderTitle}:{" "}
                    {props.externalValue.map(value => value.toFixed(decimalPlaces)).join(" - ")}
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
                        setValue={props.externalValue[0]}
                        onEnter={(newVal) => setExternalValue([+newVal, externalValue[1]])}
                        decimalDigits={decimalPlaces}
                        width={piWidth?  piWidth : 2.5+ 0.6*decimalPlaces +"rem"}
                        disabled={isDisabled}
                    />
                    <MoorhenPreciseInput
                        allowNegativeValues={minVal < 0}
                        label={sliderTitle + ":"}
                        setValue={props.externalValue[1]}
                        onEnter={(newVal) => setExternalValue([externalValue[0], +newVal,])}
                        decimalDigits={decimalPlaces}
                        width={piWidth?  piWidth : 2.5+ 0.6*decimalPlaces +"rem"}
                        disabled={isDisabled}
                    />
                </Box>
            );
    };

    const changeButton = (factor: number) => {
        if (!showButtons) {
            return <></>;
        
      }
/*        
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
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {factor > 0 ? <AddCircleOutline /> : <RemoveCircleOutline />}
            </IconButton>
        ); */
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
                <Stack direction="column" spacing={1}>
                    {changeButton( stepButtons ? -stepButtons :  -precision) }
                    {showMinMaxVal && minVal}
                </Stack>
                
                <Slider
                    disabled={isDisabled}
                    value={value}
                    onChange={handleChange}
                    min={logScale ? Math.log10(minVal) : minVal}
                    max={logScale ? Math.log10(maxVal) : maxVal}
                    step={precision}
                />

                <Stack direction="column" spacing={1}>
                {changeButton( stepButtons ? +stepButtons :  +precision) }
                {showMinMaxVal && maxVal}
                </Stack>
            </Stack>

        </Box>
    );
};
