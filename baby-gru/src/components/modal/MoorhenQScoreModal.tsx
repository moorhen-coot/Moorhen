import { useRef } from "react";
import { useSelector } from "react-redux";
import { convertRemToPx, convertViewtoPx } from "../../utils/utils";
import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase";
import { modalKeys } from "../../utils/enums";
import { moorhen } from "../../types/moorhen";
import { MoorhenQScore } from "../validation-tools/MoorhenQScore";
import { Row } from "react-bootstrap";

export const MoorhenQScoreModal = (props) => {
    const resizeNodeRef = useRef<HTMLDivElement>();
      
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)

    return <MoorhenDraggableModalBase
                modalId={modalKeys.QSCORE}
                left={width / 6}
                top={height / 3}
                defaultHeight={convertViewtoPx(70, height)}
                defaultWidth={convertViewtoPx(37, width)}
                minHeight={convertViewtoPx(30, height)}
                minWidth={convertRemToPx(37)}
                maxHeight={convertViewtoPx(90, height)}
                maxWidth={convertViewtoPx(80, width)}
                enforceMaxBodyDimensions={false}
                overflowY='hidden'
                overflowX='auto'
                headerTitle='Q-Score Plot'
                footer={null}
                resizeNodeRef={resizeNodeRef}
                body={
                    <div style={{height: '100%'}} >
                        <Row className={"big-validation-tool-container-row"}>
                            <MoorhenQScore {...props}/>
                        </Row>
                    </div>
                }
            />

}