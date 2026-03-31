import { Row } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { dispatchPersistentStates, usePersistentState } from "../../store/menusSlice";
import { moorhen } from "../../types/moorhen";
import { modalKeys } from "../../utils/enums";
import { convertRemToPx, convertViewtoPx } from "../../utils/utils";
import { MoorhenDraggableModalBase } from "../interface-base/ModalBase/DraggableModalBase";
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
            enforceMaxBodyDimensions={false}
            allowDocking
            overflowY="hidden"
            overflowX="auto"
            headerTitle="Alphafold PAE Plot"
            footer={null}
            onResize={(evt, ref, direction, delta, size) => {
                setModalSize(size);
            }}
            onResizeStop={() => dispatchPersistentStates(dispatch, menu, [{ key: "modalSize", value: modalSize }])}
            body={<MoorhenPAEPlot size={modalSize} resizeTrigger={false} />}
        />
    );
};
