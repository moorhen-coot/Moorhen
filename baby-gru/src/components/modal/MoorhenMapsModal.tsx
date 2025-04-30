import { useState, useMemo,useRef, useCallback, useEffect } from "react";
import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase"
import { MoorhenMapCard } from "../card/MoorhenMapCard";
import { convertRemToPx, convertViewtoPx } from "../../utils/utils";
import { moorhen } from "../../types/moorhen";
import { UnfoldLessOutlined } from '@mui/icons-material';
import { Button } from 'react-bootstrap';
import { useSelector } from "react-redux";
import { modalKeys } from "../../utils/enums";

export const MoorhenMapsModal = (props: moorhen.CollectedProps) => {       
    
    const [collapseAll, setCollapseAll,] = useState<boolean>(null)
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)
    const maps = useSelector((state: moorhen.State) => state.maps)
    const [reset, setReset] = useState<boolean>(false)
    const handleCollapseAll = () => {
        setCollapseAll(!collapseAll)
        }

    const displayData = useMemo(() => {
        return maps.map((map, index) => (
            <MoorhenMapCard
                key={map.molNo}
                map={map}
                initialContour={map.suggestedContourLevel ? map.suggestedContourLevel : 0.8}
                initialRadius={map.suggestedRadius ? map.suggestedRadius : 13}
                collapseAllRequest={collapseAll}
                {...props}
            />
        ));
    }, [collapseAll, reset]);

    useEffect(function redrawNewMap() {
        if (collapseAll === null) {
            setReset(!reset)} //switch that force reset if collapse all is not going to change state
        setCollapseAll(null)          
    }, [maps])
    
    const sortedDisplayData =  useMemo(() => {
        return [...displayData].sort((a, b) => (a.props.index > b.props.index) ? 1 : ((b.props.index > a.props.index) ? -1 : 0));
    }, [maps, displayData]);


    return <MoorhenDraggableModalBase
                modalId={modalKeys.MAPS}
                left={width - (convertRemToPx(55) + 100)}
                top={height / 2}
                minHeight={convertViewtoPx(10, height)}
                minWidth={convertRemToPx(20)}
                maxHeight={convertViewtoPx(90, height)}
                maxWidth={convertRemToPx(55)}
                headerTitle={'Maps'}
                additionalHeaderButtons={[
                    <Button variant="white" key='collapse-all-maps' style={{margin: '0.1rem', padding: '0.1rem'}} onClick={handleCollapseAll}>
                        <UnfoldLessOutlined/>
                    </Button>
                ]}
                body={
                    maps.length === 0 ? <span>No maps loaded</span> : sortedDisplayData
                }
                footer={null}
            />
}

