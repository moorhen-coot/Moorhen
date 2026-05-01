import { useSelector } from "react-redux";
import { useRef } from "react";
import { moorhen } from "../../types/moorhen";
import { modalKeys } from "../../utils/enums";
import { MoorhenDraggableModalBase } from "../interface-base/ModalBase/DraggableModalBase";
import { MoorhenWaterValidation } from "../validation-tools/MoorhenWaterValidation";

export const MoorhenWaterValidationModal = () => {
    const resizeNodeRef = useRef<HTMLDivElement>(null);

    const width = useSelector((state: moorhen.State) => state.sceneSettings.width);
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height);

    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.WATER_VALIDATION}
            headerTitle="Water validation"
            allowDocking={true}
            footer={null}
            resizeNodeRef={resizeNodeRef}
            body={<MoorhenWaterValidation />}
        />
    );
};
