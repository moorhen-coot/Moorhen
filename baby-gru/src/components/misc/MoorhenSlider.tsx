import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Slider from '@mui/material/Slider';

const convertValueToScale = (logScale: boolean, minVal: number, maxVal: number, value: number) => {
    if (logScale) {
        return 100 * ((Math.log10(value) - Math.log10(minVal)) / ((Math.log10(maxVal) - Math.log10(minVal))));
    } else {
        return (100 * (value - minVal)) / (maxVal - minVal);
    }
}

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
}

export const MoorhenSlider = forwardRef<number, MoorhenSliderProps>((props, ref) => {
    
    const initValue = convertValueToScale(props.logScale, props.minVal, props.maxVal, props.initialValue)
    const [value, setValue] = useState<number>(initValue);
    const [externalValue, setExternalValue] = useState<number>(props.externalValue)
    const localRef = useRef<number | null>(props.externalValue)
    const externalValueRef = ref || localRef

    useEffect(() => {
        if (props.externalValue !== externalValue) {
            props.setExternalValue(externalValue)
        }
    }, [externalValue])

    /** 
    * This hook is necessary if we want the slider position to update when the value changes due to external
    * components. However this can slow down things so better not to use it unless this is expected.
    */
    useEffect(() => {
        if (props.allowExternalFeedback) {
            setValue(convertValueToScale(props.logScale, props.minVal, props.maxVal, props.externalValue))
        }

    }, [props.externalValue])

    const handleChange = useCallback((evt: any, newValue: number) => {
        let newVal: number
        setValue(props.allowFloats ? newValue : Math.round(newValue))
        if (props.logScale) {
            const log10MaxVal = Math.log10(props.maxVal)
            const log10MinVal = Math.log10(Math.max(props.minVal, 0.00000001))
            const log10NewVal = log10MinVal + (newValue/100) * (log10MaxVal-log10MinVal)
            newVal = Math.pow(10., log10NewVal)
            if (!props.allowFloats) {
                newVal = Math.round(newVal)
            }
        }
        else if (props.allowFloats) {
            newVal = props.minVal + (newValue/100.)*(props.maxVal-props.minVal)
        } else {
            newVal = Math.round(props.minVal + (newValue/100.)*(props.maxVal-props.minVal))
        }

        setExternalValue(newVal)
        if (externalValueRef !== null && typeof externalValueRef !== 'function') externalValueRef.current = newVal

    }, [props.allowFloats, props.logScale, props.minVal, props.maxVal])

    return (
        <Box sx={{ width: '100%' }}>
            {props.showSliderTitle && 
            <span>{props.sliderTitle}: {props.allowFloats ? props.externalValue.toFixed(props.decimalPlaces) : props.externalValue}</span>        
            }
            <Stack spacing={2} direction="row" sx={{ mb: 1 }} alignItems="center">
                {props.showMinMaxVal && props.minVal}
                {props.decrementButton}
                <Slider disabled={props.isDisabled} value={value} onChange={handleChange}/>
                {props.incrementButton}
                {props.showMinMaxVal && props.maxVal}
            </Stack>
        </Box>
    );
})

MoorhenSlider.defaultProps={
    minVal: 0, maxVal: 100, setExternalValue: ()=>{}, logScale: false, showMinMaxVal: true, incrementButton: null,
    isDisabled: false, allowFloats: true, showSliderTitle: true, decimalPlaces: 3,  decrementButton: null, allowExternalFeedback: true,
}