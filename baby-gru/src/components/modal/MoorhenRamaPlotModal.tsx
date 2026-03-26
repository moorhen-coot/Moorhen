import { useState } from "react";
import { modalKeys } from "../../utils/enums";
import { MoorhenDraggableModalBase } from "../interface-base/ModalBase/DraggableModalBase";
import { MoorhenRamachandran } from "../validation-tools/MoorhenRamachandran";

export const MoorhenRamaPlotModal = () => {
    const menu = "moorhenRamaPlotModal";

    const [modalSize, setModalSize] = useState<{ width: number; height: number }>({ width: 1, height: 1 });

    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.RAMA_PLOT}
            lockAspectRatio={true}
            onResize={(evt, ref, direction, delta, size) => {
                setModalSize(size);
            }}
            headerTitle="Ramachandran Plot"
            allowDocking={true}
            footer={null}
            body={<MoorhenRamachandran size={modalSize} resizeTrigger={false} />}
        />
    );
};
