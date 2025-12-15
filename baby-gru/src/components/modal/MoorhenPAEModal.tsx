import { Row } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { dispatchPersistentStates, usePersistentState } from "../../store/menusSlice";
import { moorhen } from "../../types/moorhen";
import { modalKeys } from "../../utils/enums";
import { convertRemToPx, convertViewtoPx } from "../../utils/utils";
import { MoorhenDraggableModalBase } from "../interface-base/DraggableModalBase";
import { MoorhenPAEPlot } from "../validation-tools/MoorhenPAEPlot";

export const MoorhenPAEModal = () => {
    const menu = "moorhenPAEPlotModal";

    const width = useSelector((state: moorhen.State) => state.sceneSettings.width);
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height);
    const dispatch = useDispatch();

    const [modalSize, setModalSize] = usePersistentState<{ width: number; height: number }>(
        menu,
        "modalSize",
        {
            width: convertRemToPx(20),
            height: convertRemToPx(42),
        },
        false
    );

    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.PAEPLOT}
            left={width / 6}
            top={height / 3}
            minHeight={convertViewtoPx(30, height)}
            minWidth={convertRemToPx(37)}
            maxHeight={convertViewtoPx(90, height)}
            maxWidth={convertViewtoPx(50, width)}
            enforceMaxBodyDimensions={false}
            overflowY="hidden"
            overflowX="auto"
            headerTitle="Alphafold PAE Plot"
            footer={null}
            onResize={(evt, ref, direction, delta, size) => {
                setModalSize(size);
            }}
            onResizeStop={() => dispatchPersistentStates(dispatch, menu, [{ key: "modalSize", value: modalSize }])}
            body={
                <div style={{ height: "100%" }}>
                    <Row className={"big-validation-tool-container-row"}>
                        <MoorhenPAEPlot size={modalSize} resizeTrigger={false} />
                    </Row>
                </div>
            }
        />
    );
};
