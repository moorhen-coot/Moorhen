import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MoorhenPreciseInput } from "../inputs/MoorhenPreciseInput";
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Slider from '@mui/material/Slider';

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
    decrementButton?: JSX.Element;
    isDisabled?: boolean;
    incrementButton?: JSX.Element;
    usePreciseInput?: boolean;
    piParameters?: {decimalDigits: number, width:number, }

}

export const MoorhenSlider = forwardRef<number, MoorhenSliderProps>((props, ref) => {
    

    const defaultProps ={
        minVal: 0, maxVal: 100, logScale: false, showMinMaxVal: true, incrementButton: null,
        isDisabled: false, allowFloats: true, showSliderTitle: true, decimalPlaces: 3, 
        decrementButton: null, allowExternalFeedback: true, usePreciseInput: false, piParameters: {decimalDigits:2, width:60}
    }

    const { 
        logScale, minVal, maxVal, initialValue, allowExternalFeedback,
        allowFloats, showSliderTitle, sliderTitle, decimalPlaces,
        showMinMaxVal, decrementButton, isDisabled, incrementButton, usePreciseInput, piParameters
    } = { ...defaultProps, ...props }
    
    const convertValueToScale = (logScale: boolean, minVal: number, maxVal: number, value: number) => {
        if (logScale) {
            return 100 * ((Math.log10(value) - Math.log10(minVal)) / ((Math.log10(maxVal) - Math.log10(minVal))));
        } else {
            return (100 * (value - minVal)) / (maxVal - minVal);
        }
    }  
    
    const initValue = useMemo(() => {
        return convertValueToScale(logScale, minVal, maxVal, initialValue)
    }, [ ])

    const [value, setValue] = useState<number>(initValue);
    const [externalValue, setExternalValue] = useState<number>(props.externalValue)

    const localRef = useRef<number | null>(props.externalValue)
    const externalValueRef = ref || localRef

    useEffect(() => {
        if (props.externalValue !== externalValue) {
            props.setExternalValue?.(externalValue)
        }
    }, [externalValue])

    /** 
    * This hook is necessary if we want the slider position to update when the value changes due to external
    * components. However this can slow down things so better not to use it unless this is expected.
    */
    useEffect(() => {
        if (allowExternalFeedback) {
            setValue(convertValueToScale(logScale, minVal, maxVal, externalValue))
        }

    }, [props.externalValue])

    const handleChange = useCallback((evt: any, newValue: number) => {
        let newVal: number
        setValue(allowFloats ? newValue : Math.round(newValue))
        if (logScale) {
            const log10MaxVal = Math.log10(maxVal)
            const log10MinVal = Math.log10(Math.max(minVal, 0.00000001))
            const log10NewVal = log10MinVal + (newValue/100) * (log10MaxVal-log10MinVal)
            newVal = Math.pow(10., log10NewVal)
            if (!allowFloats) {
                newVal = Math.round(newVal)
            }
        }
        else if (allowFloats) {
            newVal = minVal + (newValue/100.)*(maxVal-minVal)
        } else {
            newVal = Math.round(minVal + (newValue/100.)*(maxVal-minVal))
        }

        setExternalValue(newVal)
        if (externalValueRef !== null && typeof externalValueRef !== 'function') externalValueRef.current = newVal

    }, [allowFloats, logScale, minVal, maxVal])

    const title = () => {
        if (!showSliderTitle)
        {
            return
        }
        if (!usePreciseInput) {
            return <span>{sliderTitle}: {allowFloats ? props.externalValue.toFixed(decimalPlaces) : props.externalValue}</span>        
        }
        else
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
                    label = {sliderTitle + ":"}
                    value={props.externalValue}
                    setValue={(newVal) => setExternalValue(+newVal)}
                    decimalDigits={piParameters.decimalDigits}        
            />
            </Box>
            ) }
            

    return (
        <Box sx={{alignItems: "center", justifyContent: "center", width: '100%' }}>
            {title()}
            <Stack spacing={2} direction="row" sx={{ mb: 1 }} alignItems="center">
                {showMinMaxVal && minVal}
                {decrementButton}
                <Slider disabled={isDisabled} value={value} onChange={handleChange}/>
                {incrementButton}
                {showMinMaxVal && maxVal}
            </Stack>
        </Box>
    );
})
