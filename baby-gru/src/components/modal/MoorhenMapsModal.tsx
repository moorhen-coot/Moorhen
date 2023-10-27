import { useState, useRef, useCallback, useEffect } from "react";
import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase"
import { MoorhenMapCard } from "../card/MoorhenMapCard";
import { convertRemToPx } from "../../utils/MoorhenUtils";
import { moorhen } from "../../types/moorhen";
import { UnfoldLessOutlined } from '@mui/icons-material';
import { Button } from 'react-bootstrap';
import { useSelector } from "react-redux";

interface MoorhenMapsModalProps extends moorhen.CollectedProps {
    show: boolean;
    setShow: React.Dispatch<React.SetStateAction<boolean>>;
}

export const MoorhenMapsModal = (props: MoorhenMapsModalProps) => {    
    
    const cardListRef = useRef([])

    const [currentDropdownMolNo, setCurrentDropdownMolNo] = useState<number>(-1)

    const width = useSelector((state: moorhen.State) => state.canvasStates.width)
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
            showSideBar={true}
            busy={false}
            dropdownId={1}
            accordionDropdownId={1}
            setAccordionDropdownId={(arg0) => {}}
            sideBarWidth={convertRemToPx(26)}
            key={map.molNo}
            index={map.molNo}
            map={map}
            initialContour={map.suggestedContourLevel ? map.suggestedContourLevel : 0.8}
            initialRadius={map.suggestedRadius ? map.suggestedRadius : 13}
            currentDropdownMolNo={currentDropdownMolNo}
            setCurrentDropdownMolNo={setCurrentDropdownMolNo}
            {...props} />
    })

    displayData.sort((a, b) => (a.props.index > b.props.index) ? 1 : ((b.props.index > a.props.index) ? -1 : 0))

    return <MoorhenDraggableModalBase
                left={`${width / 2}px`}
                show={props.show}
                setShow={props.setShow}
                height={70}
                width={37}
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

