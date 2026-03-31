import { useSelector } from "react-redux";
import { useRef } from "react";
import { moorhen } from "../../types/moorhen";
import { modalKeys } from "../../utils/enums";
import { convertRemToPx, convertViewtoPx } from "../../utils/utils";
import { MoorhenDraggableModalBase } from "../interface-base/ModalBase/DraggableModalBase";
import { ModalComponentProps } from "../interface-base/ModalBase/ModalsContainer";
import { MoorhenLigandValidation } from "../validation-tools/MoorhenLigandValidation";

export const MoorhenLigandValidationModal = (props: ModalComponentProps) => {
    const resizeNodeRef = useRef<HTMLDivElement>(null);

    const width = useSelector((state: moorhen.State) => state.sceneSettings.width);
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height);

    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.LIGAND_VALIDATION}
            left={width / 6}
            top={height / 3}
            minHeight={convertViewtoPx(30, height)}
            minWidth={convertRemToPx(37)}
            maxHeight={convertViewtoPx(70, height)}
            maxWidth={convertViewtoPx(50, width)}
            enforceMaxBodyDimensions={true}
            overflowY="auto"
            overflowX="auto"
            headerTitle="Ligand validation"
            footer={null}
            openDocked={props.openDocked}
            resizeNodeRef={resizeNodeRef}
            body={<MoorhenLigandValidation />}
        />
    );
};
