import { modalKeys } from "../../utils/enums";
import { MoorhenDraggableModalBase } from "../interface-base/ModalBase/DraggableModalBase";
import { ModalComponentProps } from "../interface-base/ModalBase/ModalsContainer";
import { MoorhenMMRRCCPlot } from "../validation-tools/MoorhenMMRRCCPlot";

export const MoorhenMmrrccModal = (props: ModalComponentProps) => {
    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.MMRRCC}
            enforceMaxBodyDimensions={false}
            overflowY="hidden"
            overflowX="hidden"
            headerTitle="MMRRCC Plot"
            footer={null}
            body={<MoorhenMMRRCCPlot />}
        />
    );
};
