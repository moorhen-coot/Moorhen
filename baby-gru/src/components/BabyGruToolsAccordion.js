import { Fragment, useState, useRef, useEffect } from "react";
import { Row } from "react-bootstrap";
import { BabyGruRamachandran } from "./BabyGruRamachandran"
import { BabyGruValidation } from "./BabyGruValidation"
import { BabyGruDifferenceMapPeaks } from "./BabyGruDifferenceMapPeaks"
import { BabyGruPepflipsDifferenceMap } from "./BabyGruPepflipsDifferenceMap"
import { Autocomplete, TextField } from "@mui/material";

export const BabyGruToolsAccordion = (props) => {
    const selectRef = useRef()
    const searchBarRef = useRef()
    const [selectedToolKey, setSelectedToolKey] = useState(null)

    const toolOptions = [
            {label: "Difference Map Peaks", toolWidget: <BabyGruDifferenceMapPeaks {...props}/>},
            {label: "Ramachandran Plot", toolWidget: <BabyGruRamachandran {...props}/>},
            {label: "Validation", toolWidget: <BabyGruValidation {...props}/>},
            {label: "Peptide flips using difference map", toolWidget: <BabyGruPepflipsDifferenceMap {...props}/>}
    ]

    const handleChange = (evt, newSelection) => {
        if (newSelection) {
            const newToolIndex = toolOptions.findIndex(tool => tool.label == newSelection)
            setSelectedToolKey(newToolIndex)
        } else {
            setSelectedToolKey(null)
        }
    }

    useEffect(() => {
        selectRef.current.value = selectedToolKey
        if(searchBarRef.current) {
            searchBarRef.current.value = "" 
        } 
    }, [selectedToolKey])
            
    return <Fragment> 
            <Row style={{padding: '0.5rem'}}>
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
                        ref={selectRef}
                        onChange={handleChange}
                        size='small'
                        options={toolOptions.map(tool => tool.label)}
                        renderInput={(params) => <TextField {...params} label="Tool" />}
                    />
            </Row>
            <Row className="tool-container-row">
                {selectedToolKey !== null ? toolOptions[selectedToolKey].toolWidget : null}
            </Row>
        </Fragment> 
}

