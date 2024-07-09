import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase"
import { moorhen } from "../../types/moorhen";
import { useRef } from "react";
import { Button, Row } from "react-bootstrap";
import { MoorhenFillMissingAtoms } from "../validation-tools/MoorhenFillMissingAtoms"
import { convertRemToPx, convertViewtoPx} from '../../utils/utils';
import { useDispatch, useSelector } from "react-redux";
import { Tooltip } from "@mui/material";
import { LastPageOutlined } from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { modalKeys } from "../../utils/enums";
import { hideModal } from "../../store/modalsSlice";

export const MoorhenFillPartialResiduesModal = (props: moorhen.CollectedProps) => {        
    const resizeNodeRef = useRef<HTMLDivElement>();
      
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)

    const dispatch = useDispatch()

    const { enqueueSnackbar } = useSnackbar()

    return <MoorhenDraggableModalBase
                modalId={modalKeys.FILL_PART_RES}
                left={width / 6}
                top={height / 3}
                minHeight={convertViewtoPx(30, height)}
                minWidth={convertRemToPx(37)}
                maxHeight={convertViewtoPx(70, height)}
                maxWidth={convertViewtoPx(50, width)}
                enforceMaxBodyDimensions={true}
                overflowY='auto'
                overflowX='auto'
                headerTitle='Fill partial residues'
                footer={null}
                resizeNodeRef={resizeNodeRef}
                body={
                    <div style={{height: '100%'}} >
                        <Row className={"big-validation-tool-container-row"}>
                            <MoorhenFillMissingAtoms {...props}/>
                        </Row>
                    </div>
                }
                additionalHeaderButtons={[
                    <Tooltip title={"Move to side panel"}  key={1}>
                        <Button variant='white' style={{margin: '0.1rem', padding: '0.1rem'}} onClick={() => {
                            dispatch( hideModal(modalKeys.FILL_PART_RES) )
                            enqueueSnackbar(modalKeys.FILL_PART_RES, {
                                variant: "sideBar",
                                persist: true,
                                anchorOrigin: {horizontal: "right", vertical: "bottom"},
                                modalId: modalKeys.FILL_PART_RES,
                                title: "Fill partial res.",
                                children: <div style={{ overflowY: 'scroll', overflowX: "hidden", maxHeight: '30vh' }}>
                                            <Row className={"big-validation-tool-container-row"}>
                                                <MoorhenFillMissingAtoms {...props}/>
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

