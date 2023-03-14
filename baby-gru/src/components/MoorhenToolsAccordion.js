import { useRef, useEffect } from "react";
import { Row } from "react-bootstrap";
import { MoorhenRamachandran } from "./MoorhenRamachandran"
import { MoorhenValidation } from "./MoorhenValidation"
import { MoorhenDifferenceMapPeaks } from "./MoorhenDifferenceMapPeaks"
import { MoorhenPepflipsDifferenceMap } from "./MoorhenPepflipsDifferenceMap"
import { MoorhenFillMissingAtoms } from "./MoorhenFillMissingAtoms"
import { MoorhenMMRRCCPlot } from "./MoorhenMMRRCCPlot"
import { Autocomplete, TextField, ListItemButton, ListItemText, Collapse } from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { convertViewtoPx} from '../utils/MoorhenUtils';

export const MoorhenToolsAccordion = (props) => {
    const toolsAccordionSelectRef = useRef()

    const toolOptions = [
            {label: "Difference Map Peaks", toolWidget: <MoorhenDifferenceMapPeaks {...props}/>},
            {label: "Ramachandran Plot", toolWidget: <MoorhenRamachandran {...props}/>},
            {label: "Validation Plot", toolWidget: <MoorhenValidation {...props}/>},
            {label: "Peptide flips using difference map", toolWidget: <MoorhenPepflipsDifferenceMap {...props}/>},
            {label: "Fill partial residues", toolWidget: <MoorhenFillMissingAtoms {...props}/>},
            {label: "MMRRCC plot", toolWidget: <MoorhenMMRRCCPlot {...props}/>}
    ]

    const handleChange = (evt, newSelection) => {
        if (newSelection) {
            const newToolIndex = toolOptions.findIndex(tool => tool.label === newSelection)
            props.setSelectedToolKey(newToolIndex)
        } else {
            props.setSelectedToolKey(null)
        }
    }

    useEffect(() => {
        toolsAccordionSelectRef.current.value = props.selectedToolKey
    }, [props.selectedToolKey])

    
    return <>
            <ListItemButton
                id="tools-dropdown"
                show={props.accordionDropdownId === props.dropdownId}
                style={{display:'flex', alignItems:'center'}}
                onClick={() => { props.dropdownId !== props.accordionDropdownId ? props.setAccordionDropdownId(props.dropdownId) : props.setAccordionDropdownId(-1) }}>
                <ListItemText primary="Validation tools" />
                {props.dropdownId !== props.accordionDropdownId ? <ExpandMore/> : <ExpandLess/>}

            </ListItemButton>

            <Collapse in={props.dropdownId === props.accordionDropdownId} timeout="auto">
                <hr></hr>
                <div style={{width: props.sideBarWidth, height: convertViewtoPx(70, props.windowHeight)}} >
                    <Row style={{padding: '0.5rem', width:'100%', display:'inline-flex'}}>
                    <Autocomplete 
                        disablePortal
                        sx={{
                            '& .MuiInputBase-root': {
                                backgroundColor:  props.isDark ? '#222' : 'white',
                                color: props.isDark ? 'white' : '#222',
                              },
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: props.isDark ? 'white' : 'grey',
                              },
                              '& .MuiButtonBase-root': {
                                color: props.isDark ? 'white' : 'grey',
                              },
                              '& .MuiFormLabel-root': {
                                color: props.isDark ? 'white' : '#222',
                              },
                            }}
                        ref={toolsAccordionSelectRef}
                        onChange={handleChange}
                        size='small'
                        options={toolOptions.map(tool => tool.label)}
                        renderInput={(params) => <TextField {...params} label="Tool" />}
                    />
                    </Row>
                    <Row className="tool-container-row" style={{width:'100%', margin:'0rem', padding:'0rem'}}>
                        {props.selectedToolKey !== null ? toolOptions[props.selectedToolKey].toolWidget : null}
                    </Row>
                </div>
                <hr></hr>
            </Collapse>
    </> 
}

