import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase"
import { moorhen } from "../../types/moorhen";
import { CSSProperties, useRef } from "react";
import { Button, Row, Stack } from "react-bootstrap";
import { convertRemToPx, convertViewtoPx} from '../../utils/utils';
import { useDispatch, useSelector } from "react-redux";
import { MoorhenCarbohydrateValidation } from "../validation-tools/MoorhenCarbohydrateValidation";
import { modalKeys } from "../../utils/enums";
import { Tooltip } from "@mui/material";
import { hideModal } from "../../store/modalsSlice";
import { useSnackbar } from "notistack";
import { InfoOutlined, LastPageOutlined } from "@mui/icons-material";

export const MoorhenCarbohydrateValidationModal = (props: moorhen.CollectedProps) => {        
      
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)

    const dispatch = useDispatch()

    const { enqueueSnackbar } = useSnackbar()

    const header = (title: string) => <Stack direction="horizontal" gap={1}>
                        <span>
                            {title}
                        </span>
                        <Tooltip title="This plugin uses Privateer, a software for the conformational validation of carbohydrate structures. Please cite Dialpuri, J. et al. Acta Cryst. Section F 80.2 (2024)." key={1}>
                            <Button variant='white' style={{margin: '0.1rem', padding: '0.1rem'}} onClick={() => window.open('https://privateer.york.ac.uk/')}>
                                <InfoOutlined/>
                            </Button>
                        </Tooltip>
                    </Stack>

    const body = (style: CSSProperties) => <div style={style} >
                                <Row className={"big-validation-tool-container-row"}>
                                    <MoorhenCarbohydrateValidation {...props}/>
                                </Row>
                            </div> 

    return <MoorhenDraggableModalBase
                modalId={modalKeys.CARB_VALIDATION}
                left={width / 6}
                top={height / 3}
                minHeight={convertViewtoPx(30, height)}
                minWidth={convertRemToPx(37)}
                maxHeight={convertViewtoPx(70, height)}
                maxWidth={convertViewtoPx(50, width)}
                enforceMaxBodyDimensions={true}
                overflowY='auto'
                overflowX='auto'
                headerTitle={header("Carbohydrate validation with Privateer")}
                footer={null}
                body={ body({ height: '100%' }) }
                additionalHeaderButtons={[
                    <Tooltip title={"Move to side panel"}  key={2}>
                        <Button variant='white' style={{margin: '0.1rem', padding: '0.1rem'}} onClick={() => {
                            dispatch( hideModal(modalKeys.CARB_VALIDATION) )
                            enqueueSnackbar(modalKeys.CARB_VALIDATION, {
                                variant: "sideBar",
                                persist: true,
                                anchorOrigin: {horizontal: "right", vertical: "bottom"},
                                modalId: modalKeys.CARB_VALIDATION,
                                title: header("Privateer"),
                                children: body({ overflowY: 'scroll', overflowX: "hidden", maxHeight: '30vh' })
                            })
                        }}>
                            <LastPageOutlined/>
                        </Button>
                    </Tooltip>
                ]}
            />
}

