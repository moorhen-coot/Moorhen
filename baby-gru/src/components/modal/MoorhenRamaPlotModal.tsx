import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase"
import { moorhen } from "../../types/moorhen";
import { useRef, useState } from "react";
import { Button, Row } from "react-bootstrap";
import { MoorhenRamachandran } from "../validation-tools/MoorhenRamachandran"
import { convertRemToPx, convertViewtoPx} from '../../utils/MoorhenUtils';
import { useSelector } from "react-redux";
import { LastPageOutlined } from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { Tooltip } from "@mui/material";

interface MoorhenValidationModalProps extends moorhen.CollectedProps {
    show: boolean;
    setShow: React.Dispatch<React.SetStateAction<boolean>>;
}

export const MoorhenRamaPlotModal = (props: MoorhenValidationModalProps) => {        
    const resizeNodeRef = useRef<HTMLDivElement>();
    
    const [draggableResizeTrigger, setDraggableResizeTrigger] = useState<boolean>(true)
    
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)

    const { enqueueSnackbar } = useSnackbar()

    const collectedProps = {
        sideBarWidth: convertViewtoPx(35, width), dropdownId: 1, busy: false, 
        accordionDropdownId: 1, setAccordionDropdownId: (arg0) => {}, showSideBar: true, ...props
    }

    return <MoorhenDraggableModalBase
                modalId="rama-plot-modal"
                left={width / 6}
                top={height / 3}
                show={props.show}
                setShow={props.setShow}
                defaultHeight={convertViewtoPx(70, height)}
                defaultWidth={convertViewtoPx(37, width)}
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
                            <MoorhenRamachandran resizeNodeRef={resizeNodeRef} resizeTrigger={draggableResizeTrigger} {...collectedProps}/>
                        </Row>
                    </div>
                }
                additionalHeaderButtons={[
                    <Tooltip title={"Move to side panel"}  key={1}>
                        <Button variant="white" onClick={() => {
                            props.setShow(false)
                            enqueueSnackbar("rama-plot", {
                                variant: "sideBar",
                                persist: true,
                                anchorOrigin: {horizontal: "right", vertical: "bottom"},
                                title: "Rama. Plot",
                                children: <div style={{height: '100%'}} >
                                <Row className={"rama-validation-tool-container-row"}>
                                    <MoorhenRamachandran resizeNodeRef={resizeNodeRef} resizeTrigger={draggableResizeTrigger} {...collectedProps}/>
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

