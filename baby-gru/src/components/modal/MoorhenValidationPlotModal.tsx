import { useRef } from "react";
import { Row } from "react-bootstrap";
import { useSelector } from "react-redux";
import { moorhen } from "../../types/moorhen";
import { MoorhenValidation } from "../validation-tools/MoorhenValidation"
import { convertRemToPx, convertViewtoPx} from '../../utils/utils';
import { modalKeys } from "../../utils/enums";
import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase"

export const MoorhenValidationPlotModal = () => {        
    const resizeNodeRef = useRef<HTMLDivElement>(null);
      
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)

    return <MoorhenDraggableModalBase
                modalId={modalKeys.VALIDATION_PLOT}
                left={width / 6}
                top={height / 3}
                minHeight={convertViewtoPx(30, height)}
                minWidth={convertRemToPx(37)}
                maxHeight={convertViewtoPx(90, height)}
                maxWidth={convertViewtoPx(80, width)}
                enforceMaxBodyDimensions={false}
                overflowY='hidden'
                overflowX='auto'
                headerTitle='Validation Plot'
                footer={null}
                resizeNodeRef={resizeNodeRef}
                body={
                    <div style={{height: '100%'}} >
                        <Row className={"big-validation-tool-container-row"}>
                            <MoorhenValidation chartId="validation-plot-chart" />
                        </Row>
                    </div>
                }
            />
}

