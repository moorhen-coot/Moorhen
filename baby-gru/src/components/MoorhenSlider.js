import * as React from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Slider from '@mui/material/Slider';

export default function MoorhenSlider(props) {
    
    const convertInitValueToScale = (value) => {
        if (props.logScale) {
            return 100 * ((Math.log10(value) - Math.log10(props.minVal)) / ((Math.log10(props.maxVal) - Math.log10(props.minVal))));
        } else {
            return (100 * (value - props.minVal)) / (props.maxVal - props.minVal);
        }
    }

    const [value, setValue] = React.useState(convertInitValueToScale(props.initialValue));
    const [externalValue, setExternalValue] = React.useState(props.externalValue)

    React.useEffect(() => {
        if (props.externalValue !== parseFloat(externalValue)) {
            props.setExternalValue(parseFloat(externalValue))
        }
    }, [externalValue])

    const handleChange = (event, newValue) => {
        setValue(props.allowFloats ? newValue : Math.round(newValue))
        if (props.logScale) {
            const log10MaxVal = Math.log10(props.maxVal)
            const log10MinVal = Math.log10(Math.max(props.minVal, 0.00000001))
            const log10NewVal = log10MinVal + (newValue/100) * (log10MaxVal-log10MinVal)
            let newVal = Math.pow(10., log10NewVal)
            if (!props.allowFloats) {
                newVal = Math.round(newVal)
            }
            setExternalValue(newVal)
        }
        else if (props.allowFloats) {
            setExternalValue(props.minVal + (newValue/100.)*(props.maxVal-props.minVal))
        } else {
            setExternalValue(Math.round(props.minVal + (newValue/100.)*(props.maxVal-props.minVal)))
        }
    };

    return (
        <Box sx={{ width: '100%' }}>
            {props.showSliderTitle && 
            <span>{props.sliderTitle}: {props.allowFloats ? props.externalValue.toFixed(props.decimalPlaces) : props.externalValue}</span>        
            }
            <Stack spacing={2} direction="row" sx={{ mb: 1 }} alignItems="center">
                {props.minVal}
                    <Slider disabled={props.isDisabled} value={value} onChange={handleChange}/>
                {props.maxVal}
            </Stack>
        </Box>
    );
}

MoorhenSlider.defaultProps={
    minVal: 0, maxVal: 100, setExternalValue: ()=>{}, logScale: false, 
    isDisabled: false, allowFloats: true, showSliderTitle: true, decimalPlaces: 3
}