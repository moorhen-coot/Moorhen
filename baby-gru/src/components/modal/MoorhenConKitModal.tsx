import { LastPageOutlined } from "@mui/icons-material";
import { Tooltip } from "@mui/material";
import { useSnackbar } from "notistack";
import { Button, Row } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { dispatchPersistentStates, usePersistentState } from "../../store/menusSlice";
import { hideModal } from "../../store/modalsSlice";
import { moorhen } from "../../types/moorhen";
import { modalKeys } from "../../utils/enums";
import { convertRemToPx, convertViewtoPx } from "../../utils/utils";
import { MoorhenButton } from "../inputs";
import { MoorhenDraggableModalBase } from "../interface-base/ModalBase/DraggableModalBase";
import { MoorhenConKit } from "../validation-tools/MoorhenConKit";

export const MoorhenConKitModal = () => {
    const menu = "moorhenconKitModal";
    const dispatch = useDispatch();

    const width = useSelector((state: moorhen.State) => state.sceneSettings.width);
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height);
    const [modalSize, setModalSize] = usePersistentState<{ width: number; height: number }>(
        menu,
        "modalSize",
        {
            width: convertRemToPx(50),
            height: convertRemToPx(20),
        },
        false
    );

    const { enqueueSnackbar } = useSnackbar();

    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.CONKIT}
            left={width / 6}
            top={height / 6}
            lockAspectRatio={true}
            initialHeight={convertRemToPx(40)}
            initialWidth={convertRemToPx(40)}
            onResize={(evt, ref, direction, delta, size) => {
                setModalSize(size);
            }}
            minHeight={100}
            minWidth={200}
            maxHeight={convertViewtoPx(45, height)}
            maxWidth={convertViewtoPx(80, width)}
            enforceMaxBodyDimensions={true}
            overflowY="auto"
            overflowX="auto"
            headerTitle="ConKit"
            footer={null}
            onResizeStop={() => dispatchPersistentStates(dispatch, menu, [{ key: "modalSize", value: modalSize }])}
            body={
                <div style={{ height: "100%" }}>
                    <Row className={"rama-validation-tool-container-row"}>
                        <MoorhenConKit size={modalSize} resizeTrigger={false} />
                    </Row>
                </div>
            }
        />
    );
};
