import React, { useEffect, useRef, useState } from "react";
import { Row, Toast } from "react-bootstrap";
import { Autocomplete, TextField } from "@mui/material";
import { convertViewtoPx } from "../utils/MoorhenUtils";
import { MoorhenColourRules } from "./MoorhenColouRules";

export const MoorhenAdvancedDisplayOptions = (props) => {
    const optionSelectRef = useRef()
    const [selectedOption, setSelectedOption] = useState(null)
    const [opacity, setOpacity] = useState(0.5)
    const [toastBodyWidth, setToastBodyWidth] = useState(convertViewtoPx(40, props.windowWidth))

    const options = [
            {label: "Create colour rules", widget: <MoorhenColourRules {...props}/>},
    ]

    const handleChange = (evt, newSelection) => {
        if (newSelection) {
            const newOptionIndex = options.findIndex(tool => tool.label === newSelection)
            setSelectedOption(newOptionIndex)
        } else {
            setSelectedOption(null)
        }
    }

    useEffect(() => {
        optionSelectRef.current = selectedOption
    }, [selectedOption])

    useEffect(() => {
        if (props.windowWidth > 1800) {
            setToastBodyWidth(convertViewtoPx(30, props.windowWidth))
        } else {
            setToastBodyWidth(convertViewtoPx(40, props.windowWidth))
        }
    }, [props.windowWidth])

    return  <Toast 
                bg='light'
                show={props.showAdvancedDisplayOptions}
                onClose={() => props.setShowAdvancedDisplayOptions(false)}
                autohide={false}
                style={{opacity: opacity, width: toastBodyWidth}}
                onMouseOver={() => setOpacity(1)}
                onMouseOut={() => setOpacity(0.5)}
                >
            <Toast.Header style={{ justifyContent: 'space-between' }} closeButton>
                Advanced Display Options
            </Toast.Header>
            <Toast.Body style={{maxHeight: convertViewtoPx(60, props.height()), overflowY: 'scroll'}}>
                <Row style={{padding: '0.1rem'}}>
                    <Autocomplete 
                        disablePortal
                        sx={{
                            '& .MuiInputBase-root': {
                                backgroundColor:  props.darkMode ? '#222' : 'white',
                                color: props.darkMode ? 'white' : '#222',
                            },
                                '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: props.darkMode ? 'white' : 'grey',
                            },
                                '& .MuiButtonBase-root': {
                                color: props.darkMode ? 'white' : 'grey',
                            },
                                '& .MuiFormLabel-root': {
                                color: props.darkMode ? 'white' : '#222',
                            },
                            }}                        
                            ref={optionSelectRef}
                            onChange={handleChange}
                            size='small'
                            options={options.map(option => option.label)}
                            renderInput={(params) => <TextField {...params} label="Tools" />}
                    />
                </Row>
                <Row>
                    {selectedOption !== null ? options[selectedOption].widget : null}
                </Row>
                </Toast.Body>
            </Toast>
                    
}
