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
    externalValue: T;   // value passed from parent
    setExternalValue: (arg0:  T) => void; // function to set value in parent
    logScale?: boolean;
    minVal?: number;
    maxVal?: number;
    sliderTitle?: string; 
    decimalPlaces?: number;
    showMinMaxVal?: boolean;
    showButtons?: boolean;
    stepButtons?: number;
    isDisabled?: boolean;
    usePreciseInput?: boolean;
    piWidth?: string | number;
    piWaitReturn?: boolean;
    piMinMax?: [number, number]
};

export const MoorhenSlider = <T extends number | [number, number]>(props: MoorhenSliderProps<T>) => {
    const isDark = useSelector(
        (state: moorhen.State) => state.sceneSettings.isDark
    );

    const {
        minVal = 0,
        maxVal = 100,
        logScale = false,
        decimalPlaces = 0,
        sliderTitle = "",
        showMinMaxVal = true,
        isDisabled = false,
        usePreciseInput = false,
        showButtons = true,
        piWidth,
        piWaitReturn = false,
        piMinMax = [minVal, maxVal]
    } = props;

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

    const [internalValue, setInternalValue] = useState<T>(logScale ? log10ofT(props.externalValue) : props.externalValue); // internal value
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
            setInternalValue(log10ofT(props.externalValue));
        } else {
            setInternalValue(props.externalValue);
        }
    }, [props.externalValue]);

    const handleChange = (event: Event, newValue: T) => {
        setExternalValue(logScale ? pow10ofT(newValue) : newValue ); // external value is changed by logscale
    };

    const drawTitle = () => {
        const drawPreciseInput = () => {
            if (!isRange) {
                return (
                    <Box
                    sx={{
                        display: "flex",
                        justifyContent: "center", // Center horizontally
                        alignItems: "center", // Center vertically
                        width: "100%", // Ensure it spans the full width of the container
                        marginBottom: "0.5rem", // Adjust as needed
                    }
                }
                >
                    <MoorhenPreciseInput
                        allowNegativeValues={minVal < 0}
                        label={sliderTitle}
                        value={props.externalValue as number}   
                        setValue={(newVal) => setExternalValue((+newVal as T))}
                        waitReturn={piWaitReturn}
                        decimalDigits={decimalPlaces}
                        width={piWidth?  piWidth : 2.5+ 0.6*decimalPlaces +"rem"}
                        disabled={isDisabled}
                        minMax={piMinMax}
                    />
                </Box>
                );

            } else {
                return (
                    <Stack
                    direction="row"
                    spacing={1}
                    justifyContent="space-between"

                >
                    <MoorhenPreciseInput
                        allowNegativeValues={minVal < 0}
                        value={props.externalValue[0]}   
                        setValue={(newVal) => setExternalValue(([+newVal, externalValue[1]] as T))}
                        waitReturn={piWaitReturn}
                        decimalDigits={decimalPlaces}
                        width={piWidth?  piWidth : 2.5+ 0.6*decimalPlaces +"rem"}
                        disabled={isDisabled}
                        minMax={piMinMax}
                    />
                    <span style={{ margin: "0 5px" }}>{sliderTitle}:</span>
                    <MoorhenPreciseInput
                        allowNegativeValues={minVal < 0}
                        value={props.externalValue[1]}   
                        setValue={(newVal) => setExternalValue(([externalValue[0], +newVal ] as T))}
                        waitReturn={piWaitReturn}
                        decimalDigits={decimalPlaces}
                        width={piWidth?  piWidth : 2.5+ 0.6*decimalPlaces +"rem"}
                        disabled={isDisabled}
                        minMax={piMinMax}
                    />
                    </Stack>
                );
            }
        };

        if (sliderTitle === "") return null;
        
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


    const changeButton = (factor: number, idx?:number) => {
        if (!showButtons) {
            return <></>;
        }

        const handleButton = (factor: number, currentValue: T, idx?:number): T => { //this calculate the effect of button depending on type of value
            if (Array.isArray(currentValue)) {
                return idx === 0
                    ? [clampValue(currentValue[0] + factor, minVal, maxVal), currentValue[1]] as T
                    : [currentValue[0], clampValue(currentValue[1] + factor, minVal, maxVal)] as T;
            }

            return clampValue(currentValue as number + factor, minVal, maxVal) as T;
        }
        
        const buttonEffect = () => {
            setExternalValue((current) => handleButton(factor, current, idx));
        };

        const intervalRef = useRef<NodeJS.Timeout | null>(null);

        const handleMouseDown = (): void => {
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
                sx={{ padding: 0, color: isDark ? "white" : "black" }}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {factor > 0 ? <AddCircleOutline /> : <RemoveCircleOutline />}
            </IconButton>
        );
    };

    function drawSidePanels(side: string) {
        return (
            <Stack
                direction="column"
                spacing={isRange ? 0 : 1}
                sx={{ position: "relative", top: isRange ? "6px" : "-6px", left : side === "L" ? "0.5rem" : "-0.5rem", }}
            >
                {isRange
                    ? (
                        <>
                            {changeButton(+stepButtons, side === "L" ? 0 : 1)}
                            {changeButton(-stepButtons, side === "L" ? 0 : 1)}
                        </>
                    )
                    : changeButton(side === "L" ? -stepButtons : +stepButtons)}
            </Stack>
        );
    }

    return (
        <Stack
            spacing={2}
            direction="row"
            alignItems="flex-end"
            marginBottom="1rem"
        >
            {drawSidePanels("L")}         
            <Stack
                direction="column"
                spacing={-0.2}
                sx={{ width: "100%", }}
            >
                {drawTitle()}
                <Slider
                    disabled={isDisabled}
                    value={internalValue}
                    onChange={handleChange}
                    min={logScale ? Math.log10(minVal) : minVal}
                    max={logScale ? Math.log10(maxVal) : maxVal}
                    step={precision}
                />
                {showMinMaxVal ? (
                    <Stack
                        direction="row"
                        justifyContent="space-between"
                        sx={{position: "relative", top: "-0.4rem", fontSize: "0.8rem", color: isDark ? "white" : "black", 
                            width: "100%", height: "0.2rem", }}
                    >
                        <span>
                            {minVal.toFixed(decimalPlaces)}
                        </span>
                        <span>
                            {maxVal.toFixed(decimalPlaces)}
                        </span>
                    </Stack>
                ) : (
                    <></>
                )}
            </Stack>
            {drawSidePanels("R")}
        </Stack>
    );
};
