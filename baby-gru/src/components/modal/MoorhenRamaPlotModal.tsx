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
import { MoorhenDraggableModalBase } from "../interface-base/DraggableModalBase";
import { MoorhenRamachandran } from "../validation-tools/MoorhenRamachandran";

export const MoorhenRamaPlotModal = () => {
    const menu = "moorhenRamaPlotModal";
    const dispatch = useDispatch();

    const width = useSelector((state: moorhen.State) => state.sceneSettings.width);
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height);
    const [modalSize, setModalSize] = usePersistentState<{ width: number; height: number }>(menu, "modalSize", {
        width: convertRemToPx(50),
        height: convertRemToPx(42),
    });

    const { enqueueSnackbar } = useSnackbar();

    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.RAMA_PLOT}
            left={width / 6}
            top={height / 6}
            lockAspectRatio={true}
            initialHeight={convertRemToPx(50)}
            initialWidth={convertRemToPx(42)}
            onResize={(evt, ref, direction, delta, size) => {
                setModalSize(size);
            }}
            minHeight={300}
            minWidth={200}
            maxHeight={convertViewtoPx(90, height)}
            maxWidth={convertViewtoPx(80, width)}
            enforceMaxBodyDimensions={true}
            overflowY="auto"
            overflowX="auto"
            headerTitle="Ramachandran Plot"
            footer={null}
            onResizeStop={() => dispatchPersistentStates(dispatch, menu, [{ key: "modalSize", value: modalSize }])}
            body={
                <div style={{ height: "100%" }}>
                    <Row className={"rama-validation-tool-container-row"}>
                        <MoorhenRamachandran size={modalSize} resizeTrigger={false} />
                    </Row>
                </div>
            }
            additionalHeaderButtons={[
                <Tooltip title={"Move to side panel"} key={1}>
                    <Button
                        variant="white"
                        onClick={() => {
                            dispatch(hideModal(modalKeys.RAMA_PLOT));
                            enqueueSnackbar(modalKeys.RAMA_PLOT, {
                                variant: "sideBar",
                                persist: true,
                                anchorOrigin: { horizontal: "right", vertical: "bottom" },
                                modalId: modalKeys.RAMA_PLOT,
                                title: "Rama. Plot",
                                children: (
                                    <div style={{ height: "100%" }}>
                                        <Row className={"rama-validation-tool-container-row"}>
                                            <MoorhenRamachandran resizeTrigger={false} />
                                        </Row>
                                    </div>
                                ),
                            });
                        }}
                    >
                        <LastPageOutlined />
                    </Button>
                </Tooltip>,
            ]}
        />
    );
};
