import { useSelector } from "react-redux";
import { CSSProperties } from "react";
import { moorhen } from "../../types/moorhen";
import { modalKeys } from "../../utils/enums";
import { convertRemToPx, convertViewtoPx } from "../../utils/utils";
import { MoorhenInfoCard, MoorhenStack } from "../interface-base";
import { MoorhenDraggableModalBase } from "../interface-base/ModalBase/DraggableModalBase";
import { ModalComponentProps } from "../interface-base/ModalBase/ModalsContainer";
import { MoorhenCarbohydrateValidation } from "../validation-tools/MoorhenCarbohydrateValidation";

export const MoorhenCarbohydrateValidationModal = (props: ModalComponentProps) => {
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width);
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height);


    const header = (
        <MoorhenStack direction="horizontal">
            <span>Carbohydrate validation with Privateer</span>
            <MoorhenInfoCard infoText={<span>This plugin uses Privateer, \
            a software for the conformational validation of carbohydrate structures. \
            Please cite Dialpuri, J. et al. Acta Cryst. Section F 80.2 (2024).<br />
            visit <a href="https://privateer.york.ac.uk/" target="_blank" rel="noopener noreferrer">Privateer website</a></span>}         
            >
            </MoorhenInfoCard>
        </MoorhenStack>
    );

    const body = (style: CSSProperties) => (
        <div style={style}>
            <MoorhenCarbohydrateValidation />
        </div>
    );

    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.CARB_VALIDATION}
            left={width / 6}
            top={height / 3}
            minHeight={convertViewtoPx(30, height)}
            minWidth={convertRemToPx(37)}
            maxHeight={convertViewtoPx(70, height)}
            maxWidth={convertViewtoPx(50, width)}
            enforceMaxBodyDimensions={true}
            overflowY="auto"
            overflowX="auto"
            headerTitle={header}
            footer={null}
            body={body({ height: "100%" })}
            allowDocking
        />
    );
};
