import { Row } from "react-bootstrap";
import { useSelector } from "react-redux";
import { useRef } from "react";
import { moorhen } from "../../types/moorhen";
import { modalKeys } from "../../utils/enums";
import { convertRemToPx, convertViewtoPx } from "../../utils/utils";
import { MoorhenDraggableModalBase } from "../interface-base/ModalBase/DraggableModalBase";
import { MoorhenQScore } from "../validation-tools/MoorhenQScore";

export const MoorhenQScoreModal = () => {
    const resizeNodeRef = useRef<HTMLDivElement>(null);

    const width = useSelector((state: moorhen.State) => state.sceneSettings.width);
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height);

    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.QSCORE}
            left={width / 6}
            top={height / 3}
            minHeight={convertViewtoPx(30, height)}
            minWidth={convertRemToPx(37)}
            maxHeight={convertViewtoPx(90, height)}
            maxWidth={convertViewtoPx(80, width)}
            enforceMaxBodyDimensions={false}
            overflowY="hidden"
            overflowX="auto"
            headerTitle="Q-Score Plot"
            footer={null}
            resizeNodeRef={resizeNodeRef}
            body={
                <div style={{ height: "100%" }}>
                    <Row className={"big-validation-tool-container-row"}>
                        <MoorhenQScore />
                    </Row>
                </div>
            }
        />
    );
};
