import { useRef } from "react";
import { Row } from "react-bootstrap";
import { useSelector } from "react-redux";
import { convertRemToPx, convertViewtoPx} from '../../utils/utils';
import { moorhen } from "../../types/moorhen";
import { MoorhenLigandValidation } from "../validation-tools/MoorhenLigandValidation";
import { modalKeys } from "../../utils/enums";
import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase"

export const MoorhenLigandValidationModal = (props: moorhen.CollectedProps) => {        
    const resizeNodeRef = useRef<HTMLDivElement>(null);
      
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)

    return <MoorhenDraggableModalBase
                modalId={modalKeys.LIGAND_VALIDATION}
                left={width / 6}
                top={height / 3}
                minHeight={convertViewtoPx(30, height)}
                minWidth={convertRemToPx(37)}
                maxHeight={convertViewtoPx(70, height)}
                maxWidth={convertViewtoPx(50, width)}
                enforceMaxBodyDimensions={true}
                overflowY='auto'
                overflowX='auto'
                headerTitle='Ligand validation'
                footer={null}
                resizeNodeRef={resizeNodeRef}
                body={
                    <div style={{height: '100%'}} >
                        <Row className={"big-validation-tool-container-row"}>
                            <MoorhenLigandValidation {...props}/>
                        </Row>
                    </div>
                }
            />
}

