import { Row } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { moorhen } from "../../types/moorhen";
import { MoorhenPAEPlot } from "../validation-tools/MoorhenPAEPlot"
import { convertRemToPx, convertViewtoPx} from '../../utils/utils';
import { modalKeys } from "../../utils/enums";
import { dispatchPersistentStates, usePersistentState } from "../../store/menusSlice";
import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase"

export const MoorhenPAEModal = () => {
    const menu = 'moorhenPAEPlotModal'

    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)
    const dispatch = useDispatch()

    const [modalSize, setModalSize] = usePersistentState<{ width: number; height: number }>(
        menu,
        'modalSize',{
        width: convertRemToPx(40),
        height: convertRemToPx(32)
    })

    return <MoorhenDraggableModalBase
                modalId={modalKeys.PAEPLOT}
                left={width / 6}
                top={height / 3}
                minHeight={convertViewtoPx(30, height)}
                minWidth={convertRemToPx(37)}
                maxHeight={convertViewtoPx(90, height)}
                maxWidth={convertViewtoPx(80, width)}
                enforceMaxBodyDimensions={false}
                overflowY='hidden'
                overflowX='auto'
                headerTitle='Alphafold PAE Plot'
                footer={null}
                onResize={(evt, ref, direction, delta, size) => {
                   setModalSize(size)
                }}
                onResizeStop={() => dispatchPersistentStates(
                    dispatch,
                    menu,
                    [{key: 'modalSize', value: modalSize}],
                )}

                body={
                    <div style={{height: '100%'}} >
                        <Row className={"big-validation-tool-container-row"}>
                            <MoorhenPAEPlot size={modalSize} resizeTrigger={false}/>
                        </Row>
                    </div>
                }
            />
}

