import { LastPageOutlined } from "@mui/icons-material";
import { Tooltip } from "@mui/material";
import { useSnackbar } from "notistack";
import { Button, Row } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { useRef } from "react";
import { hideModal } from "../../store/modalsSlice";
import { moorhen } from "../../types/moorhen";
import { modalKeys } from "../../utils/enums";
import { convertRemToPx, convertViewtoPx } from "../../utils/utils";
import { MoorhenButton } from "../inputs";
import { MoorhenDraggableModalBase } from "../interface-base/DraggableModalBase";
import { MoorhenUnmodelledBlobs } from "../validation-tools/MoorhenUnmodelledBlobs";

export const MoorhenUnmodelledBlobsModal = () => {
    const resizeNodeRef = useRef<HTMLDivElement>(null);

    const width = useSelector((state: moorhen.State) => state.sceneSettings.width);
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height);

    const dispatch = useDispatch();

    const { enqueueSnackbar } = useSnackbar();

    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.UNMODELLED_BLOBS}
            left={width / 6}
            top={height / 3}
            minHeight={convertViewtoPx(30, height)}
            minWidth={convertRemToPx(37)}
            maxHeight={convertViewtoPx(70, height)}
            maxWidth={convertViewtoPx(50, width)}
            enforceMaxBodyDimensions={true}
            overflowY="auto"
            overflowX="auto"
            headerTitle="Unmodelled blobs"
            footer={null}
            resizeNodeRef={resizeNodeRef}
            body={
                <div style={{ height: "100%" }}>
                    <Row className="big-validation-tool-container-row">
                        <MoorhenUnmodelledBlobs />
                    </Row>
                </div>
            }
            additionalHeaderButtons={[
                <Tooltip title={"Move to side panel"} key={1}>
                    <MoorhenButton
                        variant="white"
                        style={{ margin: "0.1rem", padding: "0.1rem" }}
                        onClick={() => {
                            dispatch(hideModal(modalKeys.UNMODELLED_BLOBS));
                            enqueueSnackbar(modalKeys.UNMODELLED_BLOBS, {
                                variant: "sideBar",
                                persist: true,
                                anchorOrigin: { horizontal: "right", vertical: "bottom" },
                                title: "Unmodelled blobs",
                                modalId: modalKeys.UNMODELLED_BLOBS,
                                children: (
                                    <div style={{ maxHeight: "30vh", overflowY: "scroll", overflowX: "hidden" }}>
                                        <Row className={"big-validation-tool-container-row"}>
                                            <MoorhenUnmodelledBlobs />
                                        </Row>
                                    </div>
                                ),
                            });
                        }}
                    >
                        <LastPageOutlined />
                    </MoorhenButton>
                </Tooltip>,
            ]}
        />
    );
};
