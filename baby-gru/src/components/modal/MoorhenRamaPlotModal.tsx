import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase"
import { moorhen } from "../../types/moorhen";
import { useRef, useState } from "react";
import { Button, Row } from "react-bootstrap";
import { MoorhenRamachandran } from "../validation-tools/MoorhenRamachandran"
import { convertRemToPx, convertViewtoPx} from '../../utils/utils';
import { useDispatch, useSelector } from "react-redux";
import { LastPageOutlined } from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { Tooltip } from "@mui/material";
import { modalKeys } from "../../utils/enums";
import { hideModal } from "../../store/modalsSlice";

export const MoorhenRamaPlotModal = (props: moorhen.CollectedProps) => {        
    const resizeNodeRef = useRef<HTMLDivElement>(null);
    
    const [draggableResizeTrigger, setDraggableResizeTrigger] = useState<boolean>(true)
    
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)

    const dispatch = useDispatch()

    const { enqueueSnackbar } = useSnackbar()

    return <MoorhenDraggableModalBase
                modalId={modalKeys.RAMA_PLOT}
                left={width / 6}
                top={height / 3}
                minHeight={convertViewtoPx(30, height)}
                minWidth={convertRemToPx(37)}
                maxHeight={convertViewtoPx(90, height)}
                maxWidth={convertViewtoPx(80, width)}
                enforceMaxBodyDimensions={true}
                overflowY='auto'
                overflowX='auto'
                headerTitle='Ramachandran Plot'
                footer={null}
                resizeNodeRef={resizeNodeRef}
                onResizeStop={() => { setDraggableResizeTrigger((prev) => !prev) }}
                body={
                    <div style={{height: '100%'}} >
                        <Row className={"rama-validation-tool-container-row"}>
                            <MoorhenRamachandran resizeNodeRef={resizeNodeRef} resizeTrigger={draggableResizeTrigger} {...props}/>
                        </Row>
                    </div>
                }
                additionalHeaderButtons={[
                    <Tooltip title={"Move to side panel"}  key={1}>
                        <Button variant="white" onClick={() => {
                            dispatch( hideModal(modalKeys.RAMA_PLOT) )
                            enqueueSnackbar(modalKeys.RAMA_PLOT, {
                                variant: "sideBar",
                                persist: true,
                                anchorOrigin: {horizontal: "right", vertical: "bottom"},
                                modalId: modalKeys.RAMA_PLOT,
                                title: "Rama. Plot",
                                children: <div style={{height: '100%'}} >
                                <Row className={"rama-validation-tool-container-row"}>
                                    <MoorhenRamachandran resizeTrigger={draggableResizeTrigger} {...props}/>
                                </Row>
                            </div>
                            })
                        }}>
                            <LastPageOutlined/>
                        </Button>
                    </Tooltip>
                ]}
            />
}

