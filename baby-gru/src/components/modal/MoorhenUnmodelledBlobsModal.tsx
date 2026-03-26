import { useRef } from "react";
import { modalKeys } from "../../utils/enums";
import { MoorhenDraggableModalBase } from "../interface-base/ModalBase/DraggableModalBase";
import { MoorhenUnmodelledBlobs } from "../validation-tools/MoorhenUnmodelledBlobs";

export const MoorhenUnmodelledBlobsModal = () => {
    const resizeNodeRef = useRef<HTMLDivElement>(null);

    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.UNMODELLED_BLOBS}
            allowDocking={true}
            overflowY="auto"
            overflowX="auto"
            headerTitle="Unmodelled blobs"
            footer={null}
            resizeNodeRef={resizeNodeRef}
            body={<MoorhenUnmodelledBlobs />}
        />
    );
};
