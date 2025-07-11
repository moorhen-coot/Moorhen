import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase"
import { moorhen } from "../../types/moorhen";
import { useRef } from "react";
import { Button, Row } from "react-bootstrap";
import { MoorhenUnmodelledBlobs } from "../validation-tools/MoorhenUnmodelledBlobs"
import { convertRemToPx, convertViewtoPx} from '../../utils/utils';
import { useDispatch, useSelector } from "react-redux";
import { Tooltip } from "@mui/material";
import { LastPageOutlined } from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { modalKeys } from "../../utils/enums";
import { hideModal } from "../../store/modalsSlice";

export const MoorhenUnmodelledBlobsModal = (props: moorhen.CollectedProps) => {        
    const resizeNodeRef = useRef<HTMLDivElement>(null);
      
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)
    
    const dispatch = useDispatch()

    const { enqueueSnackbar } = useSnackbar()

    return <MoorhenDraggableModalBase
                modalId={modalKeys.UNMODELLED_BLOBS}
                left={width / 6}
                top={height / 3}
                minHeight={convertViewtoPx(30, height)}
                minWidth={convertRemToPx(37)}
                maxHeight={convertViewtoPx(70, height)}
                maxWidth={convertViewtoPx(50, width)}
                enforceMaxBodyDimensions={true}
                overflowY='auto'
                overflowX='auto'
                headerTitle='Unmodelled blobs'
                footer={null}
                resizeNodeRef={resizeNodeRef}
                body={
                    <div style={{height: '100%'}} >
                        <Row className="big-validation-tool-container-row">
                            <MoorhenUnmodelledBlobs {...props}/>
                        </Row>
                    </div>
                }
                additionalHeaderButtons={[
                    <Tooltip title={"Move to side panel"}  key={1}>
                        <Button variant='white' style={{margin: '0.1rem', padding: '0.1rem'}} onClick={() => {
                            dispatch( hideModal(modalKeys.UNMODELLED_BLOBS) )
                            enqueueSnackbar(modalKeys.UNMODELLED_BLOBS, {
                                variant: "sideBar",
                                persist: true,
                                anchorOrigin: {horizontal: "right", vertical: "bottom"},
                                title: "Unmodelled blobs",
                                modalId: modalKeys.UNMODELLED_BLOBS,
                                children: <div style={{maxHeight: '30vh', overflowY: 'scroll', overflowX: "hidden"}} >
                                            <Row className={"big-validation-tool-container-row"}>
                                                <MoorhenUnmodelledBlobs {...props}/>
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

