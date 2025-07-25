import { useRef, useState } from "react";
import { Button, Row } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { LastPageOutlined } from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { Tooltip } from "@mui/material";
import { convertRemToPx, convertViewtoPx} from '../../utils/utils';
import { MoorhenRamachandran } from "../validation-tools/MoorhenRamachandran"
import { moorhen } from "../../types/moorhen";
import { modalKeys } from "../../utils/enums";
import { hideModal } from "../../store/modalsSlice";
import { dispatchPersistentStates, usePersistentState } from "../../store/menusSlice";
import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase"

export const MoorhenRamaPlotModal = (props: moorhen.CollectedProps) => {     
    const menu = 'moorhenRamaPlotModal'   
    const dispatch = useDispatch()
    
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)
    const [modalSize, setModalSize] = usePersistentState<{ width: number; height: number }>(
        menu,
        'modalSize',{
        width: 600,
        height: 700
    })
 
    const { enqueueSnackbar } = useSnackbar()

    return <MoorhenDraggableModalBase
                modalId={modalKeys.RAMA_PLOT}
                left={width / 6}
                top={height / 3}
                initialWidth={modalSize.width}
                initialHeight={modalSize.height}
                onResize={(evt, ref, direction, delta, size) => {
                    setModalSize(size)
                    console.log("size", size)
                }}
                minHeight={300}
                minWidth={200}
                maxHeight={convertViewtoPx(90, height)}
                maxWidth={convertViewtoPx(80, width)}
                enforceMaxBodyDimensions={true}
                overflowY='auto'
                overflowX='auto'
                headerTitle='Ramachandran Plot'
                footer={null}
                onResizeStop={() => dispatchPersistentStates(
                    dispatch,
                    menu,
                    [{key: 'modalSize', value: modalSize}],
                )}
                body={
                    <div style={{height: '100%'}} >
                        <Row className={"rama-validation-tool-container-row"}>
                            <MoorhenRamachandran size={modalSize} resizeTrigger={false} {...props}/>
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
                                    <MoorhenRamachandran resizeTrigger={false} {...props}/>
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

