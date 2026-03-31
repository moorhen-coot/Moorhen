import { useRef } from "react";
import { modalKeys } from "../../utils/enums";
import { MoorhenDraggableModalBase } from "../interface-base/ModalBase/DraggableModalBase";
import { ModalComponentProps } from "../interface-base/ModalBase/ModalsContainer";
import { MoorhenPepflipsDifferenceMap } from "../validation-tools/MoorhenPepflipsDifferenceMap";

export const MoorhenPepFlipsModal = (props: ModalComponentProps) => {
    const resizeNodeRef = useRef<HTMLDivElement>(null);

    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.PEPTIDE_FLIPS}
            headerTitle="Peptide flips using difference map"
            footer={null}
            allowDocking={true}
            openDocked={props.openDocked}
            resizeNodeRef={resizeNodeRef}
            body={<MoorhenPepflipsDifferenceMap />}
        />
    );
};
