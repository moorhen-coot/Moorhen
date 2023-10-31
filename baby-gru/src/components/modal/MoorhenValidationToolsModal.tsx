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
import { MoorhenWaterValidation } from "../validation-tools/MoorhenWaterValidation"
import { MoorhenLigandValidation } from "../validation-tools/MoorhenLigandValidation"
import { MoorhenUnmodelledBlobs } from "../validation-tools/MoorhenUnmodelledBlobs"
import { convertViewtoPx} from '../../utils/MoorhenUtils';
import { useSelector } from "react-redux";

interface MoorhenValidationModalProps extends moorhen.CollectedProps {
    show: boolean;
    setShow: React.Dispatch<React.SetStateAction<boolean>>;
}

export const MoorhenValidationToolsModal = (props: MoorhenValidationModalProps) => {    
    const [selectedTool, setSelectedTool] = useState<null | number>(null)
    const toolsAccordionSelectRef = useRef<undefined | HTMLSelectElement>()
    const width = useSelector((state: moorhen.State) => state.canvasStates.width)
    const height = useSelector((state: moorhen.State) => state.canvasStates.height)

    const collectedProps = {
        sideBarWidth: convertViewtoPx(35, width), dropdownId: 1, busy: false,
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
            {label: "MMRRCC plot", toolWidget: <MoorhenMMRRCCPlot {...collectedProps}/>},
            {label: "Water validation", toolWidget: <MoorhenWaterValidation {...collectedProps}/>}
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
                left={`${width / 2}px`}
                show={props.show}
                setShow={props.setShow}
                height={70}
                width={37}
                overflowY='hidden'
                headerTitle='Validation tools'
                footer={null}
                body={
                    <div style={{width: convertViewtoPx(35, width), height: convertViewtoPx(70, height)}} >
                        <Row style={{padding: '0.5rem', width:'100%', display:'inline-flex'}}>
                            <Form.Select id='validation-tool-select' ref={toolsAccordionSelectRef} onChange={handleChange} defaultValue={'placeHolder'}>
                                <option key="placeHolder" value="placeHolder" disabled hidden>Tool...</option>
                                    {toolOptions.map(option => <option key={option.label} value={option.label}>{option.label}</option>)}
                            </Form.Select>
                        </Row>
                        <Row className={selectedTool !== null && toolOptions[selectedTool].label === "Water validation" ? "small-validation-tool-container-row" : "big-validation-tool-container-row"}>
                            {selectedTool !== null ? toolOptions[selectedTool].toolWidget : null}
                        </Row>
                    </div>
                }
            />
}

