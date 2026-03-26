import { useRef } from "react";
import { modalKeys } from "../../utils/enums";
import { MoorhenDraggableModalBase } from "../interface-base/ModalBase/DraggableModalBase";
import { MoorhenFillMissingAtoms } from "../validation-tools/MoorhenFillMissingAtoms";

export const MoorhenFillPartialResiduesModal = () => {
    const resizeNodeRef = useRef<HTMLDivElement>(null);
    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.FILL_PART_RES}
            enforceMaxBodyDimensions={true}
            overflowY="auto"
            overflowX="auto"
            headerTitle="Fill partial residues"
            footer={null}
            allowDocking={true}
            resizeNodeRef={resizeNodeRef}
            body={<MoorhenFillMissingAtoms />}
        />
    );
};
