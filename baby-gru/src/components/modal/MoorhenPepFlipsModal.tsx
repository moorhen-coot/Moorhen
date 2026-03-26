import { useRef } from "react";
import { modalKeys } from "../../utils/enums";
import { MoorhenDraggableModalBase } from "../interface-base/ModalBase/DraggableModalBase";
import { MoorhenPepflipsDifferenceMap } from "../validation-tools/MoorhenPepflipsDifferenceMap";

export const MoorhenPepFlipsModal = () => {
    const resizeNodeRef = useRef<HTMLDivElement>(null);

    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.PEPTIDE_FLIPS}
            headerTitle="Peptide flips using difference map"
            footer={null}
            allowDocking={true}
            resizeNodeRef={resizeNodeRef}
            body={<MoorhenPepflipsDifferenceMap />}
        />
    );
};
