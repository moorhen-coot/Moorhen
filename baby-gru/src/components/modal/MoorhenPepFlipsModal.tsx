import { useRef } from "react";
import { Button, Row } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { Tooltip } from "@mui/material";
import { LastPageOutlined } from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { MoorhenPepflipsDifferenceMap } from "../validation-tools/MoorhenPepflipsDifferenceMap";
import { convertRemToPx, convertViewtoPx} from '../../utils/utils';
import { moorhen } from "../../types/moorhen";
import { modalKeys } from "../../utils/enums";
import { hideModal } from "../../store/modalsSlice";
import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase"

export const MoorhenPepFlipsModal = () => {        
    const resizeNodeRef = useRef<HTMLDivElement>(null);
      
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)

    const dispatch = useDispatch()

    const { enqueueSnackbar } = useSnackbar()

    return <MoorhenDraggableModalBase
                modalId={modalKeys.PEPTIDE_FLIPS}
                left={width / 6}
                top={height / 3}
                minHeight={convertViewtoPx(30, height)}
                minWidth={convertRemToPx(37)}
                maxHeight={convertViewtoPx(70, height)}
                maxWidth={convertViewtoPx(50, width)}
                enforceMaxBodyDimensions={true}
                overflowY='auto'
                overflowX='auto'
                headerTitle='Peptide flips using difference map'
                footer={null}
                resizeNodeRef={resizeNodeRef}
                body={
                    <div style={{height: '100%'}} >
                        <Row className={"big-validation-tool-container-row"}>
                            <MoorhenPepflipsDifferenceMap />
                        </Row>
                    </div>
                }
                additionalHeaderButtons={[
                    <Tooltip title={"Move to side panel"}  key={1}>
                        <Button variant='white' style={{margin: '0.1rem', padding: '0.1rem'}} onClick={() => {
                            dispatch( hideModal(modalKeys.PEPTIDE_FLIPS) )
                            enqueueSnackbar(modalKeys.PEPTIDE_FLIPS, {
                                variant: "sideBar",
                                persist: true,
                                anchorOrigin: {horizontal: "right", vertical: "bottom"},
                                title: "Peptide flips",
                                modalId: modalKeys.PEPTIDE_FLIPS,
                                children: <div style={{maxHeight: '30vh', overflowY: 'scroll', overflowX: "hidden"}} >
                                <Row className={"big-validation-tool-container-row"}>
                                    <MoorhenPepflipsDifferenceMap />
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

