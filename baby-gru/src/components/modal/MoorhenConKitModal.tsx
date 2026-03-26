import { LastPageOutlined } from "@mui/icons-material";
import { Tooltip } from "@mui/material";
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

    const [modalSize, setModalSize] = usePersistentState<{ width: number; height: number }>(
        menu,
        "modalSize",
        {
            width: undefined,
            height: undefined,
        },
        false
    );

    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.CONKIT}
            lockAspectRatio={true}
            initialHeight={modalSize.height}
            initialWidth={modalSize.width}
            onResize={(evt, ref, direction, delta, size) => {
                setModalSize(size);
            }}
            enforceMaxBodyDimensions={true}
            overflowY="auto"
            overflowX="auto"
            headerTitle="ConKit"
            footer={null}
            onResizeStop={() => dispatchPersistentStates(dispatch, menu, [{ key: "modalSize", value: modalSize }])}
            body={<MoorhenConKit size={modalSize} resizeTrigger={false} />}
        />
    );
};
