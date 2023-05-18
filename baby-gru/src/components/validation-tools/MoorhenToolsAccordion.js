import { useRef, useState } from "react";
import { Form, Row } from "react-bootstrap";
import { MoorhenRamachandran } from "./MoorhenRamachandran"
import { MoorhenValidation } from "./MoorhenValidation"
import { MoorhenDifferenceMapPeaks } from "./MoorhenDifferenceMapPeaks"
import { MoorhenPepflipsDifferenceMap } from "./MoorhenPepflipsDifferenceMap"
import { MoorhenFillMissingAtoms } from "./MoorhenFillMissingAtoms"
import { MoorhenMMRRCCPlot } from "./MoorhenMMRRCCPlot"
import { MoorhenUnmodelledBlobs } from "./MoorhenUnmodelledBlobs"
import { ListItemButton, ListItemText, Collapse } from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { convertViewtoPx} from '../../utils/MoorhenUtils';

export const MoorhenToolsAccordion = (props) => {
    const [selectedTool, setSelectedTool] = useState(null)
    const toolsAccordionSelectRef = useRef()

    const toolOptions = [
            {label: "Difference Map Peaks", toolWidget: <MoorhenDifferenceMapPeaks {...props}/>},
            {label: "Ramachandran Plot", toolWidget: <MoorhenRamachandran {...props}/>},
            {label: "Validation Plot", toolWidget: <MoorhenValidation {...props}/>},
            {label: "Peptide flips using difference map", toolWidget: <MoorhenPepflipsDifferenceMap {...props}/>},
            {label: "Fill partial residues", toolWidget: <MoorhenFillMissingAtoms {...props}/>},
            {label: "Unmodelled blobs", toolWidget: <MoorhenUnmodelledBlobs {...props}/>},
            {label: "MMRRCC plot", toolWidget: <MoorhenMMRRCCPlot {...props}/>}
    ]

    const handleChange = (evt) => {
        if (evt.target.value) {
            const newTool = toolOptions.findIndex(tool => tool.label === evt.target.value)
            setSelectedTool(newTool)
        } else {
            setSelectedTool(null)
        }
    }

    return <>
            <ListItemButton
                id="validation-tools-dropdown"
                show={props.accordionDropdownId === props.dropdownId}
                style={{display:'flex', alignItems:'center'}}
                onClick={() => { props.dropdownId !== props.accordionDropdownId ? props.setAccordionDropdownId(props.dropdownId) : props.setAccordionDropdownId(-1) }}>
                <ListItemText primary="Validation tools" />
                {props.dropdownId !== props.accordionDropdownId ? <ExpandMore/> : <ExpandLess/>}
            </ListItemButton>

            <Collapse id='validation-tools-collapse' in={props.dropdownId === props.accordionDropdownId} timeout="auto">
                <hr></hr>
                <div style={{width: props.sideBarWidth, height: convertViewtoPx(70, props.windowHeight)}} >
                    <Row style={{padding: '0.5rem', width:'100%', display:'inline-flex'}}>
                        <Form.Select id='validation-tool-select' ref={toolsAccordionSelectRef} onChange={handleChange}>
                            <option key="placeHolder" value="" disabled selected hidden>Tool...</option>
                            {toolOptions.map(option => <option key={option.label} value={option.label}>{option.label}</option>)}
                        </Form.Select>
                    </Row>
                    <Row className="tool-container-row" style={{width:'100%', margin:'0rem', padding:'0rem'}}>
                        {selectedTool !== null ? toolOptions[selectedTool].toolWidget : null}
                    </Row>
                </div>
                <hr></hr>
            </Collapse>
    </> 
}

