import { useState } from "react";
import { modalKeys } from "../../utils/enums";
import { MoorhenDraggableModalBase } from "../interface-base/ModalBase/DraggableModalBase";
import { ModalComponentProps } from "../interface-base/ModalBase/ModalsContainer";
import { MoorhenPAEPlot } from "../validation-tools/MoorhenPAEPlot";

export const MoorhenPAEModal = (props: ModalComponentProps) => {
    const [modalSize, setModalSize] = useState<{ width: number; height: number }>({ width: 300, height: 900 });
    const [modalIsDocked, setModalIsDocked] = useState(false);

    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.PAEPLOT}
            openDocked={props.openDocked}
            enforceMaxBodyDimensions={false}
            initialHeight={770}
            initialWidth={534}
            lockAspectRatio={true}
            allowDocking
            headerTitle="Alphafold PAE Plot"
            onResize={(evt, ref, direction, delta, size) => {
                setModalSize(size);
            }}
            onDock={state => setModalIsDocked(state === null ? false : true)}
            body={
                <MoorhenPAEPlot
                    size={modalSize}
                    resizeTrigger={false}
                    isDocked={modalIsDocked}
                    loadMoleculeOnOpen={props.modalProps?.loadMoleculeOnOpen as string}
                />
            }
        />
    );
};
