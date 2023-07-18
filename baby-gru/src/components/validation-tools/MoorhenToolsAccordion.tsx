import { useRef, useState } from "react";
import { Form, Row } from "react-bootstrap";
import { MoorhenRamachandran } from "./MoorhenRamachandran"
import { MoorhenValidation } from "./MoorhenValidation"
import { MoorhenDifferenceMapPeaks } from "./MoorhenDifferenceMapPeaks"
import { MoorhenPepflipsDifferenceMap } from "./MoorhenPepflipsDifferenceMap"
import { MoorhenFillMissingAtoms } from "./MoorhenFillMissingAtoms"
import { MoorhenMMRRCCPlot } from "./MoorhenMMRRCCPlot"
import { MoorhenUnmodelledBlobs } from "./MoorhenUnmodelledBlobs"
import { convertViewtoPx} from '../../utils/MoorhenUtils';
import { MoorhenSideBarAccordionPropsInterface } from "../list/MoorhenSideBar";


export const MoorhenToolsAccordion = (props: MoorhenSideBarAccordionPropsInterface) => {
    const [selectedTool, setSelectedTool] = useState<null | number>(null)
    const toolsAccordionSelectRef = useRef<undefined | HTMLSelectElement>()

    const toolOptions = [
            {label: "Difference Map Peaks", toolWidget: <MoorhenDifferenceMapPeaks {...props}/>},
            {label: "Ramachandran Plot", toolWidget: <MoorhenRamachandran {...props}/>},
            {label: "Validation Plot", toolWidget: <MoorhenValidation {...props}/>},
            {label: "Peptide flips using difference map", toolWidget: <MoorhenPepflipsDifferenceMap {...props}/>},
            {label: "Fill partial residues", toolWidget: <MoorhenFillMissingAtoms {...props}/>},
            {label: "Unmodelled blobs", toolWidget: <MoorhenUnmodelledBlobs {...props}/>},
            {label: "MMRRCC plot", toolWidget: <MoorhenMMRRCCPlot {...props}/>}
    ]

    const handleChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        if (evt.target.value) {
            const newTool = toolOptions.findIndex(tool => tool.label === evt.target.value)
            setSelectedTool(newTool)
        } else {
            setSelectedTool(null)
        }
    }

    return <>
        <div style={{width: props.sideBarWidth, height: convertViewtoPx(70, props.windowHeight)}} >
            <Row style={{padding: '0.5rem', width:'100%', display:'inline-flex'}}>
                <Form.Select id='validation-tool-select' ref={toolsAccordionSelectRef} onChange={handleChange} defaultValue={'placeHolder'}>
                    <option key="placeHolder" value="placeHolder" disabled hidden>Tool...</option>
                        {toolOptions.map(option => <option key={option.label} value={option.label}>{option.label}</option>)}
                </Form.Select>
            </Row>
            <Row className="tool-container-row" style={{width:'100%', margin:'0rem', padding:'0rem'}}>
                {selectedTool !== null ? toolOptions[selectedTool].toolWidget : null}
            </Row>
        </div>
    </> 
}

