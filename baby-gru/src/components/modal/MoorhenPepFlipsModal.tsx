import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase"
import { moorhen } from "../../types/moorhen";
import { useRef } from "react";
import { Row } from "react-bootstrap";
import { convertRemToPx, convertViewtoPx} from '../../utils/MoorhenUtils';
import { useSelector } from "react-redux";
import { MoorhenPepflipsDifferenceMap } from "../validation-tools/MoorhenPepflipsDifferenceMap";

interface MoorhenValidationModalProps extends moorhen.CollectedProps {
    show: boolean;
    setShow: React.Dispatch<React.SetStateAction<boolean>>;
}

export const MoorhenPepFlipsModal = (props: MoorhenValidationModalProps) => {        
    const resizeNodeRef = useRef<HTMLDivElement>();
      
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)

    const collectedProps = {
        sideBarWidth: convertViewtoPx(35, width), dropdownId: 1, busy: false, 
        accordionDropdownId: 1, setAccordionDropdownId: (arg0) => {}, showSideBar: true, ...props
    }

    return <MoorhenDraggableModalBase
                modalId="pepflips-validation-modal"
                left={width / 6}
                top={height / 3}
                show={props.show}
                setShow={props.setShow}
                defaultHeight={convertViewtoPx(70, height)}
                defaultWidth={convertViewtoPx(37, width)}
                minHeight={convertViewtoPx(30, height)}
                minWidth={convertRemToPx(37)}
                maxHeight={convertViewtoPx(70, height)}
                maxWidth={convertViewtoPx(50, width)}
                enforceMaxBodyDimensions={true}
                overflowY='auto'
                overflowX='auto'
                headerTitle='Peptide flips using difference map'
                footer={null}
                resizeNodeRef={resizeNodeRef}
                body={
                    <div style={{height: '100%'}} >
                        <Row className={"big-validation-tool-container-row"}>
                            <MoorhenPepflipsDifferenceMap {...collectedProps}/>
                        </Row>
                    </div>
                }
            />
}

