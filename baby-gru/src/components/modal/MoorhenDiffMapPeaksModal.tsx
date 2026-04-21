import { useSelector } from "react-redux";
import { moorhen } from "../../types/moorhen";
import { modalKeys } from "../../utils/enums";
import { MoorhenDraggableModalBase } from "../interface-base/ModalBase/DraggableModalBase";
import { ModalComponentProps } from "../interface-base/ModalBase/ModalsContainer";
import { MoorhenDifferenceMapPeaks } from "../validation-tools/MoorhenDifferenceMapPeaks";

export const MoorhenDiffMapPeaksModal = (props: ModalComponentProps) => {
    const width = useSelector((state: moorhen.State) => state.sceneSettings.GlViewportWidth);

    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.DIFF_MAP_PEAKS}
            initialWidth={width / 3}
            enforceMaxBodyDimensions={false}
            overflowY="hidden"
            overflowX="auto"
            headerTitle="Difference Map Peaks"
            footer={null}
            body={
                <div style={{ height: "100%" }}>
                    <MoorhenDifferenceMapPeaks chartId="diff-map-peaks-chart" />
                </div>
            }
        />
    );
};
