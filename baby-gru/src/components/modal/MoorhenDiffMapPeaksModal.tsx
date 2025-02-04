import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase"
import { moorhen } from "../../types/moorhen";
import { useRef } from "react";
import { Row } from "react-bootstrap";
import { MoorhenDifferenceMapPeaks } from "../validation-tools/MoorhenDifferenceMapPeaks"
import { convertRemToPx, convertViewtoPx} from '../../utils/utils';
import { useSelector } from "react-redux";
import { modalKeys } from "../../utils/enums";

export const MoorhenDiffMapPeaksModal = (props: moorhen.CollectedProps) => {        
    const resizeNodeRef = useRef<HTMLDivElement>(null);
      
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
                resizeNodeRef={resizeNodeRef}
                body={
                    <div style={{height: '100%'}} >
                        <Row className={"big-validation-tool-container-row"}>
                            <MoorhenDifferenceMapPeaks chartId="diff-map-peaks-chart" {...props}/>
                        </Row>
                    </div>
                }
            />
}

