import { useState, useRef, useCallback, useEffect } from "react";
import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase"
import { MoorhenMapCard } from "../card/MoorhenMapCard";
import { convertRemToPx, convertViewtoPx } from "../../utils/utils";
import { moorhen } from "../../types/moorhen";
import { UnfoldLessOutlined } from '@mui/icons-material';
import { Button } from 'react-bootstrap';
import { useSelector } from "react-redux";
import { modalKeys } from "../../utils/enums";

export const MoorhenMapsModal = (props: moorhen.CollectedProps) => {    
    
    const cardListRef = useRef([])

    const [currentDropdownMolNo, setCurrentDropdownMolNo] = useState<number>(-1)

    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)
    const maps = useSelector((state: moorhen.State) => state.maps)

    useEffect(() => {
        cardListRef.current = cardListRef.current.slice(0, maps.length);
    }, [maps]); 
 
    const handleCollapseAll = useCallback(() => {
        cardListRef.current.forEach(card => {
            card.forceIsCollapsed(true)
        })
    }, [cardListRef.current, cardListRef])

    let displayData = maps.map((map, index) => {
        return <MoorhenMapCard
            ref={el => cardListRef.current[index] = el}
            key={map.molNo}
            map={map}
            initialContour={map.suggestedContourLevel ? map.suggestedContourLevel : 0.8}
            initialRadius={map.suggestedRadius ? map.suggestedRadius : 13}
            currentDropdownMolNo={currentDropdownMolNo}
            setCurrentDropdownMolNo={setCurrentDropdownMolNo}
            {...props} />
    })

    displayData.sort((a, b) => (a.props.index > b.props.index) ? 1 : ((b.props.index > a.props.index) ? -1 : 0))

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
                    maps.length === 0 ? <span>No maps loaded</span> : displayData
                }
                footer={null}
            />
}

