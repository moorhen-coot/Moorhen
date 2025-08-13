import { Row } from "react-bootstrap";
import { useSelector } from "react-redux";
import { moorhen } from "../../types/moorhen";
import { MoorhenDifferenceMapPeaks } from "../validation-tools/MoorhenDifferenceMapPeaks"
import { convertRemToPx, convertViewtoPx} from '../../utils/utils';
import { modalKeys } from "../../utils/enums";
import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase"

export const MoorhenDiffMapPeaksModal = () => {        
      
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)

    return <MoorhenDraggableModalBase
                modalId={modalKeys.DIFF_MAP_PEAKS}
                left={width / 6}
                top={height / 3}
                minHeight={convertViewtoPx(30, height)}
                minWidth={convertRemToPx(37)}
                maxHeight={convertViewtoPx(90, height)}
                maxWidth={convertViewtoPx(80, width)}
                enforceMaxBodyDimensions={false}
                overflowY='hidden'
                overflowX='auto'
                headerTitle='Difference Map Peaks'
                footer={null}
                body={
                    <div style={{height: '100%'}} >
                        <Row className={"big-validation-tool-container-row"}>
                            <MoorhenDifferenceMapPeaks chartId="diff-map-peaks-chart" />
                        </Row>
                    </div>
                }
            />
}

