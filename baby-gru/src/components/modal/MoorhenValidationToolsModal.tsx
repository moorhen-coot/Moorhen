import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase"
import { moorhen } from "../../types/moorhen";
import { useRef, useState } from "react";
import { Form, Row } from "react-bootstrap";
import { MoorhenRamachandran } from "../validation-tools/MoorhenRamachandran"
import { MoorhenValidation } from "../validation-tools/MoorhenValidation"
import { MoorhenDifferenceMapPeaks } from "../validation-tools/MoorhenDifferenceMapPeaks"
import { MoorhenPepflipsDifferenceMap } from "../validation-tools/MoorhenPepflipsDifferenceMap"
import { MoorhenFillMissingAtoms } from "../validation-tools/MoorhenFillMissingAtoms"
import { MoorhenMMRRCCPlot } from "../validation-tools/MoorhenMMRRCCPlot"
import { MoorhenLigandValidation } from "../validation-tools/MoorhenLigandValidation"
import { MoorhenUnmodelledBlobs } from "../validation-tools/MoorhenUnmodelledBlobs"
import { convertViewtoPx} from '../../utils/MoorhenUtils';

interface MoorhenValidationModalProps extends moorhen.Controls {
    windowWidth: number;
    windowHeight: number;
    show: boolean;
    setShow: React.Dispatch<React.SetStateAction<boolean>>;
}

export const MoorhenValidationToolsModal = (props: MoorhenValidationModalProps) => {    
    const [selectedTool, setSelectedTool] = useState<null | number>(null)
    const toolsAccordionSelectRef = useRef<undefined | HTMLSelectElement>()

    const collectedProps = {
        sideBarWidth: convertViewtoPx(35, props.windowWidth), dropdownId: 1, busy: false, consoleMessage: '', 
        accordionDropdownId: 1, setAccordionDropdownId: (arg0) => {}, showSideBar: true, ...props
    }

    const toolOptions = [
            {label: "Difference Map Peaks", toolWidget: <MoorhenDifferenceMapPeaks {...collectedProps}/>},
            {label: "Ramachandran Plot", toolWidget: <MoorhenRamachandran {...collectedProps}/>},
            {label: "Validation Plot", toolWidget: <MoorhenValidation {...collectedProps}/>},
            {label: "Ligand Validation", toolWidget: <MoorhenLigandValidation {...collectedProps}/>},
            {label: "Peptide flips using difference map", toolWidget: <MoorhenPepflipsDifferenceMap {...collectedProps}/>},
            {label: "Fill partial residues", toolWidget: <MoorhenFillMissingAtoms {...collectedProps}/>},
            {label: "Unmodelled blobs", toolWidget: <MoorhenUnmodelledBlobs {...collectedProps}/>},
            {label: "MMRRCC plot", toolWidget: <MoorhenMMRRCCPlot {...collectedProps}/>}
    ]

    const handleChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        if (evt.target.value) {
            const newTool = toolOptions.findIndex(tool => tool.label === evt.target.value)
            setSelectedTool(newTool)
        } else {
            setSelectedTool(null)
        }
    }

    return <MoorhenDraggableModalBase
                transparentOnMouseOut={props.transparentModalsOnMouseOut}
                left={`${props.windowWidth / 2}px`}
                show={props.show}
                setShow={props.setShow}
                height={70}
                width={37}
                windowHeight={props.windowHeight}
                windowWidth={props.windowWidth}
                overflowY='hidden'
                headerTitle='Validation tools'
                footer={null}
                body={
                    <div style={{width: convertViewtoPx(35, props.windowWidth), height: convertViewtoPx(70, props.windowHeight)}} >
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
                }
            />
}

