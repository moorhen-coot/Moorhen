import { Row } from "react-bootstrap";
import { useSelector } from "react-redux";
import { useRef } from "react";
import { moorhen } from "../../types/moorhen";
import { modalKeys } from "../../utils/enums";
import { convertRemToPx, convertViewtoPx } from "../../utils/utils";
import { MoorhenDraggableModalBase } from "../interface-base/DraggableModalBase";
import { MoorhenWaterValidation } from "../validation-tools/MoorhenWaterValidation";

export const MoorhenWaterValidationModal = () => {
    const resizeNodeRef = useRef<HTMLDivElement>(null);

    const width = useSelector((state: moorhen.State) => state.sceneSettings.width);
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height);

    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.WATER_VALIDATION}
            left={width / 6}
            top={height / 3}
            minHeight={convertViewtoPx(30, height)}
            minWidth={convertRemToPx(37)}
            maxHeight={convertViewtoPx(70, height)}
            maxWidth={convertViewtoPx(50, width)}
            enforceMaxBodyDimensions={true}
            overflowY="auto"
            overflowX="auto"
            headerTitle="Water validation"
            footer={null}
            resizeNodeRef={resizeNodeRef}
            body={
                <div style={{ height: "100%" }}>
                    <Row className={"small-validation-tool-container-row"}>
                        <MoorhenWaterValidation />
                    </Row>
                </div>
            }
        />
    );
};
