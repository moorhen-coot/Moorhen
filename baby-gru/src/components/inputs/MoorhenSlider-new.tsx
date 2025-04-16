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


type MoorhenSliderProps<T extends number | [number, number]> = {
    logScale?: boolean;
    minVal?: number;
    maxVal?: number;
    externalValue: T;
    setExternalValue?: (arg0:  T) => void; 
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

export const MoorhenSlider = <T extends number | [number, number]>(props: MoorhenSliderProps<T>) => {
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
        piWidth,
    } = { ...defaultProps, ...props };

    const precision = Math.pow(10, - decimalPlaces);
    const stepButtons = props.stepButtons ? props.stepButtons : precision

    const log10ofT = (val: T) => { // log 10 for value of type T
        if (Array.isArray(val)) {
            return [Math.log10(val[0]), Math.log10(val[1])] as T;
        } else {
            return Math.log10(val) as T;
        }
    }

    const pow10ofT = (val: T) => { // pow 10 for value of type T
        if (Array.isArray(val)) {
            return [Math.pow(10, val[0]), Math.pow(10, val[1])] as T;
        } else {
            return Math.pow(10, val) as T;
        }
    }

    const [value, setValue] = useState<T>(logScale ? log10ofT(props.externalValue) : props.externalValue); // internal value
    const [externalValue, setExternalValue] = useState<T>(props.externalValue); 
    const isRange = Array.isArray(props.externalValue); 

    useEffect(function propagateValueToParent(){
        if (props.externalValue !== externalValue) {
            if (Array.isArray(props.externalValue)) {
                props.setExternalValue?.(externalValue as T);
            }
            else {
                props.setExternalValue?.(externalValue as T);
            }
        }
    }, [externalValue]);

    useEffect(function propagateValueToSlider(){
        if (logScale) {
            setValue(log10ofT(props.externalValue));
        } else {
            setValue(props.externalValue);
        }
    }, [props.externalValue]);

    const handleChange = (event: Event, newValue: T) => {
        setValue(newValue); // internal value is not changed by logscale = it is the positon on the slider
        setExternalValue(logScale ? pow10ofT(newValue) : newValue ); // external value is changed by logscale
    };

    const drawTitle = () => {
        const drawPreciseInput = () => {
            if (!usePreciseInput) {
                return <></>;
            }
            if (!isRange) {
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
                        setValue={props.externalValue as number}   
                        onEnter={(newVal) => setExternalValue((+newVal as T))}
                        decimalDigits={decimalPlaces}
                        width={piWidth?  piWidth : 2.5+ 0.6*decimalPlaces +"rem"}
                        disabled={isDisabled}
                    />
                </Box>
                );

            } else {
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
                        onEnter={(newVal) => setExternalValue(([+newVal, externalValue[1]] as T))}
                        decimalDigits={decimalPlaces}
                        width={piWidth?  piWidth : 2.5+ 0.6*decimalPlaces +"rem"}
                        disabled={isDisabled}
                    />

                    <MoorhenPreciseInput
                        allowNegativeValues={minVal < 0}
                        label={sliderTitle + ":"}
                        setValue={props.externalValue[1]}   
                        onEnter={(newVal) => setExternalValue(([externalValue[0], +newVal ] as T))}
                        decimalDigits={decimalPlaces}
                        width={piWidth?  piWidth : 2.5+ 0.6*decimalPlaces +"rem"}
                        disabled={isDisabled}
                    />
                </Box>
                );
            }
        };

        if (!showSliderTitle) {
            return <></>;
        }
        if (!usePreciseInput) {
            return (
                <span>
                    {sliderTitle}:{" "}
                    {isRange
                        ? `${props.externalValue[0].toFixed(decimalPlaces)} - ${props.externalValue[1].toFixed(decimalPlaces)}`
                        : typeof props.externalValue === 'number' ? props.externalValue.toFixed(decimalPlaces) : ''}
                </span>
            );
        } else
            return ( drawPreciseInput() );
    };

    const handleButton = (factor: number, currentValue: T, idx?:number): T => { //this calculate the effect of button depending on type of value
        if (Array.isArray(currentValue)) {
            if (idx === 0) {
                return [clampValue(currentValue[0] + factor, minVal, maxVal), currentValue[1]] as T;
            } else if (idx === 1) {
                return [currentValue[0], clampValue(currentValue[1] + factor, minVal, maxVal)] as T;
            }
        } else {
            return clampValue(currentValue as number + factor, minVal, maxVal) as T;
        }
    }

    const changeButton = (factor: number, buttonEffect: () => void) => {
        if (!showButtons) {
            return <></>;
        }
        
        const intervalRef = useRef(null);

        const handleMouseDown = () => {
            buttonEffect()               

            intervalRef.current = setInterval(() => 
                buttonEffect(), 100);
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
                <Stack direction="column" spacing={1}>                  
                    {changeButton(
                        -1, () => {
                        setExternalValue((current) => (handleButton(-stepButtons, current)));
                    })}
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

                <Stack direction="column" spacing={1}></Stack>
                {changeButton(
                        1, () => {
                        setExternalValue((current) => (handleButton(+stepButtons, current)));
                    })}

                <Stack direction="column" spacing={1}>

                
                {showMinMaxVal && maxVal}
                </Stack>
            </Stack>

        </Box>
    );
};
